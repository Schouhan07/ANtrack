const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  platform: {
    type: String,
    enum: ['instagram', 'tiktok', 'unknown'],
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
    if (this.url.includes('instagram.com') || this.url.includes('instagr.am')) {
      this.platform = 'instagram';
    } else if (this.url.includes('tiktok.com') || this.url.includes('vm.tiktok.com')) {
      this.platform = 'tiktok';
    }
  }
  next();
});

module.exports = mongoose.model('Video', videoSchema);
