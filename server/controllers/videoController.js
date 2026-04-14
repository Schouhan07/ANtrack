const Video = require('../models/Video');
const VideoMetric = require('../models/VideoMetric');
const { buildVideoCreatePayload } = require('../utils/videoPayload');
const { videoFilter } = require('../utils/tenantScope');
const { videoMatchFragmentForPlatform } = require('../utils/videoPlatform');
const { isValidObjectId } = require('../utils/mongoId');

const BULK_MAX_URLS = Math.min(
  Math.max(Number(process.env.BULK_MAX_URLS) || 500, 1),
  2000
);

// GET /api/videos/:id – single video (for detail page when no metrics yet)
exports.getVideoById = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid id' });
    }
    const video = await Video.findOne({ _id: req.params.id, tenantId: req.tenantId }).lean();
    if (!video) return res.status(404).json({ error: 'Not found' });
    res.json(video);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/videos – list all tracked videos
exports.getVideos = async (req, res) => {
  try {
    const { campaign, platform, status } = req.query;
    const filter = videoFilter(req, {});
    if (campaign) filter.campaign = campaign;
    if (platform) Object.assign(filter, videoMatchFragmentForPlatform(platform));
    if (status) filter.status = status;

    const videos = await Video.find(filter).sort({ addedDate: -1 });
    res.json(videos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

function normaliseInitiatedBy(v) {
  return v === 'supply' ? 'supply' : 'brand';
}

// POST /api/videos – add a single video
exports.addVideo = async (req, res) => {
  try {
    const payload = buildVideoCreatePayload(req.body, {
      defaultInitiatedBy: normaliseInitiatedBy(req.body.initiatedBy),
      tenantId: req.tenantId,
    });
    if (!payload) return res.status(400).json({ error: 'url is required' });
    const video = await Video.create(payload);
    res.status(201).json(video);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'URL already exists' });
    }
    res.status(500).json({ error: err.message });
  }
};

// POST /api/videos/bulk – add multiple URLs at once
exports.addBulkVideos = async (req, res) => {
  try {
    const { urls, initiatedBy: bulkInitiatedBy } = req.body;
    if (!Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({ error: 'urls array is required' });
    }
    if (urls.length > BULK_MAX_URLS) {
      return res.status(400).json({
        error: `Too many URLs (max ${BULK_MAX_URLS}). Split into smaller batches or raise BULK_MAX_URLS.`,
      });
    }

    const defaultInit = normaliseInitiatedBy(bulkInitiatedBy);

    const results = { added: 0, duplicates: 0, errors: [] };

    for (const entry of urls) {
      try {
        const raw = typeof entry === 'string' ? { url: entry } : entry;
        const createPayload = buildVideoCreatePayload(raw, {
          defaultInitiatedBy: defaultInit,
          tenantId: req.tenantId,
        });
        if (!createPayload) continue;
        await Video.create(createPayload);
        results.added++;
      } catch (err) {
        if (err.code === 11000) {
          results.duplicates++;
        } else {
          results.errors.push(err.message);
        }
      }
    }

    res.status(201).json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/videos/:id — also removes all scrape history so Dashboard / analytics stay in sync
exports.deleteVideo = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid id' });
    }
    const video = await Video.findOneAndDelete({
      _id: req.params.id,
      tenantId: req.tenantId,
    });
    if (!video) return res.status(404).json({ error: 'Not found' });
    await VideoMetric.deleteMany({ videoId: video._id });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

function platformFromUrl(u) {
  if (!u || typeof u !== 'string') return 'unknown';
  const s = u.toLowerCase();
  if (s.includes('instagram.com') || s.includes('instagr.am')) return 'instagram';
  if (s.includes('tiktok.com') || s.includes('vm.tiktok.com')) return 'tiktok';
  if (s.includes('facebook.com') || s.includes('fb.com') || s.includes('fb.watch')) return 'facebook';
  return 'unknown';
}

// PATCH /api/videos/:id – partial update (url, creator, campaign, offerCode, sales, initiatedBy, …)
exports.updateVideo = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid id' });
    }
    const allowed = [
      'creator',
      'campaign',
      'offerCode',
      'sales',
      'initiatedBy',
      'url',
      'platform',
      'createdBy',
      'publishDate',
      'influencerName',
      'influencerHandle',
      'lob',
      'videoDuration',
      'totalCost',
    ];
    const patch = {};
    for (const k of allowed) {
      if (!(k in req.body)) continue;
      if (k === 'sales' || k === 'totalCost') {
        const v = req.body[k];
        if (v === '' || v === null) {
          patch[k] = null;
        } else {
          const n = Number(v);
          if (!Number.isNaN(n)) patch[k] = n;
        }
      } else if (k === 'url') {
        const u = String(req.body[k]).trim();
        if (!u) return res.status(400).json({ error: 'url cannot be empty' });
        patch.url = u;
        patch.platform = platformFromUrl(u);
      } else if (k === 'platform') {
        const p = String(req.body[k] || '').trim().toLowerCase();
        if (p === 'instagram' || p === 'tiktok' || p === 'facebook' || p === 'unknown') patch.platform = p;
      } else if (k === 'initiatedBy') {
        patch[k] = normaliseInitiatedBy(req.body[k]);
      } else if (k === 'publishDate') {
        const v = req.body[k];
        patch[k] = v === '' || v == null ? null : new Date(v);
        if (patch[k] && Number.isNaN(patch[k].getTime())) {
          return res.status(400).json({ error: 'Invalid publishDate' });
        }
      } else if (k === 'campaign' || k === 'creator' || k === 'offerCode') {
        patch[k] = req.body[k] != null ? String(req.body[k]).trim() : '';
      } else if (
        k === 'createdBy' ||
        k === 'influencerName' ||
        k === 'influencerHandle' ||
        k === 'lob' ||
        k === 'videoDuration'
      ) {
        patch[k] = req.body[k] != null ? String(req.body[k]).trim() : '';
      } else {
        patch[k] = req.body[k];
      }
    }
    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ error: 'No updatable fields' });
    }
    const video = await Video.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      patch,
      {
        new: true,
        runValidators: true,
      }
    );
    if (!video) return res.status(404).json({ error: 'Not found' });
    if (patch.url != null) {
      await VideoMetric.updateMany({ videoId: video._id }, { $set: { url: video.url } });
    }
    res.json(video);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'URL already exists' });
    }
    res.status(500).json({ error: err.message });
  }
};

// PATCH /api/videos/:id/status – toggle active/paused
exports.updateStatus = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid id' });
    }
    const { status } = req.body;
    if (!['active', 'paused', 'error'].includes(status)) {
      return res.status(400).json({ error: 'status must be active, paused, or error' });
    }
    const video = await Video.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      { status },
      { new: true }
    );
    if (!video) return res.status(404).json({ error: 'Not found' });
    res.json(video);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
