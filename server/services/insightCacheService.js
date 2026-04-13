const crypto = require('crypto');
const InsightCache = require('../models/InsightCache');

function hashContext(context) {
  return crypto.createHash('sha256').update(JSON.stringify(context)).digest('hex');
}

async function loadCached(tenantKey) {
  const key = tenantKey || 'default';
  const doc = await InsightCache.findOne({ key }).lean();
  if (!doc || !Array.isArray(doc.insights) || doc.insights.length === 0) return null;
  return doc;
}

/**
 * @param {{ insights: unknown[], model: string, contextHash: string, generatedAt: Date, tenantKey: string }} payload
 */
async function saveCached(payload) {
  const { insights, model, contextHash, generatedAt, tenantKey } = payload;
  const key = tenantKey || 'default';
  await InsightCache.findOneAndUpdate(
    { key },
    {
      $set: {
        insights,
        model: model || '',
        contextHash: contextHash || '',
        generatedAt: generatedAt || new Date(),
      },
    },
    { upsert: true, new: true }
  );
}

module.exports = {
  hashContext,
  loadCached,
  saveCached,
};
