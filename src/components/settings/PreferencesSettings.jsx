import React, { useState } from 'react';
import { Globe, Monitor, Smartphone, Palette, Type, Moon, Sun, Eye, Zap, Settings } from 'lucide-react';

const PreferencesSettings = () => {
  const [preferences, setPreferences] = useState({
    language: 'en',
    theme: 'light',
    currency: 'BDT',
    timezone: 'Asia/Dhaka',
    dateFormat: 'dd/mm/yyyy',
    fontSize: 'medium',
    compactMode: false,
    animations: true,
    autoSave: true
  });

  const [loading, setLoading] = useState(false);

  const handlePreferenceChange = (key, value) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSavePreferences = async () => {
    setLoading(true);
    try {
      // API call to save preferences
      await new Promise(resolve => setTimeout(resolve, 1500));
      alert('Preferences saved successfully');
    } catch (error) {
      console.error('Failed to save preferences:', error);
      alert('Failed to save preferences');
    } finally {
      setLoading(false);
    }
  };

  const SelectField = ({ label, value, onChange, options, icon: Icon }) => (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
        <Icon size={16} className="text-gray-500" />
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );

  const ToggleField = ({ label, description, value, onChange, icon: Icon }) => (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3">
        <div className="bg-blue-100 rounded-lg p-2">
          <Icon size={16} className="text-blue-600" />
        </div>
        <div>
          <p className="font-medium text-gray-800">{label}</p>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          value ? 'bg-emerald-600' : 'bg-gray-300'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            value ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 rounded-xl p-2.5">
              <Settings size={20} className="text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">General Preferences</h3>
              <p className="text-sm text-gray-600">Customize your experience</p>
            </div>
          </div>
          <button
            onClick={handleSavePreferences}
            disabled={loading}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>

      <div className="p-6 space-y-8">
        {/* Language and Region */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Globe size={18} className="text-gray-600" />
            <h4 className="text-md font-semibold text-gray-800">Language & Region</h4>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SelectField
              label="Language"
              value={preferences.language}
              onChange={(value) => handlePreferenceChange('language', value)}
              icon={Globe}
              options={[
                { value: 'en', label: 'English' },
                { value: 'bn', label: 'বাংলা (Bengali)' },
                { value: 'hi', label: 'हिन्दी (Hindi)' }
              ]}
            />
            
            <SelectField
              label="Currency"
              value={preferences.currency}
              onChange={(value) => handlePreferenceChange('currency', value)}
              icon={Globe}
              options={[
                { value: 'BDT', label: 'Bangladeshi Taka (৳)' },
                { value: 'USD', label: 'US Dollar ($)' },
                { value: 'EUR', label: 'Euro (€)' },
                { value: 'INR', label: 'Indian Rupee (₹)' }
              ]}
            />
            
            <SelectField
              label="Timezone"
              value={preferences.timezone}
              onChange={(value) => handlePreferenceChange('timezone', value)}
              icon={Globe}
              options={[
                { value: 'Asia/Dhaka', label: 'Dhaka (GMT+6)' },
                { value: 'Asia/Kolkata', label: 'Kolkata (GMT+5:30)' },
                { value: 'UTC', label: 'UTC (GMT+0)' },
                { value: 'America/New_York', label: 'New York (GMT-5)' },
                { value: 'Europe/London', label: 'London (GMT+0)' }
              ]}
            />
            
            <SelectField
              label="Date Format"
              value={preferences.dateFormat}
              onChange={(value) => handlePreferenceChange('dateFormat', value)}
              icon={Globe}
              options={[
                { value: 'dd/mm/yyyy', label: 'DD/MM/YYYY' },
                { value: 'mm/dd/yyyy', label: 'MM/DD/YYYY' },
                { value: 'yyyy-mm-dd', label: 'YYYY-MM-DD' }
              ]}
            />
          </div>
        </div>

        {/* Display Settings */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Monitor size={18} className="text-gray-600" />
            <h4 className="text-md font-semibold text-gray-800">Display Settings</h4>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <SelectField
              label="Theme"
              value={preferences.theme}
              onChange={(value) => handlePreferenceChange('theme', value)}
              icon={preferences.theme === 'light' ? Sun : Moon}
              options={[
                { value: 'light', label: 'Light Theme' },
                { value: 'dark', label: 'Dark Theme' },
                { value: 'auto', label: 'System Default' }
              ]}
            />
            
            <SelectField
              label="Font Size"
              value={preferences.fontSize}
              onChange={(value) => handlePreferenceChange('fontSize', value)}
              icon={Type}
              options={[
                { value: 'small', label: 'Small' },
                { value: 'medium', label: 'Medium' },
                { value: 'large', label: 'Large' },
                { value: 'extra-large', label: 'Extra Large' }
              ]}
            />
          </div>

          <div className="space-y-1 bg-gray-50 rounded-xl p-4">
            <ToggleField
              label="Compact Mode"
              description="Show more content in less space"
              value={preferences.compactMode}
              onChange={(value) => handlePreferenceChange('compactMode', value)}
              icon={Smartphone}
            />
            
            <ToggleField
              label="Animations"
              description="Enable page transitions and effects"
              value={preferences.animations}
              onChange={(value) => handlePreferenceChange('animations', value)}
              icon={Zap}
            />
          </div>
        </div>

        {/* Accessibility */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Eye size={18} className="text-gray-600" />
            <h4 className="text-md font-semibold text-gray-800">Accessibility</h4>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
            <div className="flex items-start gap-3">
              <div className="bg-blue-100 rounded-lg p-2 mt-1">
                <Eye size={16} className="text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-blue-800 font-medium mb-1">Accessibility Features</p>
                <p className="text-sm text-blue-700">
                  We're committed to creating an accessible platform for everyone. 
                  These settings will help improve your browsing experience.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-1 bg-gray-50 rounded-xl p-4">
            <ToggleField
              label="High Contrast"
              description="Increase color contrast for better visibility"
              value={preferences.highContrast || false}
              onChange={(value) => handlePreferenceChange('highContrast', value)}
              icon={Eye}
            />
            
            <ToggleField
              label="Large Click Areas"
              description="Make buttons and links easier to click"
              value={preferences.largeClickArea || false}
              onChange={(value) => handlePreferenceChange('largeClickArea', value)}
              icon={Smartphone}
            />
            
            <ToggleField
              label="Keyboard Navigation"
              description="Navigate the site using keyboard shortcuts"
              value={preferences.keyboardNav || true}
              onChange={(value) => handlePreferenceChange('keyboardNav', value)}
              icon={Monitor}
            />

            <ToggleField
              label="Reduce Motion"
              description="Minimize animations for motion sensitivity"
              value={preferences.reduceMotion || false}
              onChange={(value) => handlePreferenceChange('reduceMotion', value)}
              icon={Zap}
            />
          </div>
        </div>

        {/* Performance */}
        <div className="border-t border-gray-200 pt-6">
          <div className="flex items-center gap-2 mb-4">
            <Zap size={18} className="text-gray-600" />
            <h4 className="text-md font-semibold text-gray-800">Performance</h4>
          </div>
          
          <div className="space-y-1 bg-gray-50 rounded-xl p-4">
            <ToggleField
              label="Auto Save"
              description="Automatically save form data as you type"
              value={preferences.autoSave}
              onChange={(value) => handlePreferenceChange('autoSave', value)}
              icon={Zap}
            />
            
            <ToggleField
              label="Data Saver"
              description="Use less data for faster loading"
              value={preferences.dataSaver || false}
              onChange={(value) => handlePreferenceChange('dataSaver', value)}
              icon={Smartphone}
            />

            <ToggleField
              label="Preload Images"
              description="Load images in advance for smoother browsing"
              value={preferences.preloadImages || true}
              onChange={(value) => handlePreferenceChange('preloadImages', value)}
              icon={Monitor}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreferencesSettings;
