import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  CheckCircle, 
  Package, 
  MapPin, 
  Truck, 
  Clock, 
  Phone,
  User,
  CreditCard,
  ArrowLeft,
  Copy,
  Download
} from 'lucide-react';
import { useClientAuth } from '../../contexts/ClientAuthContext';
import { useVendorAuth } from '../../contexts/VendorAuthContext';
import './OrderConfirmation.css';

const OrderConfirmation = () => {
  const { orderNumber } = useParams();
  const navigate = useNavigate();
  const clientAuth = useClientAuth();
  const vendorAuth = useVendorAuth();
  
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const getCurrentUser = () => {
    if (vendorAuth.user) return vendorAuth.user;
    if (clientAuth.user) return clientAuth.user;
    
    // Fallback to storage
    const clientUser = JSON.parse(localStorage.getItem('clientUser') || 'null');
    if (clientUser) return clientUser;
    
    const vendorUser = JSON.parse(sessionStorage.getItem('vendorUser') || 'null');
    if (vendorUser) return vendorUser;
    
    return null;
  };

  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderNumber) {
        setError('Order number not provided');
        setLoading(false);
        return;
      }

      const currentUser = getCurrentUser();
      if (!currentUser?.uid) {
        setError('Please login to view order details');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`http://localhost:5005/api/cart/orders/${orderNumber}`);
        
        if (response.ok) {
          const orderData = await response.json();
          setOrder(orderData);
        } else if (response.status === 404) {
          setError('Order not found');
        } else {
          setError('Failed to load order details');
        }
      } catch (error) {
        console.error('Failed to fetch order:', error);
        setError('Failed to load order details');
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderNumber]);

  const copyOrderNumber = () => {
    navigator.clipboard.writeText(orderNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: '#f59e0b',
      confirmed: '#3b82f6',
      processing: '#8b5cf6',
      shipped: '#06b6d4',
      delivered: '#10b981',
      cancelled: '#ef4444'
    };
    return colors[status] || '#6b7280';
  };

  const getPaymentMethodName = (method) => {
    const methods = {
      'cod': 'Cash on Delivery',
      'card': 'Credit/Debit Card',
      'mobile-banking': 'Mobile Banking',
      'bank-transfer': 'Bank Transfer'
    };
    return methods[method] || method;
  };

  if (loading) {
    return (
      <div className="order-confirmation-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading order details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="order-confirmation-container">
        <div className="error-state">
          <div className="error-icon">⚠️</div>
          <h2>Unable to Load Order</h2>
          <p>{error}</p>
          <div className="error-actions">
            <Link to="/cart" className="btn-secondary">
              <ArrowLeft size={18} />
              Back to Cart
            </Link>
            <Link to="/" className="btn-primary">
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="order-confirmation-container">
        <div className="error-state">
          <div className="error-icon">📦</div>
          <h2>Order Not Found</h2>
          <p>The order you're looking for doesn't exist or you don't have permission to view it.</p>
          <div className="error-actions">
            <Link to="/" className="btn-primary">
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="order-confirmation-container">
      <div className="order-confirmation-wrapper">
        {/* Header */}
        <div className="confirmation-header">
          <div className="success-animation">
            <CheckCircle className="success-icon" />
          </div>
          <h1 className="confirmation-title">Order Confirmed!</h1>
          <p className="confirmation-subtitle">
            Thank you for your order. We'll send you updates as your order progresses.
          </p>
        </div>

        {/* Order Details */}
        <div className="order-details-grid">
          {/* Order Summary */}
          <div className="order-summary-card">
            <div className="card-header">
              <Package className="card-icon" />
              <h3>Order Summary</h3>
            </div>
            
            <div className="order-info">
              <div className="order-number">
                <span className="label">Order Number:</span>
                <div className="number-copy">
                  <span className="number">{order.orderNumber}</span>
                  <button onClick={copyOrderNumber} className="copy-btn" title="Copy order number">
                    <Copy size={16} />
                    {copied && <span className="copied-tooltip">Copied!</span>}
                  </button>
                </div>
              </div>
              
              <div className="order-status">
                <span className="label">Status:</span>
                <span 
                  className="status-badge" 
                  style={{ backgroundColor: getStatusColor(order.status) }}
                >
                  {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                </span>
              </div>
              
              <div className="order-date">
                <span className="label">Order Date:</span>
                <span>{formatDate(order.checkedOutAt || order.createdAt)}</span>
              </div>
              
              <div className="payment-method">
                <span className="label">Payment Method:</span>
                <span>{getPaymentMethodName(order.paymentMethod)}</span>
              </div>
            </div>

            <div className="order-items">
              <h4>Items Ordered</h4>
              {order.items.map((item) => (
                <div key={item._id} className="order-item">
                  <div className="item-image">
                    <img 
                      src={item.images?.[0] || "/placeholder-product.jpg"} 
                      alt={item.name}
                    />
                  </div>
                  <div className="item-details">
                    <h5>{item.name}</h5>
                    <p>Quantity: {item.quantity} {item.unitType}</p>
                    <p>Price: ৳{(item.offerPrice || item.unitPrice || item.price).toFixed(2)} each</p>
                  </div>
                  <div className="item-total">
                    ৳{((item.offerPrice || item.unitPrice || item.price) * item.quantity).toFixed(2)}
                  </div>
                </div>
              ))}
              
              <div className="order-total">
                <div className="total-row">
                  <span>Subtotal:</span>
                  <span>৳{order.subtotal.toFixed(2)}</span>
                </div>
                <div className="total-row">
                  <span>Delivery:</span>
                  <span className="free">Free</span>
                </div>
                <div className="total-row final-total">
                  <span>Total:</span>
                  <span>৳{order.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Delivery Information */}
          <div className="delivery-info-card">
            <div className="card-header">
              <Truck className="card-icon" />
              <h3>Delivery Information</h3>
            </div>
            
            {order.deliveryAddress && (
              <div className="delivery-address">
                <div className="address-header">
                  <MapPin className="address-icon" />
                  <h4>Delivery Address</h4>
                </div>
                
                <div className="address-details">
                  <div className="address-label">{order.deliveryAddress.label}</div>
                  <div className="address-name">{order.deliveryAddress.name}</div>
                  <div className="address-lines">
                    <p>{order.deliveryAddress.addressLine1}</p>
                    {order.deliveryAddress.addressLine2 && <p>{order.deliveryAddress.addressLine2}</p>}
                    <p>{order.deliveryAddress.city}, {order.deliveryAddress.district}</p>
                    <p>{order.deliveryAddress.state} {order.deliveryAddress.zip}</p>
                  </div>
                  <div className="address-contact">
                    <Phone size={16} />
                    {order.deliveryAddress.phone}
                  </div>
                </div>
              </div>
            )}

            <div className="delivery-timeline">
              <div className="timeline-item active">
                <div className="timeline-dot"></div>
                <div className="timeline-content">
                  <h5>Order Confirmed</h5>
                  <p>{formatDate(order.checkedOutAt || order.createdAt)}</p>
                </div>
              </div>
              
              <div className="timeline-item">
                <div className="timeline-dot"></div>
                <div className="timeline-content">
                  <h5>Processing</h5>
                  <p>We'll update you when processing begins</p>
                </div>
              </div>
              
              <div className="timeline-item">
                <div className="timeline-dot"></div>
                <div className="timeline-content">
                  <h5>Shipped</h5>
                  <p>We'll provide tracking information</p>
                </div>
              </div>
              
              <div className="timeline-item">
                <div className="timeline-dot"></div>
                <div className="timeline-content">
                  <h5>Delivered</h5>
                  <p>Estimated 3-5 business days</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Information */}
        {(order.notes || order.specialInstructions) && (
          <div className="additional-info-card">
            <h3>Additional Information</h3>
            {order.notes && (
              <div className="info-section">
                <h4>Order Notes:</h4>
                <p>{order.notes}</p>
              </div>
            )}
            {order.specialInstructions && (
              <div className="info-section">
                <h4>Delivery Instructions:</h4>
                <p>{order.specialInstructions}</p>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="action-buttons">
          <Link to="/" className="btn-secondary">
            <ArrowLeft size={18} />
            Continue Shopping
          </Link>
          <button onClick={() => window.print()} className="btn-outline">
            <Download size={18} />
            Print Order
          </button>
          <Link to="/user/orders" className="btn-primary">
            View All Orders
          </Link>
        </div>
      </div>
    </div>
  );
};

export default OrderConfirmation;
