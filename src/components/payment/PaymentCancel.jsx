import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useClientAuth } from '../../contexts/ClientAuthContext';
import { useVendorAuth } from '../../contexts/VendorAuthContext';

const PaymentCancel = () => {
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
    
    setPaymentInfo({
      transactionId: tran_id
    });
  }, [searchParams]);

  const handleReturnToCart = () => {
    navigate('/cart');
  };

  const handleViewOrders = () => {
    navigate('/orders');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full mx-auto p-6">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="text-yellow-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Payment Cancelled</h1>
          <p className="text-gray-600 mb-6">Your payment was cancelled. No charges were made to your account.</p>
          
          {paymentInfo.transactionId && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="text-sm">
                <span className="font-medium">Transaction ID: </span>
                <span className="text-gray-600">{paymentInfo.transactionId}</span>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={handleReturnToCart}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Return to Cart
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

export default PaymentCancel;
