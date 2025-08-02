import React, { useState, useEffect } from 'react';
import { 
  FaTimes, 
  FaShoppingCart, 
  FaHeart, 
  FaLeaf, 
  FaTruck, 
  FaCalendarAlt, 
  FaCheck, 
  FaMinus, 
  FaPlus, 
  FaFacebookF, 
  FaTwitter, 
  FaWhatsapp, 
  FaStar, 
  FaInfoCircle, 
  FaMapMarkerAlt,
  FaClock ,
  FaSeedling,
  FaExchangeAlt
} from 'react-icons/fa';
import { useLanguage } from '../contexts/LanguageContext';
import { useCart } from '../contexts/CartContext';
import { useVendorAuth } from '../contexts/VendorAuthContext';
import { useClientAuth } from '../contexts/ClientAuthContext';
import { translations } from '../translations/translations';
import muktiLogo from '../assets/Mukti.png';
import BarterOffer from './BarterOffer';
import ContactVendorButton from './messaging/ContactVendorButton';
import NegotiationButton from './negotiation/NegotiationButton';
import './ProductModal.css';

const ProductModal = ({ product, onClose }) => {
  const { addToCart } = useCart();
  const { currentUser: vendorAuthUser, token: vendorAuthToken } = useVendorAuth();
  const { currentUser: clientAuthUser, token: clientAuthToken } = useClientAuth();
  const [showBarterOffer, setShowBarterOffer] = useState(false);
  const [vendorInfo, setVendorInfo] = useState(null);
  const [loadingVendor, setLoadingVendor] = useState(false);
  
  if (!product) return null;
  
  // Determine current user and their role with fallback to storage
  let currentUser = null;
  let userRole = null;
  let userToken = null;
  
  // Check vendor auth first
  if (vendorAuthUser) {
    currentUser = vendorAuthUser;
    userRole = 'vendor';
    userToken = vendorAuthToken;
  } else if (clientAuthUser) {
    currentUser = clientAuthUser;
    userRole = 'client';
    userToken = clientAuthToken;
  } else {
    // Fallback to storage if contexts are not available
    const clientUser = JSON.parse(localStorage.getItem('clientUser') || 'null');
    if (clientUser) {
      currentUser = clientUser;
      userRole = 'client';
      userToken = localStorage.getItem('clientToken');
    } else {
      const vendorUser = JSON.parse(sessionStorage.getItem('vendorUser') || 'null');
      if (vendorUser) {
        currentUser = vendorUser;
        userRole = 'vendor';
        userToken = sessionStorage.getItem('vendorToken');
      }
    }
  }
  
  // Check if current user is a vendor and it's not their own product
  const canMakeBarter = userRole === 'vendor' && 
                       product.barterAvailable && 
                       currentUser?.uid !== product.vendorUid;

  // Fetch vendor information when product changes
  useEffect(() => {
    const fetchVendorInfo = async () => {
      if (!product.vendorUid && !product.storeId) return;
      
      setLoadingVendor(true);
      try {
        // Try to fetch by vendorUid first, then by storeId
        let vendorResponse;
        if (product.vendorUid) {
          vendorResponse = await fetch(`http://localhost:5005/api/vendors/uid/${product.vendorUid}`);
        } else if (product.storeId) {
          vendorResponse = await fetch(`http://localhost:5005/api/vendors/store/${product.storeId}`);
        }
        
        if (vendorResponse.ok) {
          const vendor = await vendorResponse.json();
          setVendorInfo(vendor);
        } else {
          console.error('Failed to fetch vendor info');
        }
      } catch (error) {
        console.error('Error fetching vendor info:', error);
      } finally {
        setLoadingVendor(false);
      }
    };

    fetchVendorInfo();
  }, [product.vendorUid, product.storeId]);
  
  // Check if current user can contact vendor (not their own product)
  const canContactVendor = currentUser && vendorInfo && 
                          currentUser.uid !== product.vendorUid;
  
  // Debug logging
  console.log('🔍 BARTER DEBUG:', {
    userRole,
    currentUserUid: currentUser?.uid,
    productVendorUid: product.vendorUid,
    barterAvailable: product.barterAvailable,
    canMakeBarter,
    vendorUser: !!vendorAuthUser,
    clientUser: !!clientAuthUser,
    fallbackVendor: !vendorAuthUser && !clientAuthUser ? !!JSON.parse(sessionStorage.getItem('vendorUser') || 'null') : false,
    fallbackClient: !vendorAuthUser && !clientAuthUser ? !!JSON.parse(localStorage.getItem('clientUser') || 'null') : false,
    isSameVendor: currentUser?.uid === product.vendorUid,
    productStock: product.totalQty,
    buttonWillShow: canMakeBarter,
    reason: !canMakeBarter ? (
      userRole !== 'vendor' ? 'Not a vendor' :
      !product.barterAvailable ? 'Barter not available for product' :
      currentUser?.uid === product.vendorUid ? 'Cannot barter with own product' :
      'Unknown reason'
    ) : 'Button should show'
  });
  
  const handleAddToCart = () => {
    addToCart({
      id: product._id || product.id,
      title: product.name,
      price: product.offerPrice || product.unitPrice,
      images: product.images,
      quantity: quantity,
      minOrderQty: minQty
    });
    // Optionally show a success message or notification here
  };

  const handleBarterClick = () => {
    console.log('🔄 BARTER BUTTON CLICKED!');
    if (!currentUser) {
      alert('Please login as a vendor to make barter offers');
      return;
    }
    console.log('✅ Setting showBarterOffer to true');
    setShowBarterOffer(true);
  };

  const renderStars = (rating) => {
    return Array(5).fill(0).map((_, i) => (
      <FaStar 
        key={i} 
        className={i < Math.floor(rating) ? 'filled' : 'empty'} 
      />
    ));
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const [currentImage, setCurrentImage] = useState(0);
  const minQty = product.minOrderQty && product.minOrderQty > 0 ? product.minOrderQty : 1;
  const [quantity, setQuantity] = useState(minQty);
  const { language } = useLanguage();
  const t = translations[language].productModal;

  // Calculate discount percentage
  const discountPercentage = product.offerPrice && product.unitPrice
    ? Math.round(((product.unitPrice - product.offerPrice) / product.unitPrice) * 100)
    : 0;

  const handleQuantityChange = (newQuantity) => {
    if (newQuantity < minQty) return;
    setQuantity(newQuantity);
  };

  const handleImageClick = (index) => {
    setCurrentImage(index);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="mukti-logo-container">
          <img src={muktiLogo} alt="Mukti Logo" className="mukti-logo" />
        </div>
        <button className="close-button" onClick={onClose}>
          <FaTimes />
        </button>
        
        <div className="modal-body">
          <div className="product-gallery">
            <div className="main-image">
              <img src={product.images?.[currentImage] || ''} alt={product.name} />
              {discountPercentage > 0 && (
                <div className="discount-badge">
                  {discountPercentage}% OFF
                </div>
              )}
            </div>
            <div className="thumbnail-container">
              {product.images && product.images.map((image, index) => (
                <div 
                  key={index} 
                  className={`thumbnail ${index === currentImage ? 'active' : ''}`}
                  onClick={() => handleImageClick(index)}
                >
                  <img 
                    src={image} 
                    alt={`${product.name} ${index + 1}`} 
                  />
                </div>
              ))}
            </div>
          </div>
          
          <div className="product-details">
            <div className="product-header">
              <h2>{product.name}</h2>
              <div className="price">
                ৳{product.offerPrice ? product.offerPrice.toFixed(2) : product.unitPrice.toFixed(2)}
                {product.offerPrice && (
                  <span className="original-price">৳{product.unitPrice.toFixed(2)}</span>
                )}
                <span className="unit"> / {product.unitType}</span>
              </div>
            </div>

            <div className="stock">
              <span>{product.totalQty > 0 ? t.inStock : t.outOfStock}</span>
            </div>

            {/* Vendor Information */}
            {loadingVendor ? (
              <div className="vendor-info">
                <h4>Loading store information...</h4>
              </div>
            ) : vendorInfo ? (
              <div className="vendor-info">
                <h4>Sold by:</h4>
                <div className="vendor-details">
                  <span className="vendor-name">{vendorInfo.businessName}</span>
                  {vendorInfo.address && (
                    <span className="vendor-location">
                      <FaMapMarkerAlt className="location-icon" />
                      {vendorInfo.address.city}, {vendorInfo.address.district}
                    </span>
                  )}
                </div>
              </div>
            ) : product.vendorUid || product.storeId ? (
              <div className="vendor-info">
                <h4>Store information unavailable</h4>
              </div>
            ) : null}

            <div className="product-details">
              <h3>{t.productDetails}</h3>
              <p>{product.description}</p>
              {product.shelfLife && (
                <div className="detail-row">
                  <FaLeaf className="detail-icon" />
                  <span>Shelf Life: {product.shelfLife}</span>
                </div>
              )}
              {product.estDeliveryTime && (
                <div className="detail-row">
                  <FaTruck className="detail-icon" />
                  <span>Est. Delivery: {product.estDeliveryTime}</span>
                </div>
              )}
              {product.deliveryOption && (
                <div className="detail-row">
                  <FaTruck className="detail-icon" />
                  <span>Delivery Option: {product.deliveryOption}</span>
                </div>
              )}
              {product.barterAvailable && (
                <div className="detail-row barter-available">
                  <FaExchangeAlt className="detail-icon" />
                  <span>Barter Exchange Available</span>
                  {userRole === 'vendor' && currentUser?.uid !== product.vendorUid && (
                    <span 
                      className="barter-badge clickable-badge"
                      onClick={handleBarterClick}
                      style={{
                        cursor: 'pointer',
                        textDecoration: 'underline',
                        color: '#FF9800'
                      }}
                    >
                      Trade Eligible - Click to Barter
                    </span>
                  )}
                  {userRole === 'vendor' && currentUser?.uid === product.vendorUid && (
                    <span className="barter-badge">Your Product - Cannot Barter</span>
                  )}
                  {!userRole && (
                    <span className="barter-badge">Login as Vendor to Barter</span>
                  )}
                  {userRole === 'client' && (
                    <span className="barter-badge">Only Vendors Can Barter</span>
                  )}
                </div>
              )}
              {product.minOrderQty && (
                <div className="min-qty-alert">
                  <FaInfoCircle className="detail-icon" />
                  <span>Minimum order quantity: {product.minOrderQty}</span>
                </div>
              )}
            </div>

            <div className="quantity-selector">
              <span>{t.quantity}</span>
              <div className="quantity-controls">
                <button 
                  onClick={() => handleQuantityChange(quantity - 1)}
                  disabled={quantity <= minQty}
                >
                  <FaMinus />
                </button>
                <span>{quantity}</span>
                <button onClick={() => handleQuantityChange(quantity + 1)}>
                  <FaPlus />
                </button>
              </div>
            </div>

            <div className="action-buttons">
              <button 
                className={`add-to-cart-button ${product.totalQty <= 0 ? 'out-of-stock-btn' : ''}`}
                onClick={handleAddToCart}
                disabled={product.totalQty <= 0}
              >
                {product.totalQty > 0 ? (
                  <>
                    <FaShoppingCart /> {t.addToCart} (৳{((product.offerPrice || product.unitPrice) * quantity).toFixed(2)})
                  </>
                ) : t.outOfStock}
              </button>
              
              {/* Contact Vendor Button */}
              {canContactVendor && vendorInfo && (
                <ContactVendorButton 
                  product={product}
                  vendor={vendorInfo}
                  className="contact-vendor-modal-btn"
                />
              )}
              
              {/* Negotiation Button */}
              {canContactVendor && vendorInfo && (
                <NegotiationButton 
                  product={product}
                  vendor={vendorInfo}
                  className="negotiation-modal-btn"
                  onNegotiationStarted={(negotiation) => {
                    console.log('Negotiation started:', negotiation);
                    // Optionally close modal and redirect to messages
                    // onClose();
                    // window.location.href = '/messages';
                  }}
                />
              )}
              
              {canMakeBarter && (
                <button 
                  className="barter-button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('🔄 BARTER BUTTON CLICKED!', e);
                    handleBarterClick();
                  }}
                  disabled={product.totalQty <= 0}
                  style={{ 
                    pointerEvents: 'auto', 
                    zIndex: 1000,
                    backgroundColor: product.totalQty <= 0 ? '#ccc' : '#FF9800',
                    cursor: product.totalQty <= 0 ? 'not-allowed' : 'pointer',
                    border: '2px solid red',
                    position: 'relative'
                  }}
                  onMouseOver={() => console.log('🖱️ Barter button hovered')}
                  onMouseDown={() => console.log('🖱️ Barter button mouse down')}
                  onMouseUp={() => console.log('🖱️ Barter button mouse up')}
                >
                  <FaExchangeAlt /> Propose Barter
                </button>
              )}
              
              <button className="wishlist-button">
                <FaHeart /> {t.addToWishlist}
              </button>
            </div>
            
            {console.log('🔢 Rendering barter button:', canMakeBarter, 'Stock:', product.totalQty)}

            <div className="shipping-info">
              <div className="shipping-item">
                <FaTruck />
                <span>{t.freeShipping}</span>
              </div>
              <div className="shipping-item">
                <FaLeaf />
                <span>{t.organic}</span>
              </div>
            </div>

            <div className="share-section">
              <span>{t.share}</span>
              <div className="social-icons">
                <button><FaFacebookF /> Facebook</button>
                <button><FaTwitter /> Twitter</button>
                <button><FaWhatsapp /> WhatsApp</button>
              </div>
            </div>
          </div>
        </div>
        
        {showBarterOffer && (
          <BarterOffer 
            product={product}
            onClose={() => setShowBarterOffer(false)}
            currentUser={currentUser}
          />
        )}
      </div>
    </div>
  );
};

export default ProductModal;
