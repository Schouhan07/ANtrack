const axios = require('axios');

const APIFY_BASE = 'https://api.apify.com/v2';

/**
 * Run an Apify actor and return the dataset items.
 */
async function runActor(actorId, input) {
  const token = process.env.APIFY_TOKEN;
  if (!token) throw new Error('APIFY_TOKEN must be set in .env');

  const id = String(actorId || '').trim();
  const q = new URLSearchParams({ token, waitForFinish: '300' });
  const runUrl = `${APIFY_BASE}/acts/${encodeURIComponent(id)}/runs?${q.toString()}`;
  console.log(`[APIFY] Sending request to actor ${id}`);

  const { data: run } = await axios.post(runUrl, input);

  const datasetId = run?.data?.defaultDatasetId;
  if (!datasetId) throw new Error(`Actor ${id} did not return a dataset ID`);

  const itemsQs = new URLSearchParams({ token });
  const { data: dataset } = await axios.get(
    `${APIFY_BASE}/datasets/${encodeURIComponent(datasetId)}/items?${itemsQs.toString()}`
  );

  const items = Array.isArray(dataset) ? dataset : [];
  console.log(`[APIFY] Received ${items.length} results from ${actorId}`);
  return items;
}

/**
 * Scrape TikTok videos using the clockworks~tiktok-scraper actor.
 * Input format: { postURLs: ["url1", "url2"] }
 */
async function scrapeTikTok(urls) {
  const actorId = process.env.APIFY_TIKTOK_ACTOR_ID;
  if (!actorId) throw new Error('APIFY_TIKTOK_ACTOR_ID must be set in .env');
  return runActor(actorId, { postURLs: urls });
}

/**
 * Build Instagram actor input (cost control for apify~instagram-scraper).
 * - resultsType "posts" (not "comments") avoids comment-only scraping.
 * - resultsLimit 1 = one post per direct URL (schema: "single post from each page").
 * - addParentData false skips extra feed/parent metadata where applicable.
 * Optional INSTAGRAM_SCRAPER_EXTRA_INPUT (JSON object) merges for forks / newer actor fields;
 * directUrls is always taken from the urls argument.
 */
function buildInstagramActorInput(urls) {
  const parsedLimit = parseInt(process.env.INSTAGRAM_SCRAPER_RESULTS_LIMIT, 10);
  const resultsLimit =
    Number.isFinite(parsedLimit) && parsedLimit >= 1 ? parsedLimit : 1;

  const input = {
    directUrls: urls,
    resultsType: 'posts',
    resultsLimit,
    addParentData: false,
  };

  const rawExtra = process.env.INSTAGRAM_SCRAPER_EXTRA_INPUT;
  if (rawExtra && String(rawExtra).trim()) {
    try {
      const extra = JSON.parse(rawExtra);
      if (extra && typeof extra === 'object' && !Array.isArray(extra)) {
        Object.assign(input, extra);
        input.directUrls = urls;
      }
    } catch (err) {
      console.warn('[APIFY] INSTAGRAM_SCRAPER_EXTRA_INPUT is not valid JSON, ignoring.');
    }
  }

  return input;
}

/**
 * Scrape Instagram reels using the actor from APIFY_INSTAGRAM_ACTOR_ID (default apify~instagram-scraper).
 */
async function scrapeInstagram(urls) {
  const actorId = process.env.APIFY_INSTAGRAM_ACTOR_ID;
  if (!actorId) throw new Error('APIFY_INSTAGRAM_ACTOR_ID must be set in .env');
  return runActor(actorId, buildInstagramActorInput(urls));
}

/**
 * Apify often returns dot-notation keys as a single string key ("authorMeta.name")
 * or as nested objects — resolve both.
 */
function readFlatOrNested(obj, dottedPath) {
  if (obj == null || typeof obj !== 'object') return undefined;
  if (Object.prototype.hasOwnProperty.call(obj, dottedPath)) {
    const v = obj[dottedPath];
    if (v != null && String(v).trim() !== '') return v;
  }
  const parts = dottedPath.split('.');
  let cur = obj;
  for (const p of parts) {
    cur = cur?.[p];
  }
  if (cur != null && String(cur).trim() !== '') return cur;
  return undefined;
}

/**
 * TikTok (clockworks): creator handle from authorMeta.name (flat or nested) or uniqueId.
 */
function extractTikTokCreator(raw) {
  const primary =
    readFlatOrNested(raw, 'authorMeta.name') ??
    readFlatOrNested(raw, 'author.name');
  let s = String(primary ?? '')
    .replace(/^@/, '')
    .trim();
  if (s) return s;
  const fallback =
    readFlatOrNested(raw, 'authorMeta.uniqueId') ??
    readFlatOrNested(raw, 'author.uniqueId') ??
    raw.authorMeta?.uniqueId;
  s = String(fallback ?? '')
    .replace(/^@/, '')
    .trim();
  return s || '';
}

/**
 * Post/reel row only — never read latestComments[].ownerUsername (that is the commenter).
 * Root-level ownerUsername is the poster (see Apify Instagram post schema).
 */
const IG_CREATOR_FIELD_PATHS = [
  (r) => r.ownerUsername,
  (r) => r['ownerUsername'],
  (r) => r.OwnerUsername,
  (r) => r.owner_username,
  (r) => r['owner_username'],
  (r) => readFlatOrNested(r, 'owner.username'),
  (r) => readFlatOrNested(r, 'shortcode_media.owner.username'),
  (r) => readFlatOrNested(r, 'graphql.shortcode_media.owner.username'),
  (r) => r.owner?.username,
  (r) => r.owner?.user?.username,
  (r) => r.user?.username,
  (r) => r.username,
  (r) => r['user.username'],
  (r) => r['owner.username'],
];

/** Do not walk into comment arrays — those ownerUsernames are commenters. */
const IG_DEEP_SKIP_KEYS = new Set([
  'latestComments',
  'comments',
  'firstComment',
  'edge_media_to_comment',
  'edge_media_to_parent_comment',
]);

/**
 * Find first nested `ownerUsername` (Apify sometimes nests it under graphql/media).
 */
function findOwnerUsernameDeep(obj, depth = 0) {
  if (!obj || typeof obj !== 'object' || depth > 6) return '';
  if (Object.prototype.hasOwnProperty.call(obj, 'ownerUsername')) {
    const v = obj.ownerUsername;
    const s = String(v ?? '')
      .replace(/^@/, '')
      .trim();
    if (s) return s;
  }
  for (const [k, v] of Object.entries(obj)) {
    if (IG_DEEP_SKIP_KEYS.has(k)) continue;
    if (v && typeof v === 'object') {
      const found = findOwnerUsernameDeep(v, depth + 1);
      if (found) return found;
    }
  }
  return '';
}

/** instagram.com/handle/reel/CODE — newer permalinks include handle in the path */
const IG_RESERVED_FIRST_SEG = new Set([
  'reel',
  'p',
  'tv',
  'stories',
  'explore',
  'accounts',
  'direct',
  'graphql',
  'legal',
  'about',
]);

/**
 * When ownerUsername is missing, Instagram URLs sometimes look like
 * https://www.instagram.com/someuser/reel/ABC123/ (handle is the first path segment).
 */
function extractInstagramUsernameFromUrl(url) {
  if (!url || typeof url !== 'string') return '';
  try {
    const path = new URL(url.trim()).pathname.replace(/\/+$/, '');
    const parts = path.split('/').filter(Boolean);
    if (parts.length >= 3 && (parts[1] === 'reel' || parts[1] === 'p')) {
      const seg = parts[0];
      if (seg && !IG_RESERVED_FIRST_SEG.has(seg.toLowerCase())) {
        return String(seg)
          .replace(/^@/, '')
          .trim();
      }
    }
  } catch (_) {
    /* invalid URL */
  }
  return '';
}

/**
 * Instagram (apify/instagram-scraper): post author is usually ownerUsername on the reel/post item.
 * Skip Comment rows so we don't store a commenter's username as the creator.
 */
function extractInstagramCreator(raw) {
  const t = String(raw.type || raw.__typename || '').toLowerCase();
  if (t === 'comment' || t === 'edge_comment') return '';

  for (const get of IG_CREATOR_FIELD_PATHS) {
    try {
      const c = get(raw);
      const s = String(c ?? '')
        .replace(/^@/, '')
        .trim();
      if (s) return s;
    } catch (_) {
      /* ignore bad getters */
    }
  }

  const fromUrl = extractInstagramUsernameFromUrl(raw.url || raw.inputUrl || raw.webVideoUrl);
  if (fromUrl) return fromUrl;

  const deep = findOwnerUsernameDeep(raw);
  if (deep) return deep;

  return '';
}

/**
 * Normalise TikTok Apify output.
 */
function normaliseTikTok(raw) {
  const creator = extractTikTokCreator(raw);
  return {
    url: raw.webVideoUrl || raw.url || raw.inputUrl || '',
    views: raw.playCount ?? raw.videoPlayCount ?? 0,
    likes: raw.diggCount ?? raw.likesCount ?? 0,
    shares: raw.shareCount ?? raw.sharesCount ?? 0,
    saves: raw.collectCount ?? raw.savedCount ?? 0,
    comments: raw.commentCount ?? raw.commentsCount ?? 0,
    creator,
  };
}

/**
 * Canonical post URL from a raw Apify Instagram item (must match extractVideoId with DB URLs).
 */
function resolveInstagramSourceUrl(raw) {
  let url = raw.url || raw.inputUrl || '';
  const shortCode =
    raw.shortCode ||
    (url ? extractInstagramId(url) : '') ||
    (typeof raw.id === 'string' && /^[A-Za-z0-9_-]+$/.test(raw.id) ? raw.id : '');
  if (!url && shortCode) {
    url = `https://www.instagram.com/reel/${shortCode}/`;
  }
  return url;
}

/**
 * Normalise Instagram Apify output.
 */
function normaliseInstagram(raw) {
  const url = resolveInstagramSourceUrl(raw);
  const creator = extractInstagramCreator(raw);
  return {
    url,
    views: raw.videoPlayCount ?? raw.videoViewCount ?? raw.playCount ?? 0,
    likes: raw.likesCount ?? raw.diggCount ?? 0,
    shares: raw.sharesCount ?? raw.shareCount ?? 0,
    saves: raw.savesCount ?? raw.collectCount ?? 0,
    comments: raw.commentsCount ?? raw.commentCount ?? 0,
    creator,
  };
}

/**
 * Extract a canonical ID from a TikTok URL for fuzzy matching.
 * "https://www.tiktok.com/@user/video/7580355993993841953" → "7580355993993841953"
 */
function extractTikTokId(url) {
  if (!url) return url;
  const match = url.match(/video\/(\d+)/);
  return match ? match[1] : url;
}

/**
 * Extract a shortCode from an Instagram URL for fuzzy matching.
 * Normalised to UPPERCASE so DB keys match Apify when casing differs in URLs.
 */
function extractInstagramId(url) {
  if (!url) return url;
  const match = url.match(/\/(reel|p)\/([A-Za-z0-9_-]+)/i);
  return match ? match[2].toUpperCase() : url;
}

/**
 * Generic ID extractor that picks the right method based on URL content.
 */
function extractVideoId(url) {
  if (!url) return url;
  if (url.includes('instagram.com') || url.includes('instagr.am')) {
    return extractInstagramId(url);
  }
  return extractTikTokId(url);
}

module.exports = {
  scrapeTikTok,
  scrapeInstagram,
  normaliseTikTok,
  normaliseInstagram,
  resolveInstagramSourceUrl,
  extractVideoId,
  extractTikTokCreator,
  extractInstagramCreator,
  /** When Apify omits owner fields, parse handle from instagram.com/{user}/reel/… tracked URLs */
  extractInstagramUsernameFromUrl,
};
