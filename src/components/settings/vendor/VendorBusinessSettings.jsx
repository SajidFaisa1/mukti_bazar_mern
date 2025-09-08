import React, { useState, useEffect } from 'react';
import { useVendorAuth } from '../../../contexts/VendorAuthContext';
import { Store, Camera, Globe, Clock, MapPin, Phone, Mail, Save, AlertCircle, Building2, Package, Calendar, Award } from 'lucide-react';

const VendorBusinessSettings = () => {
  const { user, token } = useVendorAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [businessData, setBusinessData] = useState({
    businessName: '',
    businessType: '',
    description: '',
    website: '',
    phone: '',
    email: '',
    businessRegistrationNumber: '',
    taxIdentificationNumber: '',
    yearsInBusiness: 0,
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
      saturday: { open: '10:00', close: '16:00', closed: false },
      sunday: { open: '10:00', close: '16:00', closed: true }
    },
    policies: {
      returnPolicy: '30-day return policy for all products',
      shippingPolicy: 'Free shipping for orders above 500 BDT',
      refundPolicy: 'Full refund within 7 days of return'
    }
  });

  useEffect(() => {
    if (user) {
      setBusinessData({
        businessName: user.businessName || '',
        businessType: user.businessType || '',
        description: user.description || '',
        website: user.socialMediaLinks?.website || '',
        phone: user.phone || '',
        email: user.email || '',
        businessRegistrationNumber: user.businessRegistrationNumber || '',
        taxIdentificationNumber: user.taxIdentificationNumber || '',
        yearsInBusiness: user.yearsInBusiness || 0,
        expectedMonthlyVolume: user.expectedMonthlyVolume || '',
        primaryProducts: user.primaryProducts || [],
        certifications: user.certifications || [],
        socialMediaLinks: {
          facebook: user.socialMediaLinks?.facebook || '',
          website: user.socialMediaLinks?.website || '',
          whatsapp: user.socialMediaLinks?.whatsapp || ''
        },
        businessHours: {
          monday: { open: '09:00', close: '18:00', closed: false },
          tuesday: { open: '09:00', close: '18:00', closed: false },
          wednesday: { open: '09:00', close: '18:00', closed: false },
          thursday: { open: '09:00', close: '18:00', closed: false },
          friday: { open: '09:00', close: '18:00', closed: false },
          saturday: { open: '10:00', close: '16:00', closed: false },
          sunday: { open: '10:00', close: '16:00', closed: true }
        },
        policies: {
          returnPolicy: '30-day return policy for all products',
          shippingPolicy: 'Free shipping for orders above 500 BDT',
          refundPolicy: 'Full refund within 7 days of return'
        }
      });
    }
  }, [user]);

  const handleInputChange = (field, value) => {
    if (field.includes('.')) {
      // Handle nested object updates
      const [parent, child] = field.split('.');
      setBusinessData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else if (field === 'primaryProducts' || field === 'certifications') {
      // Handle array fields
      const arrayValue = value.split(',').map(item => item.trim()).filter(item => item);
      setBusinessData(prev => ({
        ...prev,
        [field]: arrayValue
      }));
    } else {
      setBusinessData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleHoursChange = (day, field, value) => {
    setBusinessData(prev => ({
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

  const handlePolicyChange = (policy, value) => {
    setBusinessData(prev => ({
      ...prev,
      policies: {
        ...prev.policies,
        [policy]: value
      }
    }));
  };

  const handleSocialMediaChange = (platform, value) => {
    setBusinessData(prev => ({
      ...prev,
      socialMediaLinks: {
        ...prev.socialMediaLinks,
        [platform]: value
      }
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
        businessName: businessData.businessName,
        businessType: businessData.businessType,
        description: businessData.description,
        phone: businessData.phone,
        businessRegistrationNumber: businessData.businessRegistrationNumber,
        taxIdentificationNumber: businessData.taxIdentificationNumber,
        yearsInBusiness: parseInt(businessData.yearsInBusiness) || 0,
        expectedMonthlyVolume: businessData.expectedMonthlyVolume,
        primaryProducts: businessData.primaryProducts,
        certifications: businessData.certifications,
        socialMediaLinks: businessData.socialMediaLinks
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
      
      // Update local storage
      sessionStorage.setItem('vendorUser', JSON.stringify(updatedVendor));
      
    } catch (error) {
      console.error('Update business settings error:', error);
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const businessTypes = [
    { value: '', label: 'Select Business Type' },
    { value: 'farmer', label: 'Individual Farmer' },
    { value: 'cooperative', label: 'Farmers\' Cooperative' },
    { value: 'wholesaler', label: 'Agricultural Wholesaler' },
    { value: 'processor', label: 'Food Processor' },
    { value: 'retailer', label: 'Agricultural Retailer' },
    { value: 'exporter', label: 'Agricultural Exporter' },
    { value: 'supplier', label: 'Input Supplier' }
  ];

  const volumeOptions = [
    { value: '', label: 'Select Expected Volume' },
    { value: 'under-10k', label: 'Under ৳10,000' },
    { value: '10k-50k', label: '৳10,000 - ৳50,000' },
    { value: '50k-200k', label: '৳50,000 - ৳2,00,000' },
    { value: '200k-500k', label: '৳2,00,000 - ৳5,00,000' },
    { value: '500k-1m', label: '৳5,00,000 - ৳10,00,000' },
    { value: 'over-1m', label: 'Over ৳10,00,000' }
  ];

  if (!user) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-500">Loading...</div>
      </div>
    );
  }

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <Store className="h-6 w-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-800">Business Settings</h2>
        </div>
        <p className="text-gray-600 mt-1">Manage your store information and business details</p>
      </div>

      <div className="p-6 space-y-8">
        {/* Message Display */}
        {message.text && (
          <div className={`p-4 rounded-lg flex items-center ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-700 border border-green-200' 
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {message.type === 'success' ? (
              <Save className="mr-2 h-5 w-5" />
            ) : (
              <AlertCircle className="mr-2 h-5 w-5" />
            )}
            {message.text}
          </div>
        )}

        {/* Basic Business Information */}
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <Building2 className="mr-2 h-5 w-5 text-blue-600" />
            Basic Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Name
              </label>
              <input
                type="text"
                value={businessData.businessName}
                onChange={(e) => handleInputChange('businessName', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Type
              </label>
              <select
                value={businessData.businessType}
                onChange={(e) => handleInputChange('businessType', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {businessTypes.map((type) => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Registration Number
              </label>
              <input
                type="text"
                value={businessData.businessRegistrationNumber}
                onChange={(e) => handleInputChange('businessRegistrationNumber', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., TRAD/DNCC/123456/2023"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tax Identification Number
              </label>
              <input
                type="text"
                value={businessData.taxIdentificationNumber}
                onChange={(e) => handleInputChange('taxIdentificationNumber', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter TIN number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="inline h-4 w-4 mr-1" />
                Years in Business
              </label>
              <input
                type="number"
                value={businessData.yearsInBusiness}
                onChange={(e) => handleInputChange('yearsInBusiness', e.target.value)}
                min="0"
                max="50"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., 5"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Expected Monthly Volume
              </label>
              <select
                value={businessData.expectedMonthlyVolume}
                onChange={(e) => handleInputChange('expectedMonthlyVolume', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {volumeOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Package className="inline h-4 w-4 mr-1" />
                Primary Products
              </label>
              <input
                type="text"
                value={businessData.primaryProducts.join(', ')}
                onChange={(e) => handleInputChange('primaryProducts', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Rice, Wheat, Vegetables (comma-separated)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Award className="inline h-4 w-4 mr-1" />
                Certifications
              </label>
              <input
                type="text"
                value={businessData.certifications.join(', ')}
                onChange={(e) => handleInputChange('certifications', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Organic, GAP, ISO (comma-separated)"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Description
              </label>
              <textarea
                value={businessData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Tell customers about your business..."
              />
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Contact Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Phone className="inline h-4 w-4 mr-1" />
                Phone Number
              </label>
              <input
                type="tel"
                value={businessData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Mail className="inline h-4 w-4 mr-1" />
                Business Email
              </label>
              <input
                type="email"
                value={businessData.email}
                disabled
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
              />
              <p className="text-xs text-gray-500 mt-1">Email cannot be changed here</p>
            </div>
          </div>
        </div>

        {/* Social Media Links */}
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            <Globe className="inline h-5 w-5 mr-2" />
            Online Presence
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Facebook Page
              </label>
              <input
                type="url"
                value={businessData.socialMediaLinks.facebook}
                onChange={(e) => handleSocialMediaChange('facebook', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="https://facebook.com/your-page"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Website URL
              </label>
              <input
                type="url"
                value={businessData.socialMediaLinks.website}
                onChange={(e) => handleSocialMediaChange('website', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="https://your-website.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                WhatsApp Number
              </label>
              <input
                type="tel"
                value={businessData.socialMediaLinks.whatsapp}
                onChange={(e) => handleSocialMediaChange('whatsapp', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="01XXXXXXXXX"
              />
            </div>
          </div>
        </div>

        {/* Business Hours */}
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            <Clock className="inline h-5 w-5 mr-2" />
            Business Hours
          </h3>
          <div className="space-y-3">
            {days.map((day) => (
              <div key={day} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="w-20">
                  <span className="font-medium text-gray-700 capitalize">{day}</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!businessData.businessHours[day].closed}
                    onChange={(e) => handleHoursChange(day, 'closed', !e.target.checked)}
                    className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-600">Open</span>
                </div>
                {!businessData.businessHours[day].closed && (
                  <>
                    <input
                      type="time"
                      value={businessData.businessHours[day].open}
                      onChange={(e) => handleHoursChange(day, 'open', e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <span className="text-gray-500">to</span>
                    <input
                      type="time"
                      value={businessData.businessHours[day].close}
                      onChange={(e) => handleHoursChange(day, 'close', e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Business Policies */}
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Business Policies</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Return Policy
              </label>
              <textarea
                value={businessData.policies.returnPolicy}
                onChange={(e) => handlePolicyChange('returnPolicy', e.target.value)}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Shipping Policy
              </label>
              <textarea
                value={businessData.policies.shippingPolicy}
                onChange={(e) => handlePolicyChange('shippingPolicy', e.target.value)}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Refund Policy
              </label>
              <textarea
                value={businessData.policies.refundPolicy}
                onChange={(e) => handlePolicyChange('refundPolicy', e.target.value)}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-6 border-t border-gray-200">
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <Save size={18} />
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VendorBusinessSettings;
