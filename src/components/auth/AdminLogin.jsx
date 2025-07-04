import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import '../../styles/login.css';

/*
  Simple admin login form that reuses the existing auth context.
  It works exactly like the ModernLoginForm but forces the role to "admin"
  so the backend can check and return the correct user document.
*/
const AdminLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login: authLogin, loading: authLoading, error: authError, admin, isAuthenticated } = useAdminAuth();

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');
  const [localSuccess, setLocalSuccess] = useState('');

  // if already logged in and role === 'admin' redirect
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/admin');
    }
  }, [isAuthenticated, navigate]);

  // Display message passed via route state (e.g., after email verification)
  useEffect(() => {
    if (location.state?.message) {
      setLocalSuccess(location.state.message);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    setLocalSuccess('');

    if (!formData.email || !formData.password) {
      setLocalError('Email and password are required.');
      return;
    }

    try {
      const res = await fetch('http://localhost:5005/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, password: formData.password })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      localStorage.setItem('admin_token', data.token);
      // trigger context to refresh profile
      await authLogin({ email: formData.email, password: formData.password });
      navigate('/admin');
    } catch (err) {
      setLocalError(err.message);
    }
  };

  return (
    <div className="login-container">
      <form className="login-form" onSubmit={handleSubmit}>
        <h2>Admin Login</h2>

        {(localError || authError) && (
          <div className="alert error">
            <AlertCircle size={18} /> {localError || authError}
          </div>
        )}
        
        

        <label>Email</label>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="admin@example.com"
          required
        />

        <label>Password</label>
        <div className="password-wrapper">
          <input
            type={showPassword ? 'text' : 'password'}
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="••••••••"
            required
          />
          {showPassword ? (
            <EyeOff onClick={() => setShowPassword(false)} className="eye-icon" />
          ) : (
            <Eye onClick={() => setShowPassword(true)} className="eye-icon" />
          )}
        </div>

        <button type="submit" className="btn-primary" disabled={authLoading}>
          {authLoading ? <Loader2 className="spinner" /> : 'Login'}
        </button>
      </form>
    </div>
  );
};

export default AdminLogin;
