"use client"
import { useCart } from "../contexts/CartContext"
import { Link, useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { ShoppingCart, Trash2, Minus, Plus, ArrowLeft, Package, Truck, CreditCard, X, ShoppingBag, MapPin, User } from "lucide-react"
import { useState, useEffect, useCallback, useRef } from "react"
import AddAddressModal from "./settings/AddAddressModal"
import { useVendorAuth } from "../contexts/VendorAuthContext"
import { useClientAuth } from "../contexts/ClientAuthContext"
import "./Cart.css"

const ModernCart = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { 
    cart, 
    removeFromCart, 
    updateQuantity, 
    clearCart, 
    cartTotal, 
    itemCount, 
    loading, 
    error, 
    updateDeliveryAddress,
    getDeliveryMethods,
    calculateDeliveryFee,
    updateDeliveryDetails
  } = useCart()
  
  // Use auth contexts
  const vendorAuth = useVendorAuth() || {}
  const clientAuth = useClientAuth() || {}
  
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [loadingAddress, setLoadingAddress] = useState(false)
  
  // Delivery states
  const [deliveryMethods, setDeliveryMethods] = useState([])
  const [selectedDeliveryMethod, setSelectedDeliveryMethod] = useState('')
  const [deliveryFee, setDeliveryFee] = useState(0)
  const [totalWeight, setTotalWeight] = useState(0)
  const [loadingDelivery, setLoadingDelivery] = useState(false)
  const [loadingDeliveryMethods, setLoadingDeliveryMethods] = useState(false)
  const [negotiatedFee, setNegotiatedFee] = useState(0)
  
  // Lazy update states
  const [pendingUpdates, setPendingUpdates] = useState({
    deliveryMethod: null,
    deliveryFee: null,
    negotiatedFee: null,
    needsUpdate: false
  })
  
  // Debounce ref for negotiated fee updates
  const negotiatedFeeTimeoutRef = useRef(null)
  const deliveryFeeTimeoutRef = useRef(null)

  // Get delivery address from cart or fetch default if cart doesn't have one
  useEffect(() => {
    const setupAddressAndUser = async () => {
      try {
        // Get current user info from auth contexts with fallback to storage
        let userInfo = null
        let userRole = null
        let token = null
        
        // Check vendor auth first
        if (vendorAuth.user) {
          userInfo = vendorAuth.user
          userRole = 'vendor'
          token = vendorAuth.token
        } else if (clientAuth.user) {
          userInfo = clientAuth.user
          userRole = 'client'
          token = clientAuth.token
        } else {
          // Fallback to storage if contexts are not available
          const clientUser = JSON.parse(localStorage.getItem('clientUser') || 'null')
          if (clientUser) {
            userInfo = clientUser
            userRole = 'client'
            token = localStorage.getItem('clientToken')
          } else {
            const vendorUser = JSON.parse(sessionStorage.getItem('vendorUser') || 'null')
            if (vendorUser) {
              userInfo = vendorUser
              userRole = 'vendor'
              token = sessionStorage.getItem('vendorToken')
            }
          }
        }
        
        console.log('Final userInfo:', userInfo, 'Role:', userRole)
        setCurrentUser({ ...userInfo, role: userRole, token })
      } catch (error) {
        console.error('Failed to setup user:', error)
      }
    }

    setupAddressAndUser()
  }, [vendorAuth.user, clientAuth.user]) // Only re-run when auth state changes

  // Separate useEffect for address loading to prevent interference with quantity updates
  useEffect(() => {
    const loadDefaultAddress = async () => {
      // Only try to set default address if we have user info, cart is loaded, and cart doesn't have delivery address
      if (currentUser?.uid && cart && cart.items !== undefined && !cart.deliveryAddress && !loadingAddress) {
        setLoadingAddress(true)
        try {
          console.log('Fetching default address for uid:', currentUser.uid)
          const response = await fetch(`http://localhost:5005/api/addresses/default/${currentUser.uid}`)
          console.log('Default address fetch response:', response.status, response.ok)
          
          if (response.ok) {
            const address = await response.json()
            console.log('Found default address, updating cart:', address)
            // Update cart with default address
            await updateDeliveryAddress(address._id)
          } else {
            console.log('No default address found')
          }
        } catch (error) {
          console.error('Failed to set default address:', error)
        } finally {
          setLoadingAddress(false)
        }
      }
    }

    // Only load address if we have current user and cart is ready
    // Add a small delay to prevent interference with quantity updates
    if (currentUser?.uid && cart && cart.items !== undefined && !cart.deliveryAddress && !loading) {
      const timeoutId = setTimeout(() => {
        loadDefaultAddress()
      }, 300) // Small delay to let cart operations settle
      
      return () => clearTimeout(timeoutId)
    }
  }, [currentUser?.uid, cart.deliveryAddress, loading]) // Only depend on user, delivery address, and loading state

  // Load delivery methods when cart has items (only once)
  useEffect(() => {
    const loadDeliveryMethods = async () => {
      if (cart.items?.length > 0) {
        setLoadingDeliveryMethods(true)
        try {
          const deliveryData = await getDeliveryMethods()
          setDeliveryMethods(deliveryData.deliveryMethods)
          setTotalWeight(deliveryData.totalWeight)
          
          // If cart already has a delivery method selected, use it
          if (cart.deliveryMethod) {
            setSelectedDeliveryMethod(cart.deliveryMethod)
            setDeliveryFee(cart.deliveryFee || 0)
            if (cart.deliveryMethod === 'negotiated') {
              setNegotiatedFee(cart.deliveryFee || 0)
            }
          } else {
            // Set recommended method as default
            if (deliveryData.recommendedMethod) {
              setSelectedDeliveryMethod(deliveryData.recommendedMethod)
              
              // Calculate fee for recommended method
              const feeData = await calculateDeliveryFee(deliveryData.recommendedMethod)
              setDeliveryFee(feeData.deliveryFee)
              
              // Update cart with selected delivery details
              await updateDeliveryDetails(deliveryData.recommendedMethod, feeData.deliveryFee, '', 0)
            }
          }
        } catch (error) {
          console.error('Failed to load delivery methods:', error)
          // Set default delivery methods if API fails
          setDeliveryMethods([
            {
              id: 'pickup',
              name: 'Pickup by Yourself',
              description: 'Collect from our warehouse/farm',
              fee: 0,
              estimatedDays: '0',
              icon: '🏪'
            }
          ])
          setSelectedDeliveryMethod('pickup')
          setDeliveryFee(0)
        } finally {
          setLoadingDeliveryMethods(false)
        }
      }
    }

    // Only load delivery methods if we don't already have them
    if (cart.items?.length > 0 && deliveryMethods.length === 0 && !loadingDeliveryMethods) {
      loadDeliveryMethods()
    }
  }, [cart.items?.length > 0, deliveryMethods.length === 0, loadingDeliveryMethods]) // Added loadingDeliveryMethods to prevent multiple loads

  // Save pending updates to database - stable reference to prevent infinite loops
  const savePendingUpdates = useCallback(async () => {
    if (pendingUpdates.needsUpdate) {
      try {
        const updates = { ...pendingUpdates } // Capture current state
        
        // Clear pending updates first to prevent loops
        setPendingUpdates({
          deliveryMethod: null,
          deliveryFee: null,
          negotiatedFee: null,
          needsUpdate: false
        })
        
        await updateDeliveryDetails(
          updates.deliveryMethod || selectedDeliveryMethod,
          updates.deliveryFee !== null ? updates.deliveryFee : deliveryFee,
          '',
          updates.negotiatedFee !== null ? updates.negotiatedFee : negotiatedFee
        )
        
        console.log('Cart updates saved to database')
      } catch (error) {
        console.error('Failed to save cart updates:', error)
        // Restore pending updates on error
        setPendingUpdates(prev => ({ ...prev, needsUpdate: true }))
      }
    }
  }, [pendingUpdates.needsUpdate, pendingUpdates.deliveryMethod, pendingUpdates.deliveryFee, pendingUpdates.negotiatedFee, selectedDeliveryMethod, deliveryFee, negotiatedFee, updateDeliveryDetails])

  // Recalculate delivery fee when quantity changes (but don't save immediately)
  useEffect(() => {
    const recalculateDeliveryFee = async () => {
      if (cart.items?.length > 0 && selectedDeliveryMethod && selectedDeliveryMethod !== 'negotiated') {
        // Clear existing timeout
        if (deliveryFeeTimeoutRef.current) {
          clearTimeout(deliveryFeeTimeoutRef.current)
        }
        
        // Debounce the delivery fee calculation to avoid too many calls
        deliveryFeeTimeoutRef.current = setTimeout(async () => {
          try {
            // Find the selected method in our local data first
            const selectedMethod = deliveryMethods.find(method => method.id === selectedDeliveryMethod)
            if (selectedMethod && selectedMethod.fee !== undefined) {
              // Use local fee data if available
              if (selectedMethod.fee !== deliveryFee) {
                setDeliveryFee(selectedMethod.fee)
                
                // Mark for lazy update (save only on navigation/reload)
                setPendingUpdates(prev => ({
                  ...prev,
                  deliveryFee: selectedMethod.fee,
                  needsUpdate: true
                }))
              }
            } else {
              // Only call API if we don't have local data
              const feeData = await calculateDeliveryFee(selectedDeliveryMethod)
              if (feeData.deliveryFee !== deliveryFee) {
                setDeliveryFee(feeData.deliveryFee)
                
                // Mark for lazy update (save only on navigation/reload)
                setPendingUpdates(prev => ({
                  ...prev,
                  deliveryFee: feeData.deliveryFee,
                  needsUpdate: true
                }))
              }
            }
          } catch (error) {
            console.error('Failed to recalculate delivery fee:', error)
          }
        }, 1000) // Increased debounce to 1 second
      }
    }

    // Only recalculate if we have items and a selected method (not for negotiated)
    if (cart.items?.length > 0 && selectedDeliveryMethod && selectedDeliveryMethod !== 'negotiated' && deliveryMethods.length > 0) {
      recalculateDeliveryFee()
    }
  }, [cart.items?.length, selectedDeliveryMethod, deliveryMethods.length]) // Simplified dependencies to prevent unnecessary re-renders

  // Sync local state with cart delivery method when cart updates (but don't override pending changes)
  useEffect(() => {
    if (cart.deliveryMethod && cart.deliveryMethod !== selectedDeliveryMethod && !pendingUpdates.needsUpdate) {
      setSelectedDeliveryMethod(cart.deliveryMethod)
      setDeliveryFee(cart.deliveryFee || 0)
      if (cart.deliveryMethod === 'negotiated') {
        setNegotiatedFee(cart.deliveryFee || 0)
      }
    }
  }, [cart.deliveryMethod, cart.deliveryFee, selectedDeliveryMethod, pendingUpdates.needsUpdate]) // Added pendingUpdates.needsUpdate to prevent overriding pending changes

  const handleAddAddress = async () => {
    // Refresh the address after adding a new one
    try {
      // Get current user info from auth contexts with fallback to storage
      let userInfo = null
      
      if (vendorAuth.user) {
        userInfo = vendorAuth.user
      } else if (clientAuth.user) {
        userInfo = clientAuth.user
      } else {
        // Fallback to storage
        const clientUser = JSON.parse(localStorage.getItem('clientUser') || 'null')
        if (clientUser) {
          userInfo = clientUser
        } else {
          const vendorUser = JSON.parse(sessionStorage.getItem('vendorUser') || 'null')
          if (vendorUser) {
            userInfo = vendorUser
          }
        }
      }
      
      console.log('Refreshing address for user:', userInfo)
      
      if (userInfo?.uid) {
        const response = await fetch(`http://localhost:5005/api/addresses/default/${userInfo.uid}`)
        console.log('Address refresh response:', response.status, response.ok)
        
        if (response.ok) {
          const address = await response.json()
          console.log('Refreshed address:', address)
          
          // Update the cart's delivery address
          if (address._id) {
            await updateDeliveryAddress(address._id)
          }
        }
      }
    } catch (error) {
      console.error('Failed to refresh address:', error)
    }
    setIsAddressModalOpen(false)
  }

  const handleQuantityChange = useCallback((itemId, newQuantity, minQty = 1) => {
    if (newQuantity >= minQty) {
      updateQuantity(itemId, newQuantity)
    }
  }, [updateQuantity])

  const handleDeliveryMethodChange = useCallback((methodId) => {
    // Prevent unnecessary calls if the method is already selected
    if (methodId === selectedDeliveryMethod) {
      return;
    }
    
    try {
      // Update state optimistically
      setSelectedDeliveryMethod(methodId)
      
      // Get the fee from local delivery methods data instead of API call
      const selectedMethod = deliveryMethods.find(method => method.id === methodId)
      let newFee = 0
      
      if (selectedMethod) {
        if (methodId === 'negotiated') {
          newFee = negotiatedFee
        } else {
          newFee = selectedMethod.fee || 0
        }
      }
      
      setDeliveryFee(newFee)
      
      // Mark for lazy update (save only on navigation/reload) - NO API CALL HERE
      setPendingUpdates(prev => ({
        ...prev,
        deliveryMethod: methodId,
        deliveryFee: newFee,
        needsUpdate: true
      }))
      
    } catch (error) {
      console.error('Failed to update delivery method:', error)
      // Revert state on error
      setSelectedDeliveryMethod(cart.deliveryMethod || '')
      setDeliveryFee(cart.deliveryFee || 0)
    }
  }, [selectedDeliveryMethod, negotiatedFee, deliveryMethods, cart.deliveryMethod, cart.deliveryFee])

  const handleNegotiatedFeeChange = useCallback((fee) => {
    // Only proceed if the fee actually changed
    if (fee === negotiatedFee) {
      return;
    }
    
    // Update local state immediately for responsive UI
    setNegotiatedFee(fee)
    
    // Clear existing timeout
    if (negotiatedFeeTimeoutRef.current) {
      clearTimeout(negotiatedFeeTimeoutRef.current)
    }
    
    // Only update local state and mark for lazy save - NO API CALL
    if (selectedDeliveryMethod === 'negotiated') {
      // Update delivery fee immediately to the negotiated fee value
      setDeliveryFee(fee)
      
      // Mark for lazy update (save only on navigation/reload)
      setPendingUpdates(prev => ({
        ...prev,
        negotiatedFee: fee,
        deliveryFee: fee,
        needsUpdate: true
      }))
    }
  }, [selectedDeliveryMethod, negotiatedFee])

  const handleSaveNegotiatedFee = useCallback(async () => {
    if (selectedDeliveryMethod === 'negotiated' && pendingUpdates.needsUpdate) {
      try {
        await savePendingUpdates()
        console.log('Negotiated fee saved successfully')
      } catch (error) {
        console.error('Failed to save negotiated fee:', error)
      }
    }
  }, [selectedDeliveryMethod, pendingUpdates.needsUpdate, savePendingUpdates])

  const handleNegotiatedFeeKeyPress = useCallback((e) => {
    if (e.key === 'Enter') {
      handleSaveNegotiatedFee()
    }
  }, [handleSaveNegotiatedFee])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (negotiatedFeeTimeoutRef.current) {
        clearTimeout(negotiatedFeeTimeoutRef.current)
      }
      if (deliveryFeeTimeoutRef.current) {
        clearTimeout(deliveryFeeTimeoutRef.current)
      }
    }
  }, [])

  // Save on page unload (refresh/close)
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (pendingUpdates.needsUpdate) {
        // This will trigger the browser's "are you sure you want to leave" dialog
        e.preventDefault()
        e.returnValue = ''
        
        // Try to save (though this might not complete due to page unload)
        savePendingUpdates()
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [pendingUpdates.needsUpdate]) // Removed savePendingUpdates dependency

  // Save on component unmount or navigation
  useEffect(() => {
    return () => {
      if (pendingUpdates.needsUpdate) {
        // Synchronous save attempt on unmount
        savePendingUpdates()
      }
    }
  }, [pendingUpdates.needsUpdate]) // Removed savePendingUpdates dependency

  // Show loading state
  if (loading) {
    return (
      <div className="modern-cart-container">
        <div className="empty-cart-state">
          <div className="empty-cart-content">
            <p>Loading cart...</p>
          </div>
        </div>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="modern-cart-container">
        <div className="empty-cart-state">
          <div className="empty-cart-content">
            <p className="text-red-500">Error: {error}</p>
            <button onClick={() => window.location.reload()}>Refresh</button>
          </div>
        </div>
      </div>
    )
  }

  if (cart.items.length === 0) {
    return (
      <div className="modern-cart-container">
        <div className="empty-cart-state">
          <div className="empty-cart-content">
            <div className="empty-cart-icon">
              <ShoppingBag className="empty-icon" />
            </div>
            <h2 className="empty-cart-title">{t("cart.empty")}</h2>
            <p className="empty-cart-description">{t("cart.addItems")}</p>
            <Link to="/products" className="continue-shopping-btn">
              <ArrowLeft className="btn-icon" />
              {t("cart.continueShopping")}
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="modern-cart-container">
      <div className="cart-wrapper">
        {/* Cart Header */}
        <div className="cart-header">
          <div className="header-content">
            <div className="header-title-section">
              <ShoppingCart className="cart-icon" />
              <div>
                <h1 className="cart-title">{t("cart.title")}</h1>
                <p className="cart-subtitle">
                  {itemCount} {itemCount === 1 ? "item" : "items"} in your cart
                </p>
              </div>
            </div>
            <button onClick={clearCart} className="clear-cart-btn">
              <Trash2 className="clear-icon" />
              {t("cart.clearCart")}
            </button>
          </div>
        </div>

        <div className="cart-content">
          {/* Cart Items */}
          <div className="cart-items-section">
            <div className="cart-items">
              {cart.items.map((item) => (
                <div key={item._id || item.id} className="modern-cart-item">
                  <div className="item-image-container">
                    <img src={item.images?.[0] || "/placeholder-product.jpg"} alt={item.name || item.title} className="item-image" />
                  </div>

                  <div className="item-details">
                    <div className="item-info">
                      <h3 className="item-title">{item.name || item.title}</h3>
                      <p className="item-price">৳{(item.offerPrice || item.unitPrice || item.price || 0).toFixed(2)} per unit</p>
                      {item.category && <span className="item-category">{item.category}</span>}
                    </div>

                    <div className="item-actions">
                      <div className="quantity-controls">
                        <button
                          onClick={() => handleQuantityChange(item._id || item.id, item.quantity - 1, item.minOrderQty || 1)}
                          className="quantity-btn"
                          disabled={item.quantity <= (item.minOrderQty || 1)}
                          aria-label="Decrease quantity"
                        >
                          <Minus className="quantity-icon" />
                        </button>
                        <div className="quantity-display">
                          <span className="quantity-number">{item.quantity}</span>
                          <span className="quantity-unit">{item.unitType || "pcs"}</span>
                        </div>
                        <button
                          onClick={() => handleQuantityChange(item._id || item.id, item.quantity + 1, item.minOrderQty || 1)}
                          className="quantity-btn"
                          aria-label="Increase quantity"
                        >
                          <Plus className="quantity-icon" />
                        </button>
                      </div>

                      <div className="item-total-section">
                        <div className="item-total">
                          <span className="total-label">Total</span>
                          <span className="total-price">৳{((item.offerPrice || item.unitPrice || item.price || 0) * item.quantity).toFixed(2)}</span>
                        </div>
                        <button
                          onClick={() => removeFromCart(item._id || item.id)}
                          className="remove-item-btn"
                          aria-label="Remove item"
                        >
                          <X className="remove-icon" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cart Summary */}
          <div className="cart-summary-section">
            <div className="cart-summary">
              <div className="summary-header">
                <Package className="summary-icon" />
                <h3>Order Summary</h3>
              </div>

              <div className="summary-details">
                <div className="summary-row">
                  <span className="summary-label">{t("cart.subtotal")}</span>
                  <span className="summary-value">৳{cartTotal.toFixed(2)}</span>
                </div>

                <div className="summary-row">
                  <span className="summary-label">
                    <Truck className="shipping-icon" />
                    Delivery Fee
                  </span>
                  <span className="summary-value">
                    {deliveryFee === 0 ? (
                      <span className="free-shipping">Free</span>
                    ) : (
                      `৳${deliveryFee.toFixed(2)}`
                    )}
                  </span>
                </div>

                <div className="summary-divider"></div>

                <div className="summary-row total-row">
                  <span className="summary-label total-label">{t("cart.total")}</span>
                  <span className="summary-value total-value">৳{(cartTotal + deliveryFee).toFixed(2)}</span>
                </div>
              </div>

              {/* Delivery Address Section */}
              <div className="delivery-address-section">
                <h4 className="address-section-title">
                  <MapPin size={18} />
                  Delivery Address
                </h4>
                
                {loadingAddress ? (
                  <div className="address-loading">Loading address...</div>
                ) : cart.deliveryAddress ? (
                  <div className="selected-address">
                    <div className="address-content">
                      <div className="address-header">
                        <span className="address-label">{cart.deliveryAddress.label}</span>
                        <span className="address-name">{cart.deliveryAddress.name}</span>
                      </div>
                      <div className="address-details">
                        <p>{cart.deliveryAddress.addressLine1}</p>
                        {cart.deliveryAddress.addressLine2 && <p>{cart.deliveryAddress.addressLine2}</p>}
                        <p>{cart.deliveryAddress.city}, {cart.deliveryAddress.district}</p>
                        <p>{cart.deliveryAddress.state} {cart.deliveryAddress.zip}</p>
                      </div>
                      <div className="address-phone">
                        <User size={14} />
                        {cart.deliveryAddress.phone}
                      </div>
                    </div>
                    <button 
                      className="change-address-btn"
                      onClick={() => setIsAddressModalOpen(true)}
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div className="no-address">
                    <p>No delivery address found</p>
                    <button 
                      className="add-address-btn"
                      onClick={() => setIsAddressModalOpen(true)}
                    >
                      <MapPin size={18} />
                      Add Address
                    </button>
                  </div>
                )}
              </div>

              {/* Delivery Options Section */}
              {cart.items?.length > 0 && (
                <div className="delivery-options-section">
                  <h4 className="delivery-section-title">
                    <Truck size={18} />
                    Delivery Options
                    {totalWeight > 0 && (
                      <span className="weight-info">({totalWeight}kg)</span>
                    )}
                  </h4>
                  
                  {loadingDeliveryMethods ? (
                    <div className="delivery-loading">
                      <div className="delivery-spinner"></div>
                      <span>Loading delivery options...</span>
                    </div>
                  ) : (
                    <div className="delivery-methods-cart">
                      {deliveryMethods.map((method) => (
                        <div 
                          key={method.id}
                          className={`delivery-method-cart ${selectedDeliveryMethod === method.id ? 'selected' : ''}`}
                          onClick={() => handleDeliveryMethodChange(method.id)}
                        >
                          <div className="method-info-cart">
                            <div className="method-header-cart">
                              <span className="method-icon-cart">{method.icon}</span>
                              <div className="method-content-cart">
                                <span className="method-name-cart">{method.name}</span>
                                <span className="method-description-cart">{method.description}</span>
                              </div>
                              <span className="method-fee-cart">
                                {method.isNegotiated ? 'Negotiated' : `৳${method.fee}`}
                              </span>
                            </div>
                            {method.weightInfo && (
                              <div className="weight-breakdown-cart">{method.weightInfo}</div>
                            )}
                          </div>
                          <div className="method-selector-cart">
                            <div className={`radio-button-cart ${selectedDeliveryMethod === method.id ? 'checked' : ''}`}></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Negotiated Fee Input */}
                  {selectedDeliveryMethod === 'negotiated' && (
                    <div className="negotiated-fee-cart">
                      <label htmlFor="negotiatedFeeCart">Negotiated Delivery Fee</label>
                      <div className="input-group-cart">
                        <span className="input-prefix-cart">৳</span>
                        <input
                          type="number"
                          id="negotiatedFeeCart"
                          value={negotiatedFee || ''}
                          onChange={(e) => handleNegotiatedFeeChange(Number(e.target.value) || 0)}
                          onKeyPress={handleNegotiatedFeeKeyPress}
                          onFocus={(e) => e.target.select()}
                          placeholder="Enter negotiated fee"
                          min="0"
                          step="0.01"
                        />
                        <button 
                          className="save-fee-btn"
                          onClick={handleSaveNegotiatedFee}
                          disabled={!pendingUpdates.needsUpdate}
                          title="Save negotiated fee to database"
                        >
                          Save
                        </button>
                      </div>
                      <small>Fee agreed upon with the seller. Press Enter or click Save to update.</small>
                    </div>
                  )}
                </div>
              )}

              <div className="summary-actions">
                <button 
                  className="checkout-btn"
                  disabled={!cart.deliveryAddress || !selectedDeliveryMethod}
                  title={
                    !cart.deliveryAddress 
                      ? "Please add a delivery address to proceed" 
                      : !selectedDeliveryMethod 
                      ? "Please select a delivery method to proceed"
                      : ""
                  }
                  onClick={async () => {
                    // Save pending updates before checkout and wait for completion
                    if (pendingUpdates.needsUpdate) {
                      await savePendingUpdates()
                    }
                    navigate('/checkout')
                  }}
                >
                  <CreditCard className="checkout-icon" />
                  {t("cart.proceedToCheckout")}
                </button>

                <Link to="/" className="continue-shopping-link">
                  <ArrowLeft className="continue-icon" />
                  {t("cart.continueShopping")}
                </Link>
              </div>

              <div className="security-badge">
                <div className="security-content">
                  <div className="security-icon">🔒</div>
                  <div className="security-text">
                    <span className="security-title">Secure Checkout</span>
                    <span className="security-subtitle">Your information is protected</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {isAddressModalOpen && (
          <AddAddressModal
            token={currentUser?.token || vendorAuth.token || clientAuth.token || localStorage.getItem('clientToken') || sessionStorage.getItem('vendorToken')}
            uid={currentUser?.uid}
            role={currentUser?.role}
            onClose={() => setIsAddressModalOpen(false)}
            onSaved={handleAddAddress}
          />
        )}
      </div>
    </div>
  )
}

export default ModernCart
