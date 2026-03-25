const Video = require('../models/Video');
const VideoMetric = require('../models/VideoMetric');

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
    const { url, creator, campaign, platform, initiatedBy } = req.body;
    if (!url) return res.status(400).json({ error: 'url is required' });

    const { offerCode, sales } = req.body;
    const payload = {
      url,
      creator,
      campaign,
      platform,
      initiatedBy: normaliseInitiatedBy(initiatedBy),
    };
    if (offerCode != null && String(offerCode).trim()) payload.offerCode = String(offerCode).trim();
    if (sales !== undefined && sales !== '' && sales !== null) {
      const n = Number(sales);
      if (!Number.isNaN(n)) payload.sales = n;
    }
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
        if (!raw.url) continue;
        const rowInit =
          raw.initiatedBy === 'supply' || raw.initiatedBy === 'brand'
            ? raw.initiatedBy
            : defaultInit;
        const createPayload = {
          url: String(raw.url).trim(),
          creator: raw.creator != null ? String(raw.creator).trim() : '',
          campaign: raw.campaign != null ? String(raw.campaign).trim() : '',
          platform: raw.platform,
          initiatedBy: rowInit,
        };
        if (raw.offerCode != null && String(raw.offerCode).trim()) {
          createPayload.offerCode = String(raw.offerCode).trim();
        }
        if (raw.sales !== undefined && raw.sales !== null && raw.sales !== '') {
          const n = Number(raw.sales);
          if (!Number.isNaN(n)) createPayload.sales = n;
        }
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
    const allowed = ['creator', 'campaign', 'offerCode', 'sales', 'initiatedBy', 'url'];
    const patch = {};
    for (const k of allowed) {
      if (!(k in req.body)) continue;
      if (k === 'sales') {
        const v = req.body[k];
        patch[k] = v === '' || v === null ? null : Number(v);
      } else if (k === 'url') {
        const u = String(req.body[k]).trim();
        if (!u) return res.status(400).json({ error: 'url cannot be empty' });
        patch.url = u;
        patch.platform = platformFromUrl(u);
      } else if (k === 'initiatedBy') {
        patch[k] = normaliseInitiatedBy(req.body[k]);
      } else if (k === 'campaign') {
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
