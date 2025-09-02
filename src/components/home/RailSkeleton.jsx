import React from 'react';

const shimmer = 'after:content-[""] after:absolute after:inset-0 after:-translate-x-full after:animate-[shimmer_1.4s_infinite] after:bg-gradient-to-r after:from-transparent after:via-white/60 after:to-transparent';

const RailSkeleton = ({ items = 8 }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3 md:gap-4">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className={`relative overflow-hidden rounded-xl border border-primary-100/60 bg-primary-100/30 h-40 ${shimmer}`} />
      ))}
    </div>
  );
};

export default RailSkeleton;
