import React, { useState, useEffect } from 'react';

const Star = ({ filled }) => (
  <svg viewBox="0 0 20 20" className={`w-3.5 h-3.5 ${filled ? 'text-amber-400' : 'text-gray-300'}`} fill="currentColor"><path d="M10 15.27L16.18 19l-1.64-7.03L20 7.24l-7.19-.61L10 0 7.19 6.63 0 7.24l5.46 4.73L3.82 19z"/></svg>
);

const TestimonialsCarousel = ({ items = [] }) => {
  const [index, setIndex] = useState(0);
  const [localItems, setLocalItems] = useState(items);
  useEffect(()=>{ setLocalItems(items); }, [items]);
  useEffect(() => {
    if (!localItems.length) return;
    const id = setInterval(() => setIndex(i => (i + 1) % localItems.length), 5000);
    return () => clearInterval(id);
  }, [localItems]);

  if (!localItems.length) return <div className="rounded-xl border border-primary-100/60 bg-white/70 backdrop-blur-sm p-6 text-[11px] text-primary-600">No testimonials yet</div>;
  const t = localItems[index];
  const voteHelpful = async () => {
    if (!t._id) return;
    try {
      await fetch(`http://localhost:5005/api/feedback/helpful/${t._id}`, { method: 'POST' });
      setLocalItems(prev => prev.map(item => item._id===t._id ? { ...item, helpfulVotes: (item.helpfulVotes||0)+1 } : item));
    } catch(e){ /* silent */ }
  };
  return (
    <div className="relative rounded-2xl border border-primary-100/70 bg-gradient-to-br from-white via-primary-50 to-white p-6 shadow-sm overflow-hidden">
      <div className="absolute -top-10 -left-10 w-40 h-40 bg-primary-200/30 rounded-full blur-2xl" />
      <div className="absolute bottom-0 right-0 w-48 h-48 bg-primary-300/20 rounded-full blur-3xl" />
      <div className="relative z-10 flex flex-col gap-3 min-h-[140px]">
        <div className="flex items-center gap-1">
          {Array.from({ length: 5 }).map((_,i)=><Star key={i} filled={i < (t.rating||0)} />)}
        </div>
        <p className="text-xs leading-relaxed text-primary-800 font-medium line-clamp-4">{t.comment}</p>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-primary-500">{new Date(t.createdAt).toLocaleDateString()}</span>
        <div className="flex items-center gap-3 mt-2">
          <button onClick={voteHelpful} className="text-[10px] font-semibold text-primary-600 hover:text-primary-700 bg-primary-100/60 px-2.5 py-1 rounded-full">Helpful ({t.helpfulVotes||0})</button>
        </div>
      </div>
      <div className="mt-4 flex justify-center gap-1">
        {items.map((_,i)=>(<button key={i} onClick={()=>setIndex(i)} className={`w-2 h-2 rounded-full ${i===index?'bg-primary-600':'bg-primary-300/60'}`} aria-label={`Go to testimonial ${i+1}`}/>))}
      </div>
    </div>
  );
};

export default TestimonialsCarousel;
