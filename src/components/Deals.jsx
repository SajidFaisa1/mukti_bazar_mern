import React, { useState, useEffect } from 'react';
import { FaShoppingCart, FaHeart, FaRegHeart, FaSearch, FaFilter, FaSort, FaThLarge, FaTh } from 'react-icons/fa';
import appLogo from '../assets/free.png';
import ProductModal from './ProductModal';
import { useLanguage } from '../contexts/LanguageContext';
import { useCart } from '../contexts/CartContext';
import { translations } from '../translations/translations';


const Deals = () => {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [favorites, setFavorites] = useState({});
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // New UI states
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('best'); // best | priceAsc | priceDesc | discountDesc | nameAsc
  const [minDiscount, setMinDiscount] = useState(0);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [view, setView] = useState('cozy'); // cozy | compact
  const { addToCart } = useCart();
  const { language } = useLanguage();
  const t = translations[language];

  // Refactor: fetch logic with retry support and timeout
  const fetchProducts = () => {
    setLoading(true);
    setError(null);

    const timeoutId = setTimeout(() => {
      setError('Request timed out. Server might be down or unreachable.');
      setLoading(false);
    }, 10000);

    fetch('http://localhost:5005/api/products')
      .then(res => {
        clearTimeout(timeoutId);
        if (!res.ok) {
          throw new Error(`Server responded with status: ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        const productsArray = data.products && Array.isArray(data.products) ? data.products : data;
        const dealsProducts = Array.isArray(productsArray)
          ? productsArray.filter(p => p.offerPrice && p.unitPrice && p.offerPrice < p.unitPrice)
          : [];
        setProducts(dealsProducts);
        setLoading(false);
      })
      .catch(err => {
        clearTimeout(timeoutId);
        console.error('Failed to fetch products:', err);
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
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleRetry = () => {
    fetchProducts();
  };

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

  // Calculate discount percentage (safe)
  const calculateDiscount = (unitPrice, offerPrice) => {
    if (!unitPrice || !offerPrice || unitPrice <= 0 || offerPrice >= unitPrice) return 0;
    return Math.round(((unitPrice - offerPrice) / unitPrice) * 100);
  };

  // Derived visible list: search, filter, sort
  const displayedProducts = products
    .filter(p => {
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        p.name?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q);
      const discount = calculateDiscount(p.unitPrice, p.offerPrice);
      const matchesDiscount = discount >= Number(minDiscount || 0);
      const matchesStock = !inStockOnly || (p.totalQty || 0) > 0;
      return matchesSearch && matchesDiscount && matchesStock;
    })
    .sort((a, b) => {
      const da = calculateDiscount(a.unitPrice, a.offerPrice);
      const db = calculateDiscount(b.unitPrice, b.offerPrice);
      switch (sort) {
        case 'priceAsc':
          return (a.offerPrice ?? a.unitPrice) - (b.offerPrice ?? b.unitPrice);
        case 'priceDesc':
          return (b.offerPrice ?? b.unitPrice) - (a.offerPrice ?? a.unitPrice);
        case 'discountDesc':
          return db - da;
        case 'nameAsc':
          return (a.name || '').localeCompare(b.name || '');
        case 'best':
        default:
          // Best: higher discount first, then in-stock, then price asc
          if (db !== da) return db - da;
          const as = (a.totalQty || 0) > 0 ? 0 : 1;
          const bs = (b.totalQty || 0) > 0 ? 0 : 1;
          if (as !== bs) return as - bs;
          return (a.offerPrice ?? a.unitPrice) - (b.offerPrice ?? b.unitPrice);
      }
    });

  if (loading) {
    return (
      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-4">
            <h2 className="text-xl font-extrabold text-slate-900">{t.deals?.title || 'Special Deals'}</h2>
            <p className="text-slate-600 mt-1">{t.deals?.subtitle || 'Save big with these limited-time offers'}</p>
          </div>

          {/* Skeleton toolbar */}
          <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 backdrop-blur mb-5">
            <div className="h-10 w-64 rounded-lg bg-slate-200 animate-pulse" />
            <div className="flex items-center gap-3">
              <div className="h-10 w-44 rounded-lg bg-slate-200 animate-pulse" />
              <div className="h-10 w-24 rounded-lg bg-slate-200 animate-pulse" />
              <div className="h-10 w-36 rounded-lg bg-slate-200 animate-pulse" />
            </div>
          </div>

          {/* Skeleton grid */}
          <div className={`grid gap-4 ${view === 'compact' ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}`}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow animate-pulse">
                <div className="aspect-[4/3] bg-slate-200" />
                <div className="p-4">
                  <div className="h-4 w-2/3 bg-slate-200 rounded mb-2" />
                  <div className="h-3 w-1/3 bg-slate-200 rounded mb-3" />
                  <div className="h-3 w-5/6 bg-slate-200 rounded mb-2" />
                  <div className="h-3 w-1/2 bg-slate-200 rounded mb-4" />
                  <div className="h-10 w-full bg-slate-200 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center">
            <h2 className="text-xl font-extrabold text-slate-900">{t.deals?.title || 'Special Deals'}</h2>
            <div className="mt-3 inline-flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-700">
              <span>{error}</span>
              <button
                className="inline-flex items-center rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
                onClick={handleRetry}
                aria-label="Retry loading deals"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-4">
          <h2 className="text-xl font-extrabold text-slate-900">{t.deals?.title || 'Special Deals'}</h2>
          <p className="text-slate-600 mt-1">{t.deals?.subtitle || 'Save big with these limited-time offers'}</p>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between rounded-xl border border-slate-200 bg-white p-3 backdrop-blur mb-5">
          <div className="relative flex-1 min-w-[200px]">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              className="w-full rounded-lg border border-slate-300 bg-white text-slate-900 placeholder-slate-400 pl-10 pr-3 py-2.5 outline-none ring-0 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200"
              placeholder={t.deals?.searchPlaceholder || 'Search deals...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search deals"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
              <FaFilter className="text-slate-500" />
              <input
                type="range"
                min="0"
                max="90"
                step="5"
                className="accent-indigo-500"
                value={minDiscount}
                onChange={(e) => setMinDiscount(e.target.value)}
                aria-label="Minimum discount"
              />
              <span className="text-xs font-semibold rounded-full border border-indigo-200 bg-indigo-50 text-indigo-700 px-2 py-0.5">
                {minDiscount}%+
              </span>
            </div>

            <label className="inline-flex items-center gap-2 text-sm text-slate-700 select-none">
              <input
                type="checkbox"
                className="accent-emerald-500"
                checked={inStockOnly}
                onChange={(e) => setInStockOnly(e.target.checked)}
              />
              <span>{t.deals?.inStockOnly || 'In-stock only'}</span>
            </label>

            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
              <FaSort className="text-slate-500" />
              <select
                className="bg-transparent text-slate-900 outline-none"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                aria-label="Sort"
              >
                <option value="best">{"Best deals"}</option>
                <option value="discountDesc">{"Highest discount"}</option>
                <option value="priceAsc">{"Price: Low to High"}</option>
                <option value="priceDesc">{"Price: High to Low"}</option>
                <option value="nameAsc">{"Name A–Z"}</option>
              </select>
            </div>

            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
              <button
                className={`px-2.5 py-1.5 rounded-md ${view === 'cozy' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:text-slate-800'}`}
                title="Cozy view"
                onClick={() => setView('cozy')}
              >
                <FaThLarge />
              </button>
              <button
                className={`px-2.5 py-1.5 rounded-md ${view === 'compact' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:text-slate-800'}`}
                title="Compact view"
                onClick={() => setView('compact')}
              >
                <FaTh />
              </button>
            </div>
          </div>
        </div>

        {/* Grid */}
        <div className={`grid gap-4 ${view === 'compact' ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}`}>
          {displayedProducts.length === 0 && (
            <p className="col-span-full text-center text-slate-400 text-sm italic">{t.deals?.noDeals || 'No special deals available at the moment. Check back soon!'}</p>
          )}

          {displayedProducts.map((product) => {
            const isFavorite = favorites[product._id || product.id] || false;
            const discountPercentage = calculateDiscount(product.unitPrice, product.offerPrice);

            return (
              <div
                key={product._id || product.id}
                className={`group relative rounded-xl border border-slate-200 bg-white shadow transition hover:-translate-y-1 hover:shadow-lg ${((product.totalQty || 0) <= 0) ? 'opacity-80' : ''}`}
                onClick={() => handleQuickView(product)}
              >
                <div className="relative aspect-[4/3] bg-slate-100">
                  <div className="absolute top-2 left-2 z-10">
                    <img src={appLogo} alt="App Logo" className="w-8 h-8 opacity-90" />
                  </div>
                  <img
                    src={(product.images && product.images[0]) || 'https://via.placeholder.com/600x450?text=Deal'}
                    alt={product.name}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2 z-10 flex gap-2 flex-wrap">
                    {discountPercentage > 0 && (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full border border-white/20 text-white bg-gradient-to-br from-red-500 to-amber-500">
                        -{discountPercentage}% OFF
                      </span>
                    )}
                    {product.barterAvailable && (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full border border-white/20 text-white bg-gradient-to-br from-cyan-500 to-sky-400">
                        Barter
                      </span>
                    )}
                    {product.negotiationAvailable && (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full border border-white/20 text-white bg-gradient-to-br from-emerald-500 to-green-400">
                        Negotiable
                      </span>
                    )}
                  </div>
                  <button
                    className={`absolute bottom-2 right-2 z-10 grid place-items-center w-9 h-9 rounded-full border ${isFavorite ? 'bg-red-500 border-red-400 text-white' : 'border-slate-200 bg-white/90 text-slate-700'}`}
                    onClick={(e) => toggleFavorite(product._id || product.id, e)}
                    aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    {isFavorite ? <FaHeart /> : <FaRegHeart />}
                  </button>
                  <div className="absolute inset-x-0 bottom-0 p-2.5 flex items-center gap-2 text-white bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition">
                    <FaSearch /> {t.featured?.quickView || 'Quick View'}
                  </div>
                </div>

                <div className="p-3.5">
                  <h3 className="text-slate-900 text-base font-semibold truncate">{product.name}</h3>
                  <p className="text-slate-500 text-xs uppercase tracking-wider">{product.category}</p>
                  <p className="text-slate-600 text-sm mt-2">
                    {(product.description || '').substring(0, 80)}...
                  </p>
                  <div className="flex items-center justify-between mt-3">
                    <div className="text-slate-900 font-bold">
                      ৳{(product.offerPrice ?? product.unitPrice).toFixed(2)}
                      {product.offerPrice && (
                        <span className="ml-2 text-slate-500 font-medium line-through">৳{product.unitPrice.toFixed(2)}</span>
                      )}
                      <span className="ml-2 text-slate-500 font-medium">/ {product.unitType}</span>
                    </div>
                    <div className="text-xs text-slate-600">
                      {product.totalQty > 0 ? `In stock: ${product.totalQty}` : 'Out of stock'}
                    </div>
                  </div>
                  <button
                    className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 disabled:bg-slate-200 disabled:text-slate-500"
                    onClick={(e) => handleAddToCart(e, product)}
                    disabled={product.totalQty <= 0}
                    aria-label={product.totalQty > 0 ? 'Add to cart' : 'Out of stock'}
                  >
                    <FaShoppingCart />
                    {product.totalQty > 0 ? t.featured?.addToCart || 'Add to Cart' : t.featured?.outOfStock || 'Out of Stock'}
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
