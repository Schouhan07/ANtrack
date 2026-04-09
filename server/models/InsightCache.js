const mongoose = require('mongoose');

/**
 * Last successful AI insights payload for fallback when Gemini fails.
 */
const insightCacheSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: 'default' },
    contextHash: { type: String, default: '' },
    insights: { type: [mongoose.Schema.Types.Mixed], default: [] },
    model: { type: String, default: '' },
    generatedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('InsightCache', insightCacheSchema);
