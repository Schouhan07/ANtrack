const Campaign = require('../models/Campaign');
const { isValidObjectId } = require('../utils/mongoId');

// GET /api/campaigns – list with optional filters
exports.getCampaigns = async (req, res) => {
  try {
    const { country, initiatedBy, lob, influencerName, from, to } = req.query;
    const filter = { tenantId: req.tenantId };

    if (country) filter.country = country;
    if (initiatedBy) filter.initiatedBy = initiatedBy;
    if (lob) filter.lob = lob;
    if (influencerName) {
      filter.influencerName = { $regex: influencerName, $options: 'i' };
    }
    if (from || to) {
      filter.dateLive = {};
      if (from) filter.dateLive.$gte = new Date(from);
      if (to) filter.dateLive.$lte = new Date(to);
    }

    const campaigns = await Campaign.find(filter).sort({ dateLive: -1 });
    res.json(campaigns);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/campaigns/summary – aggregated stats (respects same filters)
exports.getCampaignSummary = async (req, res) => {
  try {
    const { country, initiatedBy, lob, from, to } = req.query;
    const filter = { tenantId: req.tenantId };
    if (country) filter.country = country;
    if (initiatedBy) filter.initiatedBy = initiatedBy;
    if (lob) filter.lob = lob;
    if (from || to) {
      filter.dateLive = {};
      if (from) filter.dateLive.$gte = new Date(from);
      if (to) filter.dateLive.$lte = new Date(to);
    }

    const campaigns = await Campaign.find(filter).lean();
    const totalEntries = campaigns.length;
    const totalCost = campaigns.reduce((s, c) => s + (c.cost || 0), 0);
    const avgCost = totalEntries > 0 ? Math.round(totalCost / totalEntries) : 0;
    const countries = [...new Set(campaigns.map((c) => c.country))].length;

    res.json({ totalEntries, totalCost, avgCost, countries });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/campaigns/influencers – unique influencer names for dropdown
exports.getInfluencerNames = async (req, res) => {
  try {
    const names = await Campaign.distinct('influencerName', { tenantId: req.tenantId });
    res.json(names.sort());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const CAMPAIGN_FIELDS = [
  'country',
  'initiatedBy',
  'lob',
  'influencerName',
  'url',
  'cost',
  'dateLive',
  'summary',
];

function pickCampaignPayload(body) {
  const out = {};
  for (const k of CAMPAIGN_FIELDS) {
    if (!(k in body)) continue;
    if (k === 'cost') {
      const n = Number(body[k]);
      if (!Number.isNaN(n)) out[k] = n;
    } else if (k === 'dateLive') {
      const d = new Date(body[k]);
      if (!Number.isNaN(d.getTime())) out[k] = d;
    } else {
      out[k] = body[k] != null ? String(body[k]).trim() : '';
    }
  }
  return out;
}

// POST /api/campaigns – create new entry
exports.createCampaign = async (req, res) => {
  try {
    const campaign = await Campaign.create({
      ...pickCampaignPayload(req.body),
      tenantId: req.tenantId,
    });
    res.status(201).json(campaign);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// PUT /api/campaigns/:id – update entry
exports.updateCampaign = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid id' });
    }
    const patch = pickCampaignPayload(req.body);
    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }
    const campaign = await Campaign.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      patch,
      {
        new: true,
        runValidators: true,
      }
    );
    if (!campaign) return res.status(404).json({ error: 'Not found' });
    res.json(campaign);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// DELETE /api/campaigns/:id
exports.deleteCampaign = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid id' });
    }
    const removed = await Campaign.findOneAndDelete({ _id: req.params.id, tenantId: req.tenantId });
    if (!removed) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
