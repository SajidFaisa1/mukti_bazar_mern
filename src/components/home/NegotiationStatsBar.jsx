import React from 'react';

const NegotiationStatsBar = ({ stats }) => {
  if (!stats) return null;
  const items = [
    { label: 'Active Deals', value: stats.activeCount, accent: 'bg-emerald-500' },
    { label: 'Closed 24h', value: stats.acceptedLast24h, accent: 'bg-amber-500' },
    { label: 'Avg Discount', value: stats.avgDiscountPercent + '%', accent: 'bg-primary-500' },
    { label: 'Top Product', value: stats.topNegotiatedProduct ? stats.topNegotiatedProduct.count : 0, accent: 'bg-rose-500' }
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {items.map(box => (
        <div key={box.label} className="relative overflow-hidden rounded-xl border border-primary-100/70 bg-white/80 backdrop-blur-sm p-3 flex flex-col gap-1 shadow-sm">
          <span className={`absolute top-2 right-2 w-2 h-2 rounded-full ${box.accent} animate-pulse`} />
          <span className="text-[10px] uppercase tracking-wide text-primary-500 font-semibold">{box.label}</span>
            <span className="text-lg font-extrabold text-primary-700 leading-none">{box.value}</span>
        </div>
      ))}
    </div>
  );
};

export default NegotiationStatsBar;
