const User = require('../models/User');
const { isValidObjectId } = require('../utils/mongoId');

/**
 * Super admins can optionally "view as" a normal user by sending X-As-User-Id.
 * Non-admins are forbidden from sending this header.
 */
async function resolveActingUser(req, res, next) {
  const raw = req.headers['x-as-user-id'];
  const asUserId = typeof raw === 'string' ? raw.trim() : '';
  if (!asUserId) return next();

  if (req.user?.role !== 'super_admin') {
    return res.status(403).json({ error: 'X-As-User-Id is allowed only for super admins' });
  }
  if (!isValidObjectId(asUserId)) {
    return res.status(400).json({ error: 'Invalid X-As-User-Id' });
  }

  try {
    const target = await User.findById(asUserId)
      .select('_id email name role tenantIds active')
      .lean();
    if (!target) return res.status(404).json({ error: 'Requested user not found' });
    if (target.role === 'super_admin') {
      return res.status(400).json({ error: 'Cannot view as another super admin' });
    }
    if (!target.active) {
      return res.status(400).json({ error: 'Cannot view as an inactive user' });
    }

    req.actingUser = {
      id: String(target._id),
      email: target.email,
      name: target.name,
      tenantIds: Array.isArray(target.tenantIds) ? target.tenantIds : [],
    };
    next();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { resolveActingUser };
