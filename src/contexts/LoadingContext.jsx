import React, { createContext, useContext, useState, useCallback } from 'react';
import PageLoader from '../components/common/PageLoader';

const LoadingContext = createContext();

export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
};

export const LoadingProvider = ({ children }) => {
  const [loadingStates, setLoadingStates] = useState({
    global: false,
    navigation: false,
    api: false,
    authentication: false
  });

  const [loadingMessage, setLoadingMessage] = useState('Loading...');
  const [minimumLoadingTime] = useState(500); // Minimum loading time to prevent flashing

  const setLoading = useCallback((key, isLoading, message = 'Loading...') => {
    setLoadingMessage(message);
    setLoadingStates(prev => ({
      ...prev,
      [key]: isLoading
    }));
  }, []);

  const isAnyLoading = useCallback(() => {
    return Object.values(loadingStates).some(state => state);
  }, [loadingStates]);

  const showGlobalLoader = loadingStates.global || loadingStates.navigation;

  return (
    <LoadingContext.Provider 
      value={{ 
        loadingStates, 
        setLoading, 
        isAnyLoading,
        loadingMessage,
        setLoadingMessage
      }}
    >
      {showGlobalLoader && (
        <div className="fixed inset-0 z-50 bg-white">
          <PageLoader 
            message={loadingMessage}
            minHeight="h-screen"
          />
        </div>
      )}
      
      {/* API Loading Overlay */}
      {loadingStates.api && (
        <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-40">
          <div className="bg-white rounded-lg p-6 shadow-xl">
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 border-2 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
              <span className="text-gray-700">{loadingMessage}</span>
            </div>
          </div>
        </div>
      )}
      
      {children}
    </LoadingContext.Provider>
  );
};

export default LoadingProvider;
