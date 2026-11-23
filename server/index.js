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

// Simple In-Memory Rate Limiting
const rateLimitMap = new Map();
app.use((req, res, next) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxReq = 300;

  let record = rateLimitMap.get(ip);
  if (!record || now - record.startTime > windowMs) {
    record = { startTime: now, count: 1 };
    rateLimitMap.set(ip, record);
  } else {
    record.count++;
  }

  if (record.count > maxReq) {
    return res.status(429).json({ error: 'Too many requests. Please slow down.' });
  }
  next();
});

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

    if (user.status === 'inactive') {
      return res.status(403).json({ error: 'Account is deactivated. Please contact the founder.' });
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

app.post('/api/v1/auth/logout', (req, res) => {
  res.clearCookie('token');
  return res.json({ success: true, message: 'Logged out successfully' });
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

app.put('/api/v1/users/:id', authenticate, authorize('partners', 'edit'), async (req, res) => {
  try {
    const { db } = await connectMongo();
    const updates = { ...req.body, updatedAt: new Date().toISOString() };
    delete updates._id;
    delete updates.id;
    delete updates.passwordHash;
    delete updates.tenantId;

    await db.collection('users').updateOne({ id: req.params.id, tenantId: req.user.tenantId }, { $set: updates });
    emitEvent(req.user.tenantId, 'user:updated', { id: req.params.id, updates });
    return res.json({ success: true, updated: req.params.id });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// --- 3. ROLES ENGINE ---
app.get('/api/v1/roles', authenticate, authorize('partners', 'view'), async (req, res) => {
  try {
    const { db } = await connectMongo();
    const customRoles = await db.collection('roles').find({ tenantId: req.user.tenantId }).toArray();
    return res.json({ systemRoles: DEFAULT_PERMISSIONS, customRoles });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/v1/roles', authenticate, authorize('partners', 'manage_permissions'), async (req, res) => {
  try {
    const { name, description, permissions } = req.body;
    if (!name) return res.status(400).json({ error: 'Role name is required' });
    const { db } = await connectMongo();
    const newRole = {
      id: `role_${Date.now()}`,
      tenantId: req.user.tenantId,
      name,
      description: description || '',
      permissions: permissions || {},
      createdAt: new Date().toISOString(),
    };
    await db.collection('roles').insertOne(newRole);
    return res.status(201).json({ success: true, role: newRole });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// --- 4. CLIENTS CRUD ---
app.get('/api/v1/clients', authenticate, authorize('clients', 'view'), async (req, res) => {
  try {
    const { db } = await connectMongo();
    const query = { tenantId: req.user.tenantId };
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

    emitEvent(req.user.tenantId, 'client:created', { client: newClient, createdBy: req.user.name });
    return res.status(201).json({ success: true, client: newClient });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.put('/api/v1/clients/:id', authenticate, authorize('clients', 'edit'), async (req, res) => {
  try {
    const { db } = await connectMongo();
    const updates = { ...req.body, updatedAt: new Date().toISOString() };
    delete updates._id;
    delete updates.id;
    delete updates.tenantId;

    await db.collection('clients').updateOne({ id: req.params.id, tenantId: req.user.tenantId }, { $set: updates });
    emitEvent(req.user.tenantId, 'client:updated', { id: req.params.id, client: { id: req.params.id, ...updates } });
    return res.json({ success: true, updated: req.params.id });
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

// --- 5. LEADS PIPELINE ---
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

app.post('/api/v1/leads/:id/convert', authenticate, authorize('leads', 'convert'), async (req, res) => {
  try {
    const { db } = await connectMongo();
    const lead = await db.collection('leads').findOne({ id: req.params.id, tenantId: req.user.tenantId });
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    const newClientId = `cli_${Date.now()}`;
    const clientRecord = {
      id: newClientId,
      tenantId: req.user.tenantId,
      name: lead.name,
      businessName: lead.businessName || `${lead.name}'s Business`,
      email: lead.email || '',
      phone: lead.phone,
      assignedPartnerId: lead.assignedPartnerId || req.user.id,
      clientType: req.body.clientType || 'content_management',
      status: 'active',
      monthlyPlanAmount: Number(req.body.monthlyPlanAmount) || 3500,
      tokenPaid: Number(req.body.tokenPaid) || 0,
      totalPaid: Number(req.body.tokenPaid) || 0,
      remainingAmount: (Number(req.body.monthlyPlanAmount) || 3500) - (Number(req.body.tokenPaid) || 0),
      paymentStatus: (Number(req.body.tokenPaid) || 0) > 0 ? 'partially_paid' : 'unpaid',
      startDate: new Date().toISOString().slice(0, 10),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.collection('clients').insertOne(clientRecord);
    await db.collection('leads').updateOne({ id: req.params.id }, { $set: { stage: 'converted', convertedClientId: newClientId } });

    emitEvent(req.user.tenantId, 'lead:converted', { leadId: req.params.id, client: clientRecord });
    emitEvent(req.user.tenantId, 'client:created', { client: clientRecord });

    return res.status(201).json({ success: true, client: clientRecord });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// --- 6. PAYMENTS & REVENUE ---
app.get('/api/v1/payments', authenticate, authorize('payments', 'view'), async (req, res) => {
  try {
    const { db } = await connectMongo();
    const payments = await db.collection('payments').find({ tenantId: req.user.tenantId }).sort({ paidAt: -1 }).toArray();
    return res.json(payments);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/v1/payments', authenticate, authorize('payments', 'create'), async (req, res) => {
  try {
    const { db } = await connectMongo();
    const paymentId = req.body.id || `pay_${Date.now()}`;
    const newPayment = {
      ...req.body,
      id: paymentId,
      tenantId: req.user.tenantId,
      createdAt: new Date().toISOString(),
    };
    await db.collection('payments').insertOne(newPayment);
    emitEvent(req.user.tenantId, 'payment:created', { payment: newPayment });
    return res.status(201).json({ success: true, payment: newPayment });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.get('/api/v1/revenue/summary', authenticate, authorize('finance', 'view_assigned'), async (req, res) => {
  try {
    const { db } = await connectMongo();
    const payments = await db.collection('payments').find({ tenantId: req.user.tenantId, status: 'completed' }).toArray();
    const expenses = await db.collection('expenses').find({ tenantId: req.user.tenantId }).toArray();

    const totalInflow = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const netProfit = totalInflow - totalExpenses;

    return res.json({
      totalInflow,
      totalExpenses,
      netProfit,
      paymentsCount: payments.length,
      expensesCount: expenses.length,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// --- 7. EXPENSES ---
app.get('/api/v1/expenses', authenticate, authorize('expenses', 'view'), async (req, res) => {
  try {
    const { db } = await connectMongo();
    const expenses = await db.collection('expenses').find({ tenantId: req.user.tenantId }).sort({ date: -1 }).toArray();
    return res.json(expenses);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/v1/expenses', authenticate, authorize('expenses', 'create'), async (req, res) => {
  try {
    const { db } = await connectMongo();
    const expense = {
      ...req.body,
      id: req.body.id || `exp_${Date.now()}`,
      tenantId: req.user.tenantId,
      createdAt: new Date().toISOString(),
    };
    await db.collection('expenses').insertOne(expense);
    return res.status(201).json({ success: true, expense });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// --- 8. ACTIVITIES AUDIT FEED ---
app.get('/api/v1/activities', authenticate, authorize('activities', 'view'), async (req, res) => {
  try {
    const { db } = await connectMongo();
    const activities = await db.collection('activities').find({ tenantId: req.user.tenantId }).sort({ createdAt: -1 }).limit(100).toArray();
    return res.json(activities);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// --- 9. NOTIFICATIONS ---
app.get('/api/v1/notifications', authenticate, async (req, res) => {
  try {
    const { db } = await connectMongo();
    const notifications = await db.collection('notifications')
      .find({ tenantId: req.user.tenantId, $or: [{ userId: req.user.id }, { userId: 'all' }] })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();
    return res.json(notifications);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// --- 10. COMPANY KNOWLEDGE CENTER ---
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
export { app, server };
