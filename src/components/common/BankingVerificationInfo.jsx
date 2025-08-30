import React, { useState } from 'react';
import { Shield, CheckCircle, AlertTriangle, Info, ExternalLink } from 'lucide-react';
import BankingValidationService from '../../services/bankingValidation';

const BankingVerificationInfo = ({ bankingDetails, onVerificationComplete }) => {
  const [verificationStatus, setVerificationStatus] = useState('pending');
  const [verificationResults, setVerificationResults] = useState(null);

  const handleBasicVerification = async () => {
    setVerificationStatus('verifying');
    
    // Simulate verification process
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const results = BankingValidationService.validateBankingInfo(bankingDetails);
    setVerificationResults(results);
    setVerificationStatus(results.isValid ? 'verified' : 'failed');
    
    if (onVerificationComplete) {
      onVerificationComplete(results);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
      <div className="flex items-center mb-4">
        <Shield className="h-6 w-6 text-blue-600 mr-2" />
        <h3 className="text-lg font-semibold text-gray-800">Banking Information Verification</h3>
      </div>

      {/* Current Verification Options */}
      <div className="space-y-4 mb-6">
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start">
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-green-800">Free Validation (Currently Available)</h4>
              <ul className="text-sm text-green-700 mt-2 space-y-1">
                <li>• Bank name verification against 20+ major Bangladeshi banks</li>
                <li>• Account number format validation</li>
                <li>• Routing number pattern matching</li>
                <li>• Basic checksum validation</li>
                <li>• SWIFT code format verification</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-amber-800">Premium Verification (Coming Soon)</h4>
              <ul className="text-sm text-amber-700 mt-2 space-y-1">
                <li>• Real-time account verification via Bangladesh Bank API</li>
                <li>• Account holder name matching</li>
                <li>• Account status verification (active/inactive)</li>
                <li>• Branch location confirmation</li>
                <li>• Transaction history validation</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start">
            <Info className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-blue-800">Alternative Verification Methods</h4>
              <ul className="text-sm text-blue-700 mt-2 space-y-1">
                <li>• Upload bank statement (PDF verification)</li>
                <li>• Mobile banking account verification</li>
                <li>• Manual verification by admin team</li>
                <li>• Test transaction (1 BDT verification deposit)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Verification Action */}
      <div className="border-t pt-4">
        {verificationStatus === 'pending' && (
          <button
            onClick={handleBasicVerification}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
          >
            <Shield className="h-4 w-4 mr-2" />
            Verify Banking Information (Free)
          </button>
        )}

        {verificationStatus === 'verifying' && (
          <div className="w-full bg-gray-100 text-gray-600 font-medium py-3 px-4 rounded-lg flex items-center justify-center">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-blue-600 mr-2"></div>
            Verifying banking details...
          </div>
        )}

        {verificationStatus === 'verified' && (
          <div className="w-full bg-green-100 text-green-800 font-medium py-3 px-4 rounded-lg flex items-center justify-center">
            <CheckCircle className="h-4 w-4 mr-2" />
            Banking information verified successfully
          </div>
        )}

        {verificationStatus === 'failed' && (
          <div className="space-y-3">
            <div className="w-full bg-red-100 text-red-800 font-medium py-3 px-4 rounded-lg flex items-center justify-center">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Verification failed - Please check your information
            </div>
            {verificationResults?.errors && (
              <div className="text-sm space-y-1">
                {Object.entries(verificationResults.errors).map(([field, error]) => (
                  <p key={field} className="text-red-600">• {error}</p>
                ))}
              </div>
            )}
            <button
              onClick={handleBasicVerification}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm"
            >
              Try Again
            </button>
          </div>
        )}
      </div>

      {/* Additional Resources */}
      <div className="mt-6 pt-4 border-t">
        <h4 className="font-medium text-gray-800 mb-3">Need Help?</h4>
        <div className="space-y-2 text-sm">
          <a 
            href="https://www.bb.org.bd" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center text-blue-600 hover:text-blue-700"
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            Bangladesh Bank Official Website
          </a>
          <a 
            href="#" 
            className="flex items-center text-blue-600 hover:text-blue-700"
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            Banking Information Guidelines
          </a>
          <a 
            href="#" 
            className="flex items-center text-blue-600 hover:text-blue-700"
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            Contact Support Team
          </a>
        </div>
      </div>
    </div>
  );
};

export default BankingVerificationInfo;
