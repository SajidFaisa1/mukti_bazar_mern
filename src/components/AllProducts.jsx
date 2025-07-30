import React, { useState } from 'react';
import { FaShoppingCart, FaHeart, FaRegHeart, FaSearch, FaInfoCircle } from 'react-icons/fa';
import appLogo from '../assets/free.png';
import ProductModal from './ProductModal';
import { useLanguage } from '../contexts/LanguageContext';
import { useCart } from '../contexts/CartContext';
import { translations } from '../translations/translations';
// Re-use existing styling from FeaturedItems to keep design consistent
import './FeaturedItems.css';

/**
 * Displays all approved products from the DB (isApproved === true).
 * Also supports optional category filtering passed from Home.
 */
const AllProducts = ({ products = [], filter = 'all' }) => {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [favorites, setFavorites] = useState({});
  const { addToCart } = useCart();
  const { language } = useLanguage();
  const t = translations[language];

  // Filter: only approved and (optional) category, with safety check for array
  const approvedProducts = Array.isArray(products)
    ? products
        .filter((p) => p.isApproved)
        .filter((p) => (filter === 'all' ? true : p.category === filter))
    : [];

  const toggleFavorite = (productId, e) => {
    e.stopPropagation();
    setFavorites((prev) => ({
      ...prev,
      [productId]: !prev[productId],
    }));
  };

  const handleAddToCart = (e, product) => {
    e.stopPropagation();
    const minQty = product.minOrderQty && product.minOrderQty > 0 ? product.minOrderQty : 1;
    addToCart({
      id: product._id || product.id,
      title: product.name,
      price: product.offerPrice || product.unitPrice,
      images: product.images,
      quantity: minQty,
      minOrderQty: minQty,
    });
  };

  const handleQuickView = (product) => setSelectedProduct(product);

  const closeModal = () => setSelectedProduct(null);

  return (
    <section className="all-products-section">
      <div className="container">
        <h2 className="featured-title">{(t.home && t.home.allProducts)}</h2>
        {approvedProducts.length === 0 && <p>{(t.home && t.home.noProducts) || 'No Products Available'}</p>}

        <div className="product-grid">
          {approvedProducts.map((product) => {
            const isFavorite = favorites[product._id || product.id] || false;
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
                      <span>
                        {product.totalQty > 0 ? `In stock: ${product.totalQty}` : 'Out of stock'}
                      </span>
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
                    <FaShoppingCart />{' '}
                    {product.totalQty > 0 ? t.featured.addToCart : t.featured.outOfStock}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {selectedProduct && (
          <ProductModal product={selectedProduct} onClose={closeModal} />
        )}
      </div>
    </section>
  );
};

export default AllProducts;
