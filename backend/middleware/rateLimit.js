// Simple in-memory fixed window rate limiter (per key)
// Not for production scale; can be swapped with Redis later.

const windows = new Map(); // key -> { count, windowStart }

function rateLimit({ windowMs, max, keyGenerator, onLimit }) {
  return (req, res, next) => {
    const now = Date.now();
    const key = keyGenerator ? keyGenerator(req) : req.ip;
    let entry = windows.get(key);
    if (!entry || now - entry.windowStart >= windowMs) {
      entry = { count: 0, windowStart: now };
      windows.set(key, entry);
    }
    entry.count += 1;
    if (entry.count > max) {
      if (onLimit) onLimit(req, key, entry);
      res.setHeader('Retry-After', Math.ceil((entry.windowStart + windowMs - now)/1000));
      return res.status(429).json({ error: 'Too Many Requests' });
    }
    // Expose remaining
    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, max - entry.count)));
    res.setHeader('X-RateLimit-Reset', String(entry.windowStart + windowMs));
    next();
  };
}

module.exports = { rateLimit };
