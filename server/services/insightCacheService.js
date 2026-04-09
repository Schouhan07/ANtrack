const crypto = require('crypto');
const InsightCache = require('../models/InsightCache');

const CACHE_KEY = 'default';

function hashContext(context) {
  return crypto.createHash('sha256').update(JSON.stringify(context)).digest('hex');
}

async function loadCached() {
  const doc = await InsightCache.findOne({ key: CACHE_KEY }).lean();
  if (!doc || !Array.isArray(doc.insights) || doc.insights.length === 0) return null;
  return doc;
}

/**
 * @param {{ insights: unknown[], model: string, contextHash: string, generatedAt: Date }} payload
 */
async function saveCached(payload) {
  const { insights, model, contextHash, generatedAt } = payload;
  await InsightCache.findOneAndUpdate(
    { key: CACHE_KEY },
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
  CACHE_KEY,
  hashContext,
  loadCached,
  saveCached,
};
