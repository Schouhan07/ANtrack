const Campaign = require('../models/Campaign');

// GET /api/campaigns – list with optional filters
exports.getCampaigns = async (req, res) => {
  try {
    const { country, initiatedBy, lob, influencerName, from, to } = req.query;
    const filter = {};

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
    const filter = {};
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
exports.getInfluencerNames = async (_req, res) => {
  try {
    const names = await Campaign.distinct('influencerName');
    res.json(names.sort());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/campaigns – create new entry
exports.createCampaign = async (req, res) => {
  try {
    const campaign = await Campaign.create(req.body);
    res.status(201).json(campaign);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// PUT /api/campaigns/:id – update entry
exports.updateCampaign = async (req, res) => {
  try {
    const campaign = await Campaign.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!campaign) return res.status(404).json({ error: 'Not found' });
    res.json(campaign);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// DELETE /api/campaigns/:id
exports.deleteCampaign = async (req, res) => {
  try {
    await Campaign.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
