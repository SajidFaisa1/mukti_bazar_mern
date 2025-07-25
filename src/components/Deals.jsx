import React, { useState, useEffect } from 'react';
import { FaShoppingCart, FaHeart, FaRegHeart, FaSearch } from 'react-icons/fa';
import appLogo from '../assets/free.png';
import ProductModal from './ProductModal';
import { useLanguage } from '../contexts/LanguageContext';
import { useCart } from '../contexts/CartContext';
import { translations } from '../translations/translations';
import './FeaturedItems.css';  // Reuse the same styling
import './Deals.css';  // Add deals-specific styling

const Deals = () => {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [favorites, setFavorites] = useState({});
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { addToCart } = useCart();
  const { language } = useLanguage();
  const t = translations[language];

  // Fetch products with offer prices from backend
  useEffect(() => {
    setLoading(true);
    
    // Use a timeout to handle network issues
    const timeoutId = setTimeout(() => {
      if (loading) {
        setError('Request timed out. Server might be down or unreachable.');
        setLoading(false);
      }
    }, 10000); // 10 second timeout
    
    // For development - if backend is unreachable, use mock data
    fetch('http://localhost:5005/api/products')
      .then(res => {
        clearTimeout(timeoutId);
        if (!res.ok) {
          throw new Error(`Server responded with status: ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        // Filter products that have offerPrice
        const dealsProducts = data.filter(p => p.offerPrice && p.offerPrice < p.unitPrice);
        setProducts(dealsProducts);
        setLoading(false);
      })
      .catch(err => {
        clearTimeout(timeoutId);
        console.error('Failed to fetch products:', err);
        
        // For development - create some mock data when API is unavailable
        const mockProducts = [
          {
            _id: 'mock1',
            name: 'Premium Rice',
            category: 'Grains',
            description: 'High quality rice with special discount',
            images: ['https://images.unsplash.com/photo-1586201375761-83865001e31c?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80'],
            unitPrice: 120,
            offerPrice: 90,
            unitType: 'kg',
            totalQty: 100,
            barterAvailable: true
          },
          {
            _id: 'mock2',
            name: 'Fresh Tomatoes',
            category: 'Vegetables',
            description: 'Locally grown tomatoes on sale',
            images: ['https://images.unsplash.com/photo-1582284540020-8acbe03f4924?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80'],
            unitPrice: 80,
            offerPrice: 60,
            unitType: 'kg',
            totalQty: 50,
            negotiationAvailable: true
          }
        ];
        
        setProducts(mockProducts);
        setError('Using demo data. Could not connect to server.');
        setLoading(false);
      });
      
    return () => clearTimeout(timeoutId);
  }, []);

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
    const minQty = product.minOrderQty || 1;
    addToCart({
      id: product._id || product.id,
      name: product.name,
      unitPrice: product.unitPrice,
      offerPrice: product.offerPrice,
      images: product.images,
      quantity: minQty,
      minOrderQty: minQty,  // Pass minOrderQty to cart to enforce this rule
      category: product.category,
      unitType: product.unitType
    });
  };

  // Quick view modal
  const handleQuickView = (product) => {
    setSelectedProduct(product);
  };

  const closeModal = () => {
    setSelectedProduct(null);
  };

  // Calculate discount percentage
  const calculateDiscount = (unitPrice, offerPrice) => {
    return Math.round(((unitPrice - offerPrice) / unitPrice) * 100);
  };

  if (loading) {
    return (
      <section className="featured-items">
        <div className="container">
          <div className="section-header">
            <h2 className="featured-title">{t.deals?.title || 'Special Deals'}</h2>
            <div className="loading-spinner">Loading deals...</div>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="featured-items">
        <div className="container">
          <div className="section-header">
            <h2 className="featured-title">{t.deals?.title || 'Special Deals'}</h2>
            <div className="error-message">{error}</div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="featured-items deals-section">
      <div className="container">
        <div className="section-header">
          <h2 className="featured-title">{t.deals?.title || 'Special Deals'}</h2>
          <p className="featured-subtitle">{t.deals?.subtitle || 'Save big with these limited-time offers'}</p>
        </div>

        <div className="product-grid">
          {products.length === 0 && (
            <p>{t.deals?.noDeals || 'No special deals available at the moment. Check back soon!'}</p>
          )}
          
          {products.map((product) => {
            const isFavorite = favorites[product._id || product.id] || false;
            const discountPercentage = calculateDiscount(product.unitPrice, product.offerPrice);
            
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
                    <span className="badge discount">-{discountPercentage}% OFF</span>
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
                    <FaSearch /> {t.featured?.quickView || 'Quick View'}
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
                      ৳{product.offerPrice.toFixed(2)}
                      <span className="original-price">৳{product.unitPrice.toFixed(2)}</span>
                      <span className="unit"> / {product.unitType}</span>
                    </div>
                    <div className="stock">
                      <span>{product.totalQty > 0 ? `In stock: ${product.totalQty}` : 'Out of stock'}</span>
                    </div>
                  </div>
                  <button
                    className="add-to-cart-button"
                    onClick={(e) => handleAddToCart(e, product)}
                    disabled={product.totalQty <= 0}
                    aria-label={product.totalQty > 0 ? 'Add to cart' : 'Out of stock'}
                  >
                    <FaShoppingCart /> {product.totalQty > 0 ? t.featured?.addToCart || 'Add to Cart' : t.featured?.outOfStock || 'Out of Stock'}
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

export default Deals;
