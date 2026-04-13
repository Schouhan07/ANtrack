const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../models/User');
const AccessApplication = require('../models/AccessApplication');
const { isValidTenantId, listTenants, getTenantLabel } = require('../config/tenants');
const { notifyAdminNewAccessRequest } = require('../services/notifyAdmin');
const { isValidObjectId } = require('../utils/mongoId');

const MIN_PASSWORD = 8;

exports.submitAccessRequest = async (req, res) => {
  try {
    const email = String(req.body.email || '').toLowerCase().trim();
    const password = String(req.body.password || '');
    const name = String(req.body.name || '').trim();
    const tenantIds = Array.isArray(req.body.tenantIds) ? req.body.tenantIds : [];

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    if (password.length < MIN_PASSWORD) {
      return res.status(400).json({ error: `Password must be at least ${MIN_PASSWORD} characters` });
    }

    const cleanedTenants = [...new Set(tenantIds.map((t) => String(t).trim()).filter(Boolean))];
    if (cleanedTenants.length === 0) {
      return res.status(400).json({ error: 'Select at least one country / region' });
    }
    for (const t of cleanedTenants) {
      if (!isValidTenantId(t)) {
        return res.status(400).json({ error: `Invalid region: ${t}` });
      }
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email already exists. Sign in instead.' });
    }

    let doc = await AccessApplication.findOne({ email });
    if (doc) {
      if (doc.status === 'pending') {
        return res.status(409).json({
          error: 'You already have a pending request. Wait for admin approval or contact support.',
        });
      }
      if (doc.status === 'approved') {
        return res.status(409).json({ error: 'This email was already approved. Use Sign in.' });
      }
      doc.passwordHash = await bcrypt.hash(password, 10);
      doc.name = name;
      doc.tenantIds = cleanedTenants;
      doc.status = 'pending';
      doc.adminNote = '';
      doc.reviewedAt = null;
      doc.reviewedBy = null;
      await doc.save();
      notifyAdminNewAccessRequest({
        type: 'access_request_resubmit',
        email: doc.email,
        name: doc.name,
        tenantIds: doc.tenantIds,
        applicationId: doc._id.toString(),
      });
      return res.status(201).json({
        message: 'Request submitted again. An administrator will review it.',
        id: doc._id,
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    doc = await AccessApplication.create({
      email,
      passwordHash,
      name,
      tenantIds: cleanedTenants,
      status: 'pending',
    });
    notifyAdminNewAccessRequest({
      type: 'access_request',
      email,
      name,
      tenantIds: cleanedTenants,
      applicationId: doc._id.toString(),
    });
    res.status(201).json({
      message: 'Request submitted. You will be able to sign in after an administrator approves it.',
      id: doc._id,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'This email is already registered or pending.' });
    }
    res.status(500).json({ error: err.message });
  }
};

exports.listApplications = async (req, res) => {
  try {
    const status = req.query.status;
    const filter = {};
    if (status === 'pending' || status === 'approved' || status === 'rejected') {
      filter.status = status;
    }
    const rows = await AccessApplication.find(filter).sort({ createdAt: -1 }).lean();
    const tenants = listTenants();
    res.json({
      applications: rows.map((a) => ({
        id: a._id,
        email: a.email,
        name: a.name,
        tenantIds: a.tenantIds,
        tenantLabels: (a.tenantIds || []).map((id) => ({ id, label: getTenantLabel(id) })),
        status: a.status,
        adminNote: a.adminNote,
        reviewedAt: a.reviewedAt,
        createdAt: a.createdAt,
      })),
      tenants,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.approveApplication = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid id' });
    }
    const appDoc = await AccessApplication.findById(req.params.id);
    if (!appDoc) return res.status(404).json({ error: 'Request not found' });
    if (appDoc.status !== 'pending') {
      return res.status(400).json({ error: 'This request is not pending' });
    }

    const taken = await User.findOne({ email: appDoc.email });
    if (taken) {
      return res.status(409).json({ error: 'A user with this email already exists' });
    }

    await User.create({
      email: appDoc.email,
      passwordHash: appDoc.passwordHash,
      name: appDoc.name || '',
      role: 'user',
      tenantIds: appDoc.tenantIds,
      active: true,
    });

    appDoc.status = 'approved';
    appDoc.reviewedAt = new Date();
    appDoc.reviewedBy = isValidObjectId(req.user.sub)
      ? new mongoose.Types.ObjectId(req.user.sub)
      : null;
    appDoc.adminNote = '';
    await appDoc.save();

    res.json({ message: 'Approved — user can sign in', email: appDoc.email });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.rejectApplication = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid id' });
    }
    const adminNote = String(req.body.adminNote || req.body.reason || '').trim();
    const appDoc = await AccessApplication.findById(req.params.id);
    if (!appDoc) return res.status(404).json({ error: 'Request not found' });
    if (appDoc.status !== 'pending') {
      return res.status(400).json({ error: 'This request is not pending' });
    }

    appDoc.status = 'rejected';
    appDoc.reviewedAt = new Date();
    appDoc.reviewedBy = isValidObjectId(req.user.sub)
      ? new mongoose.Types.ObjectId(req.user.sub)
      : null;
    appDoc.adminNote = adminNote;
    await appDoc.save();

    res.json({ message: 'Request rejected', email: appDoc.email });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
