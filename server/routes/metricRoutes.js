const express = require('express');
const router = express.Router();
const {
  getMetrics,
  getLatestMetrics,
  getCampaignOverview,
  getPlatformAnalytics,
  getWeeklyTrend,
  getDailyViews,
  getDailyBreakdown,
  getPortfolioRunComparison,
  getTopCreators,
  getInfluencerInsights,
  scrapeNow,
} = require('../controllers/metricController');

router.get('/', getMetrics);
router.get('/latest', getLatestMetrics);
router.get('/campaign-overview', getCampaignOverview);
router.get('/platform-analytics', getPlatformAnalytics);
router.get('/weekly-trend', getWeeklyTrend);
router.get('/daily-views', getDailyViews);
router.get('/daily-breakdown', getDailyBreakdown);
router.get('/portfolio-run-comparison', getPortfolioRunComparison);
router.get('/top-creators', getTopCreators);
router.get('/influencers', getInfluencerInsights);
router.post('/scrape-now', scrapeNow);

module.exports = router;
