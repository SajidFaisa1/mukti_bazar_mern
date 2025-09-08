import React, { useEffect, useState } from 'react';
import { MapPin, Plus, Home, Building, Edit, Trash2, Star } from 'lucide-react';
import axios from 'axios';
import AddAddressModal from './AddAddressModal';
import { useVendorAuth } from '../../contexts/VendorAuthContext';
import { useClientAuth } from '../../contexts/ClientAuthContext';

const AddressBook = () => {
  const vendorAuth = useVendorAuth() || {};
  const clientAuth = useClientAuth() || {};
  const token = vendorAuth.token || clientAuth.token || sessionStorage.getItem('vendorToken') || sessionStorage.getItem('clientToken') || '';
  
  // Determine current user info and role
  const currentUser = vendorAuth.user || clientAuth.user;
  const userRole = vendorAuth.user ? 'vendor' : (clientAuth.user ? 'client' : null);

  const [addresses, setAddresses] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadAddresses = async () => {
    try {
      const res = await axios.get('/api/addresses', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAddresses(res.data);
    } catch (err) {
      setError('Could not load addresses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) loadAddresses();
  }, [token]);

  const handleDeleteAddress = async (addressId) => {
    if (!confirm('Are you sure you want to delete this address?')) return;
    
    try {
      await axios.delete(`/api/addresses/${addressId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      loadAddresses();
    } catch (err) {
      alert('Failed to delete address');
    }
  };

  const formatRegion = (addr) => {
    const parts = [];
    if (addr.city) parts.push(addr.city);
    if (addr.district) parts.push(addr.district);
    if (addr.state && !/^\d+$/.test(addr.state)) parts.push(addr.state);
    return parts.join(', ');
  };

  const getAddressIcon = (label) => {
    switch (label?.toLowerCase()) {
      case 'home':
        return Home;
      case 'office':
      case 'work':
        return Building;
      default:
        return MapPin;
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
        <div className="text-center">
          <div className="bg-red-100 rounded-full p-3 mx-auto w-16 h-16 flex items-center justify-center mb-4">
            <MapPin size={24} className="text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Addresses</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={loadAddresses}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 rounded-xl p-2.5">
              <MapPin size={20} className="text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Address Book</h3>
              <p className="text-sm text-gray-600">Manage your saved addresses</p>
            </div>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <Plus size={16} />
            Add Address
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {addresses.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-gray-100 rounded-full p-4 mx-auto w-20 h-20 flex items-center justify-center mb-4">
              <MapPin size={32} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Addresses Yet</h3>
            <p className="text-gray-600 mb-6">Add your first address to get started with faster checkout</p>
            <button
              onClick={() => setShowModal(true)}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Add Your First Address
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {addresses.map((addr) => {
              const IconComponent = getAddressIcon(addr.label);
              return (
                <div
                  key={addr._id}
                  className={`relative p-4 border rounded-xl transition-all hover:shadow-md ${
                    addr.isDefault
                      ? 'border-emerald-200 bg-emerald-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {addr.isDefault && (
                    <div className="absolute top-4 right-4">
                      <span className="bg-emerald-600 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                        <Star size={12} />
                        Default
                      </span>
                    </div>
                  )}

                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-lg ${
                      addr.isDefault ? 'bg-emerald-100' : 'bg-gray-100'
                    }`}>
                      <IconComponent size={20} className={
                        addr.isDefault ? 'text-emerald-600' : 'text-gray-600'
                      } />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-gray-900">{addr.label || 'Address'}</h4>
                      </div>
                      
                      <div className="space-y-1">
                        <p className="font-medium text-gray-800">{addr.name}</p>
                        <p className="text-gray-600">{addr.phone}</p>
                        <div className="text-gray-600">
                          <p>{addr.addressLine1}</p>
                          {addr.addressLine2 && <p>{addr.addressLine2}</p>}
                          <p>
                            {formatRegion(addr)}
                            {addr.zip && `, ${addr.zip}`}
                          </p>
                          <p>{addr.country}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => {/* Handle edit */}}
                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit address"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteAddress(addr._id)}
                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete address"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <AddAddressModal 
          token={token} 
          uid={currentUser?.uid}
          role={userRole}
          onClose={() => setShowModal(false)} 
          onSaved={loadAddresses} 
        />
      )}
    </div>
  );
};

export default AddressBook;
