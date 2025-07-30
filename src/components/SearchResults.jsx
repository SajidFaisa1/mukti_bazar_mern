import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { FaShoppingCart, FaHeart, FaRegHeart, FaSearch, FaInfoCircle } from 'react-icons/fa';
import { useCart } from '../contexts/CartContext';
import { useLanguage } from '../contexts/LanguageContext';
import { translations } from '../translations/translations';
import './SearchResults.css';

const SearchResults = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { language } = useLanguage();
  const currentTranslations = translations[language] || translations.en;
  const t = currentTranslations;

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalProducts: 0
  });
  const [favorites, setFavorites] = useState(new Set());

  const searchQuery = searchParams.get('q') || '';
  const currentPage = parseInt(searchParams.get('page')) || 1;

  // Fetch search results
  const fetchSearchResults = async (query, page = 1) => {
    if (!query.trim()) {
      setProducts([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');

      const response = await fetch(
        `http://localhost:5005/api/products?status=approved&search=${encodeURIComponent(query)}&page=${page}&limit=12`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch search results');
      }

      const data = await response.json();
      
      // Handle both old and new response formats
      if (Array.isArray(data)) {
        setProducts(data);
        setPagination({
          currentPage: 1,
          totalPages: 1,
          totalProducts: data.length
        });
      } else {
        setProducts(data.products || []);
        setPagination(data.pagination || {
          currentPage: 1,
          totalPages: 1,
          totalProducts: 0
        });
      }
    } catch (err) {
      console.error('Search error:', err);
      setError('Failed to search products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSearchResults(searchQuery, currentPage);
  }, [searchQuery, currentPage]);

  const handleAddToCart = async (product) => {
    try {
      await addToCart({
        productId: product._id,
        name: product.name,
        price: product.offerPrice || product.unitPrice,
        unitPrice: product.unitPrice,
        offerPrice: product.offerPrice,
        images: product.images,
        quantity: product.minOrderQty || 1,
        unitType: product.unitType,
        category: product.category
      });
    } catch (error) {
      console.error('Failed to add to cart:', error);
    }
  };

  const toggleFavorite = (productId) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(productId)) {
      newFavorites.delete(productId);
    } else {
      newFavorites.add(productId);
    }
    setFavorites(newFavorites);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'BDT'
    }).format(amount);
  };

  const handlePageChange = (newPage) => {
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('page', newPage.toString());
    navigate(`/search?${newSearchParams.toString()}`);
  };

  if (loading) {
    return (
      <div className="search-results-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <h3>Searching products...</h3>
          <p>Please wait while we find products matching "{searchQuery}"</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="search-results-container">
        <div className="error-state">
          <FaSearch size={48} />
          <h3>Search Error</h3>
          <p>{error}</p>
          <button onClick={() => fetchSearchResults(searchQuery, currentPage)}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="search-results-container">
      <div className="search-header">
        <h1>Search Results</h1>
        {searchQuery && (
          <p className="search-info">
            Showing {pagination.totalProducts} results for "<span className="search-term">{searchQuery}</span>"
          </p>
        )}
      </div>

      {!searchQuery.trim() ? (
        <div className="empty-search">
          <FaSearch size={64} />
          <h3>Start your search</h3>
          <p>Enter a search term to find products</p>
        </div>
      ) : products.length === 0 ? (
        <div className="no-results">
          <FaSearch size={64} />
          <h3>No products found</h3>
          <p>Try searching with different keywords or check the spelling</p>
        </div>
      ) : (
        <>
          <div className="products-grid">
            {products.map((product) => (
              <div key={product._id} className="product-card">
                <div className="product-image-container">
                  <img
                    src={product.images?.[0] || '/placeholder-product.jpg'}
                    alt={product.name}
                    className="product-image"
                    onError={(e) => {
                      e.target.src = '/placeholder-product.jpg';
                    }}
                  />
                  <button
                    className="favorite-btn"
                    onClick={() => toggleFavorite(product._id)}
                  >
                    {favorites.has(product._id) ? (
                      <FaHeart className="favorite-icon active" />
                    ) : (
                      <FaRegHeart className="favorite-icon" />
                    )}
                  </button>
                </div>

                <div className="product-info">
                  <h3 className="product-name">{product.name}</h3>
                  <p className="product-business">{product.businessName}</p>
                  
                  <div className="product-pricing">
                    {product.offerPrice && product.offerPrice < product.unitPrice ? (
                      <>
                        <span className="offer-price">{formatCurrency(product.offerPrice)}</span>
                        <span className="original-price">{formatCurrency(product.unitPrice)}</span>
                        <span className="discount-badge">
                          {Math.round(((product.unitPrice - product.offerPrice) / product.unitPrice) * 100)}% OFF
                        </span>
                      </>
                    ) : (
                      <span className="regular-price">{formatCurrency(product.unitPrice)}</span>
                    )}
                  </div>

                  <div className="product-details">
                    <span className="unit-type">per {product.unitType}</span>
                    <span className="min-order">Min: {product.minOrderQty || 1} {product.unitType}</span>
                  </div>

                  <div className="product-actions">
                    <button
                      className="add-to-cart-btn"
                      onClick={() => handleAddToCart(product)}
                    >
                      <FaShoppingCart />
                      Add to Cart
                    </button>
                    <button className="quick-view-btn">
                      <FaInfoCircle />
                      Quick View
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {pagination.totalPages > 1 && (
            <div className="pagination">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="pagination-btn"
              >
                Previous
              </button>
              
              <div className="pagination-info">
                <span>Page {pagination.currentPage} of {pagination.totalPages}</span>
                <span>({pagination.totalProducts} total products)</span>
              </div>
              
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === pagination.totalPages}
                className="pagination-btn"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SearchResults;
