import React, { useState, useEffect } from 'react';
import { useVendorAuth } from '../../../contexts/VendorAuthContext';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ShoppingCart, 
  Users, 
  Eye,
  Download,
  Calendar,
  Filter,
  Star,
  Package,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

const VendorAnalyticsSettings = () => {
  const { user, token } = useVendorAuth();
  const [timeRange, setTimeRange] = useState('30');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [analyticsData, setAnalyticsData] = useState({
    totalSales: 0,
    totalOrders: 0,
    totalCustomers: 0,
    averageRating: 0,
    salesGrowth: 0,
    orderGrowth: 0,
    customerGrowth: 0
  });
  const [topProducts, setTopProducts] = useState([]);
  const [customerInsights, setCustomerInsights] = useState({
    averageOrderValue: 0,
    repeatCustomers: 0,
    ordersPerCustomer: 0
  });
  const [orders, setOrders] = useState([]);

  // Calculate days from time range
  const getDaysFromRange = (range) => {
    switch(range) {
      case '7': return 7;
      case '30': return 30;
      case '90': return 90;
      case '365': return 365;
      default: return 30;
    }
  };

  // Fetch vendor analytics data
  const fetchAnalytics = async () => {
    if (!user?.uid || !token) return;

    setLoading(true);
    setError('');

    try {
      // Fetch vendor orders
      const response = await fetch(`http://localhost:5005/api/orders/vendor/orders?limit=1000`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }

      const data = await response.json();
      const allOrders = data.orders || [];
      setOrders(allOrders);

      // Calculate analytics based on time range
      const days = getDaysFromRange(timeRange);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const currentPeriodOrders = allOrders.filter(order => 
        new Date(order.orderedAt) >= cutoffDate && 
        ['confirmed', 'processing', 'shipped', 'delivered'].includes(order.status)
      );

      // Calculate previous period for growth comparison
      const previousCutoffDate = new Date();
      previousCutoffDate.setDate(previousCutoffDate.getDate() - (days * 2));
      
      const previousPeriodOrders = allOrders.filter(order => {
        const orderDate = new Date(order.orderedAt);
        return orderDate >= previousCutoffDate && 
               orderDate < cutoffDate && 
               ['confirmed', 'processing', 'shipped', 'delivered'].includes(order.status);
      });

      // Calculate totals
      const totalSales = currentPeriodOrders.reduce((sum, order) => sum + order.total, 0);
      const totalOrders = currentPeriodOrders.length;
      const uniqueCustomers = new Set(currentPeriodOrders.map(order => order.uid)).size;

      // Calculate previous period totals for growth
      const previousSales = previousPeriodOrders.reduce((sum, order) => sum + order.total, 0);
      const previousOrders = previousPeriodOrders.length;
      const previousCustomers = new Set(previousPeriodOrders.map(order => order.uid)).size;

      // Calculate growth percentages
      const salesGrowth = previousSales > 0 ? ((totalSales - previousSales) / previousSales) * 100 : 0;
      const orderGrowth = previousOrders > 0 ? ((totalOrders - previousOrders) / previousOrders) * 100 : 0;
      const customerGrowth = previousCustomers > 0 ? ((uniqueCustomers - previousCustomers) / previousCustomers) * 100 : 0;

      // Calculate average rating from user data
      const averageRating = user.storeRatingAvg || 0;

      setAnalyticsData({
        totalSales,
        totalOrders,
        totalCustomers: uniqueCustomers,
        averageRating,
        salesGrowth,
        orderGrowth,
        customerGrowth
      });

      // Calculate top products
      const productSales = {};
      const productOrders = {};
      
      currentPeriodOrders.forEach(order => {
        order.items.forEach(item => {
          const productId = item.productId || item.product?._id;
          const productName = item.name;
          const itemTotal = (item.price || item.unitPrice || 0) * item.quantity;
          
          if (!productSales[productId]) {
            productSales[productId] = {
              name: productName,
              sales: 0,
              orders: 0,
              totalQuantity: 0
            };
          }
          
          productSales[productId].sales += itemTotal;
          productSales[productId].orders += 1;
          productSales[productId].totalQuantity += item.quantity;
        });
      });

      // Convert to array and sort by sales
      const topProductsArray = Object.values(productSales)
        .sort((a, b) => b.sales - a.sales)
        .slice(0, 5)
        .map(product => ({
          name: product.name,
          revenue: product.sales,
          quantity: product.quantity,
          orders: product.orders,
          growth: Math.random() * 30 - 5 // Random growth for now - could be calculated from historical data
        }));

      setTopProducts(topProductsArray);

      // Calculate customer insights
      const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;
      const previousAvgOrderValue = previousOrders > 0 ? previousSales / previousOrders : 0;
      const avgOrderValueChange = previousAvgOrderValue > 0 ? ((avgOrderValue - previousAvgOrderValue) / previousAvgOrderValue) * 100 : 0;

      // Calculate repeat customers
      const allCustomerOrders = {};
      allOrders.forEach(order => {
        if (!allCustomerOrders[order.uid]) {
          allCustomerOrders[order.uid] = 0;
        }
        allCustomerOrders[order.uid]++;
      });
      
      const repeatCustomers = Object.values(allCustomerOrders).filter(count => count > 1).length;
      const repeatCustomerPercentage = uniqueCustomers > 0 ? (repeatCustomers / uniqueCustomers) * 100 : 0;

      // Calculate return rate (cancelled/refunded orders)
      const returnedOrders = currentPeriodOrders.filter(order => 
        ['cancelled', 'refunded'].includes(order.status)
      ).length;
      const returnRate = totalOrders > 0 ? (returnedOrders / (totalOrders + returnedOrders)) * 100 : 0;

      setCustomerInsights([
        { 
          metric: 'Repeat Customers', 
          value: `${repeatCustomerPercentage.toFixed(1)}%`, 
          change: `+${customerGrowth.toFixed(1)}%`, 
          trend: customerGrowth >= 0 ? 'up' : 'down' 
        },
        { 
          metric: 'Average Order Value', 
          value: `৳${avgOrderValue.toFixed(0)}`, 
          change: `${avgOrderValueChange >= 0 ? '+' : ''}${avgOrderValueChange.toFixed(1)}%`, 
          trend: avgOrderValueChange >= 0 ? 'up' : 'down' 
        },
        { 
          metric: 'Customer Satisfaction', 
          value: `${averageRating.toFixed(1)}/5`, 
          change: '+0.0', 
          trend: 'up' 
        },
        { 
          metric: 'Return Rate', 
          value: `${returnRate.toFixed(1)}%`, 
          change: '-0.5%', 
          trend: 'down' 
        }
      ]);

    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [user, token, timeRange]);

  if (!user) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Analytics & Reports</h2>
        <p className="text-gray-600">Track your business performance and gain insights into your sales</p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
          <AlertCircle className="h-5 w-5 text-red-500 mr-3" />
          <span className="text-red-700">{error}</span>
          <button 
            onClick={fetchAnalytics}
            className="ml-auto flex items-center px-3 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Retry
          </button>
        </div>
      )}

      {/* Time Range Selector */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <Calendar className="h-5 w-5 text-gray-500" />
          <select 
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            disabled={loading}
            className="border border-gray-300 rounded-md px-3 py-2 disabled:opacity-50"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 3 months</option>
            <option value="365">Last year</option>
          </select>
          {loading && (
            <div className="flex items-center text-sm text-gray-500">
              <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
              Loading...
            </div>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <button 
            onClick={fetchAnalytics}
            disabled={loading}
            className="flex items-center px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button className="flex items-center px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
            <Filter className="h-4 w-4 mr-1" />
            Filter
          </button>
          <button className="flex items-center px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
            <Download className="h-4 w-4 mr-1" />
            Export
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <DollarSign className="h-8 w-8 text-green-600" />
            <div className={`flex items-center space-x-1 ${(analyticsData?.salesGrowth || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {(analyticsData?.salesGrowth || 0) >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              <span className="text-sm font-medium">{(analyticsData?.salesGrowth || 0) >= 0 ? '+' : ''}{(analyticsData?.salesGrowth || 0).toFixed(1)}%</span>
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">৳{(analyticsData?.totalSales || 0).toLocaleString()}</p>
          <p className="text-sm text-gray-600">Total Sales</p>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <ShoppingCart className="h-8 w-8 text-blue-600" />
            <div className={`flex items-center space-x-1 ${(analyticsData?.orderGrowth || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {(analyticsData?.orderGrowth || 0) >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              <span className="text-sm font-medium">{(analyticsData?.orderGrowth || 0) >= 0 ? '+' : ''}{(analyticsData?.orderGrowth || 0).toFixed(1)}%</span>
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{(analyticsData?.totalOrders || 0).toLocaleString()}</p>
          <p className="text-sm text-gray-600">Total Orders</p>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <Users className="h-8 w-8 text-purple-600" />
            <div className={`flex items-center space-x-1 ${(analyticsData?.customerGrowth || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {(analyticsData?.customerGrowth || 0) >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              <span className="text-sm font-medium">{(analyticsData?.customerGrowth || 0) >= 0 ? '+' : ''}{(analyticsData?.customerGrowth || 0).toFixed(1)}%</span>
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{(analyticsData?.totalCustomers || 0).toLocaleString()}</p>
          <p className="text-sm text-gray-600">Total Customers</p>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <Star className="h-8 w-8 text-yellow-600" />
            <div className="flex items-center space-x-1 text-green-600">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm font-medium">+0.0</span>
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{(analyticsData?.averageRating || 0).toFixed(1)}</p>
          <p className="text-sm text-gray-600">Average Rating</p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales Trend</h3>
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">Sales chart would be displayed here</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Volume</h3>
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">Order chart would be displayed here</p>
            </div>
          </div>
        </div>
      </div>

      {/* Top Products */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Products</h3>
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-6">
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse flex items-center space-x-4">
                    <div className="rounded-full bg-gray-200 h-8 w-8"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                    <div className="h-4 bg-gray-200 rounded w-20"></div>
                    <div className="h-4 bg-gray-200 rounded w-16"></div>
                  </div>
                ))}
              </div>
            </div>
          ) : topProducts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sales
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Revenue
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {topProducts.map((product, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Package className="h-8 w-8 text-gray-400 mr-3" />
                          <div className="text-sm font-medium text-gray-900">{product?.name || 'Unknown Product'}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ৳{(product?.revenue || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ৳{(product?.revenue || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {product?.quantity || 0} units
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button className="text-green-600 hover:text-green-900">
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6 text-center">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">No product sales data available</p>
            </div>
          )}
        </div>
      </div>

      {/* Customer Insights */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Insights</h3>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-6 bg-gray-200 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-900">Average Order Value</h4>
                  <div className="flex items-center space-x-1 text-blue-600">
                    <TrendingUp className="h-3 w-3" />
                  </div>
                </div>
                <p className="text-lg font-bold text-gray-900">৳{(customerInsights?.averageOrderValue || 0).toLocaleString()}</p>
              </div>
              
              <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-900">Repeat Customers</h4>
                  <div className="flex items-center space-x-1 text-green-600">
                    <TrendingUp className="h-3 w-3" />
                  </div>
                </div>
                <p className="text-lg font-bold text-gray-900">{customerInsights?.repeatCustomers || 0}</p>
                <p className="text-xs text-gray-500">{(((customerInsights?.repeatCustomers || 0) / ((analyticsData?.totalCustomers || 1))) * 100).toFixed(1)}% of total</p>
              </div>
              
              <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-900">Orders per Customer</h4>
                  <div className="flex items-center space-x-1 text-purple-600">
                    <TrendingUp className="h-3 w-3" />
                  </div>
                </div>
                <p className="text-lg font-bold text-gray-900">{(customerInsights?.ordersPerCustomer || 0).toFixed(1)}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Report Settings */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Report Settings</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900">Automated Reports</h4>
              <p className="text-sm text-gray-600">Receive weekly performance reports via email</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900">Data Retention</h4>
              <p className="text-sm text-gray-600">How long to keep detailed analytics data</p>
            </div>
            <select className="border border-gray-300 rounded-md px-3 py-2">
              <option>6 months</option>
              <option>1 year</option>
              <option>2 years</option>
              <option>3 years</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorAnalyticsSettings;
