import React, { useState, useEffect } from 'react';
import { useVendorAuth } from '../../contexts/VendorAuthContext';
import { 
  Building, 
  MapPin, 
  Phone, 
  Globe, 
  Calendar, 
  Package, 
  Award, 
  Edit2, 
  Save, 
  X,
  Plus,
  Trash2,
  Clock
} from 'lucide-react';

const VendorBusinessSettings = () => {
  const { user, token } = useVendorAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [formData, setFormData] = useState({
    businessType: '',
    businessRegistrationNumber: '',
    taxIdentificationNumber: '',
    yearsInBusiness: '',
    expectedMonthlyVolume: '',
    primaryProducts: [],
    certifications: [],
    socialMediaLinks: {
      facebook: '',
      website: '',
      whatsapp: ''
    },
    businessHours: {
      monday: { open: '09:00', close: '18:00', closed: false },
      tuesday: { open: '09:00', close: '18:00', closed: false },
      wednesday: { open: '09:00', close: '18:00', closed: false },
      thursday: { open: '09:00', close: '18:00', closed: false },
      friday: { open: '09:00', close: '18:00', closed: false },
      saturday: { open: '09:00', close: '18:00', closed: false },
      sunday: { open: '09:00', close: '18:00', closed: true }
    }
  });

  const businessTypes = [
    'farmer', 'cooperative', 'wholesaler', 'processor', 'retailer', 'exporter', 'supplier'
  ];

  const volumeOptions = [
    { value: 'under-10k', label: 'Under ৳10,000' },
    { value: '10k-50k', label: '৳10,000 - ৳50,000' },
    { value: '50k-200k', label: '৳50,000 - ৳200,000' },
    { value: '200k-500k', label: '৳200,000 - ৳500,000' },
    { value: '500k-1m', label: '৳500,000 - ৳1,000,000' },
    { value: 'over-1m', label: 'Over ৳1,000,000' }
  ];

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  useEffect(() => {
    if (user) {
      setFormData({
        businessType: user.businessType || '',
        businessRegistrationNumber: user.businessRegistrationNumber || '',
        taxIdentificationNumber: user.taxIdentificationNumber || '',
        yearsInBusiness: user.yearsInBusiness || '',
        expectedMonthlyVolume: user.expectedMonthlyVolume || '',
        primaryProducts: user.primaryProducts || [],
        certifications: user.certifications || [],
        socialMediaLinks: {
          facebook: user.socialMediaLinks?.facebook || '',
          website: user.socialMediaLinks?.website || '',
          whatsapp: user.socialMediaLinks?.whatsapp || ''
        },
        businessHours: user.businessHours || {
          monday: { open: '09:00', close: '18:00', closed: false },
          tuesday: { open: '09:00', close: '18:00', closed: false },
          wednesday: { open: '09:00', close: '18:00', closed: false },
          thursday: { open: '09:00', close: '18:00', closed: false },
          friday: { open: '09:00', close: '18:00', closed: false },
          saturday: { open: '09:00', close: '18:00', closed: false },
          sunday: { open: '09:00', close: '18:00', closed: true }
        }
      });
    }
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSocialMediaChange = (platform, value) => {
    setFormData(prev => ({
      ...prev,
      socialMediaLinks: {
        ...prev.socialMediaLinks,
        [platform]: value
      }
    }));
  };

  const handleBusinessHoursChange = (day, field, value) => {
    setFormData(prev => ({
      ...prev,
      businessHours: {
        ...prev.businessHours,
        [day]: {
          ...prev.businessHours[day],
          [field]: value
        }
      }
    }));
  };

  const addProduct = () => {
    const newProduct = prompt('Enter product name:');
    if (newProduct && newProduct.trim()) {
      setFormData(prev => ({
        ...prev,
        primaryProducts: [...prev.primaryProducts, newProduct.trim()]
      }));
    }
  };

  const removeProduct = (index) => {
    setFormData(prev => ({
      ...prev,
      primaryProducts: prev.primaryProducts.filter((_, i) => i !== index)
    }));
  };

  const addCertification = () => {
    const newCert = prompt('Enter certification name:');
    if (newCert && newCert.trim()) {
      setFormData(prev => ({
        ...prev,
        certifications: [...prev.certifications, newCert.trim()]
      }));
    }
  };

  const removeCertification = (index) => {
    setFormData(prev => ({
      ...prev,
      certifications: prev.certifications.filter((_, i) => i !== index)
    }));
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
        businessType: formData.businessType,
        businessRegistrationNumber: formData.businessRegistrationNumber,
        taxIdentificationNumber: formData.taxIdentificationNumber,
        yearsInBusiness: parseInt(formData.yearsInBusiness) || 0,
        expectedMonthlyVolume: formData.expectedMonthlyVolume,
        primaryProducts: formData.primaryProducts,
        certifications: formData.certifications,
        socialMediaLinks: formData.socialMediaLinks,
        businessHours: formData.businessHours
      };

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
        throw new Error(errorData.error || 'Failed to update business settings');
      }

      const updatedVendor = await response.json();
      setMessage({ type: 'success', text: 'Business settings updated successfully!' });
      setIsEditing(false);
      
      // Update local storage
      sessionStorage.setItem('vendorUser', JSON.stringify(updatedVendor));
      
    } catch (error) {
      console.error('Update business settings error:', error);
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (user) {
      setFormData({
        businessType: user.businessType || '',
        businessRegistrationNumber: user.businessRegistrationNumber || '',
        taxIdentificationNumber: user.taxIdentificationNumber || '',
        yearsInBusiness: user.yearsInBusiness || '',
        expectedMonthlyVolume: user.expectedMonthlyVolume || '',
        primaryProducts: user.primaryProducts || [],
        certifications: user.certifications || [],
        socialMediaLinks: {
          facebook: user.socialMediaLinks?.facebook || '',
          website: user.socialMediaLinks?.website || '',
          whatsapp: user.socialMediaLinks?.whatsapp || ''
        },
        businessHours: user.businessHours || {
          monday: { open: '09:00', close: '18:00', closed: false },
          tuesday: { open: '09:00', close: '18:00', closed: false },
          wednesday: { open: '09:00', close: '18:00', closed: false },
          thursday: { open: '09:00', close: '18:00', closed: false },
          friday: { open: '09:00', close: '18:00', closed: false },
          saturday: { open: '09:00', close: '18:00', closed: false },
          sunday: { open: '09:00', close: '18:00', closed: true }
        }
      });
    }
    setIsEditing(false);
    setMessage({ type: '', text: '' });
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Business Information</h2>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Edit2 className="mr-2 h-4 w-4" />
            Edit Business Info
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
        <div className={`mb-6 p-4 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-700 border border-green-200' 
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      <div className="space-y-8">
        {/* Business Details */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Building className="mr-2 h-5 w-5" />
            Business Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Type
              </label>
              <select
                name="businessType"
                value={formData.businessType}
                onChange={handleInputChange}
                disabled={!isEditing}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
              >
                <option value="">Select business type</option>
                {businessTypes.map(type => (
                  <option key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Years in Business
              </label>
              <input
                type="number"
                name="yearsInBusiness"
                value={formData.yearsInBusiness}
                onChange={handleInputChange}
                disabled={!isEditing}
                min="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                placeholder="Enter years in business"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Registration Number
              </label>
              <input
                type="text"
                name="businessRegistrationNumber"
                value={formData.businessRegistrationNumber}
                onChange={handleInputChange}
                disabled={!isEditing}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                placeholder="Enter registration number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tax Identification Number
              </label>
              <input
                type="text"
                name="taxIdentificationNumber"
                value={formData.taxIdentificationNumber}
                onChange={handleInputChange}
                disabled={!isEditing}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                placeholder="Enter TIN"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Expected Monthly Volume
              </label>
              <select
                name="expectedMonthlyVolume"
                value={formData.expectedMonthlyVolume}
                onChange={handleInputChange}
                disabled={!isEditing}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
              >
                <option value="">Select expected volume</option>
                {volumeOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Primary Products */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Package className="mr-2 h-5 w-5" />
              Primary Products
            </h3>
            {isEditing && (
              <button
                onClick={addProduct}
                className="flex items-center px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
              >
                <Plus className="mr-1 h-4 w-4" />
                Add Product
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.primaryProducts.map((product, index) => (
              <div key={index} className="flex items-center bg-white px-3 py-1 rounded-md border">
                <span className="text-sm">{product}</span>
                {isEditing && (
                  <button
                    onClick={() => removeProduct(index)}
                    className="ml-2 text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
            {formData.primaryProducts.length === 0 && (
              <p className="text-gray-500 text-sm">No products added yet</p>
            )}
          </div>
        </div>

        {/* Certifications */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Award className="mr-2 h-5 w-5" />
              Certifications
            </h3>
            {isEditing && (
              <button
                onClick={addCertification}
                className="flex items-center px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
              >
                <Plus className="mr-1 h-4 w-4" />
                Add Certification
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.certifications.map((cert, index) => (
              <div key={index} className="flex items-center bg-white px-3 py-1 rounded-md border">
                <span className="text-sm">{cert}</span>
                {isEditing && (
                  <button
                    onClick={() => removeCertification(index)}
                    className="ml-2 text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
            {formData.certifications.length === 0 && (
              <p className="text-gray-500 text-sm">No certifications added yet</p>
            )}
          </div>
        </div>

        {/* Social Media Links */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Globe className="mr-2 h-5 w-5" />
            Social Media & Contact
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Facebook Page
              </label>
              <input
                type="url"
                value={formData.socialMediaLinks.facebook}
                onChange={(e) => handleSocialMediaChange('facebook', e.target.value)}
                disabled={!isEditing}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                placeholder="https://facebook.com/yourpage"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Website
              </label>
              <input
                type="url"
                value={formData.socialMediaLinks.website}
                onChange={(e) => handleSocialMediaChange('website', e.target.value)}
                disabled={!isEditing}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                placeholder="https://yourwebsite.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                WhatsApp
              </label>
              <input
                type="tel"
                value={formData.socialMediaLinks.whatsapp}
                onChange={(e) => handleSocialMediaChange('whatsapp', e.target.value)}
                disabled={!isEditing}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                placeholder="+8801234567890"
              />
            </div>
          </div>
        </div>

        {/* Business Hours */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Clock className="mr-2 h-5 w-5" />
            Business Hours
          </h3>
          <div className="space-y-3">
            {days.map(day => (
              <div key={day} className="flex items-center space-x-4">
                <div className="w-20">
                  <span className="text-sm font-medium text-gray-700 capitalize">
                    {day}
                  </span>
                </div>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.businessHours[day]?.closed || false}
                    onChange={(e) => handleBusinessHoursChange(day, 'closed', e.target.checked)}
                    disabled={!isEditing}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-600">Closed</span>
                </label>

                {!formData.businessHours[day]?.closed && (
                  <>
                    <div className="flex items-center space-x-2">
                      <input
                        type="time"
                        value={formData.businessHours[day]?.open || '09:00'}
                        onChange={(e) => handleBusinessHoursChange(day, 'open', e.target.value)}
                        disabled={!isEditing}
                        className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:bg-gray-50"
                      />
                      <span className="text-gray-500">to</span>
                      <input
                        type="time"
                        value={formData.businessHours[day]?.close || '18:00'}
                        onChange={(e) => handleBusinessHoursChange(day, 'close', e.target.value)}
                        disabled={!isEditing}
                        className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:bg-gray-50"
                      />
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorBusinessSettings;
