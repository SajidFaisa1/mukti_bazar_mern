const Order = require('../models/Order');

// Build entity linkage graph with multi-hop expansion (BFS) with safeguards.
// depth: number of hops (1 = direct connections, 2 = neighbors-of-neighbors ...)
// maxNodes / maxEdges to prevent runaway expansion.
// Simple in-memory LRU cache for graphs
const _graphCache = new Map(); // key -> { at, data }
const CACHE_TTL_MS = 60 * 1000; // 60s
const CACHE_MAX = 50;

function _cacheGet(key){
  const e = _graphCache.get(key); if(!e) return null; if(Date.now() - e.at > CACHE_TTL_MS){ _graphCache.delete(key); return null; } return e.data; }
function _cacheSet(key,data){
  if(_graphCache.size >= CACHE_MAX){ // delete oldest
    const oldestKey = [..._graphCache.entries()].sort((a,b)=> a[1].at - b[1].at)[0]?.[0];
    if(oldestKey) _graphCache.delete(oldestKey);
  }
  _graphCache.set(key,{ at:Date.now(), data });
}

async function buildLinkageGraph({ uids = [], devices = [], ips = [], vendors = [], phones = [], depth = 1, limit = 500, maxNodes = 300, maxEdges = 1000, includeOrderIds = false, maxEdgeOrderIds = 10 }) {
  const cacheKey = JSON.stringify({ uids,devices,ips,vendors,phones,depth,limit,maxNodes,maxEdges,includeOrderIds,maxEdgeOrderIds });
  const cached = _cacheGet(cacheKey);
  if(cached) return { ...cached, cached:true };
  depth = Math.max(1, Math.min(depth, 4)); // clamp depth 1..4
  const nodes = new Map();
  const edges = new Map();
  const seenOrders = new Set();

  function key(type, val){ return `${type}:${val}`; }
  function addNode(type, val){ if(!val) return; const k = key(type,val); if(!nodes.has(k)) nodes.set(k,{ id:k,type,value:val,count:0, layer:0 }); return nodes.get(k); }
  function addEdge(aType,aVal,bType,bVal, orderId){
    if(!aVal || !bVal || (aType===bType && aVal===bVal)) return; let ka = key(aType,aVal), kb = key(bType,bVal); if(ka>kb){ [aType,aVal,bType,bVal] = [bType,bVal,aType,aVal]; ka = key(aType,aVal); kb = key(bType,bVal); }
    const ek = `${ka}|${kb}`;
    let e = edges.get(ek); if(!e){ e = { a:{ type:aType, value:aVal }, b:{ type:bType, value:bVal }, orders:new Set() }; edges.set(ek,e); }
    e.orders.add(orderId.toString());
  }

  // Seed nodes
  uids.forEach(v=>addNode('uid',v)); devices.forEach(v=>addNode('device',v)); ips.forEach(v=>addNode('ip',v)); vendors.forEach(v=>addNode('vendor',v)); phones.forEach(v=>addNode('phone',v));

  // Frontier sets per type for BFS
  let frontier = { uid: new Set(uids), device: new Set(devices), ip: new Set(ips), vendor: new Set(vendors), phone: new Set(phones) };
  const visitedValues = { uid: new Set(uids), device: new Set(devices), ip: new Set(ips), vendor: new Set(vendors), phone: new Set(phones) };

  for (let layer = 0; layer < depth; layer++) {
    // Build criteria from current frontier
    const criteria = [];
    if(frontier.uid.size) criteria.push({ uid: { $in: Array.from(frontier.uid) } });
    if(frontier.device.size) criteria.push({ 'securityInfo.deviceFingerprint': { $in: Array.from(frontier.device) } });
    if(frontier.ip.size) criteria.push({ 'securityInfo.ipAddress': { $in: Array.from(frontier.ip) } });
  if(frontier.vendor.size) criteria.push({ vendor: { $in: Array.from(frontier.vendor) } });
  if(frontier.phone.size) criteria.push({ 'deliveryAddress.phone': { $in: Array.from(frontier.phone) } });
    if(!criteria.length) break;

    const orders = await Order.find({ $or: criteria })
      .limit(limit)
  .select('uid vendor securityInfo.deviceFingerprint securityInfo.ipAddress orderedAt deliveryAddress.phone');

  const nextFrontier = { uid: new Set(), device: new Set(), ip: new Set(), vendor: new Set(), phone: new Set() };

    for (const o of orders) {
      if (seenOrders.has(o._id.toString())) continue;
      seenOrders.add(o._id.toString());
      const uid = o.uid;
      const vendor = o.vendor?.toString();
      const device = o.securityInfo?.deviceFingerprint;
      const ip = o.securityInfo?.ipAddress;
  const phone = o.deliveryAddress?.phone;
  const entities = [ ['uid', uid], ['vendor', vendor], ['device', device], ['ip', ip], ['phone', phone] ];
      // Add nodes & counts
      for (const [t,val] of entities) {
        if(!val) continue;
        const n = addNode(t,val);
        n.count++;
        if (n.layer === 0 && layer > 0 && !frontier[t].has(val)) {
          // mark first discovery layer if not seed
          n.layer = layer;
        }
      }
      // Add pairwise edges among present entities
      for (let i=0;i<entities.length;i++) {
        for (let j=i+1;j<entities.length;j++) {
          const [t1,v1] = entities[i]; const [t2,v2] = entities[j];
          addEdge(t1,v1,t2,v2,o._id);
        }
      }
      // Prepare next frontier with newly discovered values (not visited before)
      for (const [t,val] of entities) {
        if(!val) continue;
        if (!visitedValues[t].has(val)) {
          visitedValues[t].add(val);
          nextFrontier[t].add(val);
        }
      }
      // Safeguards
      if (nodes.size >= maxNodes || edges.size >= maxEdges) break;
    }
    frontier = nextFrontier;
    if (nodes.size >= maxNodes || edges.size >= maxEdges) break;
  }

  const edgeList = Array.from(edges.values()).map(e=> ({ a:e.a, b:e.b, count: e.orders.size, orderIds: includeOrderIds ? Array.from(e.orders).slice(0,maxEdgeOrderIds) : undefined }));
  const nodeList = Array.from(nodes.values());
  const result = { nodes: nodeList, edges: edgeList, orderCount: seenOrders.size, depthUsed: depth, truncated: nodes.size>=maxNodes || edges.size>=maxEdges };
  _cacheSet(cacheKey, result);
  return result;
}

module.exports = { buildLinkageGraph };
