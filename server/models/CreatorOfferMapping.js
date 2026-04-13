const mongoose = require('mongoose');

/**
 * Manual offer code ↔ creator mapping (unique per offer code globally).
 * Merged into Influencer tab with per-video offerCode/sales.
 */
const creatorOfferMappingSchema = new mongoose.Schema(
  {
    tenantId: {
      type: String,
      required: true,
      default: 'default',
      index: true,
    },
    creatorName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    /** Normalized to uppercase; globally unique */
    offerCode: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    sales: {
      type: Number,
      default: null,
    },
  },
  { timestamps: true }
);

creatorOfferMappingSchema.pre('validate', function (next) {
  if (this.offerCode) {
    this.offerCode = String(this.offerCode).trim().toUpperCase();
  }
  if (this.creatorName) {
    this.creatorName = String(this.creatorName).trim();
  }
  next();
});

creatorOfferMappingSchema.index({ tenantId: 1, offerCode: 1 }, { unique: true });

module.exports = mongoose.model('CreatorOfferMapping', creatorOfferMappingSchema);
