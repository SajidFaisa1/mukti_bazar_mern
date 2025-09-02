// riskScoringService.js - centralized basic risk scoring rules
// Can be extended later with ML or external signals.

function scoreOrderContext({ total, subtotal, itemCount, quantityTotal, userOrderCount24h, deviceReuse, ipReuseUsers, flags, velocitySnapshot, negotiated, watchlistHits }) {
  let score = 0;
  const reasons = [];

  // Thresholds aligned with detectFraud (lower) so UI reasons appear consistently
  if (total > 20000) { score += 15; reasons.push('HIGH_VALUE'); }
  if (total > 50000) { score += 25; reasons.push('VERY_HIGH_VALUE'); }
  if (total > 100000) { score += 40; reasons.push('EXTREME_VALUE'); }
  if (quantityTotal > 50) { score += 15; reasons.push('BULK_QTY'); }
  if (quantityTotal > 100) { score += 25; reasons.push('BULK_QTY_HEAVY'); }
  if (userOrderCount24h > 2) { score += 15; reasons.push('MULTI_ORDERS_24H'); }
  if (userOrderCount24h > 5) { score += 30; reasons.push('RAPID_ORDERS_24H'); }
  if (deviceReuse && deviceReuse.userCount > 2) { score += 20; reasons.push('DEVICE_REUSE'); }
  if (deviceReuse && deviceReuse.userCount > 5) { score += 40; reasons.push('DEVICE_REUSE_HIGH'); }
  if (ipReuseUsers && ipReuseUsers > 3) { score += 15; reasons.push('IP_SHARED'); }

  if (flags && flags.length) {
    const highSev = flags.filter(f => ['high','critical'].includes(f.severity));
    const medSev = flags.filter(f => f.severity === 'medium');
    if (highSev.length) { score += 35; reasons.push('SEVERE_FLAGS'); }
    if (!highSev.length && medSev.length) { score += 15; reasons.push('MEDIUM_FLAGS'); }
    // Normalize each flag type into reasons for filtering
    flags.forEach(f => reasons.push(f.type.toUpperCase()));
  }

  // Velocity snapshot adjustments (if provided at order creation)
  if (velocitySnapshot) {
    const { last5m = 0, last1h = 0, last6h = 0 } = velocitySnapshot;
    if (last5m > 1) { score += 15; reasons.push('VELOCITY_5M'); }
    if (last1h > 3) { score += 15; reasons.push('VELOCITY_1H'); }
    if (last6h > 5) { score += 10; reasons.push('VELOCITY_6H'); }
  }

  // Negotiated discount impact: very high discount can indicate anomaly OR beneficial negotiation.
  if (negotiated && negotiated.isNegotiated && negotiated.deltaPct != null) {
    const d = negotiated.deltaPct;
    if (d >= 30 && d < 50) { score += 10; reasons.push('NEGOTIATED_LARGE_DISCOUNT'); }
    else if (d >= 50) { score += 20; reasons.push('NEGOTIATED_EXTREME_DISCOUNT'); }
    // Synergistic effect: large discount AND high short-window velocity => escalate
    if (d >= 30 && velocitySnapshot && velocitySnapshot.last1h > 3) {
      score += 15; reasons.push('DISCOUNT_VELOCITY_SYNERGY');
    }
  }

  // Watchlist impact
  if (watchlistHits) {
    if (watchlistHits.uid) { score += 30; reasons.push('WATCHLIST_UID'); }
    if (watchlistHits.vendor) { score += 25; reasons.push('WATCHLIST_VENDOR'); }
    if (watchlistHits.device) { score += 20; reasons.push('WATCHLIST_DEVICE'); }
    if (watchlistHits.ip) { score += 15; reasons.push('WATCHLIST_IP'); }
  }

  const riskLevel = score < 30 ? 'low' : score < 60 ? 'medium' : score < 90 ? 'high' : 'critical';
  return { score, riskLevel, reasons: Array.from(new Set(reasons)) };
}

module.exports = { scoreOrderContext };
