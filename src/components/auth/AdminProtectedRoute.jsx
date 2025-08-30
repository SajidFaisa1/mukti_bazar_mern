import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { Navigate } from 'react-router-dom';
import LoadingSpinner from '../common/LoadingSpinner';

const AdminProtectedRoute = ({ element }) => {
  const { isAuthenticated, loading } = useAdminAuth();
  
  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }
  
  // Redirect to login if not authenticated
  return isAuthenticated ? element : <Navigate to="/admin/login" replace />;
};

export default AdminProtectedRoute;
