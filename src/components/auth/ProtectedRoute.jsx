import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/VendorAuthContext';

const ProtectedRoute = ({ element, requiredRole }) => {
  const { user, role, isApproved, loading } = useAuth();

  // While auth state is being determined, render nothing (or a loader)
  if (loading) {
    return null; // or a fallback spinner component
  }

  // If not logged in, redirect to login
  if (!user) {
    // Save the attempted URL for redirection after login
    sessionStorage.setItem('redirectUrl', window.location.pathname);
    return <Navigate to="/login" replace />;
  }

  // Check role access
  if (requiredRole && role !== requiredRole) {
    if (requiredRole === 'admin') {
      return <Navigate to="/" replace />;
    }
    return <Navigate to="/" replace />;
  }

  // Check vendor approval


  return element;
};

export default ProtectedRoute;
