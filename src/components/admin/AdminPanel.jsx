import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getAllDivision, getAllDistrict, getAllUnion } from 'bd-divisions-to-unions';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import VendorApproval from './VendorApproval';
import './AdminPanel.css';
import UserVerificationStatus from './UserVerificationStatus';

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
    <div className="product-approvals">
      <h2>Pending Product Approvals</h2>
      {loadingProducts ? (
        <div className="loading">Loading...</div>
      ) : productError ? (
        <div className="error">Error loading products: {productError}</div>
      ) : products.length === 0 ? (
        <div className="no-products">No pending product approvals</div>
      ) : (
        <div className="products-list">
          {products.map(product => (
            <div key={product._id} className="product-card">
              <div className="product-header">
                <h3 className="product-title">{product.name}</h3>
                <div className="product-actions">
                  <button
                    className="approve-btn"
                    onClick={() => handleProductApprove(product._id)}
                  >
                    Approve
                  </button>
                  <button
                    className="decline-btn"
                    onClick={() => handleProductDecline(product._id)}
                  >
                    Decline
                  </button>
                </div>
              </div>
              
              <div className="product-content">
                <div className="product-details">
                  <div className="product-meta">
                    <span className="meta-item">
                      <strong>Vendor:</strong> {product.businessName}
                    </span>
                    <span className="meta-item">
                      <strong>Store ID:</strong> {product.storeId}
                    </span>
                    <span className="meta-item">
                      <strong>Price:</strong> ${product.unitPrice}
                    </span>
                    <span className="meta-item">
                      <strong>Unit Type:</strong> {product.unitType}
                    </span>
                    <span className="meta-item">
                      <strong>Min Order Qty:</strong> {product.minOrderQty}
                    </span>
                    
                    <span className="meta-item">
                      <strong>Stock:</strong> {product.totalQty} units
                    </span>
                    <span className="meta-item">
                      <strong>Category:</strong> {product.category}
                    </span>
                    <span className="meta-item">
                      <strong>Delivery Option:</strong> {product.deliveryOption}
                    </span>
                  
                    <span className="meta-item">
                      <strong>Created At:</strong> {product.createdAt}
                    </span>
                    <span className="meta-item">
                      <strong>Updated At:</strong> {product.updatedAt}
                    </span>
                    
                   
                    
                  </div>
                  {product.description && (
                    <p className="product-description">{product.description}</p>
                  )}
                </div>

                {product.images?.length > 0 && (
                  <div className="product-images">
                    {product.images.slice(0, 3).map((image, idx) => (
                      <img 
                        key={idx}
                        src={image.startsWith('http') ? image : `http://localhost:5005/uploads/${image}`} 
                        alt={product.name} 
                        className="product-image"
                      />
                    ))}
                    {product.images.length > 3 && (
                      <div className="more-images">+{product.images.length - 3}</div>
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
      return <div className="loading">Loading statistics...</div>;
    }

    return (
      <div className="admin-statistics">
        <h2>Dashboard Statistics</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">👥</div>
            <h3>Total Users</h3>
            <p className="stat-number">{stats.totalUsers}</p>
          </div>
          <div className="stat-card warning">
            <div className="stat-icon">⏳</div>
            <h3>Pending Approvals</h3>
            <p className="stat-number">{stats.pendingApprovals}</p>
          </div>
          <div className="stat-card success">
            <div className="stat-icon">✅</div>
            <h3>Active Vendors</h3>
            <p className="stat-number">{stats.activeVendors}</p>
          </div>
          <div className="stat-card info">
            <div className="stat-icon">👤</div>
            <h3>Total Clients</h3>
            <p className="stat-number">{stats.totalClients}</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h1>Admin Dashboard</h1>
        
        {/* Quick Actions */}
        <div className="admin-quick-actions">
          <Link to="/admin/fraud-panel" className="fraud-panel-link">
            🛡️ Anti-Syndicate Fraud Panel
          </Link>
          <Link to="/admin/test-fraud" className="test-panel-link">
            🧪 Test Fraud Detection
          </Link>
        </div>
        
        <div className="tab-navigation">
          <button
            className={activeTab === 'approvals' ? 'active' : ''}
            onClick={() => setActiveTab('approvals')}
          >
            Vendor Approvals
          </button>
          <button
            className={activeTab === 'statistics' ? 'active' : ''}
            onClick={() => setActiveTab('statistics')}
          >
            Statistics
          </button>
          <button
            className={activeTab === 'products' ? 'active' : ''}
            onClick={() => setActiveTab('products')}
          >
            Product Approvals
          </button>
          <button
            className={activeTab === 'verification' ? 'active' : ''}
            onClick={() => setActiveTab('verification')}
          >
            User Verification Status
          </button>
        </div>
      </div>
      
      <div className="admin-content">
        {activeTab === 'approvals' && <VendorApproval token={token} />}
        {activeTab === 'statistics' && <Statistics />}
        {activeTab === 'products' && <ProductApprovals />}
  {activeTab === 'verification' && <UserVerificationStatus token={token} />}
      </div>
    </div>
  );
};

export default AdminPanel;
