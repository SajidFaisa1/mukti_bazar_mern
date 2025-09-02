import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import negotiationService from '../../services/negotiationService';
import NegotiationModal from './NegotiationModal';
import NegotiationStatusBadge from './NegotiationStatusBadge';

const NegotiationCard = ({ 
  negotiation, 
  currentUser, 
  currentRole,
  onUpdate,
  onRemove 
}) => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Get participant info
  const participantInfo = negotiationService.getParticipantInfo(negotiation, currentUser.uid);
  const lastOffer = negotiationService.getLastOffer(negotiation);
  
  // Debug log to verify participant info
  console.log('Negotiation Card - Participant Info:', {
    currentUserUid: currentUser.uid,
    buyerUid: negotiation.buyerUid,
    sellerUid: negotiation.sellerUid,
    participantRole: participantInfo.role,
    isCurrentUserBuyer: negotiation.buyerUid === currentUser.uid
  });
  
  // Determine verification status (client only typically) and gate actions
  const verificationStatus = currentUser?.verification?.status;
  const verificationBlocked = ['required','pending','rejected'].includes(verificationStatus || '');

  // Check permissions (still compute, we'll gate later)
  const canMakeCounterOffer = negotiationService.canMakeCounterOffer(negotiation, currentUser.uid);
  const canAcceptOffer = negotiationService.canAcceptOffer(negotiation, currentUser.uid);
  const canRejectOffer = negotiationService.canRejectOffer(negotiation, currentUser.uid);

  // Handle quick actions
  const handleQuickAccept = async () => {
    if (!canAcceptOffer || verificationBlocked) return;
    try {
      setLoading(true);
      setError('');
      const result = await negotiationService.acceptOffer(negotiation._id, currentUser.uid);
      onUpdate(result.negotiation);
    } catch (error) {
      console.error('Error accepting offer:', error);
      setError(error.message || 'Failed to accept offer');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickReject = async () => {
    if (!canRejectOffer || verificationBlocked) return;
    
    if (!confirm('Are you sure you want to reject this offer?')) return;
    
    try {
      setLoading(true);
      setError('');
      const result = await negotiationService.rejectOffer(negotiation._id, currentUser.uid);
      onUpdate(result.negotiation);
    } catch (error) {
      console.error('Error rejecting offer:', error);
      setError(error.message || 'Failed to reject offer');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this negotiation?')) return;
    
    try {
      setLoading(true);
      setError('');
      await negotiationService.cancelNegotiation(negotiation._id, currentUser.uid);
      onRemove(negotiation._id);
    } catch (error) {
      console.error('Error cancelling negotiation:', error);
      setError(error.message || 'Failed to cancel negotiation');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenMessages = () => {
    if (negotiation.conversationId) {
      navigate(`/messages?conversation=${negotiation.conversationId}`);
    }
  };

  // Delivery selection state
  const [addresses, setAddresses] = useState([]);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [addressError, setAddressError] = useState('');
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [deliveryMethods, setDeliveryMethods] = useState([]);
  const [deliveryLoading, setDeliveryLoading] = useState(false);
  const [selectedDeliveryMethod, setSelectedDeliveryMethod] = useState('');
  const [deliveryFeeInfo, setDeliveryFeeInfo] = useState(null);
  const [negotiatedFee, setNegotiatedFee] = useState('');

  useEffect(()=>{
    if (negotiation.status === 'accepted' && negotiation.buyerUid === currentUser.uid && !negotiation.__ord) {
      const load = async () => {
        try {
          setAddressesLoading(true); setAddressError('');
          const list = await negotiationService.getAddresses();
            setAddresses(list);
            const def = list.find(a=>a.isDefault) || list[0];
            if (def) setSelectedAddressId(def._id);
          // load delivery methods
          setDeliveryLoading(true);
          try {
            const dm = await negotiationService.getNegotiationDeliveryMethods(negotiation._id);
            setDeliveryMethods(dm.deliveryMethods || []);
            setSelectedDeliveryMethod(dm.recommendedMethod || (dm.deliveryMethods?.[0]?.id)||'');
            if (dm.recommendedMethod || dm.deliveryMethods?.length) {
              const fee = await negotiationService.calculateNegotiationDelivery(negotiation._id, dm.recommendedMethod || dm.deliveryMethods[0].id, 0);
              setDeliveryFeeInfo(fee);
            }
          } catch (delErr) {
            console.warn('Delivery methods load failed', delErr);
          } finally { setDeliveryLoading(false); }
        } catch(e){ setAddressError(e.message||'Failed to load addresses'); }
        finally { setAddressesLoading(false); }
      };
      load();
    }
  },[negotiation.status, negotiation.buyerUid, currentUser.uid, negotiation.__ord]);

  const handleSelectDeliveryMethod = async (methodId) => {
    if (methodId === selectedDeliveryMethod) return;
    setSelectedDeliveryMethod(methodId);
    setDeliveryFeeInfo(null);
    try {
      const fee = await negotiationService.calculateNegotiationDelivery(negotiation._id, methodId, methodId==='negotiated' ? Number(negotiatedFee)||0 : 0);
      setDeliveryFeeInfo(fee);
    } catch(e){ setError(e.message||'Failed to calculate delivery fee'); }
  };

  const handleNegFeeBlur = async () => {
    if (selectedDeliveryMethod !== 'negotiated') return;
    try {
      const fee = await negotiationService.calculateNegotiationDelivery(negotiation._id, 'negotiated', Number(negotiatedFee)||0);
      setDeliveryFeeInfo(fee);
    } catch(e){ setError(e.message||'Failed to calculate negotiated fee'); }
  };

  // Calculate price comparison
  const originalPrice = negotiation.productId?.offerPrice && negotiation.productId.offerPrice > 0 
    ? negotiation.productId.offerPrice 
    : negotiation.productId?.unitPrice || 0;
  
  const currentPrice = lastOffer ? lastOffer.price : negotiation.proposedPrice;
  const savings = negotiationService.calculateSavings(originalPrice, currentPrice);

  // Get status styling
  const statusColor = negotiationService.getStatusColor(negotiation.status);
  const timeRemaining = negotiationService.formatTimeRemaining(negotiation.expiresAt);
  const isNearExpiry = negotiationService.isNearExpiry(negotiation.expiresAt);

  return (
    <>
      <div
        className={`relative group bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden ${
          negotiation.status === 'active'
            ? 'border-l-4 border-l-blue-500'
            : negotiation.status === 'accepted'
            ? 'border-l-4 border-l-green-500'
            : negotiation.status === 'rejected'
            ? 'border-l-4 border-l-red-500'
            : negotiation.status === 'expired'
            ? 'border-l-4 border-l-amber-500'
            : negotiation.status === 'cancelled'
            ? 'border-l-4 border-l-slate-400'
            : ''
        }`}
      >
        {/* Header */}
  <div className="p-5 pb-4 flex flex-col md:flex-row md:items-start md:justify-between gap-4 border-b border-slate-100">
          <div className="flex gap-4 w-full">
            <img
              src={negotiation.productId?.images?.[0] || '/placeholder-product.jpg'}
              alt={negotiation.productId?.name || 'Product'}
              className="w-16 h-16 rounded-xl object-cover border-2 border-slate-100 flex-shrink-0"
            />
            <div className="flex flex-col flex-1">
              <h4 className="text-slate-800 font-semibold text-base leading-snug mb-1">
                {negotiation.productId?.name || 'Unknown Product'}
              </h4>
              <p className="text-slate-500 text-xs font-medium">
                {participantInfo.role === 'buyer' ? 'Buying from: ' : 'Selling to: '}
                <span className="text-slate-700">{participantInfo.otherParticipant.name}</span>
              </p>
            </div>
          </div>
          <div className="self-start flex flex-col items-end gap-1">
            <NegotiationStatusBadge
              status={negotiation.status}
              label={negotiationService.getStatusText(negotiation.status)}
            />
            {negotiation.__ord && (
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide border shadow-sm ${negotiation.__ord.paymentMethod==='cod' ? 'bg-amber-100 border-amber-300 text-amber-800' : 'bg-emerald-100 border-emerald-300 text-emerald-700'}`}>
                {negotiation.__ord.paymentMethod==='cod' ? 'COD Order' : (negotiation.__ord.isPaid ? 'Paid' : 'Payment Pending')}
              </span>
            )}
          </div>
        </div>

        {/* Price Information */}
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 text-sm">
          <div className="flex justify-between mb-1"><span className="text-slate-500 font-medium">Original Price:</span><span className="text-slate-800 font-semibold">৳{originalPrice.toFixed(2)}</span></div>
          <div className="flex justify-between mb-1"><span className="text-slate-500 font-medium">Original Total:</span><span className="text-slate-800 font-semibold">৳{(originalPrice * (lastOffer ? lastOffer.quantity : negotiation.quantity)).toFixed(2)}</span></div>
          <div className="flex justify-between mb-1"><span className="text-slate-500 font-medium">Current Offer:</span><span className="text-blue-600 font-semibold text-base">৳{currentPrice.toFixed(2)}</span></div>
          <div className="flex justify-between mb-1"><span className="text-slate-500 font-medium">Quantity:</span><span className="text-slate-800 font-semibold">{lastOffer ? lastOffer.quantity : negotiation.quantity} {negotiation.productId?.unitType || 'unit'}</span></div>
          <div className="flex justify-between mt-2 pt-2 border-t border-slate-300"><span className="text-slate-600 font-semibold">Offer Total:</span><span className="text-slate-800 font-bold">৳{(currentPrice * (lastOffer ? lastOffer.quantity : negotiation.quantity)).toFixed(2)}</span></div>
          {savings.amount !== 0 && (
            <div
              className={`mt-2 rounded-md px-3 py-2 text-center text-xs font-semibold flex items-center justify-center gap-1 ${
                savings.isDiscount
                  ? participantInfo.role === 'buyer'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-600'
                  : participantInfo.role === 'buyer'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-emerald-100 text-emerald-700'
              }`}
            >
              {participantInfo.role === 'buyer' ? (
                savings.isDiscount ? (
                  <span>💰 Potential Savings: ৳{savings.amount.toFixed(2)} ({savings.percentage}%)</span>
                ) : (
                  <span>📈 Premium Offer: ৳{Math.abs(savings.amount).toFixed(2)} (+{Math.abs(savings.percentage)}%)</span>
                )
              ) : savings.isDiscount ? (
                <span>📉 Potential Loss: ৳{savings.amount.toFixed(2)} ({savings.percentage}%)</span>
              ) : (
                <span>💰 Premium Gained: ৳{Math.abs(savings.amount).toFixed(2)} (+{Math.abs(savings.percentage)}%)</span>
              )}
            </div>
          )}
        </div>

        {/* Timeline */}
        <div className="px-5 py-4 border-b border-slate-100 text-xs">
          <div className="flex justify-between mb-1"><span className="text-slate-500 font-medium">Started:</span><span className="text-slate-700 font-semibold">{new Date(negotiation.createdAt).toLocaleDateString()}</span></div>
          {negotiation.status === 'active' && (
            <div className={`flex justify-between mb-1 ${isNearExpiry ? 'text-red-600 font-semibold' : ''}`}>
              <span className="text-slate-500 font-medium">Expires:</span>
              <span className="font-semibold">{timeRemaining}</span>
            </div>
          )}
          {negotiation.offers && negotiation.offers.length > 1 && (
            <div className="flex justify-between"><span className="text-slate-500 font-medium">Offers:</span><span className="text-slate-700 font-semibold">{negotiation.offers.length}</span></div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="p-5 flex flex-col gap-3">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700 font-medium flex items-start justify-between gap-3">
              <span className="leading-relaxed">{error}</span>
              <button onClick={()=>setError('')} className="text-red-500 hover:text-red-700 text-xs font-semibold">✕</button>
            </div>
          )}
          {verificationBlocked && (
            <div className="rounded-lg border border-amber-300 bg-amber-50/70 px-4 py-2.5 text-[11px] text-amber-800 font-medium leading-relaxed">
              {verificationStatus === 'required' && 'Account verification required before you can act on negotiations.'}
              {verificationStatus === 'pending' && 'Your verification is under review. Actions are temporarily disabled.'}
              {verificationStatus === 'rejected' && 'Verification rejected. Please resubmit documents to continue.'}
              <div className="mt-1 flex flex-wrap gap-2">
                <button onClick={()=>window.location.href='/account/verification'} className="inline-flex items-center justify-center rounded-md bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-semibold px-2.5 py-1.5 shadow-sm">{verificationStatus==='rejected'?'Resubmit':'Verify Now'}</button>
                <button onClick={()=>window.location.href='/account/verification'} className="inline-flex items-center justify-center rounded-md border border-amber-400 text-amber-700 bg-white/60 hover:bg-white text-[10px] font-semibold px-2.5 py-1.5">Details</button>
              </div>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
          {negotiation.status === 'active' && (
            <>
              <button
                className="inline-flex items-center justify-center gap-1 rounded-md bg-blue-600 text-white px-4 py-2 text-xs font-semibold shadow-sm hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
                onClick={() => !verificationBlocked && setIsModalOpen(true)}
                disabled={loading || verificationBlocked}
              >
                {canMakeCounterOffer ? 'Counter Offer' : 'View Details'}
              </button>
              {canAcceptOffer && (
                <button
                  className="inline-flex items-center justify-center gap-1 rounded-md bg-green-600 text-white px-3 py-2 text-xs font-semibold shadow-sm hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
                  onClick={handleQuickAccept}
                  disabled={loading || verificationBlocked}
                >
                  ✓ Accept
                </button>
              )}
              {canRejectOffer && (
                <button
                  className="inline-flex items-center justify-center gap-1 rounded-md bg-red-600 text-white px-3 py-2 text-xs font-semibold shadow-sm hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
                  onClick={handleQuickReject}
                  disabled={loading || verificationBlocked}
                >
                  ✗ Reject
                </button>
              )}
              <button
                className="inline-flex items-center justify-center gap-1 rounded-md bg-slate-600 text-white px-3 py-2 text-xs font-semibold shadow-sm hover:bg-slate-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
                onClick={handleCancel}
                disabled={loading || verificationBlocked}
              >
                Cancel
              </button>
            </>
          )}

      {negotiation.status !== 'active' && (
            <button
              className="inline-flex items-center justify-center gap-1 rounded-md border border-blue-500 text-blue-600 px-4 py-2 text-xs font-semibold hover:bg-blue-500 hover:text-white transition disabled:opacity-60 disabled:cursor-not-allowed"
        onClick={() => !verificationBlocked && setIsModalOpen(true)}
        disabled={loading || verificationBlocked}
            >
              View Details
            </button>
          )}

          {negotiation.status === 'accepted' && negotiation.buyerUid === currentUser.uid && !negotiation.__ord && (
            <>
              <div className="w-full rounded-lg border border-slate-200 bg-slate-50/60 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="text-[11px] font-semibold text-slate-600 tracking-wide">Delivery & Address</h5>
                  <button onClick={()=>window.location.href='settings/address-book'} className="text-[10px] font-medium text-blue-600 hover:underline">Manage</button>
                </div>
                {addressError && <div className="text-[10px] text-red-600">{addressError}</div>}
                {addressesLoading ? (
                  <div className="text-[11px] text-slate-500">Loading addresses...</div>
                ) : addresses.length === 0 ? (
                  <div className="text-[11px] text-amber-600">No address found. Add one first.</div>
                ) : (
                  <select value={selectedAddressId} onChange={e=>setSelectedAddressId(e.target.value)} className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] focus:outline-none focus:ring-2 focus:ring-emerald-500/40">
                    {addresses.map(a => <option key={a._id} value={a._id}>{(a.label||a.name)} • {a.city}</option>)}
                  </select>
                )}
                {/* Delivery Methods */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-medium text-slate-500">Delivery Method</label>
                  {deliveryLoading ? (
                    <div className="text-[11px] text-slate-500">Loading delivery methods...</div>
                  ) : deliveryMethods.length === 0 ? (
                    <div className="text-[11px] text-amber-600">No delivery methods available</div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {deliveryMethods.map(m => (
                        <button key={m.id} type="button" onClick={()=>handleSelectDeliveryMethod(m.id)} className={`rounded-md border px-2 py-1.5 text-[10px] font-medium flex flex-col gap-0.5 text-left transition ${selectedDeliveryMethod===m.id ? 'border-emerald-500 bg-white shadow-sm ring-2 ring-emerald-200' : 'border-slate-300 bg-white hover:border-slate-400'}`}>
                          <span className="flex items-center gap-1"><span>{m.icon||'🚚'}</span>{m.name}</span>
                          <span className="text-[9px] text-slate-500 font-normal truncate">{m.fee ? `৳${m.fee}` : (m.id==='negotiated'?'Set fee':'' )}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {selectedDeliveryMethod === 'negotiated' && (
                    <div className="flex items-center gap-2">
                      <input type="number" min="0" value={negotiatedFee} onChange={e=>setNegotiatedFee(e.target.value)} onBlur={handleNegFeeBlur} placeholder="Negotiated Fee" className="w-28 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] focus:outline-none focus:ring-2 focus:ring-emerald-500/40" />
                      <button type="button" onClick={handleNegFeeBlur} className="text-[10px] px-2 py-1.5 rounded-md bg-emerald-600 text-white font-semibold hover:bg-emerald-700">Apply</button>
                    </div>
                  )}
                  {deliveryFeeInfo && (
                    <div className="text-[10px] text-slate-600 bg-white border border-slate-200 rounded-md px-2 py-1.5 flex flex-wrap gap-2 items-center">
                      <span className="font-semibold">Fee: ৳{deliveryFeeInfo.deliveryFee}</span>
                      <span className="text-slate-400">Method: {deliveryFeeInfo.deliveryMethod}</span>
                      {deliveryFeeInfo.estimatedDays && <span className="text-slate-400">ETA: {deliveryFeeInfo.estimatedDays}d</span>}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-medium text-slate-500 mb-1">Delivery Notes</label>
                    <input value={deliveryNotes} onChange={e=>setDeliveryNotes(e.target.value)} maxLength={120} placeholder="Optional notes" className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] focus:outline-none focus:ring-2 focus:ring-emerald-500/40" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-slate-500 mb-1">Special Instructions</label>
                    <textarea value={specialInstructions} onChange={e=>setSpecialInstructions(e.target.value)} rows={2} maxLength={200} placeholder="e.g. Call before arrival" className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/40" />
                  </div>
                </div>
              </div>
              <button
                className="inline-flex items-center justify-center gap-1 rounded-md bg-green-600 text-white px-4 py-2 text-xs font-semibold shadow-sm hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
                disabled={loading || verificationBlocked || addressesLoading || !selectedAddressId || !selectedDeliveryMethod}
                onClick={async () => {
                  if (verificationBlocked) return;
                  if (!selectedAddressId){ setError('Select an address first'); return; }
                  if (!selectedDeliveryMethod){ setError('Select a delivery method'); return; }
                  if (!confirm('Place COD order for this negotiated price?')) return;
                  try {
                    setLoading(true);
                    const result = await negotiationService.checkoutNegotiation(negotiation._id, { paymentMethod: 'cod', addressId: selectedAddressId, notes: deliveryNotes, specialInstructions, deliveryMethod: selectedDeliveryMethod, negotiatedFee: selectedDeliveryMethod==='negotiated'? Number(negotiatedFee)||0 : undefined, deliveryNotes });
                  } catch (e) {
                    console.error(e);
                    setError(e.message || 'Failed to place COD order');
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                COD Order
              </button>
              <button
                className="inline-flex items-center justify-center gap-1 rounded-md bg-blue-600 text-white px-4 py-2 text-xs font-semibold shadow-sm hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
                disabled={loading || verificationBlocked || addressesLoading || !selectedAddressId || !selectedDeliveryMethod}
                onClick={async () => {
                  if (verificationBlocked) return;
                  if (!selectedAddressId){ setError('Select an address first'); return; }
                  if (!selectedDeliveryMethod){ setError('Select a delivery method'); return; }
                  try {
                    setLoading(true);
                    const result = await negotiationService.checkoutNegotiation(negotiation._id, { paymentMethod: 'card', addressId: selectedAddressId, notes: deliveryNotes, specialInstructions, deliveryMethod: selectedDeliveryMethod, negotiatedFee: selectedDeliveryMethod==='negotiated'? Number(negotiatedFee)||0 : undefined, deliveryNotes });
                    if (result.gateway_url) {
                      window.location.href = result.gateway_url;
                    } else {
                      console.warn('Payment initiation failed');
                      setError('Failed to initiate payment');
                    }
                  } catch (e) {
                    console.error(e);
                    setError(e.message || 'Failed to start payment');
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                Pay Now
              </button>
            </>
          )}

          {negotiation.__ord && negotiation.status === 'accepted' && (
            <span className="inline-flex items-center rounded-md bg-emerald-100 text-emerald-700 px-3 py-1 text-[10px] font-semibold border border-emerald-300">Order #{negotiation.__ord.orderNumber || negotiation.__ord.orderId?.slice(-6)}</span>
          )}
          {negotiation.conversationId && (
            <button
              className="inline-flex items-center justify-center gap-1 rounded-md border border-slate-300 text-slate-600 px-4 py-2 text-xs font-semibold hover:bg-slate-100 transition disabled:opacity-60 disabled:cursor-not-allowed"
              onClick={handleOpenMessages}
              disabled={loading}
            >
              💬 Messages
            </button>
          )}
          </div>
        </div>

        {/* Last Activity */}
        {lastOffer && lastOffer.message && (
          <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 text-[11px] leading-relaxed text-slate-600">
            <p className="m-0">
              <span className="font-semibold text-slate-700">Last message:</span>{' '}
              {lastOffer.message.substring(0, 100)}
              {lastOffer.message.length > 100 ? '…' : ''}
            </p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <NegotiationModal
          negotiation={negotiation}
          currentUser={currentUser}
          currentRole={currentRole}
          onClose={() => setIsModalOpen(false)}
          onUpdate={onUpdate}
          onRemove={onRemove}
        />
      )}
    </>
  );
};

export default NegotiationCard;
