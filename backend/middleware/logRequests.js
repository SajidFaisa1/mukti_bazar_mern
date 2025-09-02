const logger = require('../services/logger');

module.exports = function logRequests(req, res, next) {
  const start = Date.now();
  const { method, url } = req;
  const reqId = req.requestId;
  logger.info({ msg: 'request:start', method, url, reqId });
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({ msg: 'request:finish', method, url, status: res.statusCode, ms: duration, reqId });
  });
  next();
};
