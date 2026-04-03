const Video = require('../models/Video');
const VideoMetric = require('../models/VideoMetric');
const { buildVideoCreatePayload } = require('../utils/videoPayload');

// GET /api/videos/:id – single video (for detail page when no metrics yet)
exports.getVideoById = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id).lean();
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
    const filter = {};
    if (campaign) filter.campaign = campaign;
    if (platform) filter.platform = platform;
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

    const defaultInit = normaliseInitiatedBy(bulkInitiatedBy);

    const results = { added: 0, duplicates: 0, errors: [] };

    for (const entry of urls) {
      try {
        const raw = typeof entry === 'string' ? { url: entry } : entry;
        const createPayload = buildVideoCreatePayload(raw, {
          defaultInitiatedBy: defaultInit,
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
    console.log(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/videos/:id — also removes all scrape history so Dashboard / analytics stay in sync
exports.deleteVideo = async (req, res) => {
  try {
    const video = await Video.findByIdAndDelete(req.params.id);
    if (!video) return res.status(404).json({ error: 'Not found' });
    await VideoMetric.deleteMany({ videoId: video._id });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

function platformFromUrl(u) {
  if (!u || typeof u !== 'string') return 'unknown';
  if (u.includes('instagram.com') || u.includes('instagr.am')) return 'instagram';
  if (u.includes('tiktok.com') || u.includes('vm.tiktok.com')) return 'tiktok';
  return 'unknown';
}

// PATCH /api/videos/:id – partial update (url, creator, campaign, offerCode, sales, initiatedBy, …)
exports.updateVideo = async (req, res) => {
  try {
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
        if (p === 'instagram' || p === 'tiktok' || p === 'unknown') patch.platform = p;
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
    const video = await Video.findByIdAndUpdate(req.params.id, patch, {
      new: true,
      runValidators: true,
    });
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
    const { status } = req.body;
    const video = await Video.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    res.json(video);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
