import React, { useState, useEffect } from 'react';
import negotiationService from '../../services/negotiationService';
import './NegotiationModal.css';

const NegotiationModal = ({ 
  negotiation, 
  currentUser, 
  currentRole,
  onClose, 
  onUpdate,
  onRemove 
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [counterOffer, setCounterOffer] = useState({
    price: '',
    quantity: '',
    message: ''
  });

  // Get negotiation details
  const participantInfo = negotiationService.getParticipantInfo(negotiation, currentUser.uid);
  const lastOffer = negotiationService.getLastOffer(negotiation);
  
  // Check permissions
  const canMakeCounterOffer = negotiationService.canMakeCounterOffer(negotiation, currentUser.uid);
  const canAcceptOffer = negotiationService.canAcceptOffer(negotiation, currentUser.uid);
  const canRejectOffer = negotiationService.canRejectOffer(negotiation, currentUser.uid);

  // Initialize counter offer with last offer values
  useEffect(() => {
    if (lastOffer) {
      setCounterOffer({
        price: lastOffer.price.toString(),
        quantity: lastOffer.quantity.toString(),
        message: ''
      });
    }
  }, [lastOffer]);

  // Handle counter offer submission
  const handleCounterOffer = async () => {
    if (!canMakeCounterOffer) return;

    const price = parseFloat(counterOffer.price);
    const quantity = parseInt(counterOffer.quantity);

    if (!price || price <= 0) {
      setError('Please enter a valid price');
      return;
    }

    if (!quantity || quantity < (negotiation.productId?.minOrderQty || 1)) {
      setError(`Minimum order quantity is ${negotiation.productId?.minOrderQty || 1} ${negotiation.productId?.unitType || 'unit'}`);
      return;
    }

    try {
      setLoading(true);
      setError('');

      const offerData = {
        price: price,
        quantity: quantity,
        message: counterOffer.message.trim(),
        fromUid: currentUser.uid,
        fromRole: currentRole || (participantInfo.role === 'buyer' ? 'buyer' : 'seller')
      };

      const result = await negotiationService.makeCounterOffer(negotiation._id, offerData);
      onUpdate(result.negotiation);
      onClose();
      alert('Counter offer sent successfully!');
    } catch (error) {
      console.error('Error making counter offer:', error);
      setError(error.message || 'Failed to send counter offer');
    } finally {
      setLoading(false);
    }
  };

  // Handle accept offer
  const handleAccept = async () => {
    if (!canAcceptOffer) return;
    
    try {
      setLoading(true);
      const result = await negotiationService.acceptOffer(negotiation._id, currentUser.uid);
      onUpdate(result.negotiation);
      onClose();
      alert('Offer accepted successfully!');
    } catch (error) {
      console.error('Error accepting offer:', error);
      setError(error.message || 'Failed to accept offer');
    } finally {
      setLoading(false);
    }
  };

  // Handle reject offer
  const handleReject = async () => {
    if (!canRejectOffer) return;
    
    if (!confirm('Are you sure you want to reject this offer?')) return;
    
    try {
      setLoading(true);
      const result = await negotiationService.rejectOffer(negotiation._id, currentUser.uid);
      onUpdate(result.negotiation);
      onClose();
      alert('Offer rejected');
    } catch (error) {
      console.error('Error rejecting offer:', error);
      setError(error.message || 'Failed to reject offer');
    } finally {
      setLoading(false);
    }
  };

  // Handle cancel negotiation
  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this negotiation?')) return;
    
    try {
      setLoading(true);
      await negotiationService.cancelNegotiation(negotiation._id, currentUser.uid);
      onRemove(negotiation._id);
      onClose();
      alert('Negotiation cancelled');
    } catch (error) {
      console.error('Error cancelling negotiation:', error);
      setError(error.message || 'Failed to cancel negotiation');
    } finally {
      setLoading(false);
    }
  };

  // Calculate totals
  const calculateTotal = () => {
    const price = parseFloat(counterOffer.price || 0);
    const quantity = parseInt(counterOffer.quantity || 1);
    return (price * quantity).toFixed(2);
  };

  // Get original price
  const getOriginalPrice = () => {
    if (negotiation.productId?.offerPrice && negotiation.productId.offerPrice > 0) {
      return negotiation.productId.offerPrice;
    }
    return negotiation.productId?.unitPrice || 0;
  };

  const originalPrice = getOriginalPrice();
  const timeRemaining = negotiationService.formatTimeRemaining(negotiation.expiresAt);
  const statusColor = negotiationService.getStatusColor(negotiation.status);

  // Debug logging
  console.log('Negotiation data:', {
    proposedPrice: negotiation.proposedPrice,
    currentPrice: negotiation.currentPrice,
    quantity: negotiation.quantity,
    offers: negotiation.offers,
    offersLength: negotiation.offers?.length
  });

  return (
    <div className="negotiation-overlay" onClick={onClose}>
      <div className="negotiation-container" onClick={(e) => e.stopPropagation()}>
        <div className="negotiation-header">
          <h3 className="negotiation-title">Negotiation Details</h3>
          <button className="negotiation-close-btn" onClick={onClose}>×</button>
        </div>

        <div className="negotiation-content">
          <div className="negotiation-main">
            {/* Product Info */}
            <div className="product-info-card">
              <div className="product-details">
                <div className="product-img">
                  <img 
                    src={negotiation.productId?.images?.[0] || '/placeholder-product.jpg'} 
                    alt={negotiation.productId?.name || 'Product'}
                  />
                </div>
                <div className="product-meta">
                  <h4 className="product-name">{negotiation.productId?.name || 'Unknown Product'}</h4>
                  <p className="product-price">Original Price: ৳{originalPrice}</p>
                  <p className="product-participant">
                    {participantInfo.role === 'buyer' ? 'Buying from: ' : 'Selling to: '}
                    {participantInfo.role === 'buyer' ? 
                      (negotiation.seller?.businessName || 'Vendor') :
                      (negotiation.buyer?.businessName || negotiation.buyer?.name || 'Buyer')}
                  </p>
                  <div className="negotiation-status">
                    <span className="status-tag" style={{ backgroundColor: statusColor }}>
                      {negotiationService.getStatusText(negotiation.status)}
                    </span>
                    {negotiation.status === 'active' && (
                      <span className="time-left">{timeRemaining}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Offer History */}
            <div className="offers-history">
              <h4 className="offers-title">Offer History</h4>
              <div className="offers-list">
                {/* Original Product Listing */}
                <div className="offer-entry initial-offer">
                  <div className="offer-info">
                    <div className="offer-header">
                      <span className="offer-from">
                        {negotiation.seller?.businessName || 'Vendor'}
                      </span>
                      <span className="offer-date">
                        Original Listing
                      </span>
                    </div>
                    <div className="offer-amounts">
                      <span className="offer-unit">৳{originalPrice} × {negotiation.quantity}</span>
                      <span className="offer-total">= ৳{(originalPrice * negotiation.quantity).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Initial Negotiation Offer */}
                <div className="offer-entry">
                  <div className="offer-info">
                    <div className="offer-header">
                      <span className="offer-from">
                        {negotiation.buyerUid === currentUser.uid ? 'You' : 
                         (negotiation.buyer?.businessName || negotiation.buyer?.name || 'Buyer')}
                      </span>
                      <span className="offer-date">
                        {new Date(negotiation.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="offer-amounts">
                      <span className="offer-unit">
                        ৳{negotiation.currentPrice || negotiation.proposedPrice || 0} × {negotiation.quantity || 0}
                      </span>
                      <span className="offer-total">
                        = ৳{((negotiation.currentPrice || negotiation.proposedPrice || 0) * (negotiation.quantity || 0)).toFixed(2)}
                      </span>
                    </div>
                    {negotiation.message && (
                      <div className="offer-msg">{negotiation.message}</div>
                    )}
                  </div>
                </div>

                {/* Counter Offers - Only show if they have valid data */}
                {negotiation.offers && negotiation.offers.length > 0 && negotiation.offers
                  .filter(offer => {
                    // Filter out invalid offers
                    return offer && 
                           offer.price && 
                           !isNaN(offer.price) && 
                           offer.quantity && 
                           !isNaN(offer.quantity) && 
                           offer.fromUid && 
                           offer.createdAt;
                  })
                  .map((offer, index) => (
                    <div key={index} className="offer-entry">
                      <div className="offer-info">
                        <div className="offer-header">
                          <span className="offer-from">
                            {offer.fromUid === currentUser.uid ? 'You' : 
                             (offer.fromUid === negotiation.buyerUid ? 
                              (negotiation.buyer?.businessName || negotiation.buyer?.name || 'Buyer') :
                              (negotiation.seller?.businessName || 'Vendor'))}
                          </span>
                          <span className="offer-date">
                            {new Date(offer.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="offer-amounts">
                          <span className="offer-unit">৳{offer.price} × {offer.quantity}</span>
                          <span className="offer-total">= ৳{(offer.price * offer.quantity).toFixed(2)}</span>
                        </div>
                        {offer.message && (
                          <div className="offer-msg">{offer.message}</div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          <div className="negotiation-sidebar">
            {/* Error Message */}
            {error && (
              <div className="error-alert">
                {error}
              </div>
            )}

            {/* Counter Offer Form */}
            {canMakeCounterOffer && (
              <div className="counter-offer-form">
                <h4 className="form-title">Make Counter Offer</h4>
                <div className="form-fields">
                  <div className="input-group">
                    <label className="input-label">Price (৳)</label>
                    <input
                      type="number"
                      value={counterOffer.price}
                      onChange={(e) => setCounterOffer(prev => ({ ...prev, price: e.target.value }))}
                      min="1"
                      step="0.01"
                      className="form-input"
                    />
                  </div>
                  
                  <div className="input-group">
                    <label className="input-label">
                      Quantity (Min: {negotiation.productId?.minOrderQty || 1} {negotiation.productId?.unitType || 'unit'})
                    </label>
                    <input
                      type="number"
                      value={counterOffer.quantity}
                      onChange={(e) => {
                        const newQuantity = parseInt(e.target.value) || (negotiation.productId?.minOrderQty || 1);
                        setCounterOffer(prev => ({ 
                          ...prev, 
                          quantity: Math.max(newQuantity, negotiation.productId?.minOrderQty || 1).toString()
                        }));
                      }}
                      min={negotiation.productId?.minOrderQty || 1}
                      className="form-input"
                    />
                  </div>
                  
                  <div className="input-group">
                    <label className="input-label">Message (Optional)</label>
                    <textarea
                      value={counterOffer.message}
                      onChange={(e) => setCounterOffer(prev => ({ ...prev, message: e.target.value }))}
                      placeholder="Add a message to support your counter offer..."
                      rows="4"
                      maxLength="500"
                      className="form-input form-textarea"
                    />
                    <div className="char-counter">{counterOffer.message.length}/500</div>
                  </div>

                  <div className="total-amount">
                    <strong>Total: ৳{calculateTotal()}</strong>
                  </div>
                </div>
              </div>
            )}

            {/* View Only Summary for non-counter offer cases */}
            {!canMakeCounterOffer && (
              <div className="negotiation-summary">
                <h4 className="summary-title">Negotiation Summary</h4>
                <div className="summary-list">
                  <div className="summary-row">
                    <span>Current Status:</span>
                    <span className="status-tag" style={{ backgroundColor: statusColor }}>
                      {negotiationService.getStatusText(negotiation.status)}
                    </span>
                  </div>
                  <div className="summary-row">
                    <span>Original Price:</span>
                    <span>৳{originalPrice}</span>
                  </div>
                  {lastOffer && (
                    <>
                      <div className="summary-row">
                        <span>Current Offer:</span>
                        <span>৳{lastOffer.price}</span>
                      </div>
                      <div className="summary-row">
                        <span>Quantity:</span>
                        <span>{lastOffer.quantity} {negotiation.productId?.unitType || 'unit'}</span>
                      </div>
                      <div className="summary-row">
                        <span>Total:</span>
                        <span>৳{(lastOffer.price * lastOffer.quantity).toFixed(2)}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="negotiation-footer">
          <button
            className="action-btn btn-secondary"
            onClick={onClose}
            disabled={loading}
          >
            Close
          </button>

          {negotiation.status === 'active' && (
            <>
              {canMakeCounterOffer && (
                <button
                  className={`action-btn btn-primary ${loading ? 'loading' : ''}`}
                  onClick={handleCounterOffer}
                  disabled={loading || !counterOffer.price || !counterOffer.quantity}
                >
                  {loading ? '' : 'Send Counter Offer'}
                </button>
              )}

              {canAcceptOffer && (
                <button
                  className={`action-btn btn-success ${loading ? 'loading' : ''}`}
                  onClick={handleAccept}
                  disabled={loading}
                >
                  {loading ? '' : '✓ Accept Offer'}
                </button>
              )}

              {canRejectOffer && (
                <button
                  className={`action-btn btn-danger ${loading ? 'loading' : ''}`}
                  onClick={handleReject}
                  disabled={loading}
                >
                  {loading ? '' : '✗ Reject Offer'}
                </button>
              )}

              <button
                className={`action-btn btn-outline ${loading ? 'loading' : ''}`}
                onClick={handleCancel}
                disabled={loading}
              >
                {loading ? '' : 'Cancel Negotiation'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default NegotiationModal;
