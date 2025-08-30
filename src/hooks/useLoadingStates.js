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
    }, 500);

    return () => clearTimeout(timer);
  }, [location.pathname, setLoading]);
};

// Hook for handling API loading states
export const useApiLoading = () => {
  const { setLoading } = useLoading();
  
  const startLoading = (message = 'Processing...') => {
    setLoading('api', true, message);
  };
  
  const stopLoading = () => {
    setLoading('api', false);
  };
  
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
    }, [setLoading]);
    
    return <WrappedComponent {...props} />;
  };
};
