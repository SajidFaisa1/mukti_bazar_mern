import React, { useState } from 'react';
import { Bell, Mail, MessageSquare, Package, TrendingUp, Users, Save, Volume2, VolumeX } from 'lucide-react';

const VendorNotificationSettings = () => {
  const [notifications, setNotifications] = useState({
    email: {
      newOrders: true,
      orderUpdates: true,
      customerMessages: true,
      lowStock: true,
      salesReports: false,
      promotions: true,
      systemUpdates: false,
      accountSecurity: true
    },
    push: {
      newOrders: true,
      orderUpdates: true,
      customerMessages: true,
      lowStock: true,
      salesReports: false,
      promotions: false,
      systemUpdates: false,
      accountSecurity: true
    },
    sms: {
      newOrders: true,
      orderUpdates: false,
      customerMessages: false,
      lowStock: true,
      salesReports: false,
      promotions: false,
      systemUpdates: false,
      accountSecurity: true
    },
    inApp: {
      newOrders: true,
      orderUpdates: true,
      customerMessages: true,
      lowStock: true,
      salesReports: true,
      promotions: true,
      systemUpdates: true,
      accountSecurity: true
    }
  });

  const [soundSettings, setSoundSettings] = useState({
    enabled: true,
    newOrderSound: true,
    messageSound: true,
    lowStockAlert: true,
    volume: 75
  });

  const [loading, setLoading] = useState(false);

  const handleNotificationChange = (category, setting, value) => {
    setNotifications(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [setting]: value
      }
    }));
  };

  const handleSoundChange = (setting, value) => {
    setSoundSettings(prev => ({
      ...prev,
      [setting]: value
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // API call to save notification settings
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      alert('Notification settings saved successfully!');
    } catch (error) {
      alert('Failed to save notification settings');
    } finally {
      setLoading(false);
    }
  };

  const notificationTypes = [
    {
      id: 'newOrders',
      label: 'New Orders',
      description: 'Get notified when customers place new orders',
      icon: Package,
      important: true
    },
    {
      id: 'orderUpdates',
      label: 'Order Updates',
      description: 'Notifications for order status changes and cancellations',
      icon: TrendingUp,
      important: true
    },
    {
      id: 'customerMessages',
      label: 'Customer Messages',
      description: 'Messages and inquiries from customers',
      icon: MessageSquare,
      important: true
    },
    {
      id: 'lowStock',
      label: 'Low Stock Alerts',
      description: 'Warnings when product inventory is running low',
      icon: Package,
      important: true
    },
    {
      id: 'salesReports',
      label: 'Sales Reports',
      description: 'Daily, weekly, and monthly sales summaries',
      icon: TrendingUp,
      important: false
    },
    {
      id: 'promotions',
      label: 'Promotion Opportunities',
      description: 'Information about promotional campaigns and features',
      icon: TrendingUp,
      important: false
    },
    {
      id: 'systemUpdates',
      label: 'System Updates',
      description: 'Platform updates, new features, and maintenance notices',
      icon: Bell,
      important: false
    },
    {
      id: 'accountSecurity',
      label: 'Account Security',
      description: 'Login attempts, password changes, and security alerts',
      icon: Bell,
      important: true
    }
  ];

  const channels = [
    { id: 'email', label: 'Email', icon: Mail, description: 'Receive notifications via email' },
    { id: 'push', label: 'Push Notifications', icon: Bell, description: 'Browser and mobile notifications' },
    { id: 'sms', label: 'SMS', icon: MessageSquare, description: 'Text message notifications' },
    { id: 'inApp', label: 'In-App', icon: Bell, description: 'Notifications within the vendor dashboard' }
  ];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <Bell className="h-6 w-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-800">Notification Settings</h2>
        </div>
        <p className="text-gray-600 mt-1">Manage how you receive vendor notifications and alerts</p>
      </div>

      <div className="p-6 space-y-8">
        {/* Notification Preferences */}
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-6">Notification Preferences</h3>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 pr-4">
                    <span className="text-sm font-medium text-gray-700">Notification Type</span>
                  </th>
                  {channels.map((channel) => (
                    <th key={channel.id} className="text-center py-3 px-2 min-w-[100px]">
                      <div className="flex flex-col items-center gap-1">
                        <channel.icon size={16} className="text-gray-500" />
                        <span className="text-sm font-medium text-gray-700">{channel.label}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {notificationTypes.map((type) => {
                  const Icon = type.icon;
                  return (
                    <tr key={type.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-4 pr-4">
                        <div className="flex items-start gap-3">
                          <Icon size={18} className={`mt-0.5 ${type.important ? 'text-blue-600' : 'text-gray-500'}`} />
                          <div>
                            <div className="font-medium text-gray-800 flex items-center gap-2">
                              {type.label}
                              {type.important && (
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                                  Important
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-600">{type.description}</div>
                          </div>
                        </div>
                      </td>
                      {channels.map((channel) => (
                        <td key={channel.id} className="text-center py-4 px-2">
                          <input
                            type="checkbox"
                            checked={notifications[channel.id][type.id]}
                            onChange={(e) => handleNotificationChange(channel.id, type.id, e.target.checked)}
                            className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                          />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sound Settings */}
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Sound Settings</h3>
          <div className="bg-gray-50 rounded-xl p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {soundSettings.enabled ? (
                    <Volume2 className="h-5 w-5 text-gray-600" />
                  ) : (
                    <VolumeX className="h-5 w-5 text-gray-400" />
                  )}
                  <div>
                    <label className="font-medium text-gray-800">Enable Sound Notifications</label>
                    <p className="text-sm text-gray-600">Play sounds for important notifications</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={soundSettings.enabled}
                  onChange={(e) => handleSoundChange('enabled', e.target.checked)}
                  className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                />
              </div>

              {soundSettings.enabled && (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="font-medium text-gray-800">New Order Sound</label>
                      <p className="text-sm text-gray-600">Play sound when new orders arrive</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={soundSettings.newOrderSound}
                      onChange={(e) => handleSoundChange('newOrderSound', e.target.checked)}
                      className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="font-medium text-gray-800">Message Sound</label>
                      <p className="text-sm text-gray-600">Play sound for customer messages</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={soundSettings.messageSound}
                      onChange={(e) => handleSoundChange('messageSound', e.target.checked)}
                      className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="font-medium text-gray-800">Low Stock Alert Sound</label>
                      <p className="text-sm text-gray-600">Play sound for inventory alerts</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={soundSettings.lowStockAlert}
                      onChange={(e) => handleSoundChange('lowStockAlert', e.target.checked)}
                      className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-gray-800 mb-2">
                      Volume Level: {soundSettings.volume}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={soundSettings.volume}
                      onChange={(e) => handleSoundChange('volume', parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h3>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => {
                const allChannels = ['email', 'push', 'sms', 'inApp'];
                const importantTypes = ['newOrders', 'orderUpdates', 'customerMessages', 'lowStock', 'accountSecurity'];
                const newNotifications = { ...notifications };
                
                allChannels.forEach(channel => {
                  importantTypes.forEach(type => {
                    newNotifications[channel][type] = true;
                  });
                });
                
                setNotifications(newNotifications);
              }}
              className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
            >
              Enable Essential Notifications
            </button>
            
            <button
              onClick={() => {
                const allChannels = ['email', 'push', 'sms', 'inApp'];
                const newNotifications = { ...notifications };
                
                allChannels.forEach(channel => {
                  Object.keys(newNotifications[channel]).forEach(type => {
                    newNotifications[channel][type] = false;
                  });
                });
                
                setNotifications(newNotifications);
              }}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Disable All Notifications
            </button>
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
            {loading ? 'Saving...' : 'Save Notification Settings'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VendorNotificationSettings;
