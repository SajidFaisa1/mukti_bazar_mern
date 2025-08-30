import React, { useState } from 'react';
import { useAdminAuth } from '../contexts/AdminAuthContext';

const FraudTestingPanel = () => {
  const { token } = useAdminAuth();
  const [testResults, setTestResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const addResult = (test, status, message, details = {}) => {
    setTestResults(prev => [...prev, {
      id: Date.now(),
      test,
      status,
      message,
      details,
      timestamp: new Date().toLocaleTimeString()
    }]);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  // Test 1: Bulk Order Detection
  const testBulkOrder = async () => {
    setLoading(true);
    addResult('Bulk Order', 'running', 'Testing bulk order detection...');
    
    try {
      // First get available products
      const productsResponse = await fetch('http://localhost:5005/api/products?limit=1');
      const productsData = await productsResponse.json();
      const products = productsData.products || productsData;
      
      if (!products || products.length === 0) {
        addResult('Bulk Order', 'error', 'No products available for testing');
        return;
      }

      const testProduct = products[0];
      
      // Add large quantity to cart
      const cartResponse = await fetch('http://localhost:5005/api/cart/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          productId: testProduct._id,
          quantity: 150 // Should trigger bulk_hoarding flag
        })
      });

      if (!cartResponse.ok) {
        throw new Error('Failed to add to cart');
      }

      // Checkout
      const checkoutResponse = await fetch('http://localhost:5005/api/orders/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          paymentMethod: 'cod',
          notes: 'Fraud detection test - bulk order'
        })
      });

      const checkoutData = await checkoutResponse.json();
      
      if (checkoutData.success) {
        const { securityInfo } = checkoutData;
        
        if (securityInfo?.requiresApproval && securityInfo?.totalFraudFlags > 0) {
          addResult('Bulk Order', 'success', '✅ WORKING! Order flagged for admin review', {
            orderId: checkoutData.orderIds?.[0],
            flags: securityInfo.totalFraudFlags,
            message: securityInfo.message
          });
        } else {
          addResult('Bulk Order', 'warning', '❌ NOT WORKING! Order was not flagged', {
            securityInfo
          });
        }
      } else {
        addResult('Bulk Order', 'error', 'Checkout failed: ' + checkoutData.message);
      }

    } catch (error) {
      addResult('Bulk Order', 'error', 'Test failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Test 2: High Value Order Detection  
  const testHighValueOrder = async () => {
    setLoading(true);
    addResult('High Value', 'running', 'Testing high-value order detection...');
    
    try {
      // Get products
      const productsResponse = await fetch('http://localhost:5005/api/products');
      const productsData = await productsResponse.json();
      const products = productsData.products || productsData;
      
      if (!products || products.length === 0) {
        addResult('High Value', 'error', 'No products available');
        return;
      }

      // Find expensive product or use quantity to make expensive order
      const testProduct = products[0];
      const expensiveQuantity = Math.ceil(60000 / (testProduct.unitPrice || testProduct.price || 100));
      
      // Add to cart
      const cartResponse = await fetch('http://localhost:5005/api/cart/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          productId: testProduct._id,
          quantity: expensiveQuantity
        })
      });

      // Checkout
      const checkoutResponse = await fetch('http://localhost:5005/api/orders/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          paymentMethod: 'cod',
          notes: 'Fraud detection test - high value order'
        })
      });

      const checkoutData = await checkoutResponse.json();
      
      if (checkoutData.success) {
        const { securityInfo, totalValue } = checkoutData;
        
        if (securityInfo?.requiresApproval) {
          addResult('High Value', 'success', '✅ WORKING! High-value order flagged', {
            totalValue: totalValue,
            flags: securityInfo.totalFraudFlags
          });
        } else {
          addResult('High Value', 'warning', '❌ NOT WORKING! High-value order not flagged', {
            totalValue: totalValue
          });
        }
      }

    } catch (error) {
      addResult('High Value', 'error', 'Test failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Test 3: Admin Panel Access
  const testAdminPanel = async () => {
    setLoading(true);
    addResult('Admin Panel', 'running', 'Testing admin panel access...');
    
    try {
      const response = await fetch('http://localhost:5005/api/admin-panel/pending-orders', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        addResult('Admin Panel', 'success', '✅ WORKING! Admin panel accessible', {
          pendingOrders: data.orders?.length || 0,
          fraudStats: data.fraudStats?.length || 0
        });
      } else if (response.status === 403) {
        addResult('Admin Panel', 'info', 'ℹ️  Access denied - need admin role', {
          status: response.status
        });
      } else {
        addResult('Admin Panel', 'error', 'Admin panel access failed', {
          status: response.status
        });
      }
    } catch (error) {
      addResult('Admin Panel', 'error', 'Test failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Test 4: Database Check
  const checkDatabase = async () => {
    setLoading(true);
    addResult('Database', 'running', 'Checking fraud detection in database...');
    
    try {
      // Check recent orders
      const ordersResponse = await fetch('http://localhost:5005/api/orders', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (ordersResponse.ok) {
        const ordersData = await ordersResponse.json();
        const orders = ordersData.orders || [];
        const flaggedOrders = orders.filter(order => order.requiresApproval || order.suspiciousFlags?.length > 0);
        
        addResult('Database', 'success', `✅ Found ${flaggedOrders.length} flagged orders out of ${orders.length} total`, {
          totalOrders: orders.length,
          flaggedOrders: flaggedOrders.length,
          recentFlaggedOrder: flaggedOrders[0]?.orderNumber
        });
      }
    } catch (error) {
      addResult('Database', 'error', 'Database check failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-50 border-green-200';
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200';  
      case 'error': return 'text-red-600 bg-red-50 border-red-200';
      case 'info': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'running': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            🛡️ Fraud Detection Testing Panel
          </h2>
          <p className="text-gray-600 mt-1">Test the anti-syndicate fraud detection system</p>
        </div>

        <div className="p-6">
          {/* Test Buttons */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <button
              onClick={testBulkOrder}
              disabled={loading}
              className="px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm"
            >
              Test Bulk Order
              <div className="text-xs opacity-75">(&gt;100 items)</div>
            </button>
            
            <button
              onClick={testHighValueOrder}
              disabled={loading}
              className="px-4 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 text-sm"
            >
              Test High Value
              <div className="text-xs opacity-75">(&gt;৳50k)</div>
            </button>
            
            <button
              onClick={testAdminPanel}
              disabled={loading}
              className="px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 text-sm"
            >
              Test Admin Panel
              <div className="text-xs opacity-75">(Access Check)</div>
            </button>
            
            <button
              onClick={checkDatabase}
              disabled={loading}
              className="px-4 py-3 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 text-sm"
            >
              Check Database
              <div className="text-xs opacity-75">(Flagged Orders)</div>
            </button>
          </div>

          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Test Results</h3>
            <button
              onClick={clearResults}
              className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              Clear Results
            </button>
          </div>

          {/* Results */}
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {testResults.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No tests run yet. Click a test button to start.</p>
              </div>
            ) : (
              testResults.map(result => (
                <div
                  key={result.id}
                  className={`p-4 rounded-md border ${getStatusColor(result.status)}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{result.test} Test</span>
                        <span className="text-xs">{result.timestamp}</span>
                      </div>
                      <p className="text-sm">{result.message}</p>
                      
                      {result.details && Object.keys(result.details).length > 0 && (
                        <div className="mt-2 text-xs">
                          <details>
                            <summary className="cursor-pointer font-medium">View Details</summary>
                            <pre className="mt-1 p-2 bg-black bg-opacity-5 rounded text-xs overflow-x-auto">
                              {JSON.stringify(result.details, null, 2)}
                            </pre>
                          </details>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Instructions */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <h4 className="font-medium text-blue-900 mb-2">Testing Instructions:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• <strong>Bulk Order:</strong> Creates order with 150+ items (should trigger bulk_hoarding flag)</li>
              <li>• <strong>High Value:</strong> Creates expensive order &gt;৳50,000 (should trigger high_value flag)</li>
              <li>• <strong>Admin Panel:</strong> Tests access to fraud detection dashboard</li>
              <li>• <strong>Database:</strong> Checks for existing flagged orders in your account</li>
              <li>• Make sure you're logged in and have products available in the system</li>
              <li>• Admin tests require admin role in your account</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FraudTestingPanel;
