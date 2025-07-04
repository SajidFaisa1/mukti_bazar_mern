import { createContext, useContext, useState, useEffect } from 'react';

const AdminAuthContext = createContext();

export const useAdminAuth = () => useContext(AdminAuthContext);

export const AdminAuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('admin_token') || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Try to fetch admin profile if token exists on load
  useEffect(() => {
    const fetchProfile = async (newToken = token) => {
      if (!newToken) return;
      try {
        const res = await fetch('http://localhost:5005/api/admin/me', {
          headers: { Authorization: `Bearer ${newToken}` }
        });
        if (res.ok) {
          const { admin } = await res.json();
          setAdmin(admin);
        } else {
          localStorage.removeItem('admin_token');
          setToken('');
          setAdmin(null);
        }
      } catch (_) {
        setAdmin(null);
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
      localStorage.setItem('admin_token', data.token);
      setToken(data.token);
      await fetchProfile(data.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('admin_token');
    setToken('');
    setAdmin(null);
  };

  const value = { admin, token, loading, error, login, logout, isAuthenticated: !!admin };
  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
};

export default AdminAuthProvider;
export { AdminAuthContext };
