/**
 * Create the first super_admin. Requires MONGODB_URI, JWT_SECRET, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../models/User');

async function main() {
  const uri = process.env.MONGODB_URI;
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!uri || !email || !password) {
    console.error('Set MONGODB_URI, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD in server/.env');
    process.exit(1);
  }
  if (!process.env.JWT_SECRET) {
    console.warn('Warning: JWT_SECRET not set (needed for login, not for this script)');
  }

  await mongoose.connect(uri);
  const existing = await User.findOne({ email: email.toLowerCase().trim() });
  if (existing) {
    console.log('User already exists:', email);
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await User.create({
    email: email.toLowerCase().trim(),
    passwordHash,
    name: 'Admin',
    role: 'super_admin',
    tenantIds: [],
    active: true,
  });
  console.log('Super admin created:', email);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
