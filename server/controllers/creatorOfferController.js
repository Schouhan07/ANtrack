const Video = require('../models/Video');
const CreatorOfferMapping = require('../models/CreatorOfferMapping');

/** Distinct creator handles from active videos (for dropdown) */
exports.getCreatorNames = async (req, res) => {
  try {
    const raw = await Video.distinct('creator', {
      status: 'active',
      creator: { $nin: ['', null], $exists: true },
    });
    const names = raw
      .map((c) => String(c || '').trim())
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    res.json(names);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.list = async (req, res) => {
  try {
    const rows = await CreatorOfferMapping.find({}).sort({ creatorName: 1, offerCode: 1 }).lean();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { creatorName, offerCode, sales } = req.body;
    if (!creatorName || !String(creatorName).trim()) {
      return res.status(400).json({ error: 'creatorName is required' });
    }
    if (!offerCode || !String(offerCode).trim()) {
      return res.status(400).json({ error: 'offerCode is required' });
    }
    let salesVal = null;
    if (sales !== undefined && sales !== '' && sales !== null) {
      const n = Number(sales);
      if (Number.isNaN(n)) return res.status(400).json({ error: 'sales must be a number' });
      salesVal = n;
    }
    const doc = await CreatorOfferMapping.create({
      creatorName: String(creatorName).trim(),
      offerCode: String(offerCode).trim(),
      sales: salesVal,
    });
    res.status(201).json(doc);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'This offer code already exists (codes are unique)' });
    }
    res.status(500).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { creatorName, offerCode, sales } = req.body;
    const patch = {};
    if (creatorName !== undefined) patch.creatorName = String(creatorName).trim();
    if (offerCode !== undefined) patch.offerCode = String(offerCode).trim();
    if (sales !== undefined) {
      patch.sales = sales === '' || sales === null ? null : Number(sales);
      if (patch.sales !== null && Number.isNaN(patch.sales)) {
        return res.status(400).json({ error: 'sales must be a number' });
      }
    }
    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ error: 'Nothing to update' });
    }
    const doc = await CreatorOfferMapping.findByIdAndUpdate(req.params.id, patch, {
      new: true,
      runValidators: true,
    });
    if (!doc) return res.status(404).json({ error: 'Not found' });
    res.json(doc);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'This offer code already exists' });
    }
    res.status(500).json({ error: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const doc = await CreatorOfferMapping.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
