const Feedback = require('../models/Feedback');
const Vendor = require('../models/Vendor');

// Simple in-memory debounce cache (per process). For clustered deployments, replace with Redis.
const pending = new Map();
const DEBOUNCE_MS = 2000;

async function runAggregate(vendorId) {
  try {
    const vendAgg = await Feedback.aggregate([
      { $match: { vendorId, moderationStatus: 'visible' } },
      { $group: { _id: '$vendorId', avg: { $avg: '$rating' }, count: { $sum: 1 } } }
    ]);
    if (vendAgg[0]) {
      await Vendor.findByIdAndUpdate(vendorId, {
        storeRatingAvg: +vendAgg[0].avg.toFixed(2),
        storeRatingCount: vendAgg[0].count
      });
    } else {
      await Vendor.findByIdAndUpdate(vendorId, {
        storeRatingAvg: 0,
        storeRatingCount: 0
      });
    }
  } catch (e) {
    console.error('Vendor aggregate update failed', e);
  }
}

function scheduleVendorAggregate(vendorId) {
  const key = String(vendorId);
  if (pending.has(key)) clearTimeout(pending.get(key));
  const t = setTimeout(()=> {
    pending.delete(key);
    runAggregate(vendorId);
  }, DEBOUNCE_MS);
  pending.set(key, t);
}

module.exports = { scheduleVendorAggregate };
