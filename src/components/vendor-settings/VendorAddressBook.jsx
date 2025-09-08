import React, { useState, useEffect } from 'react';
import { useVendorAuth } from '../../contexts/VendorAuthContext';
import { 
  MapPin, 
  Plus, 
  Edit2, 
  Trash2, 
  Save, 
  X,
  Home,
  Building,
  Check,
  AlertCircle
} from 'lucide-react';

const VendorAddressBook = () => {
  const { user, token } = useVendorAuth();
  const [addresses, setAddresses] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [formData, setFormData] = useState({
    type: 'business',
    label: '',
    division: '',
    district: '',
    upazila: '',
    union: '',
    city: '',
    postalCode: '',
    address: ''
  });

  const addressTypes = [
    { value: 'business', label: 'Business Address', icon: Building },
    { value: 'warehouse', label: 'Warehouse', icon: Home },
    { value: 'pickup', label: 'Pickup Point', icon: MapPin }
  ];

  const divisions = [
    'Dhaka', 'Chittagong', 'Rajshahi', 'Khulna', 'Barisal', 'Sylhet', 'Rangpur', 'Mymensingh'
  ];

  useEffect(() => {
    fetchAddresses();
  }, []);

  const fetchAddresses = async () => {
    try {
      const response = await fetch(`http://localhost:5005/api/vendors/${user?.uid}/addresses`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAddresses(data.addresses || []);
      }
    } catch (error) {
      console.error('Failed to fetch addresses:', error);
      // Fallback to user's main address if API fails
      if (user?.address) {
        setAddresses([{
          _id: 'main',
          type: 'business',
          label: 'Main Business Address',
          ...user.address,
          isMain: true
        }]);
      }
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const resetForm = () => {
    setFormData({
      type: 'business',
      label: '',
      division: '',
      district: '',
      upazila: '',
      union: '',
      city: '',
      postalCode: '',
      address: ''
    });
  };

  const handleAdd = () => {
    setIsAdding(true);
    setEditingId(null);
    resetForm();
  };

  const handleEdit = (address) => {
    setEditingId(address._id);
    setIsAdding(false);
    setFormData({
      type: address.type || 'business',
      label: address.label || '',
      division: address.division || '',
      district: address.district || '',
      upazila: address.upazila || '',
      union: address.union || '',
      city: address.city || '',
      postalCode: address.postalCode || '',
      address: address.address || ''
    });
  };

  const handleSave = async () => {
    if (!formData.label || !formData.division || !formData.district) {
      setMessage({ type: 'error', text: 'Please fill in all required fields' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const addressData = {
        ...formData,
        vendorId: user.uid
      };

      let response;
      if (editingId && editingId !== 'main') {
        // Update existing address
        response = await fetch(`http://localhost:5005/api/vendors/${user.uid}/addresses/${editingId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(addressData)
        });
      } else if (editingId === 'main') {
        // Update main business address
        response = await fetch(`http://localhost:5005/api/vendors/${user.uid}/profile`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            uid: user.uid,
            address: {
              division: formData.division,
              district: formData.district,
              upazila: formData.upazila,
              union: formData.union,
              city: formData.city,
              postalCode: formData.postalCode
            }
          })
        });
      } else {
        // Add new address
        response = await fetch(`http://localhost:5005/api/vendors/${user.uid}/addresses`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(addressData)
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save address');
      }

      setMessage({ type: 'success', text: 'Address saved successfully!' });
      setIsAdding(false);
      setEditingId(null);
      resetForm();
      fetchAddresses();
      
    } catch (error) {
      console.error('Save address error:', error);
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (addressId) => {
    if (addressId === 'main') {
      setMessage({ type: 'error', text: 'Cannot delete main business address' });
      return;
    }

    if (!confirm('Are you sure you want to delete this address?')) return;

    try {
      const response = await fetch(`http://localhost:5005/api/vendors/${user.uid}/addresses/${addressId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete address');
      }

      setMessage({ type: 'success', text: 'Address deleted successfully!' });
      fetchAddresses();
      
    } catch (error) {
      console.error('Delete address error:', error);
      setMessage({ type: 'error', text: error.message });
    }
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    resetForm();
    setMessage({ type: '', text: '' });
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Address Book</h2>
          <p className="text-gray-600">Manage your business addresses and pickup points</p>
        </div>
        {!isAdding && !editingId && (
          <button
            onClick={handleAdd}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Address
          </button>
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

      {/* Add/Edit Form */}
      {(isAdding || editingId) && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {editingId ? 'Edit Address' : 'Add New Address'}
            </h3>
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
                Save Address
              </button>
              <button
                onClick={handleCancel}
                className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <X className="mr-2 h-4 w-4" />
                Cancel
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address Type *
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                {addressTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address Label *
              </label>
              <input
                type="text"
                name="label"
                value={formData.label}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="e.g., Main Office, Warehouse 1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Division *
              </label>
              <select
                name="division"
                value={formData.division}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">Select Division</option>
                {divisions.map(division => (
                  <option key={division} value={division}>{division}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                District *
              </label>
              <input
                type="text"
                name="district"
                value={formData.district}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Enter district"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upazila
              </label>
              <input
                type="text"
                name="upazila"
                value={formData.upazila}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Enter upazila"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Union
              </label>
              <input
                type="text"
                name="union"
                value={formData.union}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Enter union"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                City/Area
              </label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Enter city or area"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Postal Code
              </label>
              <input
                type="text"
                name="postalCode"
                value={formData.postalCode}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Enter postal code"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Detailed Address
              </label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Enter detailed address (building, road, landmarks)"
              />
            </div>
          </div>
        </div>
      )}

      {/* Address List */}
      <div className="space-y-4">
        {addresses.map((address) => {
          const AddressIcon = addressTypes.find(type => type.value === address.type)?.icon || MapPin;
          
          return (
            <div key={address._id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 flex-1">
                  <div className="p-2 bg-green-50 rounded-lg">
                    <AddressIcon className="h-5 w-5 text-green-600" />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 mr-2">
                        {address.label || 'Unnamed Address'}
                      </h3>
                      {address.isMain && (
                        <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                          Main
                        </span>
                      )}
                    </div>
                    
                    <div className="text-gray-600 space-y-1">
                      <p className="font-medium">{address.type?.charAt(0).toUpperCase() + address.type?.slice(1)} Address</p>
                      <p>
                        {[address.union, address.upazila || address.city, address.district, address.division]
                          .filter(Boolean).join(', ')}
                      </p>
                      {address.postalCode && (
                        <p>Postal Code: {address.postalCode}</p>
                      )}
                      {address.address && (
                        <p className="text-sm">{address.address}</p>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleEdit(address)}
                    className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  
                  {!address.isMain && (
                    <button
                      onClick={() => handleDelete(address._id)}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        
        {addresses.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <MapPin className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No addresses added yet</p>
            <p className="text-sm">Add your business addresses and pickup points</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default VendorAddressBook;
