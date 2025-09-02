import React from 'react';

const NegotiationDiscountAnalytics = ({ analytics }) => {
  if (!analytics) return null;
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div className="bg-white p-4 rounded-lg shadow">
        <h4 className="text-sm font-semibold mb-2">Negotiation Discounts</h4>
        {analytics.stats ? (
          <div className="text-xs space-y-1">
            <div>Avg: {analytics.stats.avg?.toFixed(1)}%</div>
            <div>Max: {analytics.stats.max?.toFixed(1)}%</div>
            <div>Count: {analytics.stats.count}</div>
          </div>
        ) : <div className="text-xs text-gray-400">No data</div>}
        <div className="mt-3">
          <div className="text-[10px] text-gray-500 mb-1">Distribution</div>
          <div className="flex flex-wrap gap-1">
            {analytics.distribution.map((b,i)=>(
              <span key={i} className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-[10px]">{b._id}:{b.count}</span>
            ))}
          </div>
        </div>
      </div>
      <div className="bg-white p-4 rounded-lg shadow">
        <h4 className="text-sm font-semibold mb-2">Top Discounts</h4>
        <ul className="text-xs divide-y">
          {analytics.topDiscounts.map((d,i)=>(
            <li key={i} className="py-1 flex justify-between"><span>#{i+1}</span><span>{d.dp.toFixed(1)}%</span></li>
          ))}
          {!analytics.topDiscounts.length && <li className="text-gray-400 py-1">No discounts</li>}
        </ul>
      </div>
      <div className="bg-white p-4 rounded-lg shadow">
        <h4 className="text-sm font-semibold mb-2">Discount Notes</h4>
        <p className="text-[11px] text-gray-600 leading-snug">Large negotiated discounts combined with high short-window ordering velocity can indicate aggressive arbitrage or coordinated purchasing behavior. Monitor synergy flags.</p>
      </div>
    </div>
  );
};

export default NegotiationDiscountAnalytics;
