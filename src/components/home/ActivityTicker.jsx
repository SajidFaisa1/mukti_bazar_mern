import React, { useEffect, useRef, useState } from 'react';
import { Clock } from 'lucide-react';

const typeStyles = {
  order: 'bg-primary-50 text-primary-700 border-primary-200',
  vendor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  deal: 'bg-amber-50 text-amber-700 border-amber-200'
};

const ActivityTicker = ({ items = [] }) => {
  const [index, setIndex] = useState(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!items.length) return;
    intervalRef.current = setInterval(() => {
      setIndex(prev => (prev + 1) % items.length);
    }, 4000);
    return () => clearInterval(intervalRef.current);
  }, [items]);

  if (!items.length) {
    return (
      <div className="rounded-2xl border border-primary-100/70 bg-white/70 backdrop-blur-sm p-4 flex items-center justify-center text-[11px] text-primary-600 min-h-[96px]">
        No recent activity
      </div>
    );
  }

  const active = items[index];
  const timeAgo = (ts) => {
    if (!ts) return '';
    const diffMs = Date.now() - new Date(ts).getTime();
    const m = Math.floor(diffMs / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return m + 'm ago';
    const h = Math.floor(m / 60);
    if (h < 24) return h + 'h ago';
    const d = Math.floor(h / 24);
    return d + 'd ago';
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary-100/70 bg-white/80 backdrop-blur-sm p-4 flex flex-col gap-3 min-h-[120px]">
      <div className="flex items-center gap-2 text-primary-700">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <h3 className="text-xs font-extrabold tracking-wide uppercase">Live Marketplace</h3>
      </div>
      <div className="relative flex-1">
        <div className="absolute inset-0 flex flex-col">
          <div key={index} className={`flex flex-col gap-2 animate-fade-in`}>            
            <div className={`inline-flex items-center gap-2 text-[11px] font-medium px-3 py-2 rounded-xl border shadow-sm ${typeStyles[active.type] || 'bg-gray-50 text-gray-700 border-gray-200'}`}>              
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              <span className="flex-1 leading-snug">{active.message}</span>
              <span className="inline-flex items-center gap-1 text-[10px] text-primary-500 font-semibold"><Clock className="w-3 h-3" /> {timeAgo(active.ts)}</span>
            </div>
          </div>
        </div>
      </div>
      <style>{`.animate-fade-in{animation:fadeIn .4s ease}.animate-fade-out{animation:fadeOut .4s ease}@keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}@keyframes fadeOut{from{opacity:1;transform:translateY(0)}to{opacity:0;transform:translateY(-6px)}}`}</style>
    </div>
  );
};

export default ActivityTicker;
