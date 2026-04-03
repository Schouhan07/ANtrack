/**
 * Normalise optional video fields from API / bulk row bodies.
 * @param {Record<string, unknown>} raw
 * @param {{ defaultInitiatedBy?: 'brand'|'supply' }} [opts]
 */
function buildVideoCreatePayload(raw, opts = {}) {
  const defaultInit = opts.defaultInitiatedBy === 'supply' ? 'supply' : 'brand';
  const url = raw.url != null ? String(raw.url).trim() : '';
  if (!url) return null;

  const rowInit =
    raw.initiatedBy === 'supply' || raw.initiatedBy === 'brand'
      ? raw.initiatedBy
      : defaultInit;

  const influencerName =
    raw.influencerName != null ? String(raw.influencerName).trim() : '';
  let creator = raw.creator != null ? String(raw.creator).trim() : '';
  if (!creator && influencerName) creator = influencerName;

  const payload = {
    url,
    creator,
    campaign: raw.campaign != null ? String(raw.campaign).trim() : '',
    initiatedBy: rowInit,
    createdBy: raw.createdBy != null ? String(raw.createdBy).trim() : '',
    influencerName,
    influencerHandle:
      raw.influencerHandle != null ? String(raw.influencerHandle).trim() : '',
    lob: raw.lob != null ? String(raw.lob).trim() : '',
    videoDuration:
      raw.videoDuration != null ? String(raw.videoDuration).trim() : '',
  };

  if (raw.publishDate != null && String(raw.publishDate).trim() !== '') {
    const d = new Date(raw.publishDate);
    if (!Number.isNaN(d.getTime())) payload.publishDate = d;
  }

  if (raw.totalCost !== undefined && raw.totalCost !== '' && raw.totalCost != null) {
    const n = Number(raw.totalCost);
    if (!Number.isNaN(n)) payload.totalCost = n;
  }

  const couponRaw =
    raw.offerCode ?? raw.couponCode ?? raw['Coupon code used'] ?? raw.coupon;
  if (couponRaw != null && String(couponRaw).trim()) {
    payload.offerCode = String(couponRaw).trim();
  }
  if (raw.sales !== undefined && raw.sales !== '' && raw.sales !== null) {
    const n = Number(raw.sales);
    if (!Number.isNaN(n)) payload.sales = n;
  }

  if (raw.platform != null && String(raw.platform).trim()) {
    const p = String(raw.platform).trim().toLowerCase();
    if (p === 'instagram' || p === 'tiktok') payload.platform = p;
  }

  return payload;
}

module.exports = { buildVideoCreatePayload };
