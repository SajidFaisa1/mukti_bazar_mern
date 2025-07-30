import React, { useState, useEffect } from 'react';
import { FaExchangeAlt, FaPlus, FaMinus, FaTimes, FaSpinner } from 'react-icons/fa';
import './BarterOffer.css';

const BarterOffer = ({ product, onClose, currentUser }) => {
  const [step, setStep] = useState(1); // 1: Select products, 2: Review & Submit
  const [vendorProducts, setVendorProducts] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [targetQuantity, setTargetQuantity] = useState(1);
  const [proposalMessage, setProposalMessage] = useState('');
  const [qualityNotes, setQualityNotes] = useState('');
  const [conditionRequirements, setConditionRequirements] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Calculate values
  const targetPrice = product.offerPrice || product.unitPrice;
  const targetValue = targetPrice * targetQuantity;
  const totalOfferedValue = selectedProducts.reduce((total, item) => 
    total + (item.quantity * (item.offerPrice || item.unitPrice)), 0
  );
  const valueDifference = targetValue - totalOfferedValue;

  useEffect(() => {
    fetchVendorProducts();
  }, []);

  const fetchVendorProducts = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('vendorToken') || sessionStorage.getItem('vendorToken');
      
      const response = await fetch('http://localhost:5005/api/barter/vendor/products', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setVendorProducts(data.products || []);
      } else {
        setError('Failed to load your products');
      }
    } catch (error) {
      setError('Failed to load your products');
      console.error('Fetch vendor products error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProductSelect = (productToAdd) => {
    const isSelected = selectedProducts.find(p => p._id === productToAdd._id);
    
    if (isSelected) {
      setSelectedProducts(selectedProducts.filter(p => p._id !== productToAdd._id));
    } else {
      setSelectedProducts([...selectedProducts, { ...productToAdd, quantity: 1 }]);
    }
  };

  const updateProductQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      setSelectedProducts(selectedProducts.filter(p => p._id !== productId));
      return;
    }

    const product = vendorProducts.find(p => p._id === productId);
    if (newQuantity > product.totalQty) {
      return; // Don't allow quantity more than available stock
    }

    setSelectedProducts(selectedProducts.map(p => 
      p._id === productId ? { ...p, quantity: newQuantity } : p
    ));
  };

  const handleSubmitOffer = async () => {
    if (selectedProducts.length === 0) {
      setError('Please select at least one product to offer');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const token = localStorage.getItem('vendorToken') || sessionStorage.getItem('vendorToken');
      
      const offerData = {
        targetProductId: product._id,
        targetQuantity,
        offeredItems: selectedProducts.map(p => ({
          product: p._id,
          quantity: p.quantity,
          unitPrice: p.offerPrice || p.unitPrice,
          notes: ''
        })),
        proposalMessage,
        qualityNotes,
        conditionRequirements
      };

      const response = await fetch('http://localhost:5005/api/barter/offer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(offerData)
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        setError(data.message || 'Failed to create barter offer');
      }
    } catch (error) {
      setError('Failed to create barter offer');
      console.error('Submit barter offer error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="barter-modal-overlay">
        <div className="barter-modal-content success-modal">
          <div className="success-animation">
            <div className="checkmark">✓</div>
          </div>
          <h2>Barter Offer Sent!</h2>
          <p>Your barter offer has been sent successfully. The vendor will be notified and can respond to your offer.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="barter-modal-overlay">
      <div className="barter-modal-content">
        <div className="barter-modal-header">
          <h2>
            <FaExchangeAlt className="barter-icon" />
            Create Barter Offer
          </h2>
          <button className="close-btn" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <div className="barter-progress">
          <div className={`progress-step ${step >= 1 ? 'active' : ''}`}>
            <span>1</span>
            <label>Select Products</label>
          </div>
          <div className={`progress-step ${step >= 2 ? 'active' : ''}`}>
            <span>2</span>
            <label>Review & Submit</label>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        {step === 1 && (
          <div className="barter-step">
            <div className="target-product-section">
              <h3>Product You Want</h3>
              <div className="target-product-card">
                <img 
                  src={product.images?.[0] || '/placeholder-product.jpg'} 
                  alt={product.name}
                  className="product-image"
                />
                <div className="product-details">
                  <h4>{product.name}</h4>
                  <p className="product-price">৳{targetPrice} per {product.unitType}</p>
                  <div className="quantity-selector">
                    <label>Quantity needed:</label>
                    <div className="quantity-controls">
                      <button 
                        onClick={() => setTargetQuantity(Math.max(1, targetQuantity - 1))}
                        disabled={targetQuantity <= 1}
                      >
                        <FaMinus />
                      </button>
                      <span>{targetQuantity}</span>
                      <button 
                        onClick={() => setTargetQuantity(targetQuantity + 1)}
                        disabled={targetQuantity >= product.totalQty}
                      >
                        <FaPlus />
                      </button>
                    </div>
                  </div>
                  <div className="target-value">
                    <strong>Total Value: ৳{targetValue}</strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="offer-products-section">
              <h3>Your Products to Offer</h3>
              {loading ? (
                <div className="loading-spinner">
                  <FaSpinner className="spin" />
                  <span>Loading your products...</span>
                </div>
              ) : (
                <>
                  <div className="products-grid">
                    {vendorProducts.map(vendorProduct => {
                      const isSelected = selectedProducts.find(p => p._id === vendorProduct._id);
                      return (
                        <div 
                          key={vendorProduct._id}
                          className={`product-card ${isSelected ? 'selected' : ''}`}
                          onClick={() => handleProductSelect(vendorProduct)}
                        >
                          <img 
                            src={vendorProduct.images?.[0] || '/placeholder-product.jpg'} 
                            alt={vendorProduct.name}
                            className="product-image"
                          />
                          <div className="product-info">
                            <h5>{vendorProduct.name}</h5>
                            <p>৳{vendorProduct.offerPrice || vendorProduct.unitPrice} per {vendorProduct.unitType}</p>
                            <p className="stock-info">Stock: {vendorProduct.totalQty}</p>
                          </div>
                          {isSelected && (
                            <div className="selected-badge">
                              <FaExchangeAlt />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {selectedProducts.length > 0 && (
                    <div className="selected-products-section">
                      <h4>Selected Products ({selectedProducts.length})</h4>
                      <div className="selected-products-list">
                        {selectedProducts.map(selectedProduct => (
                          <div key={selectedProduct._id} className="selected-product-item">
                            <img 
                              src={selectedProduct.images?.[0] || '/placeholder-product.jpg'} 
                              alt={selectedProduct.name}
                              className="small-product-image"
                            />
                            <div className="product-details">
                              <h6>{selectedProduct.name}</h6>
                              <p>৳{selectedProduct.offerPrice || selectedProduct.unitPrice} per {selectedProduct.unitType}</p>
                            </div>
                            <div className="quantity-controls">
                              <button 
                                onClick={() => updateProductQuantity(selectedProduct._id, selectedProduct.quantity - 1)}
                                disabled={selectedProduct.quantity <= 1}
                              >
                                <FaMinus />
                              </button>
                              <span>{selectedProduct.quantity}</span>
                              <button 
                                onClick={() => updateProductQuantity(selectedProduct._id, selectedProduct.quantity + 1)}
                                disabled={selectedProduct.quantity >= selectedProduct.totalQty}
                              >
                                <FaPlus />
                              </button>
                            </div>
                            <div className="item-total">
                              ৳{selectedProduct.quantity * (selectedProduct.offerPrice || selectedProduct.unitPrice)}
                            </div>
                            <button 
                              className="remove-btn"
                              onClick={() => handleProductSelect(selectedProduct)}
                            >
                              <FaTimes />
                            </button>
                          </div>
                        ))}
                      </div>
                      
                      <div className="value-summary">
                        <div className="value-row">
                          <span>Your Offer Value:</span>
                          <span>৳{totalOfferedValue}</span>
                        </div>
                        <div className="value-row">
                          <span>Target Value:</span>
                          <span>৳{targetValue}</span>
                        </div>
                        <div className={`value-row difference ${valueDifference > 0 ? 'positive' : valueDifference < 0 ? 'negative' : 'neutral'}`}>
                          <span>Difference:</span>
                          <span>
                            {valueDifference > 0 ? '+' : ''}৳{valueDifference}
                            {valueDifference > 0 && ' (You need to add more value)'}
                            {valueDifference < 0 && ' (You\'re offering extra value)'}
                            {valueDifference === 0 && ' (Perfect match!)'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="step-actions">
              <button 
                className="next-btn"
                onClick={() => setStep(2)}
                disabled={selectedProducts.length === 0}
              >
                Next: Review Offer
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="barter-step">
            <div className="review-section">
              <h3>Review Your Barter Offer</h3>
              
              <div className="offer-summary">
                <div className="summary-row">
                  <div className="summary-item">
                    <h4>You Want</h4>
                    <div className="summary-product">
                      <img 
                        src={product.images?.[0] || '/placeholder-product.jpg'} 
                        alt={product.name}
                        className="summary-image"
                      />
                      <div>
                        <p><strong>{product.name}</strong></p>
                        <p>Quantity: {targetQuantity} {product.unitType}</p>
                        <p>Value: ৳{targetValue}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="exchange-arrow">
                    <FaExchangeAlt />
                  </div>
                  
                  <div className="summary-item">
                    <h4>You Offer</h4>
                    <div className="summary-products">
                      {selectedProducts.map(item => (
                        <div key={item._id} className="summary-product">
                          <img 
                            src={item.images?.[0] || '/placeholder-product.jpg'} 
                            alt={item.name}
                            className="summary-image"
                          />
                          <div>
                            <p><strong>{item.name}</strong></p>
                            <p>Quantity: {item.quantity} {item.unitType}</p>
                            <p>Value: ৳{item.quantity * (item.offerPrice || item.unitPrice)}</p>
                          </div>
                        </div>
                      ))}
                      <div className="total-offered">
                        <strong>Total Offered: ৳{totalOfferedValue}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="message-section">
                <div className="form-group">
                  <label>Proposal Message</label>
                  <textarea
                    value={proposalMessage}
                    onChange={(e) => setProposalMessage(e.target.value)}
                    placeholder="Explain why this is a good trade for both parties..."
                    rows={3}
                  />
                </div>
                
                <div className="form-group">
                  <label>Quality Notes</label>
                  <textarea
                    value={qualityNotes}
                    onChange={(e) => setQualityNotes(e.target.value)}
                    placeholder="Describe the quality and condition of your products..."
                    rows={2}
                  />
                </div>
                
                <div className="form-group">
                  <label>Condition Requirements</label>
                  <textarea
                    value={conditionRequirements}
                    onChange={(e) => setConditionRequirements(e.target.value)}
                    placeholder="What condition do you expect the target product to be in..."
                    rows={2}
                  />
                </div>
              </div>
            </div>

            <div className="step-actions">
              <button 
                className="back-btn"
                onClick={() => setStep(1)}
              >
                Back
              </button>
              <button 
                className="submit-btn"
                onClick={handleSubmitOffer}
                disabled={loading || selectedProducts.length === 0}
              >
                {loading ? (
                  <>
                    <FaSpinner className="spin" />
                    Sending Offer...
                  </>
                ) : (
                  'Send Barter Offer'
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BarterOffer;
