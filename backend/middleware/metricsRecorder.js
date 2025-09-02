const { recordRequest } = require('../services/metrics');

module.exports = function metricsRecorder(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    // Use baseUrl + route.path when available, else fallback to originalUrl path part
    let route = req.baseUrl || '';
    if (req.route && req.route.path) route += req.route.path; else route = req.originalUrl.split('?')[0];
    recordRequest({ method: req.method, route, status: String(res.statusCode), duration });
  });
  next();
};
