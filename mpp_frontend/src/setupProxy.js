// TEMPORARY — local verification scaffold for the folder feature. Proxies API/media
// to the one-off backend on :8000 so the CRA dev server can reach it single-origin.
// Safe to delete; not part of the feature.
const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
  const target = 'http://localhost:8000';
  app.use(['/api', '/media', '/api-auth'], createProxyMiddleware({ target, changeOrigin: false }));
};
