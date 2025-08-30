import React, { useState, useEffect } from 'react';
import { Upload, Image as ImageIcon, Save, RefreshCw } from 'lucide-react';

const LogoManager = ({ token }) => {
  const [currentLogo, setCurrentLogo] = useState('');
  const [newLogo, setNewLogo] = useState(null);
  const [preview, setPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchCurrentLogo();
  }, []);

  const fetchCurrentLogo = async () => {
    try {
      const response = await fetch('http://localhost:5005/api/admin/logo', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setCurrentLogo(data.logoUrl || '/src/assets/Mukti.png');
      }
    } catch (error) {
      console.error('Error fetching logo:', error);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setMessage('File size must be less than 5MB');
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        setMessage('Please select an image file');
        return;
      }

      setNewLogo(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target.result);
      reader.readAsDataURL(file);
      setMessage('');
    }
  };

  const handleUpload = async () => {
    if (!newLogo) return;

    setLoading(true);
    setMessage('');

    try {
      const formData = new FormData();
      formData.append('logo', newLogo);

      const response = await fetch('http://localhost:5005/api/admin/logo', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentLogo(data.logoUrl);
        setNewLogo(null);
        setPreview('');
        setMessage('Logo updated successfully!');
        
        // Trigger a custom event to update navbar logo
        window.dispatchEvent(new CustomEvent('logoUpdated', { detail: { logoUrl: data.logoUrl } }));
      } else {
        const error = await response.json();
        setMessage(error.error || 'Failed to update logo');
      }
    } catch (error) {
      setMessage('Error uploading logo');
    } finally {
      setLoading(false);
    }
  };

  const resetToDefault = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5005/api/admin/logo', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setCurrentLogo('/src/assets/Mukti.png');
        setNewLogo(null);
        setPreview('');
        setMessage('Logo reset to default');
        
        // Trigger a custom event to update navbar logo
        window.dispatchEvent(new CustomEvent('logoUpdated', { detail: { logoUrl: '/src/assets/Mukti.png' } }));
      }
    } catch (error) {
      setMessage('Error resetting logo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <ImageIcon className="text-emerald-600" size={24} />
        <h2 className="text-xl font-bold text-gray-900">Website Logo Management</h2>
      </div>

      {/* Current Logo */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-3">Current Logo</h3>
        <div className="flex items-center justify-center h-20 bg-gray-50 border border-gray-200 rounded-lg">
          <img 
            src={currentLogo} 
            alt="Current Logo" 
            className="max-h-16 max-w-48 object-contain"
            onError={(e) => {
              e.target.src = '/src/assets/Mukti.png';
            }}
          />
        </div>
      </div>

      {/* Upload New Logo */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-3">Upload New Logo</h3>
        
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-emerald-400 transition-colors">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            id="logo-upload"
          />
          <label htmlFor="logo-upload" className="cursor-pointer">
            <Upload className="mx-auto mb-3 text-gray-400" size={32} />
            <p className="text-gray-600 mb-2">Click to select a new logo</p>
            <p className="text-sm text-gray-500">PNG, JPG, SVG up to 5MB</p>
          </label>
        </div>

        {/* Preview */}
        {preview && (
          <div className="mt-4">
            <h4 className="font-medium text-gray-700 mb-2">Preview</h4>
            <div className="flex items-center justify-center h-20 bg-gray-50 border border-gray-200 rounded-lg">
              <img 
                src={preview} 
                alt="Logo Preview" 
                className="max-h-16 max-w-48 object-contain"
              />
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleUpload}
          disabled={!newLogo || loading}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
        >
          {loading ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
          {loading ? 'Uploading...' : 'Update Logo'}
        </button>
        
        <button
          onClick={resetToDefault}
          disabled={loading}
          className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
        >
          <RefreshCw size={16} />
          Reset to Default
        </button>
      </div>

      {/* Message */}
      {message && (
        <div className={`mt-4 p-3 rounded-lg ${
          message.includes('success') ? 'bg-green-50 text-green-700 border border-green-200' : 
          'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message}
        </div>
      )}

      {/* Guidelines */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h4 className="font-semibold text-blue-800 mb-2">Logo Guidelines</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Recommended size: 200x60 pixels (or similar aspect ratio)</li>
          <li>• Use PNG with transparent background for best results</li>
          <li>• Ensure logo is readable on both light and dark backgrounds</li>
          <li>• Logo will be automatically resized to fit navbar height</li>
        </ul>
      </div>
    </div>
  );
};

export default LogoManager;
