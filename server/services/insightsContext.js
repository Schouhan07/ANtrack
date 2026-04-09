const Video = require('../models/Video');
const VideoMetric = require('../models/VideoMetric');
const { computePortfolioRunComparison } = require('../controllers/metricController');

/**
 * Compact, factual snapshot for Gemini — no PII beyond creator names already in DB.
 */
async function buildInsightsContext() {
  const videos = await Video.find({ status: 'active' }).lean();
  const videoById = {};
  for (const v of videos) videoById[v._id.toString()] = v;

  const latest = await VideoMetric.aggregate([
    { $match: { videoId: { $in: videos.map((x) => x._id) } } },
    { $sort: { scrapedAt: -1 } },
    {
      $group: {
        _id: '$videoId',
        views: { $first: '$views' },
        likes: { $first: '$likes' },
        shares: { $first: '$shares' },
        saves: { $first: '$saves' },
        comments: { $first: { $ifNull: ['$comments', 0] } },
      },
    },
  ]);

  const buckets = {
    instagram: { videoCount: 0, totalViews: 0, eng: 0 },
    tiktok: { videoCount: 0, totalViews: 0, eng: 0 },
    unknown: { videoCount: 0, totalViews: 0, eng: 0 },
  };

  const creatorStats = {};
  for (const m of latest) {
    const v = videoById[m._id?.toString()];
    if (!v) continue;
    const p =
      v.platform === 'instagram'
        ? 'instagram'
        : v.platform === 'tiktok'
          ? 'tiktok'
          : 'unknown';
    const b = buckets[p];
    b.videoCount += 1;
    const views = m.views || 0;
    b.totalViews += views;
    const eng = (m.likes || 0) + (m.shares || 0) + (m.saves || 0) + (m.comments || 0);
    b.eng += eng;

    const c = (v.creator || '').trim() || 'Unknown';
    if (!creatorStats[c]) {
      creatorStats[c] = { views: 0, likes: 0, shares: 0, saves: 0, videos: 0 };
    }
    creatorStats[c].views += views;
    creatorStats[c].likes += m.likes || 0;
    creatorStats[c].shares += m.shares || 0;
    creatorStats[c].saves += m.saves || 0;
    creatorStats[c].videos += 1;
  }

  const topCreators = Object.entries(creatorStats)
    .map(([name, s]) => ({
      name,
      totalViews: s.views,
      videoCount: s.videos,
      engagementRatePct:
        s.views > 0
          ? Number((((s.likes + s.shares + s.saves) / s.views) * 100).toFixed(2))
          : 0,
    }))
    .sort((a, b) => b.totalViews - a.totalViews)
    .slice(0, 8);

  const portfolio = await computePortfolioRunComparison();

  let totalCost = 0;
  let videosWithCost = 0;
  for (const v of videos) {
    const c = v.totalCost;
    if (c != null && !Number.isNaN(Number(c)) && Number(c) > 0) {
      totalCost += Number(c);
      videosWithCost += 1;
    }
  }

  const pack = (key, b) => ({
    platform: key,
    videoCount: b.videoCount,
    totalViews: b.totalViews,
    avgEngagementRatePct:
      b.totalViews > 0 ? Number(((b.eng / b.totalViews) * 100).toFixed(2)) : 0,
  });

  return {
    generatedAt: new Date().toISOString(),
    activeVideoCount: videos.length,
    metricRowsCount: latest.length,
    portfolioComparison: portfolio.latest
      ? {
          latestViews: portfolio.latest.views,
          latestEngagementActions:
            portfolio.latest.likes +
            portfolio.latest.shares +
            portfolio.latest.saves +
            (portfolio.latest.comments || 0),
          portfolioEngagementRatePct:
            portfolio.latest.views > 0
              ? Number(
                  (
                    ((portfolio.latest.likes +
                      portfolio.latest.shares +
                      portfolio.latest.saves +
                      (portfolio.latest.comments || 0)) /
                      portfolio.latest.views) *
                    100
                  ).toFixed(2)
                )
              : 0,
          viewsGrowthPctVsPrior: portfolio.pctChange?.views ?? null,
          videosComparedForGrowth: portfolio.videosCompared,
        }
      : null,
    platforms: {
      instagram: pack('instagram', buckets.instagram),
      tiktok: pack('tiktok', buckets.tiktok),
      unknown: pack('unknown', buckets.unknown),
    },
    topCreatorsByViews: topCreators,
    costSummary: {
      totalCostRecorded: totalCost,
      videosWithCostField: videosWithCost,
    },
  };
}

module.exports = { buildInsightsContext };
