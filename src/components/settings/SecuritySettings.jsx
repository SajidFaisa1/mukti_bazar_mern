import React, { useState } from 'react';
import { Shield, Key, Eye, EyeOff, Lock, Smartphone, Mail, AlertTriangle, Globe, Clock } from 'lucide-react';

const SecuritySettings = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [loading, setLoading] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert('New password and confirmation password do not match');
      return;
    }
    
    setLoading(true);
    try {
      // API call to change password
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API call
      alert('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Password change failed:', error);
      alert('Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleTwoFactorToggle = async () => {
    setLoading(true);
    try {
      // API call to toggle 2FA
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API call
      setTwoFactorEnabled(!twoFactorEnabled);
    } catch (error) {
      console.error('2FA toggle failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Password Management */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-red-50 to-orange-50 px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="bg-red-100 rounded-xl p-2.5">
              <Key size={20} className="text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Password Security</h3>
              <p className="text-sm text-gray-600">Manage your account password</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <form onSubmit={handlePasswordChange} className="space-y-4">
            {/* Current Password */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Current Password</label>
              <div className="relative">
                <input
                  type={showPasswords.current ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 pr-12"
                  placeholder="Enter current password"
                  required
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

            {/* New Password */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">New Password</label>
              <div className="relative">
                <input
                  type={showPasswords.new ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 pr-12"
                  placeholder="Enter new password"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('new')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPasswords.new ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Confirm New Password</label>
              <div className="relative">
                <input
                  type={showPasswords.confirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 pr-12"
                  placeholder="Confirm new password"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('confirm')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPasswords.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 text-white py-3 px-4 rounded-xl hover:bg-red-700 transition-colors font-medium disabled:opacity-50"
            >
              {loading ? 'Changing Password...' : 'Change Password'}
            </button>
          </form>
        </div>
      </div>

      {/* Two-Factor Authentication */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 rounded-xl p-2.5">
              <Smartphone size={20} className="text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Two-Factor Authentication</h3>
              <p className="text-sm text-gray-600">Add an extra layer of security to your account</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
            <div className="flex items-start gap-3">
              <div className="bg-blue-100 rounded-lg p-2 mt-1">
                <Lock size={16} className="text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-blue-800 font-medium mb-1">Enhanced Security</p>
                <p className="text-sm text-blue-700">
                  Enable two-factor authentication to add an extra layer of security to your account. 
                  A verification code will be sent to your phone each time you log in.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between bg-gray-50 p-4 rounded-xl">
            <div>
              <p className="font-medium text-gray-800">Two-Factor Authentication</p>
              <p className="text-sm text-gray-600">
                {twoFactorEnabled ? 'Enabled - Your account is secure' : 'Disabled - Enable for additional security'}
              </p>
            </div>
            <button
              onClick={handleTwoFactorToggle}
              disabled={loading}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                twoFactorEnabled 
                  ? 'bg-red-600 text-white hover:bg-red-700' 
                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
              } disabled:opacity-50`}
            >
              {loading ? 'Processing...' : twoFactorEnabled ? 'Disable' : 'Enable'}
            </button>
          </div>
        </div>
      </div>

      {/* Login Activity */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-green-50 to-teal-50 px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 rounded-xl p-2.5">
              <Clock size={20} className="text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Recent Login Activity</h3>
              <p className="text-sm text-gray-600">Monitor your account access</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="space-y-4">
            {[
              { device: 'Chrome on Windows', location: 'Dhaka, Bangladesh', time: '2 hours ago', current: true },
              { device: 'Mobile App', location: 'Dhaka, Bangladesh', time: '1 day ago', current: false },
              { device: 'Firefox on Windows', location: 'Chittagong, Bangladesh', time: '3 days ago', current: false }
            ].map((session, index) => (
              <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-xl">
                <div className="flex items-center gap-3">
                  <Globe size={20} className="text-gray-600" />
                  <div>
                    <p className="font-medium text-gray-800 flex items-center gap-2">
                      {session.device}
                      {session.current && (
                        <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium">
                          Current Session
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-gray-600">{session.location} • {session.time}</p>
                  </div>
                </div>
                {!session.current && (
                  <button className="text-red-600 hover:text-red-700 text-sm font-medium">
                    Revoke
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Security Tips */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="bg-yellow-100 rounded-xl p-2.5">
              <AlertTriangle size={20} className="text-yellow-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Security Tips</h3>
              <p className="text-sm text-gray-600">Best practices for account security</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <ul className="space-y-2 text-sm text-yellow-800">
              <li className="flex items-start gap-2">
                <span className="text-yellow-600 mt-1">•</span>
                <span>Use strong passwords (at least 8 characters with uppercase, lowercase, numbers, and special characters)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-600 mt-1">•</span>
                <span>Change your password regularly</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-600 mt-1">•</span>
                <span>Don't use the same password for multiple sites</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-600 mt-1">•</span>
                <span>Keep two-factor authentication enabled</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-600 mt-1">•</span>
                <span>Log out from public computers after use</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecuritySettings;
