import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/VendorAuthContext';
import { Link } from 'react-router-dom';
import './VendorDashboard.css';

/*
  VendorDashboard shows high-level shop metrics plus quick actions.
  – If vendor profile is incomplete → prompt to complete.
  – If awaiting admin approval → show notice but still allow profile editing.
  – Otherwise fetch & display stats from backend (placeholder counts if API not ready).
*/
const VendorDashboard = () => {
  const { user, isApproved } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch dashboard metrics – replace endpoint when backend ready
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const res = await fetch(`http://localhost:5005/api/vendors/${user.storeId}/stats`);
        if (!res.ok) throw new Error('Failed to load stats');
        const data = await res.json();
        setStats(data);
      } catch (err) {
        console.error(err);
        // fallback placeholders
        setStats({ products: 0, orders: 0, revenue: 0, activeListings: 0 });
        setError('Could not load live stats');
      } finally {
        setLoading(false);
      }
    };
    if (user?.storeId) fetchStats();
  }, [user?.storeId]);

  if (!user) return null;

  // profile not completed
  if (!user.profileCompleted) {
    return (
      <div className="vendor-dashboard pending-profile">
        <h3>Complete Your Profile</h3>
        <p>Your vendor profile is incomplete. Please finish it to start selling.</p>
        <Link className="btn primary" to="/vendor/profile">Complete Profile</Link>
      </div>
    );
  }

  return (
    <div className="vendor-dashboard">
      {!isApproved && (
        <div className="alert info">
          Your account is under review. You can manage products, but they will be public once approved.
        </div>
      )}

      <h3>Dashboard Overview</h3>
      {loading ? (
        <p>Loading metrics...</p>
      ) : (
        <div className="stats-grid">
          <div className="stat-card">
            <h4>Total Products</h4>
            <p>{stats?.products ?? '--'}</p>
          </div>
          <div className="stat-card">
            <h4>Total Orders</h4>
            <p>{stats?.orders ?? '--'}</p>
          </div>
          <div className="stat-card">
            <h4>Revenue</h4>
            <p>${stats?.revenue ?? '--'}</p>
          </div>
          <div className="stat-card">
            <h4>Active Listings</h4>
            <p>{stats?.activeListings ?? '--'}</p>
          </div>
        </div>
      )}

      {error && <p className="error-text">{error}</p>}

      <div className="action-buttons">
        <Link className="btn" to="/vendor/products">Manage Products</Link>
        <Link className="btn" to="/vendor/orders">View Orders</Link>
        <Link className="btn" to="/vendor/barter">Barter Management</Link>
        <Link className="btn" to="/vendor/profile">Edit Profile</Link>
      </div>
    </div>
 );
};

export default VendorDashboard;
