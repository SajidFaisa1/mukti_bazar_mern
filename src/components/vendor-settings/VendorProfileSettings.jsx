import React, { useState, useEffect } from 'react';
import { useVendorAuth } from '../../contexts/VendorAuthContext';
import { 
  User, 
  Mail, 
  Phone, 
  Building, 
  Edit2, 
  Save, 
  X, 
  Camera, 
  Check,
  AlertCircle
} from 'lucide-react';

const VendorProfileSettings = () => {
  const { user, token } = useVendorAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [formData, setFormData] = useState({
    sellerName: '',
    businessName: '',
    phone: '',
    description: '',
    shopLogo: null
  });
  const [previewImage, setPreviewImage] = useState(null);

  useEffect(() => {
    if (user) {
      setFormData({
        sellerName: user.sellerName || '',
        businessName: user.businessName || '',
        phone: user.phone || '',
        description: user.description || '',
        shopLogo: user.shopLogo?.url || null
      });
      setPreviewImage(user.shopLogo?.url || null);
    }
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setMessage({ type: 'error', text: 'Image size should be less than 5MB' });
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target.result;
        setFormData(prev => ({
          ...prev,
          shopLogo: base64
        }));
        setPreviewImage(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!user?.uid) {
      setMessage({ type: 'error', text: 'User not authenticated' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const updateData = {
        uid: user.uid,
        sellerName: formData.sellerName,
        businessName: formData.businessName,
        phone: formData.phone,
        description: formData.description
      };

      // Only include shopLogo if it's been changed (base64 data)
      if (formData.shopLogo && formData.shopLogo.startsWith('data:')) {
        updateData.shopLogo = formData.shopLogo;
      }

      const response = await fetch(`http://localhost:5005/api/vendors/${user.uid}/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update profile');
      }

      const updatedVendor = await response.json();
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      setIsEditing(false);
      
      // Update local storage
      sessionStorage.setItem('vendorUser', JSON.stringify(updatedVendor));
      
    } catch (error) {
      console.error('Update profile error:', error);
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (user) {
      setFormData({
        sellerName: user.sellerName || '',
        businessName: user.businessName || '',
        phone: user.phone || '',
        description: user.description || '',
        shopLogo: user.shopLogo?.url || null
      });
      setPreviewImage(user.shopLogo?.url || null);
    }
    setIsEditing(false);
    setMessage({ type: '', text: '' });
  };

  if (!user) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Vendor Profile</h2>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Edit2 className="mr-2 h-4 w-4" />
            Edit Profile
          </button>
        ) : (
          <div className="flex space-x-2">
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {loading ? (
                <div className="mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Changes
            </button>
            <button
              onClick={handleCancel}
              className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Message Display */}
      {message.text && (
        <div className={`mb-6 p-4 rounded-lg flex items-center ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-700 border border-green-200' 
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.type === 'success' ? (
            <Check className="mr-2 h-5 w-5" />
          ) : (
            <AlertCircle className="mr-2 h-5 w-5" />
          )}
          {message.text}
        </div>
      )}

      <div className="space-y-6">
        {/* Profile Picture Section */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Store Logo</h3>
          <div className="flex items-center space-x-6">
            <div className="relative">
              {previewImage ? (
                <img
                  src={previewImage}
                  alt="Store Logo"
                  className="w-24 h-24 rounded-lg object-cover border-2 border-gray-300"
                />
              ) : (
                <div className="w-24 h-24 rounded-lg bg-gray-200 flex items-center justify-center border-2 border-gray-300">
                  <Building className="h-8 w-8 text-gray-400" />
                </div>
              )}
              {isEditing && (
                <label className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg cursor-pointer opacity-0 hover:opacity-100 transition-opacity">
                  <Camera className="h-6 w-6 text-white" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Store Logo</h4>
              <p className="text-sm text-gray-500 mb-2">
                Upload a logo for your store. Recommended size: 300x300px
              </p>
              {isEditing && (
                <label className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer">
                  <Camera className="mr-2 h-4 w-4" />
                  Choose Image
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>
        </div>

        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Seller Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                type="text"
                name="sellerName"
                value={formData.sellerName}
                onChange={handleInputChange}
                disabled={!isEditing}
                className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                placeholder="Enter your full name"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Business Name
            </label>
            <div className="relative">
              <Building className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                type="text"
                name="businessName"
                value={formData.businessName}
                onChange={handleInputChange}
                disabled={!isEditing}
                className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                placeholder="Enter your business name"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                type="email"
                value={user.email}
                disabled
                className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                disabled={!isEditing}
                className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                placeholder="Enter your phone number"
              />
            </div>
          </div>
        </div>

        {/* Business Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Business Description
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            disabled={!isEditing}
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
            placeholder="Describe your business, products, and services..."
          />
          <p className="text-xs text-gray-500 mt-1">
            Help customers understand what your business offers
          </p>
        </div>

        {/* Account Status */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${user.emailVerified ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm text-gray-700">
                Email {user.emailVerified ? 'Verified' : 'Not Verified'}
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${user.isApproved ? 'bg-green-500' : 'bg-yellow-500'}`} />
              <span className="text-sm text-gray-700">
                {user.isApproved ? 'Approved Vendor' : 'Pending Approval'}
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${user.profileCompleted ? 'bg-green-500' : 'bg-yellow-500'}`} />
              <span className="text-sm text-gray-700">
                Profile {user.profileCompleted ? 'Complete' : 'Incomplete'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorProfileSettings;
