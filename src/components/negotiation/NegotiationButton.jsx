import React, { useState } from 'react';
import { useVendorAuth } from '../../contexts/VendorAuthContext';
import { useClientAuth } from '../../contexts/ClientAuthContext';
import negotiationService from '../../services/negotiationService';
import messagingService from '../../services/messagingService';
import './NegotiationButton.css';

const NegotiationButton = ({ 
  product, 
  vendor, 
  onNegotiationStarted = null,
  disabled = false,
  className = '' 
}) => {
  const { user: vendorUser } = useVendorAuth();
  const { user: clientUser } = useClientAuth();
  
  const currentUser = vendorUser || clientUser;
  const currentRole = vendorUser ? 'vendor' : 'client';
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [proposedPrice, setProposedPrice] = useState(getOriginalPrice());
  const [quantity, setQuantity] = useState(product?.minOrderQty || 1);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Helper function to get the original price based on product pricing logic
  function getOriginalPrice() {
    if (!product) return 0;
    
    // If offerPrice exists and is greater than 0, use offerPrice as original
    // Otherwise, use unitPrice as original
    if (product.offerPrice && product.offerPrice > 0) {
      return product.offerPrice;
    }
    return product.unitPrice || 0;
  }

  // Don't show button if user is not logged in or if it's the vendor's own product
  if (!currentUser || currentUser.uid === vendor?.uid) {
    return null;
  }

  const handleStartNegotiation = async () => {
    if (!proposedPrice || proposedPrice <= 0) {
      setError('Please enter a valid price');
      return;
    }

    if (!quantity || quantity < (product?.minOrderQty || 1)) {
      setError(`Minimum order quantity is ${product?.minOrderQty || 1} ${product?.unitType || 'unit'}`);
      return;
    }

    try {
      setLoading(true);
      setError('');

      // First, ensure there's a conversation between the user and vendor
      let conversationId = null;
      try {
        const conversation = await messagingService.findOrCreateConversation(
          currentUser.uid,
          currentRole,
          vendor.uid,
          'vendor',
          {
            productId: product._id,
            productName: product.name,
            productPrice: product.price,
            productImage: product.images?.[0],
            vendorStoreId: vendor.storeId
          }
        );
        conversationId = conversation._id;
      } catch (conversationError) {
        console.error('Error creating conversation:', conversationError);
        // Continue without conversation if it fails
      }

      // Start negotiation
      const negotiationData = {
        buyerUid: currentUser.uid,
        buyerRole: currentRole,
        sellerUid: vendor.uid,
        productId: product._id,
        proposedPrice: parseFloat(proposedPrice),
        quantity: parseInt(quantity),
        message: message.trim(),
        conversationId: conversationId
      };

      const result = await negotiationService.startNegotiation(negotiationData);

      // Close modal and reset form
      setIsModalOpen(false);
      setProposedPrice(getOriginalPrice());
      setQuantity(product?.minOrderQty || 1);
      setMessage('');

      // Notify parent component
      if (onNegotiationStarted) {
        onNegotiationStarted(result.negotiation);
      }

      // Show success message or redirect to messages
      alert('Negotiation started successfully! Check your messages for updates.');

    } catch (error) {
      console.error('Error starting negotiation:', error);
      setError(error.message || 'Failed to start negotiation');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = () => {
    return (parseFloat(proposedPrice || 0) * parseInt(quantity || 1)).toFixed(2);
  };

  const calculateSavings = () => {
    const originalPrice = getOriginalPrice();
    const original = originalPrice * quantity;
    const proposed = proposedPrice * quantity;
    const savings = original - proposed;
    const percentage = original > 0 ? ((savings / original) * 100).toFixed(1) : '0.0';
    
    return {
      amount: savings,
      percentage: percentage,
      isDiscount: savings > 0
    };
  };

  const savings = calculateSavings();

  return (
    <>
      <button
        className={`negotiation-button ${className}`}
        onClick={() => setIsModalOpen(true)}
        disabled={disabled || loading}
      >
        💰 Negotiate Price
      </button>

      {isModalOpen && (
        <div className="negotiation-modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="negotiation-modal" onClick={(e) => e.stopPropagation()}>
            <div className="negotiation-modal-header">
              <h3>Start Price Negotiation</h3>
              <button 
                className="close-button"
                onClick={() => setIsModalOpen(false)}
              >
                ×
              </button>
            </div>

            <div className="negotiation-modal-body">
              {/* Product Info */}
              <div className="product-info">
                <div className="product-image">
                  <img 
                    src={product.images?.[0] || '/placeholder-product.jpg'} 
                    alt={product.name}
                  />
                </div>
                <div className="product-details">
                  <h4>{product.name}</h4>
                  <p className="original-price">Original Price: ৳{getOriginalPrice()}</p>
                  <p className="vendor-name">Seller: {vendor.businessName}</p>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="error-message">
                  {error}
                </div>
              )}

              {/* Negotiation Form */}
              <div className="negotiation-form">
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="proposedPrice">Your Offer Price (৳)</label>
                    <input
                      type="number"
                      id="proposedPrice"
                      value={proposedPrice}
                      onChange={(e) => setProposedPrice(e.target.value)}
                      min="1"
                      step="0.01"
                      className="price-input"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="quantity">
                      Quantity (Min: {product?.minOrderQty || 1} {product?.unitType || 'unit'})
                    </label>
                    <div className="quantity-controls">
                      <button
                        type="button"
                        className="quantity-btn"
                        onClick={() => setQuantity(Math.max(quantity - 1, product?.minOrderQty || 1))}
                        disabled={quantity <= (product?.minOrderQty || 1)}
                      >
                        -
                      </button>
                      <input
                        type="number"
                        id="quantity"
                        value={quantity}
                        onChange={(e) => {
                          const newQuantity = parseInt(e.target.value) || (product?.minOrderQty || 1);
                          setQuantity(Math.max(newQuantity, product?.minOrderQty || 1));
                        }}
                        min={product?.minOrderQty || 1}
                        className="quantity-input"
                      />
                      <button
                        type="button"
                        className="quantity-btn"
                        onClick={() => setQuantity(quantity + 1)}
                      >
                        +
                      </button>
                    </div>
                    <small className="quantity-note">
                      Minimum order: {product?.minOrderQty || 1} {product?.unitType || 'unit'}
                    </small>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="message">Message (Optional)</label>
                  <textarea
                    id="message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Add a message to support your offer..."
                    rows="3"
                    maxLength="500"
                    className="message-input"
                  />
                  <small className="char-count">{message.length}/500</small>
                </div>

                {/* Price Summary */}
                <div className="price-summary">
                  <div className="summary-row">
                    <span>Original Total:</span>
                    <span>৳{(getOriginalPrice() * quantity).toFixed(2)}</span>
                  </div>
                  <div className="summary-row">
                    <span>Your Offer Total:</span>
                    <span className="offer-total">৳{calculateTotal()}</span>
                  </div>
                  {savings.isDiscount && (
                    <div className="summary-row savings">
                      <span>Potential Savings:</span>
                      <span>৳{savings.amount.toFixed(2)} ({savings.percentage}%)</span>
                    </div>
                  )}
                  {!savings.isDiscount && savings.amount < 0 && (
                    <div className="summary-row premium">
                      <span>Premium:</span>
                      <span>৳{Math.abs(savings.amount).toFixed(2)} (+{Math.abs(savings.percentage)}%)</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="negotiation-modal-footer">
              <button
                className="cancel-button"
                onClick={() => setIsModalOpen(false)}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                className="start-negotiation-button"
                onClick={handleStartNegotiation}
                disabled={loading || !proposedPrice || !quantity}
              >
                {loading ? 'Starting...' : 'Start Negotiation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default NegotiationButton;
