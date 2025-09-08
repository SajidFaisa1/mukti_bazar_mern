import React, { useState } from 'react';
import { User, Mail, Phone, Calendar, MapPin, Edit3, Save, X, Check, Camera, Shield } from 'lucide-react';
import { useClientAuth } from '../../contexts/ClientAuthContext';

const ProfileSettings = () => {
  const { user, updateProfile } = useClientAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Only send fields that can be updated (excluding email)
      const updateData = {
        name: formData.name,
        phone: formData.phone
      };
      await updateProfile(updateData);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
    });
    setIsEditing(false);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 rounded-xl p-2.5">
              <User size={20} className="text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Profile Information</h3>
              <p className="text-sm text-gray-600">Update your personal information</p>
            </div>
          </div>
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <Edit3 size={16} />
              Edit
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={loading}
                className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium disabled:opacity-50"
              >
                <Save size={16} />
                {loading ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={handleCancel}
                className="flex items-center gap-2 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors text-sm font-medium"
              >
                <X size={16} />
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Profile Picture Section */}
        <div className="flex items-center gap-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
          <div className="relative">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center">
              <User size={32} className="text-blue-600" />
            </div>
            <button className="absolute -bottom-1 -right-1 bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 transition-colors">
              <Camera size={14} />
            </button>
          </div>
          <div>
            <h4 className="font-medium text-gray-800">Profile Picture</h4>
            <p className="text-sm text-gray-600">JPG, GIF or PNG. 2MB max.</p>
            <button className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium">
              Upload new picture
            </button>
          </div>
        </div>

        {/* Name Field */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <User size={16} className="text-gray-500" />
            Full Name
          </label>
          {isEditing ? (
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder="Enter your full name"
            />
          ) : (
            <div className="bg-gray-50 px-4 py-3 rounded-xl border border-gray-200">
              <span className="text-gray-800">{user?.name || 'Not specified'}</span>
            </div>
          )}
        </div>

        {/* Email Field */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <Mail size={16} className="text-gray-500" />
            Email Address
            {user?.emailVerified && (
              <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                <Check size={12} />
                Verified
              </span>
            )}
            <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs font-medium">
              Read-only
            </span>
          </label>
          <div className="bg-gray-50 px-4 py-3 rounded-xl border border-gray-200">
            <span className="text-gray-800">{user?.email || 'Not specified'}</span>
          </div>
          <p className="text-xs text-gray-500">
            Email cannot be changed. Contact support if you need to update your email address.
          </p>
        </div>

        {/* Phone Field */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <Phone size={16} className="text-gray-500" />
            Phone Number
          </label>
          {isEditing ? (
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder="Enter your phone number"
            />
          ) : (
            <div className="bg-gray-50 px-4 py-3 rounded-xl border border-gray-200">
              <span className="text-gray-800">{user?.phone || 'Not specified'}</span>
            </div>
          )}
        </div>

        {/* Account Status */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <Shield size={16} className="text-gray-500" />
            Account Status
          </label>
          <div className="bg-gray-50 px-4 py-3 rounded-xl border border-gray-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Member since:</span>
              <span className="text-sm font-medium text-gray-800">
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US') : 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Account Status:</span>
              <span className={`text-sm font-medium px-2 py-1 rounded-full ${
                user?.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
              }`}>
                {user?.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            {user?.verification && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Verification Status:</span>
                <span className={`text-sm font-medium px-2 py-1 rounded-full ${
                  user.verification.status === 'verified' ? 'bg-emerald-100 text-emerald-700' :
                  user.verification.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                  user.verification.status === 'rejected' ? 'bg-red-100 text-red-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {user.verification.status === 'verified' ? 'Verified' :
                   user.verification.status === 'pending' ? 'Pending' :
                   user.verification.status === 'rejected' ? 'Rejected' : 'Unverified'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileSettings;
