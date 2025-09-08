import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/VendorAuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Link } from 'react-router-dom';
import {
  ShoppingBagIcon, 
  ChartBarIcon, 
  CurrencyDollarIcon, 
  EyeIcon,
  PlusIcon,
  ClipboardDocumentListIcon,
  UserIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ClockIcon,
  ArrowsRightLeftIcon,
  SunIcon,
  MoonIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';

/*
  VendorDashboard shows high-level shop metrics plus quick actions.
  – If vendor profile is incomplete → prompt to complete.
  – If awaiting admin approval → show notice but still allow profile editing.
  – Otherwise fetch & display stats from backend (placeholder counts if API not ready).
*/
const VendorDashboard = () => {
  const { user, isApproved, token, loading: authLoading } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [recentActivity, setRecentActivity] = useState([]);
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

  // Fetch dashboard metrics and analytics data
  useEffect(() => {
    const fetchDashboardData = async () => {
      // Don't fetch if still loading auth or no user
      if (authLoading || !user?.storeId) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        setError('');
        
        // Fetch analytics data which will also populate stats
        await fetchAnalyticsData();
        
        // Mock recent activity for demo
        setRecentActivity([
          { id: 1, type: 'order', message: 'New order #1234 received', time: '2 hours ago', status: 'new' },
          { id: 2, type: 'product', message: 'Product "Organic Tomatoes" updated', time: '5 hours ago', status: 'success' },
          { id: 3, type: 'review', message: 'New review (4.5★) on "Fresh Carrots"', time: '1 day ago', status: 'success' },
        ]);
        
      } catch (err) {
        console.error('Dashboard data fetch error:', err);
        setError('Could not load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, [user?.storeId, token, authLoading]);

  // Fetch analytics data for 30 days and populate dashboard stats
  const fetchAnalyticsData = async () => {
    try {
      // Use token from context, fallback to sessionStorage
      const authToken = token || sessionStorage.getItem('vendorToken');
      if (!authToken) {
        console.log('No vendor token found - user may not be logged in');
        // Set fallback data
        setStats({
          products: 0,
          orders: 0,
          revenue: 0,
          activeListings: 0,
          ordersGrowth: 0,
          revenueGrowth: 0
        });
        setAnalyticsData({
          totalSales: 0,
          totalOrders: 0,
          totalCustomers: 0,
          averageRating: user?.storeRatingAvg || 0,
          salesGrowth: 0,
          orderGrowth: 0,
          customerGrowth: 0
        });
        return;
      }

      const response = await fetch(`http://localhost:5005/api/orders/vendor/orders?limit=1000`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const allOrders = data.orders || [];
        
        // Calculate analytics for last 30 days
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 30);

        const currentPeriodOrders = allOrders.filter(order => 
          new Date(order.orderedAt) >= cutoffDate && 
          ['confirmed', 'processing', 'shipped', 'delivered'].includes(order.status)
        );

        // Calculate previous period for growth comparison
        const previousCutoffDate = new Date();
        previousCutoffDate.setDate(previousCutoffDate.getDate() - 60);
        
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

        // Calculate growth
        const previousSales = previousPeriodOrders.reduce((sum, order) => sum + order.total, 0);
        const previousOrders = previousPeriodOrders.length;
        const previousCustomers = new Set(previousPeriodOrders.map(order => order.uid)).size;

        const salesGrowth = previousSales > 0 ? ((totalSales - previousSales) / previousSales) * 100 : 0;
        const orderGrowth = previousOrders > 0 ? ((totalOrders - previousOrders) / previousOrders) * 100 : 0;
        const customerGrowth = previousCustomers > 0 ? ((uniqueCustomers - previousCustomers) / previousCustomers) * 100 : 0;

        // Set analytics data
        setAnalyticsData({
          totalSales,
          totalOrders,
          totalCustomers: uniqueCustomers,
          averageRating: user.storeRatingAvg || 0,
          salesGrowth,
          orderGrowth,
          customerGrowth
        });

        // Also set the stats data for the main dashboard cards
        // Calculate total products and active listings (we'll need to fetch products separately)
        try {
          // Use storeId for products API (not uid)
          const storeId = user.storeId;
          console.log('Fetching products for storeId:', storeId);
          
          const productsResponse = await fetch(`http://localhost:5005/api/products/vendor/${storeId}`, {
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'Content-Type': 'application/json'
            }
          });
          
          console.log('Products API response status:', productsResponse.status);
          
          if (productsResponse.ok) {
            const productsData = await productsResponse.json();
            console.log('Products data received:', productsData);
            const products = productsData || []; // API returns array directly
            const activeListings = products.filter(p => p.isActive !== false).length;
            
            setStats({
              products: products.length,
              orders: totalOrders,
              revenue: totalSales,
              activeListings: activeListings,
              ordersGrowth: orderGrowth,
              revenueGrowth: salesGrowth
            });
          } else {
            console.log('Products API failed with status:', productsResponse.status);
            const errorText = await productsResponse.text();
            console.log('Products API error:', errorText);
            
            // Fallback stats without product data
            setStats({
              products: 0,
              orders: totalOrders,
              revenue: totalSales,
              activeListings: 0,
              ordersGrowth: orderGrowth,
              revenueGrowth: salesGrowth
            });
          }
        } catch (productErr) {
          console.log('Could not fetch products:', productErr);
          // Fallback stats without product data
          setStats({
            products: 0,
            orders: totalOrders,
            revenue: totalSales,
            activeListings: 0,
            ordersGrowth: orderGrowth,
            revenueGrowth: salesGrowth
          });
        }

        // Calculate top products
        const productSales = {};
        currentPeriodOrders.forEach(order => {
          order.items.forEach(item => {
            const productId = item.productId || item.product?._id;
            const productName = item.name;
            const itemTotal = (item.price || item.unitPrice || 0) * item.quantity;
            
            if (!productSales[productId]) {
              productSales[productId] = {
                name: productName,
                sales: 0,
                quantity: 0
              };
            }
            
            productSales[productId].sales += itemTotal;
            productSales[productId].quantity += item.quantity;
          });
        });

        const topProductsArray = Object.values(productSales)
          .sort((a, b) => b.sales - a.sales)
          .slice(0, 3);

        setTopProducts(topProductsArray);
        
      } else {
        console.log('Failed to fetch orders:', response.status);
        // Set fallback data
        setStats({
          products: 0,
          orders: 0,
          revenue: 0,
          activeListings: 0,
          ordersGrowth: 0,
          revenueGrowth: 0
        });
        setAnalyticsData({
          totalSales: 0,
          totalOrders: 0,
          totalCustomers: 0,
          averageRating: user.storeRatingAvg || 0,
          salesGrowth: 0,
          orderGrowth: 0,
          customerGrowth: 0
        });
      }
    } catch (err) {
      console.log('Analytics fetch failed:', err);
      // Set fallback data
      setStats({
        products: 0,
        orders: 0,
        revenue: 0,
        activeListings: 0,
        ordersGrowth: 0,
        revenueGrowth: 0
      });
      setAnalyticsData({
        totalSales: 0,
        totalOrders: 0,
        totalCustomers: 0,
        averageRating: user.storeRatingAvg || 0,
        salesGrowth: 0,
        orderGrowth: 0,
        customerGrowth: 0
      });
    }
  };

  // Loading skeleton component
  const StatCardSkeleton = () => (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-lg"></div>
        <div className="w-4 h-4 bg-gray-300 dark:bg-gray-600 rounded"></div>
      </div>
      <div className="w-16 h-8 bg-gray-300 dark:bg-gray-600 rounded mb-2"></div>
      <div className="w-24 h-4 bg-gray-300 dark:bg-gray-600 rounded"></div>
    </div>
  );

  // Stat card component
  const StatCard = ({ title, value, icon: Icon, growth, color = "teal" }) => {
    const isPositive = growth >= 0;
    const colorClasses = {
      teal: "bg-teal-50 text-teal-600 dark:bg-teal-900/20 dark:text-teal-400",
      blue: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
      green: "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400",
      purple: "bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400"
    };

    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
            <Icon className="w-6 h-6" />
          </div>
          {growth !== undefined && (
            <div className={`flex items-center text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {isPositive ? <ArrowTrendingUpIcon className="w-4 h-4 mr-1" /> : <ArrowTrendingDownIcon className="w-4 h-4 mr-1" />}
              {Math.abs(growth)}%
            </div>
          )}
        </div>
        <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
          {value ?? '--'}
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400">{title}</div>
      </div>
    );
  };

  // Dark mode toggle component
  const DarkModeToggle = () => (
    <div className="flex items-center space-x-2">
      <SunIcon className={`w-5 h-5 ${!isDarkMode ? 'text-yellow-500' : 'text-gray-400'}`} />
      <button
        onClick={toggleTheme}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 ${
          isDarkMode ? 'bg-teal-600' : 'bg-gray-200'
        }`}
        role="switch"
        aria-checked={isDarkMode}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            isDarkMode ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
      <MoonIcon className={`w-5 h-5 ${isDarkMode ? 'text-teal-400' : 'text-gray-400'}`} />
    </div>
  );

  if (!user) return null;

  // profile not completed
  if (!user.profileCompleted) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <ExclamationTriangleIcon className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Complete Your Profile
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Your vendor profile is incomplete. Please finish it to start selling on our platform.
          </p>
          <Link 
            className="inline-flex items-center px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg transition-colors"
            to="/vendor/profile"
          >
            <UserIcon className="w-5 h-5 mr-2" />
            Complete Profile
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Dashboard Overview
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Welcome back, {user.name || 'Vendor'}! Here's what's happening with your store.
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
              <span>Dark Mode</span>
              <DarkModeToggle />
            </div>
          </div>
        </div>

        {/* Approval Notice */}
        {!isApproved && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-8">
            <div className="flex items-start">
              <ClockIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Account Under Review
                </h4>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  Your account is under review. You can manage products, but they will be public once approved.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {loading ? (
            <>
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </>
          ) : (
            <>
              <StatCard
                title="Total Products"
                value={stats?.products}
                icon={ShoppingBagIcon}
                color="teal"
              />
              <StatCard
                title="Total Orders"
                value={stats?.orders}
                icon={ChartBarIcon}
                growth={stats?.ordersGrowth}
                color="blue"
              />
              <StatCard
                title="Revenue"
                value={stats?.revenue ? `$${stats.revenue}` : '$0'}
                icon={CurrencyDollarIcon}
                growth={stats?.revenueGrowth}
                color="green"
              />
              <StatCard
                title="Active Listings"
                value={stats?.activeListings}
                icon={EyeIcon}
                color="purple"
              />
            </>
          )}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Quick Actions */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">
                Quick Actions
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Link
                  to="/vendor/products/new"
                  className="flex items-center p-4 bg-teal-50 dark:bg-teal-900/20 rounded-lg hover:bg-teal-100 dark:hover:bg-teal-900/30 transition-colors group"
                >
                  <div className="p-2 bg-teal-100 dark:bg-teal-900/40 rounded-lg mr-4">
                    <PlusIcon className="w-6 h-6 text-teal-600 dark:text-teal-400" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">Add Product</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Create new listing</p>
                  </div>
                </Link>

                <Link
                  to="/vendor/products"
                  className="flex items-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors group"
                >
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg mr-4">
                    <ShoppingBagIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">Manage Products</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Edit your listings</p>
                  </div>
                </Link>

                <Link
                  to="/vendor/orders"
                  className="flex items-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors group"
                >
                  <div className="p-2 bg-green-100 dark:bg-green-900/40 rounded-lg mr-4">
                    <ClipboardDocumentListIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">View Orders</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Process orders</p>
                  </div>
                </Link>

                <Link
                  to="/vendor/barter"
                  className="flex items-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors group"
                >
                  <div className="p-2 bg-yellow-100 dark:bg-yellow-900/40 rounded-lg mr-4">
                    <ArrowsRightLeftIcon className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">Barter Management</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Trade with vendors</p>
                  </div>
                </Link>

                <Link
                  to="/vendor/profile"
                  className="flex items-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors group"
                >
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/40 rounded-lg mr-4">
                    <UserIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">Edit Profile</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Update store info</p>
                  </div>
                </Link>

                <Link
                  to="/settings"
                  className="flex items-center p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors group"
                >
                  <div className="p-2 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg mr-4">
                    <ChartBarIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">Analytics</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">View detailed insights</p>
                  </div>
                </Link>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">
                Recent Activity
              </h3>
              <div className="space-y-4">
                {recentActivity.length > 0 ? (
                  recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-start space-x-3">
                      <div className={`w-2 h-2 rounded-full mt-2 ${
                        activity.status === 'new' ? 'bg-blue-500' : 'bg-green-500'
                      }`}></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900 dark:text-gray-100">
                          {activity.message}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {activity.time}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                    No recent activity
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Analytics Section */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Analytics Overview (Last 30 Days)
            </h2>
            <Link 
              to="/settings" 
              className="text-sm text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 font-medium"
            >
              View Full Analytics →
            </Link>
          </div>

          {/* Analytics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg">
                  <CurrencyDollarIcon className="w-6 h-6" />
                </div>
                <div className={`flex items-center text-sm ${analyticsData.salesGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {analyticsData.salesGrowth >= 0 ? 
                    <ArrowTrendingUpIcon className="w-4 h-4 mr-1" /> : 
                    <ArrowTrendingDownIcon className="w-4 h-4 mr-1" />
                  }
                  {analyticsData.salesGrowth >= 0 ? '+' : ''}{analyticsData.salesGrowth.toFixed(1)}%
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
                ৳{analyticsData.totalSales.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Sales</div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg">
                  <ClipboardDocumentListIcon className="w-6 h-6" />
                </div>
                <div className={`flex items-center text-sm ${analyticsData.orderGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {analyticsData.orderGrowth >= 0 ? 
                    <ArrowTrendingUpIcon className="w-4 h-4 mr-1" /> : 
                    <ArrowTrendingDownIcon className="w-4 h-4 mr-1" />
                  }
                  {analyticsData.orderGrowth >= 0 ? '+' : ''}{analyticsData.orderGrowth.toFixed(1)}%
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
                {analyticsData.totalOrders}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Orders Completed</div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-lg">
                  <UserIcon className="w-6 h-6" />
                </div>
                <div className={`flex items-center text-sm ${analyticsData.customerGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {analyticsData.customerGrowth >= 0 ? 
                    <ArrowTrendingUpIcon className="w-4 h-4 mr-1" /> : 
                    <ArrowTrendingDownIcon className="w-4 h-4 mr-1" />
                  }
                  {analyticsData.customerGrowth >= 0 ? '+' : ''}{analyticsData.customerGrowth.toFixed(1)}%
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
                {analyticsData.totalCustomers}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Unique Customers</div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 rounded-lg">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </div>
                <div className="flex items-center text-sm text-green-600">
                  <ArrowTrendingUpIcon className="w-4 h-4 mr-1" />
                  Stable
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
                {analyticsData.averageRating.toFixed(1)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Average Rating</div>
            </div>
          </div>

          {/* Top Products Section */}
          {topProducts.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Top Selling Products
                </h3>
                <CalendarIcon className="w-5 h-5 text-gray-400" />
              </div>
              <div className="space-y-4">
                {topProducts.map((product, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-teal-100 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400 rounded-lg flex items-center justify-center text-sm font-medium">
                        #{index + 1}
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-gray-100">{product.name}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{product.quantity} units sold</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-900 dark:text-gray-100">৳{product.sales.toLocaleString()}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Revenue</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="w-5 h-5 text-red-600 dark:text-red-400 mr-2" />
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VendorDashboard;
