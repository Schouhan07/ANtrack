const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema({
  country: {
    type: String,
    enum: ['SG', 'MY', 'KH'],
    required: true,
  },
  initiatedBy: {
    type: String,
    enum: ['Brand', 'Supply'],
    required: true,
  },
  lob: {
    type: String,
    enum: ['Bus', 'Ferry', 'TTD', 'General'],
    required: true,
  },
  influencerName: {
    type: String,
    required: true,
    trim: true,
  },
  url: {
    type: String,
    required: true,
    trim: true,
  },
  cost: {
    type: Number,
    default: 0,
  },
  dateLive: {
    type: Date,
    required: true,
  },
  summary: {
    type: String,
    default: '',
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

campaignSchema.index({ country: 1, lob: 1, dateLive: -1 });

module.exports = mongoose.model('Campaign', campaignSchema);
