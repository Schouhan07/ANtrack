const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true },
    name: { type: String, default: '', trim: true },
    role: {
      type: String,
      enum: ['user', 'super_admin'],
      default: 'user',
    },
    /** Tenant slugs this user may access (ignored when role is super_admin). */
    tenantIds: { type: [String], default: [] },
    active: { type: Boolean, default: true },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
