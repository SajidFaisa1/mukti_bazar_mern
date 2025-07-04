import React, { useState } from 'react';
import { useAuth } from '../../contexts/VendorAuthContext';
import VendorDashboard from '../vendor/VendorDashboard';
import './UserProfile.css';

const UserProfile = () => {
  const { user, role } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');

  const AdminDashboard = () => (
    <div className="admin-dashboard">
      <h3>Admin Dashboard</h3>
      <div className="stats-grid">
        <div className="stat-card">
          <h4>Total Users</h4>
          <p>150</p>
        </div>
        <div className="stat-card">
          <h4>Total Vendors</h4>
          <p>45</p>
        </div>
        <div className="stat-card">
          <h4>Total Products</h4>
          <p>1,234</p>
        </div>
        <div className="stat-card">
          <h4>Pending Approvals</h4>
          <p>12</p>
        </div>
      </div>
    </div>
  );

  // VendorDashboard now lives in its own component

  const ClientDashboard = () => (
    <div className="client-dashboard">
      <h3>My Dashboard</h3>
      <div className="stats-grid">
        <div className="stat-card">
          <h4>Total Orders</h4>
          <p>12</p>
        </div>
        <div className="stat-card">
          <h4>Wishlist Items</h4>
          <p>5</p>
        </div>
        <div className="stat-card">
          <h4>Reviews Given</h4>
          <p>5</p>
        </div>
        <div className="stat-card">
          <h4>Active Cart Items</h4>
          <p>3</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="profile-container">
      <div className="profile-sidebar">
        <div className="user-info">
          <img src={user.profileImage || 'https://via.placeholder.com/150'} alt="Profile" className="profile-image" />
          <h2>{user.name}</h2>
          <p>{user.email}</p>
          <span className="role-badge">{role.charAt(0).toUpperCase() + role.slice(1)}</span>
        </div>
        <div className="profile-nav">
          <button
            className={activeTab === 'profile' ? 'active' : ''}
            onClick={() => setActiveTab('profile')}
          >
            Profile
          </button>
          <button
            className={activeTab === 'orders' ? 'active' : ''}
            onClick={() => setActiveTab('orders')}
          >
            Orders
          </button>
          <button
            className={activeTab === 'settings' ? 'active' : ''}
            onClick={() => setActiveTab('settings')}
          >
            Settings
          </button>
          {role === 'vendor' && (
            <button
              className={activeTab === 'products' ? 'active' : ''}
              onClick={() => setActiveTab('products')}
            >
              Products
            </button>
          )}
        </div>
      </div>
      <div className="profile-content">
        {activeTab === 'profile' && (
          <>
            {role === 'admin' && <AdminDashboard />}
            {role === 'vendor' && <VendorDashboard />}
            {role === 'client' && <ClientDashboard />}
          </>
        )}
        {activeTab === 'orders' && (
          <div className="orders-section">
            <h3>Recent Orders</h3>
            <div className="orders-list">
              {/* Add order items here */}
            </div>
          </div>
        )}
        {activeTab === 'settings' && (
          <div className="settings-section">
            <h3>Account Settings</h3>
            <form className="settings-form">
              <div className="form-group">
                <label>Name</label>
                <input type="text" defaultValue={user.name} />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" defaultValue={user.email} />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input type="tel" defaultValue={user.phone} />
              </div>
              <button type="submit">Save Changes</button>
            </form>
          </div>
        )}
        {activeTab === 'products' && role === 'vendor' && (
          <div className="products-section">
            <h3>My Products</h3>
            <button className="add-product-btn">Add New Product</button>
            <div className="products-grid">
              {/* Add product items here */}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfile;
