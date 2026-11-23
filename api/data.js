import { connectToDatabase } from './_db.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'bizcrm-saas-jwt-secret-key-super-secure';

function verifyToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { tenantId: 'org_default', role: 'owner' };
  }
  try {
    const token = authHeader.split(' ')[1];
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return { tenantId: 'org_default', role: 'owner' };
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { db } = await connectToDatabase();
    const user = verifyToken(req);
    const tenantId = user.tenantId || 'org_default';

    // Parse resource & id from query or URL
    // e.g. /api/data?resource=clients&id=123
    const resource = req.query.resource;
    const id = req.query.id;

    if (!resource) {
      return res.status(400).json({ error: 'Missing resource parameter' });
    }

    const collection = db.collection(resource);

    // GET
    if (req.method === 'GET') {
      if (id) {
        const item = await collection.findOne({ id, tenantId });
        if (!item) return res.status(404).json({ error: 'Not found' });
        return res.json(item);
      }
      const items = await collection.find({ tenantId }).sort({ createdAt: -1 }).toArray();
      return res.json(items);
    }

    // POST
    if (req.method === 'POST') {
      const now = new Date().toISOString();
      const itemId = req.body.id || `${resource.slice(0, 3)}_${Math.random().toString(36).substring(2, 10)}`;
      const item = {
        ...req.body,
        id: itemId,
        tenantId,
        createdAt: req.body.createdAt || now,
        updatedAt: now,
      };
      await collection.updateOne({ id: itemId, tenantId }, { $set: item }, { upsert: true });
      return res.status(201).json({ success: true, item });
    }

    // PUT
    if (req.method === 'PUT') {
      if (!id) return res.status(400).json({ error: 'Missing item id' });
      const now = new Date().toISOString();
      const updates = { ...req.body, updatedAt: now };
      delete updates._id;
      delete updates.id;
      delete updates.tenantId;

      await collection.updateOne({ id, tenantId }, { $set: updates });
      return res.json({ success: true, updated: id });
    }

    // DELETE
    if (req.method === 'DELETE') {
      if (!id) return res.status(400).json({ error: 'Missing item id' });
      await collection.deleteOne({ id, tenantId });
      return res.json({ success: true, deleted: id });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Data API error:', err);
    return res.status(500).json({ error: err.message });
  }
}
