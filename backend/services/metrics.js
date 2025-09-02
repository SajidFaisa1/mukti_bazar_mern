// metrics.js - Prometheus metrics helper
let promClient;
try { promClient = require('prom-client'); } catch (_) {}

const enabled = !!promClient;
let register, Counter, Histogram;
if (enabled) {
  ({ register, Counter, Histogram } = promClient);
  promClient.collectDefaultMetrics({ prefix: 'app_' });
}

const httpRequestsTotal = enabled ? new Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status']
}) : null;

const httpRequestDurationMs = enabled ? new Histogram({
  name: 'http_request_duration_ms',
  help: 'HTTP request duration milliseconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [10, 25, 50, 100, 250, 500, 1000, 2000, 5000]
}) : null;

const productCreatedTotal = enabled ? new Counter({
  name: 'product_created_total',
  help: 'Number of products created'
}) : null;

function recordRequest({ method, route, status, duration }) {
  if (!enabled) return;
  httpRequestsTotal.inc({ method, route, status });
  httpRequestDurationMs.observe({ method, route, status }, duration);
}

function incProductCreated() { if (productCreatedTotal) productCreatedTotal.inc(); }

async function metricsText() {
  if (!enabled) return '# metrics disabled';
  return register.metrics();
}

module.exports = { recordRequest, incProductCreated, metricsText, enabled };
