const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AccessApplication = require('../models/AccessApplication');
const { listTenants } = require('../config/tenants');

function signUser(user) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET not configured');
  return jwt.sign(
    {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
      tenantIds: user.tenantIds || [],
    },
    secret,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

exports.login = async (req, res) => {
  try {
    const email = String(req.body.email || '').toLowerCase().trim();
    const password = String(req.body.password || '');
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password required' });
    }

    const user = await User.findOne({ email });
    if (user) {
      if (!user.active) {
        return res.status(401).json({ error: 'Account disabled' });
      }
      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
    } else {
      const pending = await AccessApplication.findOne({ email, status: 'pending' });
      if (pending) {
        const ok = await bcrypt.compare(password, pending.passwordHash);
        if (ok) {
          return res.status(403).json({
            code: 'PENDING_APPROVAL',
            error:
              'Your access request is still pending. You can sign in once an administrator approves it.',
          });
        }
      }
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    user.lastLoginAt = new Date();
    await user.save();

    const token = signUser(user);
    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantIds: user.tenantIds,
      },
      tenants: listTenants(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.me = async (req, res) => {
  try {
    const user = await User.findById(req.user.sub).select('-passwordHash').lean();
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantIds: user.tenantIds,
        active: user.active,
        lastLoginAt: user.lastLoginAt,
      },
      tenants: listTenants(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
