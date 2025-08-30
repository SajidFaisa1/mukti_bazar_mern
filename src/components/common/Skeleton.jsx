import React from 'react';

const Skeleton = ({ 
  width = 'w-full', 
  height = 'h-4', 
  className = '',
  rounded = 'rounded'
}) => {
  return (
    <div className={`skeleton ${width} ${height} ${rounded} ${className}`}></div>
  );
};

// Card skeleton for product/content cards
export const CardSkeleton = () => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
      <Skeleton height="h-40" className="mb-4" />
      <Skeleton width="w-3/4" height="h-6" />
      <Skeleton width="w-1/2" height="h-4" />
      <Skeleton width="w-2/3" height="h-4" />
      <div className="flex justify-between items-center mt-4">
        <Skeleton width="w-1/4" height="h-6" />
        <Skeleton width="w-1/3" height="h-10" />
      </div>
    </div>
  );
};

// Table skeleton
export const TableSkeleton = ({ rows = 5, columns = 4 }) => {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 px-6 py-4 border-b">
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {[...Array(columns)].map((_, i) => (
            <Skeleton key={i} width="w-3/4" height="h-4" />
          ))}
        </div>
      </div>
      
      {/* Rows */}
      {[...Array(rows)].map((_, rowIndex) => (
        <div key={rowIndex} className="px-6 py-4 border-b border-gray-100">
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
            {[...Array(columns)].map((_, colIndex) => (
              <Skeleton key={colIndex} width="w-full" height="h-4" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

// List skeleton
export const ListSkeleton = ({ items = 5 }) => {
  return (
    <div className="space-y-4">
      {[...Array(items)].map((_, i) => (
        <div key={i} className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex items-center space-x-4">
            <Skeleton width="w-12" height="h-12" rounded="rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton width="w-3/4" height="h-4" />
              <Skeleton width="w-1/2" height="h-3" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Form skeleton
export const FormSkeleton = () => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
      <Skeleton width="w-1/3" height="h-8" className="mb-6" />
      
      {[...Array(4)].map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton width="w-1/4" height="h-4" />
          <Skeleton width="w-full" height="h-10" />
        </div>
      ))}
      
      <div className="flex justify-end space-x-4 pt-4">
        <Skeleton width="w-24" height="h-10" />
        <Skeleton width="w-32" height="h-10" />
      </div>
    </div>
  );
};

export default Skeleton;
