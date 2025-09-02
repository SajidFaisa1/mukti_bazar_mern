// Simple request ID middleware to tag each request for logging correlation
const { randomUUID } = require('crypto');

module.exports = function requestId(req, res, next) {
  const incoming = req.headers['x-request-id'];
  const id = typeof incoming === 'string' && incoming.trim() ? incoming.trim() : randomUUID();
  req.requestId = id;
  res.setHeader('x-request-id', id);
  next();
};
