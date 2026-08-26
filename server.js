const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
const multer = require('multer');
require('dotenv').config();

const DATABASE_URL = process.env.DATABASE_URL || process.env.DB_URL || 'postgres://postgres:postgres@db:5432/authdemo';
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'change-me';
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'change-me-jwt-secret';
const PORT = process.env.PORT || 3000;
const ENABLE_CORS = process.env.ENABLE_CORS === 'true';
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
const RETENTION_DAYS = parseInt(process.env.RETENTION_DAYS || '365', 10);
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, 'uploads');

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const pool = new Pool({ connectionString: DATABASE_URL });

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      client_sent_hashed BOOLEAN NOT NULL DEFAULT FALSE,
      consent_given BOOLEAN NOT NULL DEFAULT FALSE,
      consent_at TIMESTAMP WITH TIME ZONE,
      client_ip TEXT,
      user_agent TEXT,
      received_at TIMESTAMP WITH TIME ZONE NOT NULL
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS admins (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    );
  `);

  // files table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS files (
      id SERIAL PRIMARY KEY,
      user_email TEXT,
      original_name TEXT,
      stored_name TEXT NOT NULL,
      mime_type TEXT,
      size_bytes BIGINT,
      uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    );
  `);

  if (ADMIN_USER && ADMIN_PASSWORD) {
    const r = await pool.query('SELECT id FROM admins WHERE username=$1', [ADMIN_USER]);
    if (r.rowCount === 0) {
      const hash = await bcrypt.hash(ADMIN_PASSWORD, 12);
      await pool.query('INSERT INTO admins (username, password_hash) VALUES ($1,$2)', [ADMIN_USER, hash]);
      console.log('Seeded admin user:', ADMIN_USER);
    } else {
      console.log('Admin user already exists:', ADMIN_USER);
    }
  }
}

const app = express();
app.use(helmet());
app.use(bodyParser.json());
if (ENABLE_CORS) {
  const corsOptions = ALLOWED_ORIGINS.length ? { origin: ALLOWED_ORIGINS } : {};
  app.use(cors(corsOptions));
}

function getClientIp(req) {
  return (req.headers['x-forwarded-for'] || '').split(',').shift().trim() || req.socket.remoteAddress || null;
}

function requireAdminJWT(req, res, next) {
  const auth = req.headers['authorization'];
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).send('Unauthorized');
  const token = auth.slice('Bearer '.length).trim();
  try {
    const payload = jwt.verify(token, ADMIN_JWT_SECRET);
    req.admin = payload;
    next();
  } catch (e) {
    return res.status(403).send('Forbidden');
  }
}

// multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const safe = Date.now() + '-' + Math.random().toString(36).slice(2,8) + '-' + file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    cb(null, safe);
  }
});
const upload = multer({ storage });

app.post('/receive', async (req, res) => {
  const { email, password, consent, consent_at, consent_text, hashed } = req.body || {};
  if (!consent) return res.status(400).send('مطلوب موافقة صريحة (consent).');
  if (!consent_at) return res.status(400).send('مطلوب زمن الموافقة (consent_at).');
  if (!email || !password) return res.status(400).send('مفقود: email أو password.');

  try {
    const clientSentHashed = !!hashed;
    const passwordHash = clientSentHashed ? password : await bcrypt.hash(password, 12);
    const receivedAt = new Date().toISOString();
    const clientIp = getClientIp(req);
    const userAgent = req.headers['user-agent'] || null;

    const q = `INSERT INTO users (email, password_hash, client_sent_hashed, consent_given, consent_at, client_ip, user_agent, received_at)
               VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (email) DO UPDATE SET password_hash=EXCLUDED.password_hash, client_sent_hashed=EXCLUDED.client_sent_hashed, consent_given=EXCLUDED.consent_given, consent_at=EXCLUDED.consent_at, client_ip=EXCLUDED.client_ip, user_agent=EXCLUDED.user_agent, received_at=EXCLUDED.received_at RETURNING id`;
    const values = [email, passwordHash, clientSentHashed, true, consent_at, clientIp, userAgent, receivedAt];
    const r = await pool.query(q, values);
    res.send({ ok: true, id: r.rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).send('خطأ في الخادم.');
  }
});

// upload endpoint (multipart/form-data)
app.post('/upload', upload.array('files'), async (req, res) => {
  try {
    const consent = req.body.consent === 'true' || req.body.consent === true;
    const consent_at = req.body.consent_at || new Date().toISOString();
    const email = req.body.email || null;

    if (!consent) {
      if (req.files) for (const f of req.files) fs.unlinkSync(f.path);
      return res.status(400).json({ error: 'مطلوب موافقة صريحة (consent).' });
    }

    if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'لا ملفات مرفوعة.' });

    const saved = [];
    for (const f of req.files) {
      await pool.query('INSERT INTO files (user_email, original_name, stored_name, mime_type, size_bytes) VALUES ($1,$2,$3,$4,$5)', [email, f.originalname, f.filename, f.mimetype, f.size]);
      saved.push({ original: f.originalname, stored: f.filename, size: f.size });
    }

    res.json({ ok: true, saved: saved.length, files: saved });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'server error' });
  }
});

// admin files list
app.get('/admin/files', requireAdminJWT, async (req, res) => {
  try {
    const r = await pool.query('SELECT id, user_email, original_name, stored_name, mime_type, size_bytes, uploaded_at FROM files ORDER BY uploaded_at DESC LIMIT 200');
    res.json(r.rows);
  } catch (e) {
    console.error(e);
    res.status(500).send('DB error');
  }
});

app.post('/admin/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).send('username and password required');
  try {
    const r = await pool.query('SELECT id, password_hash FROM admins WHERE username=$1', [username]);
    if (r.rowCount === 0) return res.status(401).send('invalid credentials');
    const row = r.rows[0];
    const ok = await bcrypt.compare(password, row.password_hash);
    if (!ok) return res.status(401).send('invalid credentials');
    const token = jwt.sign({ id: row.id, username }, ADMIN_JWT_SECRET, { expiresIn: '8h' });
    res.json({ token });
  } catch (e) {
    console.error(e);
    res.status(500).send('server error');
  }
});

app.get('/records', requireAdminJWT, async (req, res) => {
  try {
    const r = await pool.query('SELECT id, email, password_hash, client_sent_hashed, consent_given, consent_at, client_ip, user_agent, received_at FROM users ORDER BY id DESC');
    const masked = r.rows.map(row => ({
      id: row.id,
      email: row.email,
      password_hash_preview: row.password_hash ? (row.password_hash.substring(0,12) + '...') : null,
      client_sent_hashed: row.client_sent_hashed,
      consent_given: row.consent_given,
      consent_at: row.consent_at,
      client_ip: row.client_ip,
      user_agent: row.user_agent,
      received_at: row.received_at
    }));
    res.json(masked);
  } catch (e) {
    console.error(e);
    res.status(500).send('DB error');
  }
});

app.get('/', (req, res) => res.send('auth-consent-demo server running'));

process.on('SIGINT', () => {
  console.log('Shutting down');
  pool.end(() => process.exit(0));
});

(async () => {
  try {
    await initDb();
    app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
  } catch (e) {
    console.error('Failed to initialize DB', e);
    process.exit(1);
  }
})();
