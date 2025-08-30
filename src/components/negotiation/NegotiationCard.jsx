import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import negotiationService from '../../services/negotiationService';
import NegotiationModal from './NegotiationModal';
import './NegotiationCard.css';

const NegotiationCard = ({ 
  negotiation, 
  currentUser, 
  currentRole,
  onUpdate,
  onRemove 
}) => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Get participant info
  const participantInfo = negotiationService.getParticipantInfo(negotiation, currentUser.uid);
  const lastOffer = negotiationService.getLastOffer(negotiation);
  
  // Debug log to verify participant info
  console.log('Negotiation Card - Participant Info:', {
    currentUserUid: currentUser.uid,
    buyerUid: negotiation.buyerUid,
    sellerUid: negotiation.sellerUid,
    participantRole: participantInfo.role,
    isCurrentUserBuyer: negotiation.buyerUid === currentUser.uid
  });
  
  // Check permissions
  const canMakeCounterOffer = negotiationService.canMakeCounterOffer(negotiation, currentUser.uid);
  const canAcceptOffer = negotiationService.canAcceptOffer(negotiation, currentUser.uid);
  const canRejectOffer = negotiationService.canRejectOffer(negotiation, currentUser.uid);

  // Handle quick actions
  const handleQuickAccept = async () => {
    if (!canAcceptOffer) return;
    
    try {
      setLoading(true);
      const result = await negotiationService.acceptOffer(negotiation._id, currentUser.uid);
      onUpdate(result.negotiation);
      alert('Offer accepted successfully!');
    } catch (error) {
      console.error('Error accepting offer:', error);
      alert(error.message || 'Failed to accept offer');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickReject = async () => {
    if (!canRejectOffer) return;
    
    if (!confirm('Are you sure you want to reject this offer?')) return;
    
    try {
      setLoading(true);
      const result = await negotiationService.rejectOffer(negotiation._id, currentUser.uid);
      onUpdate(result.negotiation);
      alert('Offer rejected');
    } catch (error) {
      console.error('Error rejecting offer:', error);
      alert(error.message || 'Failed to reject offer');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this negotiation?')) return;
    
    try {
      setLoading(true);
      await negotiationService.cancelNegotiation(negotiation._id, currentUser.uid);
      onRemove(negotiation._id);
      alert('Negotiation cancelled');
    } catch (error) {
      console.error('Error cancelling negotiation:', error);
      alert(error.message || 'Failed to cancel negotiation');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenMessages = () => {
    if (negotiation.conversationId) {
      navigate(`/messages?conversation=${negotiation.conversationId}`);
    }
  };

  // Calculate price comparison
  const originalPrice = negotiation.productId?.offerPrice && negotiation.productId.offerPrice > 0 
    ? negotiation.productId.offerPrice 
    : negotiation.productId?.unitPrice || 0;
  
  const currentPrice = lastOffer ? lastOffer.price : negotiation.proposedPrice;
  const savings = negotiationService.calculateSavings(originalPrice, currentPrice);

  // Get status styling
  const statusColor = negotiationService.getStatusColor(negotiation.status);
  const timeRemaining = negotiationService.formatTimeRemaining(negotiation.expiresAt);
  const isNearExpiry = negotiationService.isNearExpiry(negotiation.expiresAt);

  return (
    <>
      <div className={`negotiation-card ${negotiation.status}`}>
        {/* Header */}
        <div className="card-header">
          <div className="product-info">
            <img 
              src={negotiation.productId?.images?.[0] || '/placeholder-product.jpg'} 
              alt={negotiation.productId?.name || 'Product'}
              className="product-image"
            />
            <div className="product-details">
              <h4 className="product-name">{negotiation.productId?.name || 'Unknown Product'}</h4>
              <p className="participant-name">
                {participantInfo.role === 'buyer' ? 'Buying from: ' : 'Selling to: '}
                {participantInfo.otherParticipant.name}
              </p>
            </div>
          </div>
          <div className="status-badge" style={{ backgroundColor: statusColor }}>
            {negotiationService.getStatusText(negotiation.status)}
          </div>
        </div>

        {/* Price Information */}
        <div className="price-section">
          <div className="price-row">
            <span className="price-label">Original Price:</span>
            <span className="price-value">৳{originalPrice.toFixed(2)}</span>
          </div>
          <div className="price-row">
            <span className="price-label">Original Total:</span>
            <span className="price-value">৳{(originalPrice * (lastOffer ? lastOffer.quantity : negotiation.quantity)).toFixed(2)}</span>
          </div>
          <div className="price-row">
            <span className="price-label">Current Offer:</span>
            <span className="price-value current-offer">৳{currentPrice.toFixed(2)}</span>
          </div>
          <div className="price-row">
            <span className="price-label">Quantity:</span>
            <span className="price-value">
              {lastOffer ? lastOffer.quantity : negotiation.quantity} {negotiation.productId?.unitType || 'unit'}
            </span>
          </div>
          <div className="price-row total">
            <span className="price-label">Offer Total:</span>
            <span className="price-value">
              ৳{(currentPrice * (lastOffer ? lastOffer.quantity : negotiation.quantity)).toFixed(2)}
            </span>
          </div>
          {savings.amount !== 0 && (
            <div className={`savings-row ${savings.isDiscount ? 'savings' : 'loss'}`}>
              {/* Show savings for the person who made the offer, loss for receiver */}
              {participantInfo.role === 'buyer' ? (
                // For buyer: if they're offering less than original, it's savings
                savings.isDiscount ? (
                  <span>💰 Potential Savings: ৳{savings.amount.toFixed(2)} ({savings.percentage}%)</span>
                ) : (
                  <span>📈 Premium Offer: ৳{Math.abs(savings.amount).toFixed(2)} (+{Math.abs(savings.percentage)}%)</span>
                )
              ) : (
                // For seller: if buyer is offering less than original, it's a loss for seller
                savings.isDiscount ? (
                  <span>📉 Potential Loss: ৳{savings.amount.toFixed(2)} ({savings.percentage}%)</span>
                ) : (
                  <span>💰 Premium Gained: ৳{Math.abs(savings.amount).toFixed(2)} (+{Math.abs(savings.percentage)}%)</span>
                )
              )}
            </div>
          )}
        </div>

        {/* Timeline */}
        <div className="timeline-section">
          <div className="timeline-item">
            <span className="timeline-label">Started:</span>
            <span className="timeline-value">
              {new Date(negotiation.createdAt).toLocaleDateString()}
            </span>
          </div>
          {negotiation.status === 'active' && (
            <div className={`timeline-item ${isNearExpiry ? 'urgent' : ''}`}>
              <span className="timeline-label">Expires:</span>
              <span className="timeline-value">{timeRemaining}</span>
            </div>
          )}
          {negotiation.offers && negotiation.offers.length > 1 && (
            <div className="timeline-item">
              <span className="timeline-label">Offers:</span>
              <span className="timeline-value">{negotiation.offers.length}</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="action-buttons">
          {negotiation.status === 'active' && (
            <>
              <button
                className="btn btn-primary"
                onClick={() => setIsModalOpen(true)}
                disabled={loading}
              >
                {canMakeCounterOffer ? 'Counter Offer' : 'View Details'}
              </button>
              
              {canAcceptOffer && (
                <button
                  className="btn btn-success"
                  onClick={handleQuickAccept}
                  disabled={loading}
                >
                  ✓ Accept
                </button>
              )}
              
              {canRejectOffer && (
                <button
                  className="btn btn-danger"
                  onClick={handleQuickReject}
                  disabled={loading}
                >
                  ✗ Reject
                </button>
              )}
              
              <button
                className="btn btn-secondary"
                onClick={handleCancel}
                disabled={loading}
              >
                Cancel
              </button>
            </>
          )}

          {negotiation.status !== 'active' && (
            <button
              className="btn btn-outline"
              onClick={() => setIsModalOpen(true)}
              disabled={loading}
            >
              View Details
            </button>
          )}

          {negotiation.conversationId && (
            <button
              className="btn btn-outline"
              onClick={handleOpenMessages}
              disabled={loading}
            >
              💬 Messages
            </button>
          )}
        </div>

        {/* Last Activity */}
        {lastOffer && lastOffer.message && (
          <div className="last-message">
            <p className="message-preview">
              <strong>Last message:</strong> {lastOffer.message.substring(0, 100)}
              {lastOffer.message.length > 100 ? '...' : ''}
            </p>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <NegotiationModal
          negotiation={negotiation}
          currentUser={currentUser}
          currentRole={currentRole}
          onClose={() => setIsModalOpen(false)}
          onUpdate={onUpdate}
          onRemove={onRemove}
        />
      )}
    </>
  );
};

export default NegotiationCard;
