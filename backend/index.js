/*
 * Backend server for the credit system.
 *
 * This Express application exposes a small REST API used by the React
 * front‑end to register, authenticate, and reset user credentials. It
 * connects to a PostgreSQL database via the `pg` module and uses
 * bcrypt to securely hash passwords and jsonwebtoken to issue JWTs
 * after successful authentication.
 */

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');
const crypto = require('crypto');
const { Pool } = require('pg');
const nodemailer = require('nodemailer');
const axios = require('axios');

// Importar módulos organizados
const pixRoutes = require('./src/routes/pixRoutes');
const PixService = require('./src/services/PixService');
const { authenticateRequestLegacy } = require('./src/middleware/auth');

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

// ASAAS Configuration
const ASAAS_API_TOKEN = process.env.ASAAS_API_TOKEN;
const ASAAS_BASE_URL = process.env.ASAAS_BASE_URL || 'https://sandbox.asaas.com/api/v3'; // Default para SANDBOX
const ASAAS_PIX_KEY = process.env.ASAAS_PIX_KEY;

// PIX Estático Configuration
const STATIC_PIX_KEY = process.env.STATIC_PIX_KEY || 'pix@supermercadoflorais.com.br';

// Create a connection pool. When running in Docker the host will
// resolve to the service name `db` defined in docker‑compose.yml.
const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
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
      receiver_cpf VARCHAR(20) NOT NULL,
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
      cpf VARCHAR(20) NOT NULL,
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
app.use(express.json());

// Instanciar serviços
const pixService = new PixService();

// Configurar rotas
app.use('/api/pix', pixRoutes);
// Serve static media uploads at /media
app.use('/media', express.static(path.resolve('uploads')));

/*
 * Helper function to authenticate a request based on the Authorization
 * header. If successful, resolves with the decoded token payload.
 * 
 * @deprecated Use authenticateRequestLegacy from middleware/auth.js instead
 */
async function authenticateRequest(req) {
  return authenticateRequestLegacy(req);
}

/*
 * POST /api/register
 *
 * Cria um novo usuário com nome e email. Gera um token de ativação e
 * marca a conta como não ativada. Retorna um link de ativação (no
 * mundo real seria enviado por email).
 */
app.post('/api/register', async (req, res) => {
  const { name, email } = req.body;
  if (!name || !email) {
    return res.status(400).json({ message: 'Nome e email são obrigatórios.' });
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
      'INSERT INTO users (name, email, is_admin, activated, activation_token) VALUES ($1, $2, $3, $4, $5)',
      [name, email, isAdmin, false, activationToken]
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
app.get('/api/patients', async (req, res) => {
  try {
    const payload = await authenticateRequest(req);
    const result = await pool.query(
      'SELECT id, full_name, cpf FROM patients WHERE user_id = $1 ORDER BY created_at DESC',
      [payload.id] // Correção: de payload.user_id para payload.id
    );
    return res.json(result.rows);
  } catch (err) {
    console.error('Error in /api/patients [GET]:', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
});

/*
 * POST /api/patients
 * Cria um paciente vinculado ao usuário
 */
app.post('/api/patients', async (req, res) => {
  try {
    const payload = await authenticateRequest(req);
    const { fullName, cpf } = req.body;

    if (!fullName || !cpf) {
      return res.status(400).json({ message: 'Nome completo e CPF são obrigatórios.' });
    }

    const insert = await pool.query(
      'INSERT INTO patients (user_id, full_name, cpf) VALUES ($1, $2, $3) RETURNING id, full_name, cpf',
      [payload.id, fullName, cpf] // Correção: de payload.user_id para payload.id
    );

    return res.status(201).json(insert.rows[0]);
  } catch (err) {
    console.error('Error in /api/patients [POST]:', err);
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
    const result = await pool.query('SELECT id, name, email, password, is_admin, activated, cpf, phone FROM users WHERE email = $1', [email]);
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
    const token = jwt.sign({ id: user.id, name: user.name, email: user.email, is_admin: user.is_admin }, JWT_SECRET, { expiresIn: '8h' });
    const needsFirstAccess = !user.cpf || !user.phone;
    return res.json({ token, name: user.name, isAdmin: user.is_admin, needsFirstAccess });
  } catch (err) {
    console.error('Error in /api/login:', err);
    return res.status(500).json({ message: 'Internal server error.' });
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
app.get('/api/me', async (req, res) => {
  try {
    const payload = await authenticateRequest(req);
    // Retrieve the latest user info from the database in case data has changed.
    const result = await pool.query('SELECT id, name, email, phone, cpf, is_admin, created_at FROM users WHERE id = $1', [payload.id]);
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
app.post('/api/requests', async (req, res) => {
  try {
    const payload = await authenticateRequest(req);
    const { payerName, payerCpf, receiverName, receiverCpf, amount, paymentMethod, description } = req.body;
    if (!payerName || !payerCpf || !receiverName || !receiverCpf || !amount || !paymentMethod) {
      return res.status(400).json({ message: 'Todos os campos são obrigatórios.' });
    }

    let pixData = null;
    let txid = null;

    // Se o método for PIX, gera os dados antes de inserir no banco
    if (paymentMethod === 'PIX') {
      pixData = pixService.generateStaticPix(parseFloat(amount), description || `Pagamento para ${receiverName}`);
      txid = pixData.transactionId;
    }

    // Insere a nova solicitação e o txid (se houver)
    const result = await pool.query(
      `INSERT INTO credit_requests (payer_name, payer_cpf, receiver_name, receiver_cpf, amount, payment_method, creator_id, transaction_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [payerName, payerCpf, receiverName, receiverCpf, Number(amount), paymentMethod, payload.id, txid]
    );

    const newRequestId = result.rows[0].id;

    return res.status(201).json({ 
      message: 'Solicitação de crédito criada com sucesso.',
      requestId: newRequestId,
      pixData: pixData // Retorna os dados do PIX para o frontend
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
app.get('/api/requests', async (req, res) => {
  try {
    const payload = await authenticateRequest(req);
    const isAdmin = payload.is_admin === true || payload.is_admin === 'true';
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
        [payload.id]
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
app.get('/api/requests/:id', async (req, res) => {
  try {
    const payload = await authenticateRequest(req);
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
    const isAdmin = payload.is_admin === true || payload.is_admin === 'true';
    if (!isAdmin && request.creator_id !== payload.id) {
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
app.get('/api/requests/:id/pix', async (req, res) => {
  try {
    const payload = await authenticateRequest(req);
    const requestId = parseInt(req.params.id, 10);

    const result = await pool.query(
      'SELECT * FROM credit_requests WHERE id = $1',
      [requestId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Solicitação não encontrada.' });
    }

    const request = result.rows[0];
    const isAdmin = payload.is_admin === true || payload.is_admin === 'true';

    if (!isAdmin && request.creator_id !== payload.id) {
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
      description: `Pagamento para ${request.receiver_name}`,
      txid: request.transaction_id,
    });

    return res.json(pixData);

  } catch (err) {
    console.error('Error in /api/requests/:id/pix [GET]:', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
});


// Update profile (first access) - sets CPF and phone
app.post('/api/profile', async (req, res) => {
  try {
    const payload = await authenticateRequest(req);
    const { cpf, phone } = req.body;
    if (!cpf || !phone) return res.status(400).json({ message: 'CPF e telefone são obrigatórios.' });
    await pool.query('UPDATE users SET cpf = $1, phone = $2 WHERE id = $3', [cpf, phone, payload.id]);
    return res.json({ message: 'Perfil atualizado.' });
  } catch (err) {
    return res.status(401).json({ message: 'Unauthorized.' });
  }
});

/*
 * PATCH /api/requests/:id/status
 *
 * Updates the status of a credit request. Only admins can update statuses.
 * Valid statuses: Pendente, Pago, Cancelado, Estornado
 */
app.patch('/api/requests/:id/status', async (req, res) => {
  try {
    const payload = await authenticateRequest(req);
    const isAdmin = payload.is_admin === true || payload.is_admin === 'true';
    
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
 * @deprecated Use /api/pix/create-static instead
 * 
 * Mantido para compatibilidade temporária
 */
app.post('/api/create-static-pix', async (req, res) => {
  try {
    const payload = await authenticateRequest(req);
    const { payerEmail, payerName, receiverName, receiverCpf, amount } = req.body;
    
    if (!payerEmail || !payerName || !receiverName || !amount) {
      return res.status(400).json({ message: 'Dados incompletos para criar PIX.' });
    }

    // Usar o novo serviço PIX
    const pixData = pixService.generateStaticPix(parseFloat(amount), `Pagamento para ${receiverName}`);
    
    return res.json({
      message: 'PIX estático gerado com sucesso!',
      payment: {
        type: 'PIX',
        amount: pixData.amount,
        receiverName,
        receiverCpf,
        pixKey: pixData.pixKey,
        pixCode: pixData.pixCode,
        qrCodeUrl: pixData.qrCodeUrl,
        transactionId: pixData.transactionId,
        instructions: 'Após realizar o pagamento, envie o comprovante para confirmação.'
      },
      provider: 'STATIC_PIX'
    });

  } catch (err) {
    console.error('Error in /api/create-static-pix [POST]:', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
});

/*
 * POST /api/upload-receipt
 *
 * Upload receipt for PIX payment confirmation
 */
app.post('/api/upload-receipt', async (req, res) => {
  try {
    const payload = await authenticateRequest(req);
    const { requestId, receiptData, receiptType } = req.body;
    
    if (!requestId || !receiptData) {
      return res.status(400).json({ message: 'ID da solicitação e dados do comprovante são obrigatórios.' });
    }

    // Verificar se a solicitação existe e pertence ao usuário ou é admin
    const isAdmin = payload.is_admin === true || payload.is_admin === 'true';
    let query, params;
    
    if (isAdmin) {
      query = 'SELECT id, status FROM credit_requests WHERE id = $1';
      params = [requestId];
    } else {
      query = 'SELECT id, status FROM credit_requests WHERE id = $1 AND user_id = $2';
      params = [requestId, payload.id];
    }
    
    const requestResult = await pool.query(query, params);
    
    if (requestResult.rows.length === 0) {
      return res.status(404).json({ message: 'Solicitação não encontrada.' });
    }

    // Salvar comprovante (aqui você salvaria o arquivo, por enquanto apenas metadata)
    await pool.query(
      'UPDATE credit_requests SET receipt_data = $1, receipt_type = $2, receipt_uploaded_at = CURRENT_TIMESTAMP WHERE id = $3',
      [receiptData, receiptType || 'image', requestId]
    );

    return res.json({ 
      message: 'Comprovante enviado com sucesso! Aguarde a análise.',
      requestId 
    });

  } catch (err) {
    console.error('Error in /api/upload-receipt [POST]:', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
});

// Função para criar PIX via ASAAS
async function createAsaasPix(data) {
  const customerData = await createOrGetAsaasCustomer({
    name: data.payerName,
    email: data.payerEmail
  });

  const paymentPayload = {
    customer: customerData.id,
    billingType: 'PIX',
    value: data.amount,
    dueDate: new Date().toISOString().split('T')[0],
    description: `Pagamento para ${data.receiverName}`,
    pixAddressKey: ASAAS_PIX_KEY
  };

  const response = await axios.post(`${ASAAS_BASE_URL}/payments`, paymentPayload, {
    headers: {
      'access_token': ASAAS_API_TOKEN,
      'Content-Type': 'application/json'
    }
  });

  const payment = response.data;
  
  // Buscar dados do PIX
  const pixResponse = await axios.get(`${ASAAS_BASE_URL}/payments/${payment.id}/pixQrCode`, {
    headers: { 'access_token': ASAAS_API_TOKEN }
  });

  return {
    type: 'PIX',
    id: payment.id,
    amount: payment.value,
    receiverName: data.receiverName,
    pixCode: pixResponse.data.payload,
    qrCodeUrl: pixResponse.data.encodedImage,
    status: payment.status,
    dueDate: payment.dueDate
  };
}

// Função para criar Boleto via ASAAS
async function createAsaasBoleto(data) {
  const customerData = await createOrGetAsaasCustomer({
    name: data.payerName,
    email: data.payerEmail,
    cpfCnpj: data.receiverCpf
  });

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 3);

  const paymentPayload = {
    customer: customerData.id,
    billingType: 'BOLETO',
    value: data.amount,
    dueDate: dueDate.toISOString().split('T')[0],
    description: `Pagamento para ${data.receiverName}`,
    externalReference: `BOLETO-${Date.now()}`
  };

  const response = await axios.post(`${ASAAS_BASE_URL}/payments`, paymentPayload, {
    headers: {
      'access_token': ASAAS_API_TOKEN,
      'Content-Type': 'application/json'
    }
  });

  const payment = response.data;

  return {
    type: 'Boleto',
    id: payment.id,
    amount: payment.value,
    receiverName: data.receiverName,
    receiverCpf: data.receiverCpf,
    barcodeNumber: payment.bankSlipUrl ? 'Ver link para código' : generateBarcodeNumber(data.amount),
    dueDate: payment.dueDate,
    documentNumber: payment.nossoNumero || payment.id,
    bankSlipUrl: payment.bankSlipUrl,
    status: payment.status
  };
}

// Função para criar ou buscar cliente no ASAAS
async function createOrGetAsaasCustomer(customerData) {
  try {
    // Tentar buscar cliente existente por email
    const searchResponse = await axios.get(`${ASAAS_BASE_URL}/customers`, {
      headers: { 'access_token': ASAAS_API_TOKEN },
      params: { email: customerData.email }
    });

    if (searchResponse.data.data && searchResponse.data.data.length > 0) {
      return searchResponse.data.data[0];
    }

    // Se não existir, criar novo cliente
    const createResponse = await axios.post(`${ASAAS_BASE_URL}/customers`, {
      name: customerData.name,
      email: customerData.email,
      cpfCnpj: customerData.cpfCnpj
    }, {
      headers: {
        'access_token': ASAAS_API_TOKEN,
        'Content-Type': 'application/json'
      }
    });

    return createResponse.data;
  } catch (err) {
    console.error('Erro ao criar/buscar cliente ASAAS:', err);
    throw err;
  }
}

// Fallback para sistema fake
async function handleFakePayment(req, res) {
  const { payerEmail, payerName, receiverName, amount, paymentMethod } = req.body;
  
  let paymentData;
  if (paymentMethod === 'PIX') {
    paymentData = {
      type: 'PIX',
      amount: parseFloat(amount),
      receiverName,
      pixCode: generatePixCode(amount, `Pagamento para ${receiverName}`),
      qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(generatePixCode(amount, `Pagamento para ${receiverName}`))}`
    };
  } else {
    paymentData = {
      type: 'Boleto',
      amount: parseFloat(amount),
      receiverName,
      barcodeNumber: generateBarcodeNumber(amount),
      dueDate: getNextBusinessDay(),
      documentNumber: `BOL${Date.now().toString().slice(-8)}`
    };
  }

  // Enviar email se configurado
  let emailSent = false;
  if (SMTP_HOST && SMTP_USER && SMTP_PASS && paymentMethod === 'Boleto') {
    try {
      await sendBoletoNotificationEmail({
        payerEmail,
        payerName,
        receiverName,
        amount: parseFloat(amount)
      });
      emailSent = true;
    } catch (emailErr) {
      console.error('Erro ao enviar email:', emailErr);
    }
  }

  return res.json({
    message: 'Pagamento criado (sistema local)!',
    payment: { ...paymentData, emailSent },
    provider: 'LOCAL'
  });
}

// Funções PIX movidas para src/services/PixService.js

function generatePixCode(value, desc) {
  const timestamp = Date.now();
  const mockKey = "pix@superflorais.com.br";
  return `00020126580014BR.GOV.BCB.PIX0136${mockKey}520400005303986540${parseFloat(value).toFixed(2)}5802BR5925Gestao Credito Super Flora6009SAO PAULO62070503${timestamp.toString().slice(-6)}6304`;
}

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
});
