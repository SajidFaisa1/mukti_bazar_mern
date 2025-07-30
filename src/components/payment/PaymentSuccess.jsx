import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useClientAuth } from '../../contexts/ClientAuthContext';
import { useVendorAuth } from '../../contexts/VendorAuthContext';
import LoadingSpinner from '../common/LoadingSpinner';
import './PaymentSuccess.css';

const PaymentSuccess = () => {
  const { orderId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentUser: clientUser } = useClientAuth();
  const { currentUser: vendorUser } = useVendorAuth();
  const [loading, setLoading] = useState(true);
  const [orderDetails, setOrderDetails] = useState(null);
  const [error, setError] = useState('');
  const [showConfetti, setShowConfetti] = useState(false);

  // Get current user and token
  const currentUser = clientUser || vendorUser;
  const getAuthToken = () => {
    if (clientUser) {
      return localStorage.getItem('clientToken');
    } else if (vendorUser) {
      return sessionStorage.getItem('vendorToken');
    }
    return null;
  };

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        const tran_id = searchParams.get('tran_id');
        console.log('Starting payment verification for transaction:', tran_id);
        
        if (!tran_id) {
          console.error('No transaction ID found in URL');
          setError('Invalid payment verification data');
          setLoading(false);
          return;
        }

        console.log('Making verification request to:', `http://localhost:5005/api/payment/status/${tran_id}`);
        
        // Use the public payment status endpoint instead of the protected verify endpoint
        const response = await fetch(`http://localhost:5005/api/payment/status/${tran_id}`);

        console.log('Verification response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('Verification response data:', data);

          if (data.success) {
            setOrderDetails(data);
            setShowConfetti(true);
            console.log('Payment verification successful');
          } else {
            console.error('Payment verification failed:', data.message);
            setError(data.message || 'Payment verification failed');
          }
        } else {
          // If status endpoint requires auth, fallback to verify with auth
          const authToken = getAuthToken();
          if (authToken) {
            console.log('Trying verify endpoint with auth token...');
            const authResponse = await fetch(`http://localhost:5005/api/payment/verify/${tran_id}`, {
              headers: {
                'Authorization': `Bearer ${authToken}`
              }
            });
            
            if (authResponse.ok) {
              const authData = await authResponse.json();
              if (authData.success) {
                setOrderDetails(authData);
                setShowConfetti(true);
                console.log('Payment verification successful with auth');
              } else {
                setError(authData.message || 'Payment verification failed');
              }
            } else {
              setError('Unable to verify payment status');
            }
          } else {
            setError('Payment verification requires authentication');
          }
        }
      } catch (error) {
        console.error('Payment verification error:', error);
        setError('Failed to verify payment');
      } finally {
        setLoading(false);
      }
    };

    // Always try to verify payment immediately
    verifyPayment();
  }, [searchParams]);

  const handleViewOrders = () => {
    navigate('/orders');
  };

  if (loading) {
    return (
      <div className="payment-loading-container">
        <div className="payment-loading-content">
          <LoadingSpinner />
          <p className="payment-loading-text">Verifying payment...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="payment-error-container">
        <div className="payment-error-card">
          <div className="payment-error-icon">⚠️</div>
          <h1 className="payment-error-title">Payment Verification Failed</h1>
          <p className="payment-error-message">{error}</p>
          <button
            onClick={() => navigate('/cart')}
            className="payment-error-button"
          >
            Return to Cart
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="payment-success-container">
      {showConfetti && (
        <div className="confetti-container">
          {[...Array(50)].map((_, i) => (
            <div key={i} className={`confetti confetti-${i % 5}`} />
          ))}
        </div>
      )}
      
      <div className="payment-success-card">
        <div className="payment-success-header">
          <div className="payment-success-icon-container">
            <div className="payment-success-icon">
              <svg viewBox="0 0 52 52" className="checkmark">
                <circle className="checkmark-circle" cx="26" cy="26" r="25" fill="none"/>
                <path className="checkmark-check" fill="none" d="m14.1 27.2l7.1 7.2 16.7-16.8"/>
              </svg>
            </div>
          </div>
          
          <h1 className="payment-success-title">
            Payment Successful!
          </h1>
          <p className="payment-success-subtitle">
            Your order has been placed successfully and is being processed.
          </p>
        </div>

        {orderDetails && (
          <div className="payment-details-section">
            <div className="payment-details-card">
              <h3 className="payment-details-title">Payment Details</h3>
              <div className="payment-details-grid">
                <div className="payment-detail-item">
                  <span className="payment-detail-label">Transaction ID</span>
                  <span className="payment-detail-value">{orderDetails.transactionId}</span>
                </div>
                <div className="payment-detail-item">
                  <span className="payment-detail-label">Amount Paid</span>
                  <span className="payment-detail-value payment-amount">৳{orderDetails.amount}</span>
                </div>
                {orderDetails.orderNumbers && (
                  <div className="payment-detail-item">
                    <span className="payment-detail-label">Order Numbers</span>
                    <span className="payment-detail-value">{orderDetails.orderNumbers.join(', ')}</span>
                  </div>
                )}
                <div className="payment-detail-item">
                  <span className="payment-detail-label">Payment Date</span>
                  <span className="payment-detail-value">{new Date().toLocaleDateString('en-GB')}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="payment-success-actions">
          <button
            onClick={handleViewOrders}
            className="payment-action-button primary"
          >
            <svg className="button-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            View My Orders
          </button>
          <button
            onClick={() => navigate('/')}
            className="payment-action-button secondary"
          >
            <svg className="button-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m6 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" />
            </svg>
            Continue Shopping
          </button>
        </div>

        <div className="payment-success-footer">
          <p className="payment-footer-text">
            <svg className="footer-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            You will receive an email confirmation shortly with your order details.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;
