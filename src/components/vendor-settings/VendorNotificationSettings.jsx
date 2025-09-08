import React, { useState, useEffect } from 'react';
import { useVendorAuth } from '../../contexts/VendorAuthContext';
import { 
  Bell, 
  Mail, 
  Smartphone, 
  Volume2, 
  Package, 
  DollarSign, 
  Users, 
  MessageSquare,
  Save,
  Check,
  AlertCircle
} from 'lucide-react';

const VendorNotificationSettings = () => {
  const { user, token } = useVendorAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [settings, setSettings] = useState({
    email: {
      newOrders: true,
      orderUpdates: true,
      payments: true,
      reviews: true,
      promotions: false,
      systemUpdates: true
    },
    push: {
      newOrders: true,
      orderUpdates: false,
      payments: true,
      reviews: true,
      promotions: false,
      systemUpdates: false
    },
    sms: {
      newOrders: false,
      orderUpdates: false,
      payments: true,
      reviews: false,
      promotions: false,
      systemUpdates: false
    },
    sound: {
      enabled: true,
      volume: 70,
      newOrderSound: 'default',
      paymentSound: 'default'
    },
    frequency: {
      orderDigest: 'realtime', // realtime, hourly, daily
      reviewDigest: 'daily',
      salesReport: 'weekly'
    }
  });

  useEffect(() => {
    // Load saved notification settings
    const saved = localStorage.getItem(`vendorNotificationSettings_${user?.uid}`);
    if (saved) {
      setSettings(JSON.parse(saved));
    }
  }, [user]);

  const handleToggle = (category, setting) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [setting]: !prev[category][setting]
      }
    }));
  };

  const handleSliderChange = (category, setting, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [setting]: value
      }
    }));
  };

  const handleSelectChange = (category, setting, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [setting]: value
      }
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      // Save to localStorage
      localStorage.setItem(`vendorNotificationSettings_${user.uid}`, JSON.stringify(settings));
      
      // In a real app, you would also save to the backend
      // const response = await fetch(`/api/vendors/${user.uid}/notification-settings`, {
      //   method: 'PUT',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'Authorization': `Bearer ${token}`
      //   },
      //   body: JSON.stringify(settings)
      // });

      setMessage({ type: 'success', text: 'Notification settings saved successfully!' });
    } catch (error) {
      console.error('Save settings error:', error);
      setMessage({ type: 'error', text: 'Failed to save notification settings' });
    } finally {
      setLoading(false);
    }
  };

  const notificationTypes = [
    {
      key: 'newOrders',
      label: 'New Orders',
      description: 'When someone places an order with you',
      icon: Package,
      important: true
    },
    {
      key: 'orderUpdates',
      label: 'Order Updates',
      description: 'Order status changes, cancellations, modifications',
      icon: Package,
      important: false
    },
    {
      key: 'payments',
      label: 'Payments',
      description: 'Payment confirmations, payouts, financial updates',
      icon: DollarSign,
      important: true
    },
    {
      key: 'reviews',
      label: 'Reviews & Ratings',
      description: 'New customer reviews and ratings',
      icon: MessageSquare,
      important: false
    },
    {
      key: 'promotions',
      label: 'Promotions & Tips',
      description: 'Marketing tips, promotional opportunities',
      icon: Users,
      important: false
    },
    {
      key: 'systemUpdates',
      label: 'System Updates',
      description: 'Platform updates, maintenance notifications',
      icon: Bell,
      important: false
    }
  ];

  const soundOptions = [
    { value: 'default', label: 'Default' },
    { value: 'chime', label: 'Chime' },
    { value: 'bell', label: 'Bell' },
    { value: 'notification', label: 'Notification' },
    { value: 'none', label: 'None' }
  ];

  const frequencyOptions = [
    { value: 'realtime', label: 'Real-time' },
    { value: 'hourly', label: 'Hourly' },
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' }
  ];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Notification Settings</h2>
          <p className="text-gray-600">Manage how and when you receive notifications</p>
        </div>
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
          Save Settings
        </button>
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

      {/* Notification Channels */}
      <div className="bg-white rounded-lg border border-gray-200 mb-8">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Notification Channels</h3>
          <p className="text-gray-600 text-sm mt-1">Choose how you want to receive different types of notifications</p>
        </div>

        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 pr-6">Notification Type</th>
                  <th className="text-center py-3 px-3 min-w-[80px]">
                    <div className="flex flex-col items-center">
                      <Mail className="h-5 w-5 text-blue-600 mb-1" />
                      <span className="text-xs text-gray-600">Email</span>
                    </div>
                  </th>
                  <th className="text-center py-3 px-3 min-w-[80px]">
                    <div className="flex flex-col items-center">
                      <Smartphone className="h-5 w-5 text-green-600 mb-1" />
                      <span className="text-xs text-gray-600">Push</span>
                    </div>
                  </th>
                  <th className="text-center py-3 px-3 min-w-[80px]">
                    <div className="flex flex-col items-center">
                      <MessageSquare className="h-5 w-5 text-purple-600 mb-1" />
                      <span className="text-xs text-gray-600">SMS</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {notificationTypes.map((type) => (
                  <tr key={type.key} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4 pr-6">
                      <div className="flex items-center">
                        <div className="p-2 bg-gray-100 rounded-lg mr-3">
                          <type.icon className="h-4 w-4 text-gray-600" />
                        </div>
                        <div>
                          <div className="flex items-center">
                            <h4 className="font-medium text-gray-900">{type.label}</h4>
                            {type.important && (
                              <span className="ml-2 px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                                Important
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500">{type.description}</p>
                        </div>
                      </div>
                    </td>
                    <td className="text-center py-4 px-3">
                      <label className="inline-flex items-center">
                        <input
                          type="checkbox"
                          checked={settings.email[type.key]}
                          onChange={() => handleToggle('email', type.key)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </label>
                    </td>
                    <td className="text-center py-4 px-3">
                      <label className="inline-flex items-center">
                        <input
                          type="checkbox"
                          checked={settings.push[type.key]}
                          onChange={() => handleToggle('push', type.key)}
                          className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                        />
                      </label>
                    </td>
                    <td className="text-center py-4 px-3">
                      <label className="inline-flex items-center">
                        <input
                          type="checkbox"
                          checked={settings.sms[type.key]}
                          onChange={() => handleToggle('sms', type.key)}
                          className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                        />
                      </label>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Sound Settings */}
      <div className="bg-white rounded-lg border border-gray-200 mb-8">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Volume2 className="mr-2 h-5 w-5" />
            Sound Settings
          </h3>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="flex items-center mb-4">
                <input
                  type="checkbox"
                  checked={settings.sound.enabled}
                  onChange={() => handleToggle('sound', 'enabled')}
                  className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500 mr-3"
                />
                <span className="text-gray-900 font-medium">Enable sound notifications</span>
              </label>

              {settings.sound.enabled && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Volume: {settings.sound.volume}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={settings.sound.volume}
                      onChange={(e) => handleSliderChange('sound', 'volume', parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </div>

            {settings.sound.enabled && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Order Sound
                  </label>
                  <select
                    value={settings.sound.newOrderSound}
                    onChange={(e) => handleSelectChange('sound', 'newOrderSound', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    {soundOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Sound
                  </label>
                  <select
                    value={settings.sound.paymentSound}
                    onChange={(e) => handleSelectChange('sound', 'paymentSound', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    {soundOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Digest Settings */}
      <div className="bg-white rounded-lg border border-gray-200 mb-8">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Digest & Summary Settings</h3>
          <p className="text-gray-600 text-sm mt-1">Control how often you receive summary notifications</p>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Order Digest
              </label>
              <select
                value={settings.frequency.orderDigest}
                onChange={(e) => handleSelectChange('frequency', 'orderDigest', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                {frequencyOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">Summary of order activities</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Review Digest
              </label>
              <select
                value={settings.frequency.reviewDigest}
                onChange={(e) => handleSelectChange('frequency', 'reviewDigest', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                {frequencyOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">Summary of new reviews</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sales Report
              </label>
              <select
                value={settings.frequency.salesReport}
                onChange={(e) => handleSelectChange('frequency', 'salesReport', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                {frequencyOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">Sales performance summary</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
        <h3 className="text-lg font-semibold text-blue-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => {
              const newSettings = { ...settings };
              Object.keys(newSettings.email).forEach(key => {
                newSettings.email[key] = true;
                newSettings.push[key] = true;
              });
              setSettings(newSettings);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            Enable All Notifications
          </button>
          
          <button
            onClick={() => {
              const newSettings = { ...settings };
              Object.keys(newSettings.email).forEach(key => {
                if (!notificationTypes.find(t => t.key === key)?.important) {
                  newSettings.email[key] = false;
                  newSettings.push[key] = false;
                  newSettings.sms[key] = false;
                }
              });
              setSettings(newSettings);
            }}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
          >
            Important Only
          </button>
          
          <button
            onClick={() => {
              const newSettings = { ...settings };
              Object.keys(newSettings.email).forEach(key => {
                newSettings.email[key] = false;
                newSettings.push[key] = false;
                newSettings.sms[key] = false;
              });
              setSettings(newSettings);
            }}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
          >
            Disable All
          </button>
        </div>
      </div>
    </div>
  );
};

export default VendorNotificationSettings;
