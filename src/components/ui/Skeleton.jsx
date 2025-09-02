import React from 'react';

// Generic skeleton block. Accepts width/height/tailwind className.
export const Skeleton = ({ className = '', width, height, rounded = 'rounded-md' }) => {
  const style = {};
  if (width) style.width = width;
  if (height) style.height = height;
  return (
    <div
      role="status"
      aria-label="loading"
      className={['animate-pulse bg-neutral-200 dark:bg-neutral-700', rounded, className].filter(Boolean).join(' ')}
      style={style}
    />
  );
};

export const SkeletonText = ({ lines = 1, className = '' }) => (
  <div className={['space-y-2', className].filter(Boolean).join(' ')}>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton key={i} className="h-3 w-full" />
    ))}
  </div>
);

export default Skeleton;