import { createContext, useContext, useState, useEffect } from 'react';

const AdminAuthContext = createContext();

export const useAdminAuth = () => useContext(AdminAuthContext);

export const AdminAuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null);
  const [token, setToken] = useState(
    sessionStorage.getItem('admin_token') || localStorage.getItem('admin_token') || ''
  );
  const [loading, setLoading] = useState(true); // Start with true to prevent premature navigation
  const [error, setError] = useState('');

  // Function to clear all client/vendor tokens
  const clearAllAuthTokens = () => {
    // Clear localStorage
    localStorage.removeItem('clientToken');
    localStorage.removeItem('clientUser');
    localStorage.removeItem('vendorUser');
    localStorage.removeItem('token');
    
    // Clear sessionStorage
    sessionStorage.removeItem('clientToken');
    sessionStorage.removeItem('clientUser');
    sessionStorage.removeItem('vendorUser');
    sessionStorage.removeItem('token');
    
    console.log('All client/vendor tokens cleared for admin login');
  };

  // Try to fetch admin profile if token exists on load
  useEffect(() => {
    const fetchProfile = async (newToken = token) => {
      console.log('AdminAuth: Checking token on load:', newToken ? 'Token exists' : 'No token');
      
      if (!newToken) {
        console.log('AdminAuth: No token found, setting loading to false');
        setLoading(false); // No token, not loading anymore
        return;
      }
      
      console.log('AdminAuth: Token found, fetching profile...');
      setLoading(true); // Start loading
      try {
        const res = await fetch('http://localhost:5005/api/admin/me', {
          headers: { Authorization: `Bearer ${newToken}` }
        });
        
        console.log('AdminAuth: API response status:', res.status);
        
        if (res.ok) {
          const { admin } = await res.json();
          console.log('AdminAuth: Profile fetched successfully:', admin);
          setAdmin(admin);
        } else {
          console.log('AdminAuth: Invalid token, clearing storage');
          // Token is invalid, clear it
          localStorage.removeItem('admin_token');
          sessionStorage.removeItem('admin_token');
          setToken('');
          setAdmin(null);
        }
      } catch (error) {
        console.error('AdminAuth: Error fetching profile:', error);
        // Network error or other issue
        setAdmin(null);
      } finally {
        console.log('AdminAuth: Finished loading, setting loading to false');
        setLoading(false); // Always stop loading
      }
    };
    fetchProfile();
  }, [token]);

  const login = async ({ email, password }) => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5005/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      
      // Clear all client/vendor tokens before setting admin token
      clearAllAuthTokens();
      
      // Set admin token and session
      localStorage.setItem('admin_token', data.token);
      sessionStorage.setItem('admin_token', data.token);
      setToken(data.token);
      setAdmin(data.admin);
      return { success: true };
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const createFirstAdmin = async ({ email, password }) => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5005/api/admin/create-first', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create admin');
      
      // Clear all client/vendor tokens before setting admin token
      clearAllAuthTokens();
      
      // Set admin token and session
      localStorage.setItem('admin_token', data.token);
      sessionStorage.setItem('admin_token', data.token);
      setToken(data.token);
      setAdmin(data.admin);
      return { success: true };
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('admin_token');
    sessionStorage.removeItem('admin_token');
    setToken('');
    setAdmin(null);
    setError('');
  };

  const clearError = () => setError('');

  const value = { 
    admin, 
    token, 
    loading, 
    error, 
    login, 
    createFirstAdmin,
    logout, 
    clearError,
    isAuthenticated: !!admin 
  };
  
  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
};

export default AdminAuthProvider;
export { AdminAuthContext };
