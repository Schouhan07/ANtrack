const VideoMetric = require('../models/VideoMetric');
const Video = require('../models/Video');
const CreatorOfferMapping = require('../models/CreatorOfferMapping');
const { runScrapeJob } = require('../cron/scraper');

/**
 * Per calendar day: take the latest scrape per video that day, then sum across videos.
 * Avoids summing cumulative view counts multiple times when several scrapes run the same day.
 */
function dailyPortfolioTotalsPipeline(since) {
  return [
    { $match: { scrapedAt: { $gte: since } } },
    { $sort: { scrapedAt: -1 } },
    {
      $group: {
        _id: {
          videoId: '$videoId',
          d: { $dateToString: { format: '%Y-%m-%d', date: '$scrapedAt' } },
        },
        views: { $first: '$views' },
        likes: { $first: '$likes' },
        shares: { $first: '$shares' },
        saves: { $first: '$saves' },
      },
    },
    {
      $group: {
        _id: '$_id.d',
        views: { $sum: '$views' },
        likes: { $sum: '$likes' },
        shares: { $sum: '$shares' },
        saves: { $sum: '$saves' },
      },
    },
    { $sort: { _id: 1 } },
  ];
}

/** Total views / shares should not decrease between scrapes; Apify can return small noise. */
function monotonicCount(current, previous) {
  if (previous == null) return current;
  return Math.max(Number(current) || 0, Number(previous) || 0);
}

/** Dashboard absolute counts (Views, Likes, Shares, Saves) must never be negative. */
function nonNeg(n) {
  return Math.max(0, Number(n) || 0);
}

// GET /api/metrics – all metrics (optionally filtered by videoId)
exports.getMetrics = async (req, res) => {
  try {
    const { videoId, days } = req.query;
    const filter = {};
    if (videoId) filter.videoId = videoId;
    if (days) {
      const since = new Date();
      since.setDate(since.getDate() - Number(days));
      filter.scrapedAt = { $gte: since };
    }

    const metrics = await VideoMetric.find(filter)
      .sort({ scrapedAt: -1 })
      .populate(
        'videoId',
        'url creator campaign platform initiatedBy offerCode sales addedDate status createdBy publishDate influencerName influencerHandle lob videoDuration totalCost'
      );

    res.json(metrics);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/metrics/latest – latest metric per video + previous run + deltas (dashboard table)
exports.getLatestMetrics = async (req, res) => {
  try {
    const rolled = await VideoMetric.aggregate([
      { $sort: { scrapedAt: -1 } },
      {
        $group: {
          _id: '$videoId',
          metrics: {
            $push: {
              views: '$views',
              likes: '$likes',
              shares: '$shares',
              saves: '$saves',
              viral: '$viral',
              scrapedAt: '$scrapedAt',
              metricId: '$_id',
              url: '$url',
            },
          },
        },
      },
      {
        $project: {
          videoId: '$_id',
          current: { $arrayElemAt: ['$metrics', 0] },
          previous: { $arrayElemAt: ['$metrics', 1] },
        },
      },
    ]);

    const videoIds = rolled.map((r) => r.videoId);
    const videos = await Video.find({ _id: { $in: videoIds } }).lean();
    const videoMap = {};
    for (const v of videos) videoMap[v._id.toString()] = v;

    const enriched = rolled.map((r) => {
      const cur = r.current;
      const prev = r.previous;
      let previousPayload = null;
      let delta = null;
      if (prev) {
        previousPayload = {
          views: prev.views,
          likes: prev.likes,
          shares: prev.shares,
          saves: prev.saves || 0,
          scrapedAt: prev.scrapedAt,
        };
        const dv = (Number(cur.views) || 0) - (Number(prev.views) || 0);
        const dsh = (Number(cur.shares) || 0) - (Number(prev.shares) || 0);
        delta = {
          views: Math.max(0, dv),
          likes: cur.likes - prev.likes,
          shares: Math.max(0, dsh),
          saves: (cur.saves || 0) - (prev.saves || 0),
        };
      }
      const displayViews = monotonicCount(cur.views, prev?.views);
      const displayShares = monotonicCount(cur.shares, prev?.shares);
      return {
        _id: r.videoId,
        metricId: cur.metricId,
        url: cur.url,
        views: nonNeg(displayViews),
        likes: nonNeg(cur.likes),
        shares: nonNeg(displayShares),
        saves: nonNeg(cur.saves),
        viral: cur.viral,
        scrapedAt: cur.scrapedAt,
        previous: previousPayload,
        delta,
        video: videoMap[r.videoId?.toString()] || null,
      };
    });

    enriched.sort((a, b) => new Date(b.scrapedAt) - new Date(a.scrapedAt));

    // Drop metric rows whose video was removed (legacy orphans before cascade delete existed)
    const withVideo = enriched.filter((row) => row.video != null);

    res.json(withVideo);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/metrics/campaign-overview
exports.getCampaignOverview = async (req, res) => {
  try {
    const videos = await Video.find({ status: 'active' }).lean();
    const videoIds = videos.map((v) => v._id);

    const latest = await VideoMetric.aggregate([
      { $match: { videoId: { $in: videoIds } } },
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

    const portfolio = await computePortfolioRunComparison();

    const totalVideos = videos.length;

    let totalViews;
    let totalLikes;
    let totalShares;
    let totalSaves;
    let avgEngagementRate;

    if (portfolio.latest && portfolio.latest.views != null) {
      totalViews = portfolio.latest.views;
      totalLikes = portfolio.latest.likes;
      totalShares = portfolio.latest.shares;
      totalSaves = portfolio.latest.saves;
      const comments = portfolio.latest.comments || 0;
      const eng = totalLikes + totalShares + totalSaves + comments;
      avgEngagementRate =
        totalViews > 0 ? ((eng / totalViews) * 100).toFixed(2) : '0.00';
    } else {
      totalViews = latest.reduce((s, m) => s + m.views, 0);
      totalLikes = latest.reduce((s, m) => s + m.likes, 0);
      totalShares = latest.reduce((s, m) => s + m.shares, 0);
      totalSaves = latest.reduce((s, m) => s + m.saves, 0);
      const totalComments = latest.reduce((s, m) => s + (m.comments || 0), 0);
      const totalEngagement = totalLikes + totalShares + totalSaves + totalComments;
      avgEngagementRate =
        totalViews > 0 ? ((totalEngagement / totalViews) * 100).toFixed(2) : 0;
    }

    let topInfluencer = null;
    const videoById = {};
    for (const v of videos) videoById[v._id.toString()] = v;
    const creatorStats = {};
    for (const m of latest) {
      const v = videoById[m._id?.toString()];
      if (!v) continue;
      const c = v.influencerName || v.creator || 'Unknown';
      if (!creatorStats[c]) creatorStats[c] = { views: 0 };
      creatorStats[c].views += m.views;
    }
    const topEntry = Object.entries(creatorStats).sort((a, b) => b[1].views - a[1].views)[0];
    if (topEntry) {
      topInfluencer = { name: topEntry[0], views: topEntry[1].views };
    }

    /** Same basis as Summary / dashboard-kpis: latest vs previous scrape (% change on portfolio views). */
    let wowGrowth = null;
    if (portfolio.pctChange && portfolio.pctChange.views != null && portfolio.pctChange.views !== '') {
      wowGrowth = Number(portfolio.pctChange.views);
    }

    res.json({
      totalVideos,
      totalViews,
      totalLikes,
      totalShares,
      totalSaves,
      avgEngagementRate,
      topInfluencer,
      wowGrowth,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Roll up latest metrics per active video, split by platform (instagram / tiktok / unknown).
 */
exports.getPlatformAnalytics = async (req, res) => {
  try {
    const videos = await Video.find({ status: 'active' }).lean();
    const videoIds = videos.map((v) => v._id);
    const videoById = {};
    for (const v of videos) videoById[v._id.toString()] = v;

    const latest = await VideoMetric.aggregate([
      { $match: { videoId: { $in: videoIds } } },
      { $sort: { scrapedAt: -1 } },
      {
        $group: {
          _id: '$videoId',
          views: { $first: '$views' },
          likes: { $first: '$likes' },
          shares: { $first: '$shares' },
          saves: { $first: '$saves' },
        },
      },
    ]);

    const buckets = {
      instagram: {
        videoCount: 0,
        totalViews: 0,
        totalLikes: 0,
        totalShares: 0,
        totalSaves: 0,
        creatorViews: {},
      },
      tiktok: {
        videoCount: 0,
        totalViews: 0,
        totalLikes: 0,
        totalShares: 0,
        totalSaves: 0,
        creatorViews: {},
      },
      unknown: {
        videoCount: 0,
        totalViews: 0,
        totalLikes: 0,
        totalShares: 0,
        totalSaves: 0,
        creatorViews: {},
      },
    };

    for (const m of latest) {
      const v = videoById[m._id?.toString()];
      if (!v) continue;
      const p = v.platform === 'instagram' ? 'instagram' : v.platform === 'tiktok' ? 'tiktok' : 'unknown';
      const b = buckets[p];
      b.videoCount += 1;
      b.totalViews += m.views || 0;
      b.totalLikes += m.likes || 0;
      b.totalShares += m.shares || 0;
      b.totalSaves += m.saves || 0;
      const c = (v.creator || '').trim() || 'Unknown';
      if (!b.creatorViews[c]) b.creatorViews[c] = 0;
      b.creatorViews[c] += m.views || 0;
    }

    function pack(bucket) {
      const eng = bucket.totalLikes + bucket.totalShares + bucket.totalSaves;
      const avgEngagementRate =
        bucket.totalViews > 0 ? Number(((eng / bucket.totalViews) * 100).toFixed(2)) : 0;
      const top = Object.entries(bucket.creatorViews).sort((a, b) => b[1] - a[1])[0];
      const topCreator = top ? { name: top[0], views: top[1] } : null;
      return {
        videoCount: bucket.videoCount,
        totalViews: bucket.totalViews,
        totalLikes: bucket.totalLikes,
        totalShares: bucket.totalShares,
        totalSaves: bucket.totalSaves,
        avgEngagementRate,
        topCreator,
      };
    }

    res.json({
      instagram: pack(buckets.instagram),
      tiktok: pack(buckets.tiktok),
      unknown: pack(buckets.unknown),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/metrics/weekly-trend – views + engagement by ISO week (for Overview chart)
exports.getWeeklyTrend = async (req, res) => {
  try {
    const weeks = Math.min(Math.max(Number(req.query.weeks) || 8, 4), 12);
    const since = new Date();
    since.setDate(since.getDate() - weeks * 7);

    const raw = await VideoMetric.aggregate([
      { $match: { scrapedAt: { $gte: since } } },
      {
        $group: {
          _id: {
            y: { $isoWeekYear: '$scrapedAt' },
            w: { $isoWeek: '$scrapedAt' },
          },
          views: { $sum: '$views' },
          engagement: {
            $sum: { $add: ['$likes', '$shares', '$saves'] },
          },
        },
      },
      { $sort: { '_id.y': 1, '_id.w': 1 } },
    ]);

    const data = raw.map((row) => ({
      weekKey: `${row._id.y}-W${String(row._id.w).padStart(2, '0')}`,
      label: `W${row._id.w} '${String(row._id.y).slice(-2)}`,
      views: row.views,
      engagement: row.engagement,
    }));

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/metrics/daily-views – time-series for chart
exports.getDailyViews = async (req, res) => {
  try {
    const days = Number(req.query.days) || 30;
    const since = new Date();
    since.setDate(since.getDate() - days);

    const data = await VideoMetric.aggregate([
      ...dailyPortfolioTotalsPipeline(since),
      {
        $project: {
          _id: 1,
          totalViews: '$views',
          totalLikes: '$likes',
          totalShares: '$shares',
          totalSaves: '$saves',
        },
      },
    ]);

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/metrics/daily-breakdown – views, likes, shares, saves per day (for Data Metrics chart)
exports.getDailyBreakdown = async (req, res) => {
  try {
    const days = Math.min(Math.max(Number(req.query.days) || 30, 7), 90);
    const since = new Date();
    since.setDate(since.getDate() - days);

    const data = await VideoMetric.aggregate(dailyPortfolioTotalsPipeline(since));

    const rows = data.map((d) => ({
      date: d._id,
      views: d.views,
      likes: d.likes,
      shares: d.shares,
      saves: d.saves,
      engagement: d.likes + d.shares + d.saves,
    }));

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Portfolio totals: sum of each active video's latest scrape vs second-latest (new run − last run).
 * Only videos with ≥2 metric rows are included so both sums are comparable.
 */
async function computePortfolioRunComparison() {
  const activeVideos = await Video.find({ status: 'active' }).select('_id').lean();
  const ids = activeVideos.map((v) => v._id);
  if (ids.length === 0) {
    return {
      latest: null,
      previous: null,
      pctChange: null,
      videosCompared: 0,
      activeVideos: 0,
    };
  }

  const rolled = await VideoMetric.aggregate([
    { $match: { videoId: { $in: ids } } },
    { $sort: { scrapedAt: -1 } },
    {
      $group: {
        _id: '$videoId',
        metrics: {
          $push: {
            views: '$views',
            likes: '$likes',
            shares: '$shares',
            saves: '$saves',
            comments: { $ifNull: ['$comments', 0] },
            scrapedAt: '$scrapedAt',
          },
        },
      },
    },
    {
      $project: {
        latest: { $arrayElemAt: ['$metrics', 0] },
        previous: { $arrayElemAt: ['$metrics', 1] },
      },
    },
    { $match: { previous: { $ne: null } } },
    {
      $group: {
        _id: null,
        sumLatestViews: { $sum: '$latest.views' },
        sumLatestLikes: { $sum: '$latest.likes' },
        sumLatestShares: { $sum: '$latest.shares' },
        sumLatestSaves: { $sum: '$latest.saves' },
        sumLatestComments: { $sum: '$latest.comments' },
        sumPrevViews: { $sum: '$previous.views' },
        sumPrevLikes: { $sum: '$previous.likes' },
        sumPrevShares: { $sum: '$previous.shares' },
        sumPrevSaves: { $sum: '$previous.saves' },
        sumPrevComments: { $sum: '$previous.comments' },
        maxLatestAt: { $max: '$latest.scrapedAt' },
        maxPrevAt: { $max: '$previous.scrapedAt' },
        videosCompared: { $sum: 1 },
      },
    },
  ]);

  const pctFor = (a, b) => {
    const prev = nonNeg(b);
    if (prev <= 0) return null;
    return (((nonNeg(a) - prev) / prev) * 100).toFixed(1);
  };

  if (!rolled.length) {
    return {
      latest: null,
      previous: null,
      pctChange: null,
      videosCompared: 0,
      activeVideos: ids.length,
    };
  }

  const r = rolled[0];
  const latest = {
    views: nonNeg(r.sumLatestViews),
    likes: nonNeg(r.sumLatestLikes),
    shares: nonNeg(r.sumLatestShares),
    saves: nonNeg(r.sumLatestSaves),
    comments: nonNeg(r.sumLatestComments),
    scrapedAt: r.maxLatestAt,
  };
  const previous = {
    views: nonNeg(r.sumPrevViews),
    likes: nonNeg(r.sumPrevLikes),
    shares: nonNeg(r.sumPrevShares),
    saves: nonNeg(r.sumPrevSaves),
    comments: nonNeg(r.sumPrevComments),
    scrapedAt: r.maxPrevAt,
  };

  return {
    latest,
    previous,
    pctChange: {
      views: pctFor(latest.views, previous.views),
      likes: pctFor(latest.likes, previous.likes),
      shares: pctFor(latest.shares, previous.shares),
      saves: pctFor(latest.saves, previous.saves),
      comments: pctFor(latest.comments, previous.comments),
    },
    videosCompared: r.videosCompared,
    activeVideos: ids.length,
  };
}

exports.getPortfolioRunComparison = async (req, res) => {
  try {
    const data = await computePortfolioRunComparison();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/metrics/dashboard-kpis — hero stats for Dashboard (portfolio growth, costs, sales).
 */
exports.getDashboardKpis = async (req, res) => {
  try {
    const portfolio = await computePortfolioRunComparison();
    const now = new Date();
    const last7 = new Date(now);
    last7.setDate(last7.getDate() - 7);
    const prev7Start = new Date(now);
    prev7Start.setDate(prev7Start.getDate() - 14);

    const [videosNewLast7d, videosNewPrior7d, costRow] = await Promise.all([
      Video.countDocuments({ status: 'active', addedDate: { $gte: last7 } }),
      Video.countDocuments({
        status: 'active',
        addedDate: { $gte: prev7Start, $lt: last7 },
      }),
      Video.aggregate([
        { $match: { status: 'active' } },
        {
          $group: {
            _id: null,
            totalCost: { $sum: { $ifNull: ['$totalCost', 0] } },
            totalSales: { $sum: { $ifNull: ['$sales', 0] } },
            withSales: {
              $sum: {
                $cond: [{ $gt: [{ $ifNull: ['$sales', 0] }, 0] }, 1, 0],
              },
            },
          },
        },
      ]),
    ]);

    const totalCost = costRow[0]?.totalCost ?? 0;
    const transactionsTotal = costRow[0]?.totalSales ?? 0;
    const transactionsVideos = costRow[0]?.withSales ?? 0;

    let payPerView = null;
    let avgEngagementPct = null;
    if (portfolio.latest && portfolio.latest.views > 0) {
      const eng =
        portfolio.latest.likes +
        portfolio.latest.shares +
        portfolio.latest.saves +
        (portfolio.latest.comments || 0);
      avgEngagementPct = ((eng / portfolio.latest.views) * 100).toFixed(2);
      if (totalCost > 0) {
        payPerView = totalCost / portfolio.latest.views;
      }
    }

    res.json({
      totalVideosActive: portfolio.activeVideos,
      videosNewLast7d,
      videosNewPrior7d,
      portfolio,
      avgEngagementPct,
      payPerView,
      totalCost,
      transactionsTotal,
      transactionsVideos,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/metrics/top-creators
exports.getTopCreators = async (req, res) => {
  try {
    const videos = await Video.find({ status: 'active' }).lean();
    const videoMap = {};
    for (const v of videos) videoMap[v._id.toString()] = v;

    const latest = await VideoMetric.aggregate([
      { $sort: { scrapedAt: -1 } },
      {
        $group: {
          _id: '$videoId',
          views: { $first: '$views' },
          likes: { $first: '$likes' },
        },
      },
    ]);

    const creatorStats = {};
    for (const m of latest) {
      const v = videoMap[m._id?.toString()];
      if (!v) continue;
      const c = v.influencerName || v.creator || 'Unknown';
      if (!creatorStats[c]) creatorStats[c] = { views: 0, likes: 0, videos: 0 };
      creatorStats[c].views += m.views;
      creatorStats[c].likes += m.likes;
      creatorStats[c].videos += 1;
    }

    const result = Object.entries(creatorStats)
      .map(([creator, stats]) => ({ creator, ...stats }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/metrics/influencers – per-creator rollup for Creators tab + drill-down
exports.getInfluencerInsights = async (req, res) => {
  try {
    const videos = await Video.find({ status: 'active' }).lean();
    const videoById = {};
    for (const v of videos) videoById[v._id.toString()] = v;

    const latest = await VideoMetric.aggregate([
      { $sort: { scrapedAt: -1 } },
      {
        $group: {
          _id: '$videoId',
          views: { $first: '$views' },
          likes: { $first: '$likes' },
          shares: { $first: '$shares' },
          saves: { $first: '$saves' },
        },
      },
    ]);

    const byCreator = {};
    for (const m of latest) {
      const v = videoById[m._id?.toString()];
      if (!v) continue;
      const raw = (v.creator || '').trim();
      const name = raw || 'Unknown';
      if (!byCreator[name]) {
        byCreator[name] = {
          name,
          videoIds: [],
          videoCount: 0,
          sumViews: 0,
          sumEng: 0,
          campaigns: {},
          offerCodes: new Set(),
          salesSum: 0,
          salesVideoCount: 0,
        };
      }
      const row = byCreator[name];
      row.videoIds.push(m._id);
      row.videoCount += 1;
      row.sumViews += m.views;
      row.sumEng += m.likes + m.shares + m.saves;
      if (v.campaign && String(v.campaign).trim()) {
        const c = v.campaign.trim();
        row.campaigns[c] = (row.campaigns[c] || 0) + 1;
      }
      if (v.offerCode && String(v.offerCode).trim()) {
        row.offerCodes.add(String(v.offerCode).trim());
      }
      if (v.sales != null && !Number.isNaN(Number(v.sales))) {
        row.salesSum += Number(v.sales);
        row.salesVideoCount += 1;
      }
    }

    const last7 = new Date();
    last7.setDate(last7.getDate() - 7);
    const prevStart = new Date();
    prevStart.setDate(prevStart.getDate() - 14);

    const facetResult = await VideoMetric.aggregate([
      {
        $lookup: {
          from: 'videos',
          localField: 'videoId',
          foreignField: '_id',
          as: 'vid',
        },
      },
      { $unwind: '$vid' },
      { $match: { 'vid.status': 'active' } },
      {
        $addFields: {
          creator: {
            $cond: [
              { $eq: [{ $trim: { input: { $ifNull: ['$vid.creator', ''] } } }, ''] },
              'Unknown',
              { $trim: { input: '$vid.creator' } },
            ],
          },
        },
      },
      { $match: { scrapedAt: { $gte: prevStart } } },
      {
        $facet: {
          last7: [
            { $match: { scrapedAt: { $gte: last7 } } },
            { $group: { _id: '$creator', views: { $sum: '$views' } } },
          ],
          prev7: [
            { $match: { scrapedAt: { $gte: prevStart, $lt: last7 } } },
            { $group: { _id: '$creator', views: { $sum: '$views' } } },
          ],
        },
      },
    ]);

    const last7Rows = facetResult[0]?.last7 || [];
    const prev7Rows = facetResult[0]?.prev7 || [];
    const last7Map = Object.fromEntries(last7Rows.map((x) => [x._id, x.views]));
    const prev7Map = Object.fromEntries(prev7Rows.map((x) => [x._id, x.views]));

    const mappingDocs = await CreatorOfferMapping.find().lean();
    const mappingByCreatorLower = new Map();
    for (const mo of mappingDocs) {
      const key = String(mo.creatorName || '').trim().toLowerCase();
      if (!key) continue;
      if (!mappingByCreatorLower.has(key)) {
        mappingByCreatorLower.set(key, {
          codes: new Set(),
          salesSum: 0,
          displayName: String(mo.creatorName).trim(),
        });
      }
      const agg = mappingByCreatorLower.get(key);
      if (!agg.displayName) agg.displayName = String(mo.creatorName).trim();
      agg.codes.add(mo.offerCode);
      if (mo.sales != null && !Number.isNaN(Number(mo.sales))) {
        agg.salesSum += Number(mo.sales);
      }
    }

    const rows = Object.values(byCreator).map((row) => {
      const avgViews =
        row.videoCount > 0 ? Math.round(row.sumViews / row.videoCount) : 0;
      const engagementPct =
        row.sumViews > 0
          ? Number(((row.sumEng / row.sumViews) * 100).toFixed(2))
          : 0;
      const topCampaign =
        Object.entries(row.campaigns).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

      const recent7 = last7Map[row.name] || 0;
      const prev7 = prev7Map[row.name] || 0;
      let engagementTrend = '→ Steady';
      if (prev7 === 0 && recent7 === 0) engagementTrend = '→ Steady (limited scrape data)';
      else if (prev7 === 0 && recent7 > 0) engagementTrend = '↑ Improving';
      else if (prev7 > 0) {
        const ch = ((recent7 - prev7) / prev7) * 100;
        if (ch > 8) engagementTrend = '↑ Improving';
        else if (ch < -8) engagementTrend = '↓ Cooling';
      }

      const mk = mappingByCreatorLower.get(row.name.trim().toLowerCase());
      if (mk) {
        for (const c of mk.codes) row.offerCodes.add(c);
      }

      const offerCodesStr =
        row.offerCodes && row.offerCodes.size > 0
          ? [...row.offerCodes].sort().join(', ')
          : null;

      const fromVideos = row.salesVideoCount > 0 ? row.salesSum : 0;
      const fromMaps = mk ? mk.salesSum : 0;
      const salesMerged =
        row.salesVideoCount > 0 || fromMaps > 0 ? fromVideos + fromMaps : null;

      return {
        name: row.name,
        videoCount: row.videoCount,
        avgViews,
        engagementPct,
        recentViews7d: recent7,
        prevViews7d: prev7,
        topCampaign,
        engagementTrend,
        offerCodes: offerCodesStr,
        sales: salesMerged,
      };
    });

    const seenNames = new Set(rows.map((r) => r.name.trim().toLowerCase()));
    for (const [lower, mk] of mappingByCreatorLower) {
      if (seenNames.has(lower)) continue;
      seenNames.add(lower);
      const offerCodesOnly = [...mk.codes].sort().join(', ');
      const fromMaps = mk.salesSum;
      rows.push({
        name: mk.displayName || lower,
        videoCount: 0,
        avgViews: 0,
        engagementPct: 0,
        recentViews7d: 0,
        prevViews7d: 0,
        topCampaign: null,
        engagementTrend: '→ Steady (no scrape data yet)',
        offerCodes: offerCodesOnly || null,
        sales: fromMaps > 0 ? fromMaps : null,
      });
    }

    const assignTiers = (list) => {
      if (list.length === 0) return;
      if (list.length < 3) {
        for (const r of list) {
          if (r.engagementPct >= 3 && r.avgViews >= 3000) {
            r.tier = 'scale';
            r.recommendationLabel = 'Scale Aggressively';
          } else if (r.engagementPct < 1.5 || r.avgViews < 500) {
            r.tier = 'avoid';
            r.recommendationLabel = 'Avoid';
          } else {
            r.tier = 'test';
            r.recommendationLabel = 'Test More';
          }
        }
        return;
      }
      const engSorted = [...list].map((x) => x.engagementPct).sort((a, b) => a - b);
      const avgSorted = [...list].map((x) => x.avgViews).sort((a, b) => a - b);
      const midE = engSorted[Math.floor((engSorted.length - 1) / 2)];
      const midV = avgSorted[Math.floor((avgSorted.length - 1) / 2)];
      for (const r of list) {
        const highE = r.engagementPct >= midE;
        const highV = r.avgViews >= midV;
        if (highE && highV && r.engagementPct >= 2) {
          r.tier = 'scale';
          r.recommendationLabel = 'Scale Aggressively';
        } else if (!highE && !highV && (r.engagementPct < 2 || r.avgViews < midV * 0.45)) {
          r.tier = 'avoid';
          r.recommendationLabel = 'Avoid';
        } else {
          r.tier = 'test';
          r.recommendationLabel = 'Test More';
        }
      }
    };

    assignTiers(rows);

    const copy = {
      scale: {
        insight:
          'Strong reach and engagement vs the rest of your roster — content is landing with viewers.',
        action: 'Increase collaborations and prioritize budget behind this creator.',
      },
      test: {
        insight:
          'Mixed signals — worth testing more hooks and formats before scaling spend.',
        action: 'Try A/B hooks and CTAs; re-check after the next scrape cycle.',
      },
      avoid: {
        insight: 'Below benchmark on views or engagement — limited upside vs effort.',
        action: 'Pause paid tests unless this creator fills a strategic niche.',
      },
    };

    const result = rows
      .map((r) => ({
        ...r,
        category: r.topCampaign || '—',
        audience: '— (Gemini)',
        insight: copy[r.tier].insight,
        action: copy[r.tier].action,
      }))
      .sort((a, b) => {
        const order = { scale: 0, test: 1, avoid: 2 };
        if (order[a.tier] !== order[b.tier]) return order[a.tier] - order[b.tier];
        return b.avgViews - a.avgViews;
      });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/metrics/scrape-now – trigger manual scrape
exports.scrapeNow = async (req, res) => {
  try {
    const result = await runScrapeJob();
    res.json({ message: 'Scrape completed', ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
