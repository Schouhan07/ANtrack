const mongoose = require('mongoose');

const videoMetricSchema = new mongoose.Schema({
  tenantId: {
    type: String,
    required: true,
    default: 'default',
    index: true,
  },
  videoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Video',
    required: true,
  },
  url: {
    type: String,
    required: true,
  },
  views: {
    type: Number,
    default: 0,
  },
  likes: {
    type: Number,
    default: 0,
  },
  shares: {
    type: Number,
    default: 0,
  },
  saves: {
    type: Number,
    default: 0,
  },
  comments: {
    type: Number,
    default: 0,
  },
  viral: {
    type: Boolean,
    default: false,
  },
  scrapedAt: {
    type: Date,
    default: Date.now,
  },
});

videoMetricSchema.index({ videoId: 1, scrapedAt: -1 });

module.exports = mongoose.model('VideoMetric', videoMetricSchema);
