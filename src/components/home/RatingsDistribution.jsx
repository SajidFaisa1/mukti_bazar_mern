import React from 'react';

const Bar = ({ label, value, total, highlight }) => {
  const pct = total ? (value / total) * 100 : 0;
  return (
    <div className="flex items-center gap-2 text-[11px] font-medium">
      <span className="w-6 text-right text-primary-700">{label}</span>
      <div className="flex-1 h-3 rounded-full bg-primary-100 overflow-hidden relative">
        <div className={`h-full ${highlight ? 'bg-gradient-to-r from-primary-600 to-primary-500' : 'bg-primary-400/70'} transition-all`} style={{ width: pct + '%' }} />
      </div>
      <span className="w-10 text-primary-600 tabular-nums">{value}</span>
    </div>
  );
};

const RatingsDistribution = ({ ratings }) => {
  if (!ratings) return null;
  const { distribution, average, total } = ratings;
  return (
    <div className="rounded-2xl border border-primary-100/70 bg-white/80 backdrop-blur-sm p-6 flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <h3 className="text-xs font-extrabold uppercase tracking-wide text-primary-700">Ratings Summary</h3>
        <span className="text-[11px] font-semibold text-primary-600/80">{total} reviews</span>
      </header>
      <div className="flex items-center gap-6">
        <div className="flex flex-col items-center justify-center rounded-xl bg-gradient-to-br from-primary-600 to-primary-500 text-white px-5 py-4 shadow-sm">
          <span className="text-3xl font-extrabold leading-none">{average.toFixed(1)}</span>
          <span className="text-[10px] font-semibold uppercase tracking-wide mt-1">Avg</span>
        </div>
        <div className="flex-1 flex flex-col gap-1.5">
          {[5,4,3,2,1].map(star => (
            <Bar key={star} label={star} value={distribution?.[star] || 0} total={total} highlight={star===Math.round(average)} />
          ))}
        </div>
      </div>
      <button className="self-start mt-1 text-[11px] font-semibold text-primary-600 hover:text-primary-700">View All Feedback →</button>
    </div>
  );
};

export default RatingsDistribution;
