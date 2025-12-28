const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Add no-cache headers for all responses (helps with Cloudflare)
  app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    next();
  });

  // Proxy API calls to backend
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:8041',
      changeOrigin: true,
    })
  );
  
  // Proxy auth calls to backend
  app.use(
    '/auth',
    createProxyMiddleware({
      target: 'http://localhost:8041',
      changeOrigin: true,
    })
  );
};