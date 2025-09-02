const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const AuditEvent = require('../models/AuditEvent');
const { protect, adminOnly } = require('../middleware/auth');
const { scoreOrderContext } = require('../services/riskScoringService');
const { evaluateRules } = require('../services/ruleEngine');
const Rule = require('../models/Rule');
const Case = require('../models/Case');
const { buildLinkageGraph } = require('../services/linkageService');

const Watchlist = require('../models/Watchlist');

// Toggle watchlist entry persisted in DB
router.post('/watchlist/:type/:id', protect, adminOnly, async (req, res) => {
  try {
    const { type, id } = req.params;
    if (!['user','vendor','device','ip'].includes(type)) {
      return res.status(400).json({ error: 'Invalid watchlist type' });
    }
    const existing = await Watchlist.findOne({ type, value: id });
    if (existing) {
      await existing.deleteOne();
    } else {
      await Watchlist.create({ type, value: id, addedBy: req.user.id });
    }
    const all = await Watchlist.find({}).lean();
    const wl = all.reduce((acc, w) => { 
      const bucket = acc[w.type+'s']||(acc[w.type+'s']=[]);
      bucket.push({ value: w.value, addedBy: w.addedBy, at: w.addedAt });
      return acc; 
    }, {});
    res.json({ success: true, watchlist: wl });
  } catch (e) {
    console.error('Watchlist toggle error', e);
    res.status(500).json({ error: 'Failed to toggle watchlist' });
  }
});

router.get('/watchlist', protect, adminOnly, async (req, res) => {
  try {
    const all = await Watchlist.find({}).lean();
    const wl = all.reduce((acc, w) => { 
  const bucket = acc[w.type+'s']||(acc[w.type+'s']=[]);
  bucket.push({ value: w.value, addedBy: w.addedBy, at: w.addedAt, notes: w.notes });
      return acc; 
    }, {});
    res.json({ success: true, watchlist: wl });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch watchlist' });
  }
});

// Recompute risk scores for all pending orders (maintenance tool)
router.post('/recompute-risk', protect, adminOnly, async (req, res) => {
  try {
    const pending = await Order.find({ 'adminApproval.status': 'pending' }).limit(500);
    let updated = 0;
    for (const order of pending) {
      // Aggregate simple context for rescoring
      const quantityTotal = order.items.reduce((t,i)=> t + (i.quantity||0),0);
      const flags = order.suspiciousFlags || [];
      const ctx = require('../services/riskScoringService').scoreOrderContext({
        total: order.total,
        subtotal: order.subtotal,
        itemCount: order.items.length,
        quantityTotal,
        userOrderCount24h: 0,
        deviceReuse: null,
        ipReuseUsers: 0,
        flags
      });
      order.securityInfo = order.securityInfo || {};
      order.securityInfo.riskScore = ctx.score;
      order.securityInfo.riskLevel = ctx.riskLevel;
      order.securityInfo.riskReasons = ctx.reasons;
      await order.save();
      updated++;
    }
    res.json({ success:true, updated });
  } catch (e) {
    console.error('Recompute risk error', e);
    res.status(500).json({ error:'Failed to recompute risk' });
  }
});

// Extended recompute including velocity, negotiated, watchlist factors
router.post('/recompute-risk-extended', protect, adminOnly, async (req, res) => {
  try {
    const { limit = 500, days = 30 } = req.body || {};
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const orders = await Order.find({ orderedAt: { $gte: since } }).limit(Number(limit));
    // Preload watchlist sets
    const wl = await Watchlist.find({}).lean();
    const wlSets = {
      user: new Set(wl.filter(w=>w.type==='user').map(w=>w.value)),
      vendor: new Set(wl.filter(w=>w.type==='vendor').map(w=>w.value)),
      device: new Set(wl.filter(w=>w.type==='device').map(w=>w.value)),
      ip: new Set(wl.filter(w=>w.type==='ip').map(w=>w.value))
    };
    let updated = 0;
    for (const o of orders) {
      const quantityTotal = (o.items||[]).reduce((t,i)=> t + (i.quantity||0),0);
      const watchlistHits = {
        uid: wlSets.user.has(o.uid),
        vendor: o.vendor ? wlSets.vendor.has(o.vendor.toString()) : false,
        device: wlSets.device.has(o.securityInfo?.deviceFingerprint),
        ip: wlSets.ip.has(o.securityInfo?.ipAddress)
      };
      const ctx = scoreOrderContext({
        total: o.total,
        subtotal: o.subtotal || o.total,
        itemCount: (o.items||[]).length,
        quantityTotal,
        userOrderCount24h: 0,
        deviceReuse: null,
        ipReuseUsers: 0,
        flags: o.suspiciousFlags || [],
        velocitySnapshot: o.velocity,
        negotiated: o.negotiated,
        watchlistHits
      });
      o.securityInfo = o.securityInfo || {};
      o.securityInfo.riskScore = ctx.score;
      o.securityInfo.riskLevel = ctx.riskLevel;
      const flagReasons = (o.suspiciousFlags||[]).map(f=>f.type?.toUpperCase()).filter(Boolean);
      o.securityInfo.riskReasons = Array.from(new Set([...ctx.reasons, ...flagReasons]));
      await o.save();
      updated++;
    }
    res.json({ success:true, updated, total: orders.length });
  } catch (e) {
    console.error('Extended recompute error', e);
    res.status(500).json({ error: 'Failed extended recompute' });
  }
});

// Full watchlist listing with metadata
router.get('/watchlist/full', protect, adminOnly, async (req, res) => {
  try {
    const entries = await Watchlist.find({}).sort({ createdAt: -1 }).lean();
    res.json({ entries });
  } catch (e) {
    res.status(500).json({ error: 'Failed to load watchlist' });
  }
});

// Update / add notes for a watchlist entry (upsert)
router.patch('/watchlist/:type/:value', protect, adminOnly, async (req, res) => {
  try {
    const { type, value } = req.params;
    const { notes } = req.body || {};
    if (!['user','vendor','device','ip'].includes(type)) return res.status(400).json({ error: 'Invalid type' });
    const entry = await Watchlist.findOneAndUpdate({ type, value }, { $set: { notes, addedBy: req.user.id } }, { new: true, upsert: true });
    res.json({ success:true, entry });
  } catch (e) {
    console.error('Watchlist notes error', e);
    res.status(500).json({ error: 'Failed to update notes' });
  }
});

// ===== Rule Management =====
router.get('/rules', protect, adminOnly, async (req, res) => {
  try {
    const rules = await Rule.find({}).sort({ priority:1 });
    res.json({ rules });
  } catch (e) { res.status(500).json({ error: 'Failed to load rules' }); }
});

router.post('/rules', protect, adminOnly, async (req, res) => {
  try {
  const { name, description, enabled = true, priority = 100, conditions = [], tree, actions = {}, status, effectiveFrom, effectiveTo } = req.body;
  const rule = await Rule.create({ name, description, enabled, priority, conditions, tree, actions, status, effectiveFrom, effectiveTo, createdBy: req.user.id, updatedBy: req.user.id, auditHistory:[{ by:req.user.id, action:'create', meta:{ name } }] });
    res.json({ success:true, rule });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.put('/rules/:id', protect, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const current = await Rule.findById(id);
    if (!current) return res.status(404).json({ error:'Not found' });
    // Version bump strategy if structural fields change
    const structuralChanged = ['conditions','tree','actions'].some(k => req.body[k] && JSON.stringify(req.body[k]) !== JSON.stringify(current[k]));
    if (structuralChanged) {
      const newVersion = current.version + 1;
      const clone = current.toObject();
      delete clone._id;
      const updated = { ...clone, ...req.body, version:newVersion, supersedes: current._id, updatedBy: req.user.id };
      const newRule = await Rule.create({ ...updated, auditHistory:[...(current.auditHistory||[]), { by:req.user.id, action:'version', meta:{ from: current._id.toString(), version:newVersion } }] });
      // Archive old
      current.status = 'archived';
      current.updatedBy = req.user.id;
      current.auditHistory.push({ by:req.user.id, action:'archive', meta:{ supersededBy:newRule._id.toString() } });
      await current.save();
      return res.json({ success:true, rule:newRule, archived: current._id });
    }
    const update = { ...req.body, updatedBy: req.user.id };
    update.auditHistory = [...(current.auditHistory||[]), { by:req.user.id, action:'update', meta:{} }];
    const rule = await Rule.findByIdAndUpdate(id, update, { new: true });
    res.json({ success:true, rule });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.delete('/rules/:id', protect, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const permanent = req.query.permanent === 'true';
    const rule = await Rule.findById(id);
    if (!rule) return res.status(404).json({ error: 'Not found' });

    // If already archived and user asks again or permanent flag supplied -> hard delete
    if (permanent || rule.status === 'archived') {
      await rule.deleteOne();
      return res.json({ success: true, deleted: id, permanent: true });
    }

    // Soft archive first (default behavior)
    rule.status = 'archived';
    rule.enabled = false;
    rule.auditHistory = [...(rule.auditHistory||[]), { by: req.user.id, action: 'archive', meta: { soft: true } }];
    await rule.save();
    res.json({ success: true, archived: id, permanent: false });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Dry-run a rule set against a sample context
router.post('/rules/dry-run', protect, adminOnly, async (req, res) => {
  try {
    const { context } = req.body;
    const result = await evaluateRules(context || {});
    res.json({ success:true, result });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// Preview impact against last N orders
router.post('/rules/preview-impact', protect, adminOnly, async (req, res) => {
  try {
    const { limit = 50 } = req.body;
    const orders = await Order.find({}).sort({ orderedAt:-1 }).limit(Number(limit));
    const deltas = [];
    for (const o of orders) {
      const ctx = {
        total: o.total,
        subtotal: o.subtotal,
        itemCount: (o.items||[]).length,
        quantityTotal: (o.items||[]).reduce((t,i)=>t+(i.quantity||0),0),
        uid: o.uid,
        vendorId: o.vendor?.toString(),
        role: o.role,
        riskScore: o.securityInfo?.riskScore || 0,
        velocity: o.velocity,
        negotiated: o.negotiated,
        ip: o.securityInfo?.ipAddress,
        deviceFingerprint: o.securityInfo?.deviceFingerprint,
        flags: (o.suspiciousFlags||[]).map(f=>f.type)
      };
      const evalRes = await evaluateRules(ctx);
      if (evalRes.applied.length || evalRes.extraRisk) {
        deltas.push({ orderId: o._id, orderNumber: o.orderNumber, applied: evalRes.applied, addedRisk: evalRes.extraRisk, addedReasons: evalRes.addedReasons, addedFlags: evalRes.addedFlags });
      }
    }
    res.json({ success:true, sample: orders.length, impacted: deltas.length, deltas });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// Tier 1 Metrics endpoint
router.get('/metrics', protect, adminOnly, async (req, res) => {
  try {
    const window = req.query.window || '24h';
    const now = Date.now();
    const msWindow = window === '2h' ? 2*60*60*1000 : window === '7d' ? 7*24*60*60*1000 : 24*60*60*1000;
    const since = new Date(now - msWindow);

    // Core aggregates
    const match = { orderedAt: { $gte: since } };
    const ordersAgg = await Order.aggregate([
      { $match: match },
      { $project: { total:1, requiresApproval:1, 'securityInfo.riskScore':1, risk:'$securityInfo.riskScore', suspicious: { $cond: ['$requiresApproval',1,0] } } },
      { $group: { _id: null, count: { $sum:1 }, suspicious: { $sum:'$suspicious' }, avgRisk: { $avg: '$risk' } } }
    ]);
    const totals = ordersAgg[0] || { count:0, suspicious:0, avgRisk:0 };

    // Approval outcomes in window
    const approvals = await Order.aggregate([
      { $match: { orderedAt: { $gte: since }, requiresApproval: true } },
      { $group: { _id: '$adminApproval.status', c: { $sum:1 } } }
    ]);
    const approvalsMap = approvals.reduce((a,r)=> (a[r._id||'pending']=r.c, a), {});

    // Risk score distribution buckets
    const riskBuckets = await Order.aggregate([
      { $match: match },
      { $bucket: { groupBy: '$securityInfo.riskScore', boundaries:[0,25,50,75,100,200], default:'200+', output:{ count:{ $sum:1 } } } }
    ]).catch(()=>[]);

    // Top risk reasons (using securityInfo.riskReasons array if exists)
    const topRiskReasons = await Order.aggregate([
      { $match: { orderedAt: { $gte: since }, 'securityInfo.riskReasons.0': { $exists: true } } },
      { $unwind: '$securityInfo.riskReasons' },
      { $group: { _id: '$securityInfo.riskReasons', count: { $sum:1 } } },
      { $sort: { count:-1 } },
      { $limit: 10 }
    ]);

    // Top vendors by flagged percentage
    const topVendors = await Order.aggregate([
      { $match: match },
      { $group: { _id: '$vendor', total: { $sum:1 }, flagged: { $sum: { $cond: ['$requiresApproval',1,0] } }, avgRisk: { $avg: '$securityInfo.riskScore' } } },
      { $match: { total: { $gte: 2 } } },
      { $sort: { flagged: -1, avgRisk: -1 } },
      { $limit: 10 }
    ]);

    // Top users by velocity / quantity
    const topUsers = await Order.aggregate([
      { $match: match },
      { $project: { uid:1, total:1, itemCount: { $size: '$items' }, risk: '$securityInfo.riskScore' } },
      { $group: { _id: '$uid', orders: { $sum:1 }, items: { $sum: '$itemCount' }, avgRisk:{ $avg:'$risk' }, totalSpent:{ $sum:'$total' } } },
      { $sort: { orders:-1, avgRisk:-1 } },
      { $limit: 10 }
    ]);

    // Negotiation discount analytics (deltaPct distribution & top discounts)
    const negotiatedAgg = await Order.aggregate([
      { $match: { orderedAt: { $gte: since }, 'negotiated.isNegotiated': true, 'negotiated.deltaPct': { $gt: 0 } } },
      { $project: { dp: '$negotiated.deltaPct', total: 1 } },
      { $facet: {
          distribution: [
            { $bucket: { groupBy: '$dp', boundaries: [0,5,10,15,20,30,40,50,100], default: '100+', output: { count: { $sum:1 } } } }
          ],
          topDiscounts: [ { $sort: { dp: -1 } }, { $limit: 10 } ],
          stats: [ { $group: { _id: null, avg: { $avg: '$dp' }, max: { $max: '$dp' }, count: { $sum:1 } } } ]
        }
      }
    ]).catch(()=>[]);
    const negotiatedAnalytics = negotiatedAgg[0] || { distribution:[], topDiscounts:[], stats:[] };

    // Velocity distribution snapshot (orders containing embedded velocity snapshot)
    const velocitySnap = await Order.aggregate([
      { $match: match },
      { $project: { v: '$velocity' } },
      { $group: { _id: null,
          last5m: { $avg: '$v.last5m' },
          last1h: { $avg: '$v.last1h' },
          last6h: { $avg: '$v.last6h' },
          last24h: { $avg: '$v.last24h' }
        }
      }
    ]).catch(()=>[]);

    // Self purchase attempts from audit log
    const selfPurchaseAttempts = await AuditEvent.countDocuments({ type: 'self_purchase_attempt', createdAt: { $gte: since } });

    // Device reuse simple stat: count devices used by >1 uid in window
    const deviceReuse = await Order.aggregate([
      { $match: { orderedAt: { $gte: since }, 'securityInfo.deviceFingerprint': { $exists: true, $ne: null } } },
      { $group: { _id: '$securityInfo.deviceFingerprint', users: { $addToSet: '$uid' }, count: { $sum:1 } } },
      { $project: { users:1, count:1, userCount: { $size: '$users' } } },
      { $match: { userCount: { $gt:1 } } },
      { $sort: { userCount:-1, count:-1 } },
      { $limit: 20 }
    ]);

    // Current watchlist snapshot for metrics
  const wlAll = await Watchlist.find({}).lean();
  const wlObj = wlAll.reduce((acc, w) => { const bucket = acc[w.type+'s']||(acc[w.type+'s']=[]); bucket.push({ value: w.value, addedBy: w.addedBy, at: w.addedAt }); return acc; }, {});

    res.json({
      window,
      totals: {
        orders: totals.count,
        suspicious: totals.suspicious,
        suspiciousPct: totals.count ? +( (totals.suspicious / totals.count) * 100 ).toFixed(1) : 0,
        avgRisk: +((totals.avgRisk)||0).toFixed(1)
      },
      negotiated: {
        count: await Order.countDocuments({ orderedAt: { $gte: since }, 'negotiated.isNegotiated': true }),
        pct: totals.count ? +((await Order.countDocuments({ orderedAt: { $gte: since }, 'negotiated.isNegotiated': true }) / totals.count) * 100).toFixed(1) : 0
      },
      negotiatedAnalytics: {
        distribution: negotiatedAnalytics.distribution,
        topDiscounts: negotiatedAnalytics.topDiscounts,
        stats: negotiatedAnalytics.stats[0] || null
      },
      velocityAverages: velocitySnap[0] || null,
      approvals: approvalsMap,
      riskBuckets,
      topRiskReasons,
      topVendors,
      topUsers,
      selfPurchaseAttempts,
      deviceReuse,
      watchlist: wlObj
    });
  } catch (e) {
    console.error('Metrics error', e);
    res.status(500).json({ error: 'Failed to compute metrics' });
  }
});

// Velocity drilldown endpoint
router.get('/velocity/users', protect, adminOnly, async (req, res) => {
  try {
    // Last 24h population
    const since = new Date(Date.now() - 24*60*60*1000);
    const orders = await Order.find({ orderedAt: { $gte: since } }).select('uid velocity negotiated');
    const map = new Map();
    for (const o of orders) {
      let rec = map.get(o.uid);
      if (!rec) {
        rec = { uid: o.uid, orders:0, vel: { last5m:0, last1h:0, last6h:0, last24h:0 }, maxDiscount: null };
        map.set(o.uid, rec);
      }
      rec.orders += 1;
      if (o.velocity) {
        rec.vel.last5m = Math.max(rec.vel.last5m, o.velocity.last5m||0);
        rec.vel.last1h = Math.max(rec.vel.last1h, o.velocity.last1h||0);
        rec.vel.last6h = Math.max(rec.vel.last6h, o.velocity.last6h||0);
        rec.vel.last24h = Math.max(rec.vel.last24h, o.velocity.last24h||0);
      }
      if (o.negotiated?.deltaPct != null) {
        rec.maxDiscount = rec.maxDiscount == null ? o.negotiated.deltaPct : Math.max(rec.maxDiscount, o.negotiated.deltaPct);
      }
    }
    const users = Array.from(map.values()).sort((a,b)=> b.orders - a.orders).slice(0,100);
    res.json({ users });
  } catch (e) {
    console.error('Velocity drilldown error', e);
    res.status(500).json({ error: 'Failed to load velocity detail' });
  }
});

// 🛡️ ADMIN PANEL - ANTI-SYNDICATE FEATURES

// Get all orders requiring admin approval
router.get('/pending-orders', protect, adminOnly, async (req, res) => {
  try {
    const { page = 1, limit = 20, severity, type } = req.query;
    
    let filter = { requiresApproval: true, 'adminApproval.status': 'pending' };
    
    // Filter by suspicious flag severity
    if (severity) {
      filter['suspiciousFlags.severity'] = severity;
    }
    
    // Filter by suspicious flag type
    if (type) {
      filter['suspiciousFlags.type'] = type;
    }
    
  let orders = await Order.find(filter)
      .populate('user', 'firstName lastName name email phone')
      .populate('vendor', 'businessName email phone')
      .sort({ orderedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    // Enrich with purchaser vendor (when order placed by a vendor) to distinguish purchaser vs seller vendor
    try {
      const vendorPurchaserUids = [...new Set(orders.filter(o => o.role === 'vendor').map(o => o.uid))];
      let purchaserVendorsMap = new Map();
      if (vendorPurchaserUids.length) {
        const purchaserVendors = await Vendor.find({ uid: { $in: vendorPurchaserUids } }).select('uid businessName sellerName email phone');
        purchaserVendors.forEach(v => purchaserVendorsMap.set(v.uid, v));
      }
      // Convert documents to plain objects to safely attach extra field
      orders = orders.map(o => {
        const plain = o.toObject();
        if (o.role === 'vendor') {
          const pv = purchaserVendorsMap.get(o.uid);
          if (pv) plain.purchaserVendor = pv;
        }
        // Negotiated indicator for admin UI
        plain.isNegotiated = !!(plain.negotiated && plain.negotiated.isNegotiated);
        return plain;
      });
    } catch (enrichErr) {
      console.warn('Pending orders purchaserVendor enrichment failed', enrichErr.message);
    }

    // Recalculate missing/zero risk scores & normalize reasons
    const recalculated = [];
    for (const o of orders) {
      const currentScore = o.securityInfo?.riskScore || 0;
      if (!o.securityInfo) o.securityInfo = {};
      if (currentScore === 0) {
        const quantityTotal = (o.items||[]).reduce((t,i)=> t + (i.quantity||0),0);
        try {
          // Basic watchlist hits (just presence test of uid/device/ip)
          let watchlistHits = null;
          try {
            const wlEntries = await Watchlist.find({ value: { $in: [o.uid, o.securityInfo?.deviceFingerprint, o.securityInfo?.ipAddress] } }).lean();
            if (wlEntries.length) {
              watchlistHits = {
                uid: wlEntries.some(w => w.type === 'user' && w.value === o.uid),
                device: wlEntries.some(w => w.type === 'device' && w.value === o.securityInfo?.deviceFingerprint),
                ip: wlEntries.some(w => w.type === 'ip' && w.value === o.securityInfo?.ipAddress),
                vendor: wlEntries.some(w => w.type === 'vendor' && w.value === (o.vendor && o.vendor.toString()))
              };
            }
          } catch(e) {}
          const ctx = scoreOrderContext({
            total: o.total,
            subtotal: o.subtotal || o.total,
            itemCount: (o.items||[]).length,
            quantityTotal,
            userOrderCount24h: 0,
            deviceReuse: null,
            ipReuseUsers: 0,
            flags: o.suspiciousFlags || [],
            velocitySnapshot: o.velocity,
            negotiated: o.negotiated,
            watchlistHits
          });
          o.securityInfo.riskScore = ctx.score;
            o.securityInfo.riskLevel = ctx.riskLevel;
          // Merge reasons with suspicious flag types
          const flagReasons = (o.suspiciousFlags||[]).map(f=>f.type?.toUpperCase()).filter(Boolean);
          o.securityInfo.riskReasons = Array.from(new Set([...(o.securityInfo.riskReasons||[]), ...ctx.reasons, ...flagReasons]));
          recalculated.push(o._id);
          await o.save();
        } catch (e) {
          console.warn('Risk score recalculation failed for order', o._id.toString(), e.message);
        }
      } else {
        // Ensure reasons at least include flag types
        const flagReasons = (o.suspiciousFlags||[]).map(f=>f.type?.toUpperCase()).filter(Boolean);
        // Add velocity/negotiated reasons if missing for existing scored orders
        const supplemental = [];
        if (o.velocity) {
          if (o.velocity.last5m > 1) supplemental.push('VELOCITY_5M');
          if (o.velocity.last1h > 3) supplemental.push('VELOCITY_1H');
          if (o.velocity.last6h > 5) supplemental.push('VELOCITY_6H');
        }
        if (o.negotiated?.deltaPct != null) {
          if (o.negotiated.deltaPct >= 30 && o.negotiated.deltaPct < 50) supplemental.push('NEGOTIATED_LARGE_DISCOUNT');
          if (o.negotiated.deltaPct >= 50) supplemental.push('NEGOTIATED_EXTREME_DISCOUNT');
          if (o.negotiated.deltaPct >= 30 && o.velocity?.last1h > 3) supplemental.push('DISCOUNT_VELOCITY_SYNERGY');
        }
        let watchlistReasons = [];
        try {
          const wlEntries = await Watchlist.find({ value: { $in: [o.uid, o.securityInfo?.deviceFingerprint, o.securityInfo?.ipAddress] } }).lean();
          if (wlEntries.length) {
            if (wlEntries.some(w=>w.type==='user' && w.value===o.uid)) watchlistReasons.push('WATCHLIST_UID');
            if (wlEntries.some(w=>w.type==='device' && w.value===o.securityInfo?.deviceFingerprint)) watchlistReasons.push('WATCHLIST_DEVICE');
            if (wlEntries.some(w=>w.type==='ip' && w.value===o.securityInfo?.ipAddress)) watchlistReasons.push('WATCHLIST_IP');
            if (wlEntries.some(w=>w.type==='vendor' && w.value === (o.vendor && o.vendor.toString()))) watchlistReasons.push('WATCHLIST_VENDOR');
          }
        } catch(e) {}
        const allNew = [...flagReasons, ...supplemental, ...watchlistReasons];
        if (allNew.length) {
          const existing = new Set(o.securityInfo.riskReasons||[]);
          let changed = false;
          for (const r of allNew) { if (!existing.has(r)) { existing.add(r); changed = true; } }
          if (changed) { o.securityInfo.riskReasons = Array.from(existing); await o.save(); }
        }
      }
    }

    // Bulk attach watchlist metadata for hits (user, vendor, device, ip)
    try {
      const userUids = new Set();
      const vendorIds = new Set();
      const devices = new Set();
      const ips = new Set();
      orders.forEach(o => {
        if (o.uid) userUids.add(o.uid);
        if (o.vendor) vendorIds.add(o.vendor._id ? o.vendor._id.toString() : o.vendor.toString());
        if (o.securityInfo?.deviceFingerprint) devices.add(o.securityInfo.deviceFingerprint);
        if (o.securityInfo?.ipAddress) ips.add(o.securityInfo.ipAddress);
      });
      const values = [
        ...Array.from(userUids).map(v => ({ type:'user', value:v })),
        ...Array.from(vendorIds).map(v => ({ type:'vendor', value:v })),
        ...Array.from(devices).map(v => ({ type:'device', value:v })),
        ...Array.from(ips).map(v => ({ type:'ip', value:v }))
      ];
      if (values.length) {
        const wlEntries = await Watchlist.find({ $or: values }).lean();
        const key = (t,v) => `${t}:${v}`;
        const metaMap = new Map();
        wlEntries.forEach(e => metaMap.set(key(e.type, e.value), { addedBy: e.addedBy, notes: e.notes, addedAt: e.addedAt || e.createdAt }));
        orders.forEach(o => {
          const meta = {};
            const userMeta = metaMap.get(key('user', o.uid));
            if (userMeta) meta.user = userMeta;
            const vendId = o.vendor ? (o.vendor._id ? o.vendor._id.toString() : o.vendor.toString()) : null;
            if (vendId) {
              const vMeta = metaMap.get(key('vendor', vendId));
              if (vMeta) meta.vendor = vMeta;
            }
            if (o.securityInfo?.deviceFingerprint) {
              const dMeta = metaMap.get(key('device', o.securityInfo.deviceFingerprint));
              if (dMeta) meta.device = dMeta;
            }
            if (o.securityInfo?.ipAddress) {
              const ipMeta = metaMap.get(key('ip', o.securityInfo.ipAddress));
              if (ipMeta) meta.ip = ipMeta;
            }
          if (!o.securityInfo) o.securityInfo = {};
          if (Object.keys(meta).length) {
            o.securityInfo.watchlistMeta = meta;
            o.securityInfo.watchlistHits = {
              uid: !!meta.user,
              vendor: !!meta.vendor,
              device: !!meta.device,
              ip: !!meta.ip
            };
          }
        });
      }
    } catch (wlMetaErr) {
      console.warn('Watchlist metadata enrichment failed', wlMetaErr.message);
    }
    
    const total = await Order.countDocuments(filter);
    
    // Get fraud statistics
    const fraudStats = await Order.aggregate([
      { $match: { requiresApproval: true } },
      { $unwind: '$suspiciousFlags' },
      { 
        $group: { 
          _id: '$suspiciousFlags.type', 
          count: { $sum: 1 },
          severity: { $first: '$suspiciousFlags.severity' }
        } 
      }
    ]);
    
    res.json({
      orders,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      },
      fraudStats,
      recalculatedCount: recalculated.length
    });
    
  } catch (error) {
    console.error('Error fetching pending orders:', error);
    res.status(500).json({ error: 'Failed to fetch pending orders' });
  }
});

// Get fraud detection dashboard data
router.get('/fraud-dashboard', protect, adminOnly, async (req, res) => {
  try {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    // Get suspicious activities in last 24 hours
    const recentSuspicious = await Order.find({
      requiresApproval: true,
      orderedAt: { $gte: last24h }
    }).countDocuments();
    
    // Get IP addresses with multiple orders
    const suspiciousIPs = await Order.aggregate([
      { 
        $match: { 
          orderedAt: { $gte: last7days },
          'securityInfo.ipAddress': { $exists: true }
        } 
      },
      { 
        $group: { 
          _id: '$securityInfo.ipAddress', 
          orderCount: { $sum: 1 },
          totalValue: { $sum: '$total' },
          users: { $addToSet: '$uid' }
        } 
      },
      { $match: { orderCount: { $gt: 10 } } },
      { $sort: { orderCount: -1 } },
      { $limit: 20 }
    ]);
    
    // Get bulk orders (high quantity)
    const bulkOrders = await Order.find({
      'suspiciousFlags.type': 'bulk_hoarding',
      orderedAt: { $gte: last7days }
    })
    .populate('user', 'firstName lastName email')
    .select('orderNumber total itemCount suspiciousFlags orderedAt')
    .sort({ orderedAt: -1 })
    .limit(10);
    
    // Get users with rapid ordering patterns
    const rapidOrderUsers = await Order.aggregate([
      { 
        $match: { 
          orderedAt: { $gte: last24h }
        } 
      },
      { 
        $group: { 
          _id: '$uid', 
          orderCount: { $sum: 1 },
          totalSpent: { $sum: '$total' }
        } 
      },
      { $match: { orderCount: { $gt: 3 } } },
      { $sort: { orderCount: -1 } },
      { $limit: 10 }
    ]);
    
    res.json({
      summary: {
        recentSuspicious,
        totalPending: await Order.countDocuments({ 'adminApproval.status': 'pending' }),
        suspiciousIPCount: suspiciousIPs.length,
        rapidOrderUsers: rapidOrderUsers.length
      },
      suspiciousIPs,
      bulkOrders,
      rapidOrderUsers
    });
    
  } catch (error) {
    console.error('Error fetching fraud dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch fraud dashboard data' });
  }
});

// Approve or reject an order
router.patch('/orders/:orderId/review', protect, adminOnly, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { action, reason, notes } = req.body;
    const adminUid = req.user.id;
    
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action. Must be "approve" or "reject"' });
    }
    
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    if (!order.requiresApproval) {
      return res.status(400).json({ error: 'Order does not require approval' });
    }
    
    // Update admin approval status
    order.adminApproval = {
      status: action === 'approve' ? 'approved' : 'rejected',
      reviewedBy: adminUid,
      reviewedAt: new Date(),
      reason,
      notes
    };
    
    if (action === 'approve') {
      order.requiresApproval = false;
      order.status = 'confirmed';
      await order.updateStatus('confirmed', `Approved by admin: ${reason || 'Security review passed'}`, adminUid);
    } else {
      order.status = 'cancelled';
      await order.updateStatus('cancelled', `Rejected by admin: ${reason || 'Failed security review'}`, adminUid);
      
      // Restore product stock for rejected orders
      await order.restoreStock();
    }
    
    await order.save();
    
    // Log admin action
    console.log(`Admin ${adminUid} ${action}ed order ${order.orderNumber}: ${reason}`);
    
    res.json({ 
      message: `Order ${action}ed successfully`,
      order: {
        orderNumber: order.orderNumber,
        status: order.status,
  adminApproval: order.adminApproval,
  negotiated: order.negotiated || { isNegotiated:false }
      }
    });
    
  } catch (error) {
    console.error('Error reviewing order:', error);
    res.status(500).json({ error: 'Failed to review order' });
  }
});

// Get detailed fraud analysis for a specific order
router.get('/orders/:orderId/fraud-analysis', protect, adminOnly, async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const order = await Order.findById(orderId)
      .populate('user', 'firstName lastName email phone createdAt')
      .populate('vendor', 'businessName email phone');
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    // Get user's order history
    const userOrderHistory = await Order.find({ uid: order.uid })
      .select('orderNumber total status orderedAt suspiciousFlags')
      .sort({ orderedAt: -1 })
      .limit(20);
    
    // Get orders from same IP
    const ipOrderHistory = order.securityInfo?.ipAddress ? 
      await Order.find({ 'securityInfo.ipAddress': order.securityInfo.ipAddress })
        .select('orderNumber uid total status orderedAt')
        .sort({ orderedAt: -1 })
        .limit(10) : [];
    
    // Calculate risk score
    let riskScore = 0;
    order.suspiciousFlags.forEach(flag => {
      switch (flag.severity) {
        case 'low': riskScore += 10; break;
        case 'medium': riskScore += 25; break;
        case 'high': riskScore += 50; break;
        case 'critical': riskScore += 100; break;
      }
    });
    
    const riskLevel = riskScore < 25 ? 'Low' : 
                     riskScore < 50 ? 'Medium' :
                     riskScore < 100 ? 'High' : 'Critical';
    
    res.json({
      order,
      fraudAnalysis: {
        riskScore,
        riskLevel,
        flagCount: order.suspiciousFlags.length,
  suspiciousFlags: order.suspiciousFlags,
  negotiated: order.negotiated || { isNegotiated: false }
      },
      userOrderHistory,
      ipOrderHistory,
      recommendations: generateFraudRecommendations(order, riskScore)
    });
    
  } catch (error) {
    console.error('Error fetching fraud analysis:', error);
    res.status(500).json({ error: 'Failed to fetch fraud analysis' });
  }
});

// Bulk approve/reject multiple orders
router.patch('/orders/bulk-review', protect, adminOnly, async (req, res) => {
  try {
    const { orderIds, action, reason } = req.body;
    const adminUid = req.user.id;
    
    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ error: 'Order IDs array is required' });
    }
    
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action' });
    }
    
    const results = [];
    
    for (const orderId of orderIds) {
      try {
        const order = await Order.findById(orderId);
        if (!order || !order.requiresApproval) {
          results.push({ orderId, status: 'skipped', reason: 'Order not found or doesn\'t require approval' });
          continue;
        }
        
        order.adminApproval = {
          status: action === 'approve' ? 'approved' : 'rejected',
          reviewedBy: adminUid,
          reviewedAt: new Date(),
          reason
        };
        
        if (action === 'approve') {
          order.requiresApproval = false;
          order.status = 'confirmed';
          await order.updateStatus('confirmed', `Bulk approved: ${reason}`, adminUid);
        } else {
          order.status = 'cancelled';
          await order.updateStatus('cancelled', `Bulk rejected: ${reason}`, adminUid);
          await order.restoreStock();
        }
        
        await order.save();
  results.push({ orderId, status: 'success', orderNumber: order.orderNumber, negotiated: order.negotiated?.isNegotiated || false });
        
      } catch (error) {
        results.push({ orderId, status: 'error', error: error.message });
      }
    }
    
    res.json({ 
      message: `Bulk ${action} completed`,
      results,
      summary: {
        total: orderIds.length,
        successful: results.filter(r => r.status === 'success').length,
        failed: results.filter(r => r.status === 'error').length,
        skipped: results.filter(r => r.status === 'skipped').length
      }
    });
    
  } catch (error) {
    console.error('Error bulk reviewing orders:', error);
    res.status(500).json({ error: 'Bulk review failed' });
  }
});

// Helper function to generate fraud recommendations
function generateFraudRecommendations(order, riskScore) {
  const recommendations = [];
  
  if (riskScore > 75) {
    recommendations.push('🚨 HIGH RISK: Consider rejecting this order or requiring additional verification');
  }
  
  order.suspiciousFlags.forEach(flag => {
    switch (flag.type) {
      case 'bulk_hoarding':
        recommendations.push('⚠️ Large quantity order detected. Verify buyer legitimacy and business need');
        break;
      case 'high_value':
        recommendations.push('💰 High-value transaction. Consider additional payment verification');
        break;
      case 'rapid_ordering':
        recommendations.push('🏃 Rapid ordering pattern. Check if user is legitimate bulk buyer');
        break;
      case 'multiple_devices':
        recommendations.push('🔄 Multiple devices/IPs used. Possible account sharing or bot activity');
        break;
    }
  });
  
  if (recommendations.length === 0) {
    recommendations.push('✅ Order appears legitimate but requires standard review');
  }
  
  return recommendations;
}

module.exports = router;

// ===== Case Management & Entity Linkage (appended after module export for brevity, ensure export last) =====

// Create case
router.post('/cases', protect, adminOnly, async (req,res)=>{
  try {
    let { title, priority='medium', entities=[], orders=[], tags=[] } = req.body;
    // Normalize entity types (uid -> user)
    entities = (entities||[]).map(e => ({ ...e, type: e.type === 'uid' ? 'user' : e.type }));
    const c = await Case.create({ title, priority, entities, orders, tags, createdBy:req.user.id, updatedBy:req.user.id, notes:[{ by:req.user.id, text:'Case created' }] });
    res.json({ success:true, case:c });
  } catch(e){ res.status(400).json({ error:e.message }); }
});

// List cases (basic filters)
router.get('/cases', protect, adminOnly, async (req,res)=>{
  try {
    const { status, priority, entityType, entityValue, q } = req.query;
    const filter = {};
    if(status) filter.status = status;
    if(priority) filter.priority = priority;
    if(entityType && entityValue) { filter['entities'] = { $elemMatch: { type: entityType, value: entityValue } }; }
    if(q) filter.title = { $regex: q, $options:'i' };
    const cases = await Case.find(filter).sort({ updatedAt:-1 }).limit(200);
    res.json({ cases });
  } catch(e){ res.status(500).json({ error:'Failed to list cases' }); }
});

router.get('/cases/:id', protect, adminOnly, async (req,res)=>{
  try {
    const c = await Case.findById(req.params.id).populate('orders','orderNumber total uid vendor orderedAt');
    if(!c) return res.status(404).json({ error:'Not found' });
    res.json({ case:c });
  } catch(e){ res.status(400).json({ error:e.message }); }
});

router.patch('/cases/:id', protect, adminOnly, async (req,res)=>{
  try {
    const c = await Case.findById(req.params.id);
    if(!c) return res.status(404).json({ error:'Not found' });
    const allowed = ['title','status','priority','tags','assignedTo'];
    allowed.forEach(k => { if(req.body[k] !== undefined) c[k] = req.body[k]; });
    if(Array.isArray(req.body.entities)) req.body.entities.forEach(e => {
      const normType = e.type === 'uid' ? 'user' : e.type;
      if(!c.entities.find(x=>x.type===normType && x.value===e.value)) c.entities.push({ ...e, type:normType });
    });
    if(Array.isArray(req.body.removeEntities)) {
      req.body.removeEntities.forEach(r => {
        const normType = r.type === 'uid' ? 'user' : r.type;
        c.entities = c.entities.filter(en => !(en.type===normType && en.value===r.value));
      });
    }
    if(Array.isArray(req.body.orders)) req.body.orders.forEach(o => { if(!c.orders.find(id=> id.toString()===o)) c.orders.push(o); });
    if(req.body.note) c.notes.push({ by:req.user.id, text:req.body.note });
    c.updatedBy = req.user.id;
    await c.save();
    res.json({ success:true, case:c });
  } catch(e){ res.status(400).json({ error:e.message }); }
});

// Add tag to case
router.post('/cases/:id/tags', protect, adminOnly, async (req,res)=>{
  try {
    const { tag } = req.body || {}; if(!tag) return res.status(400).json({ error:'Tag required' });
    const c = await Case.findById(req.params.id); if(!c) return res.status(404).json({ error:'Not found' });
    if(!c.tags.includes(tag)) c.tags.push(tag);
    await c.save();
    res.json({ success:true, tags:c.tags });
  } catch(e){ res.status(400).json({ error:e.message }); }
});

// Remove tag
router.delete('/cases/:id/tags/:tag', protect, adminOnly, async (req,res)=>{
  try {
    const c = await Case.findById(req.params.id); if(!c) return res.status(404).json({ error:'Not found' });
    c.tags = c.tags.filter(t => t !== req.params.tag);
    await c.save();
    res.json({ success:true, tags:c.tags });
  } catch(e){ res.status(400).json({ error:e.message }); }
});

// Build linkage graph (entity network)
router.post('/linkage/graph', protect, adminOnly, async (req,res)=>{
  try {
    const { uids=[], devices=[], ips=[], vendors=[], phones=[], depth=1, limit=500, maxNodes=300, maxEdges=1000, includeOrderIds=false } = req.body || {};
    const graph = await buildLinkageGraph({ uids, devices, ips, vendors, phones, depth, limit, maxNodes, maxEdges, includeOrderIds });
    res.json({ success:true, graph });
  } catch(e){ console.error('Linkage graph error', e); res.status(500).json({ error:'Failed to build graph' }); }
});

// Case risk score timeline (aggregated orders linked to its entities)
router.get('/cases/:id/risk-timeline', protect, adminOnly, async (req,res)=>{
  try {
    const c = await Case.findById(req.params.id);
    if(!c) return res.status(404).json({ error:'Not found' });
    // Collect entity values
    const uids = c.entities.filter(e=> e.type==='user').map(e=> e.value);
    const vendors = c.entities.filter(e=> e.type==='vendor').map(e=> e.value);
    const devices = c.entities.filter(e=> e.type==='device').map(e=> e.value);
    const ips = c.entities.filter(e=> e.type==='ip').map(e=> e.value);
    if(!uids.length && !vendors.length && !devices.length && !ips.length) return res.json({ points:[] });
    const Order = require('../models/Order');
    const or = [];
    if(uids.length) or.push({ uid: { $in: uids } });
    if(vendors.length) or.push({ vendor: { $in: vendors } });
    if(devices.length) or.push({ 'securityInfo.deviceFingerprint': { $in: devices } });
    if(ips.length) or.push({ 'securityInfo.ipAddress': { $in: ips } });
    const orders = await Order.find({ $or: or }).sort({ createdAt:1 }).select('createdAt orderNumber securityInfo.riskScore securityInfo.riskReasons');
    const points = orders.map(o=> ({ t:o.createdAt, score:o.securityInfo?.riskScore||0, orderNumber:o.orderNumber, reasons:o.securityInfo?.riskReasons||[] }));
    res.json({ points });
  } catch(e){ console.error('Case timeline error', e); res.status(500).json({ error:'Failed timeline' }); }
});

// Edge detail (list orderIds connecting two entities)
router.get('/linkage/edge-detail', protect, adminOnly, async (req,res)=>{
  try {
    const { aType, aValue, bType, bValue, limit=50 } = req.query;
    if(!aType || !aValue || !bType || !bValue) return res.status(400).json({ error:'Missing params' });
    const criteria = [];
    const push = (cond)=> criteria.push(cond);
    // Build OR list requiring both entities present (retrieve superset then filter in-memory)
    if(aType==='uid'||bType==='uid'){}
    const matchAny = [];
    const enc = (t,v) => ({ t, v });
    // Query orders referencing either entity to reduce scope
    const orClauses = [];
  const mapField = (t)=> t==='uid' ? 'uid' : t==='vendor' ? 'vendor' : t==='device' ? 'securityInfo.deviceFingerprint' : t==='ip' ? 'securityInfo.ipAddress' : t==='phone' ? 'deliveryAddress.phone' : null;
    const aField = mapField(aType); const bField = mapField(bType);
    if(aField) orClauses.push({ [aField]: aValue });
    if(bField) orClauses.push({ [bField]: bValue });
    if(!orClauses.length) return res.json({ orders:[] });
    const Order = require('../models/Order');
    const orders = await Order.find({ $or: orClauses }).limit(Number(limit)*5).select('uid vendor securityInfo.deviceFingerprint securityInfo.ipAddress _id orderNumber');
    const filtered = orders.filter(o => {
  const val = (t)=> t==='uid'? o.uid : t==='vendor'? o.vendor?.toString() : t==='device'? o.securityInfo?.deviceFingerprint : t==='ip'? o.securityInfo?.ipAddress : t==='phone'? o.deliveryAddress?.phone : null;
      return val(aType) === aValue && val(bType) === bValue || (val(aType)===bValue && val(bType)===aValue);
    }).slice(0, Number(limit));
    res.json({ success:true, orders: filtered.map(o=> ({ id:o._id, orderNumber:o.orderNumber })) });
  } catch(e){ console.error('Edge detail error', e); res.status(500).json({ error:'Failed edge detail' }); }
});

