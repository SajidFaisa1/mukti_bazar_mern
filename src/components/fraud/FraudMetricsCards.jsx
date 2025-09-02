import React from 'react';

const FraudMetricsCards = ({ metrics, watchlist }) => {
  if (!metrics) return null;
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="text-sm text-gray-500">Orders (window)</div>
        <div className="text-2xl font-bold">{metrics.totals.orders}</div>
      </div>
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="text-sm text-gray-500">Suspicious %</div>
        <div className="text-2xl font-bold">{metrics.totals.suspiciousPct}%</div>
      </div>
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="text-sm text-gray-500">Avg Risk</div>
        <div className="text-2xl font-bold">{metrics.totals.avgRisk}</div>
      </div>
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="text-sm text-gray-500">Negotiated</div>
        <div className="text-2xl font-bold">{metrics.negotiated?.count ?? 0}</div>
        <div className="text-xs text-gray-400">{metrics.negotiated ? metrics.negotiated.pct + '%' : ''}</div>
      </div>
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="text-sm text-gray-500">Watchlist Vendors</div>
        <div className="text-2xl font-bold">{(watchlist.vendors||[]).length}</div>
      </div>
    </div>
  );
};

export default FraudMetricsCards;
