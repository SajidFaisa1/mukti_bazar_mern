import React, { useState } from 'react';
import { 
  FileText, 
  Upload, 
  Download, 
  Eye, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  Camera,
  Trash2
} from 'lucide-react';
import { useVendorAuth } from '../../contexts/VendorAuthContext';

const VendorDocumentSettings = () => {
  const { user, token } = useVendorAuth();
  const [uploadingDoc, setUploadingDoc] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });

  const documentTypes = [
    {
      key: 'farmingLicense',
      title: 'Farming License',
      description: 'Upload your farming license or agricultural certification',
      required: true
    },
    {
      key: 'kycDocument',
      title: 'KYC Document',
      description: 'National ID, Passport, or Driving License for verification',
      required: true
    },
    {
      key: 'businessLicense',
      title: 'Business License',
      description: 'Trade license or business registration certificate',
      required: false
    },
    {
      key: 'taxCertificate',
      title: 'Tax Certificate',
      description: 'Tax clearance certificate or VAT registration',
      required: false
    }
  ];

  const getDocumentStatus = (docKey) => {
    const doc = user?.[docKey];
    if (!doc || !doc.url) return 'not_uploaded';
    if (doc.verified === true) return 'verified';
    if (doc.verified === false) return 'rejected';
    return 'pending';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'verified': return 'text-green-600 bg-green-50 border-green-200';
      case 'rejected': return 'text-red-600 bg-red-50 border-red-200';
      case 'pending': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'verified': return <CheckCircle className="h-5 w-5" />;
      case 'rejected': return <AlertCircle className="h-5 w-5" />;
      case 'pending': return <Clock className="h-5 w-5" />;
      default: return <FileText className="h-5 w-5" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'verified': return 'Verified';
      case 'rejected': return 'Rejected';
      case 'pending': return 'Under Review';
      default: return 'Not Uploaded';
    }
  };

  const handleFileUpload = async (docKey, file) => {
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      setMessage({ type: 'error', text: 'File size should be less than 10MB' });
      return;
    }

    setUploadingDoc(docKey);
    setMessage({ type: '', text: '' });

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target.result;
        
        const updateData = {
          uid: user.uid,
          [docKey]: base64
        };

        const response = await fetch(`http://localhost:5005/api/vendors/${user.uid}/profile`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(updateData)
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to upload document');
        }

        const updatedVendor = await response.json();
        setMessage({ type: 'success', text: 'Document uploaded successfully!' });
        
        // Update local storage
        sessionStorage.setItem('vendorUser', JSON.stringify(updatedVendor));
        
        // Trigger a page refresh to show updated data
        window.location.reload();
      };
      
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Upload document error:', error);
      setMessage({ type: 'error', text: error.message });
    } finally {
      setUploadingDoc(null);
    }
  };

  const handleViewDocument = (docKey) => {
    const doc = user?.[docKey];
    if (doc && doc.url) {
      window.open(doc.url, '_blank');
    }
  };

  const handleDeleteDocument = async (docKey) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      const updateData = {
        uid: user.uid,
        [docKey]: {}
      };

      const response = await fetch(`http://localhost:5005/api/vendors/${user.uid}/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete document');
      }

      setMessage({ type: 'success', text: 'Document deleted successfully!' });
      
      // Trigger a page refresh to show updated data
      window.location.reload();
    } catch (error) {
      console.error('Delete document error:', error);
      setMessage({ type: 'error', text: error.message });
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Documents & Verification</h2>
        <p className="text-gray-600">
          Upload and manage your business documents for account verification
        </p>
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
            <AlertCircle className="mr-2 h-5 w-5" />
          )}
          {message.text}
        </div>
      )}

      {/* Verification Status Overview */}
      <div className="bg-blue-50 p-6 rounded-lg border border-blue-200 mb-8">
        <h3 className="text-lg font-semibold text-blue-900 mb-4">Verification Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-1">Account Status</h4>
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-2 ${user?.isApproved ? 'bg-green-500' : 'bg-yellow-500'}`} />
              <span className="text-sm text-gray-600">
                {user?.isApproved ? 'Approved' : 'Pending Approval'}
              </span>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-1">Trust Score</h4>
            <div className="flex items-center">
              <div className="w-full bg-gray-200 rounded-full h-2 mr-2">
                <div 
                  className="bg-green-600 h-2 rounded-full" 
                  style={{ width: `${user?.trustScore || 0}%` }}
                />
              </div>
              <span className="text-sm text-gray-600">{user?.trustScore || 0}%</span>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-1">Verification Level</h4>
            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
              user?.verificationLevel === 'low_risk' ? 'bg-green-100 text-green-800' :
              user?.verificationLevel === 'medium_risk' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              {user?.verificationLevel?.replace('_', ' ').toUpperCase() || 'UNKNOWN'}
            </span>
          </div>
        </div>
      </div>

      {/* Document Upload Section */}
      <div className="space-y-6">
        {documentTypes.map((docType) => {
          const status = getDocumentStatus(docType.key);
          const doc = user?.[docType.key];
          
          return (
            <div key={docType.key} className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 mr-2">
                      {docType.title}
                    </h3>
                    {docType.required && (
                      <span className="text-red-500 text-sm font-medium">*Required</span>
                    )}
                  </div>
                  <p className="text-gray-600 text-sm mb-3">{docType.description}</p>
                  
                  {/* Status Badge */}
                  <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(status)}`}>
                    {getStatusIcon(status)}
                    <span className="ml-2">{getStatusText(status)}</span>
                  </div>
                </div>
              </div>

              {/* Document Actions */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {/* Upload Button */}
                  <label className={`inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer ${
                    uploadingDoc === docType.key ? 'opacity-50 cursor-not-allowed' : ''
                  }`}>
                    {uploadingDoc === docType.key ? (
                      <>
                        <div className="mr-2 h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        {doc && doc.url ? 'Replace' : 'Upload'}
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => handleFileUpload(docType.key, e.target.files[0])}
                      className="hidden"
                      disabled={uploadingDoc === docType.key}
                    />
                  </label>

                  {/* View Button */}
                  {doc && doc.url && (
                    <button
                      onClick={() => handleViewDocument(docType.key)}
                      className="inline-flex items-center px-4 py-2 border border-blue-300 rounded-lg text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100"
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      View
                    </button>
                  )}

                  {/* Delete Button */}
                  {doc && doc.url && (
                    <button
                      onClick={() => handleDeleteDocument(docType.key)}
                      className="inline-flex items-center px-4 py-2 border border-red-300 rounded-lg text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </button>
                  )}
                </div>

                {/* File Info */}
                {doc && doc.url && (
                  <div className="text-sm text-gray-500">
                    <p>Uploaded: {new Date(doc.uploadedAt || Date.now()).toLocaleDateString()}</p>
                    {doc.verificationNote && (
                      <p className="text-red-600 mt-1">Note: {doc.verificationNote}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Upload Guidelines */}
      <div className="mt-8 bg-gray-50 p-6 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Camera className="mr-2 h-5 w-5" />
          Upload Guidelines
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-600">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Accepted Formats</h4>
            <ul className="space-y-1">
              <li>• Images: JPG, PNG, GIF</li>
              <li>• Documents: PDF</li>
              <li>• Maximum file size: 10MB</li>
              <li>• Minimum resolution: 1024x768</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Photo Quality Tips</h4>
            <ul className="space-y-1">
              <li>• Ensure documents are clearly visible</li>
              <li>• Avoid shadows and glare</li>
              <li>• Include all corners of the document</li>
              <li>• Text should be readable</li>
            </ul>
          </div>
        </div>
        
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-yellow-800 mb-1">Important Note</h4>
              <p className="text-sm text-yellow-700">
                All documents will be reviewed by our verification team within 2-3 business days. 
                Ensure all information is accurate and documents are current to avoid verification delays.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorDocumentSettings;
