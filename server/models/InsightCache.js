const mongoose = require('mongoose');

/**
 * Last successful AI insights payload for fallback when Gemini fails.
 */
const insightCacheSchema = new mongoose.Schema(
  {
    /** Tenant slug (matches Video.tenantId) */
    key: { type: String, required: true, unique: true },
    contextHash: { type: String, default: '' },
    insights: { type: [mongoose.Schema.Types.Mixed], default: [] },
    model: { type: String, default: '' },
    generatedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('InsightCache', insightCacheSchema);
