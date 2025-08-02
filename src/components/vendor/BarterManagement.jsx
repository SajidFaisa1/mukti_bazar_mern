import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { FaExchangeAlt, FaClock, FaCheck, FaTimes, FaEye, FaPlus } from 'react-icons/fa';
import CreateBarterModal from './CreateBarterModal';
import './BarterManagement.css';

const  BarterManagement = () => {
  const [barters, setBarters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedBarter, setSelectedBarter] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showCounterOfferModal, setShowCounterOfferModal] = useState(false);
  const [showCreateBarterModal, setShowCreateBarterModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchBarters();
  }, [filter, statusFilter]);

  const fetchBarters = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('vendorToken') || sessionStorage.getItem('vendorToken');
      
      if (!token) {
        setError('Authentication required. Please log in.');
        setLoading(false);
        return;
      }
      
      console.log('🔍 Fetching barters...');
      console.log('Filter:', filter, 'Status:', statusFilter);
      
      const params = new URLSearchParams();
      
      if (filter === 'received') {
        const response = await fetch('http://localhost:5005/api/barter/received', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            let filteredBarters = data.barters || [];
            
            if (statusFilter !== 'all') {
              filteredBarters = filteredBarters.filter(barter => barter.status === statusFilter);
            }
            
            setBarters(filteredBarters);
          } else {
            setError(`API Error: ${data.message || 'Unknown error'}`);
          }
        } else {
          const errorText = await response.text();
          setError(`HTTP Error: ${response.status} - ${errorText}`);
        }
      } else {
        if (filter === 'sent') {
          params.append('type', 'sent');
        } else if (filter === 'all') {
          params.append('type', 'all');
        }
        
        if (statusFilter !== 'all') {
          params.append('status', statusFilter);
        }
        
        const url = `http://localhost:5005/api/barter?${params}`;
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setBarters(data.barters || []);
          } else {
            setError(`API Error: ${data.message || 'Unknown error'}`);
          }
        } else {
          const errorText = await response.text();
          setError(`HTTP Error: ${response.status} - ${errorText}`);
        }
      }
    } catch (error) {
      console.error('Network error:', error);
      setError(`Network error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#FFA500';
      case 'accepted': return '#4CAF50';
      case 'rejected': return '#f44336';
      case 'counter-offered': return '#2196F3';
      case 'completed': return '#9C27B0';
      case 'cancelled': return '#607D8B';
      case 'expired': return '#795548';
      default: return '#666';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <FaClock />;
      case 'accepted': return <FaCheck />;
      case 'rejected': return <FaTimes />;
      case 'completed': return <FaCheck />;
      default: return <FaClock />;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount) => {
    return `৳${Number(amount).toLocaleString()}`;
  };

  // Accept barter offer
  const handleAcceptBarter = async (barterId, responseMessage = '') => {
    try {
      setActionLoading(true);
      const token = localStorage.getItem('vendorToken') || sessionStorage.getItem('vendorToken');
      
      const response = await fetch(`http://localhost:5005/api/barter/${barterId}/accept`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ responseMessage })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Update the barter in the list
          setBarters(prev => prev.map(barter => 
            barter._id === barterId 
              ? { ...barter, status: 'accepted', responseMessage, respondedAt: new Date() }
              : barter
          ));
          setShowDetailsModal(false);
          alert('Barter offer accepted successfully!');
        } else {
          alert(`Error: ${data.message}`);
        }
      } else {
        alert('Failed to accept barter offer');
      }
    } catch (error) {
      console.error('Error accepting barter:', error);
      alert('Network error occurred');
    } finally {
      setActionLoading(false);
    }
  };

  // Reject barter offer
  const handleRejectBarter = async (barterId, responseMessage = '') => {
    try {
      setActionLoading(true);
      const token = localStorage.getItem('vendorToken') || sessionStorage.getItem('vendorToken');
      
      const response = await fetch(`http://localhost:5005/api/barter/${barterId}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ responseMessage })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Update the barter in the list
          setBarters(prev => prev.map(barter => 
            barter._id === barterId 
              ? { ...barter, status: 'rejected', responseMessage, respondedAt: new Date() }
              : barter
          ));
          setShowDetailsModal(false);
          alert('Barter offer rejected successfully!');
        } else {
          alert(`Error: ${data.message}`);
        }
      } else {
        alert('Failed to reject barter offer');
      }
    } catch (error) {
      console.error('Error rejecting barter:', error);
      alert('Network error occurred');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle counter offer
  const handleCounterOffer = async (barterId, counterOfferData) => {
    try {
      setActionLoading(true);
      const token = localStorage.getItem('vendorToken') || sessionStorage.getItem('vendorToken');
      
      const response = await fetch(`http://localhost:5005/api/barter/${barterId}/counter`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(counterOfferData)
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Update the barter in the list
          setBarters(prev => prev.map(barter => 
            barter._id === barterId 
              ? { ...barter, status: 'counter-offered', counterOffer: counterOfferData, respondedAt: new Date() }
              : barter
          ));
          setShowCounterOfferModal(false);
          setShowDetailsModal(false);
          alert('Counter offer sent successfully!');
        } else {
          alert(`Error: ${data.message}`);
        }
      } else {
        alert('Failed to send counter offer');
      }
    } catch (error) {
      console.error('Error sending counter offer:', error);
      alert('Network error occurred');
    } finally {
      setActionLoading(false);
    }
  };

  // Modal Components
  const BarterDetailsModal = () => {
    if (!selectedBarter) return null;

    return (
      <div className="modal-overlay" onClick={() => setShowDetailsModal(false)}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Barter Details - #{selectedBarter.barterNumber}</h2>
            <button className="close-btn" onClick={() => setShowDetailsModal(false)}>
              <FaTimes />
            </button>
          </div>
          
          <div className="modal-body">
            <div className="barter-details-grid">
              <div className="detail-section">
                <h3>Basic Information</h3>
                <p><strong>Status:</strong> 
                  <span 
                    className="status-badge-inline"
                    style={{ backgroundColor: getStatusColor(selectedBarter.status) }}
                  >
                    {selectedBarter.status.toUpperCase()}
                  </span>
                </p>
                <p><strong>Proposed:</strong> {formatDate(selectedBarter.proposedAt)}</p>
                {selectedBarter.respondedAt && (
                  <p><strong>Responded:</strong> {formatDate(selectedBarter.respondedAt)}</p>
                )}
                {selectedBarter.expiresAt && (
                  <p><strong>Expires:</strong> {formatDate(selectedBarter.expiresAt)}</p>
                )}
              </div>

              <div className="detail-section">
                <h3>Target Request</h3>
                {selectedBarter.targetProduct && typeof selectedBarter.targetProduct === 'object' ? (
                  <div className="product-display">
                    {selectedBarter.targetProduct.images && selectedBarter.targetProduct.images.length > 0 && (
                      <img 
                        src={selectedBarter.targetProduct.images[0]} 
                        alt={selectedBarter.targetProduct.name}
                        className="product-image"
                        style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px' }}
                      />
                    )}
                    <div className="product-info">
                      <p><strong>Product:</strong> {selectedBarter.targetProduct.name}</p>
                      <p><strong>Category:</strong> {selectedBarter.targetProduct.category}</p>
                      <p><strong>Business:</strong> {selectedBarter.targetProduct.businessName}</p>
                      <p><strong>Unit Price:</strong> {formatCurrency(selectedBarter.targetProduct.unitPrice)}</p>
                    </div>
                  </div>
                ) : (
                  <p><strong>Product:</strong> {selectedBarter.targetProduct}</p>
                )}
                <p><strong>Quantity:</strong> {selectedBarter.targetQuantity}</p>
                <p><strong>Total Value:</strong> {formatCurrency(selectedBarter.targetValue)}</p>
              </div>

              <div className="detail-section">
                <h3>Offered Items</h3>
                {selectedBarter.offeredItems && selectedBarter.offeredItems.length > 0 ? (
                  <div className="offered-items-list">
                    {selectedBarter.offeredItems.map((item, index) => (
                      <div key={index} className="offered-item">
                        {item.product && typeof item.product === 'object' ? (
                          <div className="product-display">
                            {item.product.images && item.product.images.length > 0 && (
                              <img 
                                src={item.product.images[0]} 
                                alt={item.product.name}
                                className="product-image"
                                style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '6px' }}
                              />
                            )}
                            <div className="product-info">
                              <p><strong>Product:</strong> {item.product.name}</p>
                              <p><strong>Category:</strong> {item.product.category}</p>
                              <p><strong>Business:</strong> {item.product.businessName}</p>
                              <p><strong>Market Price:</strong> {formatCurrency(item.product.unitPrice)}</p>
                            </div>
                          </div>
                        ) : (
                          <p><strong>Product:</strong> {item.product}</p>
                        )}
                        <p><strong>Quantity:</strong> {item.quantity}</p>
                        <p><strong>Offered Unit Price:</strong> {formatCurrency(item.unitPrice)}</p>
                        <p><strong>Total Value:</strong> {formatCurrency(item.totalValue)}</p>
                        {item.notes && <p><strong>Notes:</strong> {item.notes}</p>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>No offered items specified</p>
                )}
                <p><strong>Total Offered Value:</strong> {formatCurrency(selectedBarter.totalOfferedValue)}</p>
              </div>

              <div className="detail-section">
                <h3>Value Analysis</h3>
                <p><strong>Target Value:</strong> {formatCurrency(selectedBarter.targetValue)}</p>
                <p><strong>Offered Value:</strong> {formatCurrency(selectedBarter.totalOfferedValue)}</p>
                <p><strong>Difference:</strong> 
                  <span className={selectedBarter.valueDifference >= 0 ? 'positive' : 'negative'}>
                    {formatCurrency(Math.abs(selectedBarter.valueDifference))}
                    {selectedBarter.valueDifference >= 0 ? ' in favor' : ' additional needed'}
                  </span>
                </p>
                {selectedBarter.cashAdjustment !== 0 && (
                  <p><strong>Cash Adjustment:</strong> {formatCurrency(selectedBarter.cashAdjustment)}</p>
                )}
              </div>

              <div className="detail-section">
                <h3>Vendor Information</h3>
                <div className="vendor-info">
                  <div className="proposing-vendor">
                    <p><strong>Proposing Vendor:</strong></p>
                    {selectedBarter.proposingVendor && typeof selectedBarter.proposingVendor === 'object' ? (
                      <div className="vendor-details">
                        <p><strong>Business:</strong> {selectedBarter.proposingVendor.businessName}</p>
                        <p><strong>Name:</strong> {selectedBarter.proposingVendor.sellerName}</p>
                        <p><strong>Email:</strong> {selectedBarter.proposingVendor.email}</p>
                        <p><strong>Store ID:</strong> {selectedBarter.proposingVendor.storeId}</p>
                      </div>
                    ) : (
                      <p>{selectedBarter.proposingVendorUid}</p>
                    )}
                  </div>
                  
                  <div className="target-vendor">
                    <p><strong>Target Vendor:</strong></p>
                    {selectedBarter.targetVendor && typeof selectedBarter.targetVendor === 'object' ? (
                      <div className="vendor-details">
                        <p><strong>Business:</strong> {selectedBarter.targetVendor.businessName}</p>
                        <p><strong>Name:</strong> {selectedBarter.targetVendor.sellerName}</p>
                        <p><strong>Email:</strong> {selectedBarter.targetVendor.email}</p>
                        <p><strong>Store ID:</strong> {selectedBarter.targetVendor.storeId}</p>
                      </div>
                    ) : (
                      <p>{selectedBarter.targetVendorUid}</p>
                    )}
                  </div>
                </div>
              </div>

              {(selectedBarter.proposalMessage || selectedBarter.responseMessage) && (
                <div className="detail-section">
                  <h3>Messages</h3>
                  {selectedBarter.proposalMessage && (
                    <div className="message-box">
                      <p><strong>Proposal Message:</strong></p>
                      <p className="message-content">{selectedBarter.proposalMessage}</p>
                    </div>
                  )}
                  {selectedBarter.responseMessage && (
                    <div className="message-box">
                      <p><strong>Response Message:</strong></p>
                      <p className="message-content">{selectedBarter.responseMessage}</p>
                    </div>
                  )}
                </div>
              )}

              {selectedBarter.counterOffer && (
                <div className="detail-section">
                  <h3>Counter Offer</h3>
                  <p><strong>Total Value:</strong> {formatCurrency(selectedBarter.counterOffer.totalValue)}</p>
                  <p><strong>Cash Adjustment:</strong> {formatCurrency(selectedBarter.counterOffer.cashAdjustment)}</p>
                  {selectedBarter.counterOffer.message && (
                    <p><strong>Message:</strong> {selectedBarter.counterOffer.message}</p>
                  )}
                  <p><strong>Created:</strong> {formatDate(selectedBarter.counterOffer.createdAt)}</p>
                </div>
              )}
            </div>
          </div>

          <div className="modal-footer">
            {/* Debug info */}
            {process.env.NODE_ENV === 'development' && (
              <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: '10px' }}>
                Status: {selectedBarter.status} | Filter: {filter} | 
                Show buttons: {selectedBarter.status === 'pending' && filter === 'received' ? 'Yes' : 'No'}
              </div>
            )}
            
            {selectedBarter.status === 'pending' && filter === 'received' && (
              <>
                <button 
                  className="accept-btn"
                  onClick={() => {
                    const message = prompt('Add a response message (optional):');
                    handleAcceptBarter(selectedBarter._id, message || '');
                  }}
                  disabled={actionLoading}
                >
                  <FaCheck /> Accept Offer
                </button>
                <button 
                  className="counter-btn"
                  onClick={() => {
                    console.log('Counter offer button clicked');
                    setShowCounterOfferModal(true);
                  }}
                  disabled={actionLoading}
                >
                  <FaExchangeAlt /> Counter Offer
                </button>
                <button 
                  className="reject-btn"
                  onClick={() => {
                    const message = prompt('Add a rejection reason (optional):');
                    handleRejectBarter(selectedBarter._id, message || '');
                  }}
                  disabled={actionLoading}
                >
                  <FaTimes /> Reject Offer
                </button>
              </>
            )}
            <button className="close-btn-secondary" onClick={() => setShowDetailsModal(false)}>
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  const CounterOfferModal = () => {
    const [counterItems, setCounterItems] = useState([{ product: '', quantity: 1, unitPrice: 0 }]);
    const [cashAdjustment, setCashAdjustment] = useState(0);
    const [message, setMessage] = useState('');

    const addCounterItem = () => {
      setCounterItems([...counterItems, { product: '', quantity: 1, unitPrice: 0 }]);
    };

    const removeCounterItem = (index) => {
      setCounterItems(counterItems.filter((_, i) => i !== index));
    };

    const updateCounterItem = (index, field, value) => {
      const updated = [...counterItems];
      updated[index] = { ...updated[index], [field]: value };
      setCounterItems(updated);
    };

    const calculateTotalValue = () => {
      return counterItems.reduce((total, item) => total + (item.quantity * item.unitPrice), 0);
    };

    const handleSubmitCounter = () => {
      const counterOfferData = {
        items: counterItems.map(item => ({
          ...item,
          totalValue: item.quantity * item.unitPrice
        })),
        totalValue: calculateTotalValue(),
        cashAdjustment,
        message
      };
      
      console.log('Submitting counter offer:', counterOfferData);
      handleCounterOffer(selectedBarter._id, counterOfferData);
    };

    if (!selectedBarter) return null;

    return (
      <div className="modal-overlay" onClick={() => setShowCounterOfferModal(false)}>
        <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>
              <FaExchangeAlt />
              Counter Offer - #{selectedBarter.barterNumber}
            </h2>
            <button className="close-btn" onClick={() => setShowCounterOfferModal(false)}>
              <FaTimes />
            </button>
          </div>
          
          <div className="modal-body">
            <div className="counter-offer-form">
              <div className="original-request-summary">
                <h3>📋 Original Request Summary</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '25px' }}>
                  <div style={{ background: '#f8f9ff', padding: '15px', borderRadius: '10px' }}>
                    <p><strong>Target Value:</strong> {formatCurrency(selectedBarter.targetValue)}</p>
                  </div>
                  <div style={{ background: '#fff5f5', padding: '15px', borderRadius: '10px' }}>
                    <p><strong>Offered Value:</strong> {formatCurrency(selectedBarter.totalOfferedValue)}</p>
                  </div>
                </div>
              </div>
              
              <h3>💰 Your Counter Offer</h3>
              {counterItems.map((item, index) => (
                <div key={index} className="counter-item-form">
                  <h4>Item #{index + 1}</h4>
                  <div className="form-row">
                    <input
                      type="text"
                      placeholder="Product description (e.g., Fresh Tomatoes)"
                      value={item.product}
                      onChange={(e) => updateCounterItem(index, 'product', e.target.value)}
                      style={{ gridColumn: '1 / 3' }}
                    />
                    <input
                      type="number"
                      placeholder="Qty"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateCounterItem(index, 'quantity', parseInt(e.target.value) || 1)}
                    />
                    <input
                      type="number"
                      placeholder="Unit Price (৳)"
                      min="0"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) => updateCounterItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                    />
                    <div className="item-total">
                      {formatCurrency(item.quantity * item.unitPrice)}
                    </div>
                    {counterItems.length > 1 && (
                      <button type="button" onClick={() => removeCounterItem(index)} className="remove-btn">
                        <FaTimes />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              
              <button type="button" onClick={addCounterItem} className="add-item-btn">
                <FaPlus /> Add Another Item
              </button>
              
              <div className="form-row">
                <label>💵 Additional Cash Adjustment:</label>
                <input
                  type="number"
                  placeholder="Additional cash amount (৳)"
                  min="0"
                  step="0.01"
                  value={cashAdjustment}
                  onChange={(e) => setCashAdjustment(parseFloat(e.target.value) || 0)}
                  style={{ gridColumn: '1 / -1' }}
                />
              </div>
              
              <div className="total-calculation">
                <p><strong>Total Counter Offer Value:</strong> {formatCurrency(calculateTotalValue() + cashAdjustment)}</p>
                <p><strong>Difference from Original Request:</strong> 
                  <span className={calculateTotalValue() + cashAdjustment >= selectedBarter.targetValue ? 'positive' : 'negative'}>
                    {formatCurrency(Math.abs((calculateTotalValue() + cashAdjustment) - selectedBarter.targetValue))}
                    {calculateTotalValue() + cashAdjustment >= selectedBarter.targetValue ? ' over target' : ' under target'}
                  </span>
                </p>
              </div>
              
              <div className="form-row">
                <label>💬 Message (Optional):</label>
                <textarea
                  placeholder="Add a message explaining your counter offer..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button 
              className="submit-btn"
              onClick={handleSubmitCounter}
              disabled={actionLoading || !counterItems.some(item => item.product && item.quantity > 0)}
            >
              <FaExchangeAlt /> Send Counter Offer
            </button>
            <button className="close-btn-secondary" onClick={() => setShowCounterOfferModal(false)}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="barter-management">
        <div className="loading-state">
          <FaExchangeAlt className="spin" />
          <p>Loading barter offers...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="barter-management">
        <div className="error-state">
          <h3>Error</h3>
          <p>{error}</p>
          <button onClick={fetchBarters} className="retry-btn">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="barter-management">
      <div className="barter-header">
        <div className="header-content">
          <h1>
            <FaExchangeAlt />
            Barter Management
          </h1>
          <p>Manage your product exchange offers</p>
        </div>
        <button 
          className="create-barter-btn"
          onClick={() => setShowCreateBarterModal(true)}
        >
          <FaPlus /> Create New Barter
        </button>
      </div>

      <div className="barter-filters">
        <div className="filter-group">
          <label>Filter by Type:</label>
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All Offers</option>
            <option value="sent">Sent by Me</option>
            <option value="received">Received</option>
          </select>
        </div>
        
        <div className="filter-group">
          <label>Filter by Status:</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
            <option value="counter-offered">Counter Offered</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="expired">Expired</option>
          </select>
        </div>
      </div>

      <div className="barter-stats">
        <div className="stat-card">
          <div className="stat-icon" style={{ color: '#FFA500' }}>
            <FaClock />
          </div>
          <div className="stat-content">
            <h3>{barters.filter(b => b.status === 'pending').length}</h3>
            <p>Pending</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ color: '#4CAF50' }}>
            <FaCheck />
          </div>
          <div className="stat-content">
            <h3>{barters.filter(b => b.status === 'accepted').length}</h3>
            <p>Accepted</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ color: '#9C27B0' }}>
            <FaCheck />
          </div>
          <div className="stat-content">
            <h3>{barters.filter(b => b.status === 'completed').length}</h3>
            <p>Completed</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ color: '#2196F3' }}>
            <FaExchangeAlt />
          </div>
          <div className="stat-content">
            <h3>{barters.length}</h3>
            <p>Total</p>
          </div>
        </div>
      </div>

      {barters.length === 0 ? (
        <div className="empty-state">
          <FaExchangeAlt />
          <h3>No Barter Offers Found</h3>
          <p>
            {filter === 'received' 
              ? "You haven't received any barter offers yet." 
              : filter === 'sent' 
              ? "You haven't sent any barter offers yet."
              : "You don't have any barter offers yet."
            }
          </p>
          <button 
            className="create-barter-btn"
            onClick={() => setShowCreateBarterModal(true)}
          >
            <FaPlus /> Create Your First Barter
          </button>
        </div>
      ) : (
        <div className="barter-list">
          {barters.map(barter => (
            <div key={barter._id} className="barter-card">
              <div className="barter-card-header">
                <div className="barter-info">
                  <h3>#{barter.barterNumber}</h3>
                  <span 
                    className="status-badge"
                    style={{ backgroundColor: getStatusColor(barter.status) }}
                  >
                    {getStatusIcon(barter.status)}
                    {barter.status.replace('-', ' ').toUpperCase()}
                  </span>
                </div>
                <div className="barter-date">
                  <FaClock />
                  {barter.proposedAt ? formatDate(barter.proposedAt) : 'Unknown date'}
                </div>
              </div>

              <div className="barter-content">
                <div className="trade-summary">
                  <div className="trade-section">
                    <h4>Target Request</h4>
                    {barter.targetProduct && typeof barter.targetProduct === 'object' ? (
                      <div className="product-mini-display">
                        {barter.targetProduct.images && barter.targetProduct.images.length > 0 && (
                          <img 
                            src={barter.targetProduct.images[0]} 
                            alt={barter.targetProduct.name}
                            className="product-mini-image"
                          />
                        )}
                        <div>
                          <p><strong>{barter.targetProduct.name}</strong></p>
                          <p>Qty: {barter.targetQuantity}</p>
                          <p>Value: {formatCurrency(barter.targetValue)}</p>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p><strong>Quantity:</strong> {barter.targetQuantity}</p>
                        <p><strong>Value:</strong> {formatCurrency(barter.targetValue)}</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="trade-section">
                    <h4>Offered Items</h4>
                    {barter.offeredItems && barter.offeredItems.length > 0 ? (
                      <div className="offered-mini-list">
                        {barter.offeredItems.slice(0, 2).map((item, index) => (
                          <div key={index} className="offered-mini-item">
                            {item.product && typeof item.product === 'object' ? (
                              <div className="product-mini-display">
                                {item.product.images && item.product.images.length > 0 && (
                                  <img 
                                    src={item.product.images[0]} 
                                    alt={item.product.name}
                                    className="product-mini-image"
                                  />
                                )}
                                <div>
                                  <p><strong>{item.product.name}</strong></p>
                                  <p>Qty: {item.quantity}</p>
                                </div>
                              </div>
                            ) : (
                              <p>{item.quantity} items</p>
                            )}
                          </div>
                        ))}
                        {barter.offeredItems.length > 2 && (
                          <p className="more-items">+{barter.offeredItems.length - 2} more items</p>
                        )}
                      </div>
                    ) : (
                      <p>No items offered</p>
                    )}
                    <p><strong>Total Value:</strong> {formatCurrency(barter.totalOfferedValue)}</p>
                  </div>
                  
                  <div className="trade-section value-difference">
                    <h4>Difference</h4>
                    <p className={barter.valueDifference >= 0 ? 'positive' : 'negative'}>
                      {formatCurrency(Math.abs(barter.valueDifference))}
                      {barter.valueDifference >= 0 ? ' in your favor' : ' additional needed'}
                    </p>
                  </div>
                </div>

                <div className="vendor-info">
                  <div className="vendor-mini-info">
                    <div>
                      <strong>From:</strong> 
                      {barter.proposingVendor && typeof barter.proposingVendor === 'object' ? (
                        <span> {barter.proposingVendor.businessName}</span>
                      ) : (
                        <span> {barter.proposingVendorUid}</span>
                      )}
                    </div>
                    <div>
                      <strong>To:</strong> 
                      {barter.targetVendor && typeof barter.targetVendor === 'object' ? (
                        <span> {barter.targetVendor.businessName}</span>
                      ) : (
                        <span> {barter.targetVendorUid}</span>
                      )}
                    </div>
                  </div>
                </div>

                {barter.proposalMessage && (
                  <div className="barter-message">
                    <p><strong>Message:</strong> {barter.proposalMessage}</p>
                  </div>
                )}
              </div>

              <div className="barter-actions">
                <button 
                  className="view-btn"
                  onClick={() => {
                    setSelectedBarter(barter);
                    setShowDetailsModal(true);
                  }}
                >
                  <FaEye /> View Details
                </button>
                
                {barter.status === 'pending' && filter === 'received' && (
                  <>
                    <button 
                      className="accept-btn"
                      onClick={() => {
                        const message = prompt('Add a response message (optional):');
                        handleAcceptBarter(barter._id, message || '');
                      }}
                      disabled={actionLoading}
                    >
                      <FaCheck /> Accept
                    </button>
                    <button 
                      className="reject-btn"
                      onClick={() => {
                        const message = prompt('Add a rejection reason (optional):');
                        handleRejectBarter(barter._id, message || '');
                      }}
                      disabled={actionLoading}
                    >
                      <FaTimes /> Reject
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {showDetailsModal && <BarterDetailsModal />}
      {showCounterOfferModal && <CounterOfferModal />}
      <CreateBarterModal 
        isOpen={showCreateBarterModal}
        onClose={() => setShowCreateBarterModal(false)}
        onSuccess={() => fetchBarters()}
      />
    </div>
  );
};

export default BarterManagement;
