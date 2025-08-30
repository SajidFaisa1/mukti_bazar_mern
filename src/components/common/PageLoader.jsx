import React from 'react';

const PageLoader = ({ 
  showSpinner = true, 
  showSkeleton = false, 
  minHeight = 'h-screen',
  message = "Loading..."
}) => {
  if (showSkeleton) {
    return (
      <div className={`animate-pulse ${minHeight} bg-gray-50`}>
        {/* Header Skeleton */}
        <div className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex justify-between items-center">
              <div className="h-8 bg-gray-200 rounded w-32"></div>
              <div className="flex space-x-4">
                <div className="h-8 bg-gray-200 rounded w-20"></div>
                <div className="h-8 bg-gray-200 rounded w-20"></div>
                <div className="h-8 bg-gray-200 rounded w-20"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Skeleton */}
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="space-y-6">
            {/* Title */}
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            
            {/* Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg shadow-md p-6">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3 mb-4"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/4"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center ${minHeight} bg-gradient-to-br from-green-50 to-blue-50`}>
      {showSpinner && (
        <>
          {/* Modern Loading Spinner */}
          <div className="relative mb-6">
            <div className="w-16 h-16 border-4 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-r-blue-600 rounded-full animate-spin" style={{animationDirection: 'reverse', animationDuration: '1.5s'}}></div>
          </div>
          
          {/* Loading Message */}
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">{message}</h3>
            <p className="text-gray-600 text-sm">Please wait while we load your content</p>
          </div>
          
          {/* Loading Progress Animation */}
          <div className="mt-6 w-64 bg-gray-200 rounded-full h-1 overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-blue-500 h-1 rounded-full animate-pulse"></div>
          </div>
        </>
      )}
    </div>
  );
};

export default PageLoader;
