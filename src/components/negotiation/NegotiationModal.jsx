import React, { useState, useEffect } from 'react';
import negotiationService from '../../services/negotiationService';
import NegotiationStatusBadge from './NegotiationStatusBadge';
import VerificationNotice from '../common/VerificationNotice';

const NegotiationModal = ({ 
  negotiation, 
  currentUser, 
  currentRole,
  onClose, 
  onUpdate,
  onRemove 
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [counterOffer, setCounterOffer] = useState({
    price: '',
    quantity: '',
    message: ''
  });

  // Get negotiation details
  const participantInfo = negotiationService.getParticipantInfo(negotiation, currentUser.uid);
  const lastOffer = negotiationService.getLastOffer(negotiation);
  
  // Check permissions
  const canMakeCounterOffer = negotiationService.canMakeCounterOffer(negotiation, currentUser.uid);
  const canAcceptOffer = negotiationService.canAcceptOffer(negotiation, currentUser.uid);
  const canRejectOffer = negotiationService.canRejectOffer(negotiation, currentUser.uid);

  // Initialize counter offer with last offer values
  useEffect(() => {
    if (lastOffer) {
      setCounterOffer({
        price: lastOffer.price.toString(),
        quantity: lastOffer.quantity.toString(),
        message: ''
      });
    }
  }, [lastOffer]);

  // Handle counter offer submission
  const handleCounterOffer = async () => {
    if (!canMakeCounterOffer) return;

    const price = parseFloat(counterOffer.price);
    const quantity = parseInt(counterOffer.quantity);

    if (!price || price <= 0) {
      setError('Please enter a valid price');
      return;
    }

    if (!quantity || quantity < (negotiation.productId?.minOrderQty || 1)) {
      setError(`Minimum order quantity is ${negotiation.productId?.minOrderQty || 1} ${negotiation.productId?.unitType || 'unit'}`);
      return;
    }

    try {
      setLoading(true);
      setError('');

      const offerData = {
        price: price,
        quantity: quantity,
        message: counterOffer.message.trim(),
        fromUid: currentUser.uid,
        fromRole: currentRole || (participantInfo.role === 'buyer' ? 'buyer' : 'seller')
      };

      const result = await negotiationService.makeCounterOffer(negotiation._id, offerData);
      onUpdate(result.negotiation);
      onClose();
      alert('Counter offer sent successfully!');
    } catch (error) {
      console.error('Error making counter offer:', error);
      setError(error.message || 'Failed to send counter offer');
    } finally {
      setLoading(false);
    }
  };

  // Handle accept offer
  const handleAccept = async () => {
    if (!canAcceptOffer) return;
    
    try {
      setLoading(true);
      const result = await negotiationService.acceptOffer(negotiation._id, currentUser.uid);
      onUpdate(result.negotiation);
      onClose();
      alert('Offer accepted successfully!');
    } catch (error) {
      console.error('Error accepting offer:', error);
      setError(error.message || 'Failed to accept offer');
    } finally {
      setLoading(false);
    }
  };

  // Handle reject offer
  const handleReject = async () => {
    if (!canRejectOffer) return;
    
    if (!confirm('Are you sure you want to reject this offer?')) return;
    
    try {
      setLoading(true);
      const result = await negotiationService.rejectOffer(negotiation._id, currentUser.uid);
      onUpdate(result.negotiation);
      onClose();
      alert('Offer rejected');
    } catch (error) {
      console.error('Error rejecting offer:', error);
      setError(error.message || 'Failed to reject offer');
    } finally {
      setLoading(false);
    }
  };

  // Handle cancel negotiation
  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this negotiation?')) return;
    
    try {
      setLoading(true);
      await negotiationService.cancelNegotiation(negotiation._id, currentUser.uid);
      onRemove(negotiation._id);
      onClose();
      alert('Negotiation cancelled');
    } catch (error) {
      console.error('Error cancelling negotiation:', error);
      setError(error.message || 'Failed to cancel negotiation');
    } finally {
      setLoading(false);
    }
  };

  // Calculate totals
  const calculateTotal = () => {
    const price = parseFloat(counterOffer.price || 0);
    const quantity = parseInt(counterOffer.quantity || 1);
    return (price * quantity).toFixed(2);
  };

  // Get original price
  const getOriginalPrice = () => {
    if (negotiation.productId?.offerPrice && negotiation.productId.offerPrice > 0) {
      return negotiation.productId.offerPrice;
    }
    return negotiation.productId?.unitPrice || 0;
  };

  const originalPrice = getOriginalPrice();
  const timeRemaining = negotiationService.formatTimeRemaining(negotiation.expiresAt);
  const statusColor = negotiationService.getStatusColor(negotiation.status);

  // Debug logging
  console.log('Negotiation data:', {
    proposedPrice: negotiation.proposedPrice,
    currentPrice: negotiation.currentPrice,
    quantity: negotiation.quantity,
    offers: negotiation.offers,
    offersLength: negotiation.offers?.length
  });

  return (
    <div className="fixed inset-0 z-50 flex items-start md:items-center justify-center bg-slate-900/40 backdrop-blur-sm p-3 overflow-y-auto" onClick={onClose}>
      <div className="w-full max-w-5xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60">
          <h3 className="text-base font-semibold text-slate-800 tracking-tight">Negotiation Details</h3>
          <button onClick={onClose} className="h-8 w-8 inline-flex items-center justify-center rounded-md text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition">✕</button>
        </div>

        <div className="px-6 pt-4">
          {/* Optional Verification Notice (pass status prop if available) */}
          {currentUser?.verification?.status && ['required','pending','rejected'].includes(currentUser.verification.status) && (
            <VerificationNotice
              status={currentUser.verification.status}
              onAction={() => window.location.href='/account/verification'}
              onDetails={() => window.location.href='/account/verification'}
            />
          )}
        </div>

        <div className="flex flex-col lg:flex-row gap-6 px-6 pb-6">
          {/* Left: History */}
          <div className="flex-1 min-w-[300px] space-y-5">
            <div className="flex gap-4 rounded-xl border border-slate-200 p-4 bg-white shadow-sm">
              <img src={negotiation.productId?.images?.[0] || '/placeholder-product.jpg'} alt={negotiation.productId?.name || 'Product'} className="w-20 h-20 object-cover rounded-lg border border-slate-200" />
              <div className="flex flex-col gap-1 flex-1">
                <h4 className="text-slate-800 font-semibold leading-snug">{negotiation.productId?.name || 'Unknown Product'}</h4>
                <p className="text-xs text-slate-500">Original Price: <span className="text-slate-700 font-medium">৳{originalPrice}</span></p>
                <p className="text-xs text-slate-500">{participantInfo.role === 'buyer' ? 'Buying from:' : 'Selling to:'} <span className="text-slate-700 font-medium">{participantInfo.role === 'buyer' ? (negotiation.seller?.businessName || 'Vendor') : (negotiation.buyer?.businessName || negotiation.buyer?.name || 'Buyer')}</span></p>
                <div className="flex items-center gap-2 flex-wrap mt-1">
                  <NegotiationStatusBadge status={negotiation.status} label={negotiationService.getStatusText(negotiation.status)} />
                  {negotiation.status === 'active' && (
                    <span className="text-[11px] font-medium text-slate-500">{timeRemaining}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-slate-700 tracking-wide">Offer History</h4>
              <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1 custom-scroll">
                {/* Original Listing */}
                <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-slate-700">{negotiation.seller?.businessName || 'Vendor'}</span>
                    <span className="text-slate-500">Original Listing</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-slate-600 font-medium">
                    <span>৳{originalPrice} × {negotiation.quantity}</span>
                    <span className="text-slate-800">= ৳{(originalPrice * negotiation.quantity).toFixed(2)}</span>
                  </div>
                </div>

                {/* Initial Offer */}
                <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-slate-700">{negotiation.buyerUid === currentUser.uid ? 'You' : (negotiation.buyer?.businessName || negotiation.buyer?.name || 'Buyer')}</span>
                    <span className="text-slate-500">{new Date(negotiation.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-slate-600 font-medium">
                    <span>৳{negotiation.currentPrice || negotiation.proposedPrice || 0} × {negotiation.quantity || 0}</span>
                    <span className="text-slate-800">= ৳{((negotiation.currentPrice || negotiation.proposedPrice || 0) * (negotiation.quantity || 0)).toFixed(2)}</span>
                  </div>
                  {negotiation.message && <div className="mt-2 text-slate-600 leading-relaxed">{negotiation.message}</div>}
                </div>

                {/* Counter Offers */}
                {negotiation.offers && negotiation.offers.length > 0 && negotiation.offers.filter(o => o && o.price && !isNaN(o.price) && o.quantity && !isNaN(o.quantity) && o.fromUid && o.createdAt).map((offer, idx) => (
                  <div key={idx} className="rounded-lg border border-slate-200 bg-white p-3 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-slate-700">{offer.fromUid === currentUser.uid ? 'You' : (offer.fromUid === negotiation.buyerUid ? (negotiation.buyer?.businessName || negotiation.buyer?.name || 'Buyer') : (negotiation.seller?.businessName || 'Vendor'))}</span>
                      <span className="text-slate-500">{new Date(offer.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-slate-600 font-medium">
                      <span>৳{offer.price} × {offer.quantity}</span>
                      <span className="text-slate-800">= ৳{(offer.price * offer.quantity).toFixed(2)}</span>
                    </div>
                    {offer.message && <div className="mt-2 text-slate-600 leading-relaxed">{offer.message}</div>}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Form / Summary */}
          <div className="w-full lg:w-80 flex flex-col gap-5">
            {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700 font-medium">{error}</div>}

            {canMakeCounterOffer ? (
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4">
                <h4 className="text-sm font-semibold text-slate-700 mb-3">Make Counter Offer</h4>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-slate-500">Price (৳)</label>
                    <input type="number" value={counterOffer.price} onChange={(e)=>setCounterOffer(p=>({...p,price:e.target.value}))} min="1" step="0.01" className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-slate-500">Quantity (Min: {negotiation.productId?.minOrderQty || 1} {negotiation.productId?.unitType || 'unit'})</label>
                    <input type="number" value={counterOffer.quantity} onChange={(e)=>{const nq=parseInt(e.target.value)|| (negotiation.productId?.minOrderQty||1);setCounterOffer(pr=>({...pr,quantity:Math.max(nq,negotiation.productId?.minOrderQty||1).toString()}));}} min={negotiation.productId?.minOrderQty||1} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-slate-500">Message (Optional)</label>
                    <textarea value={counterOffer.message} onChange={(e)=>setCounterOffer(p=>({...p,message:e.target.value}))} placeholder="Add a message to support your counter offer..." rows={4} maxLength={500} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 resize-none" />
                    <div className="text-[10px] text-slate-400 text-right">{counterOffer.message.length}/500</div>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] font-medium text-slate-500">Total</span>
                    <span className="text-sm font-semibold text-slate-800">৳{calculateTotal()}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 text-xs space-y-3">
                <h4 className="text-sm font-semibold text-slate-700">Negotiation Summary</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between"><span className="text-slate-500">Current Status</span><NegotiationStatusBadge status={negotiation.status} label={negotiationService.getStatusText(negotiation.status)} /></div>
                  <div className="flex items-center justify-between"><span className="text-slate-500">Original Price</span><span className="font-medium text-slate-700">৳{originalPrice}</span></div>
                  {lastOffer && (<>
                    <div className="flex items-center justify-between"><span className="text-slate-500">Current Offer</span><span className="font-medium text-slate-700">৳{lastOffer.price}</span></div>
                    <div className="flex items-center justify-between"><span className="text-slate-500">Quantity</span><span className="font-medium text-slate-700">{lastOffer.quantity} {negotiation.productId?.unitType || 'unit'}</span></div>
                    <div className="flex items-center justify-between"><span className="text-slate-500">Total</span><span className="font-semibold text-slate-800">৳{(lastOffer.price * lastOffer.quantity).toFixed(2)}</span></div>
                  </>)}
                </div>
              </div>
            )}

            {/* Footer action buttons */}
            <div className="mt-auto flex flex-wrap gap-2 pt-2">
              <button onClick={onClose} disabled={loading} className="inline-flex items-center justify-center rounded-md bg-slate-600 hover:bg-slate-700 text-white text-xs font-semibold px-4 py-2 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed">Close</button>
              {negotiation.status === 'active' && (
                <>
                  {canMakeCounterOffer && (
                    <button onClick={handleCounterOffer} disabled={loading || !counterOffer.price || !counterOffer.quantity} className="inline-flex items-center justify-center rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed">Send Counter Offer</button>
                  )}
                  {canAcceptOffer && (
                    <button onClick={handleAccept} disabled={loading} className="inline-flex items-center justify-center rounded-md bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-3 py-2 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed">✓ Accept</button>
                  )}
                  {canRejectOffer && (
                    <button onClick={handleReject} disabled={loading} className="inline-flex items-center justify-center rounded-md bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-3 py-2 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed">✗ Reject</button>
                  )}
                  <button onClick={handleCancel} disabled={loading} className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-600 text-xs font-semibold px-3 py-2 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed">Cancel</button>
                </>
              )}
              {negotiation.status === 'accepted' && negotiation.buyerUid === currentUser.uid && !negotiation.__ord && (
                <>
                  <button onClick={async()=>{ if(!confirm('Place COD order for this negotiated price?')) return; try{ setLoading(true); const result= await negotiationService.checkoutNegotiation(negotiation._id,{ paymentMethod:'cod' }); alert('COD order placed: '+ result.orderNumber);} catch(e){ setError(e.message||'Failed to place order'); } finally { setLoading(false);} }} disabled={loading} className="inline-flex items-center justify-center rounded-md bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-4 py-2 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed">Place COD Order</button>
                  <button onClick={async()=>{ try{ setLoading(true); const result = await negotiationService.checkoutNegotiation(negotiation._id,{ paymentMethod:'card' }); if(result.gateway_url){ window.location.href=result.gateway_url;} else { setError('Failed to initiate payment'); } } catch(e){ setError(e.message||'Failed to start payment'); } finally { setLoading(false);} }} disabled={loading} className="inline-flex items-center justify-center rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed">Pay Online</button>
                </>
              )}
              {negotiation.status === 'accepted' && negotiation.__ord && (
                <span className="inline-flex items-center rounded-md bg-emerald-100 text-emerald-700 px-3 py-1 text-[10px] font-semibold border border-emerald-300">Order Created{negotiation.__ord.orderNumber ? ` #${negotiation.__ord.orderNumber}` : ''}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NegotiationModal;
