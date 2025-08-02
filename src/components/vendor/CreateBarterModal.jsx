import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FaPlus, FaTimes, FaCheck, FaExchangeAlt } from 'react-icons/fa';
import './CreateBarterModal.css';

const CreateBarterModal = ({ 
  isOpen, 
  onClose, 
  onSuccess 
}) => {
  // Modal states
  const [availableProducts, setAvailableProducts] = useState([]);
  const [vendorProducts, setVendorProducts] = useState([]);
  const [selectedTargetProduct, setSelectedTargetProduct] = useState(null);
  const [targetQuantity, setTargetQuantity] = useState(1);
  const [selectedOfferedItems, setSelectedOfferedItems] = useState([]);
  const [proposalMessage, setProposalMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [createBarterLoading, setCreateBarterLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);

  // Fetch products when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchAvailableProducts();
      fetchVendorProducts();
    }
  }, [isOpen]);

  // Auto-hide success notification after 4 seconds
  useEffect(() => {
    if (showSuccessNotification) {
      console.log('Success notification shown'); // Debug log
      const timer = setTimeout(() => {
        setShowSuccessNotification(false);
        console.log('Success notification hidden'); // Debug log
      }, 4000); // Increased to 4 seconds
      return () => clearTimeout(timer);
    }
  }, [showSuccessNotification]);

  // Fetch available products for barter (from other vendors)
  const fetchAvailableProducts = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('vendorToken') || sessionStorage.getItem('vendorToken');
      
      const response = await fetch('http://localhost:5005/api/products?status=approved', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        // Get current vendor's UID using the vendor products endpoint
        const vendorResponse = await fetch('http://localhost:5005/api/barter/vendor/products', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (vendorResponse.ok) {
          const vendorData = await vendorResponse.json();
          // Extract vendor UID from the first product if available
          const currentVendorUid = vendorData.products && vendorData.products.length > 0 
            ? vendorData.products[0].vendorUid 
            : null;
          
          // Filter products that are available for barter and exclude vendor's own products
          const filteredProducts = (data.products || data).filter(product => 
            product.barterAvailable && 
            product.vendorUid !== currentVendorUid &&
            product.totalQty > 0
          );
          setAvailableProducts(filteredProducts);
        } else {
          // If we can't get vendor info, just show all barter-available products
          const filteredProducts = (data.products || data).filter(product => 
            product.barterAvailable && product.totalQty > 0
          );
          setAvailableProducts(filteredProducts);
        }
      }
    } catch (error) {
      console.error('Error fetching available products:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch vendor's own products for offering
  const fetchVendorProducts = async () => {
    try {
      const token = localStorage.getItem('vendorToken') || sessionStorage.getItem('vendorToken');
      const response = await fetch('http://localhost:5005/api/barter/vendor/products', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setVendorProducts(data.products || []);
      }
    } catch (error) {
      console.error('Error fetching vendor products:', error);
    }
  };

  // Create new barter offer
  const handleCreateBarter = async () => {
    if (!selectedTargetProduct) {
      alert('Please select a target product');
      return;
    }
    
    if (selectedOfferedItems.length === 0) {
      alert('Please select at least one product to offer');
      return;
    }

    try {
      setCreateBarterLoading(true);
      const token = localStorage.getItem('vendorToken') || sessionStorage.getItem('vendorToken');
      
      const barterData = {
        targetProductId: selectedTargetProduct._id,
        targetQuantity,
        offeredItems: selectedOfferedItems.map(item => ({
          product: item._id,
          quantity: item.quantity,
          unitPrice: item.offerPrice || item.unitPrice,
          notes: item.notes || ''
        })),
        proposalMessage
      };

      const response = await fetch('http://localhost:5005/api/barter/offer', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(barterData)
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Show modern success notification instead of alert
          console.log('Setting success notification to true'); // Debug log
          setShowSuccessNotification(true);
          resetForm();
          setTimeout(() => {
            onClose();
            if (onSuccess) onSuccess();
          }, 2000); // Increased delay to 2 seconds to better see the notification
        } else {
          alert(`Error: ${data.message}`);
        }
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.message || 'Failed to create barter offer'}`);
      }
    } catch (error) {
      console.error('Error creating barter:', error);
      alert('Network error occurred');
    } finally {
      setCreateBarterLoading(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setSelectedTargetProduct(null);
    setTargetQuantity(1);
    setSelectedOfferedItems([]);
    setProposalMessage('');
    setSearchQuery('');
  };

  // Helper functions
  const addOfferedItem = useCallback((product) => {
    setSelectedOfferedItems(prev => {
      const existingItem = prev.find(item => item._id === product._id);
      if (existingItem) {
        return prev.map(item => 
          item._id === product._id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        return [...prev, { ...product, quantity: 1, notes: '' }];
      }
    });
  }, []);

  const removeOfferedItem = useCallback((productId) => {
    setSelectedOfferedItems(prev => prev.filter(item => item._id !== productId));
  }, []);

  const updateOfferedItemQuantity = useCallback((productId, quantity) => {
    if (quantity <= 0) {
      removeOfferedItem(productId);
      return;
    }
    
    setSelectedOfferedItems(prev => prev.map(item => 
      item._id === productId ? { ...item, quantity } : item
    ));
  }, [removeOfferedItem]);

  const calculateTotalOfferedValue = useCallback(() => {
    return selectedOfferedItems.reduce((total, item) => 
      total + (item.quantity * (item.offerPrice || item.unitPrice)), 0
    );
  }, [selectedOfferedItems]);

  const calculateTargetValue = useCallback(() => {
    if (!selectedTargetProduct) return 0;
    const price = selectedTargetProduct.offerPrice || selectedTargetProduct.unitPrice;
    return price * targetQuantity;
  }, [selectedTargetProduct, targetQuantity]);

  const formatCurrency = (amount) => {
    return `৳${Number(amount).toLocaleString()}`;
  };

  const filteredAvailableProducts = useMemo(() => 
    availableProducts.filter(product =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.businessName.toLowerCase().includes(searchQuery.toLowerCase())
    ), [availableProducts, searchQuery]
  );

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="create-barter-modal-overlay" onClick={handleClose}>
      <div className="create-barter-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="create-barter-modal-header">
          <h2>
            <FaPlus />
            Create New Barter Offer
          </h2>
          <button className="create-barter-close-btn" onClick={handleClose}>
            <FaTimes />
          </button>
        </div>
        
        {/* Success Notification */}
        {showSuccessNotification && (
          <div className="success-notification">
            <div className="success-notification-content">
              <div className="success-icon">
                <FaCheck />
              </div>
              <div className="success-text">
                <h4>🎉 Success!</h4>
                <p>Your barter offer has been created successfully!</p>
              </div>
            </div>
          </div>
        )}
        
        <div className="create-barter-modal-body">
          {loading ? (
            <div className="create-barter-loading">
              <p>Loading products...</p>
            </div>
          ) : (
            <div className="create-barter-form">
              {/* Step 1: Select Target Product */}
              <div className="create-barter-form-section">
                <h3>🎯 Step 1: What do you want?</h3>
                <div className="create-barter-search-bar">
                  <input
                    type="text"
                    placeholder="Search products by name, category, or business..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="create-barter-search-input"
                  />
                </div>

                <div className="create-barter-products-grid">
                  {filteredAvailableProducts.length === 0 ? (
                    <p className="create-barter-no-products">No products available for barter</p>
                  ) : (
                    filteredAvailableProducts.map(product => (
                      <div 
                        key={product._id} 
                        className={`create-barter-product-card ${selectedTargetProduct?._id === product._id ? 'selected' : ''}`}
                        onClick={() => setSelectedTargetProduct(product)}
                      >
                        <img
                          src={product.images?.[0] || '/placeholder-product.jpg'}
                          alt={product.name}
                          className="create-barter-product-image"
                        />
                        <div className="create-barter-product-info">
                          <h5>{product.name}</h5>
                          <p className="business-name">{product.businessName}</p>
                          <p className="price">৳{product.offerPrice || product.unitPrice} per {product.unitType}</p>
                          <p className="stock">Stock: {product.totalQty}</p>
                          <p className="category">{product.category}</p>
                        </div>
                        {selectedTargetProduct?._id === product._id && (
                          <div className="create-barter-selected-badge">
                            <FaCheck />
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {selectedTargetProduct && (
                  <div className="create-barter-target-details">
                    <h4>Selected Target Product:</h4>
                    <div className="create-barter-target-summary">
                      <img
                        src={selectedTargetProduct.images?.[0] || '/placeholder-product.jpg'}
                        alt={selectedTargetProduct.name}
                        className="create-barter-target-image"
                      />
                      <div className="create-barter-target-info">
                        <p><strong>{selectedTargetProduct.name}</strong></p>
                        <p>Business: {selectedTargetProduct.businessName}</p>
                        <p>Price: ৳{selectedTargetProduct.offerPrice || selectedTargetProduct.unitPrice} per {selectedTargetProduct.unitType}</p>
                      </div>
                      <div className="create-barter-quantity-selector">
                        <label>Quantity:</label>
                        <input
                          type="number"
                          min="1"
                          max={selectedTargetProduct.totalQty}
                          value={targetQuantity}
                          onChange={(e) => setTargetQuantity(parseInt(e.target.value) || 1)}
                        />
                        <p className="create-barter-total-value">Total Value: {formatCurrency(calculateTargetValue())}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Step 2: Select Offered Products */}
              <div className="create-barter-form-section">
                <h3>🛍️ Step 2: What will you offer?</h3>
                
                <div className="create-barter-products-grid">
                  {vendorProducts.length === 0 ? (
                    <p className="create-barter-no-products">You have no products available for barter</p>
                  ) : (
                    vendorProducts.map(product => (
                      <div 
                        key={product._id} 
                        className={`create-barter-product-card ${selectedOfferedItems.find(item => item._id === product._id) ? 'selected' : ''}`}
                        onClick={() => addOfferedItem(product)}
                      >
                        <img
                          src={product.images?.[0] || '/placeholder-product.jpg'}
                          alt={product.name}
                          className="create-barter-product-image"
                        />
                        <div className="create-barter-product-info">
                          <h5>{product.name}</h5>
                          <p className="price">৳{product.offerPrice || product.unitPrice} per {product.unitType}</p>
                          <p className="stock">Stock: {product.totalQty}</p>
                          <p className="category">{product.category}</p>
                        </div>
                        {selectedOfferedItems.find(item => item._id === product._id) && (
                          <div className="create-barter-selected-badge">
                            <FaPlus />
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {selectedOfferedItems.length > 0 && (
                  <div className="create-barter-offered-items-summary">
                    <h4>Selected Offered Items:</h4>
                    {selectedOfferedItems.map(item => (
                      <div key={item._id} className="create-barter-offered-item-row">
                        <img
                          src={item.images?.[0] || '/placeholder-product.jpg'}
                          alt={item.name}
                          className="create-barter-item-image"
                        />
                        <div className="create-barter-item-info">
                          <p><strong>{item.name}</strong></p>
                          <p>Unit Price: ৳{item.offerPrice || item.unitPrice}</p>
                        </div>
                        <div className="create-barter-quantity-controls">
                          <button 
                            onClick={() => updateOfferedItemQuantity(item._id, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                          >
                            -
                          </button>
                          <span>{item.quantity}</span>
                          <button 
                            onClick={() => updateOfferedItemQuantity(item._id, item.quantity + 1)}
                            disabled={item.quantity >= item.totalQty}
                          >
                            +
                          </button>
                        </div>
                        <div className="create-barter-item-total">
                          {formatCurrency(item.quantity * (item.offerPrice || item.unitPrice))}
                        </div>
                        <button 
                          className="create-barter-remove-item-btn"
                          onClick={() => removeOfferedItem(item._id)}
                        >
                          <FaTimes />
                        </button>
                      </div>
                    ))}
                    <div className="create-barter-total-offered-value">
                      <strong>Total Offered Value: {formatCurrency(calculateTotalOfferedValue())}</strong>
                    </div>
                  </div>
                )}
              </div>

              {/* Value Comparison */}
              {selectedTargetProduct && selectedOfferedItems.length > 0 && (
                <div className="create-barter-form-section create-barter-value-comparison">
                  <h3>💰 Value Analysis</h3>
                  <div className="create-barter-value-grid">
                    <div className="create-barter-value-item target">
                      <h4>Target Value</h4>
                      <p>{formatCurrency(calculateTargetValue())}</p>
                    </div>
                    <div className="create-barter-value-item offered">
                      <h4>Offered Value</h4>
                      <p>{formatCurrency(calculateTotalOfferedValue())}</p>
                    </div>
                    <div className="create-barter-value-item difference">
                      <h4>Difference</h4>
                      <p className={calculateTotalOfferedValue() >= calculateTargetValue() ? 'positive' : 'negative'}>
                        {formatCurrency(Math.abs(calculateTotalOfferedValue() - calculateTargetValue()))}
                        {calculateTotalOfferedValue() >= calculateTargetValue() ? ' over' : ' under'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Add Message */}
              <div className="create-barter-form-section">
                <h3>💬 Step 3: Add a message (Optional)</h3>
                <textarea
                  placeholder="Explain your offer, mention quality, delivery preferences, or any special terms..."
                  value={proposalMessage}
                  onChange={(e) => setProposalMessage(e.target.value)}
                  rows={4}
                  className="create-barter-proposal-message"
                />
              </div>
            </div>
          )}
        </div>

        <div className="create-barter-modal-footer">
          <button 
            className="create-barter-submit-btn"
            onClick={handleCreateBarter}
            disabled={createBarterLoading || !selectedTargetProduct || selectedOfferedItems.length === 0}
          >
            {createBarterLoading ? 'Creating...' : (
              <>
                <FaExchangeAlt /> Send Barter Offer
              </>
            )}
          </button>
          <button 
            className="create-barter-cancel-btn" 
            onClick={handleClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateBarterModal;
