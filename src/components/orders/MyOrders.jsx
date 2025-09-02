import React, { useState, useEffect } from 'react';
import VerificationGate from '../verification/VerificationGate';
import VerificationUpload from '../verification/VerificationUpload';
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
// Tailwind refactor: legacy CSS removed

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
  const [verificationStatus, setVerificationStatus] = useState(null); // required | pending | rejected
  const [showVerificationUpload, setShowVerificationUpload] = useState(false);

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

  // Derive verification status (client only) from user object
  const deriveVerificationStatus = () => {
    try {
      const current = getCurrentUser();
      if (!current || current.role !== 'client') return null;
      const s = current.user?.verification?.status;
      if (['required','pending','rejected'].includes(s)) return s;
      return null;
    } catch(_) { return null; }
  };

  useEffect(() => {
    setVerificationStatus(deriveVerificationStatus());
  }, [clientAuth.user]);

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
        // Attempt to parse structured error (verification block etc.)
        try {
          const errData = await response.json();
          if (errData.code === 'VERIFICATION_BLOCK') {
            setVerificationStatus(errData.verificationStatus || 'required');
            // Do not treat as fatal error for UI; show gate + existing orders section empty
            setOrders([]);
            setPagination({ currentPage:1,totalPages:1,totalOrders:0 });
            setLoading(false);
            return;
          }
        } catch (_) { /* ignore JSON parse */ }
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
    return new Intl.NumberFormat('bn-BD', {
      style: 'currency',
      currency: 'BDT'
    }).format(amount);
  };

  const currentUser = getCurrentUser();

  if (!currentUser) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex flex-col items-center text-center border border-amber-200 bg-amber-50 rounded-xl p-10">
          <AlertCircle className="text-amber-500 mb-4" size={56} />
          <h3 className="text-xl font-semibold text-gray-800 mb-2">Authentication Required</h3>
            <p className="text-gray-600 mb-6 max-w-md">Please log in to view and track your orders.</p>
          <button onClick={() => navigate('/login')} className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-md text-sm font-medium shadow-sm">
            Log In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">My Orders</h1>
        <p className="text-sm text-gray-500 mt-1">Track and manage your order history</p>
      </header>

      {currentUser.role === 'client' && (
        <>
          <VerificationGate status={verificationStatus} onStart={() => setShowVerificationUpload(true)} />
          {showVerificationUpload && (
            <VerificationUpload
              onClose={() => setShowVerificationUpload(false)}
              onSubmitted={(s) => { setVerificationStatus(s); }}
            />
          )}
        </>
      )}

      {/* Filters */}
      <div className="bg-white/70 backdrop-blur rounded-xl shadow-sm border border-gray-200 p-4 mb-6 flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-gray-500" />
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="text-sm rounded-md border-gray-300 focus:ring-emerald-500 focus:border-emerald-500"
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
        <div className="flex items-center gap-2">
          <CreditCard size={16} className="text-gray-500" />
          <select
            value={filters.paymentStatus}
            onChange={(e) => setFilters({ ...filters, paymentStatus: e.target.value })}
            className="text-sm rounded-md border-gray-300 focus:ring-emerald-500 focus:border-emerald-500"
          >
            <option value="all">All Payments</option>
            <option value="pending">Payment Pending</option>
            <option value="paid">Paid</option>
            <option value="failed">Payment Failed</option>
            <option value="refunded">Refunded</option>
          </select>
        </div>
        <div className="flex items-center gap-2 flex-1 min-w-[220px] max-w-sm">
          <Search size={16} className="text-gray-500" />
          <input
            type="text"
            placeholder="Search orders..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="w-full text-sm rounded-md border-gray-300 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>
        <button
          onClick={() => fetchOrders(pagination.currentPage, filters.status, filters.paymentStatus, filters.search)}
          className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 shadow-sm"
          title="Refresh"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-24">
          <div className="h-10 w-10 rounded-full border-4 border-emerald-500/30 border-t-emerald-600 animate-spin mb-4" />
          <p className="text-sm text-gray-600">Loading your orders...</p>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="flex flex-col items-center text-center border border-red-200 bg-red-50 rounded-xl p-10 mb-8">
          <AlertCircle className="text-red-500 mb-3" size={40} />
          <p className="text-sm text-red-600 font-medium mb-4">{error}</p>
          <button
            onClick={() => fetchOrders(1, filters.status, filters.paymentStatus, filters.search)}
            className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-md text-sm font-medium shadow-sm"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Orders / Empty */}
      {!loading && !error && (
        <>
          {orders.length === 0 ? (
            <div className="flex flex-col items-center text-center py-24">
              <Package className="text-gray-400 mb-4" size={56} />
              <h3 className="text-lg font-medium text-gray-800 mb-2">No orders found</h3>
              <p className="text-sm text-gray-500 mb-6 max-w-md">You haven't placed any orders yet or none match your current filters.</p>
              <button
                onClick={() => navigate('/')}
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-md text-sm font-medium shadow-sm"
              >
                Start Shopping
              </button>
            </div>
          ) : (
            <ul className="space-y-6">
              {orders.map(order => {
                const statusInfo = getStatusIcon(order.status);
                const paymentInfo = getPaymentStatusIcon(order.paymentStatus, order.paymentMethod);
                const badgeBase = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium';
                const colorMap = {
                  orange:'bg-amber-100 text-amber-700',
                  blue:'bg-blue-100 text-blue-600',
                  purple:'bg-violet-100 text-violet-600',
                  indigo:'bg-indigo-100 text-indigo-600',
                  green:'bg-emerald-100 text-emerald-600',
                  red:'bg-red-100 text-red-600',
                  gray:'bg-gray-100 text-gray-600'
                };
                return (
                  <li key={order._id} className="relative overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow">
                    <div className="p-5">
                      {/* Header */}
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 pb-4 border-b border-gray-100">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 tracking-tight mb-2">#{order.orderNumber}</h3>
                          <div className="flex flex-wrap gap-2">
                            <span className={`${badgeBase} ${colorMap[statusInfo.color]}`}>{statusInfo.icon}<span>{order.status}</span></span>
                            <span className={`${badgeBase} ${colorMap[paymentInfo.color]}`}>{paymentInfo.icon}<span>{order.paymentStatus}</span></span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-emerald-600 text-xl font-semibold">
                          <DollarSign size={18} />
                          <span>{formatCurrency(order.total)}</span>
                        </div>
                      </div>

                      {/* Meta */}
                      <div className="flex flex-wrap gap-x-8 gap-y-3 pt-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1.5"><Calendar size={14} className="text-gray-400" /><span>{formatDate(order.orderedAt)}</span></div>
                        <div className="flex items-center gap-1.5"><Package size={14} className="text-gray-400" /><span>{order.itemCount} items</span></div>
                        <div className="flex items-center gap-1.5"><Truck size={14} className="text-gray-400" /><span>{order.deliveryMethod}</span></div>
                        <div className="flex items-center gap-1.5"><CreditCard size={14} className="text-gray-400" /><span className="uppercase font-medium">{order.paymentMethod}</span></div>
                      </div>

                      {/* Items */}
                      <div className="mt-6">
                        <h4 className="text-sm font-semibold text-gray-800 mb-3">Items</h4>
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {order.items.slice(0,3).map((item, idx) => (
                            <div key={idx} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50/60">
                              {item.images?.[0] && (
                                <img src={item.images[0]} alt={item.name} className="h-14 w-14 rounded-md object-cover ring-1 ring-gray-200" />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-gray-800 truncate">{item.name}</p>
                                <p className="text-[11px] text-gray-500">Qty: {item.quantity}</p>
                                <p className="text-xs font-semibold text-emerald-600">{formatCurrency((item.price || item.unitPrice) * item.quantity)}</p>
                              </div>
                            </div>
                          ))}
                          {order.items.length > 3 && (
                            <div className="flex items-center justify-center p-3 rounded-lg border border-dashed border-gray-200 text-xs text-gray-500 bg-white">
                              +{order.items.length - 3} more
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Address */}
                      {order.deliveryAddress && (
                        <div className="mt-6">
                          <h4 className="text-sm font-semibold text-gray-800 mb-2">Delivery Address</h4>
                          <div className="flex items-start gap-2 text-sm text-gray-600">
                            <MapPin size={16} className="text-gray-400 mt-0.5" />
                            <p className="leading-snug">
                              {order.deliveryAddress.name} - {order.deliveryAddress.phone}<br />
                              {order.deliveryAddress.addressLine1}, {order.deliveryAddress.city}<br />
                              {order.deliveryAddress.state} {order.deliveryAddress.zip}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Notes */}
                      {(order.notes || order.specialInstructions) && (
                        <div className="mt-6 rounded-lg border border-gray-100 bg-gray-50 p-4 text-sm text-gray-600 space-y-2">
                          {order.notes && <p><span className="font-medium text-gray-800">Notes:</span> {order.notes}</p>}
                          {order.specialInstructions && <p><span className="font-medium text-gray-800">Special Instructions:</span> {order.specialInstructions}</p>}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="mt-6 pt-4 border-t border-gray-100 flex flex-wrap gap-3">
                        <button
                          onClick={() => navigate(`/orders/${order.orderNumber}`)}
                          className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                        >
                          <Eye size={14} /> Details
                        </button>
                        {order.status === 'delivered' && (
                          <button
                            onClick={() => {
                              // Trigger invoice download
                              fetch(`http://localhost:5005/api/orders/${order.orderNumber}/invoice`, {
                                headers: { 'Authorization': `Bearer ${currentUser.token || localStorage.getItem('clientToken') || sessionStorage.getItem('vendorToken')}` }
                              }).then(r => {
                                if (!r.ok) throw new Error('Invoice failed');
                                return r.blob();
                              }).then(blob => {
                                const url = window.URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `invoice-${order.orderNumber}.pdf`;
                                document.body.appendChild(a);
                                a.click();
                                a.remove();
                                window.URL.revokeObjectURL(url);
                              }).catch(()=> alert('Failed to download invoice'));
                            }}
                            className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                          >
                            <Download size={14} /> Invoice
                          </button>
                        )}
                        {['pending','confirmed'].includes(order.status) && (
                          <button
                            onClick={() => {
                              if (window.confirm('Are you sure you want to cancel this order?')) cancelOrder(order.orderNumber);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                          >
                            <XCircle size={14} /> Cancel
                          </button>
                        )}
                        {order.status === 'shipped' && (
                          <button
                            onClick={() => navigate(`/orders/${order.orderNumber}/tracking`)}
                            className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
                          >
                            <Truck size={14} /> Track
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-10">
              <button
                onClick={() => fetchOrders(pagination.currentPage - 1, filters.status, filters.paymentStatus, filters.search)}
                disabled={pagination.currentPage === 1}
                className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-xs text-gray-500">Page {pagination.currentPage} of {pagination.totalPages}</span>
              <button
                onClick={() => fetchOrders(pagination.currentPage + 1, filters.status, filters.paymentStatus, filters.search)}
                disabled={pagination.currentPage === pagination.totalPages}
                className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
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
