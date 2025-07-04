import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { Navigate } from 'react-router-dom';

const AdminProtectedRoute = ({ element }) => {
  const { isAuthenticated, loading } = useAdminAuth();
  if (loading) return null; // or spinner
  return isAuthenticated ? element : <Navigate to="/admin/login" replace />;
};

export default AdminProtectedRoute;
