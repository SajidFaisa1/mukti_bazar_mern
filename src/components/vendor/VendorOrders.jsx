import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/VendorAuthContext';
import { 
  Package, 
  Clock, 
  CheckCircle, 
  Truck, 
  XCircle, 
  User, 
  Phone,
  MapPin,
  Calendar,
  DollarSign,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import './VendorOrders.css';

const VendorOrders = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    status: 'all',
    search: ''
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalOrders: 0
  });

  // Fetch orders from backend
  const fetchOrders = async (page = 1, status = 'all', search = '') => {
    try {
      setLoading(true);
      setError('');

      // Get token from sessionStorage
      const token = sessionStorage.getItem('vendorToken');
      if (!token) {
        throw new Error('Authentication required');
      }

      let url = `http://localhost:5005/api/orders/vendor/orders?page=${page}&limit=10`;
      if (status !== 'all') {
        url += `&status=${status}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }

      const data = await response.json();
      setOrders(data.orders || []);
      setPagination(data.pagination || {
        currentPage: 1,
        totalPages: 1,
        totalOrders: 0
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
    if (user) {
      fetchOrders(1, filters.status, filters.search);
    }
  }, [user, filters.status, filters.search]);

  // Update order status
  const updateOrderStatus = async (orderNumber, newStatus, notes = '') => {
    try {
      const token = sessionStorage.getItem('vendorToken');
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`http://localhost:5005/api/orders/vendor/orders/${orderNumber}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus, notes })
      });

      if (!response.ok) {
        throw new Error('Failed to update order status');
      }

      // Refresh orders
      fetchOrders(pagination.currentPage, filters.status, filters.search);
    } catch (err) {
      console.error('Failed to update order status:', err);
      setError(err.message || 'Failed to update order');
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <Clock className="status-icon pending" size={16} />;
      case 'confirmed': return <CheckCircle className="status-icon confirmed" size={16} />;
      case 'processing': return <Package className="status-icon processing" size={16} />;
      case 'shipped': return <Truck className="status-icon shipped" size={16} />;
      case 'delivered': return <CheckCircle className="status-icon delivered" size={16} />;
      case 'cancelled': return <XCircle className="status-icon cancelled" size={16} />;
      default: return <Clock className="status-icon" size={16} />;
    }
  };

  const getStatusActions = (order) => {
    const actions = [];
    
    switch (order.status) {
      case 'pending':
        actions.push(
          <button 
            key="confirm" 
            onClick={() => updateOrderStatus(order.orderNumber, 'confirmed')}
            className="modern-btn success"
          >
            <CheckCircle size={16} />
            Confirm Order
          </button>
        );
        actions.push(
          <button 
            key="cancel" 
            onClick={() => updateOrderStatus(order.orderNumber, 'cancelled', 'Order cancelled by vendor')}
            className="modern-btn danger"
          >
            <XCircle size={16} />
            Cancel
          </button>
        );
        break;
      case 'confirmed':
        actions.push(
          <button 
            key="process" 
            onClick={() => updateOrderStatus(order.orderNumber, 'processing')}
            className="modern-btn primary"
          >
            <Package size={16} />
            Start Processing
          </button>
        );
        break;
      case 'processing':
        actions.push(
          <button 
            key="ship" 
            onClick={() => updateOrderStatus(order.orderNumber, 'shipped')}
            className="modern-btn info"
          >
            <Truck size={16} />
            Mark as Shipped
          </button>
        );
        break;
      case 'shipped':
        actions.push(
          <button 
            key="deliver" 
            onClick={() => updateOrderStatus(order.orderNumber, 'delivered')}
            className="modern-btn success"
          >
            <CheckCircle size={16} />
            Mark as Delivered
          </button>
        );
        break;
    }
    
    return actions;
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
      currency: 'BDT'
    }).format(amount);
  };

  if (!user) {
    return <div className="vendor-orders-container">Please log in to view orders.</div>;
  }

  return (
    <div className="vendor-orders-container">
      {/* Modern Header */}
      <div className="vendor-orders-header">
        <div className="header-content">
          <div className="header-text">
            <h1>Order Management</h1>
            <p>Track and manage your customer orders efficiently</p>
          </div>
          <div className="header-stats">
            <div className="stat-card">
              <Package className="stat-icon" size={20} />
              <div>
                <span className="stat-number">{pagination.totalOrders}</span>
                <span className="stat-label">Total Orders</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modern Filters */}
      <div className="orders-filters">
        <div className="filters-container">
          <div className="filter-section">
            <div className="filter-group">
              <label>
                <Filter size={16} />
                Status Filter
              </label>
              <select 
                value={filters.status} 
                onChange={(e) => setFilters({...filters, status: e.target.value})}
                className="modern-select"
              >
                <option value="all">All Orders</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="processing">Processing</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            
            <div className="search-group">
              <label>
                <Search size={16} />
                Search Orders
              </label>
              <input
                type="text"
                placeholder="Search by order number..."
                value={filters.search}
                onChange={(e) => setFilters({...filters, search: e.target.value})}
                className="modern-input"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="modern-loading-state">
          <div className="loading-animation">
            <div className="loading-spinner"></div>
          </div>
          <h3>Loading orders...</h3>
          <p>Please wait while we fetch your orders</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="modern-error-state">
          <XCircle size={48} className="error-icon" />
          <h3>Something went wrong</h3>
          <p className="error-message">{error}</p>
          <button 
            onClick={() => fetchOrders(1, filters.status, filters.search)}
            className="retry-button"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Orders List */}
      {!loading && !error && (
        <>
          {orders.length === 0 ? (
            <div className="modern-empty-state">
              <div className="empty-icon">
                <Package size={64} />
              </div>
              <h3>No orders yet</h3>
              <p>Orders from customers will appear here once you start receiving them.</p>
            </div>
          ) : (
            <div className="modern-orders-grid">
              {orders.map((order) => (
                <div key={order._id} className="modern-order-card">
                  <div className="order-card-header">
                    <div className="order-primary-info">
                      <h3 className="order-number">#{order.orderNumber}</h3>
                      <div className={`modern-status-badge ${order.status}`}>
                        {getStatusIcon(order.status)}
                        <span>{order.status.charAt(0).toUpperCase() + order.status.slice(1)}</span>
                      </div>
                    </div>
                    <div className="order-amount-display">
                      <span className="amount-label">Total</span>
                      <span className="amount-value">{formatCurrency(order.total)}</span>
                    </div>
                  </div>

                  <div className="order-card-body">
                    <div className="order-meta-grid">
                      <div className="meta-card">
                        <Calendar size={16} className="meta-icon" />
                        <div>
                          <span className="meta-label">Ordered</span>
                          <span className="meta-value">{formatDate(order.orderedAt)}</span>
                        </div>
                      </div>
                      <div className="meta-card">
                        <Package size={16} className="meta-icon" />
                        <div>
                          <span className="meta-label">Items</span>
                          <span className="meta-value">{order.itemCount}</span>
                        </div>
                      </div>
                      <div className="meta-card">
                        <DollarSign size={16} className="meta-icon" />
                        <div>
                          <span className="meta-label">Payment Status</span>
                          <span className={`meta-value payment-${order.paymentStatus || 'pending'}`}>
                            {(order.paymentStatus || 'pending').charAt(0).toUpperCase() + (order.paymentStatus || 'pending').slice(1)}
                          </span>
                        </div>
                      </div>
                      <div className="meta-card">
                        <Truck size={16} className="meta-icon" />
                        <div>
                          <span className="meta-label">Delivery</span>
                          <span className="meta-value">{order.deliveryMethod}</span>
                        </div>
                      </div>
                    </div>

                    <div className="customer-section">
                      <h4 className="section-title">
                        <User size={16} />
                        Customer Information
                      </h4>
                      <div className="customer-card">
                        <div className="customer-main">
                          <span className="customer-name">{order.deliveryAddress.name}</span>
                          <span className="customer-phone">
                            <Phone size={14} />
                            {order.deliveryAddress.phone}
                          </span>
                        </div>
                        <div className="customer-address">
                          <MapPin size={14} />
                          <span>
                            {order.deliveryAddress.addressLine1}, {order.deliveryAddress.city}, 
                            {order.deliveryAddress.state} {order.deliveryAddress.zip}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="items-section">
                      <h4 className="section-title">
                        <Package size={16} />
                        Order Items
                      </h4>
                      <div className="items-grid">
                        {order.items.map((item, index) => {
                          // Debug log to check image data
                          console.log('Item data:', {
                            name: item.name,
                            images: item.images,
                            image: item.image,
                            productSnapshot: item.productSnapshot
                          });
                          
                          return (
                            <div key={index} className="modern-item-card">
                              <div className="item-image-container">
                                <img 
                                  src={item.images?.[0] || item.image || item.productSnapshot?.images?.[0] || '/placeholder-product.jpg'} 
                                  alt={item.name}
                                  className="item-image"
                                  onError={(e) => {
                                    console.log('Image load error for item:', item.name, 'Attempted URL:', e.target.src);
                                    e.target.src = '/placeholder-product.jpg';
                                  }}
                                />
                              </div>
                              <div className="item-details">
                                <span className="item-name">{item.name}</span>
                                <span className="item-quantity">Qty: {item.quantity}</span>
                              </div>
                              <div className="item-pricing">
                                <span className="item-unit-price">{formatCurrency(item.price || item.unitPrice)}</span>
                                <span className="item-total-price">
                                  {formatCurrency((item.price || item.unitPrice) * item.quantity)}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {(order.notes || order.specialInstructions) && (
                      <div className="notes-section">
                        {order.notes && (
                          <div className="note-card">
                            <h5>Customer Notes</h5>
                            <p>{order.notes}</p>
                          </div>
                        )}
                        {order.specialInstructions && (
                          <div className="note-card">
                            <h5>Special Instructions</h5>
                            <p>{order.specialInstructions}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="order-card-footer">
                    <div className="action-buttons">
                      {getStatusActions(order)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Modern Pagination */}
          {pagination.totalPages > 1 && (
            <div className="modern-pagination">
              <button 
                onClick={() => fetchOrders(pagination.currentPage - 1, filters.status, filters.search)}
                disabled={pagination.currentPage === 1}
                className="pagination-btn prev"
              >
                <ChevronLeft size={16} />
                Previous
              </button>
              
              <div className="pagination-info">
                <span className="page-info">
                  Page {pagination.currentPage} of {pagination.totalPages}
                </span>
                <span className="total-info">
                  ({pagination.totalOrders} total orders)
                </span>
              </div>
              
              <button 
                onClick={() => fetchOrders(pagination.currentPage + 1, filters.status, filters.search)}
                disabled={pagination.currentPage === pagination.totalPages}
                className="pagination-btn next"
              >
                Next
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default VendorOrders;
