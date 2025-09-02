// Central structured logger (pino). Falls back to console if pino not installed yet.
let pino;
try { pino = require('pino'); } catch (_) { /* optional dependency */ }

const level = process.env.LOG_LEVEL || 'info';

const base = { service: 'backend-api' };

const logger = pino ? pino({ level, redact: ['req.headers.authorization', 'password', 'token'] }, pino.transport ? undefined : undefined) : {
  info: console.log,
  error: console.error,
  warn: console.warn,
  debug: console.debug,
  child() { return this; }
};

module.exports = logger;
