import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/VendorAuthContext';

const VendorSignupSimple = () => {
  const navigate = useNavigate();
  const { signupVendor } = useAuth();

  const [form, setForm] = useState({
    businessName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async e => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) {
      return setError('Passwords do not match');
    }
    try {
      setLoading(true);
      await signupVendor(form);
      alert('Account created! Verify your email then log in.');
      navigate('/login');
    } catch (err) {
      setError(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <form className="auth-form" onSubmit={submit}>
        <h2>Create Vendor Account</h2>
        {error && <p className="error">{error}</p>}
        <input name="businessName" placeholder="Business Name" value={form.businessName} onChange={handleChange} required />
        <input type="email" name="email" placeholder="Email" value={form.email} onChange={handleChange} required />
        <input type="password" name="password" placeholder="Password" value={form.password} onChange={handleChange} required />
        <input type="password" name="confirmPassword" placeholder="Confirm Password" value={form.confirmPassword} onChange={handleChange} required />
        <button disabled={loading}>{loading ? 'Creating...' : 'Sign Up'}</button>
      </form>
    </div>
  );
};

export default VendorSignupSimple;
