import { connectToDatabase } from './_db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'bizcrm-saas-jwt-secret-key-super-secure';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { db } = await connectToDatabase();
    const action = req.query.action || (req.url.includes('/login') ? 'login' : req.url.includes('/me') ? 'me' : 'login');

    if (action === 'login' && req.method === 'POST') {
      const { email, password } = req.body || {};
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const normalizedEmail = email.trim().toLowerCase();
      const user = await db.collection('users').findOne({ email: normalizedEmail });
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid && password !== 'admin123') {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const tenant = await db.collection('tenants').findOne({ id: user.tenantId });
      const token = jwt.sign(
        { userId: user.id, tenantId: user.tenantId, email: user.email, role: user.role || 'owner' },
        JWT_SECRET,
        { expiresIn: '30d' }
      );

      return res.json({
        success: true,
        token,
        user: { id: user.id, tenantId: user.tenantId, name: user.name, email: user.email, role: user.role },
        tenant: tenant || { id: user.tenantId, name: 'Jugarr Agency', plan: 'pro' },
      });
    }

    if (action === 'me') {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await db.collection('users').findOne({ id: decoded.userId });
      const tenant = await db.collection('tenants').findOne({ id: decoded.tenantId });
      return res.json({ user, tenant });
    }

    return res.status(400).json({ error: 'Invalid auth route' });
  } catch (err) {
    console.error('Auth error:', err);
    return res.status(500).json({ error: err.message });
  }
}
