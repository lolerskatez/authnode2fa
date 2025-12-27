const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
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