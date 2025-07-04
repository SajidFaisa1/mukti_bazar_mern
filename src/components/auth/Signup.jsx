import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Signup.css';

const Signup = () => {
  const navigate = useNavigate();
  const { signup } = useAuth();
  
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
    businessName: '',
    farmSize: '',
    farmType: '',
    crops: [],
    vendorProfileImage: null,
    kycDocument: null,
    farmingLicense: null
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, files } = e.target;

    if (type === 'file') {
      setFormData((prev) => ({
        ...prev,
        [name]: files[0]
      }));
      return;
    }

    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData((prev) => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.name) newErrors.name = 'Name is required';
    if (!formData.email) newErrors.email = 'Email is required';
    if (!formData.password) newErrors.password = 'Password is required';
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    if (!formData.phone) newErrors.phone = 'Phone is required';

    if (formData.role === 'client') {
      if (!formData.address.street) newErrors['address.street'] = 'Street is required';
      if (!formData.address.city) newErrors['address.city'] = 'City is required';
      if (!formData.address.state) newErrors['address.state'] = 'State is required';
      if (!formData.address.postalCode) newErrors['address.postalCode'] = 'Postal code is required';
    }

    if (formData.role === 'vendor') {
      if (!formData.businessName) newErrors.businessName = 'Business name is required';
      if (!formData.farmSize) newErrors.farmSize = 'Farm size is required';
      if (!formData.farmType) newErrors.farmType = 'Farm type is required';
      if (!formData.crops.length) newErrors.crops = 'At least one crop is required';
      if (!formData.vendorProfileImage) newErrors.vendorProfileImage = 'Profile image is required';
      if (!formData.kycDocument) newErrors.kycDocument = 'KYC document is required';
      if (!formData.farmingLicense) newErrors.farmingLicense = 'Farming license is required';
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const validationErrors = validate();
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        setIsSubmitting(false);
        return;
      }

      await signup(formData);
      
      setSignupSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (error) {
      setErrors({ submit: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="signup-container">
      <div className="signup-form">
        <h2>Sign Up</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={errors.name ? 'error-input' : ''}
            />
            {errors.name && <div className="error">{errors.name}</div>}
          </div>

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={errors.email ? 'error-input' : ''}
            />
            {errors.email && <div className="error">{errors.email}</div>}
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className={errors.password ? 'error-input' : ''}
            />
            {errors.password && <div className="error">{errors.password}</div>}
          </div>

          <div className="form-group">
            <label>Confirm Password</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className={errors.confirmPassword ? 'error-input' : ''}
            />
            {errors.confirmPassword && (
              <div className="error">{errors.confirmPassword}</div>
            )}
          </div>

          <div className="form-group">
            <label>Phone</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className={errors.phone ? 'error-input' : ''}
            />
            {errors.phone && <div className="error">{errors.phone}</div>}
          </div>

          <div className="form-group">
            <label>Role</label>
            <div className="role-selector">
              <label>
                <input
                  type="radio"
                  name="role"
                  value="client"
                  checked={formData.role === 'client'}
                  onChange={handleChange}
                />
                Client
              </label>
              <label>
                <input
                  type="radio"
                  name="role"
                  value="vendor"
                  checked={formData.role === 'vendor'}
                  onChange={handleChange}
                />
                Vendor
              </label>
            </div>
          </div>

          {formData.role === 'client' && (
            <div className="client-fields">
              <div className="form-group">
                <label>Street</label>
                <input
                  type="text"
                  name="address.street"
                  value={formData.address.street}
                  onChange={handleChange}
                  className={errors['address.street'] ? 'error-input' : ''}
                />
                {errors['address.street'] && (
                  <div className="error">{errors['address.street']}</div>
                )}
              </div>

              <div className="form-group">
                <label>City</label>
                <input
                  type="text"
                  name="address.city"
                  value={formData.address.city}
                  onChange={handleChange}
                  className={errors['address.city'] ? 'error-input' : ''}
                />
                {errors['address.city'] && (
                  <div className="error">{errors['address.city']}</div>
                )}
              </div>

              <div className="form-group">
                <label>State</label>
                <input
                  type="text"
                  name="address.state"
                  value={formData.address.state}
                  onChange={handleChange}
                  className={errors['address.state'] ? 'error-input' : ''}
                />
                {errors['address.state'] && (
                  <div className="error">{errors['address.state']}</div>
                )}
              </div>

              <div className="form-group">
                <label>Postal Code</label>
                <input
                  type="text"
                  name="address.postalCode"
                  value={formData.address.postalCode}
                  onChange={handleChange}
                  className={errors['address.postalCode'] ? 'error-input' : ''}
                />
                {errors['address.postalCode'] && (
                  <div className="error">{errors['address.postalCode']}</div>
                )}
              </div>
            </div>
          )}

          {formData.role === 'vendor' && (
            <div className="vendor-fields">
              <div className="form-group">
                <label>Business Name</label>
                <input
                  type="text"
                  name="businessName"
                  value={formData.businessName}
                  onChange={handleChange}
                  className={errors.businessName ? 'error-input' : ''}
                />
                {errors.businessName && (
                  <div className="error">{errors.businessName}</div>
                )}
              </div>

              <div className="form-group">
                <label>Farm Size</label>
                <input
                  type="text"
                  name="farmSize"
                  value={formData.farmSize}
                  onChange={handleChange}
                  className={errors.farmSize ? 'error-input' : ''}
                />
                {errors.farmSize && (
                  <div className="error">{errors.farmSize}</div>
                )}
              </div>

              <div className="form-group">
                <label>Farm Type</label>
                <input
                  type="text"
                  name="farmType"
                  value={formData.farmType}
                  onChange={handleChange}
                  className={errors.farmType ? 'error-input' : ''}
                />
                {errors.farmType && (
                  <div className="error">{errors.farmType}</div>
                )}
              </div>

              <div className="form-group">
                <label>Crops (comma-separated)</label>
                <input
                  type="text"
                  name="crops"
                  value={formData.crops.join(', ')}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      crops: e.target.value.split(',').map((crop) => crop.trim())
                    }))
                  }
                  className={errors.crops ? 'error-input' : ''}
                />
                {errors.crops && <div className="error">{errors.crops}</div>}
              </div>

              <div className="form-group">
                <label>Profile Image</label>
                <input
                  type="file"
                  name="vendorProfileImage"
                  accept="image/*"
                  onChange={handleChange}
                  className={errors.vendorProfileImage ? 'error-input' : ''}
                />
                {errors.vendorProfileImage && (
                  <div className="error">{errors.vendorProfileImage}</div>
                )}
              </div>

              <div className="form-group">
                <label>KYC Document</label>
                <input
                  type="file"
                  name="kycDocument"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleChange}
                  className={errors.kycDocument ? 'error-input' : ''}
                />
                {errors.kycDocument && (
                  <div className="error">{errors.kycDocument}</div>
                )}
              </div>

              <div className="form-group">
                <label>Farming License</label>
                <input
                  type="file"
                  name="farmingLicense"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleChange}
                  className={errors.farmingLicense ? 'error-input' : ''}
                />
                {errors.farmingLicense && (
                  <div className="error">{errors.farmingLicense}</div>
                )}
              </div>
            </div>
          )}

          <button type="submit" className="submit-btn" disabled={isSubmitting}>
            {isSubmitting ? 'Signing up...' : 'Sign Up'}
          </button>

          {errors.submit && <div className="error">{errors.submit}</div>}

          {signupSuccess && (
            <div className="success-message">
              <p>Signup successful! Redirecting to login...</p>
            </div>
          )}
        </form>

        <div className="auth-link">
          Already have an account? <a href="/login">Sign In</a>
        </div>
      </div>
    </div>
  );
};

export default Signup;
