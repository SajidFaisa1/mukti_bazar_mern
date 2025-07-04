import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { translations } from '../../translations/translations';
import './AuthForm.css';

const VendorSignup = () => {
  const navigate = useNavigate();
  const { signupVendor } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    businessName: '',
    vendorProfileImage: null,
    kycDocument: null,
    farmingLicense: null,
    address: {
      street: '',
      city: '',
      state: '',
      postalCode: ''
    },
    farmSize: '',
    farmType: '',
    crops: [],
    role: 'vendor',
    isApproved: false,
    termsAccepted: false
  });

  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    
    if (type === 'file') {
      const file = files[0];
      if (file) {
        setFormData(prev => ({
          ...prev,
          [name]: file
        }));
      }
    } else if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (name === 'crops') {
      const cropsArray = value.split(',').map(crop => crop.trim());
      setFormData(prev => ({ ...prev, crops: cropsArray }));
    } else if (name.startsWith('address.')) {
      setFormData(prev => ({
        ...prev,
        address: {
          ...prev.address,
          [name.split('.')[1]]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleFileChange = (e) => {
    const { name } = e.target;
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({ ...prev, [name]: file }));
    }
  };

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
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

    try {
      setIsLoading(true);
      
      // Call the signupVendor function from AuthContext
      await signupVendor({
        ...formData,
        crops: formData.crops || [],
        address: formData.address || {}
      });
      
      // Show success message
      alert('Vendor account created successfully! Please check your email to verify your account and wait for admin approval.');
      navigate('/login');
    } catch (error) {
      console.error('Vendor signup error:', error);
      
      // Handle specific Firebase errors
      let errorMessage = error.message || 'Signup failed. Please try again.';
      if (error.code) {
        switch (error.code) {
          case 'auth/email-already-in-use':
            errorMessage = 'An account with this email already exists.';
            break;
          case 'auth/invalid-email':
            errorMessage = 'Please enter a valid email address.';
            break;
          case 'auth/weak-password':
            errorMessage = 'Password should be at least 6 characters.';
            break;
        }
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const vendorAuthStyles = {
    container: {
      '--auth-container': '100vh',
      '--auth-background': '#F1F8F5',
      '--auth-padding': '2rem',
      '--auth-max-width': '800px',
      '--auth-border-radius': '15px',
      '--auth-shadow': '0 10px 30px rgba(0, 0, 0, 0.1)',
      '--auth-padding-form': '2.5rem',
      '--auth-title-size': '2.2rem',
      '--auth-section-padding': '1.5rem',
      '--auth-section-border': '2px solid #E8F5E9',
      '--auth-input-padding': '1rem',
      '--auth-input-border': '2px solid #E8F5E9',
      '--auth-input-radius': '8px',
      '--auth-button-padding': '1.2rem',
      '--auth-button-gradient': 'linear-gradient(135deg, #388E3C, #2E7D32)',
      '--auth-button-radius': '8px',
      '--auth-button-size': '1.2rem',
      '--auth-button-shadow': '0 5px 15px rgba(46, 125, 50, 0.2)',
    }
  };

  return (
    <div className="auth-container" style={{
      minHeight: vendorAuthStyles.container['--auth-container'],
      background: vendorAuthStyles.container['--auth-background'],
      padding: vendorAuthStyles.container['--auth-padding']
    }}>
      <div className="auth-form" style={{
        maxWidth: vendorAuthStyles.container['--auth-max-width'],
        padding: vendorAuthStyles.container['--auth-padding-form'],
        borderRadius: vendorAuthStyles.container['--auth-border-radius'],
        boxShadow: vendorAuthStyles.container['--auth-shadow']
      }}>
        <h2 style={{
          fontSize: vendorAuthStyles.container['--auth-title-size'],
          color: '#2E7D32',
          background: vendorAuthStyles.container['--auth-button-gradient'],
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>Vendor Signup</h2>

        <form onSubmit={handleSubmit}>
          {/* Personal Info Section Example */}
          <div className="form-section" style={{
            padding: vendorAuthStyles.container['--auth-section-padding'],
            borderBottom: vendorAuthStyles.container['--auth-section-border']
          }}>
            <h3 style={{
              fontSize: '1.6rem',
              color: '#2E7D32',
              background: vendorAuthStyles.container['--auth-button-gradient'],
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>Personal Information</h3>

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
              <label>Business Name</label>
              <input
                type="text"
                name="businessName"
                value={formData.businessName}
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

            <div className="form-group">
              <label>Farm Size (e.g., 2acre)</label>
              <input
                type="text"
                name="farmSize"
                value={formData.farmSize}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Farm Type (e.g., Cow)</label>
              <input
                type="text"
                name="farmType"
                value={formData.farmType}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Crops (comma-separated, e.g., Onion, Watermelon)</label>
              <input
                type="text"
                name="crops"
                value={formData.crops.join(', ')}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Profile Image</label>
              <input
                type="file"
                name="vendorProfileImage"
                onChange={handleChange}
                accept="image/*"
                required
              />
            </div>

            <div className="form-group">
              <label>KYC Document</label>
              <input
                type="file"
                name="kycDocument"
                onChange={handleChange}
                accept=".pdf,.doc,.docx,image/*"
                required
              />
            </div>

            <div className="form-group">
              <label>Farming License</label>
              <input
                type="file"
                name="farmingLicense"
                onChange={handleChange}
                accept=".pdf,.doc,.docx,image/*"
                required
              />
            </div>

            {/* Continue adding other fields like Email, Password, etc. */}

          </div>

          {/* Additional form sections go here — just as you had them */}

          <div className="form-group">
            <label>
              <input
                type="checkbox"
                name="termsAccepted"
                checked={formData.termsAccepted}
                onChange={handleChange}
              /> I accept the terms and conditions
            </label>
          </div>

          <button type="submit" className="auth-button" style={{
            padding: vendorAuthStyles.container['--auth-button-padding'],
            background: vendorAuthStyles.container['--auth-button-gradient'],
            borderRadius: vendorAuthStyles.container['--auth-button-radius'],
            fontSize: vendorAuthStyles.container['--auth-button-size'],
            boxShadow: vendorAuthStyles.container['--auth-button-shadow']
          }}>
            Sign Up as Vendor
          </button>
        </form>
      </div>
    </div>
  );
};

export default VendorSignup;



