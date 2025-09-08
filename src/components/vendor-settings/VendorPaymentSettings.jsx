import React, { useState, useEffect } from 'react';
import { useVendorAuth } from '../../contexts/VendorAuthContext';
import { 
  CreditCard, 
  Building, 
  MapPin, 
  Edit2, 
  Save, 
  X,
  DollarSign,
  Banknote,
  Check,
  AlertCircle
} from 'lucide-react';

const VendorPaymentSettings = () => {
  const { user, token } = useVendorAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [formData, setFormData] = useState({
    bankAccountDetails: {
      accountNumber: '',
      bankName: '',
      branchName: '',
      routingNumber: ''
    },
    paymentMethods: {
      bkash: '',
      nagad: '',
      rocket: ''
    },
    taxInfo: {
      vatRegistration: '',
      tinNumber: ''
    }
  });

  const popularBanks = [
    'Bangladesh Bank',
    'Sonali Bank',
    'Janata Bank',
    'Agrani Bank',
    'Rupali Bank',
    'Dutch Bangla Bank',
    'BRAC Bank',
    'Eastern Bank',
    'City Bank',
    'Standard Chartered Bank',
    'HSBC Bangladesh',
    'Islami Bank Bangladesh',
    'Exim Bank',
    'Prime Bank',
    'Southeast Bank',
    'Mutual Trust Bank',
    'NCC Bank',
    'United Commercial Bank',
    'Mercantile Bank',
    'Trust Bank'
  ];

  useEffect(() => {
    if (user) {
      setFormData({
        bankAccountDetails: {
          accountNumber: user.bankAccountDetails?.accountNumber || '',
          bankName: user.bankAccountDetails?.bankName || '',
          branchName: user.bankAccountDetails?.branchName || '',
          routingNumber: user.bankAccountDetails?.routingNumber || ''
        },
        paymentMethods: {
          bkash: user.paymentMethods?.bkash || '',
          nagad: user.paymentMethods?.nagad || '',
          rocket: user.paymentMethods?.rocket || ''
        },
        taxInfo: {
          vatRegistration: user.taxInfo?.vatRegistration || '',
          tinNumber: user.taxIdentificationNumber || ''
        }
      });
    }
  }, [user]);

  const handleInputChange = (section, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
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
        bankAccountDetails: formData.bankAccountDetails,
        paymentMethods: formData.paymentMethods,
        taxInfo: formData.taxInfo,
        taxIdentificationNumber: formData.taxInfo.tinNumber
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
        throw new Error(errorData.error || 'Failed to update payment settings');
      }

      const updatedVendor = await response.json();
      setMessage({ type: 'success', text: 'Payment settings updated successfully!' });
      setIsEditing(false);
      
      // Update local storage
      sessionStorage.setItem('vendorUser', JSON.stringify(updatedVendor));
      
    } catch (error) {
      console.error('Update payment settings error:', error);
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (user) {
      setFormData({
        bankAccountDetails: {
          accountNumber: user.bankAccountDetails?.accountNumber || '',
          bankName: user.bankAccountDetails?.bankName || '',
          branchName: user.bankAccountDetails?.branchName || '',
          routingNumber: user.bankAccountDetails?.routingNumber || ''
        },
        paymentMethods: {
          bkash: user.paymentMethods?.bkash || '',
          nagad: user.paymentMethods?.nagad || '',
          rocket: user.paymentMethods?.rocket || ''
        },
        taxInfo: {
          vatRegistration: user.taxInfo?.vatRegistration || '',
          tinNumber: user.taxIdentificationNumber || ''
        }
      });
    }
    setIsEditing(false);
    setMessage({ type: '', text: '' });
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Payment & Banking</h2>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Edit2 className="mr-2 h-4 w-4" />
            Edit Payment Info
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
        {/* Bank Account Information */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Building className="mr-2 h-5 w-5" />
            Bank Account Details
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Your bank account information for receiving payments from sales.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bank Name
              </label>
              <select
                value={formData.bankAccountDetails.bankName}
                onChange={(e) => handleInputChange('bankAccountDetails', 'bankName', e.target.value)}
                disabled={!isEditing}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
              >
                <option value="">Select your bank</option>
                {popularBanks.map(bank => (
                  <option key={bank} value={bank}>{bank}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Branch Name
              </label>
              <input
                type="text"
                value={formData.bankAccountDetails.branchName}
                onChange={(e) => handleInputChange('bankAccountDetails', 'branchName', e.target.value)}
                disabled={!isEditing}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                placeholder="Enter branch name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Account Number
              </label>
              <input
                type="text"
                value={formData.bankAccountDetails.accountNumber}
                onChange={(e) => handleInputChange('bankAccountDetails', 'accountNumber', e.target.value)}
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
                value={formData.bankAccountDetails.routingNumber}
                onChange={(e) => handleInputChange('bankAccountDetails', 'routingNumber', e.target.value)}
                disabled={!isEditing}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                placeholder="Enter routing number"
              />
            </div>
          </div>
        </div>

        {/* Mobile Financial Services */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <CreditCard className="mr-2 h-5 w-5" />
            Mobile Financial Services
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Add your mobile banking accounts for quick payments.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                bKash Number
              </label>
              <input
                type="tel"
                value={formData.paymentMethods.bkash}
                onChange={(e) => handleInputChange('paymentMethods', 'bkash', e.target.value)}
                disabled={!isEditing}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                placeholder="+8801XXXXXXXXX"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nagad Number
              </label>
              <input
                type="tel"
                value={formData.paymentMethods.nagad}
                onChange={(e) => handleInputChange('paymentMethods', 'nagad', e.target.value)}
                disabled={!isEditing}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                placeholder="+8801XXXXXXXXX"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rocket Number
              </label>
              <input
                type="tel"
                value={formData.paymentMethods.rocket}
                onChange={(e) => handleInputChange('paymentMethods', 'rocket', e.target.value)}
                disabled={!isEditing}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                placeholder="+8801XXXXXXXXX"
              />
            </div>
          </div>
        </div>

        {/* Tax Information */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <DollarSign className="mr-2 h-5 w-5" />
            Tax Information
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Tax registration details for compliance and invoicing.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                TIN Number
              </label>
              <input
                type="text"
                value={formData.taxInfo.tinNumber}
                onChange={(e) => handleInputChange('taxInfo', 'tinNumber', e.target.value)}
                disabled={!isEditing}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                placeholder="Enter TIN number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                VAT Registration Number
              </label>
              <input
                type="text"
                value={formData.taxInfo.vatRegistration}
                onChange={(e) => handleInputChange('taxInfo', 'vatRegistration', e.target.value)}
                disabled={!isEditing}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                placeholder="Enter VAT registration number"
              />
            </div>
          </div>
        </div>

        {/* Payment Status */}
        <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
          <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
            <Banknote className="mr-2 h-5 w-5" />
            Payment Status & Information
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="bg-white p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Payment Processing</h4>
              <p className="text-gray-600">
                Payments are processed within 2-3 business days after order completion.
              </p>
            </div>
            
            <div className="bg-white p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Commission Rate</h4>
              <p className="text-gray-600">
                Platform commission: 5% per transaction (excluding payment gateway fees).
              </p>
            </div>
            
            <div className="bg-white p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Minimum Payout</h4>
              <p className="text-gray-600">
                Minimum payout amount is ৳500. Smaller amounts will be held until threshold is met.
              </p>
            </div>
          </div>
        </div>

        {/* Security Notice */}
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-yellow-800 mb-1">Security Notice</h4>
              <p className="text-sm text-yellow-700">
                Your payment information is encrypted and secure. We never store your complete bank account details on our servers. 
                Only provide accurate information to ensure smooth payment processing.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorPaymentSettings;
