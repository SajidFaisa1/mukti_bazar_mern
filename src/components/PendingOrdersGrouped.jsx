import React, { useState, useMemo } from 'react';

// Grouped view of pending (flagged) orders by purchaser UID
const PendingOrdersGrouped = ({
  orders = [],
  riskFilter = [],
  minRiskScore = 0,
  onDebug,
  onReview,
  onBanUser,
  onRequireVerification,
  processing = false,
  riskReasonMeta = {},
  selectable = false,
  onSelectionChange
}) => {
  const [collapsed, setCollapsed] = useState({});
  const [selected, setSelected] = useState(new Set());

  const toggleSelect = (orderId) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId); else next.add(orderId);
      onSelectionChange && onSelectionChange(Array.from(next));
      return next;
    });
  };

  const filtered = useMemo(() => orders.filter(order => {
    if (minRiskScore && (order.securityInfo?.riskScore || 0) < minRiskScore) return false;
    if (riskFilter.length && !order.securityInfo?.riskReasons?.some(r => riskFilter.includes(r))) return false;
    return true;
  }), [orders, minRiskScore, riskFilter]);

  const groups = useMemo(() => {
    const map = new Map();
    for (const o of filtered) {
      const key = o.uid || 'unknown';
      if (!map.has(key)) {
        // Derive display name prioritize vendor purchaser businessName when role=vendor
        let nm;
        if (o.role === 'vendor' && o.purchaserVendor) {
          nm = o.purchaserVendor.businessName || o.purchaserVendor.sellerName || o.purchaserVendor.uid;
        } else {
          nm = ((o.user?.firstName || o.user?.lastName) ? `${o.user?.firstName||''} ${o.user?.lastName||''}`.trim() : (o.user?.name)) || `UID: ${key}`;
        }
        map.set(key, {
          uid: key,
            name: nm,
          orders: [],
          totalValue: 0,
          maxRisk: 0,
          highestRiskLevel: 'low',
          riskReasons: new Set(),
          flagCount: 0,
          latestAt: null
        });
      }
      const g = map.get(key);
      g.orders.push(o);
      g.totalValue += o.total || 0;
  // Adjust risk score if negotiated (benefit / lower risk perception)
  const baseRisk = o.securityInfo?.riskScore || 0;
  const negotiated = o.negotiatedFlag || (o.negotiated?.isNegotiated);
  const rs = negotiated ? Math.max(0, baseRisk - 10) : baseRisk;
      if (rs > g.maxRisk) {
        g.maxRisk = rs;
        g.highestRiskLevel = o.securityInfo?.riskLevel || g.highestRiskLevel;
      }
      (o.securityInfo?.riskReasons||[]).forEach(r => g.riskReasons.add(r));
      g.flagCount += (o.suspiciousFlags || []).length;
      const ts = new Date(o.orderedAt).getTime();
      if (!g.latestAt || ts > g.latestAt) g.latestAt = ts;
    }
    return Array.from(map.values()).sort((a,b)=> b.maxRisk - a.maxRisk || b.latestAt - a.latestAt);
  }, [filtered]);

  if (!groups.length) {
    return <div className="text-center py-6 text-sm text-gray-500">No orders match filters</div>;
  }

  const riskLevelColor = (level) => level === 'critical' ? 'text-red-600' : level === 'high' ? 'text-orange-600' : level === 'medium' ? 'text-yellow-600' : 'text-green-600';

  return (
    <div className="divide-y">
      {groups.map(group => {
        const isCollapsed = collapsed[group.uid];
        return (
          <div key={group.uid} className="py-4">
            {/* Group Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 cursor-pointer" onClick={() => setCollapsed(c => ({...c, [group.uid]: !isCollapsed}))}>
              <div className="space-y-0.5">
                <div className="font-semibold text-gray-800 flex items-center gap-2">
                  <span>{group.name}</span>
                  <span className="text-xs text-gray-400">({group.uid})</span>
                </div>
                <div className="text-xs text-gray-500 flex flex-wrap gap-3 items-center">
                  <span>Orders: {group.orders.length}</span>
                  <span>Total: ৳{group.totalValue.toLocaleString()}</span>
                  <span>Flags: {group.flagCount}</span>
                  <span className={"font-medium "+riskLevelColor(group.highestRiskLevel)}>Max Risk: {group.maxRisk} ({group.highestRiskLevel})</span>
                  <span>Reasons: {group.riskReasons.size}</span>
                  {group.orders.some(o=> o.negotiatedFlag || (o.negotiated?.isNegotiated)) && (
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 font-medium border border-emerald-300">Negotiated Orders</span>
                  )}
                </div>
              </div>
              <button className="text-xs px-2 py-1 rounded bg-gray-200 hover:bg-gray-300" onClick={(e) => { e.stopPropagation(); setCollapsed(c => ({...c, [group.uid]: !isCollapsed}));}}>
                {isCollapsed ? 'Expand' : 'Collapse'}
              </button>
            </div>
            {/* Orders List */}
            {!isCollapsed && (
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {group.orders.sort((a,b)=> new Date(b.orderedAt)-new Date(a.orderedAt)).map(o => (
                  <div key={o._id} className={"border rounded-lg p-3 text-xs bg-white shadow-sm hover:shadow transition relative "+(selectable && selected.has(o._id)?'ring-2 ring-indigo-400':'')}> 
                    {selectable && (
                      <label className="absolute top-2 left-2 bg-white bg-opacity-80 rounded px-1 py-0.5 flex items-center gap-1 text-[10px] cursor-pointer">
                        <input type="checkbox" checked={selected.has(o._id)} onChange={()=>toggleSelect(o._id)} />
                        <span>Select</span>
                      </label>
                    )}
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium text-gray-800">{o.orderNumber}</div>
                        <div className="text-[10px] text-gray-400">{new Date(o.orderedAt).toLocaleString()}</div>
                      </div>
                      <div className={"flex flex-col items-end gap-1"}>
                        <div className={"font-semibold "+riskLevelColor(o.securityInfo?.riskLevel)}>R{ (o.negotiatedFlag || (o.negotiated?.isNegotiated)) ? Math.max(0,(o.securityInfo?.riskScore||0)-10) : (o.securityInfo?.riskScore ?? 0) }</div>
                        {(o.negotiatedFlag || (o.negotiated?.isNegotiated)) && (
                          <span className="inline-flex items-center rounded bg-emerald-100 text-emerald-700 px-1.5 py-0.5 text-[9px] font-semibold border border-emerald-300">NEG</span>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 space-y-1">
                      <div>Amount: <span className="font-medium">৳{(o.total||0).toLocaleString()}</span></div>
                      <div>Items: {o.itemCount || 0}</div>
                      {(o.negotiatedFlag || (o.negotiated?.isNegotiated)) && (
                        <div className="text-emerald-600 font-medium">Negotiated</div>
                      )}
                      {(o.suspiciousFlags||[]).length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {(o.suspiciousFlags||[]).map((f,i)=>(
                            <span key={i} className="px-1.5 py-0.5 rounded-full bg-gray-100 text-[10px] capitalize">{f.type}</span>
                          ))}
                        </div>
                      )}
                      {(o.securityInfo?.riskReasons||[]).length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {o.securityInfo.riskReasons.map((r,i)=> {
                            const meta = riskReasonMeta[r];
                            return (
                              <span key={i} title={meta?.desc || r} className={(meta?.cls || 'bg-gray-100 text-gray-700')+ ' rounded px-1.5 py-0.5 text-[9px] uppercase tracking-wide'}>
                                {meta?.label || r.replace(/_/g,' ')}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button onClick={()=> onDebug(o.orderNumber)} disabled={processing} className="flex-1 px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded disabled:opacity-50">Debug</button>
                      <button onClick={()=> onReview(o._id,'approve','Approved by admin')} disabled={processing} className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded disabled:opacity-50">Approve</button>
                      <button onClick={()=> onReview(o._id,'reject','Rejected by admin')} disabled={processing} className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded disabled:opacity-50">Reject</button>
                      {o.role !== 'vendor' && o.user && (
                        <>
                          <button onClick={()=> onBanUser && onBanUser(o.user._id)} disabled={processing} className="px-2 py-1 bg-red-100 text-red-700 rounded disabled:opacity-50 text-[10px]">Ban</button>
                          {(!o.user?.verification?.status || o.user?.verification?.status === 'unverified') && (
                            <button onClick={()=> onRequireVerification && onRequireVerification(o.user._id)} disabled={processing} className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded disabled:opacity-50 text-[10px]">Ask Verify</button>
                          )}
                          {o.user?.verification?.status && o.user.verification.status !== 'unverified' && (
                            <span className={`px-2 py-1 rounded text-[10px] border capitalize ${
                              o.user.verification.status === 'verified' ? 'bg-emerald-100 text-emerald-700 border-emerald-300' :
                              o.user.verification.status === 'required' ? 'bg-yellow-100 text-yellow-700 border-yellow-300' :
                              o.user.verification.status === 'pending' ? 'bg-indigo-100 text-indigo-700 border-indigo-300' :
                              o.user.verification.status === 'rejected' ? 'bg-red-100 text-red-700 border-red-300' : 'bg-gray-100 text-gray-600 border-gray-300'
                            }`}>{o.user.verification.status}</span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default PendingOrdersGrouped;
