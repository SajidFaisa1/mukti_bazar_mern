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
      id: product.id,
      title: product.title,
      price: product.price,
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
  const discountPercentage = product.originalPrice 
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
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
              <img src={product.images?.[currentImage] || ''} alt={product.title} />
              {discountPercentage > 0 && (
                <div className="discount-badge">
                  {discountPercentage}% OFF
                </div>
              )}
            </div>
            <div className="thumbnail-container">
              {product.images.map((image, index) => (
                <div 
                  key={index} 
                  className={`thumbnail ${index === currentImage ? 'active' : ''}`}
                  onClick={() => handleImageClick(index)}
                >
                  <img 
                    src={image} 
                    alt={`${product.title} ${index + 1}`} 
                  />
                </div>
              ))}
            </div>
          </div>
          
          <div className="product-details">
            <div className="product-header">
              <h2>{product.title}</h2>
              <div className="price">
                ৳{product.price.toFixed(2)} 
                {product.originalPrice && (
                  <span className="original-price">৳{product.originalPrice.toFixed(2)}</span>
                )}
                <span className="unit"> / {product.unit}</span>
              </div>
            </div>

            <div className="rating-availability">
              {renderStars(product.rating)} <span className="review-count">({product.reviewCount})</span>
              <span className={`availability ${product.inStock ? 'in-stock' : 'out-of-stock'}`}>
                {product.inStock ? t.inStock : t.outOfStock}
              </span>
            </div>

            <div className="product-details">
              <h3>{t.productDetails}</h3>
              <p>{product.description}</p>
              
              {product.details?.origin && (
                <div className="detail-row">
                  <FaLeaf className="detail-icon" />
                  <span>Origin: {product.details.origin}</span>
                </div>
              )}
              
              {product.details?.harvestDate && (
                <div className="harvest-date">
                  <FaClock className="info-icon" />
                  <span>Harvested on {formatDate(product.details.harvestDate)}</span>
                </div>
              )}
              
              {product.details?.shelfLife && (
                <div className="detail-row">
                  <FaLeaf className="detail-icon" />
                  <span>Shelf Life: {product.details.shelfLife}</span>
                </div>
              )}
              
              {product.details?.growingMethod && (
                <div className="detail-row">
                  <FaSeedling className="detail-icon" />
                  <span>Growing Method: {product.details.growingMethod}</span>
                </div>
              )}
              
              {product.details?.storageTips && (
                <div className="storage-tips">
                  <h4>{t.storageTips}</h4>
                  <p>{product.details?.storageTips || (language === 'bn' ? 'শীতল ও শুষ্ক স্থানে সংরক্ষণ করুন।' : 'Store in a cool, dry place.')}</p>
                </div>
              )}
            </div>

            <div className="vendor-info">
              <h4>{t.vendorInfo || 'Vendor Information'}</h4>
              <div className="vendor-details">
                <div className="vendor-name">
                  <span>{t.soldBy}:</span>
                  <strong>{product.vendor.name}</strong>
                </div>
                <div className="vendor-rating">
                  {renderStars(product.vendor.rating)} ({product.vendor.totalSales} sales)
                </div>
                <div className="vendor-since">
                  <FaCalendarAlt /> {t.vendorSince} {new Date(product.vendor.joinDate).getFullYear()}
                </div>
                <p className="vendor-location">
                  <FaMapMarkerAlt /> {product.vendor.location}
                </p>
              </div>
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
                className={`add-to-cart-button ${!product.inStock ? 'out-of-stock-btn' : ''}`}
                onClick={handleAddToCart}
                disabled={!product.inStock}
              >
                {product.inStock ? (
                  <>
                    <FaShoppingCart /> {t.addToCart} (৳{(product.price * quantity).toFixed(2)})
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
