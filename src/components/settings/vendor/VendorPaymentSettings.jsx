import React, { useState, useEffect } from 'react';
import { useVendorAuth } from '../../../contexts/VendorAuthContext';
import { 
  CreditCard, 
  DollarSign, 
  Landmark, 
  Shield, 
  AlertCircle,
  CheckCircle,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Save
} from 'lucide-react';

const VendorPaymentSettings = () => {
  const { user, token } = useVendorAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isEditing, setIsEditing] = useState(false);
  const [showAccountNumbers, setShowAccountNumbers] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const [bankingData, setBankingData] = useState({
    accountNumber: '',
    bankName: '',
    branchName: '',
    routingNumber: ''
  });

  useEffect(() => {
    if (user?.bankAccountDetails) {
      setBankingData({
        accountNumber: user.bankAccountDetails.accountNumber || '',
        bankName: user.bankAccountDetails.bankName || '',
        branchName: user.bankAccountDetails.branchName || '',
        routingNumber: user.bankAccountDetails.routingNumber || ''
      });
    }
  }, [user]);

  const handleInputChange = (field, value) => {
    setBankingData(prev => ({
      ...prev,
      [field]: value
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
        bankAccountDetails: bankingData
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
        throw new Error(errorData.error || 'Failed to update banking information');
      }

      const updatedVendor = await response.json();
      setMessage({ type: 'success', text: 'Banking information updated successfully!' });
      setIsEditing(false);
      
      // Update local storage
      sessionStorage.setItem('vendorUser', JSON.stringify(updatedVendor));
      
    } catch (error) {
      console.error('Update banking info error:', error);
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (user?.bankAccountDetails) {
      setBankingData({
        accountNumber: user.bankAccountDetails.accountNumber || '',
        bankName: user.bankAccountDetails.bankName || '',
        branchName: user.bankAccountDetails.branchName || '',
        routingNumber: user.bankAccountDetails.routingNumber || ''
      });
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

  const paymentMethods = [];
  if (bankingData.accountNumber && bankingData.bankName) {
    paymentMethods.push({
      id: 1,
      type: 'bank',
      accountName: user.sellerName || user.businessName,
      accountNumber: showAccountNumbers ? bankingData.accountNumber : '*'.repeat(Math.max(0, bankingData.accountNumber.length - 4)) + bankingData.accountNumber.slice(-4),
      bankName: bankingData.bankName,
      branchName: bankingData.branchName,
      isDefault: true,
      isVerified: user.isApproved || false
    });
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment & Banking Settings</h2>
        <p className="text-gray-600">Manage your payment methods and banking information for receiving payments</p>
      </div>

      {/* Message Display */}
      {message.text && (
        <div className={`mb-6 p-4 rounded-lg flex items-center ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-700 border border-green-200' 
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="mr-2 h-5 w-5" />
          ) : (
            <AlertCircle className="mr-2 h-5 w-5" />
          )}
          {message.text}
        </div>
      )}

      {/* Banking Information Form */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Banking Information</h3>
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Edit className="mr-2 h-4 w-4" />
              {bankingData.accountNumber ? 'Edit' : 'Add'} Banking Details
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
                Cancel
              </button>
            </div>
          )}
        </div>

        {isEditing ? (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bank Name
                </label>
                <input
                  type="text"
                  value={bankingData.bankName}
                  onChange={(e) => handleInputChange('bankName', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="e.g., Dutch Bangla Bank"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Branch Name
                </label>
                <input
                  type="text"
                  value={bankingData.branchName}
                  onChange={(e) => handleInputChange('branchName', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="e.g., Dhanmondi Branch"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account Number
                </label>
                <input
                  type="text"
                  value={bankingData.accountNumber}
                  onChange={(e) => handleInputChange('accountNumber', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Enter account number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Routing Number
                </label>
                <input
                  type="text"
                  value={bankingData.routingNumber}
                  onChange={(e) => handleInputChange('routingNumber', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Enter routing number"
                />
              </div>
            </div>
          </div>
        ) : (
          <div>
            {paymentMethods.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-gray-600">Your Banking Information</span>
                  <button
                    onClick={() => setShowAccountNumbers(!showAccountNumbers)}
                    className="flex items-center px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    {showAccountNumbers ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
                    {showAccountNumbers ? 'Hide' : 'Show'} Account Number
                  </button>
                </div>
                {paymentMethods.map((method) => (
                  <div key={method.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="p-2 bg-gray-100 rounded-lg">
                          <Landmark className="h-6 w-6 text-gray-600" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium text-gray-900">{method.bankName}</h4>
                            {method.isDefault && (
                              <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                                Primary
                              </span>
                            )}
                            {method.isVerified ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-yellow-500" />
                            )}
                          </div>
                          <p className="text-sm text-gray-600">{method.accountName}</p>
                          <p className="text-sm font-mono text-gray-500">
                            Account: {method.accountNumber}
                          </p>
                          {method.branchName && (
                            <p className="text-sm text-gray-500">Branch: {method.branchName}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Landmark className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h4 className="font-medium text-gray-900 mb-2">No Banking Information</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Add your banking details to receive payments from customers
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Payment Settings */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Settings</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div>
              <h4 className="font-medium text-gray-900">Auto Withdrawal</h4>
              <p className="text-sm text-gray-600">Automatically transfer earnings to your default account</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div>
              <h4 className="font-medium text-gray-900">Minimum Withdrawal Amount</h4>
              <p className="text-sm text-gray-600">Set minimum amount for automatic withdrawals</p>
            </div>
            <select className="border border-gray-300 rounded-md px-3 py-2">
              <option>৳500</option>
              <option>৳1,000</option>
              <option>৳2,000</option>
              <option>৳5,000</option>
            </select>
          </div>

          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div>
              <h4 className="font-medium text-gray-900">Payment Notifications</h4>
              <p className="text-sm text-gray-600">Get notified about payment updates</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Security Section */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Shield className="h-5 w-5 text-yellow-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-yellow-800">Security Reminder</h4>
            <p className="text-sm text-yellow-700 mt-1">
              Never share your banking details with anyone. Mukti Bazar will never ask for your passwords or PINs.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorPaymentSettings;
