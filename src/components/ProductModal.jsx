import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
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
import { useToast } from '../components/ui/ToastProvider';
import { useVendorAuth } from '../contexts/VendorAuthContext';
import { useClientAuth } from '../contexts/ClientAuthContext';
import { translations } from '../translations/translations';
import muktiLogo from '../assets/Mukti.png';
import BarterOffer from './BarterOffer';
import ContactVendorButton from './messaging/ContactVendorButton';
import NegotiationButton from './negotiation/NegotiationButton';
import './ProductModal.css';

// Simple tab state for Details / Reviews
const TABS = ['details','reviews'];

const ProductModal = ({ product, onClose }) => {
  const { addToCart } = useCart();
  const toast = useToast();
  const { currentUser: vendorAuthUser, token: vendorAuthToken } = useVendorAuth();
  const { currentUser: clientAuthUser, token: clientAuthToken } = useClientAuth();
  const [showBarterOffer, setShowBarterOffer] = useState(false);
  const [vendorInfo, setVendorInfo] = useState(null);
  const [loadingVendor, setLoadingVendor] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackList, setFeedbackList] = useState([]);
  const [feedbackPage, setFeedbackPage] = useState(1);
  const [feedbackHasMore, setFeedbackHasMore] = useState(false);
  const [distribution, setDistribution] = useState(null);
  const [userRating, setUserRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [userComment, setUserComment] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const [reviewImages, setReviewImages] = useState([]);
  
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
    if (newQuantity < minQty) {
      toast.push({ title: 'Minimum quantity', message: `You must order at least ${minQty}` });
      return;
    }
    if (availableQty > 0 && newQuantity > availableQty) {
      toast.push({ title: 'Stock limit', message: `Only ${availableQty} in stock` });
      return;
    }
    setQuantity(newQuantity);
  };

  const handleImageClick = (index) => {
    setCurrentImage(index);
  };

  const availableQty = typeof product.availableQty === 'number' ? product.availableQty : (typeof product.totalQty === 'number' ? product.totalQty : 0);
  const effectivePrice = typeof product.effectivePrice === 'number' ? product.effectivePrice : (product.offerPrice || product.unitPrice);
  const lowStockThreshold = typeof product.lowStockThreshold === 'number' ? product.lowStockThreshold : null;
  const isLowStock = lowStockThreshold != null && availableQty > 0 && availableQty <= lowStockThreshold;

  // Vendor location derived priority: product.vendorLocation -> vendorInfo.address -> vendorInfo.displayLocation
  const derivedLocation = useMemo(() => {
    if (product.vendorLocation) {
      const v = product.vendorLocation;
      return [v.union, v.upazila || v.city, v.district, v.division].filter(Boolean).join(', ');
    }
    if (vendorInfo?.displayLocation) return vendorInfo.displayLocation;
    if (vendorInfo?.address) {
      const a = vendorInfo.address;
      return [a.union, a.upazila || a.city, a.district, a.division].filter(Boolean).join(', ');
    }
    return '';
  }, [product.vendorLocation, vendorInfo]);

  // Lock body scroll while modal open
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = originalOverflow; };
  }, []);

  // Load initial feedback
  useEffect(()=>{
    if (!product?._id) return;
    let cancelled = false;
    const load = async () => {
      setFeedbackLoading(true);
      try {
        const res = await fetch(`http://localhost:5005/api/feedback/product/${product._id}?page=${feedbackPage}`);
        const data = await res.json();
        if (!cancelled && data && Array.isArray(data.feedback)) {
          setFeedbackList(prev => feedbackPage===1 ? data.feedback : [...prev, ...data.feedback]);
          setFeedbackHasMore(feedbackPage < data.pages);
          if (feedbackPage===1 && data.distribution) setDistribution(data.distribution);
        }
      } catch(e){ console.error('Feedback load error', e); }
      finally { if(!cancelled) setFeedbackLoading(false); }
    };
    load();
    return ()=>{ cancelled = true; };
  }, [product._id, feedbackPage]);

  const submitFeedback = async () => {
    if (!userToken) { toast.push({ title: 'Login required', message: 'Login to submit feedback.' }); return; }
    if (userRating < 1) { toast.push({ title: 'Rating required', message: 'Select 1-5 stars.' }); return; }
    setSubmittingFeedback(true);
    try {
      let imageUrls = [];
      if (reviewImages.length) {
        const upRes = await fetch('http://localhost:5005/api/feedback/upload-images', { method:'POST', headers: { 'Content-Type':'application/json', Authorization:`Bearer ${userToken}` }, body: JSON.stringify({ images: reviewImages }) });
        const upData = await upRes.json();
        if (upRes.ok) imageUrls = upData.urls || [];
      }
      const res = await fetch(`http://localhost:5005/api/feedback/${product._id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
        body: JSON.stringify({ rating: userRating, comment: userComment, images: imageUrls })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submit failed');
      toast.push({ title: 'Feedback saved', message: 'Thanks for sharing.' });
      // Reset and reload
      setFeedbackPage(1);
      setUserComment('');
      setUserRating(0);
  setReviewImages([]);
    } catch(e){
      toast.push({ title: 'Error', message: e.message });
    } finally { setSubmittingFeedback(false); }
  };

  const StarInput = ({ value }) => (
    <button
      type="button"
      onClick={()=>setUserRating(value)}
      onMouseEnter={()=>setHoverRating(value)}
      onMouseLeave={()=>setHoverRating(0)}
      className="p-1"
      aria-label={`Rate ${value}`}
    >
      <FaStar className={`h-5 w-5 ${ (hoverRating || userRating) >= value ? 'text-amber-400' : 'text-slate-300' }`} />
    </button>
  );

  const modalBody = (
    <div
      className="fixed inset-0 z-[120] flex items-start justify-center bg-black/50 backdrop-blur-sm px-4 py-6 md:py-8"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="relative w-full max-w-[1400px] max-h-[calc(100vh-3rem)] md:max-h-[calc(100vh-4rem)] flex flex-col rounded-3xl bg-white shadow-2xl ring-1 ring-black/5 overflow-hidden animate-[fadeIn_0.3s_ease]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header band (sticky) */}
        <div className="sticky top-0 z-10 flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-emerald-600 via-emerald-500 to-lime-500 text-white shadow-md">
          <img src={muktiLogo} alt="Mukti" className="h-10 w-auto drop-shadow" />
          <div className="flex flex-col flex-1 min-w-0">
            <h2 className="text-xl font-bold leading-tight tracking-tight truncate" title={product.name}>{product.name}</h2>
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-emerald-100/90">
              {product.totalQty > 0 ? (
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${isLowStock ? 'bg-amber-600/70 text-white' : 'bg-emerald-700/40'}`} aria-label={isLowStock ? 'Low stock' : 'In stock'}>
                  {isLowStock ? <FaInfoCircle className="h-3 w-3" /> : <FaCheck className="h-3 w-3" />} {isLowStock ? 'Low Stock' : t.inStock}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-600/60 px-2 py-0.5" aria-label="Out of stock">
                  <FaClock className="h-3 w-3" /> {t.outOfStock}
                </span>
              )}
              {discountPercentage > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/90 text-amber-900 px-2 py-0.5 text-[11px] font-semibold">{discountPercentage}% OFF</span>
              )}
              {product.barterAvailable && (
                <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/80 px-2 py-0.5 text-[11px] font-semibold"><FaExchangeAlt className="h-3 w-3" /> Barter</span>
              )}
              {product.negotiationAvailable && (
                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/80 px-2 py-0.5 text-[11px] font-semibold"><FaInfoCircle className="h-3 w-3" /> Negotiable</span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="group inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-slate-600 shadow hover:bg-rose-50 hover:text-rose-600 transition"
            aria-label="Close product details"
          >
            <FaTimes className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto scroll-py-6">
          {/* Tabs */}
          <div className="px-6 pt-6">
            <div className="inline-flex rounded-full bg-slate-100 p-1 text-xs font-semibold mb-4">
              {TABS.map(tab => (
                <button key={tab} onClick={()=>setActiveTab(tab)} className={`px-4 py-1.5 rounded-full transition ${activeTab===tab ? 'bg-white shadow text-slate-800':'text-slate-500 hover:text-slate-700'}`}>{tab==='details'?'Details':'Reviews'}{tab==='reviews' && product.ratingCount>0 && <span className="ml-1 text-[10px] font-medium text-amber-500">{product.avgRating?.toFixed?.(1) || product.avgRating}</span>}</button>
              ))}
            </div>
          </div>
          {activeTab === 'details' && (
          <div className="grid gap-8 px-6 pb-8 md:grid-cols-5">
          {/* Gallery */}
          <div className="md:col-span-3 flex flex-col gap-5">
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200">
              <img
                src={product.images?.[currentImage] || ''}
                alt={product.name}
                className="h-full w-full object-cover object-center transition-opacity duration-300"
                loading="lazy"
              />
              {discountPercentage > 0 && (
                <div className="absolute top-3 left-3 rounded-md bg-amber-500 px-3 py-1 text-xs font-bold text-white shadow">
                  -{discountPercentage}%
                </div>
              )}
              {product.totalQty <= 0 && (
                <div className="absolute inset-0 bg-white/60 backdrop-blur flex items-center justify-center text-rose-600 font-bold text-lg">
                  {t.outOfStock}
                </div>
              )}
            </div>
            {product.images?.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-emerald-300">
                {product.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => handleImageClick(i)}
                    className={`relative aspect-square h-20 flex-shrink-0 overflow-hidden rounded-lg ring-2 transition ${
                      currentImage === i
                        ? 'ring-emerald-500 shadow-md'
                        : 'ring-transparent hover:ring-emerald-300'
                    }`}
                    aria-label={`Show image ${i + 1}`}
                  >
                    <img
                      src={img}
                      alt={`Thumb ${i + 1}`}
                      className="h-full w-full object-cover object-center"
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Product Description & Details */}
            <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-base font-semibold tracking-tight text-slate-700 flex items-center gap-2">
                <FaInfoCircle className="text-emerald-500" /> {t.productDetails}
              </h3>
              <p className="text-sm leading-relaxed text-slate-600 whitespace-pre-line">
                {product.description || '—'}
              </p>
              <div className="mt-5 grid gap-3 text-sm">
                {product.shelfLife && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <FaLeaf className="text-emerald-500" />
                    <span>Shelf Life: {product.shelfLife}</span>
                  </div>
                )}
                {product.estDeliveryTime && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <FaTruck className="text-emerald-500" />
                    <span>Est. Delivery: {product.estDeliveryTime}</span>
                  </div>
                )}
                {product.deliveryOption && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <FaTruck className="text-emerald-500" />
                    <span>Delivery Option: {product.deliveryOption}</span>
                  </div>
                )}
                {product.barterAvailable && (
                  <div className="flex flex-wrap items-center gap-2 text-slate-600">
                    <FaExchangeAlt className="text-orange-500" />
                    <span>Barter Exchange Available</span>
                    {userRole === 'vendor' && currentUser?.uid !== product.vendorUid && (
                      <button
                        onClick={handleBarterClick}
                        className="rounded-full border border-orange-400/60 bg-orange-50 px-3 py-0.5 text-xs font-medium text-orange-600 hover:bg-orange-100"
                      >
                        Trade Now
                      </button>
                    )}
                    {userRole === 'vendor' && currentUser?.uid === product.vendorUid && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">Own Product</span>
                    )}
                    {!userRole && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">Login as Vendor</span>
                    )}
                    {userRole === 'client' && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">Vendors Only</span>
                    )}
                  </div>
                )}
                {product.minOrderQty && (
                  <div className="flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
                    <FaInfoCircle /> Minimum order: {product.minOrderQty}
                  </div>
                )}
                {isLowStock && (
                  <div className="flex items-center gap-2 rounded-md bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
                    <FaInfoCircle /> Only {availableQty} left (threshold {lowStockThreshold})
                  </div>
                )}
                {product.negotiationAvailable && (
                  <div className="flex items-center gap-2 rounded-md bg-indigo-50 px-3 py-2 text-xs font-medium text-indigo-700">
                    <FaInfoCircle /> Price Negotiation Available
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Side panel */}
          <div className="md:col-span-2 flex flex-col gap-6">
            {/* Pricing / Quantity */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <div className="text-2xl font-bold tracking-tight text-slate-800">
                    ৳{(effectivePrice).toFixed(2)}
                    <span className="ml-1 text-xs font-medium text-slate-500">/ {product.unitType}</span>
                  </div>
                  {product.offerPrice && (
                    <div className="text-xs font-medium text-slate-400 line-through">
                      ৳{product.unitPrice?.toFixed(2)}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3 rounded-full bg-slate-100/80 px-3 py-2">
                  <button
                    onClick={() => handleQuantityChange(quantity - 1)}
                    disabled={quantity <= minQty}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-emerald-50 disabled:opacity-30"
                  >
                    <FaMinus />
                  </button>
                  <span className="min-w-[2ch] text-center font-semibold text-slate-800">{quantity}</span>
                  <button
                    onClick={() => handleQuantityChange(quantity + 1)}
                    disabled={availableQty > 0 && quantity >= availableQty}
                    className={`inline-flex h-7 w-7 items-center justify-center rounded-full ${availableQty>0 && quantity>=availableQty ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
                    aria-label={availableQty>0 && quantity>=availableQty ? 'Reached stock limit' : 'Increase quantity'}
                  >
                    <FaPlus />
                  </button>
                </div>
              </div>
              <button
                disabled={availableQty <= 0}
                onClick={handleAddToCart}
                className={`mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold shadow transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ${
                  availableQty > 0
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800'
                    : 'bg-slate-300 text-slate-600 cursor-not-allowed'
                }`}
              >
                <FaShoppingCart className="h-4 w-4" />
                {availableQty > 0 ? `Cart (৳${(effectivePrice * quantity).toFixed(2)})` : t.outOfStock}
              </button>
              {vendorInfo && currentUser && currentUser.uid !== product.vendorUid && (
                <ContactVendorButton
                  product={product}
                  vendor={vendorInfo}
                  className="w-full justify-center rounded-xl bg-slate-100 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-200 mt-3"
                />
              )}
              {canMakeBarter && (
                <button
                  onClick={handleBarterClick}
                  disabled={product.totalQty <= 0}
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-orange-300 bg-orange-50 px-5 py-2.5 text-sm font-semibold text-orange-600 hover:bg-orange-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                >
                  <FaExchangeAlt className="h-4 w-4" /> Propose Barter
                </button>
              )}
              <button className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-pink-300 bg-pink-50 px-5 py-2.5 text-sm font-semibold text-pink-600 hover:bg-pink-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400">
                <FaHeart className="h-4 w-4" /> {t.addToWishlist}
              </button>
            </div>

            {/* Vendor card */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
                <FaStorefrontIcon /> {t.soldBy || 'Sold By'}
              </h3>
              {loadingVendor ? (
                <div className="space-y-3 animate-pulse">
                  <div className="h-4 w-2/3 rounded bg-slate-200" />
                  <div className="h-3 w-1/2 rounded bg-slate-200" />
                  <div className="h-3 w-1/3 rounded bg-slate-200" />
                </div>
              ) : vendorInfo ? (
                <div className="space-y-2">
                  <div className="text-base font-semibold text-slate-800">{vendorInfo.businessName}</div>
                  {(derivedLocation) && (
                    <div className="flex items-center gap-2 text-xs text-slate-600" aria-label="Vendor location">
                      <FaMapMarkerAlt className="h-3.5 w-3.5 text-emerald-500" />
                      <span>{derivedLocation}</span>
                    </div>
                  )}
                  {canContactVendor && (
                    <div className="mt-4 flex flex-col gap-3">
                      <NegotiationButton
                        product={product}
                        vendor={vendorInfo}
                        className="w-full justify-center rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
                      />
                    </div>
                  )}
                </div>
              ) : product.vendorUid || product.storeId ? (
                <div className="text-xs text-slate-500">Store information unavailable</div>
              ) : (
                <div className="text-xs text-slate-400">—</div>
              )}
            </div>

            {/* Shipping / perks */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm grid gap-4 text-sm">
              <div className="flex items-center gap-2 text-slate-600">
                <FaTruck className="text-emerald-500" /> {t.freeShipping}
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <FaLeaf className="text-emerald-500" /> {t.organic}
              </div>
            </div>

            {/* Share */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <span className="mb-3 block text-xs font-semibold uppercase tracking-wide text-slate-500">{t.share}</span>
              <div className="flex flex-wrap gap-3">
                <button className="inline-flex items-center gap-2 rounded-lg bg-blue-600/90 px-3 py-2 text-xs font-semibold text-white shadow hover:bg-blue-600"><FaFacebookF /> Facebook</button>
                <button className="inline-flex items-center gap-2 rounded-lg bg-sky-500/90 px-3 py-2 text-xs font-semibold text-white shadow hover:bg-sky-500"><FaTwitter /> Twitter</button>
                <button className="inline-flex items-center gap-2 rounded-lg bg-green-500/90 px-3 py-2 text-xs font-semibold text-white shadow hover:bg-green-500"><FaWhatsapp /> WhatsApp</button>
              </div>
            </div>
          </div>
          </div>
          )}
          {activeTab === 'reviews' && (
          <div className="px-6 pb-10">
            <div className="max-w-6xl mx-auto grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 flex flex-col gap-6">
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                    <h3 className="text-sm font-semibold tracking-wide text-slate-700 flex items-center gap-2"><FaStar className="text-amber-400" /> Reviews</h3>
                    {product.ratingCount>0 && (
                      <div className="text-[11px] flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-full px-3 py-1 font-medium text-amber-700">
                        <span className="flex items-center gap-1"><FaStar className="text-amber-400" /> {product.avgRating?.toFixed?.(1) || product.avgRating}</span>
                        <span className="text-slate-400">({product.ratingCount})</span>
                      </div>
                    )}
                  </div>
                  {feedbackLoading && feedbackPage===1 && <div className="text-xs text-slate-500">Loading feedback...</div>}
                  <ul className="space-y-4">
                    {feedbackList.map(f => (
                      <li key={f._id} className="rounded-lg border border-slate-100 bg-slate-50/60 p-3 text-xs group">
                        <div className="flex items-center gap-1 mb-1">
                          {Array.from({length:5}).map((_,i)=>(<FaStar key={i} className={`h-3 w-3 ${(i < f.rating)?'text-amber-400':'text-slate-300'}`} />))}
                          <span className="ml-2 text-[10px] text-slate-500">{new Date(f.createdAt).toLocaleDateString()}</span>
                          {f.purchased && <span className="ml-2 text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-semibold">Verified</span>}
                          {f.helpfulVotes>0 && <span className="ml-2 text-[9px] font-semibold text-emerald-600">{f.helpfulVotes} helpful</span>}
                        </div>
                        <p className="text-slate-700 leading-relaxed mb-2">{f.comment || <span className="italic text-slate-400">(No comment)</span>}</p>
                        {Array.isArray(f.images) && f.images.length>0 && (
                          <div className="mb-2 flex gap-2 flex-wrap">
                            {f.images.slice(0,3).map((img,i)=>(<button key={i} onClick={()=>window.open(img,'_blank')} className="relative h-14 w-14 rounded overflow-hidden ring-1 ring-slate-200">
                              <img src={img} alt="rev" className="h-full w-full object-cover" loading="lazy" />
                            </button>))}
                          </div>
                        )}
                        <div className="flex items-center gap-3 opacity-90">
                          <button
                            onClick={async ()=>{
                              try {
                                const res = await fetch(`http://localhost:5005/api/feedback/helpful/${f._id}`,{method:'POST', headers: userToken? { Authorization: `Bearer ${userToken}` } : {}});
                                const d = await res.json();
                                if (d.helpfulVotes!=null) {
                                  setFeedbackList(list=> list.map(x=> x._id===f._id ? {...x, helpfulVotes: d.helpfulVotes} : x));
                                }
                              } catch(e){/* ignore */}
                            }}
                            className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-[10px] font-semibold text-slate-600 ring-1 ring-slate-200 hover:bg-emerald-50 hover:text-emerald-700"
                          >Helpful</button>
                          <button
                            onClick={async ()=>{
                              try {
                                const res = await fetch(`http://localhost:5005/api/feedback/moderate/report/${f._id}`,{method:'POST', headers: userToken? { 'Content-Type':'application/json', Authorization: `Bearer ${userToken}` } : {'Content-Type':'application/json'}, body: JSON.stringify({ reason: 'inappropriate' })});
                                await res.json();
                                toast.push({ title: 'Reported', message: 'Thanks for flagging.' });
                              } catch(e){ toast.push({ title: 'Error', message: 'Report failed'}); }
                            }}
                            className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-[10px] font-medium text-slate-500 ring-1 ring-slate-200 hover:bg-rose-50 hover:text-rose-600"
                          >Report</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                  {feedbackHasMore && !feedbackLoading && (
                    <div className="mt-4">
                      <button onClick={()=>setFeedbackPage(p=>p+1)} className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700">Load more</button>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-6">
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  {distribution && distribution.total>0 && (
                    <div className="mb-5 space-y-1.5">
                      {([5,4,3,2,1]).map(st=>{
                        const count = distribution.distribution?.[st] || 0;
                        const pct = distribution.total ? Math.round((count / distribution.total)*100) : 0;
                        return (
                          <div key={st} className="flex items-center gap-2">
                            <span className="w-4 text-[10px] font-semibold text-slate-500">{st}</span>
                            <div className="flex-1 h-2 rounded bg-slate-100 overflow-hidden">
                              <div style={{width: pct+'%'}} className={`h-full ${pct>0?'bg-amber-400':''}`}></div>
                            </div>
                            <span className="w-10 text-right text-[10px] text-slate-500">{pct}%</span>
                          </div>
                        )})}
                    </div>
                  )}
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">Your Feedback</h4>
                  <div className="flex items-center gap-1 mb-3">{[1,2,3,4,5].map(v=> <StarInput key={v} value={v} /> )}</div>
                  <textarea value={userComment} onChange={e=>setUserComment(e.target.value)} placeholder="Share details (optional)" rows={4} className="w-full text-xs p-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                  <div className="mt-2">
                    <label className="text-[10px] font-semibold text-slate-500 mb-1 block">Images (up to 3)</label>
                    <input type="file" accept="image/*" multiple onChange={async (e)=>{
                      const files = Array.from(e.target.files||[]).slice(0,3);
                      const converted = [];
                      for (const f of files) {
                        const b64 = await new Promise(res=> { const r = new FileReader(); r.onload=()=>res(r.result); r.readAsDataURL(f); });
                        converted.push(b64);
                      }
                      setReviewImages(converted);
                    }} className="text-[10px]" />
                    {reviewImages.length>0 && (
                      <div className="mt-2 flex gap-2 flex-wrap">{reviewImages.map((img,i)=>(<div key={i} className="relative h-12 w-12 rounded overflow-hidden ring-1 ring-slate-200"><img src={img} alt="preview" className="h-full w-full object-cover" /></div>))}</div>
                    )}
                  </div>
                  <button disabled={submittingFeedback} onClick={submitFeedback} className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold px-4 py-2.5 hover:bg-emerald-700 disabled:opacity-50">{submittingFeedback ? 'Saving...' : 'Submit Review'}</button>
                </div>
              </div>
            </div>
          </div>
          )}
        </div>
      </div>
    </div>
  );

  // Use portal to ensure modal escapes any parent stacking / clipping contexts
  if (typeof document !== 'undefined') {
    return createPortal(modalBody, document.body);
  }
  return modalBody;
};

// Helper icon (fallback if not found in existing imports)
const FaStorefrontIcon = (props) => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
    className={`h-4 w-4 text-emerald-500 ${props.className || ''}`}
    fill="currentColor"
  >
    <path d="M4 4h16l1 5H3l1-5Zm0 7h16v9a1 1 0 0 1-1 1h-5v-5H10v5H5a1 1 0 0 1-1-1v-9Z" />
  </svg>
);

export default ProductModal;
