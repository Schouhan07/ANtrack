const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
  tenantId: {
    type: String,
    required: true,
    default: 'default',
    index: true,
  },
  url: {
    type: String,
    required: true,
    trim: true,
  },
  platform: {
    type: String,
    enum: ['instagram', 'tiktok', 'facebook', 'unknown'],
    default: 'unknown',
  },
  creator: {
    type: String,
    default: '',
    trim: true,
  },
  /** Person or team that created / logged this entry */
  createdBy: {
    type: String,
    default: '',
    trim: true,
  },
  /** When the post was published (optional) */
  publishDate: {
    type: Date,
    default: null,
  },
  influencerName: {
    type: String,
    default: '',
    trim: true,
  },
  influencerHandle: {
    type: String,
    default: '',
    trim: true,
  },
  /** Line of business */
  lob: {
    type: String,
    default: '',
    trim: true,
  },
  videoDuration: {
    type: String,
    default: '',
    trim: true,
  },
  totalCost: {
    type: Number,
    default: null,
  },
  campaign: {
    type: String,
    default: '',
    trim: true,
  },
  /** Promo / offer code for this tracked post (shown on Influencer tab, mapped by creator) */
  offerCode: {
    type: String,
    default: '',
    trim: true,
  },
  /** Optional sales count or revenue figure you maintain (summed per creator on Influencer tab) */
  sales: {
    type: Number,
    default: null,
  },
  /** Who requested tracking this URL */
  initiatedBy: {
    type: String,
    enum: ['brand', 'supply'],
    default: 'brand',
  },
  addedDate: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ['active', 'paused', 'error'],
    default: 'active',
  },
});

/**
 * Auto-detect platform from URL before saving.
 */
videoSchema.pre('save', function (next) {
  if (this.platform === 'unknown' || !this.platform) {
    const u = String(this.url || '').toLowerCase();
    if (u.includes('instagram.com') || u.includes('instagr.am')) {
      this.platform = 'instagram';
    } else if (u.includes('tiktok.com') || u.includes('vm.tiktok.com')) {
      this.platform = 'tiktok';
    } else if (u.includes('facebook.com') || u.includes('fb.com') || u.includes('fb.watch')) {
      this.platform = 'facebook';
    }
  }
  next();
});

videoSchema.index({ tenantId: 1, url: 1 }, { unique: true });

module.exports = mongoose.model('Video', videoSchema);
