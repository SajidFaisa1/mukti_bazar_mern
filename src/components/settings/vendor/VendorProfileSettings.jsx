import React, { useState, useEffect } from 'react';
import { useVendorAuth } from '../../../contexts/VendorAuthContext';
import { getAllDivision, getAllDistrict, getAllUpazila, getAllUnion } from "bd-divisions-to-unions";
import { 
  User, 
  Mail, 
  Phone, 
  Building2, 
  Edit2, 
  Save, 
  X, 
  Camera, 
  Check,
  AlertCircle,
  MapPin,
  CreditCard,
  Shield,
  FileText,
  Globe,
  Calendar,
  Award,
  Package,
  Briefcase
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
    shopLogo: null,
    // Address fields
    address: {
      division: '',
      district: '',
      upazila: '',
      union: '',
      city: '',
      postalCode: ''
    },
    // Business verification fields
    businessRegistrationNumber: '',
    taxIdentificationNumber: '',
    businessType: '',
    yearsInBusiness: 0,
    expectedMonthlyVolume: '',
    primaryProducts: [],
    certifications: [],
    // Banking information
    bankAccountDetails: {
      accountNumber: '',
      bankName: '',
      branchName: '',
      routingNumber: ''
    },
    // Social media links
    socialMediaLinks: {
      facebook: '',
      website: '',
      whatsapp: ''
    }
  });
  const [previewImage, setPreviewImage] = useState(null);

  // Address data
  const [divisions, setDivisions] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [upazilas, setUpazilas] = useState([]);
  const [unions, setUnions] = useState([]);

  // Initialize divisions on component mount
  useEffect(() => {
    try {
      const allDivisions = getAllDivision();
      const divisionArray = Array.isArray(allDivisions) ? allDivisions : Object.values(allDivisions);
      setDivisions(divisionArray);
    } catch (error) {
      console.error('Error loading divisions:', error);
      setDivisions([]);
    }
  }, []);

  useEffect(() => {
    if (user) {
      setFormData({
        sellerName: user.sellerName || '',
        businessName: user.businessName || '',
        phone: user.phone || '',
        description: user.description || '',
        shopLogo: user.shopLogo?.url || null,
        address: {
          division: user.address?.division || '',
          district: user.address?.district || '',
          upazila: user.address?.upazila || '',
          union: user.address?.union || '',
          city: user.address?.city || '',
          postalCode: user.address?.postalCode || ''
        },
        businessRegistrationNumber: user.businessRegistrationNumber || '',
        taxIdentificationNumber: user.taxIdentificationNumber || '',
        businessType: user.businessType || '',
        yearsInBusiness: user.yearsInBusiness || 0,
        expectedMonthlyVolume: user.expectedMonthlyVolume || '',
        primaryProducts: user.primaryProducts || [],
        certifications: user.certifications || [],
        bankAccountDetails: {
          accountNumber: user.bankAccountDetails?.accountNumber || '',
          bankName: user.bankAccountDetails?.bankName || '',
          branchName: user.bankAccountDetails?.branchName || '',
          routingNumber: user.bankAccountDetails?.routingNumber || ''
        },
        socialMediaLinks: {
          facebook: user.socialMediaLinks?.facebook || '',
          website: user.socialMediaLinks?.website || '',
          whatsapp: user.socialMediaLinks?.whatsapp || ''
        }
      });
      setPreviewImage(user.shopLogo?.url || null);
      
      // Load address data based on user's current address
      if (user.address?.division) {
        try {
          const allDistricts = getAllDistrict();
          console.log('getAllDistrict returned:', allDistricts, typeof allDistricts);
          
          // Ensure we have an array to work with
          let districtArray = [];
          if (Array.isArray(allDistricts)) {
            districtArray = allDistricts;
          } else if (allDistricts && typeof allDistricts === 'object') {
            districtArray = Object.values(allDistricts);
          } else {
            console.warn('getAllDistrict returned unexpected format:', allDistricts);
            districtArray = [];
          }
          
          const divisionDistricts = districtArray.filter(d => d && d.division_id === user.address.division);
          setDistricts(divisionDistricts);
          
          if (user.address?.district) {
            const allUpazilas = getAllUpazila();
            console.log('getAllUpazila returned:', allUpazilas, typeof allUpazilas);
            
            // Ensure we have an array to work with
            let upazilaArray = [];
            if (Array.isArray(allUpazilas)) {
              upazilaArray = allUpazilas;
            } else if (allUpazilas && typeof allUpazilas === 'object') {
              upazilaArray = Object.values(allUpazilas);
            } else {
              console.warn('getAllUpazila returned unexpected format:', allUpazilas);
              upazilaArray = [];
            }
            
            const districtUpazilas = upazilaArray.filter(u => u && u.district_id === user.address.district);
            setUpazilas(districtUpazilas);
            
            if (user.address?.upazila) {
              const allUnions = getAllUnion();
              console.log('getAllUnion returned:', allUnions, typeof allUnions);
              
              // Ensure we have an array to work with
              let unionArray = [];
              if (Array.isArray(allUnions)) {
                unionArray = allUnions;
              } else if (allUnions && typeof allUnions === 'object') {
                unionArray = Object.values(allUnions);
              } else {
                console.warn('getAllUnion returned unexpected format:', allUnions);
                unionArray = [];
              }
              
              const upazilaUnions = unionArray.filter(un => un && un.upazilla_id === user.address.upazila);
              setUnions(upazilaUnions);
            }
          }
        } catch (error) {
          console.error('Error loading address data:', error);
        }
      }
    }
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name.includes('.')) {
      // Handle nested object updates
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else if (name === 'primaryProducts' || name === 'certifications') {
      // Handle array fields
      const arrayValue = value.split(',').map(item => item.trim()).filter(item => item);
      setFormData(prev => ({
        ...prev,
        [name]: arrayValue
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }

    // Handle address cascade updates
    if (name === 'address.division') {
      try {
        const allDistricts = getAllDistrict();
        console.log('Division change - getAllDistrict returned:', allDistricts, typeof allDistricts);
        
        // Ensure we have an array to work with
        let districtArray = [];
        if (Array.isArray(allDistricts)) {
          districtArray = allDistricts;
        } else if (allDistricts && typeof allDistricts === 'object') {
          districtArray = Object.values(allDistricts);
        } else {
          console.warn('Division change - getAllDistrict returned unexpected format:', allDistricts);
          districtArray = [];
        }
        
        const divisionDistricts = districtArray.filter(d => d && d.division_id === value);
        setDistricts(divisionDistricts);
        setUpazilas([]);
        setUnions([]);
        setFormData(prev => ({
          ...prev,
          address: {
            ...prev.address,
            district: '',
            upazila: '',
            union: ''
          }
        }));
      } catch (error) {
        console.error('Error loading districts:', error);
      }
    } else if (name === 'address.district') {
      try {
        const allUpazilas = getAllUpazila();
        console.log('District change - getAllUpazila returned:', allUpazilas, typeof allUpazilas);
        
        // Ensure we have an array to work with
        let upazilaArray = [];
        if (Array.isArray(allUpazilas)) {
          upazilaArray = allUpazilas;
        } else if (allUpazilas && typeof allUpazilas === 'object') {
          upazilaArray = Object.values(allUpazilas);
        } else {
          console.warn('District change - getAllUpazila returned unexpected format:', allUpazilas);
          upazilaArray = [];
        }
        
        const districtUpazilas = upazilaArray.filter(u => u && u.district_id === value);
        setUpazilas(districtUpazilas);
        setUnions([]);
        setFormData(prev => ({
          ...prev,
          address: {
            ...prev.address,
            upazila: '',
            union: ''
          }
        }));
      } catch (error) {
        console.error('Error loading upazilas:', error);
      }
    } else if (name === 'address.upazila') {
      try {
        const allUnions = getAllUnion();
        console.log('Upazila change - getAllUnion returned:', allUnions, typeof allUnions);
        
        // Ensure we have an array to work with
        let unionArray = [];
        if (Array.isArray(allUnions)) {
          unionArray = allUnions;
        } else if (allUnions && typeof allUnions === 'object') {
          unionArray = Object.values(allUnions);
        } else {
          console.warn('Upazila change - getAllUnion returned unexpected format:', allUnions);
          unionArray = [];
        }
        
        const upazilaUnions = unionArray.filter(un => un && un.upazilla_id === value);
        setUnions(upazilaUnions);
        setFormData(prev => ({
          ...prev,
          address: {
            ...prev.address,
            union: ''
          }
        }));
      } catch (error) {
        console.error('Error loading unions:', error);
      }
    }
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
        description: formData.description,
        address: formData.address,
        businessRegistrationNumber: formData.businessRegistrationNumber,
        taxIdentificationNumber: formData.taxIdentificationNumber,
        businessType: formData.businessType,
        yearsInBusiness: parseInt(formData.yearsInBusiness) || 0,
        expectedMonthlyVolume: formData.expectedMonthlyVolume,
        primaryProducts: formData.primaryProducts,
        certifications: formData.certifications,
        bankAccountDetails: formData.bankAccountDetails,
        socialMediaLinks: formData.socialMediaLinks
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
        shopLogo: user.shopLogo?.url || null,
        address: {
          division: user.address?.division || '',
          district: user.address?.district || '',
          upazila: user.address?.upazila || '',
          union: user.address?.union || '',
          city: user.address?.city || '',
          postalCode: user.address?.postalCode || ''
        },
        businessRegistrationNumber: user.businessRegistrationNumber || '',
        taxIdentificationNumber: user.taxIdentificationNumber || '',
        businessType: user.businessType || '',
        yearsInBusiness: user.yearsInBusiness || 0,
        expectedMonthlyVolume: user.expectedMonthlyVolume || '',
        primaryProducts: user.primaryProducts || [],
        certifications: user.certifications || [],
        bankAccountDetails: {
          accountNumber: user.bankAccountDetails?.accountNumber || '',
          bankName: user.bankAccountDetails?.bankName || '',
          branchName: user.bankAccountDetails?.branchName || '',
          routingNumber: user.bankAccountDetails?.routingNumber || ''
        },
        socialMediaLinks: {
          facebook: user.socialMediaLinks?.facebook || '',
          website: user.socialMediaLinks?.website || '',
          whatsapp: user.socialMediaLinks?.whatsapp || ''
        }
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

      <div className="space-y-8">
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
                  <Building2 className="h-8 w-8 text-gray-400" />
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
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <User className="mr-2 h-5 w-5 text-green-600" />
            Basic Information
          </h3>
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
                <Building2 className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
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
          <div className="mt-6">
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
        </div>

        {/* Business Verification */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Shield className="mr-2 h-5 w-5 text-blue-600" />
            Business Verification
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                placeholder="e.g., TRAD/DNCC/123456/2023"
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
                placeholder="Enter TIN number"
              />
            </div>

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
                <option value="">Select Business Type</option>
                <option value="farmer">Individual Farmer</option>
                <option value="cooperative">Farmers' Cooperative</option>
                <option value="wholesaler">Agricultural Wholesaler</option>
                <option value="processor">Food Processor</option>
                <option value="retailer">Agricultural Retailer</option>
                <option value="exporter">Agricultural Exporter</option>
                <option value="supplier">Input Supplier</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Years in Business
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type="number"
                  name="yearsInBusiness"
                  value={formData.yearsInBusiness}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  min="0"
                  max="50"
                  className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                  placeholder="e.g., 5"
                />
              </div>
            </div>

            <div>
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
                <option value="">Select Expected Volume</option>
                <option value="under-10k">Under ৳10,000</option>
                <option value="10k-50k">৳10,000 - ৳50,000</option>
                <option value="50k-200k">৳50,000 - ৳2,00,000</option>
                <option value="200k-500k">৳2,00,000 - ৳5,00,000</option>
                <option value="500k-1m">৳5,00,000 - ৳10,00,000</option>
                <option value="over-1m">Over ৳10,00,000</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Primary Products
              </label>
              <div className="relative">
                <Package className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  name="primaryProducts"
                  value={formData.primaryProducts.join(', ')}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                  placeholder="e.g., Rice, Wheat, Vegetables (comma-separated)"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Certifications
              </label>
              <div className="relative">
                <Award className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  name="certifications"
                  value={formData.certifications.join(', ')}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                  placeholder="e.g., Organic, GAP, ISO (comma-separated)"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Address Information */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <MapPin className="mr-2 h-5 w-5 text-emerald-600" />
            Address Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Division
              </label>
              <select
                name="address.division"
                value={formData.address.division}
                onChange={handleInputChange}
                disabled={!isEditing}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
              >
                <option value="">Select Division</option>
                {divisions.map((division) => (
                  <option key={division.id} value={division.id}>
                    {division.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                District
              </label>
              <select
                name="address.district"
                value={formData.address.district}
                onChange={handleInputChange}
                disabled={!isEditing || !formData.address.division}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
              >
                <option value="">Select District</option>
                {districts.map((district) => (
                  <option key={district.id} value={district.id}>
                    {district.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upazila
              </label>
              <select
                name="address.upazila"
                value={formData.address.upazila}
                onChange={handleInputChange}
                disabled={!isEditing || !formData.address.district}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
              >
                <option value="">Select Upazila</option>
                {upazilas.map((upazila) => (
                  <option key={upazila.id} value={upazila.id}>
                    {upazila.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Union
              </label>
              <select
                name="address.union"
                value={formData.address.union}
                onChange={handleInputChange}
                disabled={!isEditing || !formData.address.upazila}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
              >
                <option value="">Select Union</option>
                {unions.map((union) => (
                  <option key={union.id} value={union.id}>
                    {union.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                City/Town
              </label>
              <input
                type="text"
                name="address.city"
                value={formData.address.city}
                onChange={handleInputChange}
                disabled={!isEditing}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                placeholder="Enter city/town"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Postal Code
              </label>
              <input
                type="text"
                name="address.postalCode"
                value={formData.address.postalCode}
                onChange={handleInputChange}
                disabled={!isEditing}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                placeholder="Enter postal code"
              />
            </div>
          </div>
        </div>

        {/* Banking Information */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <CreditCard className="mr-2 h-5 w-5 text-purple-600" />
            Banking Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bank Name
              </label>
              <input
                type="text"
                name="bankAccountDetails.bankName"
                value={formData.bankAccountDetails.bankName}
                onChange={handleInputChange}
                disabled={!isEditing}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                placeholder="e.g., Dutch Bangla Bank"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Branch Name
              </label>
              <input
                type="text"
                name="bankAccountDetails.branchName"
                value={formData.bankAccountDetails.branchName}
                onChange={handleInputChange}
                disabled={!isEditing}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                placeholder="e.g., Dhanmondi Branch"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Account Number
              </label>
              <input
                type="text"
                name="bankAccountDetails.accountNumber"
                value={formData.bankAccountDetails.accountNumber}
                onChange={handleInputChange}
                disabled={!isEditing}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                placeholder="Enter account number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Routing Number
              </label>
              <input
                type="text"
                name="bankAccountDetails.routingNumber"
                value={formData.bankAccountDetails.routingNumber}
                onChange={handleInputChange}
                disabled={!isEditing}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                placeholder="Enter routing number"
              />
            </div>
          </div>
        </div>

        {/* Social Media Links */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Globe className="mr-2 h-5 w-5 text-indigo-600" />
            Social Media & Online Presence
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Facebook Page
              </label>
              <input
                type="url"
                name="socialMediaLinks.facebook"
                value={formData.socialMediaLinks.facebook}
                onChange={handleInputChange}
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
                name="socialMediaLinks.website"
                value={formData.socialMediaLinks.website}
                onChange={handleInputChange}
                disabled={!isEditing}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                placeholder="https://yourwebsite.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                WhatsApp Number
              </label>
              <input
                type="tel"
                name="socialMediaLinks.whatsapp"
                value={formData.socialMediaLinks.whatsapp}
                onChange={handleInputChange}
                disabled={!isEditing}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                placeholder="01XXXXXXXXX"
              />
            </div>
          </div>
        </div>

        {/* Account Status */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Briefcase className="mr-2 h-5 w-5 text-gray-600" />
            Account Status
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${
                user.verificationStatus === 'approved' ? 'bg-green-500' : 
                user.verificationStatus === 'under_review' ? 'bg-yellow-500' : 
                user.verificationStatus === 'rejected' ? 'bg-red-500' : 'bg-gray-400'
              }`} />
              <span className="text-sm text-gray-700">
                {user.verificationStatus?.replace('_', ' ') || 'Pending'} Verification
              </span>
            </div>
          </div>
          
          {/* Additional Status Information */}
          {user.trustScore !== undefined && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <span className="text-sm font-medium text-gray-700">Trust Score:</span>
                  <div className="flex items-center mt-1">
                    <div className="w-full bg-gray-200 rounded-full h-2 mr-2">
                      <div 
                        className={`h-2 rounded-full ${
                          user.trustScore >= 80 ? 'bg-green-500' :
                          user.trustScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${user.trustScore}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600">{user.trustScore}/100</span>
                  </div>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-700">Store Rating:</span>
                  <div className="text-sm text-gray-600 mt-1">
                    {user.storeRatingAvg ? `${user.storeRatingAvg.toFixed(1)}/5.0 (${user.storeRatingCount} reviews)` : 'No ratings yet'}
                  </div>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-700">Risk Level:</span>
                  <div className={`text-sm mt-1 font-medium ${
                    user.verificationLevel === 'low_risk' ? 'text-green-600' :
                    user.verificationLevel === 'medium_risk' ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {user.verificationLevel?.replace('_', ' ') || 'Unknown'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VendorProfileSettings;
