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
  Search
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
            className="btn btn-sm btn-success"
          >
            Confirm Order
          </button>
        );
        actions.push(
          <button 
            key="cancel" 
            onClick={() => updateOrderStatus(order.orderNumber, 'cancelled', 'Order cancelled by vendor')}
            className="btn btn-sm btn-danger"
          >
            Cancel
          </button>
        );
        break;
      case 'confirmed':
        actions.push(
          <button 
            key="process" 
            onClick={() => updateOrderStatus(order.orderNumber, 'processing')}
            className="btn btn-sm btn-primary"
          >
            Start Processing
          </button>
        );
        break;
      case 'processing':
        actions.push(
          <button 
            key="ship" 
            onClick={() => updateOrderStatus(order.orderNumber, 'shipped')}
            className="btn btn-sm btn-info"
          >
            Mark as Shipped
          </button>
        );
        break;
      case 'shipped':
        actions.push(
          <button 
            key="deliver" 
            onClick={() => updateOrderStatus(order.orderNumber, 'delivered')}
            className="btn btn-sm btn-success"
          >
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
      currency: 'USD'
    }).format(amount);
  };

  if (!user) {
    return <div className="vendor-orders-container">Please log in to view orders.</div>;
  }

  return (
    <div className="vendor-orders-container">
      <div className="vendor-orders-header">
        <h1>My Orders</h1>
        <p>Manage and track your customer orders</p>
      </div>

      {/* Filters */}
      <div className="orders-filters">
        <div className="filter-group">
          <Filter size={16} />
          <select 
            value={filters.status} 
            onChange={(e) => setFilters({...filters, status: e.target.value})}
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
          <Search size={16} />
          <input
            type="text"
            placeholder="Search by order number..."
            value={filters.search}
            onChange={(e) => setFilters({...filters, search: e.target.value})}
          />
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading orders...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="error-state">
          <p className="error-message">{error}</p>
          <button onClick={() => fetchOrders(1, filters.status, filters.search)}>
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
              <p>You haven't received any orders yet.</p>
            </div>
          ) : (
            <div className="orders-list">
              {orders.map((order) => (
                <div key={order._id} className="order-card">
                  <div className="order-header">
                    <div className="order-info">
                      <h3>#{order.orderNumber}</h3>
                      <div className="order-status">
                        {getStatusIcon(order.status)}
                        <span className={`status-text ${order.status}`}>
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </span>
                      </div>
                    </div>
                    <div className="order-amount">
                      <DollarSign size={16} />
                      {formatCurrency(order.total)}
                    </div>
                  </div>

                  <div className="order-details">
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
                    </div>

                    <div className="customer-info">
                      <h4>Customer Details</h4>
                      <div className="customer-details">
                        <div className="detail-item">
                          <User size={14} />
                          <span>{order.deliveryAddress.name}</span>
                        </div>
                        <div className="detail-item">
                          <Phone size={14} />
                          <span>{order.deliveryAddress.phone}</span>
                        </div>
                        <div className="detail-item">
                          <MapPin size={14} />
                          <span>
                            {order.deliveryAddress.addressLine1}, {order.deliveryAddress.city}, 
                            {order.deliveryAddress.state} {order.deliveryAddress.zip}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="order-items">
                      <h4>Order Items</h4>
                      <div className="items-list">
                        {order.items.map((item, index) => (
                          <div key={index} className="item-row">
                            <div className="item-info">
                              <span className="item-name">{item.name}</span>
                              <span className="item-details">
                                {item.quantity} × {formatCurrency(item.price || item.unitPrice)}
                              </span>
                            </div>
                            <span className="item-total">
                              {formatCurrency((item.price || item.unitPrice) * item.quantity)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {order.notes && (
                      <div className="order-notes">
                        <h4>Customer Notes</h4>
                        <p>{order.notes}</p>
                      </div>
                    )}

                    {order.specialInstructions && (
                      <div className="order-instructions">
                        <h4>Special Instructions</h4>
                        <p>{order.specialInstructions}</p>
                      </div>
                    )}
                  </div>

                  <div className="order-actions">
                    {getStatusActions(order)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="pagination">
              <button 
                onClick={() => fetchOrders(pagination.currentPage - 1, filters.status, filters.search)}
                disabled={pagination.currentPage === 1}
              >
                Previous
              </button>
              <span>
                Page {pagination.currentPage} of {pagination.totalPages}
              </span>
              <button 
                onClick={() => fetchOrders(pagination.currentPage + 1, filters.status, filters.search)}
                disabled={pagination.currentPage === pagination.totalPages}
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

export default VendorOrders;
