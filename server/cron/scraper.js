const cron = require('node-cron');
const Video = require('../models/Video');
const VideoMetric = require('../models/VideoMetric');
const {
  scrapeTikTok,
  scrapeInstagram,
  normaliseTikTok,
  normaliseInstagram,
  extractVideoId,
  extractTikTokCreator,
  extractInstagramCreator,
  extractInstagramUsernameFromUrl,
  resolveInstagramSourceUrl,
} = require('../services/apifyService');

/** Apify actors typically cap direct URLs per run (~100). Larger rosters are batched. */
const URLS_PER_APIFY_RUN = Math.min(
  Math.max(Number(process.env.APIFY_URLS_PER_RUN) || 100, 10),
  200
);

function chunkUrls(urls, size) {
  const out = [];
  for (let i = 0; i < urls.length; i += size) out.push(urls.slice(i, i + size));
  return out;
}

/**
 * Merge creator strings from all dataset rows keyed by video shortCode / TikTok id.
 * Helps when the row that matches our DB URL has no owner/author fields but another row does.
 */
function buildCreatorMapByVideoId(results, platform) {
  const map = {};
  for (const raw of results) {
    let url = '';
    if (platform === 'tiktok') {
      url = raw.webVideoUrl || raw.url || raw.inputUrl || '';
    } else {
      url = resolveInstagramSourceUrl(raw);
    }
    if (!url) continue;
    const vid = extractVideoId(url);
    if (!vid) continue;
    const c = platform === 'tiktok' ? extractTikTokCreator(raw) : extractInstagramCreator(raw);
    if (c && String(c).trim()) {
      map[vid] = String(c).trim();
    }
  }
  return map;
}

/**
 * Detect viral: if today's views >= 2x yesterday's views.
 */
async function isViral(videoId, todayViews) {
  const yesterday = await VideoMetric.findOne({ videoId })
    .sort({ scrapedAt: -1 })
    .lean();

  if (!yesterday || yesterday.views === 0) return false;
  return todayViews >= 2 * yesterday.views;
}

/**
 * Save scraped results to the database.
 * @param {Object[]} results – raw Apify output items
 * @param {Function} normaliseFn – platform-specific normaliser
 * @param {Object} idToVideo – lookup map { extractedId → video doc }
 * @param {Record<string, string>|null} creatorMap – optional merged creators by extractVideoId key
 * @returns {number} count of saved metrics
 */
async function saveResults(results, normaliseFn, idToVideo, creatorMap = null) {
  let saved = 0;

  for (const raw of results) {
    const m = normaliseFn(raw);
    const vid = extractVideoId(m.url);
    const video = idToVideo[vid];

    if (!video) {
      console.log(`[CRON] No matching video for scraped URL: ${m.url}`);
      continue;
    }

    const viral = await isViral(video._id, m.views);

    await VideoMetric.create({
      videoId: video._id,
      url: video.url,
      views: m.views,
      likes: m.likes,
      shares: m.shares,
      saves: m.saves,
      viral,
    });

    const fromNorm = m.creator && String(m.creator).trim();
    const fromMap = creatorMap && creatorMap[vid] ? String(creatorMap[vid]).trim() : '';
    let creator = fromNorm || fromMap;
    // Apify often returns instagram.com/reel/CODE without owner; tracked URL may be …/user/reel/CODE
    if (!creator && video.platform === 'instagram') {
      creator = extractInstagramUsernameFromUrl(video.url) || '';
    }
    if (creator) {
      await Video.findByIdAndUpdate(video._id, {
        $set: { creator },
      });
    }

    saved++;
  }

  return saved;
}

/**
 * Core scrape-and-store logic.
 * Splits URLs by platform and calls the correct Apify actor for each.
 */
async function runScrapeJob() {
  console.log(`[CRON] Scrape job started at ${new Date().toISOString()}`);

  const videos = await Video.find({ status: 'active' }).lean();
  if (videos.length === 0) {
    console.log('[CRON] No active videos to scrape.');
    return { scraped: 0 };
  }

  // Split by platform
  const tiktokVideos = videos.filter((v) => v.platform === 'tiktok');
  const instagramVideos = videos.filter((v) => v.platform === 'instagram');

  // Build lookup maps
  const buildIdMap = (list) => {
    const map = {};
    for (const v of list) {
      map[extractVideoId(v.url)] = v;
    }
    return map;
  };

  let totalSaved = 0;
  let totalResults = 0;

  // Scrape TikTok (batched — Apify limits URLs per actor run)
  if (tiktokVideos.length > 0) {
    console.log(
      `[CRON] Scraping ${tiktokVideos.length} TikTok videos in batches of ${URLS_PER_APIFY_RUN}...`
    );
    const idMap = buildIdMap(tiktokVideos);
    try {
      for (const batch of chunkUrls(tiktokVideos, URLS_PER_APIFY_RUN)) {
        const results = await scrapeTikTok(batch.map((v) => v.url));
        totalResults += results.length;
        const ttMap = buildCreatorMapByVideoId(results, 'tiktok');
        totalSaved += await saveResults(results, normaliseTikTok, idMap, ttMap);
      }
    } catch (err) {
      console.error('[CRON] TikTok scrape failed:', err.message);
    }
  }

  // Scrape Instagram (batched)
  if (instagramVideos.length > 0) {
    console.log(
      `[CRON] Scraping ${instagramVideos.length} Instagram videos in batches of ${URLS_PER_APIFY_RUN}...`
    );
    const idMap = buildIdMap(instagramVideos);
    try {
      for (const batch of chunkUrls(instagramVideos, URLS_PER_APIFY_RUN)) {
        const results = await scrapeInstagram(batch.map((v) => v.url));
        totalResults += results.length;
        const igMap = buildCreatorMapByVideoId(results, 'instagram');
        totalSaved += await saveResults(results, normaliseInstagram, idMap, igMap);
      }
    } catch (err) {
      console.error('[CRON] Instagram scrape failed:', err.message);
    }
  }

  console.log(`[CRON] Scrape job complete. Saved ${totalSaved}/${totalResults} metrics.`);
  return { scraped: totalSaved, total: totalResults };
}

/**
 * Schedule: every day at 2:00 AM.
 */
function startCronJob() {
  cron.schedule('0 2 * * *', async () => {
    try {
      await runScrapeJob();
    } catch (err) {
      console.error('[CRON] Job error:', err.message);
    }
  });
  console.log('[CRON] Scheduled daily scraper at 02:00 AM');
}

module.exports = { startCronJob, runScrapeJob };
