import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import db, { initDatabase } from './db.js';
import { generateToken, authMiddleware } from './auth.js';

dotenv.config();
dotenv.config({ path: '.env.local' });

// Initialize database schema
initDatabase();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: '*' }));
app.use(express.json());

// ----------------- HEALTH CHECK -----------------
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: 'SaaS Multi-Tenant Cloud API',
    timestamp: new Date().toISOString(),
  });
});

// ----------------- AUTHENTICATION -----------------

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, companyName } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
    if (existing) {
      return res.status(400).json({ error: 'An account with this email already exists' });
    }

    const tenantId = 'org_' + Math.random().toString(36).substring(2, 10);
    const userId = 'usr_' + Math.random().toString(36).substring(2, 10);
    const now = new Date().toISOString();

    // Create Tenant
    db.prepare(`
      INSERT INTO tenants (id, name, plan, status, createdAt, updatedAt)
      VALUES (?, ?, 'pro', 'active', ?, ?)
    `).run(tenantId, companyName || `${name}'s Agency`, now, now);

    // Hash Password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create User
    db.prepare(`
      INSERT INTO users (id, tenantId, name, email, passwordHash, role, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, 'owner', ?, ?)
    `).run(userId, tenantId, name, normalizedEmail, passwordHash, now, now);

    const user = { id: userId, tenantId, name, email: normalizedEmail, role: 'owner' };
    const token = generateToken(user);

    return res.status(201).json({
      success: true,
      token,
      user,
      tenant: { id: tenantId, name: companyName || `${name}'s Agency`, plan: 'pro' },
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(normalizedEmail);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const tenant = db.prepare('SELECT * FROM tenants WHERE id = ?').get(user.tenantId);
    const token = generateToken(user);

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        tenantId: user.tenantId,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      tenant: tenant || { id: user.tenantId, name: 'My Agency', plan: 'pro' },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me
app.get('/api/auth/me', authMiddleware, (req, res) => {
  try {
    const user = db.prepare('SELECT id, tenantId, name, email, role FROM users WHERE id = ?').get(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const tenant = db.prepare('SELECT * FROM tenants WHERE id = ?').get(user.tenantId);
    res.json({ user, tenant });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------- MULTI-TENANT ENTITY CRUD -----------------

// Helper function to create resource endpoints
function registerResourceEndpoints(resourceName, tableName, jsonFields = []) {
  // GET all
  app.get(`/api/${resourceName}`, authMiddleware, (req, res) => {
    try {
      const items = db.prepare(`SELECT * FROM ${tableName} WHERE tenantId = ? ORDER BY createdAt DESC`).all(req.tenantId);
      const parsed = items.map((it) => {
        const copy = { ...it };
        jsonFields.forEach((field) => {
          if (copy[field] && typeof copy[field] === 'string') {
            try { copy[field] = JSON.parse(copy[field]); } catch (e) {}
          }
        });
        return copy;
      });
      res.json(parsed);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET one
  app.get(`/api/${resourceName}/:id`, authMiddleware, (req, res) => {
    try {
      const item = db.prepare(`SELECT * FROM ${tableName} WHERE id = ? AND tenantId = ?`).get(req.params.id, req.tenantId);
      if (!item) return res.status(404).json({ error: 'Not found' });
      jsonFields.forEach((field) => {
        if (item[field] && typeof item[field] === 'string') {
          try { item[field] = JSON.parse(item[field]); } catch (e) {}
        }
      });
      res.json(item);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST create
  app.post(`/api/${resourceName}`, authMiddleware, (req, res) => {
    try {
      const id = req.body.id || `${resourceName.slice(0, 3)}_${Math.random().toString(36).substring(2, 10)}`;
      const now = new Date().toISOString();
      const body = { ...req.body, id, tenantId: req.tenantId, createdAt: req.body.createdAt || now, updatedAt: now };

      jsonFields.forEach((field) => {
        if (body[field] && typeof body[field] === 'object') {
          body[field] = JSON.stringify(body[field]);
        }
      });

      const columns = Object.keys(body).join(', ');
      const placeholders = Object.keys(body).map(() => '?').join(', ');
      const values = Object.values(body);

      db.prepare(`INSERT INTO ${tableName} (${columns}) VALUES (${placeholders})`).run(...values);
      res.status(201).json({ success: true, item: body });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // PUT update
  app.put(`/api/${resourceName}/:id`, authMiddleware, (req, res) => {
    try {
      const now = new Date().toISOString();
      const body = { ...req.body, updatedAt: now };
      delete body.id;
      delete body.tenantId;

      jsonFields.forEach((field) => {
        if (body[field] && typeof body[field] === 'object') {
          body[field] = JSON.stringify(body[field]);
        }
      });

      const setClauses = Object.keys(body).map((col) => `${col} = ?`).join(', ');
      const values = [...Object.values(body), req.params.id, req.tenantId];

      db.prepare(`UPDATE ${tableName} SET ${setClauses} WHERE id = ? AND tenantId = ?`).run(...values);
      res.json({ success: true, updated: req.params.id });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE
  app.delete(`/api/${resourceName}/:id`, authMiddleware, (req, res) => {
    try {
      db.prepare(`DELETE FROM ${tableName} WHERE id = ? AND tenantId = ?`).run(req.params.id, req.tenantId);
      res.json({ success: true, deleted: req.params.id });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
}

// Register CRUD for all SaaS business resources
registerResourceEndpoints('clients', 'clients', ['documents', 'serviceIds']);
registerResourceEndpoints('leads', 'leads', ['serviceIds']);
registerResourceEndpoints('interactions', 'interactions');
registerResourceEndpoints('projects', 'projects', ['serviceIds']);
registerResourceEndpoints('tasks', 'tasks');
registerResourceEndpoints('payments', 'payments');
registerResourceEndpoints('expenses', 'expenses');
registerResourceEndpoints('invoices', 'invoices', ['items']);

// ----------------- EMAIL DISPATCHER PROXY (BREVO / SMTP) -----------------
app.post('/api/send-email', authMiddleware, async (req, res) => {
  try {
    const { toEmail, toName, subject, htmlContent } = req.body;
    const apiKey = process.env.BREVO_API_KEY || req.headers['x-brevo-key'];
    const senderName = process.env.SENDER_NAME || 'Jugarr Agency';
    const senderEmail = process.env.SENDER_EMAIL || 'warshasingh21@gmail.com';

    if (!apiKey) {
      return res.status(400).json({ error: 'Brevo API key is not configured' });
    }

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
        to: [{ email: toEmail, name: toName || toEmail }],
        subject,
        htmlContent,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    return res.json({ success: true, ...data });
  } catch (err) {
    console.error('Server email send error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 SaaS Node.js Server is running on http://localhost:${PORT}`);
});
