const Video = require('../models/Video');
const VideoMetric = require('../models/VideoMetric');
const Campaign = require('../models/Campaign');
const CreatorOfferMapping = require('../models/CreatorOfferMapping');
const InsightCache = require('../models/InsightCache');

/**
 * One-time style migrations: legacy docs + indexes for tenant isolation.
 */
async function runTenantMigrations() {
  const def = process.env.DEFAULT_TENANT_ID || 'default';

  try {
    await Video.collection.dropIndex('url_1');
  } catch (_) {
    /* index may not exist */
  }

  await Video.updateMany({ tenantId: { $exists: false } }, { $set: { tenantId: def } });
  try {
    await Video.collection.createIndex({ tenantId: 1, url: 1 }, { unique: true });
  } catch (e) {
    console.warn('[migrate] videos compound index:', e.message);
  }

  await VideoMetric.updateMany({ tenantId: { $exists: false } }, { $set: { tenantId: def } });
  try {
    await VideoMetric.collection.createIndex({ tenantId: 1 });
  } catch (_) {}

  await Campaign.updateMany({ tenantId: { $exists: false } }, { $set: { tenantId: def } });
  try {
    await Campaign.collection.dropIndex('country_1_lob_1_dateLive_-1');
  } catch (_) {}
  try {
    await Campaign.collection.createIndex({ tenantId: 1, country: 1, lob: 1, dateLive: -1 });
  } catch (e) {
    console.warn('[migrate] campaigns index:', e.message);
  }

  await CreatorOfferMapping.updateMany({ tenantId: { $exists: false } }, { $set: { tenantId: def } });
  try {
    await CreatorOfferMapping.collection.dropIndex('offerCode_1');
  } catch (_) {}
  try {
    await CreatorOfferMapping.collection.createIndex({ tenantId: 1, offerCode: 1 }, { unique: true });
  } catch (e) {
    console.warn('[migrate] creator offers compound index:', e.message);
  }

  await InsightCache.updateMany({ key: 'default' }, { $set: { key: def } });
}

module.exports = { runTenantMigrations };
