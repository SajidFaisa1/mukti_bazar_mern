
import React, { useState } from 'react';
import { FaShoppingCart, FaHeart, FaRegHeart, FaSearch, FaInfoCircle } from 'react-icons/fa';
import appLogo from '../assets/free.png';
import ProductModal from './ProductModal';
import { useLanguage } from '../contexts/LanguageContext';
import { useCart } from '../contexts/CartContext';
import { translations } from '../translations/translations';
import './FeaturedItems.css';

// Accept products as a prop (should come from API, not mock data)
const FeaturedItems = ({ products = [] }) => {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [favorites, setFavorites] = useState({});
  const { addToCart } = useCart();
  const { language } = useLanguage();
  const t = translations[language];

  // Ensure products is an array and filter only featured products (isFeatured === true)
  const featuredProducts = Array.isArray(products) 
    ? products.filter(p => p.isFeatured).slice(0, 4)
    : [];

  // Favorite toggle (UI only)
  const toggleFavorite = (productId, e) => {
    e.stopPropagation();
    setFavorites(prev => ({
      ...prev,
      [productId]: !prev[productId]
    }));
  };

  // Add to cart handler
  const handleAddToCart = (e, product) => {
    e.stopPropagation();
    addToCart({
      id: product._id || product.id,
      title: product.name,
      price: product.offerPrice || product.unitPrice,
      images: product.images,
      quantity: product.minOrderQty && product.minOrderQty > 0 ? product.minOrderQty : 1,
      minOrderQty: product.minOrderQty && product.minOrderQty > 0 ? product.minOrderQty : 1
    });
  };

  // Quick view modal
  const handleQuickView = (product) => {
    setSelectedProduct(product);
  };

  const closeModal = () => {
    setSelectedProduct(null);
  };

  return (
    <section className="featured-items">
      <div className="container">
        <div className="section-header">
          <h2 className="featured-title ">{t.featured.title}</h2>
          <p className="featured-subtitle">{t.featured.subtitle}</p>
        </div>

        <div className="product-grid">
          {featuredProducts.length === 0 && (
            <p>{t.featured.noFeatured || 'No featured products available.'}</p>
          )}
          {featuredProducts.map((product) => {
            const isFavorite = favorites[product._id || product.id] || false;
            // Only use fields from Product model
            return (
              <div
                key={product._id || product.id}
                className="product-card"
                onClick={() => handleQuickView(product)}
              >
                <div className="product-image">
                  <div className="app-logo-container">
                    <img src={appLogo} alt="App Logo" className="app-logo" />
                  </div>
                  <img src={product.images && product.images[0]} alt={product.name} />
                  <div className="product-badges">
                    {product.barterAvailable && (
                      <span className="badge barter">Barter</span>
                    )}
                    {product.negotiationAvailable && (
                      <span className="badge negotiation">Negotiable</span>
                    )}
                  </div>
                  <button
                    className={`favorite-button ${isFavorite ? 'active' : ''}`}
                    onClick={(e) => toggleFavorite(product._id || product.id, e)}
                    aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    {isFavorite ? <FaHeart /> : <FaRegHeart />}
                  </button>
                  <div className="quick-view">
                    <FaSearch /> {t.featured.quickView}
                  </div>
                </div>
                <div className="product-info">
                  <h3>{product.name}</h3>
                  <p className="product-category">{product.category}</p>
                  <p className="product-description">
                    {product.description?.substring(0, 80)}...
                  </p>
                  <div className="product-meta">
                    <div className="price">
                      ৳{product.offerPrice ? product.offerPrice.toFixed(2) : product.unitPrice.toFixed(2)}
                      {product.offerPrice && (
                        <span className="original-price">৳{product.unitPrice.toFixed(2)}</span>
                      )}
                      <span className="unit"> / {product.unitType}</span>
                    </div>
                    <div className="stock">
                      <span>{product.totalQty > 0 ? `In stock: ${product.totalQty}` : 'Out of stock'}</span>
                    </div>
                  </div>
                  {product.minOrderQty && (
                    <div className="min-qty-alert">
                      <FaInfoCircle className="detail-icon" />
                      <span>Minimum order quantity: {product.minOrderQty}</span>
                    </div>
                  )}
                  <button
                    className="add-to-cart-button"
                    onClick={(e) => handleAddToCart(e, product)}
                    disabled={product.totalQty <= 0}
                    aria-label={product.totalQty > 0 ? 'Add to cart' : 'Out of stock'}
                  >
                    <FaShoppingCart /> {product.totalQty > 0 ? t.featured.addToCart : t.featured.outOfStock}
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
              closeModal();
            }}
          />
        )}
      </div>
    </section>
  );
};

export default FeaturedItems;
