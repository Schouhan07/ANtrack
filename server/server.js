require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const { apiErrorHandler } = require('./middleware/apiErrorHandler');
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
const applicationController = require('./controllers/applicationController');
const { listTenants } = require('./config/tenants');
const { authenticate, requireSuperAdmin } = require('./middleware/auth');
const { resolveTenant } = require('./middleware/tenant');

// API catalog (list all routes) — register before other /api mounts
app.get('/api', debugController.getApiCatalog);

app.get('/api/tenants', (_req, res) => {
  res.json({ tenants: listTenants() });
});

app.post('/api/access-requests', applicationController.submitAccessRequest);

app.use('/api/auth', require('./routes/authRoutes'));

const scoped = [authenticate, resolveTenant];
app.use('/api/debug', authenticate, requireSuperAdmin, require('./routes/debugRoutes'));
app.use('/api/videos', scoped, require('./routes/videoRoutes'));
app.use('/api/metrics', scoped, require('./routes/metricRoutes'));
app.use('/api/upload', scoped, require('./routes/uploadRoutes'));
app.use('/api/campaigns', scoped, require('./routes/campaignRoutes'));
app.use('/api/creator-offers', scoped, require('./routes/creatorOfferRoutes'));
app.use('/api/insights', scoped, require('./routes/insightsRoutes'));

app.use('/api/admin', authenticate, requireSuperAdmin, require('./routes/adminRoutes'));

// Health check (503 when DB not connected — for load balancers / k8s probes)
app.get('/api/health', (_req, res) => {
  const dbOk = mongoose.connection.readyState === 1;
  res.status(dbOk ? 200 : 503).json({
    status: dbOk ? 'ok' : 'degraded',
    time: new Date().toISOString(),
    database: dbOk ? 'connected' : 'disconnected',
  });
});

app.use(apiErrorHandler);

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
