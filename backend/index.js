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
const crypto = require('crypto');
const { Pool } = require('pg');
const nodemailer = require('nodemailer');

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
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  await pool.query(createUsersTableSql);
  await pool.query(createRequestsTableSql);
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

/*
 * Helper function to authenticate a request based on the Authorization
 * header. If successful, resolves with the decoded token payload.
 */
function authenticateRequest(req) {
  return new Promise((resolve, reject) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      return reject(new Error('Missing Authorization header'));
    }
    const token = authHeader.split(' ')[1];
    if (!token) {
      return reject(new Error('Invalid Authorization header'));
    }
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        return reject(err);
      }
      resolve(decoded);
    });
  });
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
    const activationUrl = `${APP_BASE_URL}/activate?token=${activationToken}`;
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
          html: `<p>Olá ${name},</p><p>Ative sua conta clicando no link abaixo:</p><p><a href="${activationUrl}">${activationUrl}</a></p>`
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
    const { payerName, payerCpf, receiverName, receiverCpf, amount, paymentMethod } = req.body;
    if (!payerName || !payerCpf || !receiverName || !receiverCpf || !amount || !paymentMethod) {
      return res.status(400).json({ message: 'Todos os campos são obrigatórios.' });
    }
    // Insert the new credit request. By default status is 'Pendente'.
    await pool.query(
      `INSERT INTO credit_requests (payer_name, payer_cpf, receiver_name, receiver_cpf, amount, payment_method, creator_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [payerName, payerCpf, receiverName, receiverCpf, Number(amount), paymentMethod, payload.id]
    );
    return res.status(201).json({ message: 'Solicitação de crédito criada com sucesso.' });
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
app.post('/api/test-email', async (req, res) => {
  try {
    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
      return res.status(400).json({ message: 'SMTP não configurado. Defina SMTP_HOST, SMTP_USER e SMTP_PASS.' });
    }
    const to = (req.body && req.body.to) || SMTP_USER;
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: { user: SMTP_USER, pass: SMTP_PASS }
    });
    await transporter.verify();
    const info = await transporter.sendMail({
      from: SMTP_FROM ? SMTP_FROM : `No-Reply <${SMTP_USER}>`,
      to,
      subject: 'Teste de envio SMTP',
      text: 'Este é um e-mail de teste do sistema de crédito.',
    });
    return res.json({ message: 'Email enviado', to, messageId: info.messageId, envelope: info.envelope });
  } catch (err) {
    console.error('Erro no teste de email:', err);
    return res.status(500).json({ message: 'Falha no envio de email', error: String(err && err.message || err) });
  }
});

// Start the server.
app.listen(PORT, () => {
  console.log(`Backend is running on port ${PORT}`);
});
