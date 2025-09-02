import React from 'react';

const StatBadge = ({ label, value, sub, color='primary' }) => {
  const colorMap = {
    primary: 'from-primary-600 to-primary-500 text-white',
    amber: 'from-amber-500 to-amber-400 text-white',
    emerald: 'from-emerald-600 to-emerald-500 text-white',
    indigo: 'from-indigo-600 to-indigo-500 text-white'
  };
  return (
    <div className="flex flex-col rounded-xl bg-gradient-to-r p-4 shadow-sm border border-white/10 min-w-[160px]">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-white/80">{label}</span>
      <span className={`mt-1 text-lg font-extrabold bg-clip-text text-transparent bg-gradient-to-r ${colorMap[color] || colorMap.primary}`}>{value}</span>
      {sub && <span className="mt-1 text-[10px] font-medium text-white/70">{sub}</span>}
    </div>
  );
};

const NegotiationHighlight = ({ highlight }) => {
  if (!highlight) return null;
  const { largestDiscount, fastestDeal, sampleSize } = highlight;
  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary-100/60 bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 text-white p-6 flex flex-col gap-5">
      <div className="absolute -top-20 -right-16 w-72 h-72 bg-primary-400/20 rounded-full blur-3xl" />
      <header className="relative z-10 flex items-center justify-between gap-4 flex-wrap">
        <h3 className="text-sm font-extrabold tracking-wide uppercase">Negotiation Highlights</h3>
        <span className="text-[10px] font-semibold bg-white/10 px-3 py-1 rounded-full backdrop-blur">Last 24h · {sampleSize} deals</span>
      </header>
      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {largestDiscount ? (
          <div className="rounded-xl bg-white/5 backdrop-blur-sm p-4 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <h4 className="text-xs font-bold uppercase tracking-wide text-amber-200">Biggest Discount</h4>
            </div>
            <p className="text-[11px] font-medium text-white/80 leading-snug line-clamp-2">{largestDiscount.name}</p>
            <div className="mt-1 flex items-center gap-3">
              <StatBadge label="Saved" value={`৳${largestDiscount.discountValue}`} sub={`${largestDiscount.discountPercent}%`} color="amber" />
            </div>
          </div>
        ) : (
          <div className="rounded-xl bg-white/5 backdrop-blur-sm p-4 flex items-center justify-center text-[11px] text-white/70 min-h-[120px]">No accepted deals yet</div>
        )}
        {fastestDeal ? (
          <div className="rounded-xl bg-white/5 backdrop-blur-sm p-4 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <h4 className="text-xs font-bold uppercase tracking-wide text-emerald-200">Fastest Deal</h4>
            </div>
            <p className="text-[11px] font-medium text-white/80 leading-snug line-clamp-2">{fastestDeal.name}</p>
            <div className="mt-1 flex items-center gap-3">
              <StatBadge label="Closed In" value={`${fastestDeal.minutesToAccept}m`} sub="from first offer" color="emerald" />
            </div>
          </div>
        ) : (
          <div className="rounded-xl bg-white/5 backdrop-blur-sm p-4 flex items-center justify-center text-[11px] text-white/70 min-h-[120px]">No speed data yet</div>
        )}
      </div>
    </div>
  );
};

export default NegotiationHighlight;
