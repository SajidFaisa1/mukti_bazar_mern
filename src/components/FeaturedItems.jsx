import React, { useState } from 'react';
import { FaShoppingCart, FaHeart, FaRegHeart, FaSearch, FaInfoCircle } from 'react-icons/fa';
import appLogo from '../assets/free.png';
import ProductModal from './ProductModal';
import { useLanguage } from '../contexts/LanguageContext';
import { useCart } from '../contexts/CartContext';
import { translations } from '../translations/translations';
import { useToast } from './ui/ToastProvider';

// Accept products as a prop (should come from API, not mock data)
// layout: 'standalone' (default) renders full decorative section; 'embedded' renders only the grid (no extra width/padding wrappers)
const FeaturedItems = ({ products = [], layout = 'standalone' }) => {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [favorites, setFavorites] = useState({});
  const [expanded, setExpanded] = useState(false);
  const { addToCart } = useCart();
  const toast = useToast();
  const { language } = useLanguage();
  const t = translations[language];

  const featuredProducts = Array.isArray(products)
    ? products.filter(p => p.isFeatured).slice(0, expanded ? 16 : 8)
    : [];

  const toggleFavorite = (productId, e) => {
    e.stopPropagation();
    setFavorites(prev => ({ ...prev, [productId]: !prev[productId] }));
  };

  const handleAddToCart = (e, product) => {
    e.stopPropagation();
    const minOrder = product.minOrderQty && product.minOrderQty > 0 ? product.minOrderQty : 1;
    const stockQty = typeof product.availableQty === 'number'
      ? product.availableQty
      : (typeof product.totalQty === 'number' ? product.totalQty : 0);
    if (stockQty <= 0) {
      toast.push({ title: 'Out of stock', message: 'This item is currently unavailable.' });
      return;
    }
    if (minOrder > stockQty) {
      toast.push({ title: 'Stock limit', message: `Min order (${minOrder}) exceeds stock (${stockQty})` });
      return;
    }
    addToCart({
      id: product._id || product.id,
      title: product.name,
      price: product.offerPrice || product.unitPrice,
      images: product.images,
      quantity: minOrder,
      minOrderQty: minOrder
    });
    toast.push({ title: 'Added to cart', message: `${product.name} x${minOrder}` });
  };

  const handleQuickView = (product) => setSelectedProduct(product);
  const closeModal = () => setSelectedProduct(null);

  const Grid = () => (
    <div className="grid gap-6 sm:gap-7 md:gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {featuredProducts.length === 0 && (
        <div className="col-span-full flex flex-col items-center justify-center py-12 rounded-2xl border-2 border-dashed border-primary-200/70 bg-white/70 backdrop-blur-sm">
          <p className="text-accent-600 font-medium text-sm">{t.featured.noFeatured || 'No featured products available.'}</p>
        </div>
      )}
      {featuredProducts.map(product => {
            const isFavorite = favorites[product._id || product.id] || false;
            const price = Number(product.offerPrice || product.unitPrice || 0);
            const originalPrice = product.offerPrice ? Number(product.unitPrice || 0) : null;
            // Robust stock handling: prefer virtual availableQty, fallback to totalQty, else 0
            const stockQty = typeof product.availableQty === 'number'
              ? product.availableQty
              : (typeof product.totalQty === 'number' ? product.totalQty : 0);
            const lowStockThreshold = typeof product.lowStockThreshold === 'number' ? product.lowStockThreshold : null;
            const isLow = lowStockThreshold != null && stockQty > 0 && stockQty <= lowStockThreshold;
            return (
              <div
                key={product._id || product.id}
                onClick={() => handleQuickView(product)}
                className="group relative flex flex-col rounded-[28px] bg-gradient-to-b from-gray-100 to-white border border-primary-100 shadow-soft hover:shadow-medium hover:border-primary-300 transition overflow-hidden"
              >
                {/* Top bar with logo & favorite */}
                <div className="relative z-10 flex items-start justify-between px-5 pt-5">
                  <div className="flex items-center gap-2">
                    <div className="w-12 h-12 rounded-xl bg-white shadow-inner ring-1 ring-primary-100 flex items-center justify-center overflow-hidden">
                      <img src={appLogo} alt="Logo" className="object-contain w-full h-full" />
                    </div>
                    <div className="leading-tight">
                      <h3 className="text-sm font-bold tracking-wide text-primary-700 line-clamp-2 group-hover:text-primary-600 transition">
                        {product.name}
                      </h3>
                      <p className="mt-1 inline-flex items-center px-2 py-0.5 rounded-full bg-primary-100 text-primary-700 text-[10px] font-semibold uppercase tracking-wide">
                        {product.category || 'Other'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => toggleFavorite(product._id || product.id, e)}
                    aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                    className={`w-10 h-10 rounded-full flex items-center justify-center backdrop-blur border transition mt-1 ${isFavorite ? 'bg-red-500 text-white border-red-500' : 'bg-white/80 text-accent-500 border-accent-200 hover:bg-red-50 hover:text-red-500'}`}
                  >
                    {isFavorite ? <FaHeart className="text-base" /> : <FaRegHeart className="text-base" />}
                  </button>
                </div>

                {/* Product image floating over waves */}
                <div className="relative z-10 mt-4 px-5">
                  <div className="aspect-[4/3] w-full rounded-2xl overflow-hidden shadow ring-1 ring-primary-100 bg-white flex items-center justify-center">
                    {product.images?.[0] ? (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-full h-full object-contain p-3 transition duration-700 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-accent-400 text-xs font-semibold">No Image</div>
                    )}
                    {/* Quick view badge */}
                    <div className="absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 bg-white/95 backdrop-blur px-3 py-2 flex items-center justify-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-primary-600 border-t border-primary-100 transition">
                      <FaSearch className="text-xs" /> {t.featured.quickView}
                    </div>
                  </div>

                  {/* Badges (barter/negotiable) */}
                  <div className="absolute -top-2 left-5 flex flex-col gap-2">
                    {product.barterAvailable && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary-600 text-white text-[10px] font-semibold uppercase tracking-wide shadow">Barter</span>
                    )}
                    {product.negotiationAvailable && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-indigo-500 text-white text-[10px] font-semibold uppercase tracking-wide shadow">Negotiable</span>
                    )}
                  </div>
                </div>

                {/* Info section sitting on waves */}
                <div className="relative z-10 mt-5 px-5 pb-6 flex flex-col flex-1">
                  <p className="text-xs text-accent-600 leading-relaxed line-clamp-2">
                    {product.description?.slice(0, 120) || ''}{product.description && product.description.length > 120 ? '…' : ''}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-extrabold text-primary-700">৳{price.toFixed(2)}</span>
                      <span className="text-[10px] font-semibold text-accent-500 uppercase tracking-wide">/{product.unitType}</span>
                      {originalPrice && (
                        <span className="ml-2 text-[10px] font-semibold text-red-500 line-through">৳{originalPrice.toFixed(2)}</span>
                      )}
                    </div>
                    <span className={`text-[10px] font-semibold tracking-wide px-2 py-1 rounded-full shadow-sm ${stockQty>0 ? (isLow ? 'bg-amber-200 text-amber-800' : 'bg-primary-100 text-primary-700') : 'bg-accent-200 text-accent-600'}`}>{stockQty>0 ? (isLow ? `Low: ${stockQty}` : `Stock: ${stockQty}`) : 'Out'}</span>
                  </div>
                  {product.minOrderQty && (
                    <div className="mt-3 flex items-start gap-2 text-[10px] text-accent-600 bg-accent-100/70 rounded-lg px-3 py-2 border border-accent-200/60">
                      <FaInfoCircle className="mt-0.5 text-primary-500" />
                      <span className="font-medium">Min: {product.minOrderQty}</span>
                    </div>
                  )}
                  <button
                    onClick={(e) => handleAddToCart(e, product)}
                    disabled={stockQty <= 0}
                    aria-label={stockQty > 0 ? 'Add to cart' : 'Out of stock'}
                    className={`mt-4 inline-flex items-center justify-center gap-2 rounded-xl w-full px-5 py-3 text-xs font-semibold tracking-wide transition relative overflow-hidden focus:outline-none focus:ring-4 focus:ring-primary-300 disabled:cursor-not-allowed disabled:opacity-60 ${stockQty>0 ? 'bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-soft hover:shadow-medium hover:-translate-y-0.5' : 'bg-accent-300 text-accent-600'}`}
                  >
                    <FaShoppingCart className="text-sm" /> {stockQty > 0 ? t.featured.addToCart : t.featured.outOfStock}
                  </button>
                </div>

                {/* Layered wave field background */}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 overflow-hidden">
                  <svg viewBox="0 0 1440 320" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 w-full h-full">
                    <path fill="#388E3C" fillOpacity="0.15" d="M0,224L48,202.7C96,181,192,139,288,138.7C384,139,480,181,576,165.3C672,149,768,75,864,74.7C960,75,1056,149,1152,181.3C1248,213,1344,203,1392,197.3L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z" />
                  </svg>
                  <svg viewBox="0 0 1440 320" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 w-full h-full">
                    <path fill="#5bb55b" fillOpacity="0.3" d="M0,192L60,170.7C120,149,240,107,360,90.7C480,75,600,85,720,122.7C840,160,960,224,1080,240C1200,256,1320,224,1380,208L1440,192L1440,320L1380,320C1320,320,1200,320,1080,320C960,320,840,320,720,320C600,320,480,320,360,320C240,320,120,320,60,320L0,320Z" />
                  </svg>
                  <svg viewBox="0 0 1440 320" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 w-full h-full">
                    <path fill="#fbbf24" fillOpacity="0.55" d="M0,288L80,272C160,256,320,224,480,186.7C640,149,800,107,960,101.3C1120,96,1280,128,1360,144L1440,160L1440,320L1360,320C1280,320,1120,320,960,320C800,320,640,320,480,320C320,320,160,320,80,320L0,320Z" />
                  </svg>
                  <svg viewBox="0 0 1440 320" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 w-full h-full">
                    <path fill="#256b25" fillOpacity="0.5" d="M0,256L48,245.3C96,235,192,213,288,218.7C384,224,480,256,576,261.3C672,267,768,245,864,208C960,171,1056,117,1152,96C1248,75,1344,85,1392,90.7L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z" />
                  </svg>
                </div>
              </div>
            );
          })}
    </div>
  );

  if (layout === 'embedded') {
    return (
      <>
        <Grid />
        {!expanded && featuredProducts.length >= 8 && (
          <div className="mt-6 flex justify-center">
            <button onClick={() => setExpanded(true)} className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-xs font-semibold tracking-wide bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-sm hover:shadow-md hover:-translate-y-0.5 transition focus:outline-none focus:ring-4 focus:ring-primary-300">
              See More
            </button>
          </div>
        )}
        {expanded && (
          <div className="mt-6 flex justify-center">
            <button onClick={() => setExpanded(false)} className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-xs font-semibold tracking-wide bg-white text-primary-600 border border-primary-300 shadow-sm hover:bg-primary-50 transition focus:outline-none focus:ring-4 focus:ring-primary-300">
              Show Less
            </button>
          </div>
        )}
        {selectedProduct && (
          <ProductModal
            product={selectedProduct}
            onClose={closeModal}
            onAddToCart={(productId, quantity) => { closeModal(); }}
          />
        )}
      </>
    );
  }

  return (
    <section className="relative py-16 sm:py-20 bg-gradient-to-br from-primary-50 via-white to-primary-100/70 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none [mask-image:radial-gradient(circle_at_center,white,transparent)]">
        <div className="absolute -top-10 -left-16 w-72 h-72 bg-primary-200/25 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-primary-300/20 rounded-full blur-3xl" />
      </div>
      <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-14">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-primary-700 to-primary-500 bg-clip-text text-transparent">
            {t.featured.title}
          </h2>
          <p className="mt-4 text-sm md:text-base text-accent-600 font-medium leading-relaxed">
            {t.featured.subtitle}
          </p>
          <div className="mt-6 w-24 h-1 mx-auto bg-gradient-to-r from-amber-400 to-amber-300 rounded-full" />
        </div>
        <Grid />
        {selectedProduct && (
          <ProductModal
            product={selectedProduct}
            onClose={closeModal}
            onAddToCart={(productId, quantity) => { closeModal(); }}
          />
        )}
      </div>
    </section>
  );
};

export default FeaturedItems;
