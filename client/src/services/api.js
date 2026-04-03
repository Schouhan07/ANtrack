import axios from 'axios';

/** Same-origin deploy: leave unset. Split deploy: set to API origin, e.g. https://api.example.com (no trailing slash) */
const raw = process.env.REACT_APP_API_URL || '';
const origin = String(raw).replace(/\/$/, '');
const baseURL = origin ? `${origin}/api` : '/api';

const API = axios.create({ baseURL });

// ── Videos ──────────────────────────────────────
export const fetchVideos = (params) => API.get('/videos', { params });
export const fetchVideoById = (id) => API.get(`/videos/${id}`);
export const addVideo = (data) => API.post('/videos', data);
/** Pass an array of URL entries, or { urls, initiatedBy?: 'brand'|'supply' } */
export const addBulkVideos = (payload) =>
  API.post(
    '/videos/bulk',
    Array.isArray(payload) ? { urls: payload } : payload
  );
export const deleteVideo = (id) => API.delete(`/videos/${id}`);
export const updateVideoStatus = (id, status) =>
  API.patch(`/videos/${id}/status`, { status });
export const updateVideo = (id, data) => API.patch(`/videos/${id}`, data);

// ── Metrics ─────────────────────────────────────
export const fetchLatestMetrics = () => API.get('/metrics/latest');
export const fetchMetricsByVideo = (videoId, days) =>
  API.get('/metrics', { params: { videoId, days } });
export const fetchCampaignOverview = () => API.get('/metrics/campaign-overview');
export const fetchPlatformAnalytics = () => API.get('/metrics/platform-analytics');
export const fetchWeeklyTrend = (weeks) =>
  API.get('/metrics/weekly-trend', { params: weeks ? { weeks } : {} });
export const fetchDailyViews = (days) =>
  API.get('/metrics/daily-views', { params: { days } });
export const fetchDailyBreakdown = (days) =>
  API.get('/metrics/daily-breakdown', { params: days ? { days } : {} });
/** Latest vs previous scrape totals (active videos with 2+ scrapes each) */
export const fetchPortfolioRunComparison = () =>
  API.get('/metrics/portfolio-run-comparison');
export const fetchDashboardKpis = () => API.get('/metrics/dashboard-kpis');
export const fetchTopCreators = () => API.get('/metrics/top-creators');
export const fetchInfluencerInsights = () => API.get('/metrics/influencers');
export const triggerScrape = () => API.post('/metrics/scrape-now');

// ── Upload ──────────────────────────────────────
export const uploadExcel = (file) => {
  const form = new FormData();
  form.append('file', file);
  return API.post('/upload/excel', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};
export const importGoogleSheet = (sheetUrl) =>
  API.post('/upload/google-sheet', { sheetUrl });

// ── Campaigns ───────────────────────────────────
export const fetchCampaigns = (params) => API.get('/campaigns', { params });
export const fetchCampaignSummary = (params) => API.get('/campaigns/summary', { params });
export const fetchInfluencerNames = () => API.get('/campaigns/influencers');
export const createCampaign = (data) => API.post('/campaigns', data);
export const updateCampaign = (id, data) => API.put(`/campaigns/${id}`, data);
export const deleteCampaign = (id) => API.delete(`/campaigns/${id}`);

// ── Creator offer mappings (Influencer tab) ─────────────────────
export const fetchCreatorOfferMappings = () => API.get('/creator-offers');
export const fetchCreatorNamesForOffers = () => API.get('/creator-offers/creators');
export const createCreatorOfferMapping = (data) => API.post('/creator-offers', data);
export const updateCreatorOfferMapping = (id, data) => API.patch(`/creator-offers/${id}`, data);
export const deleteCreatorOfferMapping = (id) => API.delete(`/creator-offers/${id}`);
