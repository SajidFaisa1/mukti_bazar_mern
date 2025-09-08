import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/VendorAuthContext';
import { 
  CubeIcon, 
  ClockIcon, 
  CheckCircleIcon, 
  TruckIcon, 
  XCircleIcon, 
  UserIcon, 
  PhoneIcon,
  MapPinIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { 
  CheckCircleIcon as CheckCircleSolid,
  XCircleIcon as XCircleSolid 
} from '@heroicons/react/24/solid';

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

  // Update order status with risk score validation
  const updateOrderStatus = async (orderNumber, newStatus, notes = '') => {
    try {
      const token = sessionStorage.getItem('vendorToken');
      if (!token) {
        throw new Error('Authentication required');
      }

      // Find the order to check risk score
      const order = orders.find(o => o.orderNumber === orderNumber);
      
      /* 
       * SECURITY ISSUE: Risk score calculation only happens during order creation,
       * not during status updates. This means:
       * - COD orders: Risk calculated at creation, visible to vendor before confirmation
       * - Paid orders: Risk calculation may be skipped, leading to security gaps
       * 
       * TODO: Backend should calculate risk scores for ALL orders regardless of payment method
       */
      
      // Special handling for paid orders
      if (order?.paymentStatus === 'paid' && newStatus === 'confirmed') {
        if (!order?.securityInfo?.riskScore || order?.securityInfo?.riskScore === 0) {
          // Alert vendor about missing risk assessment for paid orders
          const confirmProceed = window.confirm(
            '⚠️ SECURITY NOTICE: Risk Assessment Missing\n\n' +
            'This paid order has not undergone proper risk assessment.\n' +
            'The backend should calculate risk scores for ALL orders.\n\n' +
            'Are you sure you want to confirm this order?\n\n' +
            '(This indicates a backend configuration issue that should be reported to administrators)'
          );
          
          if (!confirmProceed) {
            return;
          }
          
          // Log the backend issue
          console.error('🚨 BACKEND ISSUE: Paid order lacking risk assessment', {
            orderNumber,
            paymentStatus: order.paymentStatus,
            riskScore: order?.securityInfo?.riskScore,
            timestamp: new Date().toISOString()
          });
        } else if (order.securityInfo.riskScore >= 35) {
          // Standard high-risk validation for paid orders with risk scores
          alert('⚠️ High Risk Order Alert\\n\\nThis paid order has a risk score of ' + order.securityInfo.riskScore + 
                ' which requires admin approval.\\n\\nPlease contact an administrator to confirm this order.');
          return;
        }
      }
      
      // Risk score validation for COD order confirmation
      if (newStatus === 'confirmed' && order?.paymentMethod === 'cod' && order?.securityInfo?.riskScore >= 35) {
        alert('⚠️ High Risk Order Alert\\n\\nThis order has a risk score of ' + order.securityInfo.riskScore + 
              ' which requires admin approval.\\n\\nPlease contact an administrator to confirm this order.');
        return;
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
    const iconClass = "w-4 h-4";
    switch (status) {
      case 'pending': return <ClockIcon className={`${iconClass} text-yellow-500`} />;
      case 'confirmed': return <CheckCircleSolid className={`${iconClass} text-green-500`} />;
      case 'processing': return <CubeIcon className={`${iconClass} text-blue-500`} />;
      case 'shipped': return <TruckIcon className={`${iconClass} text-indigo-500`} />;
      case 'delivered': return <CheckCircleSolid className={`${iconClass} text-emerald-500`} />;
      case 'cancelled': return <XCircleSolid className={`${iconClass} text-red-500`} />;
      default: return <ClockIcon className={`${iconClass} text-gray-500`} />;
    }
  };

  const getStatusActions = (order) => {
    const actions = [];
    const baseButtonClass = "inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200";
    const riskScore = order.securityInfo?.riskScore || 0;
    const isHighRisk = riskScore >= 35;
    const isPaidButNotProperlyConfirmed = order.paymentStatus === 'paid' && order.status === 'confirmed' && (riskScore === 0 || !order.securityInfo?.riskScore);
    
    // Handle paid orders that were auto-confirmed but need proper vendor confirmation
    if (isPaidButNotProperlyConfirmed) {
      actions.push(
        <div key="paid-notice" className={`${baseButtonClass} bg-blue-50 text-blue-700 border border-blue-200 cursor-default`}>
          <CheckCircleIcon className="w-4 h-4" />
          Payment Received - Needs Risk Assessment
        </div>
      );
      actions.push(
        <button 
          key="reconfirm" 
          onClick={() => updateOrderStatus(order.orderNumber, 'processing')}
          className={`${baseButtonClass} bg-green-500 hover:bg-green-600 text-white shadow-md hover:shadow-lg transform hover:scale-105`}
        >
          <CubeIcon className="w-4 h-4" />
          Process Order
        </button>
      );
      return actions;
    }
    
    switch (order.status) {
      case 'pending':
        if (isHighRisk) {
          actions.push(
            <button 
              key="high-risk-notice" 
              className={`${baseButtonClass} bg-red-50 text-red-700 border border-red-200 cursor-not-allowed opacity-75`}
              disabled
              title={`Risk Score: ${riskScore} - Admin approval required`}
            >
              <ExclamationTriangleIcon className="w-4 h-4" />
              Admin Approval Required
            </button>
          );
        } else {
          actions.push(
            <button 
              key="confirm" 
              onClick={() => updateOrderStatus(order.orderNumber, 'confirmed')}
              className={`${baseButtonClass} bg-green-500 hover:bg-green-600 text-white shadow-md hover:shadow-lg transform hover:scale-105`}
            >
              <CheckCircleIcon className="w-4 h-4" />
              Confirm Order
            </button>
          );
        }
        actions.push(
          <button 
            key="cancel" 
            onClick={() => updateOrderStatus(order.orderNumber, 'cancelled', 'Order cancelled by vendor')}
            className={`${baseButtonClass} bg-red-500 hover:bg-red-600 text-white shadow-md hover:shadow-lg transform hover:scale-105`}
          >
            <XCircleIcon className="w-4 h-4" />
            Cancel
          </button>
        );
        break;
      case 'confirmed':
        actions.push(
          <button 
            key="process" 
            onClick={() => updateOrderStatus(order.orderNumber, 'processing')}
            className={`${baseButtonClass} bg-blue-500 hover:bg-blue-600 text-white shadow-md hover:shadow-lg transform hover:scale-105`}
          >
            <CubeIcon className="w-4 h-4" />
            Start Processing
          </button>
        );
        break;
      case 'processing':
        actions.push(
          <button 
            key="ship" 
            onClick={() => updateOrderStatus(order.orderNumber, 'shipped')}
            className={`${baseButtonClass} bg-indigo-500 hover:bg-indigo-600 text-white shadow-md hover:shadow-lg transform hover:scale-105`}
          >
            <TruckIcon className="w-4 h-4" />
            Mark as Shipped
          </button>
        );
        break;
      case 'shipped':
        actions.push(
          <button 
            key="deliver" 
            onClick={() => updateOrderStatus(order.orderNumber, 'delivered')}
            className={`${baseButtonClass} bg-emerald-500 hover:bg-emerald-600 text-white shadow-md hover:shadow-lg transform hover:scale-105`}
          >
            <CheckCircleIcon className="w-4 h-4" />
            Mark as Delivered
          </button>
        );
        break;
    }
    
    return actions;
  };

  const getRiskScoreBadge = (riskScore, paymentStatus, orderStatus) => {
    // Show warning for paid orders that should be in pending status
    if (paymentStatus === 'paid' && orderStatus === 'confirmed' && (riskScore === undefined || riskScore === null || riskScore === 0)) {
      return (
        <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700 border border-orange-200">
          <ExclamationTriangleIcon className="w-3 h-3" />
          Risk Assessment Needed
        </div>
      );
    }

    if (riskScore === undefined || riskScore === null) {
      return (
        <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
          <EyeIcon className="w-3 h-3" />
          No Risk Data
        </div>
      );
    }

    if (riskScore >= 35) {
      return (
        <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200">
          <ExclamationTriangleIcon className="w-3 h-3" />
          High Risk ({riskScore})
        </div>
      );
    } else if (riskScore >= 20) {
      return (
        <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 border border-yellow-200">
          <ExclamationTriangleIcon className="w-3 h-3" />
          Medium Risk ({riskScore})
        </div>
      );
    } else {
      return (
        <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
          <CheckCircleIcon className="w-3 h-3" />
          Low Risk ({riskScore})
        </div>
      );
    }
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
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <UserIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Authentication Required</h2>
          <p className="text-gray-600">Please log in to view orders.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Modern Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Order Management</h1>
              <p className="mt-2 text-gray-600">Track and manage your customer orders efficiently</p>
            </div>
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-4 border border-blue-200">
              <div className="flex items-center gap-3">
                <div className="bg-blue-500 rounded-xl p-2">
                  <CubeIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-900">{pagination.totalOrders}</div>
                  <div className="text-sm text-blue-600">Total Orders</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* System Security Alert */}
        {orders.some(order => 
          order.paymentStatus === 'paid' && 
          (!order.securityInfo?.riskScore || order.securityInfo?.riskScore === 0)
        ) && (
          <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-2xl p-6 mb-8">
            <div className="flex items-start gap-4">
              <div className="bg-orange-500 rounded-xl p-2 flex-shrink-0">
                <ExclamationTriangleIcon className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-orange-800 mb-2">
                  System Security Issue Detected
                </h3>
                <p className="text-orange-700 mb-3">
                  Some paid orders are missing risk assessments. This indicates a backend configuration issue 
                  where risk score calculation is not being triggered for pre-paid orders.
                </p>
                <div className="flex flex-wrap gap-4 text-sm">
                  <span className="inline-flex items-center gap-1 text-orange-600">
                    <span className="w-2 h-2 bg-orange-400 rounded-full"></span>
                    Affected orders are highlighted below
                  </span>
                  <span className="inline-flex items-center gap-1 text-orange-600">
                    <span className="w-2 h-2 bg-orange-400 rounded-full"></span>
                    Contact system administrator
                  </span>
                  <span className="inline-flex items-center gap-1 text-orange-600">
                    <span className="w-2 h-2 bg-orange-400 rounded-full"></span>
                    Risk scores should be calculated for ALL orders
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modern Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center gap-6">
            <div className="flex-1">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <FunnelIcon className="w-4 h-4" />
                Status Filter
              </label>
              <select 
                value={filters.status} 
                onChange={(e) => setFilters({...filters, status: e.target.value})}
                className="w-full lg:w-auto px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
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
            
            <div className="flex-1">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <MagnifyingGlassIcon className="w-4 h-4" />
                Search Orders
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by order number..."
                  value={filters.search}
                  onChange={(e) => setFilters({...filters, search: e.target.value})}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Loading orders...</h3>
            <p className="text-gray-600">Please wait while we fetch your orders</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
              <XCircleIcon className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Something went wrong</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button 
              onClick={() => fetchOrders(1, filters.status, filters.search)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Orders List */}
        {!loading && !error && (
          <>
            {orders.length === 0 ? (
              <div className="text-center py-16">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                  <CubeIcon className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No orders yet</h3>
                <p className="text-gray-600">Orders from customers will appear here once you start receiving them.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {orders.map((order) => (
                  <div key={order._id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                    {/* Order Card Header */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
                      <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-4">
                          <h3 className="text-xl font-bold text-gray-900">#{order.orderNumber}</h3>
                          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                            order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            order.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                            order.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                            order.status === 'shipped' ? 'bg-indigo-100 text-indigo-800' :
                            order.status === 'delivered' ? 'bg-emerald-100 text-emerald-800' :
                            order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {getStatusIcon(order.status)}
                            <span>{order.status.charAt(0).toUpperCase() + order.status.slice(1)}</span>
                          </div>
                          {getRiskScoreBadge(order.securityInfo?.riskScore, order.paymentStatus, order.status)}
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-600">Total Amount</div>
                          <div className="text-2xl font-bold text-gray-900">{formatCurrency(order.total)}</div>
                        </div>
                      </div>
                    </div>

                    {/* Security Alert for Paid Orders Without Risk Assessment */}
                    {order.paymentStatus === 'paid' && (!order.securityInfo?.riskScore || order.securityInfo?.riskScore === 0) && (
                      <div className="mx-6 mb-4 p-4 bg-orange-50 border border-orange-200 rounded-xl">
                        <div className="flex items-start gap-3">
                          <ExclamationTriangleIcon className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <h4 className="font-semibold text-orange-800 mb-1">Security Assessment Required</h4>
                            <p className="text-sm text-orange-700 mb-3">
                              This paid order has not undergone proper risk assessment. The backend should calculate 
                              risk scores for ALL orders, including pre-paid ones.
                            </p>
                            <div className="flex items-center gap-4 text-xs text-orange-600">
                              <span>• Payment Status: <strong>Paid</strong></span>
                              <span>• Risk Score: <strong>Missing</strong></span>
                              <span>• Action: Contact system administrator</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="p-6">
                      {/* Order Meta Information */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                          <CalendarIcon className="w-5 h-5 text-gray-500" />
                          <div>
                            <div className="text-xs text-gray-500">Ordered</div>
                            <div className="text-sm font-medium text-gray-900">{formatDate(order.orderedAt)}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                          <CubeIcon className="w-5 h-5 text-gray-500" />
                          <div>
                            <div className="text-xs text-gray-500">Items</div>
                            <div className="text-sm font-medium text-gray-900">{order.itemCount}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                          <CurrencyDollarIcon className="w-5 h-5 text-gray-500" />
                          <div>
                            <div className="text-xs text-gray-500">Payment Status</div>
                            <div className={`text-sm font-medium ${
                              order.paymentStatus === 'paid' ? 'text-green-600' :
                              order.paymentStatus === 'pending' ? 'text-yellow-600' :
                              'text-red-600'
                            }`}>
                              {(order.paymentStatus || 'pending').charAt(0).toUpperCase() + (order.paymentStatus || 'pending').slice(1)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                          <TruckIcon className="w-5 h-5 text-gray-500" />
                          <div>
                            <div className="text-xs text-gray-500">Delivery</div>
                            <div className="text-sm font-medium text-gray-900">{order.deliveryMethod}</div>
                          </div>
                        </div>
                      </div>

                      {/* Payment & Risk Assessment Alert */}
                      {order.paymentStatus === 'paid' && order.status === 'confirmed' && (!order.securityInfo?.riskScore || order.securityInfo?.riskScore === 0) && (
                        <div className="mb-6 bg-orange-50 border border-orange-200 rounded-xl p-4">
                          <div className="flex items-start gap-3">
                            <ExclamationTriangleIcon className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <h4 className="font-semibold text-orange-800 mb-1">Payment Received - Risk Assessment Required</h4>
                              <p className="text-orange-700 text-sm mb-3">
                                This order has been paid but requires proper risk assessment and vendor confirmation before processing.
                              </p>
                              <div className="flex items-center gap-2 text-sm">
                                <CheckCircleIcon className="w-4 h-4 text-green-600" />
                                <span className="text-green-700 font-medium">Payment: ৳{order.total.toFixed(2)} received</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Customer Information */}
                      <div className="mb-6">
                        <h4 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-3">
                          <UserIcon className="w-5 h-5" />
                          Customer Information
                        </h4>
                        <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="font-semibold text-gray-900">{order.deliveryAddress.name}</div>
                              <div className="flex items-center gap-2 text-gray-600 mt-1">
                                <PhoneIcon className="w-4 h-4" />
                                {order.deliveryAddress.phone}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-start gap-2 text-gray-600 mt-2">
                            <MapPinIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            <span>
                              {order.deliveryAddress.addressLine1}, {order.deliveryAddress.city}, 
                              {order.deliveryAddress.state} {order.deliveryAddress.zip}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Order Items */}
                      <div className="mb-6">
                        <h4 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-3">
                          <CubeIcon className="w-5 h-5" />
                          Order Items
                        </h4>
                        <div className="space-y-3">
                          {order.items.map((item, index) => (
                            <div key={index} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                              <div className="w-16 h-16 bg-white rounded-lg border border-gray-200 overflow-hidden flex-shrink-0">
                                <img 
                                  src={item.images?.[0] || item.image || item.productSnapshot?.images?.[0] || '/placeholder-product.jpg'} 
                                  alt={item.name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.target.src = '/placeholder-product.jpg';
                                  }}
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-gray-900 truncate">{item.name}</div>
                                <div className="text-sm text-gray-600">Quantity: {item.quantity}</div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm text-gray-600">{formatCurrency(item.price || item.unitPrice)} each</div>
                                <div className="font-semibold text-gray-900">
                                  {formatCurrency((item.price || item.unitPrice) * item.quantity)}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Notes and Special Instructions */}
                      {(order.notes || order.specialInstructions) && (
                        <div className="mb-6">
                          <h4 className="text-lg font-semibold text-gray-900 mb-3">Additional Information</h4>
                          <div className="space-y-3">
                            {order.notes && (
                              <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-200">
                                <h5 className="font-medium text-yellow-800 mb-1">Customer Notes</h5>
                                <p className="text-yellow-700">{order.notes}</p>
                              </div>
                            )}
                            {order.specialInstructions && (
                              <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
                                <h5 className="font-medium text-purple-800 mb-1">Special Instructions</h5>
                                <p className="text-purple-700">{order.specialInstructions}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200">
                        {getStatusActions(order)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Modern Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between bg-white rounded-2xl shadow-sm border border-gray-200 px-6 py-4 mt-8">
                <button 
                  onClick={() => fetchOrders(pagination.currentPage - 1, filters.status, filters.search)}
                  disabled={pagination.currentPage === 1}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 rounded-xl transition-colors"
                >
                  <ChevronLeftIcon className="w-4 h-4" />
                  Previous
                </button>
                
                <div className="text-center">
                  <div className="text-sm font-medium text-gray-900">
                    Page {pagination.currentPage} of {pagination.totalPages}
                  </div>
                  <div className="text-xs text-gray-500">
                    {pagination.totalOrders} total orders
                  </div>
                </div>
                
                <button 
                  onClick={() => fetchOrders(pagination.currentPage + 1, filters.status, filters.search)}
                  disabled={pagination.currentPage === pagination.totalPages}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 rounded-xl transition-colors"
                >
                  Next
                  <ChevronRightIcon className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default VendorOrders;
