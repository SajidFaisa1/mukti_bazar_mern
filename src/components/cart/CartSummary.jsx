import React from 'react'
import { Package, Truck, MapPin, User, CreditCard, ArrowLeft, Shield, Save } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Skeleton } from '../ui/Skeleton'

const DeliveryOptions = React.memo(function DeliveryOptions({ deliveryMethods, selectedDeliveryMethod, handleDeliveryMethodChange, loadingDeliveryMethods, totalWeight }) {
  if (loadingDeliveryMethods) {
    return <div className="flex items-center gap-2 text-[11px] text-gray-500"><div className="h-3 w-3 rounded-full border-2 border-gray-300 border-t-emerald-600 animate-spin" /> Loading options...</div>
  }
  return (
    <ul className="space-y-2">
      {deliveryMethods.map(m => (
        <li key={m.id}>
          <button onClick={() => handleDeliveryMethodChange(m.id)} className={`w-full text-left rounded-lg border px-3 py-2.5 bg-white text-xs flex items-center gap-3 transition ${selectedDeliveryMethod === m.id ? 'border-emerald-500 ring-2 ring-emerald-200' : 'border-gray-200 hover:border-gray-300'}`}>
            <span className="text-base leading-none">{m.icon}</span>
            <span className="flex-1">
              <span className="block font-semibold text-gray-800">{m.name}</span>
              <span className="block text-[10px] text-gray-500 mt-0.5">{m.description}</span>
            </span>
            <span className="text-[11px] font-semibold text-emerald-600">{m.isNegotiated ? 'Negotiated' : `৳${m.fee}`}</span>
            <span className={`h-4 w-4 rounded-full border flex items-center justify-center ${selectedDeliveryMethod === m.id ? 'border-emerald-600' : 'border-gray-300'}`}>
              {selectedDeliveryMethod === m.id && <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />}
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
})

const NegotiatedFeeEditor = React.memo(function NegotiatedFeeEditor({ selectedDeliveryMethod, negotiatedFee, handleNegotiatedFeeChange, handleNegotiatedFeeKeyPress, handleSaveNegotiatedFee, pendingUpdates }) {
  if (selectedDeliveryMethod !== 'negotiated') return null
  return (
    <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50/70 p-3">
      <label className="flex items-center justify-between text-[11px] font-medium text-amber-800 mb-2">Negotiated Delivery Fee {pendingUpdates.needsUpdate && <span className="text-[10px] text-amber-600 italic">(unsaved)</span>}</label>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-2 flex items-center text-amber-500 text-xs">৳</span>
          <input type="number" value={negotiatedFee || ''} onChange={e => handleNegotiatedFeeChange(Number(e.target.value) || 0)} onKeyPress={handleNegotiatedFeeKeyPress} className="w-full rounded-md border border-amber-300 bg-white/80 pl-5 pr-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-300" placeholder="0.00" />
        </div>
        <button onClick={handleSaveNegotiatedFee} disabled={!pendingUpdates.needsUpdate} className="inline-flex items-center gap-1.5 rounded-md bg-amber-600 disabled:opacity-40 text-white text-[11px] font-medium px-3 py-1.5 hover:bg-amber-700">
          <Save size={12} /> Save
        </button>
      </div>
      <p className="mt-2 text-[10px] text-amber-700 leading-relaxed">Set the agreed courier fee. Press Enter or click Save.</p>
    </div>
  )
})

const AddressBlock = React.memo(function AddressBlock({ cart, loadingAddress, setIsAddressModalOpen }) {
  if (loadingAddress) return <div className="text-xs text-gray-500 italic">Loading address...</div>
  if (cart.deliveryAddress) {
    const a = cart.deliveryAddress
    return (
      <div className="relative rounded-lg border border-gray-200 bg-gray-50/80 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="text-xs text-gray-600 space-y-1">
            <p className="font-medium text-gray-800 text-sm">{a.name}</p>
            <p>{a.addressLine1}</p>
            {a.addressLine2 && <p>{a.addressLine2}</p>}
            <p>{a.city}, {a.district}</p>
            <p>{a.state} {a.zip}</p>
            <p className="flex items-center gap-1 text-emerald-600 font-medium mt-1"><User size={12} /> {a.phone}</p>
          </div>
          <button onClick={() => setIsAddressModalOpen(true)} className="text-[11px] font-medium rounded-md border border-gray-300 bg-white px-2.5 py-1 text-gray-600 hover:bg-gray-50">Change</button>
        </div>
      </div>
    )
  }
  return (
    <div className="rounded-lg border border-dashed border-gray-300 p-4 text-center">
      <p className="text-xs text-gray-500 mb-3">No delivery address selected</p>
      <button onClick={() => setIsAddressModalOpen(true)} className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-medium px-3 py-1.5">
        <MapPin size={12} /> Add Address
      </button>
    </div>
  )
})

const CartSummary = React.memo(function CartSummary({ t, cart, cartTotal, deliveryFee, loadingAddress, setIsAddressModalOpen, deliveryMethods, selectedDeliveryMethod, handleDeliveryMethodChange, loadingDeliveryMethods, totalWeight, negotiatedFee, handleNegotiatedFeeChange, handleNegotiatedFeeKeyPress, handleSaveNegotiatedFee, pendingUpdates, verificationStatus, navigate, savePendingUpdates, showVerificationUploadTrigger, setShowVerificationUpload, feeLoading, hasOverstock }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white/80 backdrop-blur shadow-sm p-6">
      <div className="flex items-center gap-2 mb-5 pb-4 border-b border-gray-100">
        <Package size={18} className="text-emerald-600" />
        <h3 className="text-sm font-semibold text-gray-900 tracking-tight">Order Summary</h3>
      </div>
      <dl className="space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <dt className="text-gray-600">{t("cart.subtotal")}</dt>
          <dd className="font-medium text-gray-900">৳{cartTotal.toFixed(2)}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="flex items-center gap-1 text-gray-600"><Truck size={14} className="text-gray-400" /> Delivery Fee</dt>
          <dd className="font-medium text-gray-900 flex items-center gap-2">
            {feeLoading ? <Skeleton className="h-4 w-16" /> : (deliveryFee === 0 ? <span className="text-emerald-600 font-semibold">Free</span> : `৳${deliveryFee.toFixed(2)}`)}
          </dd>
        </div>
        <div className="pt-3 mt-2 border-t border-gray-100 flex items-center justify-between text-base">
          <dt className="font-semibold text-gray-900">{t("cart.total")}</dt>
          <dd className="font-semibold text-emerald-600">৳{(cartTotal + deliveryFee).toFixed(2)}</dd>
        </div>
      </dl>

      <div className="mt-8">
        <h4 className="text-xs font-semibold tracking-wide uppercase text-gray-500 mb-3 flex items-center gap-1"><MapPin size={12} className="text-gray-400" /> Delivery Address</h4>
        <AddressBlock cart={cart} loadingAddress={loadingAddress} setIsAddressModalOpen={setIsAddressModalOpen} />
      </div>

      {cart.items?.length > 0 && (
        <div className="mt-8">
          <h4 className="text-xs font-semibold tracking-wide uppercase text-gray-500 mb-3 flex items-center gap-1"><Truck size={12} className="text-gray-400" /> Delivery Options {totalWeight > 0 && <span className="ml-1 normal-case text-[10px] text-gray-400">({totalWeight}kg)</span>}</h4>
          <DeliveryOptions deliveryMethods={deliveryMethods} selectedDeliveryMethod={selectedDeliveryMethod} handleDeliveryMethodChange={handleDeliveryMethodChange} loadingDeliveryMethods={loadingDeliveryMethods} totalWeight={totalWeight} />
          <NegotiatedFeeEditor selectedDeliveryMethod={selectedDeliveryMethod} negotiatedFee={negotiatedFee} handleNegotiatedFeeChange={handleNegotiatedFeeChange} handleNegotiatedFeeKeyPress={handleNegotiatedFeeKeyPress} handleSaveNegotiatedFee={handleSaveNegotiatedFee} pendingUpdates={pendingUpdates} />
        </div>
      )}

      <div className="mt-8 space-y-3">
        {hasOverstock && (
          <div className="text-[11px] text-red-600 font-medium rounded-md bg-red-50 border border-red-200 px-3 py-2">
            Adjust quantities: exceeds stock.
          </div>
        )}
        <button
          disabled={hasOverstock || !cart.deliveryAddress || !selectedDeliveryMethod || (verificationStatus && verificationStatus !== 'verified')}
          onClick={async () => {
            if (hasOverstock) return;
            if (pendingUpdates.needsUpdate) await savePendingUpdates();
            if (verificationStatus && verificationStatus !== 'verified') { setShowVerificationUpload(true); return; }
            navigate('/checkout');
          }}
          className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 disabled:opacity-40 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-3 shadow-sm transition">
          <CreditCard size={16} /> {verificationStatus && verificationStatus !== 'verified' ? 'Verification Needed' : t('cart.proceedToCheckout')}
        </button>
        <Link to="/" className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white text-gray-700 text-xs font-medium px-4 py-2.5 hover:bg-gray-50">
          <ArrowLeft size={14} /> {t('cart.continueShopping')}
        </Link>
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-[11px] text-emerald-700 font-medium">
          <Shield size={14} className="text-emerald-600" /> Secure checkout. Your information is protected.
        </div>
      </div>
    </div>
  )
})

export default CartSummary
