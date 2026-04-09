require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const { startCronJob } = require('./cron/scraper');

const app = express();

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

const corsOrigin = process.env.CLIENT_ORIGIN;
app.use(
  cors(
    corsOrigin
      ? { origin: corsOrigin, credentials: true }
      : { origin: true, credentials: true }
  )
);
app.use(express.json({ limit: '10mb' }));

const debugController = require('./controllers/debugController');

// API catalog (list all routes) — register before other /api mounts
app.get('/api', debugController.getApiCatalog);

// Routes
app.use('/api/debug', require('./routes/debugRoutes'));
app.use('/api/videos', require('./routes/videoRoutes'));
app.use('/api/metrics', require('./routes/metricRoutes'));
app.use('/api/upload', require('./routes/uploadRoutes'));
app.use('/api/campaigns', require('./routes/campaignRoutes'));
app.use('/api/creator-offers', require('./routes/creatorOfferRoutes'));
app.use('/api/insights', require('./routes/insightsRoutes'));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Production: serve Create React App build (same origin as /api)
const clientBuildDir = path.join(__dirname, '../client/build');
const clientIndexHtml = path.join(clientBuildDir, 'index.html');
if (fs.existsSync(clientIndexHtml)) {
  app.use(express.static(clientBuildDir));
  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    if (req.path.startsWith('/api')) return next();
    res.sendFile(clientIndexHtml);
  });
} else {
  console.warn(
    '[server] No ../client/build/index.html — API only. Build the client: cd client && npm run build'
  );
}

// Start
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    startCronJob();
  });
});
