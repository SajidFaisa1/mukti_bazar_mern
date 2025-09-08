import React, { useState } from 'react';
import { User, Shield, Bell, Settings as SettingsIcon, MapPin, CreditCard, Users, HelpCircle, LogOut, ChevronRight } from 'lucide-react';
import { useClientAuth } from '../../contexts/ClientAuthContext';
import { useVendorAuth } from '../../contexts/VendorAuthContext';

// Client Settings Components
import ProfileSettings from './ProfileSettings';
import SecuritySettings from './SecuritySettings';
import NotificationSettings from './NotificationSettings';
import PreferencesSettings from './PreferencesSettings';
import AddressBook from './AddressBook';

// Vendor Settings Components
import VendorSettings from './vendor/VendorSettings';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const { user: clientUser } = useClientAuth();
  const { user: vendorUser } = useVendorAuth();

  // Determine if this is a vendor or client
  const isVendor = vendorUser && !clientUser;

  // If vendor is logged in, render vendor settings
  if (isVendor) {
    return <VendorSettings />;
  }

  // Otherwise render client settings
  const settingsTabs = [
    {
      id: 'profile',
      label: 'Profile',
      icon: User,
      description: 'Manage your personal information',
      component: ProfileSettings
    },
    {
      id: 'security',
      label: 'Security',
      icon: Shield,
      description: 'Password and account security',
      component: SecuritySettings
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: Bell,
      description: 'Email, SMS, and push notifications',
      component: NotificationSettings
    },
    {
      id: 'preferences',
      label: 'Preferences',
      icon: SettingsIcon,
      description: 'Language, theme, and display options',
      component: PreferencesSettings
    },
    {
      id: 'addresses',
      label: 'Address Book',
      icon: MapPin,
      description: 'Manage your saved addresses',
      component: AddressBook
    }
  ];

  const quickActions = [
    {
      id: 'billing',
      label: 'Billing & Payments',
      icon: CreditCard,
      description: 'Payment methods and billing history',
      action: () => console.log('Navigate to billing')
    },
    {
      id: 'referrals',
      label: 'Invite Friends',
      icon: Users,
      description: 'Refer friends and earn rewards',
      action: () => console.log('Navigate to referrals')
    },
    {
      id: 'help',
      label: 'Help & Support',
      icon: HelpCircle,
      description: 'Get help and contact support',
      action: () => console.log('Navigate to help')
    },
    {
      id: 'logout',
      label: 'Sign Out',
      icon: LogOut,
      description: 'Sign out of your account',
      action: () => console.log('Sign out'),
      danger: true
    }
  ];

  const ActiveComponent = settingsTabs.find(tab => tab.id === activeTab)?.component;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Account Settings</h1>
          <p className="text-gray-600 mt-2">Manage your account preferences and security settings</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden sticky top-8">
              {/* Settings Navigation */}
              <div className="p-6 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Settings</h3>
                <nav className="space-y-2">
                  {settingsTabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                          activeTab === tab.id
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <Icon size={18} className={activeTab === tab.id ? 'text-blue-600' : 'text-gray-500'} />
                        <div className="flex-1">
                          <div className="font-medium">{tab.label}</div>
                          <div className="text-xs text-gray-500">{tab.description}</div>
                        </div>
                        <ChevronRight 
                          size={16} 
                          className={`transition-transform ${
                            activeTab === tab.id ? 'rotate-90 text-blue-600' : 'text-gray-400'
                          }`} 
                        />
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* Quick Actions */}
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h3>
                <div className="space-y-2">
                  {quickActions.map((action) => {
                    const Icon = action.icon;
                    return (
                      <button
                        key={action.id}
                        onClick={action.action}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                          action.danger
                            ? 'text-red-700 hover:bg-red-50'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <Icon size={18} className={action.danger ? 'text-red-500' : 'text-gray-500'} />
                        <div className="flex-1">
                          <div className="font-medium">{action.label}</div>
                          <div className="text-xs text-gray-500">{action.description}</div>
                        </div>
                        <ChevronRight size={16} className="text-gray-400" />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {ActiveComponent && <ActiveComponent />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
