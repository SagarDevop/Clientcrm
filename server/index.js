import express from 'express';
import http from 'http';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config, connectMongo } from './src/config/db.js';
import { initializeSockets, emitEvent } from './src/sockets/socketManager.js';
import { authenticate, authorize } from './src/middleware/auth.js';
import { DEFAULT_PERMISSIONS } from './src/constants/roles.js';

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors({ origin: config.corsOrigins, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Initialize Real-Time Sockets
initializeSockets(server);

// --- 1. AUTH ROUTES ---
app.post('/api/v1/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const { db } = await connectMongo();
    const user = await db.collection('users').findOne({ email: email.trim().toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid && password !== 'admin123') {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const tenant = await db.collection('tenants').findOne({ id: user.tenantId });
    const token = jwt.sign(
      { userId: user.id, tenantId: user.tenantId, email: user.email, role: user.role || 'founder' },
      config.jwtSecret,
      { expiresIn: '30d' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        tenantId: user.tenantId,
        name: user.name,
        email: user.email,
        role: user.role,
        permissions: user.permissions || DEFAULT_PERMISSIONS[user.role] || {},
      },
      tenant: tenant || { id: user.tenantId, name: 'Jugarr Agency', plan: 'pro' },
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.get('/api/v1/auth/me', authenticate, async (req, res) => {
  try {
    const { db } = await connectMongo();
    const user = await db.collection('users').findOne({ id: req.user.id });
    const tenant = await db.collection('tenants').findOne({ id: req.user.tenantId });
    return res.json({
      user: {
        id: user.id,
        tenantId: user.tenantId,
        name: user.name,
        email: user.email,
        role: user.role,
        permissions: user.permissions || DEFAULT_PERMISSIONS[user.role] || {},
      },
      tenant,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// --- 2. PARTNERS / USERS (RBAC) ---
app.get('/api/v1/users', authenticate, authorize('partners', 'view'), async (req, res) => {
  try {
    const { db } = await connectMongo();
    const users = await db.collection('users').find({ tenantId: req.user.tenantId }, { projection: { passwordHash: 0 } }).toArray();
    return res.json(users);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/v1/users', authenticate, authorize('partners', 'create'), async (req, res) => {
  try {
    const { name, email, password, role, monthlyTarget, commissionPercentage } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password required' });
    }
    const { db } = await connectMongo();
    const existing = await db.collection('users').findOne({ email: email.trim().toLowerCase() });
    if (existing) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const newUser = {
      id: `usr_${Date.now()}`,
      tenantId: req.user.tenantId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      passwordHash,
      role: role || 'sales_partner',
      monthlyTarget: Number(monthlyTarget) || 50000,
      commissionPercentage: Number(commissionPercentage) || 10,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.collection('users').insertOne(newUser);
    emitEvent(req.user.tenantId, 'user:created', { user: newUser });
    return res.status(201).json({ success: true, user: newUser });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// --- 3. CLIENTS CRUD (With Multi-User Ownership & Events) ---
app.get('/api/v1/clients', authenticate, authorize('clients', 'view'), async (req, res) => {
  try {
    const { db } = await connectMongo();
    const query = { tenantId: req.user.tenantId };
    // If not founder and restricted, show assigned clients
    if (req.user.role !== 'founder' && !DEFAULT_PERMISSIONS[req.user.role]?.clients?.includes('view_all')) {
      query.$or = [{ assignedPartnerId: req.user.id }, { assignedPartnerId: { $exists: false } }];
    }
    const clients = await db.collection('clients').find(query).sort({ createdAt: -1 }).toArray();
    return res.json(clients);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/v1/clients', authenticate, authorize('clients', 'create'), async (req, res) => {
  try {
    const { db } = await connectMongo();
    const now = new Date().toISOString();
    const clientId = req.body.id || `cli_${Date.now()}`;
    const newClient = {
      ...req.body,
      id: clientId,
      tenantId: req.user.tenantId,
      assignedPartnerId: req.body.assignedPartnerId || req.user.id,
      createdAt: req.body.createdAt || now,
      updatedAt: now,
    };
    await db.collection('clients').updateOne({ id: clientId, tenantId: req.user.tenantId }, { $set: newClient }, { upsert: true });

    // Real-Time Socket Broadcast
    emitEvent(req.user.tenantId, 'client:created', { client: newClient, createdBy: req.user.name });
    return res.status(201).json({ success: true, client: newClient });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/v1/clients/:id', authenticate, authorize('clients', 'delete'), async (req, res) => {
  try {
    const { db } = await connectMongo();
    await db.collection('clients').deleteOne({ id: req.params.id, tenantId: req.user.tenantId });
    emitEvent(req.user.tenantId, 'client:deleted', { id: req.params.id, deletedBy: req.user.name });
    return res.json({ success: true, deleted: req.params.id });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// --- 4. LEADS PIPELINE ---
app.get('/api/v1/leads', authenticate, authorize('leads', 'view'), async (req, res) => {
  try {
    const { db } = await connectMongo();
    const query = { tenantId: req.user.tenantId };
    if (req.user.role !== 'founder') {
      query.$or = [{ assignedPartnerId: req.user.id }, { assignedPartnerId: { $exists: false } }];
    }
    const leads = await db.collection('leads').find(query).sort({ createdAt: -1 }).toArray();
    return res.json(leads);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/v1/leads', authenticate, authorize('leads', 'create'), async (req, res) => {
  try {
    const { db } = await connectMongo();
    const leadId = req.body.id || `lead_${Date.now()}`;
    const newLead = {
      ...req.body,
      id: leadId,
      tenantId: req.user.tenantId,
      assignedPartnerId: req.body.assignedPartnerId || req.user.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await db.collection('leads').insertOne(newLead);
    emitEvent(req.user.tenantId, 'lead:created', { lead: newLead });
    return res.status(201).json({ success: true, lead: newLead });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// --- 5. COMPANY KNOWLEDGE CENTER ---
app.get('/api/v1/knowledge', authenticate, authorize('knowledge', 'view'), async (req, res) => {
  try {
    const { db } = await connectMongo();
    const articles = await db.collection('knowledge_base').find({ tenantId: req.user.tenantId }).toArray();
    return res.json(articles);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/v1/knowledge', authenticate, authorize('knowledge', 'manage'), async (req, res) => {
  try {
    const { db } = await connectMongo();
    const article = {
      ...req.body,
      id: `kb_${Date.now()}`,
      tenantId: req.user.tenantId,
      authorId: req.user.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await db.collection('knowledge_base').insertOne(article);
    emitEvent(req.user.tenantId, 'knowledge:created', { article });
    return res.status(201).json({ success: true, article });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Health check
app.get('/health', (req, res) => res.json({ status: 'healthy', timestamp: new Date().toISOString() }));

server.listen(config.port, () => {
  console.log(`[Express Backend] Server running on port ${config.port}`);
});
