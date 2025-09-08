import React, { useState } from 'react';
import { Shield, Key, Smartphone, AlertTriangle, Eye, EyeOff, Save, Clock, MapPin, Monitor } from 'lucide-react';

const VendorSecuritySettings = () => {
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [twoFactorAuth, setTwoFactorAuth] = useState({
    enabled: false,
    method: 'sms', // 'sms' or 'app'
    phoneNumber: '+880123456789',
    backupCodes: []
  });

  const [securitySettings, setSecuritySettings] = useState({
    loginNotifications: true,
    suspiciousActivityAlerts: true,
    sessionTimeout: 30, // minutes
    requirePasswordChange: false
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  const [loading, setLoading] = useState(false);

  // Mock login activity data
  const [loginActivity] = useState([
    {
      id: 1,
      timestamp: '2024-01-15 14:30:00',
      location: 'Dhaka, Bangladesh',
      device: 'Windows PC - Chrome',
      ipAddress: '103.92.34.123',
      status: 'success'
    },
    {
      id: 2,
      timestamp: '2024-01-15 09:15:00',
      location: 'Dhaka, Bangladesh',
      device: 'Android Phone - Chrome Mobile',
      ipAddress: '103.92.34.123',
      status: 'success'
    },
    {
      id: 3,
      timestamp: '2024-01-14 16:45:00',
      location: 'Chittagong, Bangladesh',
      device: 'iPhone - Safari',
      ipAddress: '103.92.35.200',
      status: 'failed'
    }
  ]);

  const handlePasswordChange = (field, value) => {
    setPasswordData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleUpdatePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('New passwords do not match!');
      return;
    }

    setLoading(true);
    try {
      // API call to update password
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      alert('Password updated successfully!');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      alert('Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle2FA = async () => {
    setLoading(true);
    try {
      // API call to toggle 2FA
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      setTwoFactorAuth(prev => ({ ...prev, enabled: !prev.enabled }));
      alert(twoFactorAuth.enabled ? '2FA disabled' : '2FA enabled successfully!');
    } catch (error) {
      alert('Failed to update 2FA settings');
    } finally {
      setLoading(false);
    }
  };

  const generateBackupCodes = () => {
    const codes = Array.from({ length: 8 }, () => 
      Math.random().toString(36).substring(2, 8).toUpperCase()
    );
    setTwoFactorAuth(prev => ({ ...prev, backupCodes: codes }));
  };

  const handleSecuritySettingChange = (setting, value) => {
    setSecuritySettings(prev => ({
      ...prev,
      [setting]: value
    }));
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const getPasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    
    return strength;
  };

  const getPasswordStrengthLabel = (strength) => {
    const labels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
    const colors = ['text-red-600', 'text-orange-600', 'text-yellow-600', 'text-blue-600', 'text-green-600'];
    return { label: labels[strength] || 'Very Weak', color: colors[strength] || 'text-red-600' };
  };

  const passwordStrength = getPasswordStrength(passwordData.newPassword);
  const { label: strengthLabel, color: strengthColor } = getPasswordStrengthLabel(passwordStrength);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-800">Security Settings</h2>
        </div>
        <p className="text-gray-600 mt-1">Manage your account security and authentication settings</p>
      </div>

      <div className="p-6 space-y-8">
        {/* Password Change */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Key className="h-5 w-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-800">Change Password</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showPasswords.current ? 'text' : 'password'}
                  value={passwordData.currentPassword}
                  onChange={(e) => handlePasswordChange('currentPassword', e.target.value)}
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your current password"
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('current')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPasswords.current ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPasswords.new ? 'text' : 'password'}
                  value={passwordData.newPassword}
                  onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your new password"
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('new')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPasswords.new ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {passwordData.newPassword && (
                <div className="mt-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          passwordStrength === 0 ? 'bg-red-500 w-1/5' :
                          passwordStrength === 1 ? 'bg-orange-500 w-2/5' :
                          passwordStrength === 2 ? 'bg-yellow-500 w-3/5' :
                          passwordStrength === 3 ? 'bg-blue-500 w-4/5' :
                          'bg-green-500 w-full'
                        }`}
                      />
                    </div>
                    <span className={`text-sm font-medium ${strengthColor}`}>
                      {strengthLabel}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showPasswords.confirm ? 'text' : 'password'}
                  value={passwordData.confirmPassword}
                  onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Confirm your new password"
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('confirm')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPasswords.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">Passwords do not match</p>
              )}
            </div>

            <button
              onClick={handleUpdatePassword}
              disabled={loading || !passwordData.currentPassword || !passwordData.newPassword || 
                       passwordData.newPassword !== passwordData.confirmPassword}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <Save size={18} />
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </div>

        {/* Two-Factor Authentication */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Smartphone className="h-5 w-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-800">Two-Factor Authentication</h3>
          </div>
          
          <div className="bg-gray-50 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-medium text-gray-800">Enable 2FA</h4>
                <p className="text-sm text-gray-600">Add an extra layer of security to your account</p>
              </div>
              <button
                onClick={handleToggle2FA}
                disabled={loading}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  twoFactorAuth.enabled ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    twoFactorAuth.enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {twoFactorAuth.enabled && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    2FA Method
                  </label>
                  <select
                    value={twoFactorAuth.method}
                    onChange={(e) => setTwoFactorAuth(prev => ({ ...prev, method: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="sms">SMS Text Message</option>
                    <option value="app">Authenticator App</option>
                  </select>
                </div>

                <div>
                  <button
                    onClick={generateBackupCodes}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Generate Backup Codes
                  </button>
                </div>

                {twoFactorAuth.backupCodes.length > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h5 className="font-medium text-yellow-800 mb-2">Backup Codes</h5>
                    <p className="text-sm text-yellow-700 mb-3">
                      Save these codes in a safe place. You can use them to access your account if you lose your phone.
                    </p>
                    <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                      {twoFactorAuth.backupCodes.map((code, index) => (
                        <div key={index} className="bg-white px-3 py-1 rounded border">
                          {code}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Security Settings */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-5 w-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-800">Security Preferences</h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="font-medium text-gray-800">Login Notifications</label>
                <p className="text-sm text-gray-600">Get notified of new login attempts</p>
              </div>
              <input
                type="checkbox"
                checked={securitySettings.loginNotifications}
                onChange={(e) => handleSecuritySettingChange('loginNotifications', e.target.checked)}
                className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="font-medium text-gray-800">Suspicious Activity Alerts</label>
                <p className="text-sm text-gray-600">Get alerts for unusual account activity</p>
              </div>
              <input
                type="checkbox"
                checked={securitySettings.suspiciousActivityAlerts}
                onChange={(e) => handleSecuritySettingChange('suspiciousActivityAlerts', e.target.checked)}
                className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-medium text-gray-800 mb-2">
                Session Timeout (minutes)
              </label>
              <select
                value={securitySettings.sessionTimeout}
                onChange={(e) => handleSecuritySettingChange('sessionTimeout', parseInt(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={60}>1 hour</option>
                <option value={120}>2 hours</option>
                <option value={0}>Never</option>
              </select>
            </div>
          </div>
        </div>

        {/* Login Activity */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Monitor className="h-5 w-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-800">Recent Login Activity</h3>
          </div>
          
          <div className="space-y-3">
            {loginActivity.map((activity) => (
              <div key={activity.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    activity.status === 'success' ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                  <div>
                    <div className="font-medium text-gray-800">{activity.device}</div>
                    <div className="text-sm text-gray-600 flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <MapPin size={12} />
                        {activity.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {activity.timestamp}
                      </span>
                    </div>
                  </div>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  activity.status === 'success' 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-red-100 text-red-700'
                }`}>
                  {activity.status === 'success' ? 'Successful' : 'Failed'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Security Tips */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-blue-800 mb-3">Security Tips</h3>
          <ul className="space-y-2 text-sm text-blue-700">
            <li>• Use a strong, unique password for your vendor account</li>
            <li>• Enable two-factor authentication for extra security</li>
            <li>• Regularly review your login activity</li>
            <li>• Never share your login credentials with anyone</li>
            <li>• Log out from shared computers and devices</li>
            <li>• Keep your contact information up to date</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default VendorSecuritySettings;
