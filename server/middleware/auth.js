const jwt = require('jsonwebtoken');

function authDisabled() {
  return process.env.AUTH_DISABLED === 'true' || process.env.AUTH_DISABLED === '1';
}

/**
 * Sets req.user. When AUTH_DISABLED=true, acts as super_admin (local dev).
 */
function authenticate(req, res, next) {
  if (authDisabled()) {
    req.user = {
      sub: 'dev',
      email: 'dev@local',
      role: 'super_admin',
      tenantIds: [],
    };
    return next();
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return res.status(500).json({ error: 'Server misconfiguration: JWT_SECRET not set' });
  }

  const h = req.headers.authorization;
  if (!h || !h.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const payload = jwt.verify(h.slice(7), secret);
    req.user = {
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
      tenantIds: Array.isArray(payload.tenantIds) ? payload.tenantIds : [],
    };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireSuperAdmin(req, res, next) {
  if (req.user?.role !== 'super_admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

module.exports = { authenticate, requireSuperAdmin, authDisabled };
