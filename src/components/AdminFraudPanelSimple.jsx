import React, { useState, useEffect } from 'react';
import PendingOrdersGrouped from './PendingOrdersGrouped';
import UserModerationPanel from './UserModerationPanel';
import FraudMetricsCards from './fraud/FraudMetricsCards';
import NegotiationDiscountAnalytics from './fraud/NegotiationDiscountAnalytics';
import VelocitySnapshot from './fraud/VelocitySnapshot';
import WatchlistManager from './fraud/WatchlistManager';
import RuleManager from './fraud/RuleManager';
import CaseManager from './fraud/CaseManager';
import { useAdminAuth } from '../contexts/AdminAuthContext';

// Risk reason metadata for color coding & tooltip descriptions
const RISK_REASON_META = {
  HIGH_VALUE: { label: 'High value', cat: 'value', cls: 'bg-red-100 text-red-700', desc: 'Order total exceeded the high value threshold.' },
  VERY_HIGH_VALUE: { label: 'Very high value', cat: 'value', cls: 'bg-red-200 text-red-800', desc: 'Order total exceeded the critical value threshold.' },
  BULK_QTY: { label: 'Bulk quantity', cat: 'quantity', cls: 'bg-orange-100 text-orange-700', desc: 'Large total quantity of items in this order.' },
  MULTI_ORDERS_24H: { label: 'Multiple orders 24h', cat: 'velocity', cls: 'bg-yellow-100 text-yellow-700', desc: 'User placed several orders within 24 hours.' },
  RAPID_ORDERS_24H: { label: 'Rapid orders 24h', cat: 'velocity', cls: 'bg-yellow-200 text-yellow-800', desc: 'High frequency of orders in short time window.' },
  DEVICE_REUSE: { label: 'Device reuse', cat: 'device', cls: 'bg-blue-100 text-blue-700', desc: 'Device fingerprint observed with multiple accounts.' },
  DEVICE_REUSE_HIGH: { label: 'Device reuse high', cat: 'device', cls: 'bg-blue-200 text-blue-800', desc: 'Device fingerprint shared across many accounts.' },
  IP_SHARED: { label: 'Shared IP', cat: 'network', cls: 'bg-indigo-100 text-indigo-700', desc: 'IP address seen with multiple users recently.' },
  SEVERE_FLAGS: { label: 'Severe flags', cat: 'composite', cls: 'bg-fuchsia-100 text-fuchsia-700', desc: 'One or more high / critical severity rule flags triggered.' }
  ,WATCHLIST_UID: { label: 'WL User', cat: 'watchlist', cls: 'bg-rose-100 text-rose-700', desc: 'User is on watchlist.' }
  ,WATCHLIST_VENDOR: { label: 'WL Vendor', cat: 'watchlist', cls: 'bg-fuchsia-100 text-fuchsia-700', desc: 'Vendor is on watchlist.' }
  ,WATCHLIST_DEVICE: { label: 'WL Device', cat: 'watchlist', cls: 'bg-rose-50 text-rose-700', desc: 'Device fingerprint on watchlist.' }
  ,WATCHLIST_IP: { label: 'WL IP', cat: 'watchlist', cls: 'bg-rose-200 text-rose-800', desc: 'IP address on watchlist.' }
};

const AdminFraudPanel = () => {
  const { token } = useAdminAuth();
  const [pendingOrders, setPendingOrders] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [debugData, setDebugData] = useState(null);
  const [showDebug, setShowDebug] = useState(false);
  // Tier 1 additions
  const [metrics, setMetrics] = useState(null);
  const [metricsWindow, setMetricsWindow] = useState('24h');
  const [riskFilter, setRiskFilter] = useState([]); // selected risk reasons
  const [minRiskScore, setMinRiskScore] = useState(0);
  const [watchlist, setWatchlist] = useState({ users: [], vendors: [], devices: [], ips: [] });
  const [groupedView, setGroupedView] = useState(true);
  const [extRecomputeRunning, setExtRecomputeRunning] = useState(false);
  const [extDays, setExtDays] = useState(30);
  const [extLimit, setExtLimit] = useState(300);
  const [selectForCase,setSelectForCase] = useState(false);
  const [selectedOrderIds,setSelectedOrderIds] = useState([]);
  const [selectedEntities,setSelectedEntities] = useState([]);
  // Lightweight toast notifications
  const [toasts,setToasts] = useState([]); // {id, type, msg}
  const pushToast = (type, msg, ttl=4000) => {
    const id = Date.now()+Math.random();
    setToasts(t=>[...t,{id,type,msg}]);
    setTimeout(()=> setToasts(t=> t.filter(x=> x.id!==id)), ttl);
  };

  const findAddedBy = (type, value) => {
    if (!value) return null;
    const col = (watchlist[type+'s']) || [];
    const entry = col.find(w => (w.value || w) === value);
    return entry?.addedBy || null;
  };

  const runExtendedRecompute = async () => {
    try {
      setExtRecomputeRunning(true);
      const res = await fetch('http://localhost:5005/api/admin-panel/recompute-risk-extended', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type':'application/json' },
        body: JSON.stringify({ days: extDays, limit: extLimit })
      });
      const data = await res.json();
      if (res.ok) {
        alert(`Extended recompute complete. Updated ${data.updated}/${data.total}`);
        fetchData();
      } else {
        alert(data.error || 'Extended recompute failed');
      }
    } catch (e) { console.error(e); }
    finally { setExtRecomputeRunning(false); }
  };

  useEffect(() => {
    if (!token) return;
    fetchData();
    fetchMetrics(metricsWindow);
  }, [token]);

  const fetchMetrics = async (window = metricsWindow) => {
    try {
      const res = await fetch(`http://localhost:5005/api/admin-panel/metrics?window=${window}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
        setWatchlist(data.watchlist || watchlist);
      }
    } catch (e) {
      console.error('Metrics fetch error', e);
    }
  };

  const toggleWatchlist = async (type, id) => {
    try {
      const res = await fetch(`http://localhost:5005/api/admin-panel/watchlist/${type}/${id}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setWatchlist(data.watchlist);
      }
    } catch (e) { console.error('Watchlist toggle error', e); }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch pending orders
      const ordersResponse = await fetch('http://localhost:5005/api/admin-panel/pending-orders', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Fetch dashboard data
      const dashboardResponse = await fetch('http://localhost:5005/api/admin-panel/fraud-dashboard', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (ordersResponse.ok) {
        const ordersData = await ordersResponse.json();
        const norm = (ordersData.orders || []).map(o => {
          const verificationStatus = o.user?.verification?.status || o.purchaserUser?.verification?.status;
          return {
            ...o,
            userVerificationStatus: verificationStatus,
            securityInfo: {
              ...(o.securityInfo||{}),
              riskReasons: Array.from(new Set([...
                (o.securityInfo?.riskReasons||[]),
                ...(o.suspiciousFlags||[]).map(f => f.type?.toUpperCase())
              ].filter(Boolean)))
            },
            negotiatedFlag: o.isNegotiated || (o.negotiated?.isNegotiated)
          };
        });
        setPendingOrders(norm);
      }
      
      if (dashboardResponse.ok) {
        const dashboardData = await dashboardResponse.json();
        setDashboardData(dashboardData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshFraudDetection = async () => {
    try {
      setProcessing(true);
      const response = await fetch('http://localhost:5005/api/debug-fraud/refresh-fraud-detection', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        alert(`Fraud detection refreshed! Updated ${result.updatedCount} orders.`);
        await fetchData(); // Refresh the data
      }
    } catch (error) {
      console.error('Error refreshing fraud detection:', error);
      alert('Error refreshing fraud detection');
    } finally {
      setProcessing(false);
    }
  };

  const debugOrder = async (orderNumber) => {
    try {
      const response = await fetch(`http://localhost:5005/api/debug-fraud/order/${orderNumber}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        setDebugData(result);
        setShowDebug(true);
      }
    } catch (error) {
      console.error('Error debugging order:', error);
      alert('Error debugging order');
    }
  };

  const fetchRecentOrders = async () => {
    try {
      const response = await fetch('http://localhost:5005/api/debug-fraud/recent-orders?limit=100&days=30', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        setDebugData(result);
        setShowDebug(true);
      }
    } catch (error) {
      console.error('Error fetching recent orders:', error);
      alert('Error fetching recent orders');
    }
  };

  const reviewOrder = async (orderId, action, reason = '') => {
    setProcessing(true);
    try {
      const response = await fetch(`http://localhost:5005/api/admin-panel/orders/${orderId}/review`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action, reason })
      });
      if (!response.ok) throw new Error('Request failed');
      const data = await response.json();

      // Optimistic local update: remove the order from pending list (it is no longer pending)
      setPendingOrders(prev => prev.filter(o => o._id !== orderId));
      // If it was part of selected orders for case creation, update selections
      setSelectedOrderIds(prev => prev.filter(id => id !== orderId));
      if (selectedEntities.length) {
        // Recompute entities from remaining selected orders for consistency
        setSelectedEntities(prev => {
          const remaining = pendingOrders.filter(o => o._id !== orderId && selectedOrderIds.includes(o._id));
          const ents = [];
          remaining.forEach(o => {
            if (o.uid) ents.push({ type: 'uid', value: o.uid });
            const vendId = o.vendor?._id || (typeof o.vendor === 'string' ? o.vendor : null);
            if (vendId) ents.push({ type: 'vendor', value: vendId });
            if (o.securityInfo?.deviceFingerprint) ents.push({ type: 'device', value: o.securityInfo.deviceFingerprint });
            if (o.securityInfo?.ipAddress) ents.push({ type: 'ip', value: o.securityInfo.ipAddress });
          });
          const uniq = [];
            const seen = new Set();
            ents.forEach(e => { const k = e.type + ':' + e.value; if (!seen.has(k)) { seen.add(k); uniq.push(e); } });
          return uniq;
        });
      }
      // Refresh lightweight metrics only (avoid full panel refetch)
      fetchMetrics(metricsWindow);
  pushToast('success', data?.message || `Order ${action}ed successfully!`);
    } catch (error) {
      console.error('Error reviewing order:', error);
  pushToast('error', error.message || 'Error reviewing order');
    } finally {
      setProcessing(false);
    }
  };

  const banUser = async (userId) => {
    if (!window.confirm('Ban this user? They will be blocked from purchasing.')) return;
    try {
      const res = await fetch(`http://localhost:5005/api/user-moderation/${userId}/ban`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type':'application/json' },
        body: JSON.stringify({ reason: 'Fraud risk / manual review' })
      });
      const data = await res.json();
      if (res.ok) {
        alert('User banned');
      } else {
        alert(data.error || 'Failed to ban');
      }
    } catch (e) { console.error(e); }
  };

  const requireVerification = async (userId) => {
    try {
      const res = await fetch(`http://localhost:5005/api/user-moderation/${userId}/require-verification`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        // Optimistically update any pending orders for this user
        setPendingOrders(prev => prev.map(o => {
          const matches = o.user?._id === userId || o.purchaserUser?._id === userId;
          if (!matches) return o;
          return {
            ...o,
            userVerificationStatus: 'required',
            user: o.user ? { ...o.user, verification: { ...(o.user.verification||{}), status: 'required' } } : o.user,
            purchaserUser: o.purchaserUser ? { ...o.purchaserUser, verification: { ...(o.purchaserUser.verification||{}), status: 'required' } } : o.purchaserUser
          };
        }));
        pushToast('success','Verification marked required');
      } else {
        pushToast('error', data.error || 'Failed to set verification requirement');
      }
    } catch (e) { console.error(e); }
  };

  const formatCurrency = (amount) => {
    return `৳${amount?.toLocaleString() || 0}`;
  };

  const getSeverityClass = (severity) => {
    const classes = {
      low: 'bg-yellow-100 text-yellow-800',
      medium: 'bg-orange-100 text-orange-800',
      high: 'bg-red-100 text-red-800',
      critical: 'bg-red-200 text-red-900'
    };
    return classes[severity] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading admin panel...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* High-level metrics including negotiated orders */}
  {metrics && <FraudMetricsCards metrics={metrics} watchlist={watchlist} />}
  {metrics?.negotiatedAnalytics && <NegotiationDiscountAnalytics analytics={metrics.negotiatedAnalytics} />}
  {metrics?.velocityAverages && <VelocitySnapshot averages={metrics.velocityAverages} />}
  <div className="my-6">
    <WatchlistManager />
  </div>
  <RuleManager />
  <CaseManager selectedOrderEntities={selectedEntities} />
        <div className="mb-6">
          <UserModerationPanel refreshCallback={fetchData} />
        </div>

  {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <h3 className="font-semibold text-sm mb-2">Filters</h3>
          <div className="flex flex-wrap gap-2 mb-4">
            {Object.entries(RISK_REASON_META).map(([key, meta]) => {
              const active = riskFilter.includes(key);
              return (
                <button
                  key={key}
                  onClick={() => setRiskFilter(active ? riskFilter.filter(r => r!==key) : [...riskFilter, key])}
                  className={`text-[10px] px-2 py-1 rounded border ${active ? meta.cls + ' ring-1 ring-offset-1' : 'bg-gray-100 text-gray-600'}`}
                  title={meta.desc}
                >{meta.label}</button>
              );
            })}
          </div>
          <div className="flex items-center gap-4">
            <label className="text-xs font-medium">Min Risk Score: {minRiskScore}</label>
            <input type="range" min="0" max="150" value={minRiskScore} onChange={e => setMinRiskScore(parseInt(e.target.value))} />
            <button onClick={() => { setRiskFilter([]); setMinRiskScore(0); }} className="text-xs px-2 py-1 bg-gray-200 rounded">Reset</button>
          </div>
        </div>

        {/* Pending Orders (Table or Grouped) */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b flex justify-between items-center">
            <h2 className="text-xl font-semibold">
              Orders Requiring Review ({pendingOrders.length})
            </h2>
            <div className="flex gap-2">
              <div className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">
                <input type="number" min="1" className="w-14 text-xs border rounded px-1 py-0.5" value={extDays} onChange={e=>setExtDays(parseInt(e.target.value)||1)} title="Days window" />
                <input type="number" min="1" className="w-16 text-xs border rounded px-1 py-0.5" value={extLimit} onChange={e=>setExtLimit(parseInt(e.target.value)||50)} title="Max orders" />
                <button onClick={runExtendedRecompute} disabled={extRecomputeRunning} className="text-xs px-2 py-1 bg-indigo-600 text-white rounded disabled:opacity-50" title="Recompute recent orders with velocity/discount/watchlist factors">{extRecomputeRunning ? 'Recomputing...' : 'Recompute+'}</button>
              </div>
              <button
                onClick={() => setGroupedView(g => !g)}
                className="px-4 py-2 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
              >{groupedView ? 'List View' : 'Grouped View'}</button>
              <button onClick={()=> setSelectForCase(s=> !s)} className={`px-4 py-2 ${selectForCase?'bg-indigo-700':'bg-indigo-600'} text-white text-sm rounded hover:bg-indigo-700`}>{selectForCase? 'Cancel Select':'Select Orders'}</button>
              <button
                onClick={fetchRecentOrders}
                disabled={processing}
                className="px-4 py-2 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 disabled:opacity-50"
              >
                🔍 Debug All Orders
              </button>
              <button
                onClick={refreshFraudDetection}
                disabled={processing}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {processing ? 'Refreshing...' : '🔄 Refresh Fraud Detection'}
              </button>
            </div>
          </div>

          {pendingOrders.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No pending orders for review</p>
            </div>
          ) : groupedView ? (
            <div className="p-4">
              <PendingOrdersGrouped
                orders={pendingOrders}
                riskFilter={riskFilter}
                minRiskScore={minRiskScore}
                onDebug={debugOrder}
                onReview={reviewOrder}
                onBanUser={banUser}
                onRequireVerification={requireVerification}
                processing={processing}
                riskReasonMeta={RISK_REASON_META}
                selectable={selectForCase}
                onSelectionChange={(ids)=>{
                  setSelectedOrderIds(ids);
                  const chosen = pendingOrders.filter(o=> ids.includes(o._id));
                  // Build entity list (uid, vendor id, device, ip)
                  const ents = [];
                  chosen.forEach(o => {
                    if(o.uid) ents.push({ type:'uid', value:o.uid });
                    const vendId = o.vendor?._id || (typeof o.vendor === 'string'? o.vendor: null);
                    if(vendId) ents.push({ type:'vendor', value: vendId });
                    if(o.securityInfo?.deviceFingerprint) ents.push({ type:'device', value: o.securityInfo.deviceFingerprint });
                    if(o.securityInfo?.ipAddress) ents.push({ type:'ip', value: o.securityInfo.ipAddress });
                  });
                  const uniq = [];
                  const seen = new Set();
                  ents.forEach(e => { const k = e.type+':'+e.value; if(!seen.has(k)){ seen.add(k); uniq.push(e); }});
                  setSelectedEntities(uniq);
                }}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              {/* Legend */}
              <div className="px-6 pt-4 pb-2 flex flex-wrap gap-2 text-[11px]">
                {Object.entries(RISK_REASON_META)
                  .sort((a,b)=> a[1].cat.localeCompare(b[1].cat) || a[0].localeCompare(b[0]))
                  .map(([k, v]) => (
                  <span key={k} className={`px-2 py-1 rounded ${v.cls}`} title={`${v.desc || ''} (${v.cat})`}>
                    {v.label}
                  </span>
                ))}
              </div>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Order
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Flags
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Security Info
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Risk Reasons
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {pendingOrders
                    .filter(order => {
                      if (minRiskScore && (order.securityInfo?.riskScore||0) < minRiskScore) return false;
                      if (riskFilter.length && !order.securityInfo?.riskReasons?.some(r => riskFilter.includes(r))) return false;
                      return true;
                    })
                    .map((order) => (
                    <tr key={order._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {order.orderNumber}
                              {order.negotiatedFlag && <span className="ml-2 inline-flex items-center rounded bg-emerald-100 text-emerald-700 px-1 py-0.5 text-[10px] font-semibold border border-emerald-300">NEG</span>}
                        </div>
                        <div className="text-sm text-gray-500">
                          {order.itemCount || 0} items
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {order.role === 'vendor' && order.purchaserVendor ? (
                          <>
                            <div className="text-sm text-gray-900 flex items-center gap-1">{order.purchaserVendor.businessName || order.purchaserVendor.sellerName || order.purchaserVendor.uid}
                              {watchlist.vendors?.some(v => (v.value||v) === (order.purchaserVendor.uid || order.vendor?._id)) && <span className="inline-block px-1 py-0.5 bg-fuchsia-100 text-fuchsia-700 rounded text-[9px]" title={`Vendor watchlist (added by ${findAddedBy('vendor', order.purchaserVendor.uid)||'unknown'})`}>WL</span>}
                            </div>
                            <div className="text-sm text-gray-500">{order.purchaserVendor.email || '—'}</div>
                          </>
                        ) : (
                          <>
                            <div className="text-sm text-gray-900 flex items-center gap-1">
                              <span>{ (order.user?.firstName || order.user?.lastName) ? `${order.user?.firstName||''} ${order.user?.lastName||''}`.trim() : (order.user?.name || '—') }</span>
                              {watchlist.users?.some(u => (u.value||u) === order.uid) && <span className="inline-block px-1 py-0.5 bg-red-100 text-red-700 rounded text-[9px]" title={`User watchlist (added by ${findAddedBy('user', order.uid)||'unknown'})`}>WL</span>}
                              {watchlist.vendors?.some(v => (v.value||v) === (order.vendor?._id || order.vendor)) && <span className="inline-block px-1 py-0.5 bg-fuchsia-100 text-fuchsia-700 rounded text-[9px]" title={`Vendor watchlist (added by ${findAddedBy('vendor', (order.vendor?._id || order.vendor))||'unknown'})`}>V-WL</span>}
                            </div>
                            <div className="text-sm text-gray-500">
                              {order.user?.email}
                            </div>
                            {order.user && (
                              <div className="flex flex-wrap gap-1 mt-1 items-center">
                                <button
                                  onClick={() => banUser(order.user._id)}
                                  className="text-[10px] px-2 py-0.5 bg-red-100 text-red-700 rounded hover:bg-red-200"
                                >Ban</button>
                                {(!order.userVerificationStatus || order.userVerificationStatus === 'unverified') && (
                                  <button
                                    onClick={() => requireVerification(order.user._id)}
                                    className="text-[10px] px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200"
                                  >Ask Verify</button>
                                )}
                                {order.userVerificationStatus && order.userVerificationStatus !== 'unverified' && (
                                  <span className={`text-[10px] px-2 py-0.5 rounded border capitalize ${
                                    order.userVerificationStatus === 'verified' ? 'bg-emerald-100 text-emerald-700 border-emerald-300' :
                                    order.userVerificationStatus === 'required' ? 'bg-yellow-100 text-yellow-700 border-yellow-300' :
                                    order.userVerificationStatus === 'pending' ? 'bg-indigo-100 text-indigo-700 border-indigo-300' :
                                    order.userVerificationStatus === 'rejected' ? 'bg-red-100 text-red-700 border-red-300' : 'bg-gray-100 text-gray-600 border-gray-300'
                                  }`}>{order.userVerificationStatus}</span>
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {formatCurrency(order.total)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {(order.suspiciousFlags || []).map((flag, index) => (
                            <span
                              key={index}
                              className={`px-2 py-1 text-xs rounded-full ${getSeverityClass(flag.severity)}`}
                            >
                              {flag.type}
                            </span>
                          ))}
                          {order.negotiatedFlag && <span className="px-2 py-1 text-xs rounded-full bg-emerald-100 text-emerald-700 border border-emerald-300">Negotiated</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs text-gray-600 space-y-1">
                          {order.securityInfo?.ipAddress && (
                            <div>
                              🌐 IP: {order.securityInfo.ipAddress.substring(0, 12)}...
                              {watchlist.ips?.some(ip => (ip.value||ip) === order.securityInfo.ipAddress) && <span className="ml-1 inline-block px-1 py-0.5 bg-red-100 text-red-700 rounded text-[9px]" title={`IP watchlist (added by ${findAddedBy('ip', order.securityInfo.ipAddress)||'unknown'})`}>WL</span>}
                            </div>
                          )}
                          {order.securityInfo?.deviceFingerprint && (
                            <div>
                              📱 Device: {order.securityInfo.deviceFingerprint}
                              {watchlist.devices?.some(d => (d.value||d) === order.securityInfo.deviceFingerprint) && <span className="ml-1 inline-block px-1 py-0.5 bg-red-100 text-red-700 rounded text-[9px]" title={`Device watchlist (added by ${findAddedBy('device', order.securityInfo.deviceFingerprint)||'unknown'})`}>WL</span>}
                            </div>
                          )}
                          {order.securityInfo?.riskLevel && (
                            <div className={`font-semibold ${
                              order.securityInfo.riskLevel === 'critical' ? 'text-red-600' :
                              order.securityInfo.riskLevel === 'high' ? 'text-orange-600' :
                              order.securityInfo.riskLevel === 'medium' ? 'text-yellow-600' :
                              'text-green-600'
                            }`}>
                              Risk: {order.securityInfo.riskLevel.toUpperCase()} {order.securityInfo?.riskScore != null && `(${order.securityInfo.riskScore})`}
                            </div>
                          )}
                          {order.securityInfo?.isProxy && (
                            <div className="text-orange-600">⚠️ Proxy/VPN</div>
                          )}
                          {order.securityInfo?.automationDetected && (
                            <div className="text-red-600">🤖 Bot Detected</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {order.securityInfo?.riskReasons && order.securityInfo.riskReasons.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-[180px]">
                            {order.securityInfo.riskReasons.map((r, idx) => (
                              (() => {
                                const meta = RISK_REASON_META[r];
                                return (
                                  <span
                                    key={idx}
                                    title={meta?.desc || r.replace(/_/g,' ')}
                                    className={`${meta?.cls || 'bg-gray-100 text-gray-700'} text-[10px] px-2 py-1 rounded uppercase tracking-wide`}
                                  >
                                    {(meta?.label || r.replace(/_/g,' '))}
                                  </span>
                                );
                              })()
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => debugOrder(order.orderNumber)}
                            disabled={processing}
                            className="px-2 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700 disabled:opacity-50"
                          >
                            Debug
                          </button>
                          <button
                            onClick={() => reviewOrder(order._id, 'approve', 'Approved by admin')}
                            disabled={processing}
                            className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => reviewOrder(order._id, 'reject', 'Rejected due to security concerns')}
                            disabled={processing}
                            className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Debug Modal */}
        {showDebug && debugData && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-6xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
                <h3 className="text-xl font-semibold">
                  {debugData.order ? `Debug: ${debugData.order.orderNumber}` : 'All Recent Orders'}
                </h3>
                <button
                  onClick={() => setShowDebug(false)}
                  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  Close
                </button>
              </div>
              
              <div className="p-6">
                {debugData.order ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <div className="lg:col-span-1">
                        <h4 className="font-semibold mb-2">Order Summary</h4>
                        <div className="bg-gray-50 p-4 rounded text-sm space-y-2">
                          <p><strong>Order #:</strong> {debugData.order.orderNumber}</p>
                          <p><strong>Total:</strong> ৳{debugData.order.total}</p>
                          <p><strong>Quantity:</strong> {debugData.order.analysis.totalQuantity} items</p>
                          <p><strong>Flags:</strong> {debugData.order.analysis.flagCount}</p>
                          <p><strong>Requires Approval:</strong> {debugData.order.requiresApproval ? '✅ Yes' : '❌ No'}</p>
                          {debugData.order.securityInfo?.riskScore != null && (
                            <p><strong>Risk Score:</strong> {debugData.order.securityInfo.riskScore} ({debugData.order.securityInfo.riskLevel})</p>
                          )}
                          {debugData.order.securityInfo?.riskReasons?.length > 0 && (
                            <div>
                              <strong>Risk Reasons:</strong>
                              <div className="mt-1">
                                {debugData.order.securityInfo.riskReasons.map((r,i) => {
                                  const meta = RISK_REASON_META[r];
                                  return (
                                    <span key={i} title={meta?.desc || r.replace(/_/g,' ')} className={`inline-block ${meta?.cls || 'bg-gray-200 text-gray-700'} text-[10px] px-1 py-0.5 rounded mr-1 mt-1`}>
                                      {meta?.label || r.replace(/_/g,' ')}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                          {debugData.order.securityInfo?.watchlistHits && (
                            <div className="mt-2">
                              <strong>Watchlist Hits:</strong>
                              <ul className="text-xs list-disc ml-4 mt-1 space-y-1">
                                {Object.entries(debugData.order.securityInfo.watchlistHits).filter(([k,v])=>v).map(([k]) => (
                                  <li key={k}>
                                    {k}
                                    {(() => {
                                      const meta = debugData.order.securityInfo.watchlistMeta?.[k];
                                      if (!meta) return null;
                                      return <span className="ml-1 text-gray-500">(added by {meta.addedBy || 'unknown'}{meta.notes ? `: ${meta.notes}` : ''})</span>;
                                    })()}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="lg:col-span-1">
                        <h4 className="font-semibold mb-2">Purchaser Details</h4>
                        <div className="bg-gray-50 p-4 rounded text-sm space-y-2">
                          {debugData.order.purchaserVendor ? (
                            <>
                              <p><strong>Type:</strong> Vendor</p>
                              <p><strong>Business:</strong> {debugData.order.purchaserVendor.businessName}</p>
                              {debugData.order.purchaserVendor.sellerName && <p><strong>Seller:</strong> {debugData.order.purchaserVendor.sellerName}</p>}
                              <p><strong>UID:</strong> {debugData.order.purchaserVendor.uid}</p>
                              {debugData.order.purchaserVendor.email && <p><strong>Email:</strong> {debugData.order.purchaserVendor.email}</p>}
                              {debugData.order.purchaserVendor.phone && <p><strong>Phone:</strong> {debugData.order.purchaserVendor.phone}</p>}
                              {debugData.order.securityInfo?.watchlistHits?.vendor && (
                                <p className="text-rose-600 text-xs"><strong>Watchlist:</strong> Yes {debugData.order.securityInfo.watchlistMeta?.vendor?.addedBy && `(added by ${debugData.order.securityInfo.watchlistMeta.vendor.addedBy})`}{debugData.order.securityInfo.watchlistMeta?.vendor?.notes && ` - ${debugData.order.securityInfo.watchlistMeta.vendor.notes}`}</p>
                              )}
                            </>
                          ) : debugData.order.purchaserUser ? (
                            <>
                              <p><strong>Type:</strong> User</p>
                              <p><strong>Name:</strong> { (debugData.order.purchaserUser.firstName || debugData.order.purchaserUser.lastName) ? `${debugData.order.purchaserUser.firstName||''} ${debugData.order.purchaserUser.lastName||''}`.trim() : (debugData.order.purchaserUser.displayName || debugData.order.purchaserUser.name || '—') }</p>
                              {debugData.order.purchaserUser.uid && <p><strong>UID:</strong> {debugData.order.purchaserUser.uid}</p>}
                              {debugData.order.purchaserUser.email && <p><strong>Email:</strong> {debugData.order.purchaserUser.email}</p>}
                              {debugData.order.purchaserUser.phone && <p><strong>Phone:</strong> {debugData.order.purchaserUser.phone}</p>}
                              {debugData.order.securityInfo?.watchlistHits?.uid && (
                                <p className="text-rose-600 text-xs"><strong>Watchlist:</strong> Yes {debugData.order.securityInfo.watchlistMeta?.user?.addedBy && `(added by ${debugData.order.securityInfo.watchlistMeta.user.addedBy})`}{debugData.order.securityInfo.watchlistMeta?.user?.notes && ` - ${debugData.order.securityInfo.watchlistMeta.user.notes}`}</p>
                              )}
                            </>
                          ) : <p className="text-sm text-gray-500">No purchaser info</p>}
                        </div>
                      </div>
                      <div className="lg:col-span-1">
                        <h4 className="font-semibold mb-2">Seller Vendor</h4>
                        <div className="bg-gray-50 p-4 rounded text-sm space-y-2">
                          {debugData.order.sellerVendor ? (
                            <>
                              <p><strong>Business:</strong> {debugData.order.sellerVendor.businessName}</p>
                              {debugData.order.sellerVendor.sellerName && <p><strong>Seller:</strong> {debugData.order.sellerVendor.sellerName}</p>}
                              {debugData.order.sellerVendor.uid && <p><strong>Vendor UID:</strong> {debugData.order.sellerVendor.uid}</p>}
                              {debugData.order.sellerVendor.email && <p><strong>Email:</strong> {debugData.order.sellerVendor.email}</p>}
                              {debugData.order.sellerVendor.phone && <p><strong>Phone:</strong> {debugData.order.sellerVendor.phone}</p>}
                            </>
                          ) : <p className="text-sm text-gray-500">No seller vendor info</p>}
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Analysis</h4>
                      <div className="bg-gray-50 p-4 rounded text-sm grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <p><strong>Device Fingerprint:</strong> {debugData.order.analysis.hasDeviceFingerprint ? '✅ Yes' : '❌ No'}</p>
                          <p><strong>Rapid Ordering:</strong> {debugData.order.analysis.isRapidOrdering ? '✅ Yes' : '❌ No'}</p>
                          <p><strong>User Orders 24h:</strong> {debugData.order.analysis.userOrderCount}</p>
                          <p><strong>Device Shared:</strong> {debugData.order.analysis.deviceSharedWith}</p>
                        </div>
                        <div className="space-y-2">
                          <p><strong>Quantity Threshold:</strong> {debugData.order.analysis.meetsQuantityThreshold ? '✅ Met' : '❌ No'}</p>
                          <p><strong>Value Threshold:</strong> {debugData.order.analysis.meetsValueThreshold ? '✅ Met' : '❌ No'}</p>
                          <p><strong>Total Value:</strong> ৳{debugData.order.total}</p>
                          <p><strong>Total Qty:</strong> {debugData.order.analysis.totalQuantity}</p>
                        </div>
                        <div className="space-y-2 text-xs">
                          {debugData.order.deviceCapture && (
                            <div className="space-y-1">
                              <p><strong>IP:</strong> {debugData.order.deviceCapture.ipAddress || '—'}</p>
                              <p><strong>FP ID:</strong> {debugData.order.deviceCapture.deviceFingerprint || '—'}</p>
                              <p><strong>User Agent:</strong> {debugData.order.deviceCapture.userAgent ? <span className="break-all">{debugData.order.deviceCapture.userAgent}</span> : '—'}</p>
                              {debugData.order.deviceCapture.missing?.length > 0 && (<p className="text-red-600"><strong>Missing:</strong> {debugData.order.deviceCapture.missing.join(', ')}</p>)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    {debugData.order.analysis.reasons.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2">Reasons Not Flagged</h4>
                        <div className="bg-yellow-50 p-4 rounded">
                          {debugData.order.analysis.reasons.map((reason, idx) => (<p key={idx} className="text-sm">⚠️ {reason}</p>))}
                        </div>
                      </div>
                    )}
                    <div>
                      <h4 className="font-semibold mb-2">Recommendations</h4>
                      <div className="bg-blue-50 p-4 rounded">
                        {debugData.recommendations.map((rec, idx) => (<p key={idx} className="text-sm">{rec}</p>))}
                      </div>
                    </div>
                  </div>
                ) : (
                  // Recent orders debug
                  <div className="space-y-6">
                    <div className="grid grid-cols-4 gap-4">
                      <div className="bg-gray-50 p-4 rounded text-center">
                        <h4 className="font-semibold">Total Orders</h4>
                        <p className="text-2xl font-bold">{debugData.stats.total}</p>
                      </div>
                      <div className="bg-red-50 p-4 rounded text-center">
                        <h4 className="font-semibold">Flagged</h4>
                        <p className="text-2xl font-bold text-red-600">{debugData.stats.flagged}</p>
                      </div>
                      <div className="bg-yellow-50 p-4 rounded text-center">
                        <h4 className="font-semibold">Unflagged</h4>
                        <p className="text-2xl font-bold text-yellow-600">{debugData.stats.unflagged}</p>
                      </div>
                      <div className="bg-orange-50 p-4 rounded text-center">
                        <h4 className="font-semibold">Should Be Flagged</h4>
                        <p className="text-2xl font-bold text-orange-600">{debugData.stats.shouldBeFlagged}</p>
                      </div>
                    </div>
                    
                    {debugData.analysis?.unflaggedButSuspicious?.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2 text-red-600">⚠️ Unflagged But Suspicious Orders</h4>
                        <div className="bg-red-50 p-4 rounded">
                          {debugData.analysis.unflaggedButSuspicious.map((order, idx) => (
                            <div key={idx} className="flex justify-between items-center py-2 border-b last:border-b-0">
                              <span className="font-medium">{order.orderNumber}</span>
                              <span>৳{order.total} | {order.quantity} items</span>
                              <span className="text-sm text-red-600">{order.reasons.join(', ')}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div>
                      <h4 className="font-semibold mb-2">Recent Orders</h4>
                      <div className="max-h-96 overflow-y-auto">
                        <table className="min-w-full text-sm">
                          <thead className="bg-gray-100 sticky top-0">
                            <tr>
                              <th className="px-3 py-2 text-left">Order</th>
                              <th className="px-3 py-2 text-left">Customer</th>
                              <th className="px-3 py-2 text-left">Total</th>
                              <th className="px-3 py-2 text-left">Qty</th>
                              <th className="px-3 py-2 text-left">Flagged</th>
                              <th className="px-3 py-2 text-left">Device</th>
                            </tr>
                          </thead>
                          <tbody>
                            {debugData.orders.map((order, idx) => (
                              <tr key={idx} className={`${
                                (order.shouldBeFlagged.highValue || order.shouldBeFlagged.bulkQuantity) && !order.flagged
                                  ? 'bg-red-50' : order.flagged ? 'bg-green-50' : ''
                              }`}>
                                <td className="px-3 py-2">{order.orderNumber}</td>
                                <td className="px-3 py-2">{order.customer}</td>
                                <td className="px-3 py-2">৳{order.total}</td>
                                <td className="px-3 py-2">{order.totalQuantity}</td>
                                <td className="px-3 py-2">{order.flagged ? '✅' : '❌'}</td>
                                <td className="px-3 py-2">{order.hasDevice ? '📱' : '❌'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      {/* Toasts */}
      {toasts.length>0 && (
        <div className="fixed top-4 right-4 z-[100] space-y-2 w-72">
          {toasts.map(t => (
            <div key={t.id} className={`shadow rounded-md px-4 py-3 text-sm flex items-start gap-2 animate-fade-in-down border ${t.type==='success' ? 'bg-green-50 border-green-200 text-green-800' : t.type==='error' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-gray-50 border-gray-200 text-gray-700'}`}> 
              <span className="font-semibold text-xs uppercase tracking-wide">{t.type}</span>
              <span className="flex-1">{t.msg}</span>
              <button onClick={()=> setToasts(ts=> ts.filter(x=> x.id!==t.id))} className="text-xs text-gray-400 hover:text-gray-600">✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
  );
};

export default AdminFraudPanel;
