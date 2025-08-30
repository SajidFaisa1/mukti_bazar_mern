import React, { useState, useEffect } from 'react';
import { Bell, AlertTriangle, ShieldX, CheckCircle, XCircle, Eye } from 'lucide-react';
import { useAdminAuth } from '../contexts/AdminAuthContext';

const AdminFraudPanel = () => {
  const { token } = useAdminAuth();
  const [pendingOrders, setPendingOrders] = useState([]);
  const [fraudStats, setFraudStats] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [filters, setFilters] = useState({
    severity: '',
    type: ''
  });

  useEffect(() => {
    if (!token) return;
    fetchPendingOrders();
    fetchDashboardData();
  }, [filters, token]);

  const fetchPendingOrders = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.severity) params.append('severity', filters.severity);
      if (filters.type) params.append('type', filters.type);
      
      const response = await fetch(`http://localhost:5005/api/admin-panel/pending-orders?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setPendingOrders(data.orders);
        setFraudStats(data.fraudStats);
      }
    } catch (error) {
      console.error('Error fetching pending orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('http://localhost:5005/api/admin-panel/fraud-dashboard', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setDashboardData(data);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const reviewOrder = async (orderId, action, reason = '') => {
    setProcessing(true);
    try {
      const response = await fetch(`http://localhost:5005/api/admin-panel/orders/${orderId}/review`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action, reason })
      });
      
      if (response.ok) {
        await fetchPendingOrders();
        await fetchDashboardData();
        setSelectedOrder(null);
      }
    } catch (error) {
      console.error('Error reviewing order:', error);
    } finally {
      setProcessing(false);
    }
  };

  const getSeverityColor = (severity) => {
    const colors = {
      low: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      medium: 'bg-orange-100 text-orange-800 border-orange-300',
      high: 'bg-red-100 text-red-800 border-red-300',
      critical: 'bg-red-200 text-red-900 border-red-400'
    };
    return colors[severity] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('bn-BD', {
      style: 'currency',
      currency: 'BDT',
      minimumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <ShieldX className="w-8 h-8 text-red-600" />
            🛡️ Anti-Syndicate Admin Panel
          </h1>
          <p className="mt-2 text-gray-600">Monitor and manage suspicious orders to prevent hoarding and fraud</p>
        </div>

        {/* Dashboard Stats */}
        {dashboardData && (
          <div className=\"grid grid-cols-1 md:grid-cols-4 gap-6 mb-8\">
            <div className=\"bg-white rounded-lg shadow p-6\">
              <div className=\"flex items-center justify-between\">
                <div>
                  <p className=\"text-sm font-medium text-gray-600\">Recent Suspicious</p>
                  <p className=\"text-3xl font-bold text-red-600\">{dashboardData.summary.recentSuspicious}</p>
                </div>
                <AlertTriangle className=\"w-8 h-8 text-red-500\" />
              </div>
            </div>

            <div className=\"bg-white rounded-lg shadow p-6\">
              <div className=\"flex items-center justify-between\">
                <div>
                  <p className=\"text-sm font-medium text-gray-600\">Pending Review</p>
                  <p className=\"text-3xl font-bold text-yellow-600\">{dashboardData.summary.totalPending}</p>
                </div>
                <Bell className=\"w-8 h-8 text-yellow-500\" />
              </div>
            </div>

            <div className=\"bg-white rounded-lg shadow p-6\">
              <div className=\"flex items-center justify-between\">
                <div>
                  <p className=\"text-sm font-medium text-gray-600\">Suspicious IPs</p>
                  <p className=\"text-3xl font-bold text-orange-600\">{dashboardData.summary.suspiciousIPCount}</p>
                </div>
                <ShieldX className=\"w-8 h-8 text-orange-500\" />
              </div>
            </div>

            <div className=\"bg-white rounded-lg shadow p-6\">
              <div className=\"flex items-center justify-between\">
                <div>
                  <p className=\"text-sm font-medium text-gray-600\">Rapid Orders</p>
                  <p className=\"text-3xl font-bold text-blue-600\">{dashboardData.summary.rapidOrderUsers}</p>
                </div>
                <AlertTriangle className=\"w-8 h-8 text-blue-500\" />
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className=\"bg-white rounded-lg shadow p-6 mb-6\">
          <h2 className=\"text-lg font-semibold mb-4\">Filters</h2>
          <div className=\"grid grid-cols-1 md:grid-cols-2 gap-4\">
            <select
              value={filters.severity}
              onChange={(e) => setFilters({...filters, severity: e.target.value})}
              className=\"border border-gray-300 rounded-md px-3 py-2\"
            >
              <option value=\"\">All Severities</option>
              <option value=\"low\">Low</option>
              <option value=\"medium\">Medium</option>
              <option value=\"high\">High</option>
              <option value=\"critical\">Critical</option>
            </select>

            <select
              value={filters.type}
              onChange={(e) => setFilters({...filters, type: e.target.value})}
              className=\"border border-gray-300 rounded-md px-3 py-2\"
            >
              <option value=\"\">All Types</option>
              <option value=\"bulk_hoarding\">Bulk Hoarding</option>
              <option value=\"high_value\">High Value</option>
              <option value=\"rapid_ordering\">Rapid Ordering</option>
              <option value=\"multiple_devices\">Multiple Devices</option>
            </select>
          </div>
        </div>

        {/* Pending Orders */}
        <div className=\"bg-white rounded-lg shadow\">
          <div className=\"px-6 py-4 border-b border-gray-200\">
            <h2 className=\"text-xl font-semibold text-gray-900\">
              Orders Requiring Review ({pendingOrders.length})
            </h2>
          </div>

          <div className=\"overflow-x-auto\">
            <table className=\"min-w-full divide-y divide-gray-200\">
              <thead className=\"bg-gray-50\">
                <tr>
                  <th className=\"px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider\">
                    Order
                  </th>
                  <th className=\"px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider\">
                    Customer
                  </th>
                  <th className=\"px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider\">
                    Amount
                  </th>
                  <th className=\"px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider\">
                    Flags
                  </th>
                  <th className=\"px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider\">
                    Date
                  </th>
                  <th className=\"px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider\">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className=\"bg-white divide-y divide-gray-200\">
                {pendingOrders.map((order) => (
                  <tr key={order._id} className=\"hover:bg-gray-50\">
                    <td className=\"px-6 py-4 whitespace-nowrap\">
                      <div className=\"text-sm font-medium text-gray-900\">
                        {order.orderNumber}
                      </div>
                      <div className=\"text-sm text-gray-500\">
                        {order.itemCount} items
                      </div>
                    </td>
                    <td className=\"px-6 py-4 whitespace-nowrap\">
                      <div className=\"text-sm text-gray-900\">
                        {order.user?.firstName} {order.user?.lastName}
                      </div>
                      <div className=\"text-sm text-gray-500\">
                        {order.user?.email}
                      </div>
                    </td>
                    <td className=\"px-6 py-4 whitespace-nowrap text-sm text-gray-900\">
                      {formatCurrency(order.total)}
                    </td>
                    <td className=\"px-6 py-4 whitespace-nowrap\">
                      <div className=\"flex flex-wrap gap-1\">
                        {order.suspiciousFlags.map((flag, index) => (
                          <span
                            key={index}
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getSeverityColor(flag.severity)}`}
                          >
                            {flag.type}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className=\"px-6 py-4 whitespace-nowrap text-sm text-gray-500\">
                      {new Date(order.orderedAt).toLocaleDateString()}
                    </td>
                    <td className=\"px-6 py-4 whitespace-nowrap text-sm font-medium\">
                      <div className=\"flex gap-2\">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className=\"text-blue-600 hover:text-blue-900 flex items-center gap-1\"
                        >
                          <Eye className=\"w-4 h-4\" />
                          Review
                        </button>
                        <button
                          onClick={() => reviewOrder(order._id, 'approve', 'Quick approval')}
                          disabled={processing}
                          className=\"text-green-600 hover:text-green-900 flex items-center gap-1\"
                        >
                          <CheckCircle className=\"w-4 h-4\" />
                          Approve
                        </button>
                        <button
                          onClick={() => reviewOrder(order._id, 'reject', 'Security risk')}
                          disabled={processing}
                          className=\"text-red-600 hover:text-red-900 flex items-center gap-1\"
                        >
                          <XCircle className=\"w-4 h-4\" />
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {pendingOrders.length === 0 && (
              <div className=\"text-center py-12\">
                <CheckCircle className=\"mx-auto h-12 w-12 text-green-400\" />
                <h3 className=\"mt-2 text-sm font-medium text-gray-900\">No pending orders</h3>
                <p className=\"mt-1 text-sm text-gray-500\">All orders have been reviewed!</p>
              </div>
            )}
          </div>
        </div>

        {/* Order Review Modal */}
        {selectedOrder && (
          <div className=\"fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50\">
            <div className=\"relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white\">
              <div className=\"mt-3\">
                <h3 className=\"text-lg font-medium text-gray-900 mb-4\">
                  Order Review: {selectedOrder.orderNumber}
                </h3>

                <div className=\"grid grid-cols-2 gap-6 mb-6\">
                  <div>
                    <h4 className=\"font-medium text-gray-900 mb-2\">Order Details</h4>
                    <p><strong>Customer:</strong> {selectedOrder.user?.firstName} {selectedOrder.user?.lastName}</p>
                    <p><strong>Email:</strong> {selectedOrder.user?.email}</p>
                    <p><strong>Total:</strong> {formatCurrency(selectedOrder.total)}</p>
                    <p><strong>Items:</strong> {selectedOrder.itemCount}</p>
                    <p><strong>Date:</strong> {new Date(selectedOrder.orderedAt).toLocaleString()}</p>
                  </div>

                  <div>
                    <h4 className=\"font-medium text-gray-900 mb-2\">Security Info</h4>
                    <p><strong>IP Address:</strong> {selectedOrder.securityInfo?.ipAddress || 'N/A'}</p>
                    <p><strong>Location:</strong> {selectedOrder.securityInfo?.location?.city}, {selectedOrder.securityInfo?.location?.country}</p>
                    <p><strong>Risk Flags:</strong> {selectedOrder.suspiciousFlags.length}</p>
                  </div>
                </div>

                <div className=\"mb-6\">
                  <h4 className=\"font-medium text-gray-900 mb-2\">Suspicious Flags</h4>
                  <div className=\"space-y-2\">
                    {selectedOrder.suspiciousFlags.map((flag, index) => (
                      <div key={index} className={`p-3 rounded-md border ${getSeverityColor(flag.severity)}`}>
                        <div className=\"font-medium\">{flag.type}</div>
                        <div className=\"text-sm\">{flag.description}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className=\"flex justify-end gap-3\">
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className=\"px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400\"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => reviewOrder(selectedOrder._id, 'reject', 'Failed security review')}
                    disabled={processing}
                    className=\"px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center gap-2\"
                  >
                    <XCircle className=\"w-4 h-4\" />
                    Reject Order
                  </button>
                  <button
                    onClick={() => reviewOrder(selectedOrder._id, 'approve', 'Security review passed')}
                    disabled={processing}
                    className=\"px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2\"
                  >
                    <CheckCircle className=\"w-4 h-4\" />
                    Approve Order
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminFraudPanel;
