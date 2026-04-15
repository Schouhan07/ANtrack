/**
 * Effective platform for analytics, Apify queues, and dashboard filters.
 * Post URL wins over stored `platform` so mis-tagged imports still behave correctly.
 * @param {{ url?: string, platform?: string } | null | undefined} doc
 * @returns {'instagram'|'tiktok'|'facebook'|'unknown'}
 */
function effectiveVideoPlatform(doc) {
  if (!doc) return 'unknown';
  const url = String(doc.url || '').toLowerCase();
  if (url.includes('instagram.com') || url.includes('instagr.am')) return 'instagram';
  if (url.includes('tiktok.com') || url.includes('vm.tiktok') || url.includes('vt.tiktok')) {
    return 'tiktok';
  }
  if (url.includes('facebook.com') || url.includes('fb.com') || url.includes('fb.watch')) {
    return 'facebook';
  }
  const p = String(doc.platform || '').toLowerCase();
  if (p === 'instagram' || p === 'tiktok' || p === 'facebook') return p;
  return 'unknown';
}

/** TikTok / Instagram Apify actors only (facebook not scraped here). */
function scrapeActorForVideo(doc) {
  const ep = effectiveVideoPlatform(doc);
  if (ep === 'tiktok' || ep === 'instagram') return ep;
  return null;
}

/**
 * Mongo fragment for `Video.find` / `$match` when filtering by dashboard / list platform.
 * Matches {@link effectiveVideoPlatform}: URL wins over stored `platform` so Analytics cards,
 * dashboard KPIs, and video lists stay in sync (no double-count across networks).
 * @param {'tiktok'|'instagram'|'facebook'} platform
 */
function videoMatchFragmentForPlatform(platform) {
  const p = String(platform || '').toLowerCase();
  if (p === 'tiktok') {
    return {
      $or: [
        { url: { $regex: /tiktok\.com|vm\.tiktok|vt\.tiktok/i } },
        {
          $and: [
            { url: { $not: /instagram\.com|instagr\.am/i } },
            { platform: 'tiktok' },
          ],
        },
      ],
    };
  }
  if (p === 'instagram') {
    return {
      $or: [
        { url: { $regex: /instagram\.com|instagr\.am/i } },
        {
          $and: [
            { url: { $not: /tiktok\.com|vm\.tiktok|vt\.tiktok/i } },
            { platform: 'instagram' },
          ],
        },
      ],
    };
  }
  if (p === 'facebook') {
    return {
      $or: [
        { url: { $regex: /facebook\.com|fb\.com|fb\.watch/i } },
        {
          $and: [
            { url: { $not: /instagram\.com|instagr\.am|tiktok\.com|vm\.tiktok|vt\.tiktok/i } },
            { platform: 'facebook' },
          ],
        },
      ],
    };
  }
  return {};
}

module.exports = {
  effectiveVideoPlatform,
  scrapeActorForVideo,
  videoMatchFragmentForPlatform,
};
