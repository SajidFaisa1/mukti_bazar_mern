import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getAllDivision, getAllDistrict, getAllUnion } from 'bd-divisions-to-unions';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import VendorApproval from './VendorApproval';
import UserVerificationStatus from './UserVerificationStatus';
import LiveActivityFeed from './monitoring/LiveActivityFeed';
import MarketAnalytics from './analytics/MarketAnalytics';
import AutomatedRules from './responses/AutomatedRules';
import InventoryOverview from './inventory/InventoryOverview';
import AdminManagement from './management/AdminManagement';
import AdminMessaging from './communication/AdminMessaging';
import PublicAnnouncements from './communication/PublicAnnouncements';
import FinancialOversight from './financial/FinancialOversight';
import AdvancedUserManagement from './users/AdvancedUserManagement';
import ContentProductManagement from './content/ContentProductManagement';
import SystemConfiguration from './system/SystemConfiguration';

const AdminPanel = () => {
  const { token } = useAdminAuth(); // Get admin token
  
  const [activeTab, setActiveTab] = useState('approvals');
  const [products, setProducts] = useState([]);
  const [productError, setProductError] = useState('');
  const [loadingProducts, setLoadingProducts] = useState(true);

  useEffect(() => {
    if (token) {
      loadProducts();
    }
  }, [token]);

  const loadProducts = async () => {
    try {
      const response = await fetch('http://localhost:5005/api/products?status=pending', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }
      const data = await response.json();
      console.log('Admin Panel - Raw API response:', data);
      
      // Handle both old format (direct array) and new format (with products key)
      const productsArray = data.products || data;
      console.log('Admin Panel - Products array:', productsArray);
      console.log('Admin Panel - Products count:', productsArray.length);
      
      setProducts(Array.isArray(productsArray) ? productsArray : []);
    } catch (error) {
      console.error('Error loading products:', error);
      setProductError(error.message);
    } finally {
      setLoadingProducts(false);
    }
  };
  
  const handleProductApprove = async (productId) => {
    try {
      await fetch(`http://localhost:5005/api/products/approve/${productId}`, { 
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      loadProducts();
    } catch (error) {
      console.error('Error approving product:', error);
    }
  };
  
  const handleProductDecline = async (productId) => {
    try {
      await fetch(`http://localhost:5005/api/products/decline/${productId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      loadProducts();
    } catch (error) {
      console.error('Error declining product:', error);
    }
  };

  const ProductApprovals = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Pending Product Approvals</h2>
      {loadingProducts ? (
        <div className="text-center py-12 text-gray-500 bg-white rounded-xl border border-gray-200 animate-pulse">
          Loading...
        </div>
      ) : productError ? (
        <div className="text-center py-12 text-red-600 bg-white rounded-xl border border-red-200">
          Error loading products: {productError}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-white rounded-xl border border-gray-200">
          No pending product approvals
        </div>
      ) : (
        <div className="space-y-4">
          {products.map(product => (
            <div key={product._id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:border-emerald-500 hover:shadow-lg transition-all duration-200">
              <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-gray-50">
                <h3 className="text-lg font-semibold text-gray-900">{product.name}</h3>
                <div className="flex space-x-2">
                  <button
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                    onClick={() => handleProductApprove(product._id)}
                  >
                    Approve
                  </button>
                  <button
                    className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                    onClick={() => handleProductDecline(product._id)}
                  >
                    Decline
                  </button>
                </div>
              </div>
              
              <div className="flex p-6 space-x-4">
                <div className="flex-1">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                    <span className="text-sm text-gray-600">
                      <strong className="text-emerald-600 font-semibold">Vendor:</strong> {product.businessName}
                    </span>
                    <span className="text-sm text-gray-600">
                      <strong className="text-emerald-600 font-semibold">Store ID:</strong> {product.storeId}
                    </span>
                    <span className="text-sm text-gray-600">
                      <strong className="text-emerald-600 font-semibold">Price:</strong> ${product.unitPrice}
                    </span>
                    <span className="text-sm text-gray-600">
                      <strong className="text-emerald-600 font-semibold">Unit Type:</strong> {product.unitType}
                    </span>
                    <span className="text-sm text-gray-600">
                      <strong className="text-emerald-600 font-semibold">Min Order Qty:</strong> {product.minOrderQty}
                    </span>
                    <span className="text-sm text-gray-600">
                      <strong className="text-emerald-600 font-semibold">Stock:</strong> {product.totalQty} units
                    </span>
                    <span className="text-sm text-gray-600">
                      <strong className="text-emerald-600 font-semibold">Category:</strong> {product.category}
                    </span>
                    <span className="text-sm text-gray-600">
                      <strong className="text-emerald-600 font-semibold">Delivery Option:</strong> {product.deliveryOption}
                    </span>
                    <span className="text-sm text-gray-600">
                      <strong className="text-emerald-600 font-semibold">Created At:</strong> {product.createdAt}
                    </span>
                    <span className="text-sm text-gray-600">
                      <strong className="text-emerald-600 font-semibold">Updated At:</strong> {product.updatedAt}
                    </span>
                  </div>
                  {product.description && (
                    <p className="text-sm text-gray-600 line-clamp-2">{product.description}</p>
                  )}
                </div>

                {product.images?.length > 0 && (
                  <div className="flex space-x-2 items-center">
                    {product.images.slice(0, 3).map((image, idx) => (
                      <img 
                        key={idx}
                        src={image.startsWith('http') ? image : `http://localhost:5005/uploads/${image}`} 
                        alt={product.name} 
                        className="w-12 h-12 rounded-lg border border-gray-200 object-cover hover:scale-110 transition-transform duration-200"
                      />
                    ))}
                    {product.images.length > 3 && (
                      <div className="w-12 h-12 rounded-lg border border-gray-200 flex items-center justify-center bg-gray-50 text-xs font-semibold text-gray-600">
                        +{product.images.length - 3}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const Statistics = () => {
    const [stats, setStats] = useState({
      totalUsers: 0,
      pendingApprovals: 0,
      activeVendors: 0,
      totalClients: 0,
      loading: true
    });

    useEffect(() => {
      if (!token) return;
      
      const fetchStats = async () => {
        try {
          setStats(prev => ({ ...prev, loading: true }));
          
          const vendorsRes = await fetch('http://localhost:5005/api/vendors?admin=true', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          const allVendors = await vendorsRes.json();
          
          const clientsRes = await fetch('http://localhost:5005/api/users', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          const allClients = await clientsRes.json();          // Ensure we have arrays
          const vendorsArray = Array.isArray(allVendors) ? allVendors : [];
          const clientsArray = Array.isArray(allClients) ? allClients : [];
          
          const pendingVendors = vendorsArray.filter(v => !v.isApproved);
          const approvedVendors = vendorsArray.filter(v => v.isApproved);
          
          setStats({
            totalUsers: clientsArray.length + vendorsArray.length,
            pendingApprovals: pendingVendors.length,
            activeVendors: approvedVendors.length,
            totalClients: clientsArray.length,
            loading: false
          });
          
        } catch (error) {
          console.error('Error fetching statistics:', error);
          setStats({
            totalUsers: 0,
            pendingApprovals: 0,
            activeVendors: 0,
            totalClients: 0,
            loading: false
          });
        }
      };
      
      fetchStats();
    }, [token]);

    if (stats.loading) {
      return <div className="text-center py-12 text-gray-500 bg-white rounded-xl border border-gray-200 animate-pulse">Loading statistics...</div>;
    }

    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">Dashboard Statistics</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6 text-center hover:-translate-y-1 hover:shadow-lg transition-all duration-200 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-600"></div>
            <div className="text-3xl mb-2">👥</div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Total Users</h3>
            <p className="text-3xl font-bold text-gray-900">{stats.totalUsers}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6 text-center hover:-translate-y-1 hover:shadow-lg transition-all duration-200 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500"></div>
            <div className="text-3xl mb-2">⏳</div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Pending Approvals</h3>
            <p className="text-3xl font-bold text-amber-500">{stats.pendingApprovals}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6 text-center hover:-translate-y-1 hover:shadow-lg transition-all duration-200 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-green-500"></div>
            <div className="text-3xl mb-2">✅</div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Active Vendors</h3>
            <p className="text-3xl font-bold text-green-500">{stats.activeVendors}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6 text-center hover:-translate-y-1 hover:shadow-lg transition-all duration-200 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500"></div>
            <div className="text-3xl mb-2">👤</div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Total Clients</h3>
            <p className="text-3xl font-bold text-blue-500">{stats.totalClients}</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto bg-gray-50 min-h-screen font-sans">
      <div className="mb-8 text-center">
        <h1 className="mb-6 text-gray-900 text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        
        {/* Quick Actions */}
        <div className="mb-6 flex justify-center gap-4">
          <Link 
            to="/admin/fraud-panel" 
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white text-sm font-semibold rounded-lg shadow-lg hover:from-red-700 hover:to-red-800 hover:-translate-y-0.5 hover:shadow-xl transition-all duration-200 border border-red-500/20 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            🛡️ Anti-Syndicate Fraud Panel
          </Link>
          <Link 
            to="/admin/test-fraud" 
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white text-sm font-semibold rounded-lg shadow-lg hover:from-emerald-700 hover:to-emerald-800 hover:-translate-y-0.5 hover:shadow-xl transition-all duration-200 border border-emerald-500/20 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
          >
            🧪 Test Fraud Detection
          </Link>
        </div>
        
        {/* Modern Tab Navigation with Grid Layout */}
        <div className="w-full bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            <button
              className={`px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center justify-center ${
                activeTab === 'approvals'
                  ? 'bg-emerald-600 text-white shadow-md transform scale-105'
                  : 'text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 border border-gray-200 hover:border-emerald-300'
              }`}
              onClick={() => setActiveTab('approvals')}
            >
              <span className="mr-2">👥</span>
              Vendor Approvals
            </button>
            <button
              className={`px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center justify-center ${
                activeTab === 'statistics'
                  ? 'bg-emerald-600 text-white shadow-md transform scale-105'
                  : 'text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 border border-gray-200 hover:border-emerald-300'
              }`}
              onClick={() => setActiveTab('statistics')}
            >
              <span className="mr-2">📊</span>
              Statistics
            </button>
            <button
              className={`px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center justify-center ${
                activeTab === 'products'
                  ? 'bg-emerald-600 text-white shadow-md transform scale-105'
                  : 'text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 border border-gray-200 hover:border-emerald-300'
              }`}
              onClick={() => setActiveTab('products')}
            >
              <span className="mr-2">📦</span>
              Product Approvals
            </button>
            <button
              className={`px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center justify-center ${
                activeTab === 'verification'
                  ? 'bg-emerald-600 text-white shadow-md transform scale-105'
                  : 'text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 border border-gray-200 hover:border-emerald-300'
              }`}
              onClick={() => setActiveTab('verification')}
            >
              <span className="mr-2">✅</span>
              User Verification
            </button>
            <button
              className={`px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center justify-center ${
                activeTab === 'monitoring'
                  ? 'bg-emerald-600 text-white shadow-md transform scale-105'
                  : 'text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 border border-gray-200 hover:border-emerald-300'
              }`}
              onClick={() => setActiveTab('monitoring')}
            >
              <span className="mr-2">📡</span>
              Live Monitoring
            </button>
            <button
              className={`px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center justify-center ${
                activeTab === 'analytics'
                  ? 'bg-emerald-600 text-white shadow-md transform scale-105'
                  : 'text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 border border-gray-200 hover:border-emerald-300'
              }`}
              onClick={() => setActiveTab('analytics')}
            >
              <span className="mr-2">📈</span>
              Market Analytics
            </button>
            <button
              className={`px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center justify-center ${
                activeTab === 'responses'
                  ? 'bg-emerald-600 text-white shadow-md transform scale-105'
                  : 'text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 border border-gray-200 hover:border-emerald-300'
              }`}
              onClick={() => setActiveTab('responses')}
            >
              <span className="mr-2">🤖</span>
              Automated Rules
            </button>
            <button
              className={`px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center justify-center ${
                activeTab === 'inventory'
                  ? 'bg-emerald-600 text-white shadow-md transform scale-105'
                  : 'text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 border border-gray-200 hover:border-emerald-300'
              }`}
              onClick={() => setActiveTab('inventory')}
            >
              <span className="mr-2">📋</span>
              Inventory Control
            </button>
            <button
              className={`px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center justify-center ${
                activeTab === 'admin-management'
                  ? 'bg-emerald-600 text-white shadow-md transform scale-105'
                  : 'text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 border border-gray-200 hover:border-emerald-300'
              }`}
              onClick={() => setActiveTab('admin-management')}
            >
              <span className="mr-2">⚙️</span>
              Admin Management
            </button>
            <button
              className={`px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center justify-center ${
                activeTab === 'advanced-users'
                  ? 'bg-emerald-600 text-white shadow-md transform scale-105'
                  : 'text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 border border-gray-200 hover:border-emerald-300'
              }`}
              onClick={() => setActiveTab('advanced-users')}
            >
              <span className="mr-2">👤</span>
              Advanced Users
            </button>
            <button
              className={`px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center justify-center ${
                activeTab === 'content-products'
                  ? 'bg-emerald-600 text-white shadow-md transform scale-105'
                  : 'text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 border border-gray-200 hover:border-emerald-300'
              }`}
              onClick={() => setActiveTab('content-products')}
            >
              <span className="mr-2">🎯</span>
              Content & Products
            </button>
            <button
              className={`px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center justify-center ${
                activeTab === 'communication'
                  ? 'bg-emerald-600 text-white shadow-md transform scale-105'
                  : 'text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 border border-gray-200 hover:border-emerald-300'
              }`}
              onClick={() => setActiveTab('communication')}
            >
              <span className="mr-2">💬</span>
              Communication
            </button>
            <button
              className={`px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center justify-center ${
                activeTab === 'announcements'
                  ? 'bg-emerald-600 text-white shadow-md transform scale-105'
                  : 'text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 border border-gray-200 hover:border-emerald-300'
              }`}
              onClick={() => setActiveTab('announcements')}
            >
              <span className="mr-2">📢</span>
              Announcements
            </button>
            <button
              className={`px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center justify-center ${
                activeTab === 'financial'
                  ? 'bg-emerald-600 text-white shadow-md transform scale-105'
                  : 'text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 border border-gray-200 hover:border-emerald-300'
              }`}
              onClick={() => setActiveTab('financial')}
            >
              <span className="mr-2">💰</span>
              Financial Oversight
            </button>
            <button
              className={`px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center justify-center ${
                activeTab === 'system-config'
                  ? 'bg-emerald-600 text-white shadow-md transform scale-105'
                  : 'text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 border border-gray-200 hover:border-emerald-300'
              }`}
              onClick={() => setActiveTab('system-config')}
            >
              <span className="mr-2">🔧</span>
              System Configuration
            </button>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        {activeTab === 'approvals' && <VendorApproval token={token} />}
        {activeTab === 'statistics' && <Statistics />}
        {activeTab === 'products' && <ProductApprovals />}
        {activeTab === 'verification' && <UserVerificationStatus token={token} />}
        {activeTab === 'monitoring' && <LiveActivityFeed token={token} />}
        {activeTab === 'analytics' && <MarketAnalytics token={token} />}
        {activeTab === 'responses' && <AutomatedRules token={token} />}
        {activeTab === 'inventory' && <InventoryOverview token={token} />}
        {activeTab === 'admin-management' && <AdminManagement token={token} />}
        {activeTab === 'advanced-users' && <AdvancedUserManagement token={token} />}
        {activeTab === 'content-products' && <ContentProductManagement token={token} />}
        {activeTab === 'communication' && <AdminMessaging token={token} />}
        {activeTab === 'announcements' && <PublicAnnouncements token={token} />}
        {activeTab === 'financial' && <FinancialOversight token={token} />}
        {activeTab === 'system-config' && <SystemConfiguration token={token} />}
      </div>
    </div>
  );
};

export default AdminPanel;
