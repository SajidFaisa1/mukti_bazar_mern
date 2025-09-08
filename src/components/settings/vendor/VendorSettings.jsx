import React, { useState } from 'react';
import { 
  User, 
  Shield, 
  Bell, 
  Settings, 
  MapPin, 
  Store, 
  CreditCard, 
  FileText, 
  BarChart3, 
  Users, 
  HelpCircle,
  ChevronRight
} from 'lucide-react';
import VendorProfileSettings from './VendorProfileSettings';
import VendorSecuritySettings from './VendorSecuritySettings';
import VendorNotificationSettings from './VendorNotificationSettings';
import VendorBusinessSettings from './VendorBusinessSettings';
import VendorAddressBook from './VendorAddressBook';
import VendorPaymentSettings from './VendorPaymentSettings';
import VendorDocumentSettings from './VendorDocumentSettings';
import VendorAnalyticsSettings from './VendorAnalyticsSettings';
import VendorCustomerSettings from './VendorCustomerSettings';

const VendorSettings = () => {
  const [activeTab, setActiveTab] = useState('profile');

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User, component: VendorProfileSettings },
    { id: 'business', label: 'Business Info', icon: Store, component: VendorBusinessSettings },
    { id: 'payment', label: 'Payment & Banking', icon: CreditCard, component: VendorPaymentSettings },
    { id: 'documents', label: 'Documents & Verification', icon: FileText, component: VendorDocumentSettings },
    { id: 'addresses', label: 'Address Book', icon: MapPin, component: VendorAddressBook },
    { id: 'analytics', label: 'Analytics & Reports', icon: BarChart3, component: VendorAnalyticsSettings },
    { id: 'customers', label: 'Customer Management', icon: Users, component: VendorCustomerSettings },
    { id: 'notifications', label: 'Notifications', icon: Bell, component: VendorNotificationSettings },
    { id: 'security', label: 'Security', icon: Shield, component: VendorSecuritySettings },
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component;

  const quickActions = [
    { 
      title: 'Update Business Hours', 
      description: 'Manage your store operating hours',
      action: () => setActiveTab('business'),
      icon: Store
    },
    { 
      title: 'View Sales Analytics', 
      description: 'Check your performance metrics',
      action: () => setActiveTab('analytics'),
      icon: BarChart3
    },
    { 
      title: 'Manage Payment Methods', 
      description: 'Update banking information',
      action: () => setActiveTab('payment'),
      icon: CreditCard
    },
    { 
      title: 'Customer Insights', 
      description: 'View customer feedback and ratings',
      action: () => setActiveTab('customers'),
      icon: Users
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Vendor Settings</h1>
          <p className="text-gray-600">Manage your store settings, business information, and vendor preferences</p>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action, index) => (
              <div
                key={index}
                onClick={action.action}
                className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-2">
                  <action.icon className="h-5 w-5 text-green-600" />
                  <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
                </div>
                <h3 className="font-medium text-gray-900 mb-1">{action.title}</h3>
                <p className="text-sm text-gray-500">{action.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <div className="lg:w-64 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <h2 className="font-semibold text-gray-900 flex items-center">
                  <Settings className="mr-2 h-5 w-5" />
                  Settings Menu
                </h2>
              </div>
              <nav className="p-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeTab === tab.id
                        ? 'bg-green-50 text-green-700 border-r-2 border-green-500'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <tab.icon className={`mr-3 h-4 w-4 ${
                      activeTab === tab.id ? 'text-green-600' : 'text-gray-500'
                    }`} />
                    {tab.label}
                  </button>
                ))}
              </nav>
              
              {/* Help Section */}
              <div className="mt-4 p-4 border-t border-gray-200">
                <div className="flex items-center text-sm text-gray-600 mb-2">
                  <HelpCircle className="mr-2 h-4 w-4" />
                  Need Help?
                </div>
                <p className="text-xs text-gray-500 mb-3">
                  Access our vendor support center for guides and assistance.
                </p>
                <button className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs py-2 px-3 rounded-md transition-colors">
                  Contact Support
                </button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              {ActiveComponent && <ActiveComponent />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorSettings;
