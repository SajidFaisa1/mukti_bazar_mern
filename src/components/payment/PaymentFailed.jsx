import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useClientAuth } from '../../contexts/ClientAuthContext';
import { useVendorAuth } from '../../contexts/VendorAuthContext';

const PaymentFailed = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentUser: clientUser } = useClientAuth();
  const { currentUser: vendorUser } = useVendorAuth();
  const [paymentInfo, setPaymentInfo] = useState({});

  // Get current user
  const currentUser = clientUser || vendorUser;

  useEffect(() => {
    // Extract payment info from URL params
    const tran_id = searchParams.get('tran_id');
    const error_desc = searchParams.get('error') || 'Payment was unsuccessful';
    
    setPaymentInfo({
      transactionId: tran_id,
      errorMessage: error_desc
    });
  }, [searchParams]);

  const handleRetryPayment = () => {
    navigate('/cart');
  };

  const handleViewOrders = () => {
    navigate('/orders');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full mx-auto p-6">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="text-red-500 text-6xl mb-4">❌</div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Payment Failed</h1>
          <p className="text-gray-600 mb-6">Unfortunately, your payment could not be processed.</p>
          
          {paymentInfo.transactionId && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium">Transaction ID:</span>
                  <span className="text-gray-600">{paymentInfo.transactionId}</span>
                </div>
                <div className="text-red-600 text-sm mt-2">
                  {paymentInfo.errorMessage}
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={handleRetryPayment}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Try Again
            </button>
            <button
              onClick={handleViewOrders}
              className="w-full bg-gray-200 text-gray-800 py-3 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              View My Orders
            </button>
            <button
              onClick={() => navigate('/')}
              className="w-full bg-gray-100 text-gray-600 py-3 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Continue Shopping
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentFailed;
