import React, { useState } from 'react';
import { 
  FileText, 
  Upload, 
  Download, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  Shield,
  Eye,
  RefreshCw
} from 'lucide-react';

const VendorDocumentSettings = () => {
  const [documents, setDocuments] = useState([
    {
      id: 1,
      type: 'trade_license',
      name: 'Trade License',
      fileName: 'trade_license_2024.pdf',
      status: 'verified',
      uploadDate: '2024-01-15',
      expiryDate: '2025-01-15',
      required: true
    },
    {
      id: 2,
      type: 'nid',
      name: 'National ID Card',
      fileName: 'nid_copy.pdf',
      status: 'verified',
      uploadDate: '2024-01-10',
      expiryDate: null,
      required: true
    },
    {
      id: 3,
      type: 'bank_statement',
      name: 'Bank Statement',
      fileName: 'bank_statement_dec_2024.pdf',
      status: 'pending',
      uploadDate: '2024-12-01',
      expiryDate: null,
      required: false
    },
    {
      id: 4,
      type: 'vat_certificate',
      name: 'VAT Registration Certificate',
      fileName: null,
      status: 'not_uploaded',
      uploadDate: null,
      expiryDate: null,
      required: false
    }
  ]);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'verified':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'rejected':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'verified':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'verified':
        return 'Verified';
      case 'pending':
        return 'Under Review';
      case 'rejected':
        return 'Rejected';
      default:
        return 'Not Uploaded';
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Documents & Verification</h2>
        <p className="text-gray-600">Manage your business documents and verification status</p>
      </div>

      {/* Verification Status Overview */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-6 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <Shield className="h-6 w-6 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-900">Verification Status</h3>
            </div>
            <p className="text-gray-600 mb-4">
              Complete your verification to access all vendor features and build customer trust.
            </p>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm text-gray-600">2 of 4 documents verified</span>
              </div>
              <div className="h-2 w-32 bg-gray-200 rounded-full">
                <div className="h-2 w-16 bg-green-500 rounded-full"></div>
              </div>
              <span className="text-sm font-medium text-gray-900">50% Complete</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-green-600">Partially Verified</div>
            <p className="text-sm text-gray-500">2 documents pending</p>
          </div>
        </div>
      </div>

      {/* Document Requirements */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Document Requirements</h3>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h4 className="font-medium text-blue-900 mb-2">Document Guidelines:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Upload clear, high-resolution images or PDF files</li>
            <li>• File size should not exceed 5MB per document</li>
            <li>• Ensure all text is clearly readable</li>
            <li>• Documents should be current and not expired</li>
          </ul>
        </div>

        <div className="space-y-4">
          {documents.map((doc) => (
            <div key={doc.id} className="border border-gray-200 rounded-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start space-x-4">
                  <div className="p-3 bg-gray-100 rounded-lg">
                    <FileText className="h-6 w-6 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="font-medium text-gray-900">{doc.name}</h4>
                      {doc.required && (
                        <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
                          Required
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 mb-2">
                      {getStatusIcon(doc.status)}
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(doc.status)}`}>
                        {getStatusText(doc.status)}
                      </span>
                    </div>
                    {doc.fileName && (
                      <p className="text-sm text-gray-600 mb-1">File: {doc.fileName}</p>
                    )}
                    {doc.uploadDate && (
                      <p className="text-sm text-gray-500">Uploaded: {doc.uploadDate}</p>
                    )}
                    {doc.expiryDate && (
                      <p className="text-sm text-gray-500">Expires: {doc.expiryDate}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {doc.fileName ? (
                    <>
                      <button className="p-2 text-gray-400 hover:text-gray-600 border border-gray-300 rounded-md">
                        <Eye className="h-4 w-4" />
                      </button>
                      <button className="p-2 text-gray-400 hover:text-gray-600 border border-gray-300 rounded-md">
                        <Download className="h-4 w-4" />
                      </button>
                      <button className="p-2 text-gray-400 hover:text-blue-600 border border-gray-300 rounded-md">
                        <RefreshCw className="h-4 w-4" />
                      </button>
                    </>
                  ) : (
                    <button className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
                      <Upload className="h-4 w-4 mr-1" />
                      Upload
                    </button>
                  )}
                </div>
              </div>

              {doc.status === 'rejected' && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <p className="text-sm text-red-800 font-medium mb-1">Document Rejected</p>
                  <p className="text-sm text-red-700">
                    The document quality was insufficient. Please upload a clearer image.
                  </p>
                </div>
              )}

              {doc.status === 'pending' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                  <p className="text-sm text-yellow-800 font-medium mb-1">Under Review</p>
                  <p className="text-sm text-yellow-700">
                    Your document is being reviewed. This usually takes 1-2 business days.
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Additional Certificates */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Certificates (Optional)</h3>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h4 className="font-medium text-gray-900 mb-2">Upload Additional Documents</h4>
          <p className="text-sm text-gray-600 mb-4">
            Upload any additional certificates or documents that might help with verification
          </p>
          <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200">
            Choose Files
          </button>
        </div>
      </div>

      {/* Verification Tips */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-2">Verification Tips</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Complete verification increases customer trust and sales</li>
          <li>• Verified vendors get priority in search results</li>
          <li>• Some features require complete verification</li>
          <li>• Keep your documents updated to avoid service interruptions</li>
        </ul>
      </div>
    </div>
  );
};

export default VendorDocumentSettings;
