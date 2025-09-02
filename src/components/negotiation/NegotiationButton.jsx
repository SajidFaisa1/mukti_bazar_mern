import React, { useState } from 'react';
import { useVendorAuth } from '../../contexts/VendorAuthContext';
import { useClientAuth } from '../../contexts/ClientAuthContext';
import negotiationService from '../../services/negotiationService';
import messagingService from '../../services/messagingService';
import VerificationNotice from '../common/VerificationNotice';


const NegotiationButton = ({ 
  product, 
  vendor, 
  onNegotiationStarted = null,
  disabled = false,
  className = '' 
}) => {
  const { user: vendorUser } = useVendorAuth();
  const { user: clientUser } = useClientAuth();
  
  const currentUser = vendorUser || clientUser;
  const currentRole = vendorUser ? 'vendor' : 'client';
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [proposedPrice, setProposedPrice] = useState(getOriginalPrice());
  const [quantity, setQuantity] = useState(product?.minOrderQty || 1);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Helper function to get the original price based on product pricing logic
  function getOriginalPrice() {
    if (!product) return 0;
    
    // If offerPrice exists and is greater than 0, use offerPrice as original
    // Otherwise, use unitPrice as original
    if (product.offerPrice && product.offerPrice > 0) {
      return product.offerPrice;
    }
    return product.unitPrice || 0;
  }

  const verificationStatus = currentUser?.verification?.status;
  const verificationBlocked = ['required','pending','rejected'].includes(verificationStatus || '');

  // Don't show button if user not logged in or vendor viewing own product
  if (!currentUser || currentUser.uid === vendor?.uid) return null;

  const handleStartNegotiation = async () => {
    if (!proposedPrice || proposedPrice <= 0) {
      setError('Please enter a valid price');
      return;
    }

    if (!quantity || quantity < (product?.minOrderQty || 1)) {
      setError(`Minimum order quantity is ${product?.minOrderQty || 1} ${product?.unitType || 'unit'}`);
      return;
    }

    try {
      setLoading(true);
      setError('');

      // First, ensure there's a conversation between the user and vendor
      let conversationId = null;
      try {
        const conversation = await messagingService.findOrCreateConversation(
          currentUser.uid,
          currentRole,
          vendor.uid,
          'vendor',
          {
            productId: product._id,
            productName: product.name,
            productPrice: product.price,
            productImage: product.images?.[0],
            vendorStoreId: vendor.storeId
          }
        );
        conversationId = conversation._id;
      } catch (conversationError) {
        console.error('Error creating conversation:', conversationError);
        // Continue without conversation if it fails
      }

      // Start negotiation
      const negotiationData = {
        buyerUid: currentUser.uid,
        buyerRole: currentRole,
        sellerUid: vendor.uid,
        productId: product._id,
        proposedPrice: parseFloat(proposedPrice),
        quantity: parseInt(quantity),
        message: message.trim(),
        conversationId: conversationId
      };

      const result = await negotiationService.startNegotiation(negotiationData);

      // Close modal and reset form
      setIsModalOpen(false);
      setProposedPrice(getOriginalPrice());
      setQuantity(product?.minOrderQty || 1);
      setMessage('');

      // Notify parent component
      if (onNegotiationStarted) {
        onNegotiationStarted(result.negotiation);
      }

      // Show success message or redirect to messages
      alert('Negotiation started successfully! Check your messages for updates.');

    } catch (error) {
      console.error('Error starting negotiation:', error);
  setError('Failed to start negotiation. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = () => {
    return (parseFloat(proposedPrice || 0) * parseInt(quantity || 1)).toFixed(2);
  };

  const calculateSavings = () => {
    const originalPrice = getOriginalPrice();
    const original = originalPrice * quantity;
    const proposed = proposedPrice * quantity;
    const savings = original - proposed;
    const percentage = original > 0 ? ((savings / original) * 100).toFixed(1) : '0.0';
    
    return {
      amount: savings,
      percentage: percentage,
      isDiscount: savings > 0
    };
  };

  const savings = calculateSavings();

  return (
    <>
      <button
        className={`inline-flex items-center justify-center gap-2 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-2 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed transition ${className}`}
        onClick={() => !verificationBlocked && setIsModalOpen(true)}
        disabled={disabled || loading || verificationBlocked}
        title={verificationBlocked ? 'Verification required to negotiate' : 'Negotiate Price'}
      >💰 Negotiate Price</button>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start md:items-center justify-center bg-slate-900/40 backdrop-blur-sm p-3 overflow-y-auto" onClick={() => setIsModalOpen(false)}>
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden" onClick={(e)=>e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/60">
              <h3 className="text-sm font-semibold text-slate-800 tracking-tight">Start Price Negotiation</h3>
              <button onClick={()=>setIsModalOpen(false)} className="h-8 w-8 inline-flex items-center justify-center rounded-md text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition">✕</button>
            </div>
            <div className="px-5 pt-4 pb-5 space-y-5">
              {verificationBlocked && (
                <VerificationNotice
                  status={verificationStatus}
                  onAction={()=>window.location.href='/account/verification'}
                  onDetails={()=>window.location.href='/account/verification'}
                />
              )}
              <div className="flex gap-4">
                <img src={product.images?.[0] || '/placeholder-product.jpg'} alt={product.name} className="w-20 h-20 object-cover rounded-lg border border-slate-200" />
                <div className="flex flex-col gap-1 text-xs">
                  <h4 className="text-slate-800 font-semibold leading-snug text-sm">{product.name}</h4>
                  <p className="text-slate-500">Original Price: <span className="text-slate-700 font-medium">৳{getOriginalPrice()}</span></p>
                  <p className="text-slate-500">Seller: <span className="text-slate-700 font-medium">{vendor.businessName}</span></p>
                </div>
              </div>
              {error && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700 font-medium">{error}</div>}
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-slate-500">Your Offer Price (৳)</label>
                    <input type="number" value={proposedPrice} onChange={(e)=>setProposedPrice(e.target.value)} min="1" step="0.01" className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-slate-500">Quantity (Min: {product?.minOrderQty || 1} {product?.unitType || 'unit'})</label>
                    <div className="flex items-stretch rounded-md border border-slate-300 overflow-hidden">
                      <button type="button" onClick={()=>setQuantity(Math.max(quantity-1, product?.minOrderQty||1))} disabled={quantity <= (product?.minOrderQty||1)} className="px-3 text-sm font-semibold text-slate-600 disabled:opacity-40 hover:bg-slate-100">-</button>
                      <input type="number" value={quantity} onChange={(e)=>{ const nq=parseInt(e.target.value)|| (product?.minOrderQty||1); setQuantity(Math.max(nq, product?.minOrderQty||1)); }} min={product?.minOrderQty||1} className="w-full text-center text-sm font-medium text-slate-700 focus:outline-none" />
                      <button type="button" onClick={()=>setQuantity(quantity+1)} className="px-3 text-sm font-semibold text-slate-600 hover:bg-slate-100">+</button>
                    </div>
                    <div className="text-[10px] text-slate-400">Minimum order: {product?.minOrderQty || 1} {product?.unitType || 'unit'}</div>
                  </div>
                </div>
                <div className="space-y-1 text-xs">
                  <label className="text-[11px] font-medium text-slate-500">Message (Optional)</label>
                  <textarea value={message} onChange={(e)=>setMessage(e.target.value)} rows={3} maxLength={500} placeholder="Add a message to support your offer..." className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/40" />
                  <div className="text-[10px] text-slate-400 text-right">{message.length}/500</div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 text-xs space-y-2">
                  <div className="flex items-center justify-between"><span className="text-slate-500">Original Total</span><span className="font-semibold text-slate-700">৳{(getOriginalPrice()*quantity).toFixed(2)}</span></div>
                  <div className="flex items-center justify-between"><span className="text-slate-500">Your Offer Total</span><span className="font-semibold text-emerald-600">৳{calculateTotal()}</span></div>
                  {savings.isDiscount && (
                    <div className="flex items-center justify-between text-emerald-600 font-semibold"><span>Potential Savings</span><span>৳{savings.amount.toFixed(2)} ({savings.percentage}%)</span></div>
                  )}
                  {!savings.isDiscount && savings.amount < 0 && (
                    <div className="flex items-center justify-between text-blue-600 font-semibold"><span>Premium</span><span>৳{Math.abs(savings.amount).toFixed(2)} (+{Math.abs(savings.percentage)}%)</span></div>
                  )}
                </div>
              </div>
            </div>
            <div className="px-5 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
              <button onClick={()=>setIsModalOpen(false)} disabled={loading} className="inline-flex items-center justify-center rounded-md bg-slate-600 hover:bg-slate-700 text-white text-xs font-semibold px-4 py-2 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed">Cancel</button>
              <button onClick={handleStartNegotiation} disabled={loading || !proposedPrice || !quantity || verificationBlocked} className="inline-flex items-center justify-center rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed">{loading ? 'Starting...' : 'Start Negotiation'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default NegotiationButton;
