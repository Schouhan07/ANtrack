const multer = require('multer');

/**
 * JSON errors for /api/* (multer file limits, filter errors, generic 5xx in production).
 */
function apiErrorHandler(err, req, res, next) {
  const path = String(req.originalUrl || req.url || '');
  if (!path.startsWith('/api')) {
    return next(err);
  }

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large (max 5 MB)' });
    }
    return res.status(400).json({ error: err.message });
  }

  const msg = err && err.message ? String(err.message) : 'Error';
  if (msg.includes('Only .xlsx') || msg.includes('.xls') || msg.includes('.csv')) {
    return res.status(400).json({ error: msg });
  }

  const status = err.statusCode || err.status || 500;
  const safeBody =
    process.env.NODE_ENV === 'production' && status >= 500 ? 'Internal server error' : msg;
  if (status >= 500) {
    console.error('[api]', req.method, path, err);
  }
  res.status(status).json({ error: safeBody });
}

module.exports = { apiErrorHandler };
