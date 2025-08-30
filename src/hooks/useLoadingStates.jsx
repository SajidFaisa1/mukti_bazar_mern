import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLoading } from '../contexts/LoadingContext';

export const useNavigationLoading = () => {
  const location = useLocation();
  const { setLoading } = useLoading();
  
  useEffect(() => {
    // Show loading when route changes
    setLoading('navigation', true, 'Loading page...');
    
    // Hide loading after a short delay to ensure content is rendered
    const timer = setTimeout(() => {
      setLoading('navigation', false);
    }, 300); // Reduced from 500ms to 300ms for faster loading

    return () => {
      clearTimeout(timer);
    };
  }, [location.pathname, setLoading]); // Added setLoading to dependencies but it's now memoized
};

// Hook for handling API loading states
export const useApiLoading = () => {
  const { setLoading } = useLoading();
  
  const startLoading = React.useCallback((message = 'Processing...') => {
    setLoading('api', true, message);
  }, [setLoading]);
  
  const stopLoading = React.useCallback(() => {
    setLoading('api', false);
  }, [setLoading]);
  
  return { startLoading, stopLoading };
};

// Higher-order component for automatic loading states
export const withLoadingState = (WrappedComponent, loadingMessage = 'Loading...') => {
  return function LoadingComponent(props) {
    const { setLoading } = useLoading();
    
    useEffect(() => {
      setLoading('global', true, loadingMessage);
      
      const timer = setTimeout(() => {
        setLoading('global', false);
      }, 300);
      
      return () => {
        clearTimeout(timer);
        setLoading('global', false);
      };
    }, [setLoading, loadingMessage]); // Added dependencies
    
    return <WrappedComponent {...props} />;
  };
};
