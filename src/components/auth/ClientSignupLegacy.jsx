import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { createUserWithEmailAndPassword, sendEmailVerification, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../../firebase';
import { FaGoogle } from 'react-icons/fa';
import './AuthForm.css';

const ClientSignup = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signup, login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Check for success message in location state
  React.useEffect(() => {
    if (location.state?.message) {
      setSuccess(location.state.message);
      // Clear the message from location state
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    role: 'client',
    address: {
      street: '',
      city: '',
      state: '',
      postalCode: ''
    },
    termsAccepted: false
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (name.startsWith('address.')) {
      const addressField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        address: {
          ...prev.address,
          [addressField]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!formData.termsAccepted) {
      setError('Please accept the terms and conditions');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    
    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      // 1. Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );
      
      // 2. Send email verification with our custom verification URL
      const actionCodeSettings = {
        url: `${window.location.origin}/api/verify-email?uid=${userCredential.user.uid}&email=${encodeURIComponent(userCredential.user.email)}`,
        handleCodeInApp: false
      };
      
      console.log('Sending verification email with settings:', actionCodeSettings);
      await sendEmailVerification(userCredential.user, actionCodeSettings);
      
      // 3. Prepare the data to send to your backend with all required fields
      const now = new Date().toISOString();
      const clientData = {
        id: userCredential.user.uid, // Use Firebase UID as the primary ID
        name: formData.name.trim(),
        email: formData.email.toLowerCase().trim(),
        phone: formData.phone.trim(),
        role: 'client',
        uid: userCredential.user.uid, // Keep UID for backward compatibility
        emailVerified: false,
        address: {
          street: formData.address?.street || '',
          city: formData.address?.city || '',
          state: formData.address?.state || '',
          postalCode: formData.address?.postalCode || ''
        },
        isActive: true,
        isApproved: true, // Clients are auto-approved by default
        createdAt: now,
        updatedAt: now,
        lastLogin: null,
        profileImage: null
      };

      console.log('Sending client data to backend:', clientData);

      // 4. Save user data to your backend
      const response = await fetch('http://localhost:5005/api/client/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(clientData)
      });
      
      const result = await response.json();
      console.log('Backend response:', result);
      
      if (!response.ok) {
        // If backend save fails, delete the Firebase user
        console.error('Backend error:', result);
        await userCredential.user.delete();
        throw new Error(result.error || 'Failed to create user account');
      }
      
      // 5. Show success message and redirect to login
      setSuccess('Signup successful! Please check your email to verify your account before logging in.');
      
      // Redirect after a short delay to show the success message
      setTimeout(() => {
        navigate('/login', { 
          state: { 
            message: 'Signup successful! Please check your email to verify your account before logging in.'
          } 
        });
      }, 2000);
    } catch (error) {
      console.error('Signup error:', error);
      
      // Handle specific Firebase errors
      let errorMessage = 'Signup failed. Please try again.';
      
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'An account with this email already exists.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Please enter a valid email address.';
          break;
        case 'auth/weak-password':
          errorMessage = 'Password should be at least 6 characters long.';
          break;
        case 'auth/operation-not-allowed':
          errorMessage = 'Email/password accounts are not enabled.';
          break;
        default:
          errorMessage = error.message || errorMessage;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const styles = {
    container: {
      '--auth-container': '100vh',
      '--auth-background': '#F1F8F5',
      '--auth-padding': '2rem',
      '--auth-max-width': '500px',
      '--auth-border-radius': '15px',
      '--auth-shadow': '0 10px 30px rgba(0, 0, 0, 0.1)',
      '--auth-padding-form': '2.5rem',
      '--auth-title-size': '2.2rem',
      '--auth-input-padding': '1rem',
      '--auth-input-border': '2px solid #E8F5E9',
      '--auth-input-radius': '8px',
      '--auth-button-padding': '1.2rem'
    }
  };

  return (
    <div className="auth-container" style={styles.container}>
      {success && (
        <div className="success-message">
          {success}
        </div>
      )}
      <form onSubmit={handleSubmit} className="auth-form">
        <h2>Create Client Account</h2>

        <div className="form-group">
          <label>Full Name</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Password</label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Confirm Password</label>
          <input
            type="password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Phone Number</label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Street Address</label>
          <input
            type="text"
            name="address.street"
            value={formData.address.street}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>City</label>
          <input
            type="text"
            name="address.city"
            value={formData.address.city}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>State</label>
          <input
            type="text"
            name="address.state"
            value={formData.address.state}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Postal Code</label>
          <input
            type="text"
            name="address.postalCode"
            value={formData.address.postalCode}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group checkbox">
          <input
            type="checkbox"
            name="termsAccepted"
            checked={formData.termsAccepted}
            onChange={handleChange}
            required
          />
          <label>I accept the terms and conditions</label>
        </div>

        <button type="submit" className="auth-button">Sign Up</button>
      </form>
    </div>
  );
};

export default ClientSignup;
