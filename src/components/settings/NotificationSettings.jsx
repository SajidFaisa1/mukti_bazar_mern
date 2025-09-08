import React, { useState } from 'react';
import { Bell, Mail, Smartphone, Volume2, VolumeX, Settings as SettingsIcon, MessageSquare, Package, Truck, Star } from 'lucide-react';

const NotificationSettings = () => {
  const [notifications, setNotifications] = useState({
    email: {
      orderUpdates: true,
      promotions: false,
      newsletter: true,
      securityAlerts: true,
      vendorMessages: true
    },
    push: {
      orderUpdates: true,
      promotions: false,
      chatMessages: true,
      priceAlerts: false,
      deliveryUpdates: true
    },
    sms: {
      orderConfirmation: true,
      deliveryUpdates: true,
      securityAlerts: true,
      promotions: false
    }
  });

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleNotificationChange = (category, type) => {
    setNotifications(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [type]: !prev[category][type]
      }
    }));
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      // API call to save notification settings
      await new Promise(resolve => setTimeout(resolve, 1500));
      alert('Notification settings saved successfully');
    } catch (error) {
      console.error('Failed to save notification settings:', error);
      alert('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const NotificationToggle = ({ enabled, onChange, title, description, icon: Icon }) => (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3">
        <div className="bg-blue-100 rounded-lg p-2">
          <Icon size={16} className="text-blue-600" />
        </div>
        <div>
          <p className="font-medium text-gray-800">{title}</p>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
      </div>
      <button
        onClick={onChange}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          enabled ? 'bg-emerald-600' : 'bg-gray-300'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            enabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 px-6 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 rounded-xl p-2.5">
              <Bell size={20} className="text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Notification Settings</h3>
              <p className="text-sm text-gray-600">Manage your notification preferences</p>
            </div>
          </div>
          <button
            onClick={handleSaveSettings}
            disabled={loading}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>

      <div className="p-6 space-y-8">
        {/* Email Notifications */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Mail size={18} className="text-gray-600" />
            <h4 className="text-md font-semibold text-gray-800">Email Notifications</h4>
          </div>
          
          <div className="space-y-1 bg-gray-50 rounded-xl p-4">
            <NotificationToggle
              enabled={notifications.email.orderUpdates}
              onChange={() => handleNotificationChange('email', 'orderUpdates')}
              title="Order Updates"
              description="Receive emails for order status changes"
              icon={Package}
            />
            <NotificationToggle
              enabled={notifications.email.vendorMessages}
              onChange={() => handleNotificationChange('email', 'vendorMessages')}
              title="Vendor Messages"
              description="Email notifications for vendor messages"
              icon={MessageSquare}
            />
            <NotificationToggle
              enabled={notifications.email.newsletter}
              onChange={() => handleNotificationChange('email', 'newsletter')}
              title="Newsletter"
              description="Weekly newsletter and market updates"
              icon={Mail}
            />
            <NotificationToggle
              enabled={notifications.email.promotions}
              onChange={() => handleNotificationChange('email', 'promotions')}
              title="Promotions & Offers"
              description="Special deals and promotional offers via email"
              icon={Star}
            />
            <NotificationToggle
              enabled={notifications.email.securityAlerts}
              onChange={() => handleNotificationChange('email', 'securityAlerts')}
              title="Security Alerts"
              description="Important security notifications for your account"
              icon={SettingsIcon}
            />
          </div>
        </div>

        {/* Push Notifications */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Smartphone size={18} className="text-gray-600" />
            <h4 className="text-md font-semibold text-gray-800">Push Notifications</h4>
          </div>
          
          <div className="space-y-1 bg-gray-50 rounded-xl p-4">
            <NotificationToggle
              enabled={notifications.push.orderUpdates}
              onChange={() => handleNotificationChange('push', 'orderUpdates')}
              title="Order Updates"
              description="Push notifications for order status changes"
              icon={Package}
            />
            <NotificationToggle
              enabled={notifications.push.deliveryUpdates}
              onChange={() => handleNotificationChange('push', 'deliveryUpdates')}
              title="Delivery Updates"
              description="Delivery tracking and status updates"
              icon={Truck}
            />
            <NotificationToggle
              enabled={notifications.push.chatMessages}
              onChange={() => handleNotificationChange('push', 'chatMessages')}
              title="Chat Messages"
              description="Notifications for new chat messages"
              icon={MessageSquare}
            />
            <NotificationToggle
              enabled={notifications.push.priceAlerts}
              onChange={() => handleNotificationChange('push', 'priceAlerts')}
              title="Price Alerts"
              description="Alerts for product price changes"
              icon={Star}
            />
            <NotificationToggle
              enabled={notifications.push.promotions}
              onChange={() => handleNotificationChange('push', 'promotions')}
              title="Promotions"
              description="Special deals and offer notifications"
              icon={Star}
            />
          </div>
        </div>

        {/* SMS Notifications */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare size={18} className="text-gray-600" />
            <h4 className="text-md font-semibold text-gray-800">SMS Notifications</h4>
          </div>
          
          <div className="space-y-1 bg-gray-50 rounded-xl p-4">
            <NotificationToggle
              enabled={notifications.sms.orderConfirmation}
              onChange={() => handleNotificationChange('sms', 'orderConfirmation')}
              title="Order Confirmation"
              description="SMS confirmation after placing orders"
              icon={Package}
            />
            <NotificationToggle
              enabled={notifications.sms.deliveryUpdates}
              onChange={() => handleNotificationChange('sms', 'deliveryUpdates')}
              title="Delivery Updates"
              description="SMS for delivery status updates"
              icon={Truck}
            />
            <NotificationToggle
              enabled={notifications.sms.securityAlerts}
              onChange={() => handleNotificationChange('sms', 'securityAlerts')}
              title="Security Alerts"
              description="Important security-related SMS notifications"
              icon={SettingsIcon}
            />
            <NotificationToggle
              enabled={notifications.sms.promotions}
              onChange={() => handleNotificationChange('sms', 'promotions')}
              title="Promotional SMS"
              description="Special offers and deals via SMS"
              icon={Star}
            />
          </div>
        </div>

        {/* Sound Settings */}
        <div className="border-t border-gray-200 pt-6">
          <div className="flex items-center gap-2 mb-4">
            <Volume2 size={18} className="text-gray-600" />
            <h4 className="text-md font-semibold text-gray-800">Sound Settings</h4>
          </div>
          
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 rounded-lg p-2">
                  {soundEnabled ? <Volume2 size={16} className="text-blue-600" /> : <VolumeX size={16} className="text-blue-600" />}
                </div>
                <div>
                  <p className="font-medium text-gray-800">Notification Sounds</p>
                  <p className="text-sm text-gray-600">
                    {soundEnabled ? 'Sound enabled for notifications' : 'Notifications in silent mode'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  soundEnabled ? 'bg-emerald-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    soundEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationSettings;
