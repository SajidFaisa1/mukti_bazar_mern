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
  FaSeedling 
} from 'react-icons/fa';
import { useLanguage } from '../contexts/LanguageContext';
import { useCart } from '../contexts/CartContext';
import { translations } from '../translations/translations';
import muktiLogo from '../assets/Mukti.png';
import './ProductModal.css';

const ProductModal = ({ product, onClose }) => {
  const { addToCart } = useCart();
  
  if (!product) return null;
  
  const handleAddToCart = () => {
    addToCart({
      id: product._id || product.id,
      title: product.name,
      price: product.offerPrice || product.unitPrice,
      images: product.images,
      quantity: quantity
    });
    // Optionally show a success message or notification here
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
  const [quantity, setQuantity] = useState(1);
  const { language } = useLanguage();
  const t = translations[language].productModal;

  // Calculate discount percentage
  const discountPercentage = product.offerPrice && product.unitPrice
    ? Math.round(((product.unitPrice - product.offerPrice) / product.unitPrice) * 100)
    : 0;

  const handleQuantityChange = (newQuantity) => {
    if (newQuantity < 1) return;
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
            </div>

            <div className="quantity-selector">
              <span>{t.quantity}</span>
              <div className="quantity-controls">
                <button 
                  onClick={() => handleQuantityChange(quantity - 1)}
                  disabled={quantity <= 1}
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
              <button className="wishlist-button">
                <FaHeart /> {t.addToWishlist}
              </button>
            </div>

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
      </div>
    </div>
  );
};

export default ProductModal;
