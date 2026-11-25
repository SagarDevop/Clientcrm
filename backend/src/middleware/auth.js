import jwt from 'jsonwebtoken';
import { config, connectMongo } from '../config/db.js';
import { DEFAULT_PERMISSIONS } from '../constants/roles.js';

export async function authenticate(req, res, next) {
  try {
    let token = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({ error: 'Authentication required. No token provided.' });
    }

    const decoded = jwt.verify(token, config.jwtSecret);
    const { db } = await connectMongo();
    const user = await db.collection('users').findOne({ id: decoded.userId });

    if (!user || user.status === 'inactive') {
      return res.status(401).json({ error: 'User account not found or deactivated.' });
    }

    req.user = {
      id: user.id,
      tenantId: user.tenantId || 'org_default',
      name: user.name,
      email: user.email,
      role: user.role || 'founder',
      customRoleId: user.customRoleId,
      userPermissions: user.permissions || {},
    };

    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session token.' });
  }
}

export function authorize(resource, action) {
  return async (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    // Founder always has full bypass authority
    if (req.user.role === 'founder' || req.user.role === 'owner') {
      return next();
    }

    // Check user-level permission override first
    if (req.user.userPermissions?.[resource]?.includes(action)) {
      return next();
    }

    // Check role-based default permissions
    const rolePermissions = DEFAULT_PERMISSIONS[req.user.role];
    if (rolePermissions?.[resource]?.includes(action)) {
      return next();
    }

    // Check custom role if applicable
    if (req.user.customRoleId) {
      const { db } = await connectMongo();
      const customRole = await db.collection('roles').findOne({ id: req.user.customRoleId });
      if (customRole?.permissions?.[resource]?.includes(action)) {
        return next();
      }
    }

    return res.status(403).json({
      error: `Access denied. Insufficient permissions for action: '${action}' on '${resource}'.`,
    });
  };
}
