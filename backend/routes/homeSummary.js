const express = require('express');
const Product = require('../models/Product');
const Vendor = require('../models/Vendor');
const Negotiation = require('../models/Negotiation');
let Feedback;
try { Feedback = require('../models/Feedback'); } catch (_) { Feedback = null; }
let Order;
try {
  Order = require('../models/Order');
} catch (_) {
  // Order model optional; activity ticker will omit orders if unavailable
  Order = null;
}
const router = express.Router();

// GET /api/home/summary
// Aggregated lightweight data for homepage rails
router.get('/summary', async (req, res) => {
  try {
    // Parallel basic queries
    const now = new Date();
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Trending products (by soldQty desc then recent)
    const trendingProductsPromise = Product.find({ isApproved: true, isDeleted: false })
      .sort({ soldQty: -1, createdAt: -1 })
      .limit(8)
      .select('name images unitPrice offerPrice soldQty category businessName createdAt');

    // Vendor spotlight (highest trustScore + approved)
    const vendorSpotlightPromise = Vendor.find({ isActive: true, isApproved: true })
      .sort({ trustScore: -1, createdAt: 1 })
      .limit(5)
      .select('businessName sellerName description trustScore certifications createdAt storeId address');

    // Negotiation stats aggregated
    const negotiationActiveCountPromise = Negotiation.countDocuments({ status: 'active', isActive: true, expiresAt: { $gt: now } });
    const negotiationAcceptedLast24hPromise = Negotiation.find({ status: 'accepted', acceptedAt: { $gte: last24h } })
      .select('originalPrice finalPrice finalTotalAmount productName productId acceptedAt createdAt');

    // Top negotiated product (last 24h any status)
    const topNegotiatedProductAggPromise = Negotiation.aggregate([
      { $match: { createdAt: { $gte: last24h } } },
      { $group: { _id: '$productId', count: { $sum: 1 }, name: { $first: '$productName' } } },
      { $sort: { count: -1 } },
      { $limit: 1 }
    ]);

    // Recent orders & vendors for activity (fetched in parallel if Order available)
    const recentOrdersPromise = Order ? Order.find({ orderedAt: { $gte: last24h } })
      .sort({ orderedAt: -1 })
      .limit(10)
      .select('orderNumber total orderedAt createdAt') : Promise.resolve([]);

    const recentVendorsPromise = Vendor.find({ createdAt: { $gte: last24h }, isApproved: true })
      .sort({ createdAt: -1 })
      .limit(8)
      .select('businessName createdAt');

    // Ratings distribution & testimonials (best effort, not blocking)
    const ratingsDistributionPromise = Feedback ? Feedback.aggregate([
      { $match: { moderationStatus: 'visible' } },
      { $group: { _id: '$rating', count: { $sum: 1 } } }
    ]) : Promise.resolve([]);
    const testimonialsPromise = Feedback ? Feedback.find({ moderationStatus: 'visible', comment: { $exists: true, $ne: '' } })
      .sort({ helpfulVotes: -1, createdAt: -1 })
      .limit(6)
      .select('rating comment createdAt') : Promise.resolve([]);

    const [trendingProducts, vendors, activeCount, acceptedList, topNegotiatedAgg, recentOrders, recentVendors, ratingsDistributionRows, testimonialsSample] = await Promise.all([
      trendingProductsPromise,
      vendorSpotlightPromise,
      negotiationActiveCountPromise,
      negotiationAcceptedLast24hPromise,
      topNegotiatedProductAggPromise,
      recentOrdersPromise,
      recentVendorsPromise,
      ratingsDistributionPromise,
      testimonialsPromise
    ]);

    // Pick one spotlight vendor (shuffle simple)
    let vendorSpotlight = null;
    if (vendors.length) {
      vendorSpotlight = vendors[Math.floor(Math.random() * vendors.length)];
    }

    // Negotiation stats calculations
    let totalDiscountPct = 0;
    let discountSamples = 0;
    let totalSavings = 0;
    acceptedList.forEach(n => {
      if (n.originalPrice && n.finalPrice && n.originalPrice > 0) {
        const pct = ((n.originalPrice - n.finalPrice) / n.originalPrice) * 100;
        totalDiscountPct += pct;
        discountSamples += 1;
        totalSavings += (n.originalPrice - n.finalPrice) * (n.finalTotalAmount && n.finalPrice ? (n.finalTotalAmount / n.finalPrice) : 1);
      }
    });

    const negotiationStats = {
      activeCount,
      acceptedLast24h: acceptedList.length,
      avgDiscountPercent: discountSamples ? +(totalDiscountPct / discountSamples).toFixed(2) : 0,
      totalSavingsLast24h: +totalSavings.toFixed(2),
      topNegotiatedProduct: topNegotiatedAgg[0] ? {
        productId: topNegotiatedAgg[0]._id,
        name: topNegotiatedAgg[0].name,
        count: topNegotiatedAgg[0].count
      } : null
    };

    // Negotiation highlight (largest discount & fastest acceptance)
    let largestDiscount = null; // { productId, name, discountValue, discountPercent }
    let fastestDeal = null; // { productId, name, minutesToAccept }
    acceptedList.forEach(n => {
      if (n.originalPrice && n.finalPrice && n.originalPrice > 0) {
        const discountValue = n.originalPrice - n.finalPrice;
        const discountPercent = (discountValue / n.originalPrice) * 100;
        if (!largestDiscount || discountValue > largestDiscount.discountValue) {
          largestDiscount = {
            productId: n.productId,
            name: n.productName,
            discountValue: +discountValue.toFixed(2),
            discountPercent: +discountPercent.toFixed(2)
          };
        }
      }
      if (n.createdAt && n.acceptedAt) {
        const minutesToAccept = (n.acceptedAt - n.createdAt) / 60000;
        if (minutesToAccept >= 0 && (!fastestDeal || minutesToAccept < fastestDeal.minutesToAccept)) {
          fastestDeal = {
            productId: n.productId,
            name: n.productName,
            minutesToAccept: +minutesToAccept.toFixed(1)
          };
        }
      }
    });

    const negotiationHighlight = {
      largestDiscount,
      fastestDeal,
      sampleSize: acceptedList.length
    };

    // Live activity ticker entries (orders, new vendors, accepted deals)
    const activity = [];
    recentOrders.forEach(o => {
      activity.push({
        type: 'order',
        ts: o.orderedAt || o.createdAt,
        message: `Order ${o.orderNumber} placed (৳${o.total?.toFixed ? o.total.toFixed(2) : o.total})`
      });
    });
    recentVendors.forEach(v => {
      activity.push({
        type: 'vendor',
        ts: v.createdAt,
        message: `New vendor joined: ${v.businessName}`
      });
    });
    acceptedList.forEach(n => {
      activity.push({
        type: 'deal',
        ts: n.acceptedAt,
        message: `Deal accepted on ${n.productName}`
      });
    });
    activity.sort((a,b) => new Date(b.ts) - new Date(a.ts));
    const activityTrimmed = activity.slice(0, 20).map(a => ({ ...a, ts: a.ts ? new Date(a.ts).toISOString() : null }));

    // Build ratings distribution object
    const ratingsDistribution = { 1:0,2:0,3:0,4:0,5:0 };
    let ratingsTotal = 0; let ratingsSum = 0;
    ratingsDistributionRows.forEach(r => { ratingsDistribution[r._id] = r.count; ratingsTotal += r.count; ratingsSum += r._id * r.count; });
    const ratingsAverage = ratingsTotal ? +(ratingsSum / ratingsTotal).toFixed(2) : 0;

    res.json({
      trendingProducts,
      vendorSpotlight,
      negotiationStats,
      negotiationHighlight,
      activity: activityTrimmed,
      ratings: {
        distribution: ratingsDistribution,
        total: ratingsTotal,
        average: ratingsAverage
      },
      testimonials: testimonialsSample,
      generatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error('Home summary error', err);
    res.status(500).json({ error: 'Failed to build home summary' });
  }
});

module.exports = router;
