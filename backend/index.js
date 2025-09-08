/*
 * Backend server for the credit system.
 *
 * This Express application exposes a small REST API used by the React
 * front‑end to register, authenticate, and reset user credentials. It
 * connects to a PostgreSQL database via the `pg` module and uses
 * bcrypt to securely hash passwords and jsonwebtoken to issue JWTs
 * after successful authentication.
 */

import express from 'express';
import cors from 'cors';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import pg from 'pg';
import nodemailer from 'nodemailer';
import axios from 'axios';
import { config as loadEnv } from 'dotenv';
import PixService from './src/services/PixService.js';
import pixRoutes from './src/routes/pixRoutes.js';
import { fileURLToPath } from 'url';

// Carrega env padrão
loadEnv();
// Fallback: tenta carregar .env no diretório do backend e no diretório raiz do projeto
const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv({ path: path.join(__dirname, '.env'), override: false });
loadEnv({ path: path.join(__dirname, '..', '.env'), override: false });

const { Pool } = pg;

// Environment configuration. Docker will override these values via
// docker‑compose.yml, but default values are provided for local
// development.
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';
const APP_BASE_URL = process.env.APP_BASE_URL || 'http://localhost:3000';
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER;
const SMTP_SECURE = String(process.env.SMTP_SECURE || '').toLowerCase() === 'true' || SMTP_PORT === 465;

// ASAAS removido

// PIX Estático Configuration
const STATIC_PIX_KEY = process.env.STATIC_PIX_KEY || 'pix@supermercadoflorais.com.br';

// Create a connection pool. When running in Docker the host will
// resolve to the service name `db` defined in docker‑compose.yml.
const pool = new Pool({
  host: process.env.PGHOST || 'db',
  port: Number(process.env.PGPORT) || 5432,
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'postgres',
  database: process.env.PGDATABASE || 'credit_system'
});

// Create the users table if it doesn't exist. Because this call runs at
// startup, it ensures the database schema is ready before handling
// requests.
async function ensureSchema() {
  // Create users table with an is_admin flag.  The is_admin column
  // allows us to distinguish administrators from regular users.  New
  // installations will have their first registered user promoted to
  // admin (see /api/register below).
  const createUsersTableSql = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255),
      phone VARCHAR(32),
      cpf VARCHAR(20),
      is_admin BOOLEAN DEFAULT FALSE,
      activated BOOLEAN DEFAULT FALSE,
      activation_token VARCHAR(100),
      session_token VARCHAR(255),
      session_expires_at TIMESTAMP,
      last_login_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  // Table for credit requests. Stores payer and receiver details, the
  // requested amount, payment method and current status. The
  // creator_id foreign key references the users table.
  const createRequestsTableSql = `
    CREATE TABLE IF NOT EXISTS credit_requests (
      id SERIAL PRIMARY KEY,
      payer_name VARCHAR(255) NOT NULL,
      payer_cpf VARCHAR(20) NOT NULL,
      receiver_name VARCHAR(255) NOT NULL,
      receiver_cpf VARCHAR(20),
      amount NUMERIC(12, 2) NOT NULL,
      payment_method VARCHAR(20) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'Pendente',
      creator_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      receipt_data TEXT,
      receipt_type VARCHAR(10),
      receipt_uploaded_at TIMESTAMP,
      transaction_id VARCHAR(100), -- Coluna para o TXID do PIX
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  // Recipients linked to a user
  const createPatientsTableSql = `
    CREATE TABLE IF NOT EXISTS patients (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      full_name VARCHAR(255) NOT NULL,
      cpf VARCHAR(20),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  await pool.query(createUsersTableSql);
  await pool.query(createRequestsTableSql);
  await pool.query(createPatientsTableSql);
  // If the users table already existed from a previous version of the
  // application it might be missing the is_admin column. Add it if
  // necessary. Similarly ensure the phone column exists with a
  // default value.
  await pool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
  `);
  await pool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS phone VARCHAR(32);
  `);
  await pool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS cpf VARCHAR(20);
  `);
  await pool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS activated BOOLEAN DEFAULT FALSE;
  `);
  await pool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS activation_token VARCHAR(100);
  `);
  await pool.query(`
    DO $$ BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'password'
      ) THEN
        ALTER TABLE users ALTER COLUMN password DROP NOT NULL;
      END IF;
    END $$;
  `);
  await pool.query(`
    ALTER TABLE credit_requests
    ADD COLUMN IF NOT EXISTS transaction_id VARCHAR(100);
  `);
  await pool.query(`
    ALTER TABLE patients
    ADD COLUMN IF NOT EXISTS cpf VARCHAR(20),
    ALTER COLUMN cpf DROP NOT NULL;
  `);
  await pool.query(`
    ALTER TABLE credit_requests
    ALTER COLUMN receiver_cpf DROP NOT NULL;
  `);
  await pool.query(`
    ALTER TABLE credit_requests
    ALTER COLUMN receipt_type TYPE VARCHAR(50);
  `);
  await pool.query(`
    ALTER TABLE credit_requests
    ADD COLUMN IF NOT EXISTS receipt_url TEXT;
  `);
}

// Wait for the database to be ready before attempting to create
// tables. Without this retry loop the server may start before
// PostgreSQL is accepting connections, causing ECONNREFUSED errors.
async function waitForDatabase(maxRetries = 10, delayMs = 2000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const client = await pool.connect();
      client.release();
      return;
    } catch (err) {
      console.log(`Database not ready (attempt ${attempt}/${maxRetries})...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  throw new Error('Database not reachable');
}

// Initialise the schema after the database becomes reachable. Exit on
// failure so Docker can restart the container.
waitForDatabase().then(() => {
  ensureSchema().catch(err => {
    console.error('Failed to initialise database schema:', err);
    process.exit(1);
  });
}).catch(err => {
  console.error(err);
  process.exit(1);
});

const app = express();
app.use(cors());
// Aumenta limites para uploads base64 (ex.: PDFs) via JSON
app.use(express.json({ limit: '15mb' }));

// Instanciar serviços
const pixService = new PixService({
  staticPixKey: process.env.STATIC_PIX_KEY,
  merchantName: process.env.MERCHANT_NAME || 'SUPERMERCADO FLORAIS',
  merchantCity: process.env.MERCHANT_CITY || 'CUIABA',
});

// Configurar rotas
app.use('/api/pix', pixRoutes);
// Serve static media uploads at /media
app.use('/media', express.static(path.resolve('uploads')));

// Middleware de autenticação (simplificado para o exemplo)
const authenticateRequest = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Verificar se a sessão ainda é válida no banco
        const result = await pool.query(
            'SELECT id, name, email, is_admin, session_token, session_expires_at FROM users WHERE id = $1',
            [decoded.id]
        );
        
        if (result.rows.length === 0) {
            return res.status(401).json({ message: 'Usuário não encontrado.' });
        }
        
        const user = result.rows[0];
        
        // Verificar se o token de sessão corresponde e não expirou
        if (!user.session_token || user.session_token !== decoded.sessionToken) {
            return res.status(401).json({ message: 'Sessão inválida. Faça login novamente.' });
        }
        
        if (new Date() > new Date(user.session_expires_at)) {
            return res.status(401).json({ message: 'Sessão expirada. Faça login novamente.' });
        }
        
        req.user = {
            id: user.id,
            name: user.name,
            email: user.email,
            is_admin: user.is_admin
        };
        
        next();
    } catch (err) {
        console.error('Error in authenticateRequest:', err);
        return res.status(401).json({ message: 'Token inválido.' });
    }
};


/*
 * POST /api/register
 *
 * Cria um novo usuário com nome e email. Gera um token de ativação e
 * marca a conta como não ativada. Retorna um link de ativação (no
 * mundo real seria enviado por email).
 */
app.post('/api/register', async (req, res) => {
  const { name, email, phone } = req.body;
  if (!name || !email || !phone) {
    return res.status(400).json({ message: 'Nome, email e telefone são obrigatórios.' });
  }
  try {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ message: 'Já existe um usuário com este email.' });
    }
    const { rows: countRows } = await pool.query('SELECT COUNT(*)::int AS count FROM users');
    const count = countRows[0].count;
    const isAdmin = count === 0; // primeiro usuário vira admin
    const activationToken = crypto.randomBytes(24).toString('hex');
    await pool.query(
      'INSERT INTO users (name, email, phone, is_admin, activated, activation_token) VALUES ($1, $2, $3, $4, $5, $6)',
      [name, email, phone, isAdmin, false, activationToken]
    );
    // Send activation email if SMTP configured; else return link for testing
    const activationUrl = `${APP_BASE_URL}/activate?token=${activationToken}&mode=register`;
    if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
      const transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_SECURE,
        auth: { user: SMTP_USER, pass: SMTP_PASS }
      });
      try {
        await transporter.sendMail({
          from: SMTP_FROM ? SMTP_FROM : `No-Reply <${SMTP_USER}>`,
          to: email,
          subject: 'Ative sua conta',
          html: generateActivationEmailHtml({ name, activationUrl })
        });
      } catch (mailErr) {
        console.error('Falha ao enviar email:', mailErr);
      }
      return res.status(201).json({ message: 'Usuário registrado. Enviamos um email de ativação.' });
    }
    return res.status(201).json({ message: 'Usuário registrado. Verifique seu email para ativar a conta.', activationLink: `/activate?token=${activationToken}` });
  } catch (err) {
    console.error('Error in /api/register:', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
});

/*
 * GET /api/patients
 * Lista pacientes do usuário autenticado
 */
app.get('/api/patients', authenticateRequest, async (req, res) => {
  try {
    const isAdmin = req.user.is_admin === true || req.user.is_admin === 'true';
    const q = String(req.query.q || '').trim();
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize, 10) || 20));
    const offset = (page - 1) * pageSize;

    const whereParts = [];
    const params = [];

    if (!isAdmin) {
      whereParts.push(`user_id = $${params.length + 1}`);
      params.push(req.user.id);
    }
    if (q) {
      whereParts.push(`(full_name ILIKE $${params.length + 1} OR cpf ILIKE $${params.length + 1})`);
      params.push(`%${q}%`);
    }
    const whereSql = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';

    const countSql = `SELECT COUNT(*)::int AS total FROM patients ${whereSql}`;
    const { rows: countRows } = await pool.query(countSql, params);
    const total = countRows[0]?.total ?? 0;

    const dataSql = `SELECT id, full_name, cpf FROM patients ${whereSql} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    const dataParams = params.concat([pageSize, offset]);
    const { rows } = await pool.query(dataSql, dataParams);

    res.set('X-Total-Count', String(total));
    res.set('X-Page', String(page));
    res.set('X-Page-Size', String(pageSize));
    return res.json(rows);
  } catch (err) {
    console.error('Error in /api/patients [GET]:', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
});

/*
 * POST /api/patients
 * Cria um paciente vinculado ao usuário
 */
app.post('/api/patients', authenticateRequest, async (req, res) => {
  try {
    const { fullName, cpf } = req.body;

    if (!fullName) {
      return res.status(400).json({ message: 'Nome completo é obrigatório.' });
    }

    const insert = await pool.query(
      'INSERT INTO patients (user_id, full_name, cpf) VALUES ($1, $2, $3) RETURNING id, full_name, cpf',
      [req.user.id, fullName, cpf] // Correção: de req.user.user_id para req.user.id
    );

    return res.status(201).json(insert.rows[0]);
  } catch (err) {
    console.error('Error in /api/patients [POST]:', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
});

/*
 * PUT /api/patients/:id
 * Atualiza um paciente existente
 */
app.put('/api/patients/:id', authenticateRequest, async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, cpf } = req.body;

    if (!fullName) {
      return res.status(400).json({ message: 'Nome completo é obrigatório.' });
    }

    // Verificar se o paciente existe e pertence ao usuário (ou se é admin)
    const { rows: existingRows } = await pool.query(
      'SELECT id, user_id FROM patients WHERE id = $1',
      [id]
    );

    if (existingRows.length === 0) {
      return res.status(404).json({ message: 'Paciente não encontrado.' });
    }

    const patient = existingRows[0];
    
    // Verificar se o usuário tem permissão para editar (é o dono ou é admin)
    if (patient.user_id !== req.user.id && !req.user.is_admin) {
      return res.status(403).json({ message: 'Sem permissão para editar este paciente.' });
    }

    // Atualizar o paciente
    const { rows: updatedRows } = await pool.query(
      'UPDATE patients SET full_name = $1, cpf = $2 WHERE id = $3 RETURNING id, full_name, cpf',
      [fullName, cpf, id]
    );

    return res.json(updatedRows[0]);
  } catch (err) {
    console.error('Error in /api/patients [PUT]:', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
});

/*
 * DELETE /api/patients/:id
 * Exclui um paciente
 */
app.delete('/api/patients/:id', authenticateRequest, async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se o paciente existe e pertence ao usuário (ou se é admin)
    const { rows: existingRows } = await pool.query(
      'SELECT id, user_id FROM patients WHERE id = $1',
      [id]
    );

    if (existingRows.length === 0) {
      return res.status(404).json({ message: 'Paciente não encontrado.' });
    }

    const patient = existingRows[0];
    
    // Verificar se o usuário tem permissão para excluir (é o dono ou é admin)
    if (patient.user_id !== req.user.id && !req.user.is_admin) {
      return res.status(403).json({ message: 'Sem permissão para excluir este paciente.' });
    }

    // Excluir o paciente
    await pool.query('DELETE FROM patients WHERE id = $1', [id]);

    return res.json({ message: 'Paciente excluído com sucesso!' });
  } catch (err) {
    console.error('Error in /api/patients [DELETE]:', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
});

// Forgot password: inativa a conta, gera novo token e envia email de ativação com contexto reset
app.post('/api/forgot-password', async (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ message: 'Email é obrigatório.' });
  try {
    const { rows } = await pool.query('SELECT id, name, email FROM users WHERE email = $1', [email]);
    if (rows.length === 0) {
      // Resposta genérica
      return res.json({ message: 'Se o email existir, enviaremos instruções de redefinição.' });
    }
    const user = rows[0];
    const activationToken = crypto.randomBytes(24).toString('hex');
    await pool.query('UPDATE users SET activated = FALSE, activation_token = $1 WHERE id = $2', [activationToken, user.id]);
    if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
      const transporter = nodemailer.createTransport({ host: SMTP_HOST, port: SMTP_PORT, secure: SMTP_SECURE, auth: { user: SMTP_USER, pass: SMTP_PASS } });
      const activationUrl = `${APP_BASE_URL}/activate?token=${activationToken}&mode=reset`;
      try {
        await transporter.sendMail({
          from: SMTP_FROM ? SMTP_FROM : `No-Reply <${SMTP_USER}>`,
          to: user.email,
          subject: 'Redefina sua senha',
          html: generateResetEmailHtml({ name: user.name, activationUrl })
        });
      } catch (mailErr) {
        console.error('Falha ao enviar email de redefinição:', mailErr);
      }
    }
    return res.json({ message: 'Se o email existir, enviaremos instruções de redefinição.' });
  } catch (err) {
    console.error('Error in /api/forgot-password:', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
});

// Ativar conta e definir senha. Retorna JWT (frontend decide usar ou não)
app.post('/api/activate-with-password', async (req, res) => {
  const { token, newPassword } = req.body || {};
  if (!token || !newPassword) return res.status(400).json({ message: 'Token e nova senha são obrigatórios.' });
  try {
    const { rows } = await pool.query('SELECT id, name, email, is_admin FROM users WHERE activation_token = $1', [token]);
    if (rows.length === 0) return res.status(400).json({ message: 'Token inválido.' });
    const user = rows[0];
    const hashed = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password = $1, activated = TRUE, activation_token = NULL WHERE id = $2', [hashed, user.id]);
    const jwtToken = jwt.sign({ id: user.id, name: user.name, email: user.email, is_admin: user.is_admin }, JWT_SECRET, { expiresIn: '8h' });
    return res.json({ message: 'Conta ativada e senha definida.', token: jwtToken, name: user.name, isAdmin: user.is_admin });
  } catch (err) {
    console.error('Error in /api/activate-with-password:', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
});

/*
 * POST /api/activate
 *
 * Ativa a conta a partir de um token. Após sucesso, o usuário deve
 * definir a senha em /api/reset-password informando email e nova senha.
 */
app.post('/api/activate', async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ message: 'Token é obrigatório.' });
  try {
    const { rows } = await pool.query('SELECT id, email FROM users WHERE activation_token = $1', [token]);
    if (rows.length === 0) return res.status(400).json({ message: 'Token inválido.' });
    await pool.query('UPDATE users SET activated = TRUE, activation_token = NULL WHERE id = $1', [rows[0].id]);
    return res.json({ message: 'Conta ativada. Crie sua senha.', email: rows[0].email });
  } catch (err) {
    console.error('Error in /api/activate:', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
});

/*
 * POST /api/login
 *
 * Authenticates a user. Expects a JSON body with `email` and
 * `password`. On success returns a JWT containing the user id, name and
 * email. On failure returns 401.
 */
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }
  try {
    const result = await pool.query('SELECT id, name, email, password, is_admin, activated, cpf, phone, session_token, session_expires_at FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }
    const user = result.rows[0];
    if (!user.activated) {
      return res.status(403).json({ message: 'Conta não ativada. Verifique seu email.' });
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    // Gerar novo token de sessão
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const sessionExpiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000); // 8 horas

    // Invalidar sessões anteriores do usuário
    await pool.query(
      'UPDATE users SET session_token = $1, session_expires_at = $2, last_login_at = CURRENT_TIMESTAMP WHERE id = $3',
      [sessionToken, sessionExpiresAt, user.id]
    );

    const token = jwt.sign({ 
      id: user.id, 
      name: user.name, 
      email: user.email, 
      is_admin: user.is_admin,
      sessionToken: sessionToken
    }, JWT_SECRET, { expiresIn: '8h' });
    
    const needsFirstAccess = !user.cpf; // Apenas CPF é verificado agora
    return res.json({ 
      token, 
      name: user.name, 
      isAdmin: user.is_admin, 
      needsFirstAccess,
      sessionToken: sessionToken
    });
  } catch (err) {
    console.error('Error in /api/login:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

/*
 * POST /api/logout
 *
 * Invalida a sessão do usuário no banco de dados.
 */
app.post('/api/logout', authenticateRequest, async (req, res) => {
  try {
    // Invalidar sessão no banco
    await pool.query(
      'UPDATE users SET session_token = NULL, session_expires_at = NULL WHERE id = $1',
      [req.user.id]
    );
    
    return res.json({ message: 'Logout realizado com sucesso.' });
  } catch (err) {
    console.error('Error in /api/logout:', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
});

/*
 * POST /api/reset-password
 *
 * Allows a user to reset their password. Expects a JSON body with
 * `email` and `newPassword`. If the user exists the password is
 * updated; otherwise a generic success message is returned to avoid
 * leaking information about accounts.
 */
app.post('/api/reset-password', async (req, res) => {
  const { email, newPassword } = req.body;
  if (!email || !newPassword) {
    return res.status(400).json({ message: 'Email e nova senha são obrigatórios.' });
  }
  try {
    const hashed = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password = $1 WHERE email = $2', [hashed, email]);
    return res.json({ message: 'Senha definida com sucesso.' });
  } catch (err) {
    console.error('Error in /api/reset-password:', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
});

/*
 * GET /api/me
 *
 * Returns the authenticated user’s information. Requires an
 * `Authorization` header with a valid JWT. Responds with 401 if the
 * token is missing or invalid.
 */
app.get('/api/me', authenticateRequest, async (req, res) => {
  try {
    // Retrieve the latest user info from the database in case data has changed.
    const result = await pool.query('SELECT id, name, email, phone, cpf, is_admin, created_at FROM users WHERE id = $1', [req.user.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }
    const user = result.rows[0];
    return res.json({ id: user.id, name: user.name, email: user.email, phone: user.phone, cpf: user.cpf, isAdmin: user.is_admin, createdAt: user.created_at });
  } catch (err) {
    return res.status(401).json({ message: 'Unauthorized.' });
  }
});

/*
 * POST /api/requests
 *
 * Creates a new credit request. Requires authentication. The request
 * body must include payerName, payerCpf, receiverName, receiverCpf,
 * amount and paymentMethod. The authenticated user becomes the
 * creator of the request. A status of 'Pendente' is assigned by
 * default.
 */
app.post('/api/requests', authenticateRequest, async (req, res) => {
  try {
    const { payerName, payerCpf, receiverName, receiverCpf, amount, paymentMethod, description } = req.body;
    
    if (paymentMethod !== 'PIX') {
      return res.status(400).json({ message: 'Este endpoint aceita apenas PIX como método de pagamento.' });
    }
    
    if (!payerName || !payerCpf || !receiverName || !amount) {
      return res.status(400).json({ message: 'Todos os campos obrigatórios, exceto CPF do paciente, devem ser preenchidos.' });
    }

    const pixData = pixService.generateStaticPix(
      amount,
      '' // descrição vazia para não incluir texto no BR Code
    );

    const qrCodeDataURL = await pixService.getQRCodeDataURL(pixData.pixCode);

    const result = await pool.query(
      `INSERT INTO credit_requests (payer_name, payer_cpf, receiver_name, receiver_cpf, amount, payment_method, creator_id, transaction_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [payerName, payerCpf, receiverName, receiverCpf, Number(amount), paymentMethod, req.user.id, pixData.transactionId]
    );

    const newRequestId = result.rows[0].id;

    return res.status(201).json({ 
      message: 'Solicitação de crédito criada com sucesso.',
      requestId: newRequestId,
      pixData: { ...pixData, qrCodeDataURL }
    });

  } catch (err) {
    console.error('Error in /api/requests [POST]:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

/*
 * GET /api/requests
 *
 * Retrieves credit requests for the authenticated user. An admin can
 * pass the query parameter `all=true` to retrieve all requests
 * regardless of who created them. Requests are returned in
 * reverse chronological order.
 */
app.get('/api/requests', authenticateRequest, async (req, res) => {
  try {
    const isAdmin = req.user.is_admin === true || req.user.is_admin === 'true';
    const all = req.query.all === 'true';
    let result;
    if (isAdmin && all) {
      result = await pool.query(
        `SELECT cr.*, u.name AS creator_name, u.email AS creator_email
         FROM credit_requests cr
         JOIN users u ON cr.creator_id = u.id
         ORDER BY cr.created_at DESC`
      );
    } else {
      result = await pool.query(
        `SELECT cr.*, u.name AS creator_name, u.email AS creator_email
         FROM credit_requests cr
         JOIN users u ON cr.creator_id = u.id
         WHERE cr.creator_id = $1
         ORDER BY cr.created_at DESC`,
        [req.user.id]
      );
    }
    return res.json(result.rows);
  } catch (err) {
    console.error('Error in /api/requests [GET]:', err);
    return res.status(401).json({ message: 'Unauthorized.' });
  }
});

/*
 * GET /api/requests/:id
 *
 * Returns a single credit request by ID. Only the creator of the
 * request or an admin may view the details.
 */
app.get('/api/requests/:id', authenticateRequest, async (req, res) => {
  try {
    const requestId = parseInt(req.params.id, 10);
    if (isNaN(requestId)) {
      return res.status(400).json({ message: 'Invalid request ID.' });
    }
    const result = await pool.query(
      `SELECT cr.*, u.name AS creator_name, u.email AS creator_email
       FROM credit_requests cr
       JOIN users u ON cr.creator_id = u.id
       WHERE cr.id = $1`,
      [requestId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Solicitação não encontrada.' });
    }
    const request = result.rows[0];
    const isAdmin = req.user.is_admin === true || req.user.is_admin === 'true';
    if (!isAdmin && request.creator_id !== req.user.id) {
      return res.status(403).json({ message: 'Acesso negado.' });
    }
    return res.json(request);
  } catch (err) {
    console.error('Error in /api/requests/:id [GET]:', err);
    return res.status(401).json({ message: 'Unauthorized.' });
  }
});

/*
 * GET /api/requests/:id/pix
 *
 * Regenera e retorna os dados do PIX para uma solicitação existente.
 * Apenas para o criador ou admin, e se o status for 'Pendente'.
 */
app.get('/api/requests/:id/pix', authenticateRequest, async (req, res) => {
  try {
    const requestId = parseInt(req.params.id, 10);

    const result = await pool.query(
      'SELECT * FROM credit_requests WHERE id = $1',
      [requestId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Solicitação não encontrada.' });
    }

    const request = result.rows[0];
    const isAdmin = req.user.is_admin;

    if (!isAdmin && request.creator_id !== req.user.id) {
      return res.status(403).json({ message: 'Acesso negado.' });
    }

    if (request.status !== 'Pendente' || !request.transaction_id) {
      return res.status(400).json({ message: 'Não é possível gerar PIX para esta solicitação.' });
    }
    
    // CORREÇÃO: Garante que o valor seja um número antes de passar para o serviço.
    const amountAsNumber = parseFloat(request.amount);
    if (isNaN(amountAsNumber)) {
      return res.status(500).json({ message: 'Valor inválido na solicitação.' });
    }

    const pixData = pixService.regenerateStaticPix({
      amount: amountAsNumber,
      description: '',
      txid: '***',
    });
    
    const qrCodeDataURL = await pixService.getQRCodeDataURL(pixData.pixCode);

    return res.json({ ...pixData, qrCodeDataURL });

  } catch (err) {
    console.error('Error in /api/requests/:id/pix [GET]:', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
});


// Update profile (first access) - sets CPF and phone
app.post('/api/profile', authenticateRequest, async (req, res) => {
  try {
    const { cpf } = req.body;

    if (!cpf) {
      return res.status(400).json({ message: 'O CPF é obrigatório.' });
    }
    
    await pool.query('UPDATE users SET cpf = $1 WHERE id = $2', [cpf, req.user.id]);

    return res.json({ message: 'Perfil atualizado.' });
  } catch (err) {
    console.error('Error in /api/profile [POST]:', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
});

/*
 * PATCH /api/requests/:id/status
 *
 * Updates the status of a credit request. Only admins can update statuses.
 * Valid statuses: Pendente, Pago, Cancelado, Estornado
 */
app.patch('/api/requests/:id/status', authenticateRequest, async (req, res) => {
  try {
    const isAdmin = req.user.is_admin === true || req.user.is_admin === 'true';
    
    if (!isAdmin) {
      return res.status(403).json({ message: 'Acesso negado. Apenas administradores podem alterar status.' });
    }

    const requestId = parseInt(req.params.id, 10);
    if (isNaN(requestId)) {
      return res.status(400).json({ message: 'ID da solicitação inválido.' });
    }

    const { status } = req.body;
    const validStatuses = ['Pendente', 'Pago', 'Cancelado', 'Estornado'];
    
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ 
        message: 'Status inválido. Use: Pendente, Pago, Cancelado ou Estornado.' 
      });
    }

    // Verificar se a solicitação existe
    const checkResult = await pool.query('SELECT id FROM credit_requests WHERE id = $1', [requestId]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'Solicitação não encontrada.' });
    }

    // Atualizar o status
    await pool.query(
      'UPDATE credit_requests SET status = $1 WHERE id = $2',
      [status, requestId]
    );

    return res.json({ message: 'Status atualizado com sucesso.', status });
  } catch (err) {
    console.error('Error in /api/requests/:id/status [PATCH]:', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
});

/*
 * POST /api/create-static-pix
 * @deprecated Rota removida. A criação de PIX agora é feita em /api/requests.
 */

/*
 * POST /api/upload-receipt
 *
 * Upload receipt for PIX payment confirmation
 */
app.post('/api/upload-receipt', authenticateRequest, async (req, res) => {
  try {
    const { requestId, receiptData, receiptType } = req.body;
    
    if (!requestId || !receiptData) {
      return res.status(400).json({ message: 'ID da solicitação e dados do comprovante são obrigatórios.' });
    }

    // Verificar se a solicitação existe e pertence ao usuário ou é admin
    const isAdmin = req.user.is_admin === true || req.user.is_admin === 'true';
    let query, params;
    
    if (isAdmin) {
      query = 'SELECT id, status, transaction_id FROM credit_requests WHERE id = $1';
      params = [requestId];
    } else {
      query = 'SELECT id, status, transaction_id FROM credit_requests WHERE id = $1 AND creator_id = $2';
      params = [requestId, req.user.id];
    }
    
    const requestResult = await pool.query(query, params);
    
    if (requestResult.rows.length === 0) {
      return res.status(404).json({ message: 'Solicitação não encontrada.' });
    }

    // Normaliza o tipo (evita estourar limite da coluna e guarda MIME)
    const storedType = String(receiptType || 'application/octet-stream').slice(0, 50);

    // Persistir arquivo em disco sob uploads/receipts/YEAR/MONTH/DAY/
    const uploadsRoot = path.resolve('uploads');
    const now = new Date();
    const year = String(now.getFullYear());
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const dirPath = path.join(uploadsRoot, 'receipts', year, month, day);
    await fs.promises.mkdir(dirPath, { recursive: true });

    // receiptData esperado no formato data:<mime>;base64,<data>
    const match = String(receiptData || '').match(/^data:([^;]+);base64,(.*)$/);
    if (!match) {
      return res.status(400).json({ message: 'Formato do comprovante inválido.' });
    }
    const mime = match[1];
    const b64 = match[2];
    const buffer = Buffer.from(b64, 'base64');

    // Determina extensão por MIME
    const ext = mime === 'application/pdf' ? 'pdf'
      : mime === 'image/png' ? 'png'
      : mime === 'image/jpeg' ? 'jpg'
      : mime === 'image/jpg' ? 'jpg'
      : mime === 'image/gif' ? 'gif'
      : 'bin';
    // Usa o transaction_id como nome base do arquivo
    let txid = requestResult.rows[0]?.transaction_id;
    if (!txid) {
      txid = 'TX-' + Math.random().toString(36).slice(2, 10).toUpperCase();
      await pool.query('UPDATE credit_requests SET transaction_id = $1 WHERE id = $2', [txid, requestId]);
    }
    const safeTxid = String(txid).replace(/[^A-Za-z0-9_-]/g, '_');
    const fileName = `receipt_${requestId}_${safeTxid}.${ext}`;
    const filePath = path.join(dirPath, fileName);
    await fs.promises.writeFile(filePath, buffer);

    // Gera URL pública servida por /media
    const publicUrl = `/media/receipts/${year}/${month}/${day}/${fileName}`;

    // Atualiza registro: guarda URL, tipo e limpa receipt_data (opcional)
    await pool.query(
      'UPDATE credit_requests SET receipt_data = NULL, receipt_type = $1, receipt_uploaded_at = CURRENT_TIMESTAMP, receipt_url = $2 WHERE id = $3',
      [storedType, publicUrl, requestId]
    );

    return res.json({ 
      message: 'Comprovante enviado com sucesso! Aguarde a análise.',
      requestId,
      receiptUrl: publicUrl,
      receiptType: storedType
    });

  } catch (err) {
    console.error('Error in /api/upload-receipt [POST]:', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
});

// Funções PIX movidas para src/services/PixService.js
// A função generatePixCode foi removida pois agora usamos o PixService.

function generateBarcodeNumber(amount) {
  const bankCode = "001";
  const currencyCode = "9";
  const dueDate = "9999";
  const formattedAmount = parseFloat(amount).toFixed(2).replace('.', '').padStart(10, '0');
  const agencyAccount = "12345678901234567890";
  return `${bankCode}${currencyCode}${dueDate}${formattedAmount}${agencyAccount}`;
}

function getNextBusinessDay() {
  const date = new Date();
  date.setDate(date.getDate() + 3);
  return date.toLocaleDateString('pt-BR');
}

async function sendBoletoNotificationEmail(data) {
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE === 'true',
    auth: { user: SMTP_USER, pass: SMTP_PASS }
  });

  const mailOptions = {
    from: SMTP_FROM || SMTP_USER,
    to: data.payerEmail,
    subject: `Boleto para pagamento - Supermercado Florais`,
    html: generateBoletoNotificationHtml(data)
  };

  await transporter.sendMail(mailOptions);
}

function generateBoletoNotificationHtml(data) {
  return `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
    <div style="text-align:center;margin-bottom:16px">
      <img src="${APP_BASE_URL}/LogoFlorais.png" alt="Supermercado Florais" style="max-width:180px;height:auto"/>
    </div>
    
    <h2>Boleto para Pagamento - Supermercado Florais</h2>
    <p>Olá <strong>${escapeHtml(data.payerName)}</strong>,</p>
    <p>Você recebeu um boleto para pagamento do <strong>Supermercado Florais</strong>.</p>
    
    <div style="background:#f8f9fa;padding:20px;margin:20px 0;border-radius:8px;border:2px solid #28a745">
      <h3 style="color:#28a745">💰 Detalhes do Pagamento</h3>
      <p><strong>Valor:</strong> ${data.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
      <p><strong>Beneficiário:</strong> ${escapeHtml(data.receiverName)}</p>
      <p><strong>Estabelecimento:</strong> Supermercado Florais</p>
    </div>
    
    <div style="background:#e7f3ff;padding:15px;margin:20px 0;border-radius:8px;border:1px solid #b3d7ff">
      <p><strong>📋 Como Pagar:</strong></p>
      <p>• Acesse o internet banking do seu banco</p>
      <p>• Use o aplicativo do seu banco</p>
      <p>• Vá até uma agência bancária</p>
      <p>• Use o código de barras que será fornecido na loja</p>
    </div>
    
    <div style="background:#fff3cd;padding:15px;margin:20px 0;border-radius:8px;border:1px solid #ffeaa7">
      <p><strong>⚠️ Importante:</strong></p>
      <p>• O crédito será liberado apenas após a compensação do boleto</p>
      <p>• Prazo de compensação: até 3 dias úteis após o pagamento</p>
      <p>• Guarde o comprovante de pagamento</p>
    </div>
    
    <p>Em caso de dúvidas, entre em contato conosco.</p>
    <p>Atenciosamente,<br><strong>Supermercado Florais</strong><br>Gestão de Crédito</p>
  </div>`;
}

// Healthcheck endpoint to verify API and DB connectivity.
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    return res.status(200).json({ status: 'ok', db: 'up' });
  } catch (err) {
    return res.status(503).json({ status: 'degraded', db: 'down' });
  }
});

// Test email endpoint (for diagnostics). Sends a simple message to the provided address
// or defaults to SMTP_USER if not provided. Use only for troubleshooting.
// (endpoint de teste de e-mail removido)

// Helpers de template de email HTML
function generateActivationEmailHtml({ name, activationUrl }) {
  return `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
    <div style="text-align:center;margin-bottom:16px">
      <img src="${APP_BASE_URL}/LogoFlorais.png" alt="Super. Florais" style="max-width:180px;height:auto"/>
    </div>
    <h2>Bem-vindo, ${escapeHtml(name)}!</h2>
    <p>Ative sua conta clicando no botão abaixo:</p>
    <p><a href="${activationUrl}" style="background:#2e86de;color:#fff;padding:10px 16px;text-decoration:none;border-radius:4px">Ativar conta</a></p>
    <p>Ou copie e cole este link no navegador:<br><span style="color:#555">${activationUrl}</span></p>
  </div>`;
}

function generateResetEmailHtml({ name, activationUrl }) {
  return `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
    <div style="text-align:center;margin-bottom:16px">
      <img src="${APP_BASE_URL}/LogoFlorais.png" alt="Super. Florais" style="max-width:180px;height:auto"/>
    </div>
    <h2>Olá, ${escapeHtml(name)}</h2>
    <p>Recebemos uma solicitação para redefinir sua senha. Clique abaixo para continuar:</p>
    <p><a href="${activationUrl}" style="background:#e67e22;color:#fff;padding:10px 16px;text-decoration:none;border-radius:4px">Redefinir senha</a></p>
    <p>Se você não solicitou, ignore este email.<br>Link: <span style="color:#555">${activationUrl}</span></p>
  </div>`;
}

function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Start the server.
app.listen(PORT, () => {
  console.log(`Backend is running on port ${PORT}`);
  // Garante diretórios de uploads na inicialização
  const uploadsRoot = path.resolve('uploads');
  const receiptsRoot = path.join(uploadsRoot, 'receipts');
  fs.promises.mkdir(receiptsRoot, { recursive: true }).catch(() => {});
  
  // Cria estrutura de pastas por data para o ano atual
  const now = new Date();
  const currentYear = now.getFullYear();
  const receiptsYearRoot = path.join(receiptsRoot, String(currentYear));
  fs.promises.mkdir(receiptsYearRoot, { recursive: true }).catch(() => {});
  
  console.log(`📁 Uploads directory: ${uploadsRoot}`);
  console.log(`📁 Receipts directory: ${receiptsRoot}`);
  console.log(`📁 Year directory: ${receiptsYearRoot}`);
});