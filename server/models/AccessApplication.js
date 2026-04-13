const mongoose = require('mongoose');

/**
 * Self-service signup: one document per email; status moves pending → approved | rejected.
 * Approved users exist in User; this row stays for audit (status approved).
 */
const accessApplicationSchema = new mongoose.Schema(
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
    tenantIds: { type: [String], required: true, default: [] },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    adminNote: { type: String, default: '', trim: true },
    reviewedAt: { type: Date, default: null },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AccessApplication', accessApplicationSchema);
