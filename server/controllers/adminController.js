const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { isValidTenantId, listTenants, getTenantLabel } = require('../config/tenants');
const { isValidObjectId } = require('../utils/mongoId');

const MIN_PASSWORD = 8;

exports.listUsers = async (_req, res) => {
  try {
    const users = await User.find({})
      .select('-passwordHash')
      .sort({ email: 1 })
      .lean();
    const tenants = listTenants();
    const rows = users.map((u) => ({
      id: u._id,
      email: u.email,
      name: u.name,
      role: u.role,
      tenantIds: u.tenantIds || [],
      tenantLabels: (u.tenantIds || []).map((id) => ({ id, label: getTenantLabel(id) })),
      active: u.active,
      lastLoginAt: u.lastLoginAt,
      createdAt: u.createdAt,
    }));
    res.json({ users: rows, tenants });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createUser = async (req, res) => {
  try {
    const email = String(req.body.email || '').toLowerCase().trim();
    const password = String(req.body.password || '');
    const name = String(req.body.name || '').trim();
    const tenantIds = Array.isArray(req.body.tenantIds) ? req.body.tenantIds : [];

    if (req.body.role === 'super_admin') {
      return res.status(403).json({
        error:
          'Super admins are not created here. Use npm run seed:admin (or database) for the primary admin account.',
      });
    }

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password required' });
    }
    if (password.length < MIN_PASSWORD) {
      return res.status(400).json({ error: `Password must be at least ${MIN_PASSWORD} characters` });
    }
    const cleaned = [...new Set(tenantIds.map((t) => String(t).trim()).filter(Boolean))];
    for (const t of cleaned) {
      if (!isValidTenantId(t)) {
        return res.status(400).json({ error: `Invalid tenant: ${t}` });
      }
    }
    if (cleaned.length === 0) {
      return res.status(400).json({ error: 'At least one tenant is required' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const doc = await User.create({
      email,
      passwordHash,
      name,
      role: 'user',
      tenantIds: cleaned,
      active: true,
    });
    res.status(201).json({
      id: doc._id,
      email: doc.email,
      name: doc.name,
      role: doc.role,
      tenantIds: doc.tenantIds,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    res.status(500).json({ error: err.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid id' });
    }
    const patch = {};
    if (req.body.name !== undefined) patch.name = String(req.body.name).trim();
    if (req.body.active !== undefined) patch.active = Boolean(req.body.active);
    if (req.body.password !== undefined && String(req.body.password).length > 0) {
      const pw = String(req.body.password);
      if (pw.length < MIN_PASSWORD) {
        return res.status(400).json({ error: `Password must be at least ${MIN_PASSWORD} characters` });
      }
      patch.passwordHash = await bcrypt.hash(pw, 10);
    }
    if (req.body.role !== undefined) {
      if (req.body.role === 'super_admin') {
        return res.status(403).json({ error: 'Cannot assign super admin role via API.' });
      }
      patch.role = 'user';
    }
    if (req.body.tenantIds !== undefined) {
      const tenantIds = Array.isArray(req.body.tenantIds) ? req.body.tenantIds : [];
      const cleaned = [...new Set(tenantIds.map((t) => String(t).trim()).filter(Boolean))];
      for (const t of cleaned) {
        if (!isValidTenantId(t)) {
          return res.status(400).json({ error: `Invalid tenant: ${t}` });
        }
      }
      patch.tenantIds = cleaned;
    }

    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const nextRole = patch.role;
    if (nextRole === 'user' || (nextRole === undefined && req.body.tenantIds !== undefined)) {
      const user = await User.findById(req.params.id);
      if (!user) return res.status(404).json({ error: 'Not found' });
      const effectiveRole = patch.role ?? user.role;
      const effectiveTenants = patch.tenantIds ?? user.tenantIds;
      if (effectiveRole === 'user' && (!effectiveTenants || effectiveTenants.length === 0)) {
        return res.status(400).json({ error: 'user role requires at least one tenant' });
      }
    }

    const doc = await User.findByIdAndUpdate(req.params.id, patch, { new: true }).select(
      '-passwordHash'
    );
    if (!doc) return res.status(404).json({ error: 'Not found' });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
