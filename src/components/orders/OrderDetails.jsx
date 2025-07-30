import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft,
  Package, 
  Clock, 
  CheckCircle, 
  Truck, 
  XCircle, 
  CreditCard,
  MapPin,
  Calendar,
  DollarSign,
  Download,
  RefreshCw,
  AlertCircle,
  User,
  Phone,
  Mail,
  Banknote,
  Smartphone,
  Building
} from 'lucide-react';
import { useClientAuth } from '../../contexts/ClientAuthContext';
import { useVendorAuth } from '../../contexts/VendorAuthContext';
import './OrderDetails.css';

const OrderDetails = () => {
  const { orderNumber } = useParams();
  const navigate = useNavigate();
  const clientAuth = useClientAuth();
  const vendorAuth = useVendorAuth();
  
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Get current user info
  const getCurrentUser = () => {
    if (vendorAuth.user) {
      return { user: vendorAuth.user, role: 'vendor', token: sessionStorage.getItem('vendorToken') };
    } else if (clientAuth.user) {
      return { user: clientAuth.user, role: 'client', token: localStorage.getItem('clientToken') };
    } else {
      // Fallback to storage
      const clientUser = JSON.parse(localStorage.getItem('clientUser') || 'null');
      if (clientUser) {
        return { user: clientUser, role: 'client', token: localStorage.getItem('clientToken') };
      } else {
        const vendorUser = JSON.parse(sessionStorage.getItem('vendorUser') || 'null');
        if (vendorUser) {
          return { user: vendorUser, role: 'vendor', token: sessionStorage.getItem('vendorToken') };
        }
      }
    }
    return null;
  };

  // Fetch order details
  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      setError('');

      const currentUser = getCurrentUser();
      if (!currentUser || !currentUser.token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`http://localhost:5005/api/orders/${orderNumber}`, {
        headers: {
          'Authorization': `Bearer ${currentUser.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Order not found');
        }
        throw new Error('Failed to fetch order details');
      }

      const data = await response.json();
      setOrder(data.order);
    } catch (err) {
      console.error('Failed to fetch order details:', err);
      setError(err.message || 'Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orderNumber) {
      fetchOrderDetails();
    }
  }, [orderNumber]);

  // Cancel order
  const cancelOrder = async (reason = 'Cancelled by user') => {
    try {
      const currentUser = getCurrentUser();
      if (!currentUser || !currentUser.token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`http://localhost:5005/api/orders/${orderNumber}/cancel`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${currentUser.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason })
      });

      if (!response.ok) {
        throw new Error('Failed to cancel order');
      }

      // Refresh order details
      fetchOrderDetails();
    } catch (err) {
      console.error('Failed to cancel order:', err);
      setError(err.message || 'Failed to cancel order');
    }
  };

  // Get status icon and color
  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return { icon: <Clock size={20} />, color: 'orange' };
      case 'confirmed': return { icon: <CheckCircle size={20} />, color: 'blue' };
      case 'processing': return { icon: <Package size={20} />, color: 'purple' };
      case 'shipped': return { icon: <Truck size={20} />, color: 'indigo' };
      case 'delivered': return { icon: <CheckCircle size={20} />, color: 'green' };
      case 'cancelled': return { icon: <XCircle size={20} />, color: 'red' };
      case 'refunded': return { icon: <RefreshCw size={20} />, color: 'gray' };
      default: return { icon: <Clock size={20} />, color: 'gray' };
    }
  };

  // Get payment status icon and color
  const getPaymentStatusIcon = (paymentStatus, paymentMethod) => {
    const methodIcons = {
      'cod': <Banknote size={16} />,
      'card': <CreditCard size={16} />,
      'mobile-banking': <Smartphone size={16} />,
      'bank-transfer': <Building size={16} />
    };

    const statusColors = {
      'pending': 'orange',
      'paid': 'green',
      'failed': 'red',
      'refunded': 'gray'
    };

    return {
      icon: methodIcons[paymentMethod] || <CreditCard size={16} />,
      color: statusColors[paymentStatus] || 'gray'
    };
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

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const currentUser = getCurrentUser();

  if (!currentUser) {
    return (
      <div className="order-details-container">
        <div className="auth-required">
          <AlertCircle size={48} />
          <h3>Authentication Required</h3>
          <p>Please log in to view order details.</p>
          <button onClick={() => navigate('/login')} className="btn btn-primary">
            Log In
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="order-details-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading order details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="order-details-container">
        <div className="error-state">
          <AlertCircle size={48} />
          <h3>Error Loading Order</h3>
          <p className="error-message">{error}</p>
          <div className="error-actions">
            <button onClick={fetchOrderDetails} className="btn btn-primary">
              Try Again
            </button>
            <button onClick={() => navigate('/orders')} className="btn btn-outline">
              Back to Orders
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="order-details-container">
        <div className="empty-state">
          <Package size={48} />
          <h3>Order Not Found</h3>
          <p>The order you're looking for doesn't exist or you don't have permission to view it.</p>
          <button onClick={() => navigate('/orders')} className="btn btn-primary">
            Back to Orders
          </button>
        </div>
      </div>
    );
  }

  const statusInfo = getStatusIcon(order.status);
  const paymentInfo = getPaymentStatusIcon(order.paymentStatus, order.paymentMethod);

  return (
    <div className="order-details-container">
      {/* Header */}
      <div className="order-details-header">
        <button onClick={() => navigate('/orders')} className="back-button">
          <ArrowLeft size={20} />
          Back to Orders
        </button>
        <div className="order-title">
          <h1>Order #{order.orderNumber}</h1>
          <div className="order-badges">
            <div className={`status-badge large ${statusInfo.color}`}>
              {statusInfo.icon}
              <span>{order.status.charAt(0).toUpperCase() + order.status.slice(1)}</span>
            </div>
            <div className={`payment-badge large ${paymentInfo.color}`}>
              {paymentInfo.icon}
              <span>{order.paymentStatus.charAt(0).toUpperCase() + order.paymentStatus.slice(1)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="order-details-content">
        {/* Order Summary */}
        <div className="order-summary-card">
          <h2>Order Summary</h2>
          <div className="summary-grid">
            <div className="summary-item">
              <Calendar size={16} />
              <span className="label">Order Date:</span>
              <span className="value">{formatDate(order.orderedAt)}</span>
            </div>
            <div className="summary-item">
              <Package size={16} />
              <span className="label">Items:</span>
              <span className="value">{order.itemCount} items</span>
            </div>
            <div className="summary-item">
              <Truck size={16} />
              <span className="label">Delivery Method:</span>
              <span className="value">{order.deliveryMethod}</span>
            </div>
            <div className="summary-item">
              {paymentInfo.icon}
              <span className="label">Payment Method:</span>
              <span className="value">{order.paymentMethod.toUpperCase()}</span>
            </div>
            {order.estimatedDelivery && (
              <div className="summary-item">
                <Clock size={16} />
                <span className="label">Estimated Delivery:</span>
                <span className="value">{formatDate(order.estimatedDelivery)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Order Items */}
        <div className="order-items-card">
          <h2>Items Ordered</h2>
          <div className="items-list">
            {order.items.map((item, index) => (
              <div key={index} className="item-row">
                <div className="item-info">
                  {item.images && item.images[0] && (
                    <img 
                      src={item.images[0]} 
                      alt={item.name}
                      className="item-image"
                    />
                  )}
                  <div className="item-details">
                    <h4>{item.name}</h4>
                    <p className="item-meta">
                      {item.category && <span>Category: {item.category}</span>}
                      {item.unitType && <span>Unit: {item.unitType}</span>}
                    </p>
                  </div>
                </div>
                <div className="item-pricing">
                  <div className="quantity">Qty: {item.quantity}</div>
                  <div className="unit-price">{formatCurrency(item.price || item.unitPrice)} each</div>
                  <div className="total-price">{formatCurrency((item.price || item.unitPrice) * item.quantity)}</div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Price Breakdown */}
          <div className="price-breakdown">
            <div className="breakdown-row">
              <span>Subtotal:</span>
              <span>{formatCurrency(order.subtotal)}</span>
            </div>
            {order.tax > 0 && (
              <div className="breakdown-row">
                <span>Tax:</span>
                <span>{formatCurrency(order.tax)}</span>
              </div>
            )}
            <div className="breakdown-row">
              <span>Delivery Fee:</span>
              <span>{formatCurrency(order.deliveryFee)}</span>
            </div>
            {order.discount > 0 && (
              <div className="breakdown-row discount">
                <span>Discount:</span>
                <span>-{formatCurrency(order.discount)}</span>
              </div>
            )}
            <div className="breakdown-row total">
              <span>Total:</span>
              <span>{formatCurrency(order.total)}</span>
            </div>
          </div>
        </div>

        {/* Delivery Information */}
        {order.deliveryAddress && (
          <div className="delivery-card">
            <h2>Delivery Information</h2>
            <div className="delivery-content">
              <div className="address-section">
                <h3>Delivery Address</h3>
                <div className="address-details">
                  <div className="address-line">
                    <User size={16} />
                    <span>{order.deliveryAddress.name}</span>
                  </div>
                  <div className="address-line">
                    <Phone size={16} />
                    <span>{order.deliveryAddress.phone}</span>
                  </div>
                  {order.deliveryAddress.email && (
                    <div className="address-line">
                      <Mail size={16} />
                      <span>{order.deliveryAddress.email}</span>
                    </div>
                  )}
                  <div className="address-line">
                    <MapPin size={16} />
                    <span>
                      {order.deliveryAddress.addressLine1}
                      {order.deliveryAddress.addressLine2 && `, ${order.deliveryAddress.addressLine2}`}
                      <br />
                      {order.deliveryAddress.city}, {order.deliveryAddress.district}
                      <br />
                      {order.deliveryAddress.state} {order.deliveryAddress.zip}
                    </span>
                  </div>
                </div>
              </div>
              
              {order.deliveryNotes && (
                <div className="delivery-notes">
                  <h3>Delivery Notes</h3>
                  <p>{order.deliveryNotes}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Order Notes */}
        {(order.notes || order.specialInstructions) && (
          <div className="notes-card">
            <h2>Additional Information</h2>
            {order.notes && (
              <div className="note-section">
                <h3>Order Notes</h3>
                <p>{order.notes}</p>
              </div>
            )}
            {order.specialInstructions && (
              <div className="note-section">
                <h3>Special Instructions</h3>
                <p>{order.specialInstructions}</p>
              </div>
            )}
          </div>
        )}

        {/* Order Status History */}
        {order.statusHistory && order.statusHistory.length > 0 && (
          <div className="status-history-card">
            <h2>Order History</h2>
            <div className="status-timeline">
              {order.statusHistory.map((status, index) => (
                <div key={index} className="timeline-item">
                  <div className="timeline-dot"></div>
                  <div className="timeline-content">
                    <div className="status-info">
                      <span className="status-name">
                        {status.status.charAt(0).toUpperCase() + status.status.slice(1)}
                      </span>
                      <span className="status-date">
                        {formatDate(status.timestamp)}
                      </span>
                    </div>
                    {status.note && (
                      <p className="status-note">{status.note}</p>
                    )}
                    {status.updatedBy && (
                      <span className="updated-by">Updated by: {status.updatedBy}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="order-actions">
          {order.status === 'delivered' && (
            <button className="btn btn-primary">
              <Download size={16} />
              Download Invoice
            </button>
          )}

          {['pending', 'confirmed'].includes(order.status) && (
            <button 
              onClick={() => {
                if (window.confirm('Are you sure you want to cancel this order?')) {
                  cancelOrder();
                }
              }}
              className="btn btn-danger"
            >
              <XCircle size={16} />
              Cancel Order
            </button>
          )}

          {order.status === 'shipped' && (
            <button 
              onClick={() => navigate(`/orders/${order.orderNumber}/tracking`)}
              className="btn btn-primary"
            >
              <Truck size={16} />
              Track Order
            </button>
          )}

          <button onClick={fetchOrderDetails} className="btn btn-outline">
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderDetails;
