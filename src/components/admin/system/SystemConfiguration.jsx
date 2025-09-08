import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Shield, 
  Bell, 
  Globe, 
  Database,
  Key,
  Mail,
  Phone,
  AlertTriangle,
  CheckCircle,
  Save,
  RotateCcw,
  Lock,
  Eye,
  EyeOff,
  Server,
  Cloud,
  Cpu,
  HardDrive,
  Network,
  Zap,
  RefreshCw
} from 'lucide-react';

const SystemConfiguration = ({ token }) => {
  const [config, setConfig] = useState({
    security: {
      passwordPolicy: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSymbols: true,
        expiration: 90
      },
      twoFactorAuth: false,
      sessionTimeout: 30,
      maxLoginAttempts: 5,
      lockoutDuration: 15
    },
    notifications: {
      emailEnabled: true,
      smsEnabled: true,
      webhooksEnabled: false,
      adminAlerts: true,
      userAlerts: true,
      systemAlerts: true
    },
    platform: {
      maintenanceMode: false,
      registrationEnabled: true,
      vendorRegistrationEnabled: true,
      publicCatalog: true,
      guestCheckout: false,
      multilanguage: false,
      defaultLanguage: 'en',
      timezone: 'UTC',
      currency: 'USD'
    },
    integration: {
      paymentGateways: {
        sslcommerz: { enabled: true, live: false },
        stripe: { enabled: false, live: false },
        paypal: { enabled: false, live: false }
      },
      emailService: {
        provider: 'smtp',
        host: '',
        port: 587,
        secure: false,
        username: '',
        password: ''
      },
      smsService: {
        provider: 'twilio',
        accountSid: '',
        authToken: '',
        fromNumber: ''
      }
    },
    performance: {
      caching: true,
      compression: true,
      imageOptimization: true,
      cdnEnabled: false,
      cdnUrl: '',
      databaseOptimization: true
    }
  });
  
  const [activeSection, setActiveSection] = useState('security');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);
  const [systemStatus, setSystemStatus] = useState({
    database: 'healthy',
    server: 'healthy',
    cache: 'healthy',
    storage: 'healthy'
  });

  useEffect(() => {
    if (token) {
      fetchConfiguration();
      fetchSystemStatus();
    }
  }, [token]);

  const fetchConfiguration = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/system/configuration', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setConfig(data.configuration || config);
      }
    } catch (error) {
      console.error('Error fetching configuration:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSystemStatus = async () => {
    try {
      const response = await fetch('/api/admin/system/status', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSystemStatus(data.status || systemStatus);
      }
    } catch (error) {
      console.error('Error fetching system status:', error);
    }
  };

  const saveConfiguration = async () => {
    try {
      setSaving(true);
      const response = await fetch('/api/admin/system/configuration', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ configuration: config })
      });

      if (response.ok) {
        alert('Configuration saved successfully');
      }
    } catch (error) {
      console.error('Error saving configuration:', error);
      alert('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = () => {
    if (confirm('Are you sure you want to reset all settings to default values?')) {
      // Reset to default config
      fetchConfiguration();
    }
  };

  const testConnection = async (service) => {
    try {
      const response = await fetch(`/api/admin/system/test/${service}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        alert(`${service} connection test successful`);
      } else {
        alert(`${service} connection test failed`);
      }
    } catch (error) {
      alert(`${service} connection test failed`);
    }
  };

  const updateConfig = (section, key, value) => {
    setConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
  };

  const updateNestedConfig = (section, subsection, key, value) => {
    setConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [subsection]: {
          ...prev[section][subsection],
          [key]: value
        }
      }
    }));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'error': return <AlertTriangle className="w-5 h-5 text-red-600" />;
      default: return <AlertTriangle className="w-5 h-5 text-gray-600" />;
    }
  };

  const renderSecuritySection = () => (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Password Policy</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Minimum Length
            </label>
            <input
              type="number"
              value={config.security.passwordPolicy.minLength}
              onChange={(e) => updateNestedConfig('security', 'passwordPolicy', 'minLength', parseInt(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              min="6"
              max="20"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Expiration (days)
            </label>
            <input
              type="number"
              value={config.security.passwordPolicy.expiration}
              onChange={(e) => updateNestedConfig('security', 'passwordPolicy', 'expiration', parseInt(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              min="0"
              max="365"
            />
          </div>
        </div>
        
        <div className="mt-4 space-y-3">
          {[
            { key: 'requireUppercase', label: 'Require Uppercase Letters' },
            { key: 'requireLowercase', label: 'Require Lowercase Letters' },
            { key: 'requireNumbers', label: 'Require Numbers' },
            { key: 'requireSymbols', label: 'Require Special Characters' }
          ].map(({ key, label }) => (
            <label key={key} className="flex items-center">
              <input
                type="checkbox"
                checked={config.security.passwordPolicy[key]}
                onChange={(e) => updateNestedConfig('security', 'passwordPolicy', key, e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">{label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Authentication & Access</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Session Timeout (minutes)
            </label>
            <input
              type="number"
              value={config.security.sessionTimeout}
              onChange={(e) => updateConfig('security', 'sessionTimeout', parseInt(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              min="5"
              max="480"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Max Login Attempts
            </label>
            <input
              type="number"
              value={config.security.maxLoginAttempts}
              onChange={(e) => updateConfig('security', 'maxLoginAttempts', parseInt(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              min="3"
              max="10"
            />
          </div>
        </div>
        
        <div className="mt-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={config.security.twoFactorAuth}
              onChange={(e) => updateConfig('security', 'twoFactorAuth', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">Enable Two-Factor Authentication</span>
          </label>
        </div>
      </div>
    </div>
  );

  const renderNotificationsSection = () => (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Notification Channels</h3>
        <div className="space-y-4">
          {[
            { key: 'emailEnabled', label: 'Email Notifications', icon: Mail },
            { key: 'smsEnabled', label: 'SMS Notifications', icon: Phone },
            { key: 'webhooksEnabled', label: 'Webhook Notifications', icon: Globe },
            { key: 'adminAlerts', label: 'Admin Alerts', icon: Shield },
            { key: 'userAlerts', label: 'User Alerts', icon: Bell },
            { key: 'systemAlerts', label: 'System Alerts', icon: Server }
          ].map(({ key, label, icon: Icon }) => (
            <label key={key} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
              <div className="flex items-center">
                <Icon className="w-5 h-5 text-gray-500 mr-3" />
                <span className="text-sm text-gray-700">{label}</span>
              </div>
              <input
                type="checkbox"
                checked={config.notifications[key]}
                onChange={(e) => updateConfig('notifications', key, e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </label>
          ))}
        </div>
      </div>
    </div>
  );

  const renderPlatformSection = () => (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Platform Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            {[
              { key: 'maintenanceMode', label: 'Maintenance Mode' },
              { key: 'registrationEnabled', label: 'User Registration' },
              { key: 'vendorRegistrationEnabled', label: 'Vendor Registration' },
              { key: 'publicCatalog', label: 'Public Product Catalog' },
              { key: 'guestCheckout', label: 'Guest Checkout' },
              { key: 'multilanguage', label: 'Multi-language Support' }
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center justify-between">
                <span className="text-sm text-gray-700">{label}</span>
                <input
                  type="checkbox"
                  checked={config.platform[key]}
                  onChange={(e) => updateConfig('platform', key, e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </label>
            ))}
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Default Language
              </label>
              <select
                value={config.platform.defaultLanguage}
                onChange={(e) => updateConfig('platform', 'defaultLanguage', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              >
                <option value="en">English</option>
                <option value="bn">Bengali</option>
                <option value="hi">Hindi</option>
                <option value="ur">Urdu</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Timezone
              </label>
              <select
                value={config.platform.timezone}
                onChange={(e) => updateConfig('platform', 'timezone', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              >
                <option value="UTC">UTC</option>
                <option value="Asia/Dhaka">Asia/Dhaka</option>
                <option value="Asia/Kolkata">Asia/Kolkata</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Default Currency
              </label>
              <select
                value={config.platform.currency}
                onChange={(e) => updateConfig('platform', 'currency', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              >
                <option value="USD">USD</option>
                <option value="BDT">BDT</option>
                <option value="INR">INR</option>
                <option value="PKR">PKR</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderIntegrationSection = () => (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Gateways</h3>
        <div className="space-y-4">
          {Object.entries(config.integration.paymentGateways).map(([gateway, settings]) => (
            <div key={gateway} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900 capitalize">{gateway}</h4>
                <div className="flex items-center space-x-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.live}
                      onChange={(e) => updateNestedConfig('integration', 'paymentGateways', gateway, {
                        ...settings,
                        live: e.target.checked
                      })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Live Mode</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.enabled}
                      onChange={(e) => updateNestedConfig('integration', 'paymentGateways', gateway, {
                        ...settings,
                        enabled: e.target.checked
                      })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Enabled</span>
                  </label>
                </div>
              </div>
              <button
                onClick={() => testConnection(gateway)}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Test Connection
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Email Service</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              SMTP Host
            </label>
            <input
              type="text"
              value={config.integration.emailService.host}
              onChange={(e) => updateNestedConfig('integration', 'emailService', 'host', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Port
            </label>
            <input
              type="number"
              value={config.integration.emailService.port}
              onChange={(e) => updateNestedConfig('integration', 'emailService', 'port', parseInt(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Username
            </label>
            <input
              type="text"
              value={config.integration.emailService.username}
              onChange={(e) => updateNestedConfig('integration', 'emailService', 'username', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <input
                type={showPasswords ? 'text' : 'password'}
                value={config.integration.emailService.password}
                onChange={(e) => updateNestedConfig('integration', 'emailService', 'password', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowPasswords(!showPasswords)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
              >
                {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
        <div className="mt-4">
          <button
            onClick={() => testConnection('email')}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            Test Email Connection
          </button>
        </div>
      </div>
    </div>
  );

  const renderPerformanceSection = () => (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Settings</h3>
        <div className="space-y-4">
          {[
            { key: 'caching', label: 'Enable Caching', icon: Zap },
            { key: 'compression', label: 'Enable Compression', icon: HardDrive },
            { key: 'imageOptimization', label: 'Image Optimization', icon: Cpu },
            { key: 'cdnEnabled', label: 'CDN Integration', icon: Cloud },
            { key: 'databaseOptimization', label: 'Database Optimization', icon: Database }
          ].map(({ key, label, icon: Icon }) => (
            <label key={key} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
              <div className="flex items-center">
                <Icon className="w-5 h-5 text-gray-500 mr-3" />
                <span className="text-sm text-gray-700">{label}</span>
              </div>
              <input
                type="checkbox"
                checked={config.performance[key]}
                onChange={(e) => updateConfig('performance', key, e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </label>
          ))}
        </div>
        
        {config.performance.cdnEnabled && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              CDN URL
            </label>
            <input
              type="url"
              value={config.performance.cdnUrl}
              onChange={(e) => updateConfig('performance', 'cdnUrl', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              placeholder="https://cdn.example.com"
            />
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">System Status</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(systemStatus).map(([service, status]) => (
            <div key={service} className="flex items-center p-3 border border-gray-200 rounded-lg">
              {getStatusIcon(status)}
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900 capitalize">{service}</p>
                <p className={`text-xs ${getStatusColor(status)} capitalize`}>{status}</p>
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={fetchSystemStatus}
          className="mt-4 flex items-center text-sm text-blue-600 hover:text-blue-700"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh Status
        </button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">System Configuration</h2>
          <p className="text-gray-600 mt-1">Configure platform settings and integrations</p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center space-x-3">
          <button
            onClick={resetToDefaults}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset to Defaults
          </button>
          <button
            onClick={saveConfiguration}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg flex items-center"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'security', label: 'Security', icon: Shield },
            { key: 'notifications', label: 'Notifications', icon: Bell },
            { key: 'platform', label: 'Platform', icon: Globe },
            { key: 'integration', label: 'Integrations', icon: Network },
            { key: 'performance', label: 'Performance', icon: Zap }
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveSection(key)}
              className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                activeSection === key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon className="w-5 h-5 mr-2" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      {activeSection === 'security' && renderSecuritySection()}
      {activeSection === 'notifications' && renderNotificationsSection()}
      {activeSection === 'platform' && renderPlatformSection()}
      {activeSection === 'integration' && renderIntegrationSection()}
      {activeSection === 'performance' && renderPerformanceSection()}
    </div>
  );
};

export default SystemConfiguration;
