import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAdminAuth } from '../../contexts/AdminAuthContext';

const AdminLogin = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [createFirstAdminMode, setCreateFirstAdminMode] = useState(false);

  const navigate = useNavigate();
  const { login, createFirstAdmin, loading, error, clearError } = useAdminAuth();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    if (error) clearError();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (createFirstAdminMode) {
        await createFirstAdmin(formData);
      } else {
        await login(formData);
      }
      navigate('/admin');
    } catch (err) {
      // Error is handled by the context
      console.error('Admin authentication error:', err);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 via-purple-500 to-purple-700 p-5">
      <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md border-2 border-gray-200 relative">
        {/* Security border effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-purple-500 to-purple-700 rounded-xl opacity-10 -z-10"></div>
        
        <div className="text-center mb-8">
          <h2 className="text-gray-800 text-3xl font-bold mb-2">
            🛡️ Admin Access
          </h2>
          <p className="text-gray-600 text-base">
            {createFirstAdminMode ? 'Create First Admin Account' : 'Admin Login'}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-5 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mb-6">
          <div className="mb-5">
            <label htmlFor="email" className="block text-gray-700 font-semibold mb-2 text-sm">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="admin@example.com"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-base transition-colors duration-200 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 placeholder-gray-400"
            />
          </div>

          <div className="mb-6">
            <label htmlFor="password" className="block text-gray-700 font-semibold mb-2 text-sm">
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Enter password"
              minLength={6}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-base transition-colors duration-200 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 placeholder-gray-400"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white border-none py-3 rounded-lg text-base font-semibold cursor-pointer transition-all duration-200 flex items-center justify-center gap-2 ${
              loading 
                ? 'opacity-70 cursor-not-allowed' 
                : 'hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-300'
            }`}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                {createFirstAdminMode ? 'Creating...' : 'Signing In...'}
              </span>
            ) : (
              createFirstAdminMode ? 'Create Admin' : 'Sign In'
            )}
          </button>
        </form>

        <div className="text-center pt-5 border-t border-gray-200">
          <button
            type="button"
            onClick={() => setCreateFirstAdminMode(!createFirstAdminMode)}
            className="bg-none border-none text-blue-500 cursor-pointer text-sm font-medium py-2 mb-4 w-full transition-colors duration-200 hover:text-purple-600 hover:underline"
          >
            {createFirstAdminMode ? 'Already have an admin account? Login' : 'No admin account? Create first admin'}
          </button>
          
          <Link
            to="/"
            className="text-gray-500 no-underline text-sm font-medium transition-colors duration-200 hover:text-gray-700"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
