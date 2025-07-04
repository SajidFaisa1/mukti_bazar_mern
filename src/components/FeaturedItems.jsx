import React, { useState } from 'react';
import { FaStar, FaShoppingCart, FaHeart, FaRegHeart, FaLeaf, FaFire, FaSearch } from 'react-icons/fa';
import appLogo from '../assets/free.png';
import ProductModal from './ProductModal';
import productsData from '../data/products.json';
import { useLanguage } from '../contexts/LanguageContext';
import { useCart } from '../contexts/CartContext';
import { translations } from '../translations/translations';

const { products } = productsData;
import './FeaturedItems.css';

const FeaturedItems = () => {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [favorites, setFavorites] = useState({});
  const { addToCart } = useCart();
  
  // Get first 4 products as featured items
  const featuredProducts = products.slice(0, 4);
  
  const toggleFavorite = (productId, e) => {
    e.stopPropagation();
    setFavorites(prev => ({
      ...prev,
      [productId]: !prev[productId]
    }));
  };
  
  const handleAddToCart = (e, product) => {
    e.stopPropagation();
    addToCart({
      id: product.id,
      title: product.title,
      price: product.price,
      images: product.images,
      quantity: 1
    });
  };
  
  const handleQuickView = (product) => {
    setSelectedProduct(product);
  };
  
  const closeModal = () => {
    setSelectedProduct(null);
  };
  
  const renderStars = (rating) => {
    return Array(5).fill(0).map((_, i) => (
      <FaStar 
        key={i} 
        className={i < Math.floor(rating) ? 'filled' : 'empty'} 
      />
    ));
  };

  const { language } = useLanguage();
  const t = translations[language];

  return (
    <section className="featured-items">
      <div className="container">
        <div className="section-header">
          <h2 className="featured-title ">{t.featured.title}</h2>
          <p className="featured-subtitle">{t.featured.subtitle}</p>
        </div>
        
        <div className="product-grid">
          {featuredProducts.map((product) => {
            const isFavorite = favorites[product.id] || false;
            const hasDiscount = product.originalPrice > product.price;
            const discountPercentage = hasDiscount 
              ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
              : 0;
              
            return (
              <div 
                key={product.id} 
                className="product-card"
                onClick={() => handleQuickView(product)}
              >
                <div className="product-image">
                  <div className="app-logo-container">
                    <img src={appLogo} alt="App Logo" className="app-logo" />
                  </div>
                  <img src={product.images[0]} alt={product.title} />
                  <div className="product-badges">
                    {product.isNew && <span className="badge new"><FaFire /> New</span>}
                    {hasDiscount && (
                      <span className="badge discount">-{discountPercentage}%</span>
                    )}
                    {product.details?.organic && (
                      <span className="badge organic"><FaLeaf /> Organic</span>
                    )}
                  </div>
                  <button 
                    className={`favorite-button ${isFavorite ? 'active' : ''}`}
                    onClick={(e) => toggleFavorite(product.id, e)}
                    aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    {isFavorite ? <FaHeart /> : <FaRegHeart />}
                  </button>
                  <div className="quick-view">
                    <FaSearch /> {t.featured.quickView}
                  </div>
                </div>
                <div className="product-info">
                  <h3>{product.title}</h3>
                  <p className="product-category">{product.category}</p>
                  <p className="product-description">
                    {product.shortDescription || product.description.substring(0, 80)}...
                  </p>
                  <div className="product-meta">
                    <div className="price">
                    ৳{product.price.toFixed(2)}
                      {hasDiscount && (
                        <span className="original-price">৳{product.originalPrice.toFixed(2)}</span>
                      )}
                      <span className="unit"> / {product.unit}</span>
                    </div>
                    <div className="rating">
                      <div className="stars">
                        {renderStars(product.rating)}
                        <span>({product.reviewCount})</span>
                      </div>
                    </div>
                  </div>
                  <button 
                    className="add-to-cart-button"
                    onClick={(e) => handleAddToCart(e, product)}
                    disabled={!product.inStock}
                    aria-label={product.inStock ? 'Add to cart' : 'Out of stock'}
                  >
                    <FaShoppingCart /> {product.inStock ? t.featured.addToCart : t.featured.outOfStock}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        
        {selectedProduct && (
          <ProductModal 
            product={selectedProduct} 
            onClose={closeModal}
            onAddToCart={(productId, quantity) => {
              console.log(`Added ${quantity} of product ${productId} to cart`);
              closeModal();
            }}
          />
        )}
      </div>
    </section>
  );
};

export default FeaturedItems;
