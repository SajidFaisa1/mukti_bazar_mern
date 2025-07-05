import React, { useState, useEffect, useMemo } from 'react';
import { getAllDivision, getAllDistrict, getAllUnion } from 'bd-divisions-to-unions';
import './AdminPanel.css';

const AdminPanel = () => {
  const divisionMap = useMemo(() => {
    const obj = {};
    Object.values(getAllDivision('en')).forEach(d => { obj[d.value] = d.title; });
    return obj;
  }, []);
  
  const districtMap = useMemo(() => {
    const obj = {};
    const all = getAllDistrict('en');
    Object.keys(all).forEach(divId => {
      all[divId].forEach(dist => { obj[dist.value] = dist.title; });
    });
    return obj;
  }, []);
  
  const unionMap = useMemo(() => {
    const obj = {};
    const all = getAllUnion('en');
    Object.keys(all).forEach(upId => {
      all[upId].forEach(un => { obj[un.value] = un.title; });
    });
    return obj;
  }, []);

  const formatAddress = (addr) => {
    if (!addr) return null;
    const parts = [];
    if (addr.division && divisionMap[addr.division]) parts.push(divisionMap[addr.division]);
    if (addr.district && districtMap[addr.district]) parts.push(districtMap[addr.district]);
    if (addr.union && unionMap[addr.union]) parts.push(unionMap[addr.union]);
    if (parts.length === 0) return null;
    return <p><strong>Address:</strong> {parts.join(', ')}</p>;
  };
  
  const [activeTab, setActiveTab] = useState('approvals');
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [productError, setProductError] = useState('');
  const [loadingProducts, setLoadingProducts] = useState(true);

  useEffect(() => {
    loadVendors();
  }, []);
  
  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const response = await fetch('http://localhost:5005/api/products?status=pending');
      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }
      const data = await response.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading products:', error);
      setProductError(error.message);
    } finally {
      setLoadingProducts(false);
    }
  };
  
  const handleProductApprove = async (productId) => {
    try {
      await fetch(`http://localhost:5005/api/products/approve/${productId}`, { method: 'PATCH' });
      loadProducts();
    } catch (error) {
      console.error('Error approving product:', error);
    }
  };
  
  const handleProductDecline = async (productId) => {
    try {
      await fetch(`http://localhost:5005/api/products/decline/${productId}`, {
        method: 'POST'
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

  const loadVendors = async () => {
    try {
      const response = await fetch('http://localhost:5005/api/vendors/pending');
      if (!response.ok) {
        throw new Error('Failed to load vendors');
      }
      const data = await response.json();
      setVendors(data);
    } catch (error) {
      console.error('Error loading vendors:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (vendorId) => {
    try {
      await fetch(`http://localhost:5005/api/vendors/approve/${vendorId}`, { method: 'PATCH' });
      loadVendors();
    } catch (error) {
      console.error('Error approving vendor:', error);
    }
  };

  const handleDecline = async (vendorId) => {
    try {
      await fetch(`http://localhost:5005/api/vendors/${vendorId}`, {
        method: 'DELETE'
      });
      loadVendors();
    } catch (error) {
      console.error('Error declining vendor:', error);
    }
  };

  const VendorApprovals = () => (
    <div className="vendor-approvals">
      <h2>Pending Vendor Approvals</h2>
      {loading ? (
        <div className="loading">Loading...</div>
      ) : vendors.length === 0 ? (
        <div className="no-vendors">No pending vendor approvals</div>
      ) : (
        <div className="vendors-list">
          {vendors.map(vendor => (
            <div key={vendor.id} className="vendor-card">
              <div className="vendor-info">
                <h3>{vendor.businessName || vendor.sellerName || vendor.name}</h3>
                <p><strong>Email:</strong> {vendor.email}</p>
                <p><strong>Phone:</strong> {vendor.phone}</p>
                <p><strong>Store ID:</strong> {vendor.storeId}</p>
                {vendor.address && formatAddress(vendor.address)}
                <div className="document-links">
                  {(vendor.shopLogo?.url || vendor.shopLogo?.filename) && (
                    <div className="document-preview">
                      <h4>Shop Logo:</h4>
                      <img 
                        src={vendor.shopLogo?.url ?? `http://localhost:5005/uploads/${vendor.shopLogo.filename}`} 
                        alt="Shop Logo" 
                        style={{ width: '150px', height: '150px', objectFit: 'cover' }} 
                      />
                    </div>
                  )}
                  {(vendor.kycDocument?.url || vendor.kycDocument?.filename) && (
                    <div className="document-preview">
                      <h4>KYC Document:</h4>
                      <a 
                        href={vendor.kycDocument?.url ?? `http://localhost:5005/uploads/${vendor.kycDocument.filename}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="document-link"
                      >
                        View KYC Document
                      </a>
                    </div>
                  )}
                  {(vendor.farmingLicense?.url || vendor.farmingLicense?.filename) && (
                    <div className="document-preview">
                      <h4>Farming License:</h4>
                      <a 
                        href={vendor.farmingLicense?.url ?? `http://localhost:5005/uploads/${vendor.farmingLicense.filename}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="document-link"
                      >
                        View Farming License
                      </a>
                    </div>
                  )}
                </div>
              </div>
              <div className="vendor-actions">
                <button
                  className="approve-btn"
                  onClick={() => handleApprove(vendor.id)}
                >
                  Approve
                </button>
                <button
                  className="decline-btn"
                  onClick={() => handleDecline(vendor.id)}
                >
                  Decline
                </button>
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
      const fetchStats = async () => {
        try {
          setStats(prev => ({ ...prev, loading: true }));
          
          const vendorsRes = await fetch('http://localhost:5005/api/vendors');
          const allVendors = await vendorsRes.json();
          
          const clientsRes = await fetch('http://localhost:5005/api/users');
          const allClients = await clientsRes.json();
          
          const pendingVendors = allVendors.filter(v => !v.isApproved);
          const approvedVendors = allVendors.filter(v => v.isApproved);
          
          setStats({
            totalUsers: allClients.length + allVendors.length,
            pendingApprovals: pendingVendors.length,
            activeVendors: approvedVendors.length,
            totalClients: allClients.length,
            loading: false
          });
          
        } catch (error) {
          console.error('Error fetching statistics:', error);
          setStats(prev => ({ ...prev, loading: false }));
        }
      };
      
      fetchStats();
    }, []);

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
        </div>
      </div>
      
      <div className="admin-content">
        {activeTab === 'approvals' && <VendorApprovals />}
        {activeTab === 'statistics' && <Statistics />}
        {activeTab === 'products' && <ProductApprovals />}
      </div>
    </div>
  );
};

export default AdminPanel;
