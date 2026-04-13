const { createProxyMiddleware } = require('http-proxy-middleware');

/**
 * Proxies /api → Express during `npm start` (port 5000 by default).
 * Restart the dev server after adding this file.
 */
module.exports = function proxy(app) {
  const target =
    process.env.REACT_APP_PROXY_TARGET || process.env.PROXY_TARGET || 'http://127.0.0.1:5000';
  app.use(
    '/api',
    createProxyMiddleware({
      target,
      changeOrigin: true,
    })
  );
};
