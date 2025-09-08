import React, { useState } from 'react';
import { useVendorAuth } from '../../contexts/VendorAuthContext';
import { 
  Shield, 
  Lock, 
  Smartphone, 
  Key, 
  Eye, 
  EyeOff, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  MapPin,
  Monitor,
  Save,
  RefreshCw
} from 'lucide-react';

const VendorSecuritySettings = () => {
  const { user, logout } = useVendorAuth();
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [loginAlerts, setLoginAlerts] = useState(true);

  // Mock login activity data
  const loginActivity = [
    {
      id: 1,
      device: 'Chrome on Windows',
      location: 'Dhaka, Bangladesh',
      time: '2024-01-15 10:30 AM',
      status: 'success',
      ip: '203.83.xxx.xxx'
    },
    {
      id: 2,
      device: 'Mobile App on Android',
      location: 'Dhaka, Bangladesh',
      time: '2024-01-14 08:15 PM',
      status: 'success',
      ip: '203.83.xxx.xxx'
    },
    {
      id: 3,
      device: 'Chrome on Windows',
      location: 'Chittagong, Bangladesh',
      time: '2024-01-13 02:45 PM',
      status: 'suspicious',
      ip: '103.xx.xxx.xxx'
    }
  ];

  const securityTips = [
    {
      title: 'Use Strong Passwords',
      description: 'Create passwords with at least 12 characters, including uppercase, lowercase, numbers, and symbols.',
      icon: Lock,
      status: 'warning'
    },
    {
      title: 'Enable Two-Factor Authentication',
      description: 'Add an extra layer of security to your account with SMS or app-based verification.',
      icon: Smartphone,
      status: twoFAEnabled ? 'good' : 'warning'
    },
    {
      title: 'Keep Software Updated',
      description: 'Regularly update your browser and operating system to protect against security vulnerabilities.',
      icon: RefreshCw,
      status: 'good'
    },
    {
      title: 'Monitor Account Activity',
      description: 'Regularly check your login activity and report any suspicious access immediately.',
      icon: Eye,
      status: 'good'
    }
  ];

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters long' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      // In a real app, this would call the password change API
      // For now, just simulate the process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setMessage({ type: 'success', text: 'Password updated successfully!' });
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update password' });
    } finally {
      setLoading(false);
    }
  };

  const handleTwoFAToggle = async () => {
    if (!twoFAEnabled) {
      // In a real app, this would start the 2FA setup process
      alert('Two-Factor Authentication setup would begin here');
    } else {
      // Disable 2FA
      if (confirm('Are you sure you want to disable Two-Factor Authentication?')) {
        setTwoFAEnabled(false);
        setMessage({ type: 'success', text: 'Two-Factor Authentication disabled' });
      }
    }
  };

  const handleLogoutAllDevices = async () => {
    if (confirm('This will log you out from all devices. Continue?')) {
      try {
        // In a real app, this would call an API to invalidate all sessions
        await logout();
      } catch (error) {
        setMessage({ type: 'error', text: 'Failed to logout from all devices' });
      }
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Security Settings</h2>
        <p className="text-gray-600">Manage your account security and privacy settings</p>
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
            <AlertTriangle className="mr-2 h-5 w-5" />
          )}
          {message.text}
        </div>
      )}

      <div className="space-y-8">
        {/* Password Change */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Lock className="mr-2 h-5 w-5" />
              Change Password
            </h3>
            <p className="text-gray-600 text-sm mt-1">Update your password to keep your account secure</p>
          </div>

          <form onSubmit={handlePasswordSubmit} className="p-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    name="currentPassword"
                    value={passwordForm.currentPassword}
                    onChange={handlePasswordChange}
                    className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Enter your current password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                  >
                    {showCurrentPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    name="newPassword"
                    value={passwordForm.newPassword}
                    onChange={handlePasswordChange}
                    className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Enter your new password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                  >
                    {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={passwordForm.confirmPassword}
                    onChange={handlePasswordChange}
                    className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Confirm your new password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {loading ? (
                  <div className="mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Update Password
              </button>
            </div>
          </form>
        </div>

        {/* Two-Factor Authentication */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Smartphone className="mr-2 h-5 w-5" />
              Two-Factor Authentication
            </h3>
            <p className="text-gray-600 text-sm mt-1">Add an extra layer of security to your account</p>
          </div>

          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900">Enable Two-Factor Authentication</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Protect your account with SMS verification codes
                </p>
              </div>
              <button
                onClick={handleTwoFAToggle}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  twoFAEnabled ? 'bg-green-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    twoFAEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {twoFAEnabled && (
              <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                  <span className="text-sm text-green-800">
                    Two-Factor Authentication is enabled for your account
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Login Activity */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Clock className="mr-2 h-5 w-5" />
                  Login Activity
                </h3>
                <p className="text-gray-600 text-sm mt-1">Monitor recent access to your account</p>
              </div>
              <button
                onClick={handleLogoutAllDevices}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
              >
                Logout All Devices
              </button>
            </div>
          </div>

          <div className="p-6">
            <div className="space-y-4">
              {loginActivity.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className={`w-3 h-3 rounded-full ${
                      activity.status === 'success' ? 'bg-green-500' : 
                      activity.status === 'suspicious' ? 'bg-red-500' : 'bg-yellow-500'
                    }`} />
                    
                    <div>
                      <div className="flex items-center space-x-2">
                        <Monitor className="h-4 w-4 text-gray-500" />
                        <span className="font-medium text-gray-900">{activity.device}</span>
                        {activity.status === 'suspicious' && (
                          <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                            Suspicious
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                        <div className="flex items-center">
                          <MapPin className="h-3 w-3 mr-1" />
                          {activity.location}
                        </div>
                        <span>{activity.time}</span>
                        <span>IP: {activity.ip}</span>
                      </div>
                    </div>
                  </div>
                  
                  {activity.status === 'suspicious' && (
                    <button className="text-red-600 hover:text-red-800 text-sm font-medium">
                      Report Issue
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Security Preferences */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Shield className="mr-2 h-5 w-5" />
              Security Preferences
            </h3>
          </div>

          <div className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">Login Alerts</h4>
                  <p className="text-sm text-gray-600">Get notified of new logins to your account</p>
                </div>
                <button
                  onClick={() => setLoginAlerts(!loginAlerts)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    loginAlerts ? 'bg-green-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      loginAlerts ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">Auto-logout</h4>
                  <p className="text-sm text-gray-600">Automatically logout after 30 minutes of inactivity</p>
                </div>
                <button
                  className="relative inline-flex h-6 w-11 items-center rounded-full bg-green-600"
                >
                  <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-6" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Security Tips */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Key className="mr-2 h-5 w-5" />
              Security Recommendations
            </h3>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {securityTips.map((tip, index) => (
                <div key={index} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <div className={`p-2 rounded-lg ${
                      tip.status === 'good' ? 'bg-green-100' : 'bg-yellow-100'
                    }`}>
                      <tip.icon className={`h-5 w-5 ${
                        tip.status === 'good' ? 'text-green-600' : 'text-yellow-600'
                      }`} />
                    </div>
                    
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 mb-1">{tip.title}</h4>
                      <p className="text-sm text-gray-600">{tip.description}</p>
                    </div>
                    
                    <div className={`w-3 h-3 rounded-full ${
                      tip.status === 'good' ? 'bg-green-500' : 'bg-yellow-500'
                    }`} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorSecuritySettings;
