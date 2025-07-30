import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CreditCard, 
  MapPin, 
  Package, 
  Truck, 
  Clock, 
  CheckCircle,
  ArrowLeft,
  User,
  Phone,
  MessageSquare,
  AlertCircle
} from 'lucide-react';
import { useCart } from '../../contexts/CartContext';
import { useClientAuth } from '../../contexts/ClientAuthContext';
import { useVendorAuth } from '../../contexts/VendorAuthContext';
import './Checkout.css';

const Checkout = () => {
  const navigate = useNavigate();
  const { 
    cart, 
    checkout, 
    loading, 
    error 
  } = useCart();
  const clientAuth = useClientAuth();
  const vendorAuth = useVendorAuth();
  
  const [checkoutData, setCheckoutData] = useState({
    paymentMethod: 'cod',
    notes: '',
    specialInstructions: ''
  });
  
  const [currentUser, setCurrentUser] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [orderDetails, setOrderDetails] = useState(null);

  // Get current user
  useEffect(() => {
    let userInfo = null;
    let userRole = null;
    
    if (vendorAuth.user) {
      userInfo = vendorAuth.user;
      userRole = 'vendor';
    } else if (clientAuth.user) {
      userInfo = clientAuth.user;
      userRole = 'client';
    } else {
      // Fallback to storage
      const clientUser = JSON.parse(localStorage.getItem('clientUser') || 'null');
      if (clientUser) {
        userInfo = clientUser;
        userRole = 'client';
      } else {
        const vendorUser = JSON.parse(sessionStorage.getItem('vendorUser') || 'null');
        if (vendorUser) {
          userInfo = vendorUser;
          userRole = 'vendor';
        }
      }
    }
    
    setCurrentUser({ ...userInfo, role: userRole });
  }, [vendorAuth.user, clientAuth.user]);

  // Redirect if cart is empty or no delivery address or no delivery method
  useEffect(() => {
    if (cart.items?.length === 0) {
      navigate('/cart');
      return;
    }
    
    if (!cart.deliveryAddress) {
      navigate('/cart');
      return;
    }

    if (!cart.deliveryMethod) {
      navigate('/cart');
      return;
    }
  }, [cart, navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCheckoutData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePaymentMethodChange = (method) => {
    setCheckoutData(prev => ({
      ...prev,
      paymentMethod: method
    }));
  };

  const handleCheckout = async () => {
    if (!cart.deliveryAddress) {
      setCheckoutError('Please add a delivery address');
      return;
    }

    if (!cart.deliveryMethod) {
      setCheckoutError('Please select a delivery method');
      return;
    }

    if (!currentUser) {
      setCheckoutError('Please login to continue');
      return;
    }

    setIsProcessing(true);
    setCheckoutError('');

    try {
      const result = await checkout(
        checkoutData.paymentMethod,
        checkoutData.notes, 
        checkoutData.specialInstructions
      );
      
      if (result.success) {
        if (result.isOnlinePayment && result.gateway_url) {
          // For online payments, redirect to SSLCommerz
          window.location.href = result.gateway_url;
        } else {
          // For COD, show success and redirect
          setOrderDetails(result);
          setShowSuccess(true);
          
          // Redirect to order confirmation after 3 seconds
          setTimeout(() => {
            if (result.orderNumbers && result.orderNumbers.length > 1) {
              // Multiple orders - redirect to orders list
              navigate('/orders');
            } else {
              // Single order - redirect to specific order confirmation
              const orderNumber = result.orderNumber || result.orderNumbers?.[0];
              navigate(`/order-confirmation/${orderNumber}`);
            }
          }, 3000);
        }
      }
    } catch (error) {
      setCheckoutError(error.message || 'Failed to process checkout');
    } finally {
      setIsProcessing(false);
    }
  };

  const cartTotal = cart.total || cart.subtotal || 0;
  const deliveryFee = cart.deliveryFee || 0;
  const finalTotal = cartTotal + deliveryFee;
  const itemCount = cart.itemCount || (cart.items?.reduce((total, item) => total + item.quantity, 0) || 0);

  if (showSuccess) {
    return (
      <div className="checkout-container">
        <div className="checkout-wrapper">
          <div className="success-card">
            <div className="success-icon">
              <CheckCircle size={64} />
            </div>
            <h2 className="success-title">
              {orderDetails?.totalOrders > 1 
                ? `${orderDetails.totalOrders} Orders Placed Successfully!`
                : 'Order Placed Successfully!'
              }
            </h2>
            <p className="success-message">
              {orderDetails?.totalOrders > 1 
                ? `Your orders have been confirmed and are being processed. Order numbers: ${orderDetails?.orderNumbers?.join(', ')}`
                : `Your order #${orderDetails?.orderNumber || orderDetails?.orderNumbers?.[0]} has been confirmed and is being processed.`
              }
            </p>
            <p className="success-redirect">
              Redirecting to order confirmation...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-container">
      <div className="checkout-wrapper">
        {/* Header */}
        <div className="checkout-header">
          <button 
            onClick={() => navigate('/cart')} 
            className="back-button"
          >
            <ArrowLeft size={20} />
            Back to Cart
          </button>
          <h1 className="checkout-title">Checkout</h1>
          <div className="checkout-steps">
            <span className="step active">1. Review</span>
            <span className="step-separator">→</span>
            <span className="step active">2. Payment</span>
            <span className="step-separator">→</span>
            <span className="step">3. Confirmation</span>
          </div>
        </div>

        <div className="checkout-content">
          {/* Left Column - Order Details */}
          <div className="checkout-main">
            {/* Delivery Address */}
            <div className="checkout-section">
              <div className="section-header">
                <MapPin className="section-icon" />
                <h3>Delivery Address</h3>
              </div>
              
              {cart.deliveryAddress && (
                <div className="address-card">
                  <div className="address-content">
                    <div className="address-header">
                      <span className="address-label">{cart.deliveryAddress.label}</span>
                      <span className="address-name">{cart.deliveryAddress.name}</span>
                    </div>
                    <div className="address-details">
                      <p>{cart.deliveryAddress.addressLine1}</p>
                      {cart.deliveryAddress.addressLine2 && <p>{cart.deliveryAddress.addressLine2}</p>}
                      <p>{cart.deliveryAddress.city}, {cart.deliveryAddress.district}</p>
                      <p>{cart.deliveryAddress.state} {cart.deliveryAddress.zip}</p>
                    </div>
                    <div className="address-contact">
                      <Phone size={16} />
                      {cart.deliveryAddress.phone}
                    </div>
                  </div>
                  <button 
                    onClick={() => navigate('/cart')}
                    className="change-address-link"
                  >
                    Change
                  </button>
                </div>
              )}
            </div>

            {/* Delivery Method Summary */}
            <div className="checkout-section">
              <div className="section-header">
                <Truck className="section-icon" />
                <h3>Delivery Method</h3>
              </div>
              
              {cart.deliveryMethod ? (
                <div className="selected-delivery-method">
                  <div className="delivery-method-info">
                    <h4>{cart.deliveryMethod}</h4>
                    <p className="delivery-fee">
                      Fee: {cart.deliveryFee === 0 ? 'Free' : `৳${cart.deliveryFee}`}
                    </p>
                  </div>
                  <button 
                    onClick={() => navigate('/cart')}
                    className="change-delivery-link"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div className="no-delivery-method">
                  <p>No delivery method selected</p>
                  <button 
                    onClick={() => navigate('/cart')}
                    className="select-delivery-btn"
                  >
                    Select Delivery Method
                  </button>
                </div>
              )}
            </div>

            {/* Order Items */}
            <div className="checkout-section">
              <div className="section-header">
                <Package className="section-icon" />
                <h3>Order Items ({itemCount} items)</h3>
              </div>
              
              <div className="order-items">
                {cart.items?.map((item) => (
                  <div key={item._id || item.id} className="order-item">
                    <div className="item-image">
                      <img 
                        src={item.images?.[0] || "/placeholder-product.jpg"} 
                        alt={item.name || item.title} 
                      />
                    </div>
                    <div className="item-details">
                      <h4 className="item-name">{item.name || item.title}</h4>
                      <p className="item-price">৳{(item.offerPrice || item.unitPrice || item.price || 0).toFixed(2)} per unit</p>
                      <p className="item-quantity">Quantity: {item.quantity} {item.unitType || "pcs"}</p>
                    </div>
                    <div className="item-total">
                      ৳{((item.offerPrice || item.unitPrice || item.price || 0) * item.quantity).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Method */}
            <div className="checkout-section">
              <div className="section-header">
                <CreditCard className="section-icon" />
                <h3>Payment Method</h3>
              </div>
              
              <div className="payment-methods">
                <div 
                  className={`payment-option ${checkoutData.paymentMethod === 'cod' ? 'selected' : ''}`}
                  onClick={() => handlePaymentMethodChange('cod')}
                >
                  <input 
                    type="radio" 
                    name="paymentMethod" 
                    value="cod" 
                    checked={checkoutData.paymentMethod === 'cod'}
                    onChange={() => {}}
                  />
                  <div className="payment-info">
                    <h4>Cash on Delivery</h4>
                    <p>Pay when you receive your order</p>
                  </div>
                </div>
                
                <div 
                  className={`payment-option ${checkoutData.paymentMethod === 'mobile-banking' ? 'selected' : ''}`}
                  onClick={() => handlePaymentMethodChange('mobile-banking')}
                >
                  <input 
                    type="radio" 
                    name="paymentMethod" 
                    value="mobile-banking" 
                    checked={checkoutData.paymentMethod === 'mobile-banking'}
                    onChange={() => {}}
                  />
                  <div className="payment-info">
                    <h4>Mobile Banking</h4>
                    <p>bKash, Nagad, Rocket</p>
                  </div>
                </div>
                
                <div 
                  className={`payment-option ${checkoutData.paymentMethod === 'card' ? 'selected' : ''}`}
                  onClick={() => handlePaymentMethodChange('card')}
                >
                  <input 
                    type="radio" 
                    name="paymentMethod" 
                    value="card" 
                    checked={checkoutData.paymentMethod === 'card'}
                    onChange={() => {}}
                  />
                  <div className="payment-info">
                    <h4>Credit/Debit Card</h4>
                    <p>Visa, Mastercard, etc.</p>
                  </div>
                </div>
                
                <div 
                  className={`payment-option ${checkoutData.paymentMethod === 'bank-transfer' ? 'selected' : ''}`}
                  onClick={() => handlePaymentMethodChange('bank-transfer')}
                >
                  <input 
                    type="radio" 
                    name="paymentMethod" 
                    value="bank-transfer" 
                    checked={checkoutData.paymentMethod === 'bank-transfer'}
                    onChange={() => {}}
                  />
                  <div className="payment-info">
                    <h4>Bank Transfer</h4>
                    <p>Direct bank transfer</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Notes */}
            <div className="checkout-section">
              <div className="section-header">
                <MessageSquare className="section-icon" />
                <h3>Additional Information</h3>
              </div>
              
              <div className="notes-section">
                <div className="form-group">
                  <label htmlFor="notes">Order Notes (Optional)</label>
                  <textarea
                    id="notes"
                    name="notes"
                    value={checkoutData.notes}
                    onChange={handleInputChange}
                    placeholder="Any special instructions for your order..."
                    rows={3}
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="specialInstructions">Delivery Instructions (Optional)</label>
                  <textarea
                    id="specialInstructions"
                    name="specialInstructions"
                    value={checkoutData.specialInstructions}
                    onChange={handleInputChange}
                    placeholder="Special delivery instructions..."
                    rows={3}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Order Summary */}
          <div className="checkout-sidebar">
            <div className="order-summary">
              <h3 className="summary-title">Order Summary</h3>
              
              <div className="summary-details">
                <div className="summary-row">
                  <span>Subtotal ({itemCount} items)</span>
                  <span>৳{cartTotal.toFixed(2)}</span>
                </div>
                
                <div className="summary-row">
                  <span>Delivery Fee</span>
                  <span className={deliveryFee === 0 ? 'free-delivery' : ''}>
                    {deliveryFee === 0 ? 'Free' : `৳${deliveryFee.toFixed(2)}`}
                  </span>
                </div>
                
                <div className="summary-row">
                  <span>Tax</span>
                  <span>৳0.00</span>
                </div>
                
                <div className="summary-divider"></div>
                
                <div className="summary-row total-row">
                  <span>Total</span>
                  <span>৳{finalTotal.toFixed(2)}</span>
                </div>
              </div>

              <div className="delivery-info">
                {cart.deliveryMethod && (
                  <>
                    <div className="delivery-item">
                      <Truck className="delivery-icon" />
                      <div>
                        <h5>{cart.deliveryMethod}</h5>
                        <p>Selected delivery method</p>
                      </div>
                    </div>
                    
                    <div className="delivery-item">
                      <Clock className="delivery-icon" />
                      <div>
                        <h5>Estimated Delivery</h5>
                        <p>3-5 days</p>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {checkoutError && (
                <div className="error-message">
                  <AlertCircle size={16} />
                  {checkoutError}
                </div>
              )}

              <button 
                onClick={handleCheckout}
                disabled={isProcessing || loading || !cart.deliveryAddress}
                className="place-order-btn"
              >
                {isProcessing ? (
                  <>
                    <div className="spinner"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="btn-icon" />
                    Place Order
                  </>
                )}
              </button>

              <div className="security-note">
                <div className="security-icon">🔒</div>
                <p>Your payment information is secure and encrypted</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
