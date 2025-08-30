import React, { useState, useEffect } from 'react';
import { useAdminAuth } from '../contexts/AdminAuthContext';

const AdminFraudPanel = () => {
  const { token } = useAdminAuth();
  const [pendingOrders, setPendingOrders] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [debugData, setDebugData] = useState(null);
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetchData();
  }, [token]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch pending orders
      const ordersResponse = await fetch('http://localhost:5005/api/admin-panel/pending-orders', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Fetch dashboard data
      const dashboardResponse = await fetch('http://localhost:5005/api/admin-panel/fraud-dashboard', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (ordersResponse.ok) {
        const ordersData = await ordersResponse.json();
        setPendingOrders(ordersData.orders || []);
      }
      
      if (dashboardResponse.ok) {
        const dashboardData = await dashboardResponse.json();
        setDashboardData(dashboardData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshFraudDetection = async () => {
    try {
      setProcessing(true);
      const response = await fetch('http://localhost:5005/api/debug-fraud/refresh-fraud-detection', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        alert(`Fraud detection refreshed! Updated ${result.updatedCount} orders.`);
        await fetchData(); // Refresh the data
      }
    } catch (error) {
      console.error('Error refreshing fraud detection:', error);
      alert('Error refreshing fraud detection');
    } finally {
      setProcessing(false);
    }
  };

  const debugOrder = async (orderNumber) => {
    try {
      const response = await fetch(`http://localhost:5005/api/debug-fraud/order/${orderNumber}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        setDebugData(result);
        setShowDebug(true);
      }
    } catch (error) {
      console.error('Error debugging order:', error);
      alert('Error debugging order');
    }
  };

  const fetchRecentOrders = async () => {
    try {
      const response = await fetch('http://localhost:5005/api/debug-fraud/recent-orders?limit=100&days=30', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        setDebugData(result);
        setShowDebug(true);
      }
    } catch (error) {
      console.error('Error fetching recent orders:', error);
      alert('Error fetching recent orders');
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
        await fetchData();
        alert(`Order ${action}ed successfully!`);
      }
    } catch (error) {
      console.error('Error reviewing order:', error);
      alert('Error reviewing order');
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (amount) => {
    return `৳${amount?.toLocaleString() || 0}`;
  };

  const getSeverityClass = (severity) => {
    const classes = {
      low: 'bg-yellow-100 text-yellow-800',
      medium: 'bg-orange-100 text-orange-800', 
      high: 'bg-red-100 text-red-800',
      critical: 'bg-red-200 text-red-900'
    };
    return classes[severity] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading admin panel...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🛡️ Anti-Syndicate Admin Panel
          </h1>
          <p className="text-gray-600">Monitor and manage suspicious orders to prevent hoarding and fraud</p>
        </div>

        {/* Dashboard Stats */}
        {dashboardData && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-600">Recent Suspicious</h3>
              <p className="text-3xl font-bold text-red-600">{dashboardData.summary?.recentSuspicious || 0}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-600">Pending Review</h3>
              <p className="text-3xl font-bold text-yellow-600">{dashboardData.summary?.totalPending || 0}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-600">Suspicious IPs</h3>
              <p className="text-3xl font-bold text-orange-600">{dashboardData.summary?.suspiciousIPCount || 0}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-600">Rapid Orders</h3>
              <p className="text-3xl font-bold text-blue-600">{dashboardData.summary?.rapidOrderUsers || 0}</p>
            </div>
          </div>
        )}

        {/* Pending Orders Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b flex justify-between items-center">
            <h2 className="text-xl font-semibold">
              Orders Requiring Review ({pendingOrders.length})
            </h2>
            <div className="flex gap-2">
              <button
                onClick={fetchRecentOrders}
                disabled={processing}
                className="px-4 py-2 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 disabled:opacity-50"
              >
                🔍 Debug All Orders
              </button>
              <button
                onClick={refreshFraudDetection}
                disabled={processing}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {processing ? 'Refreshing...' : '🔄 Refresh Fraud Detection'}
              </button>
            </div>
          </div>

          {pendingOrders.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No pending orders for review</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Order
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Flags
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Security Info
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {pendingOrders.map((order) => (
                    <tr key={order._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {order.orderNumber}
                        </div>
                        <div className="text-sm text-gray-500">
                          {order.itemCount || 0} items
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {order.user?.firstName} {order.user?.lastName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {order.user?.email}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {formatCurrency(order.total)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {(order.suspiciousFlags || []).map((flag, index) => (
                            <span
                              key={index}
                              className={`px-2 py-1 text-xs rounded-full ${getSeverityClass(flag.severity)}`}
                            >
                              {flag.type}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs text-gray-600 space-y-1">
                          {order.securityInfo?.ipAddress && (
                            <div>🌐 IP: {order.securityInfo.ipAddress.substring(0, 12)}...</div>
                          )}
                          {order.securityInfo?.deviceFingerprint && (
                            <div>📱 Device: {order.securityInfo.deviceFingerprint}</div>
                          )}
                          {order.securityInfo?.riskLevel && (
                            <div className={`font-semibold ${
                              order.securityInfo.riskLevel === 'critical' ? 'text-red-600' :
                              order.securityInfo.riskLevel === 'high' ? 'text-orange-600' :
                              order.securityInfo.riskLevel === 'medium' ? 'text-yellow-600' :
                              'text-green-600'
                            }`}>
                              Risk: {order.securityInfo.riskLevel.toUpperCase()}
                            </div>
                          )}
                          {order.securityInfo?.isProxy && (
                            <div className="text-orange-600">⚠️ Proxy/VPN</div>
                          )}
                          {order.securityInfo?.automationDetected && (
                            <div className="text-red-600">🤖 Bot Detected</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => debugOrder(order.orderNumber)}
                            disabled={processing}
                            className="px-2 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700 disabled:opacity-50"
                          >
                            Debug
                          </button>
                          <button
                            onClick={() => reviewOrder(order._id, 'approve', 'Approved by admin')}
                            disabled={processing}
                            className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => reviewOrder(order._id, 'reject', 'Rejected due to security concerns')}
                            disabled={processing}
                            className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Debug Modal */}
        {showDebug && debugData && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-6xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
                <h3 className="text-xl font-semibold">
                  {debugData.order ? `Debug: ${debugData.order.orderNumber}` : 'All Recent Orders'}
                </h3>
                <button
                  onClick={() => setShowDebug(false)}
                  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  Close
                </button>
              </div>
              
              <div className="p-6">
                {debugData.order ? (
                  // Single order debug
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-semibold mb-2">Order Details</h4>
                        <div className="bg-gray-50 p-4 rounded text-sm space-y-2">
                          <p><strong>Order:</strong> {debugData.order.orderNumber}</p>
                          <p><strong>Customer:</strong> {debugData.order.user?.firstName} {debugData.order.user?.lastName}</p>
                          <p><strong>Total:</strong> ৳{debugData.order.total}</p>
                          <p><strong>Quantity:</strong> {debugData.order.analysis.totalQuantity} items</p>
                          <p><strong>Requires Approval:</strong> {debugData.order.requiresApproval ? '✅ Yes' : '❌ No'}</p>
                          <p><strong>Flags:</strong> {debugData.order.analysis.flagCount}</p>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold mb-2">Analysis</h4>
                        <div className="bg-gray-50 p-4 rounded text-sm space-y-2">
                          <p><strong>Device Fingerprint:</strong> {debugData.order.analysis.hasDeviceFingerprint ? '✅ Yes' : '❌ No'}</p>
                          <p><strong>Meets Quantity Threshold:</strong> {debugData.order.analysis.meetsQuantityThreshold ? '✅ Yes' : '❌ No'}</p>
                          <p><strong>Meets Value Threshold:</strong> {debugData.order.analysis.meetsValueThreshold ? '✅ Yes' : '❌ No'}</p>
                          <p><strong>Rapid Ordering:</strong> {debugData.order.analysis.isRapidOrdering ? '✅ Yes' : '❌ No'}</p>
                          <p><strong>User Orders:</strong> {debugData.order.analysis.userOrderCount}</p>
                          <p><strong>Device Shared:</strong> {debugData.order.analysis.deviceSharedWith}</p>
                        </div>
                      </div>
                    </div>
                    
                    {debugData.order.analysis.reasons.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2">Reasons Not Flagged</h4>
                        <div className="bg-yellow-50 p-4 rounded">
                          {debugData.order.analysis.reasons.map((reason, idx) => (
                            <p key={idx} className="text-sm">⚠️ {reason}</p>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div>
                      <h4 className="font-semibold mb-2">Recommendations</h4>
                      <div className="bg-blue-50 p-4 rounded">
                        {debugData.recommendations.map((rec, idx) => (
                          <p key={idx} className="text-sm">{rec}</p>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  // Recent orders debug
                  <div className="space-y-6">
                    <div className="grid grid-cols-4 gap-4">
                      <div className="bg-gray-50 p-4 rounded text-center">
                        <h4 className="font-semibold">Total Orders</h4>
                        <p className="text-2xl font-bold">{debugData.stats.total}</p>
                      </div>
                      <div className="bg-red-50 p-4 rounded text-center">
                        <h4 className="font-semibold">Flagged</h4>
                        <p className="text-2xl font-bold text-red-600">{debugData.stats.flagged}</p>
                      </div>
                      <div className="bg-yellow-50 p-4 rounded text-center">
                        <h4 className="font-semibold">Unflagged</h4>
                        <p className="text-2xl font-bold text-yellow-600">{debugData.stats.unflagged}</p>
                      </div>
                      <div className="bg-orange-50 p-4 rounded text-center">
                        <h4 className="font-semibold">Should Be Flagged</h4>
                        <p className="text-2xl font-bold text-orange-600">{debugData.stats.shouldBeFlagged}</p>
                      </div>
                    </div>
                    
                    {debugData.analysis?.unflaggedButSuspicious?.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2 text-red-600">⚠️ Unflagged But Suspicious Orders</h4>
                        <div className="bg-red-50 p-4 rounded">
                          {debugData.analysis.unflaggedButSuspicious.map((order, idx) => (
                            <div key={idx} className="flex justify-between items-center py-2 border-b last:border-b-0">
                              <span className="font-medium">{order.orderNumber}</span>
                              <span>৳{order.total} | {order.quantity} items</span>
                              <span className="text-sm text-red-600">{order.reasons.join(', ')}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div>
                      <h4 className="font-semibold mb-2">Recent Orders</h4>
                      <div className="max-h-96 overflow-y-auto">
                        <table className="min-w-full text-sm">
                          <thead className="bg-gray-100 sticky top-0">
                            <tr>
                              <th className="px-3 py-2 text-left">Order</th>
                              <th className="px-3 py-2 text-left">Customer</th>
                              <th className="px-3 py-2 text-left">Total</th>
                              <th className="px-3 py-2 text-left">Qty</th>
                              <th className="px-3 py-2 text-left">Flagged</th>
                              <th className="px-3 py-2 text-left">Device</th>
                            </tr>
                          </thead>
                          <tbody>
                            {debugData.orders.map((order, idx) => (
                              <tr key={idx} className={`${
                                (order.shouldBeFlagged.highValue || order.shouldBeFlagged.bulkQuantity) && !order.flagged
                                  ? 'bg-red-50' : order.flagged ? 'bg-green-50' : ''
                              }`}>
                                <td className="px-3 py-2">{order.orderNumber}</td>
                                <td className="px-3 py-2">{order.customer}</td>
                                <td className="px-3 py-2">৳{order.total}</td>
                                <td className="px-3 py-2">{order.totalQuantity}</td>
                                <td className="px-3 py-2">{order.flagged ? '✅' : '❌'}</td>
                                <td className="px-3 py-2">{order.hasDevice ? '📱' : '❌'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminFraudPanel;
