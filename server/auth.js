import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'bizcrm-saas-jwt-secret-key-super-secure';

export function generateToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      tenantId: user.tenantId,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

export function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    req.tenantId = decoded.tenantId;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized: Token has expired or is invalid' });
  }
}
