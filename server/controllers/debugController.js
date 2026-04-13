const Video = require('../models/Video');
const {
  extractTikTokCreator,
  extractInstagramCreator,
  extractVideoId,
} = require('../services/apifyService');

/**
 * GET /api — list of all HTTP routes (for Postman / frontend dev).
 * In production, hidden unless EXPOSE_API_CATALOG=true (reduces attack surface mapping).
 */
exports.getApiCatalog = (req, res) => {
  if (process.env.NODE_ENV === 'production' && process.env.EXPOSE_API_CATALOG !== 'true') {
    return res.status(404).json({ error: 'Not found' });
  }
  res.json({
    name: 'Influencer Tracker API',
    docs: 'GET /api — this list. GET /api/debug/creators — DB creator field status.',
    endpoints: [
      { group: 'Core' },
      { method: 'GET', path: '/api', description: 'API catalog (this list); hidden in production unless EXPOSE_API_CATALOG=true' },
      { method: 'GET', path: '/api/health', description: 'Health check (503 if DB disconnected)' },
      { method: 'GET', path: '/api/tenants', description: 'Tenant registry (public)' },
      { method: 'POST', path: '/api/access-requests', description: 'Submit access request (public)' },

      { group: 'Auth' },
      { method: 'POST', path: '/api/auth/login', body: '{ email, password }', description: 'JWT' },
      { method: 'GET', path: '/api/auth/me', description: 'Current user (Bearer)' },

      { group: 'Videos' },
      { method: 'GET', path: '/api/videos', query: 'campaign, platform, status', description: 'List tracked videos' },
      { method: 'POST', path: '/api/videos', body: '{ url, creator?, campaign?, offerCode?, sales?, platform?, initiatedBy? }', description: 'Add one video' },
      { method: 'POST', path: '/api/videos/bulk', body: '{ urls: [{ url, creator?, offerCode?, sales?, ... }], initiatedBy? }', description: 'Bulk add URLs' },
      { method: 'DELETE', path: '/api/videos/:id', description: 'Remove video' },
      { method: 'PATCH', path: '/api/videos/:id/status', body: '{ status }', description: 'active | paused' },
      { method: 'PATCH', path: '/api/videos/:id', body: '{ creator?, campaign?, offerCode?, sales?, initiatedBy? }', description: 'Partial update (offer/sales for Influencer tab)' },

      { group: 'Metrics' },
      { method: 'GET', path: '/api/metrics', query: 'videoId, days', description: 'Metric history' },
      { method: 'GET', path: '/api/metrics/latest', description: 'Latest metric per video + deltas' },
      { method: 'GET', path: '/api/metrics/campaign-overview', description: 'Dashboard KPIs' },
      { method: 'GET', path: '/api/metrics/platform-analytics', description: 'Instagram vs TikTok rollup' },
      { method: 'GET', path: '/api/metrics/weekly-trend', query: 'weeks', description: 'Weekly views + engagement' },
      { method: 'GET', path: '/api/metrics/daily-views', query: 'days', description: 'Daily aggregates' },
      { method: 'GET', path: '/api/metrics/daily-breakdown', query: 'days', description: 'Daily breakdown for charts' },
      { method: 'GET', path: '/api/metrics/portfolio-run-comparison', description: 'Latest vs previous scrape portfolio totals (active videos, 2+ scrapes)' },
      { method: 'GET', path: '/api/metrics/top-creators', description: 'Top creators by views' },
      { method: 'GET', path: '/api/metrics/influencers', description: 'Influencer insights table' },
      { method: 'POST', path: '/api/metrics/scrape-now', description: 'Run Apify scrape (same as Scrape Now button)' },

      { group: 'AI' },
      {
        method: 'GET',
        path: '/api/insights',
        description: 'Gemini AI insights from portfolio snapshot (requires GEMINI_API_KEY)',
      },

      { group: 'Upload' },
      { method: 'POST', path: '/api/upload/excel', body: 'multipart file', description: 'Import .xlsx' },

      { group: 'Creator offers' },
      { method: 'GET', path: '/api/creator-offers/creators', description: 'Distinct creator names for mapping UI' },
      { method: 'GET', path: '/api/creator-offers', description: 'List offer↔creator mappings' },
      { method: 'POST', path: '/api/creator-offers', body: '{ creatorName, offerCode, sales? }', description: 'Add (offer code unique)' },
      { method: 'PATCH', path: '/api/creator-offers/:id', description: 'Update mapping' },
      { method: 'DELETE', path: '/api/creator-offers/:id', description: 'Delete mapping' },

      { group: 'Campaigns' },
      { method: 'GET', path: '/api/campaigns', description: 'List campaigns' },
      { method: 'GET', path: '/api/campaigns/summary', description: 'Campaign summary' },
      { method: 'GET', path: '/api/campaigns/influencers', description: 'Influencer names' },
      { method: 'POST', path: '/api/campaigns', description: 'Create campaign' },
      { method: 'PUT', path: '/api/campaigns/:id', description: 'Update campaign' },
      { method: 'DELETE', path: '/api/campaigns/:id', description: 'Delete campaign' },

      { group: 'Admin (super_admin)' },
      { method: 'GET', path: '/api/admin/applications', description: 'List access applications' },
      { method: 'PATCH', path: '/api/admin/applications/:id/approve', description: 'Approve request → creates user' },
      { method: 'PATCH', path: '/api/admin/applications/:id/reject', body: '{ adminNote? }', description: 'Reject request' },
      { method: 'GET', path: '/api/admin/users', description: 'List users' },
      { method: 'POST', path: '/api/admin/users', description: 'Create tenant user' },
      { method: 'PATCH', path: '/api/admin/users/:id', description: 'Update user' },

      { group: 'Debug' },
      { method: 'GET', path: '/api/debug/creators', description: 'Videos + whether creator is set (DB check)' },
      {
        method: 'POST',
        path: '/api/debug/preview-creator',
        body: '{ platform: "tiktok"|"instagram", raw: { ...Apify item } }',
        description: 'Test creator extraction without scraping',
      },
    ],
  });
};

/**
 * GET /api/debug/creators — see which videos have creator saved.
 */
exports.getCreatorStatus = async (req, res) => {
  try {
    const videos = await Video.find({})
      .select('url creator platform status campaign initiatedBy addedDate')
      .sort({ addedDate: -1 })
      .lean();

    const withCreator = videos.filter((v) => v.creator && String(v.creator).trim()).length;

    const rows = videos.map((v) => ({
      _id: v._id,
      url: v.url,
      shortCodeOrId: extractVideoId(v.url),
      creator: v.creator || null,
      hasCreator: !!(v.creator && String(v.creator).trim()),
      platform: v.platform,
      status: v.status,
      campaign: v.campaign || '',
      initiatedBy: v.initiatedBy,
    }));

    res.json({
      total: videos.length,
      withCreatorCount: withCreator,
      missingCreatorCount: videos.length - withCreator,
      hint:
        'After scrape, creator is filled from Apify: Instagram root ownerUsername on the post row (not latestComments[].ownerUsername — that is the commenter). TikTok: authorMeta.name or authorMeta.uniqueId. Run POST /api/metrics/scrape-now or use Dashboard.',
      videos: rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * POST /api/debug/preview-creator — pass one raw Apify dataset item; see extracted creator string.
 */
exports.previewCreator = (req, res) => {
  try {
    const { platform, raw } = req.body || {};
    if (!raw || typeof raw !== 'object') {
      return res.status(400).json({ error: 'Body must include raw: { ... } (one Apify item)' });
    }
    if (platform !== 'tiktok' && platform !== 'instagram') {
      return res.status(400).json({ error: 'platform must be "tiktok" or "instagram"' });
    }

    const creator =
      platform === 'tiktok' ? extractTikTokCreator(raw) : extractInstagramCreator(raw);

    res.json({
      platform,
      creator: creator || null,
      extractedLength: creator ? creator.length : 0,
      note: creator
        ? 'This string is what would be saved on Video.creator after a matching scrape row.'
        : 'Empty — check ownerUsername (IG) or authorMeta.name (TT) on this object.',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
