import React from 'react';
// Temporarily disable navigation loading to prevent infinite loops
// import { useNavigationLoading } from '../../hooks/useLoadingStates.jsx';

const AppLayout = ({ children }) => {
  // Hook to handle navigation loading - disabled temporarily
  // useNavigationLoading();

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Main content area with guaranteed minimum height */}
      <main className="flex-1 w-full">
        {/* Content wrapper with proper spacing */}
        <div className="w-full">
          {children}
        </div>
      </main>
    </div>
  );
};

export default AppLayout;
