import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Package, 
  Clock, 
  CheckCircle, 
  Truck, 
  XCircle, 
  CreditCard,
  MapPin,
  Calendar,
  DollarSign,
  Filter,
  Search,
  Eye,
  Download,
  RefreshCw,
  AlertCircle,
  Banknote,
  Smartphone,
  Building
} from 'lucide-react';
import { useClientAuth } from '../../contexts/ClientAuthContext';
import { useVendorAuth } from '../../contexts/VendorAuthContext';
import './MyOrders.css';

const MyOrders = () => {
  const navigate = useNavigate();
  const clientAuth = useClientAuth();
  const vendorAuth = useVendorAuth();
  
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    status: 'all',
    paymentStatus: 'all',
    search: ''
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalOrders: 0
  });

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

  // Fetch orders from backend
  const fetchOrders = async (page = 1, status = 'all', paymentStatus = 'all', search = '') => {
    try {
      setLoading(true);
      setError('');

      const currentUser = getCurrentUser();
      if (!currentUser || !currentUser.token) {
        throw new Error('Authentication required');
      }

      let url = `http://localhost:5005/api/orders?page=${page}&limit=10`;
      if (status !== 'all') {
        url += `&status=${status}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${currentUser.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }

      const data = await response.json();
      
      // Filter by payment status on frontend if needed
      let filteredOrders = data.orders || [];
      if (paymentStatus !== 'all') {
        filteredOrders = filteredOrders.filter(order => order.paymentStatus === paymentStatus);
      }

      // Filter by search term
      if (search.trim()) {
        filteredOrders = filteredOrders.filter(order => 
          order.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
          order.items.some(item => item.name.toLowerCase().includes(search.toLowerCase()))
        );
      }

      setOrders(filteredOrders);
      setPagination(data.pagination || {
        currentPage: 1,
        totalPages: 1,
        totalOrders: filteredOrders.length
      });
    } catch (err) {
      console.error('Failed to fetch orders:', err);
      setError(err.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  // Load orders on component mount and when filters change
  useEffect(() => {
    const currentUser = getCurrentUser();
    if (currentUser) {
      fetchOrders(1, filters.status, filters.paymentStatus, filters.search);
    }
  }, [filters.status, filters.paymentStatus, filters.search]);

  // Cancel order
  const cancelOrder = async (orderNumber, reason = 'Cancelled by user') => {
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

      // Refresh orders
      fetchOrders(pagination.currentPage, filters.status, filters.paymentStatus, filters.search);
    } catch (err) {
      console.error('Failed to cancel order:', err);
      setError(err.message || 'Failed to cancel order');
    }
  };

  // Get status icon and color
  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return { icon: <Clock size={16} />, color: 'orange' };
      case 'confirmed': return { icon: <CheckCircle size={16} />, color: 'blue' };
      case 'processing': return { icon: <Package size={16} />, color: 'purple' };
      case 'shipped': return { icon: <Truck size={16} />, color: 'indigo' };
      case 'delivered': return { icon: <CheckCircle size={16} />, color: 'green' };
      case 'cancelled': return { icon: <XCircle size={16} />, color: 'red' };
      case 'refunded': return { icon: <RefreshCw size={16} />, color: 'gray' };
      default: return { icon: <Clock size={16} />, color: 'gray' };
    }
  };

  // Get payment status icon and color
  const getPaymentStatusIcon = (paymentStatus, paymentMethod) => {
    const methodIcons = {
      'cod': <Banknote size={14} />,
      'card': <CreditCard size={14} />,
      'mobile-banking': <Smartphone size={14} />,
      'bank-transfer': <Building size={14} />
    };

    const statusColors = {
      'pending': 'orange',
      'paid': 'green',
      'failed': 'red',
      'refunded': 'gray'
    };

    return {
      icon: methodIcons[paymentMethod] || <CreditCard size={14} />,
      color: statusColors[paymentStatus] || 'gray'
    };
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
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
      <div className="my-orders-container">
        <div className="auth-required">
          <AlertCircle size={48} />
          <h3>Authentication Required</h3>
          <p>Please log in to view your orders.</p>
          <button onClick={() => navigate('/login')} className="btn btn-primary">
            Log In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="my-orders-container">
      <div className="my-orders-header">
        <h1>My Orders</h1>
        <p>Track and manage your order history</p>
      </div>

      {/* Filters */}
      <div className="orders-filters">
        <div className="filter-group">
          <Filter size={16} />
          <select 
            value={filters.status} 
            onChange={(e) => setFilters({...filters, status: e.target.value})}
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
            <option value="refunded">Refunded</option>
          </select>
        </div>

        <div className="filter-group">
          <CreditCard size={16} />
          <select 
            value={filters.paymentStatus} 
            onChange={(e) => setFilters({...filters, paymentStatus: e.target.value})}
          >
            <option value="all">All Payments</option>
            <option value="pending">Payment Pending</option>
            <option value="paid">Paid</option>
            <option value="failed">Payment Failed</option>
            <option value="refunded">Refunded</option>
          </select>
        </div>
        
        <div className="search-group">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search orders..."
            value={filters.search}
            onChange={(e) => setFilters({...filters, search: e.target.value})}
          />
        </div>

        <button 
          onClick={() => fetchOrders(pagination.currentPage, filters.status, filters.paymentStatus, filters.search)}
          className="btn btn-icon"
          title="Refresh"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading your orders...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="error-state">
          <AlertCircle size={24} />
          <p className="error-message">{error}</p>
          <button onClick={() => fetchOrders(1, filters.status, filters.paymentStatus, filters.search)}>
            Try Again
          </button>
        </div>
      )}

      {/* Orders List */}
      {!loading && !error && (
        <>
          {orders.length === 0 ? (
            <div className="empty-state">
              <Package size={48} />
              <h3>No orders found</h3>
              <p>You haven't placed any orders yet or no orders match your filters.</p>
              <button onClick={() => navigate('/')} className="btn btn-primary">
                Start Shopping
              </button>
            </div>
          ) : (
            <div className="orders-list">
              {orders.map((order) => {
                const statusInfo = getStatusIcon(order.status);
                const paymentInfo = getPaymentStatusIcon(order.paymentStatus, order.paymentMethod);
                
                return (
                  <div key={order._id} className="order-card">
                    <div className="order-header">
                      <div className="order-info">
                        <h3>#{order.orderNumber}</h3>
                        <div className="order-badges">
                          <div className={`status-badge ${statusInfo.color}`}>
                            {statusInfo.icon}
                            <span>{order.status.charAt(0).toUpperCase() + order.status.slice(1)}</span>
                          </div>
                          <div className={`payment-badge ${paymentInfo.color}`}>
                            {paymentInfo.icon}
                            <span>{order.paymentStatus.charAt(0).toUpperCase() + order.paymentStatus.slice(1)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="order-amount">
                        <DollarSign size={16} />
                        {formatCurrency(order.total)}
                      </div>
                    </div>

                    <div className="order-meta">
                      <div className="meta-item">
                        <Calendar size={14} />
                        <span>Ordered: {formatDate(order.orderedAt)}</span>
                      </div>
                      <div className="meta-item">
                        <Package size={14} />
                        <span>{order.itemCount} items</span>
                      </div>
                      <div className="meta-item">
                        <Truck size={14} />
                        <span>{order.deliveryMethod}</span>
                      </div>
                      <div className="meta-item">
                        <span className="payment-method">
                          {paymentInfo.icon}
                          {order.paymentMethod.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    <div className="order-items">
                      <h4>Items Ordered</h4>
                      <div className="items-grid">
                        {order.items.slice(0, 3).map((item, index) => (
                          <div key={index} className="item-card">
                            {item.images && item.images[0] && (
                              <img 
                                src={item.images[0]} 
                                alt={item.name}
                                className="item-image"
                              />
                            )}
                            <div className="item-details">
                              <span className="item-name">{item.name}</span>
                              <span className="item-quantity">Qty: {item.quantity}</span>
                              <span className="item-price">
                                {formatCurrency((item.price || item.unitPrice) * item.quantity)}
                              </span>
                            </div>
                          </div>
                        ))}
                        {order.items.length > 3 && (
                          <div className="more-items">
                            +{order.items.length - 3} more items
                          </div>
                        )}
                      </div>
                    </div>

                    {order.deliveryAddress && (
                      <div className="delivery-info">
                        <h4>Delivery Address</h4>
                        <div className="address-details">
                          <MapPin size={14} />
                          <span>
                            {order.deliveryAddress.name} - {order.deliveryAddress.phone}
                            <br />
                            {order.deliveryAddress.addressLine1}, {order.deliveryAddress.city}
                            <br />
                            {order.deliveryAddress.state} {order.deliveryAddress.zip}
                          </span>
                        </div>
                      </div>
                    )}

                    {(order.notes || order.specialInstructions) && (
                      <div className="order-notes">
                        {order.notes && (
                          <div>
                            <strong>Notes:</strong> {order.notes}
                          </div>
                        )}
                        {order.specialInstructions && (
                          <div>
                            <strong>Special Instructions:</strong> {order.specialInstructions}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="order-actions">
                      <button 
                        onClick={() => navigate(`/orders/${order.orderNumber}`)}
                        className="btn btn-outline"
                      >
                        <Eye size={14} />
                        View Details
                      </button>
                      
                      {order.status === 'delivered' && (
                        <button className="btn btn-outline">
                          <Download size={14} />
                          Download Invoice
                        </button>
                      )}

                      {['pending', 'confirmed'].includes(order.status) && (
                        <button 
                          onClick={() => {
                            if (window.confirm('Are you sure you want to cancel this order?')) {
                              cancelOrder(order.orderNumber);
                            }
                          }}
                          className="btn btn-danger"
                        >
                          <XCircle size={14} />
                          Cancel Order
                        </button>
                      )}

                      {order.status === 'shipped' && (
                        <button 
                          onClick={() => navigate(`/orders/${order.orderNumber}/tracking`)}
                          className="btn btn-primary"
                        >
                          <Truck size={14} />
                          Track Order
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="pagination">
              <button 
                onClick={() => fetchOrders(pagination.currentPage - 1, filters.status, filters.paymentStatus, filters.search)}
                disabled={pagination.currentPage === 1}
                className="btn btn-outline"
              >
                Previous
              </button>
              <span className="page-info">
                Page {pagination.currentPage} of {pagination.totalPages}
              </span>
              <button 
                onClick={() => fetchOrders(pagination.currentPage + 1, filters.status, filters.paymentStatus, filters.search)}
                disabled={pagination.currentPage === pagination.totalPages}
                className="btn btn-outline"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MyOrders;
