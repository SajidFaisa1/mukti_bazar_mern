import React, { useState, useEffect } from 'react';
import { useVendorAuth } from '../../contexts/VendorAuthContext';
import { useClientAuth } from '../../contexts/ClientAuthContext';
import negotiationService from '../../services/negotiationService';
import NegotiationCard from './NegotiationCard';
import './NegotiationDashboard.css';

const NegotiationDashboard = () => {
  const { user: vendorUser } = useVendorAuth();
  const { user: clientUser } = useClientAuth();
  
  const currentUser = vendorUser || clientUser;
  const currentRole = vendorUser ? 'vendor' : 'client';

  const [negotiations, setNegotiations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('active');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Fetch negotiations
  useEffect(() => {
    if (!currentUser) return;

    const fetchNegotiations = async () => {
      try {
        setLoading(true);
        setError('');
        
        const response = await negotiationService.getNegotiations(
          currentUser.uid, 
          currentRole, 
          activeTab
        );
        
        setNegotiations(response.negotiations || []);
      } catch (error) {
        console.error('Error fetching negotiations:', error);
        setError('Failed to load negotiations');
      } finally {
        setLoading(false);
      }
    };

    fetchNegotiations();
  }, [currentUser, currentRole, activeTab, refreshTrigger]);

  // Handle negotiation updates
  const handleNegotiationUpdate = (updatedNegotiation) => {
    setNegotiations(prev => 
      prev.map(neg => 
        neg._id === updatedNegotiation._id ? updatedNegotiation : neg
      )
    );
    // Trigger refresh to get latest data
    setRefreshTrigger(prev => prev + 1);
  };

  // Handle negotiation deletion/cancellation
  const handleNegotiationRemove = (negotiationId) => {
    setNegotiations(prev => prev.filter(neg => neg._id !== negotiationId));
  };

  // Use negotiations directly since backend handles filtering
  const filteredNegotiations = negotiations;

  // Get tab counts - need to fetch all negotiations to show accurate counts
  const [allNegotiations, setAllNegotiations] = useState([]);

  // Fetch all negotiations for tab counts
  useEffect(() => {
    if (!currentUser) return;

    const fetchAllNegotiations = async () => {
      try {
        const response = await negotiationService.getNegotiations(
          currentUser.uid, 
          currentRole, 
          'all'
        );
        setAllNegotiations(response.negotiations || []);
      } catch (error) {
        console.error('Error fetching all negotiations for counts:', error);
      }
    };

    fetchAllNegotiations();
  }, [currentUser, currentRole, refreshTrigger]);

  // Get tab counts
  const getTabCount = (status) => {
    switch (status) {
      case 'active':
        return allNegotiations.filter(n => n.status === 'active').length;
      case 'completed':
        return allNegotiations.filter(n => ['accepted', 'rejected'].includes(n.status)).length;
      case 'expired':
        return allNegotiations.filter(n => n.status === 'expired').length;
      case 'cancelled':
        return allNegotiations.filter(n => n.status === 'cancelled').length;
      default:
        return allNegotiations.length;
    }
  };

  if (!currentUser) {
    return (
      <div className="negotiation-dashboard">
        <div className="no-auth-message">
          <h3>Please log in to view your negotiations</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="negotiation-dashboard">
      <div className="dashboard-header">
        <h2>My Negotiations</h2>
        <button 
          className="refresh-button"
          onClick={() => setRefreshTrigger(prev => prev + 1)}
          disabled={loading}
        >
          🔄 Refresh
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button
          className={`tab-button ${activeTab === 'active' ? 'active' : ''}`}
          onClick={() => setActiveTab('active')}
        >
          Active ({getTabCount('active')})
        </button>
        <button
          className={`tab-button ${activeTab === 'completed' ? 'active' : ''}`}
          onClick={() => setActiveTab('completed')}
        >
          Completed ({getTabCount('completed')})
        </button>
        <button
          className={`tab-button ${activeTab === 'expired' ? 'active' : ''}`}
          onClick={() => setActiveTab('expired')}
        >
          Expired ({getTabCount('expired')})
        </button>
        <button
          className={`tab-button ${activeTab === 'cancelled' ? 'active' : ''}`}
          onClick={() => setActiveTab('cancelled')}
        >
          Cancelled ({getTabCount('cancelled')})
        </button>
        <button
          className={`tab-button ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          All ({getTabCount('all')})
        </button>
      </div>

      {/* Content */}
      <div className="dashboard-content">
        {loading ? (
          <div className="loading-message">
            <div className="spinner"></div>
            <p>Loading negotiations...</p>
          </div>
        ) : error ? (
          <div className="error-message">
            <p>{error}</p>
            <button onClick={() => setRefreshTrigger(prev => prev + 1)}>
              Try Again
            </button>
          </div>
        ) : filteredNegotiations.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">💰</div>
            <h3>No negotiations found</h3>
            <p>
              {activeTab === 'active' 
                ? "You don't have any active negotiations. Start negotiating on products to see them here!"
                : `No ${activeTab} negotiations found.`
              }
            </p>
          </div>
        ) : (
          <div className="negotiations-grid">
            {filteredNegotiations.map(negotiation => (
              <NegotiationCard
                key={negotiation._id}
                negotiation={negotiation}
                currentUser={currentUser}
                currentRole={currentRole}
                onUpdate={handleNegotiationUpdate}
                onRemove={handleNegotiationRemove}
              />
            ))}
          </div>
        )}
      </div>

      {/* Summary Stats */}
      {allNegotiations.length > 0 && (
        <div className="dashboard-stats">
          <div className="stat-card">
            <div className="stat-number">{getTabCount('active')}</div>
            <div className="stat-label">Active</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{getTabCount('completed')}</div>
            <div className="stat-label">Completed</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">
              {allNegotiations.filter(n => n.status === 'accepted').length}
            </div>
            <div className="stat-label">Successful</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">
              {allNegotiations.reduce((total, n) => {
                if (n.status === 'accepted') {
                  const lastOffer = negotiationService.getLastOffer(n);
                  return total + (lastOffer ? lastOffer.price * lastOffer.quantity : 0);
                }
                return total;
              }, 0).toFixed(0)}
            </div>
            <div className="stat-label">Total Value (৳)</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NegotiationDashboard;
