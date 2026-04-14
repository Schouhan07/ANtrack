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
const { scrapeActorForVideo, effectiveVideoPlatform } = require('../utils/videoPlatform');

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
 * DB URL → multiple lookup keys (short vt/vm links vs Apify canonical …/video/123).
 */
function buildTikTokIdLookup(videos) {
  const map = {};
  const put = (key, video) => {
    if (key == null || key === '') return;
    const s = String(key).trim();
    if (!s) return;
    map[s] = video;
    map[s.toLowerCase()] = video;
  };
  for (const v of videos) {
    const u = String(v.url || '').trim();
    put(u, v);
    const num = u.match(/video\/(\d+)/i);
    if (num) put(num[1], v);
    put(extractVideoId(u), v);
    try {
      const { pathname } = new URL(u);
      const path = pathname.replace(/^\/+|\/+$/g, '');
      if (path && /vt\.tiktok|vm\.tiktok/i.test(u)) put(path, v);
    } catch (_) {
      /* ignore */
    }
  }
  return map;
}

function resolveTrackedVideoForRow(raw, m, idToVideo, platform) {
  if (platform === 'instagram') {
    const vid = extractVideoId(m.url);
    return idToVideo[vid] || null;
  }
  const candidates = [
    m.url,
    raw?.webVideoUrl,
    raw?.url,
    raw?.inputUrl,
    raw?.submittedVideoUrl,
    raw?.videoUrl,
  ].filter(Boolean);
  for (const u of candidates) {
    const id = extractVideoId(String(u));
    if (id && idToVideo[id]) return idToVideo[id];
  }
  for (const u of candidates) {
    const s = String(u).trim();
    if (s && idToVideo[s]) return idToVideo[s];
    if (s && idToVideo[s.toLowerCase()]) return idToVideo[s.toLowerCase()];
  }
  return null;
}

/**
 * Save scraped results to the database.
 * @param {Object[]} results – raw Apify output items
 * @param {Function} normaliseFn – platform-specific normaliser
 * @param {Object} idToVideo – lookup map { extractedId → video doc }
 * @param {Record<string, string>|null} creatorMap – optional merged creators by extractVideoId key
 * @param {'tiktok'|'instagram'} platform
 * @returns {number} count of saved metrics
 */
async function saveResults(results, normaliseFn, idToVideo, creatorMap = null, platform = 'tiktok') {
  let saved = 0;

  for (const raw of results) {
    const m = normaliseFn(raw);
    const video = resolveTrackedVideoForRow(raw, m, idToVideo, platform);
    const metricKey = extractVideoId(m.url);

    if (!video) {
      console.log(`[CRON] No matching video for scraped URL: ${m.url}`);
      continue;
    }

    const viral = await isViral(video._id, m.views);

    await VideoMetric.create({
      tenantId: video.tenantId,
      videoId: video._id,
      url: video.url,
      views: m.views,
      likes: m.likes,
      shares: m.shares,
      saves: m.saves,
      comments: Math.max(0, Number(m.comments) || 0),
      viral,
    });

    const fromNorm = m.creator && String(m.creator).trim();
    const fromMap =
      creatorMap && metricKey && creatorMap[metricKey]
        ? String(creatorMap[metricKey]).trim()
        : '';
    let creator = fromNorm || fromMap;
    // Apify often returns instagram.com/reel/CODE without owner; tracked URL may be …/user/reel/CODE
    if (!creator && effectiveVideoPlatform(video) === 'instagram') {
      creator = extractInstagramUsernameFromUrl(video.url) || '';
    }
    const ep = effectiveVideoPlatform(video);
    const set = {};
    if (creator) set.creator = creator;
    if (ep !== 'unknown' && ep !== video.platform) set.platform = ep;
    if (Object.keys(set).length > 0) {
      await Video.findByIdAndUpdate(video._id, { $set: set });
    }

    saved++;
  }

  return saved;
}

/**
 * Core scrape-and-store logic.
 * Splits URLs by platform and calls the correct Apify actor for each.
 */
async function runScrapeJob(opts = {}) {
  const { tenantId } = opts;
  console.log(`[CRON] Scrape job started at ${new Date().toISOString()}`);

  const q = { status: 'active' };
  if (tenantId) q.tenantId = tenantId;
  const videos = await Video.find(q).lean();
  if (videos.length === 0) {
    console.log('[CRON] No active videos to scrape.');
    return { scraped: 0, total: 0, warnings: [], counts: { active: 0, tiktok: 0, instagram: 0 } };
  }

  const tiktokVideos = videos.filter((v) => scrapeActorForVideo(v) === 'tiktok');
  const instagramVideos = videos.filter((v) => scrapeActorForVideo(v) === 'instagram');

  const warnings = [];
  const tiktokConfigured = Boolean(
    String(process.env.APIFY_TOKEN || '').trim() && String(process.env.APIFY_TIKTOK_ACTOR_ID || '').trim()
  );
  const instagramConfigured = Boolean(
    String(process.env.APIFY_TOKEN || '').trim() && String(process.env.APIFY_INSTAGRAM_ACTOR_ID || '').trim()
  );

  if (tiktokVideos.length > 0 && !tiktokConfigured) {
    const msg =
      'TikTok scrape skipped: set APIFY_TOKEN and APIFY_TIKTOK_ACTOR_ID in server .env (e.g. clockworks~tiktok-scraper).';
    console.error(`[CRON] ${msg}`);
    warnings.push(msg);
  }
  if (instagramVideos.length > 0 && !instagramConfigured) {
    const msg =
      'Instagram scrape skipped: set APIFY_TOKEN and APIFY_INSTAGRAM_ACTOR_ID in server .env.';
    console.error(`[CRON] ${msg}`);
    warnings.push(msg);
  }

  console.log(
    `[CRON] Queue by URL: ${tiktokVideos.length} TikTok, ${instagramVideos.length} Instagram (active videos: ${videos.length})`
  );

  const buildInstagramIdMap = (list) => {
    const map = {};
    for (const v of list) {
      map[extractVideoId(v.url)] = v;
    }
    return map;
  };

  let totalSaved = 0;
  let totalResults = 0;

  // Scrape TikTok (batched — Apify limits URLs per actor run)
  if (tiktokVideos.length > 0 && tiktokConfigured) {
    console.log(
      `[CRON] Scraping ${tiktokVideos.length} TikTok videos in batches of ${URLS_PER_APIFY_RUN}...`
    );
    const idMap = buildTikTokIdLookup(tiktokVideos);
    try {
      for (const batch of chunkUrls(tiktokVideos, URLS_PER_APIFY_RUN)) {
        const results = await scrapeTikTok(batch.map((v) => v.url));
        totalResults += results.length;
        const ttMap = buildCreatorMapByVideoId(results, 'tiktok');
        totalSaved += await saveResults(results, normaliseTikTok, idMap, ttMap, 'tiktok');
      }
    } catch (err) {
      console.error('[CRON] TikTok scrape failed:', err.message);
      warnings.push(`TikTok Apify error: ${err.message}`);
    }
  }

  // Scrape Instagram (batched)
  if (instagramVideos.length > 0 && instagramConfigured) {
    console.log(
      `[CRON] Scraping ${instagramVideos.length} Instagram videos in batches of ${URLS_PER_APIFY_RUN}...`
    );
    const idMap = buildInstagramIdMap(instagramVideos);
    try {
      for (const batch of chunkUrls(instagramVideos, URLS_PER_APIFY_RUN)) {
        const results = await scrapeInstagram(batch.map((v) => v.url));
        totalResults += results.length;
        const igMap = buildCreatorMapByVideoId(results, 'instagram');
        totalSaved += await saveResults(results, normaliseInstagram, idMap, igMap, 'instagram');
      }
    } catch (err) {
      console.error('[CRON] Instagram scrape failed:', err.message);
      warnings.push(`Instagram Apify error: ${err.message}`);
    }
  }

  console.log(`[CRON] Scrape job complete. Saved ${totalSaved}/${totalResults} metrics.`);
  return {
    scraped: totalSaved,
    total: totalResults,
    warnings,
    counts: {
      active: videos.length,
      tiktok: tiktokVideos.length,
      instagram: instagramVideos.length,
    },
  };
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
