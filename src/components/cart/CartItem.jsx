import React, { useCallback, useRef, useState } from 'react'
import { Minus, Plus, X } from 'lucide-react'
import { useToast } from '../ui/ToastProvider'

const CartItem = React.memo(function CartItem({ item, removeFromCart, handleQuantityChange, t }) {
  const id = item._id || item.id
  const price = item.offerPrice || item.unitPrice || item.price || 0
  // Detect stock from multiple possible backend fields (expanded list)
  const stock = [
    'stock','availableStock','quantityAvailable','inventory','qty','availableQuantity','availableQty','totalQty','remainingQty','remainingQuantity'
  ]
    .map(k => item[k] ?? item.product?.[k])
    .find(v => v !== undefined && v !== null)
  const minOrder = item.minOrderQty || 1
  const toast = useToast()

  const pendingRef = useRef(false)
  const [localPending, setLocalPending] = useState(false)

  const adjust = useCallback((delta) => {
    if (pendingRef.current) return // lock while in-flight
    const target = item.quantity + delta
    if (delta < 0 && target < minOrder) {
      toast.push({ title: t('cart.minQuantity'), message: t('cart.quantity') })
      return
    }
    if (stock != null && target > stock) {
      toast.push({ title: t('cart.maxQuantity'), message: `${stock} ${t('cart.quantity')} max`, })
      return
    }
    pendingRef.current = true
    setLocalPending(true)
    handleQuantityChange(id, target, minOrder)
    // simple debounce window
    setTimeout(() => { pendingRef.current = false; setLocalPending(false) }, 400)
  }, [item.quantity, stock, minOrder, handleQuantityChange, id, toast, t])

  const stockBadge = () => {
    if (stock == null) return null
    if (stock <= 0) return <span className="inline-flex items-center rounded-full bg-red-100 text-red-600 px-2 py-0.5 text-[10px] font-medium">{t('cart.outOfStock')}</span>
    if (stock < 5) return <span className="inline-flex items-center rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-[10px] font-medium">{t('cart.lowStock')}</span>
    return null
  }
  return (
    <div className="flex flex-col sm:flex-row gap-5 rounded-xl border border-gray-200 bg-white/70 backdrop-blur px-5 py-4 shadow-sm hover:shadow-md transition">
      <div className="w-full sm:w-32 h-32 rounded-lg overflow-hidden ring-1 ring-gray-200 bg-gray-100 flex items-center justify-center">
        <img src={item.images?.[0] || '/placeholder-product.jpg'} alt={item.name || item.title} className="object-cover w-full h-full" />
      </div>
      <div className="flex-1 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-gray-900 tracking-tight">{item.name || item.title}</h3>
            <p className="text-xs text-emerald-600 font-medium">৳{price.toFixed(2)} <span className="text-gray-500">per {item.unitType || 'unit'}</span></p>
            <div className="flex flex-wrap gap-1">
              {item.category && <span className="inline-flex rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5 text-[10px] font-medium">{item.category}</span>}
              {stockBadge()}
            </div>
          </div>
          <button onClick={() => removeFromCart(id)} className="inline-flex items-center gap-1.5 rounded-md bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1.5 text-[11px] font-medium self-start">
            <X size={12} /> Remove
          </button>
        </div>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="inline-flex items-center rounded-lg border border-gray-300 bg-white divide-x divide-gray-300">
            <button disabled={item.quantity <= minOrder || localPending} onClick={() => adjust(-1)} className="p-2 disabled:opacity-30 text-gray-600 hover:bg-gray-50">
              <Minus size={14} />
            </button>
            <div className="px-4 py-1.5 text-center">
              <div className="text-sm font-semibold leading-none text-gray-800">{item.quantity}</div>
              <div className="text-[10px] text-gray-500 mt-0.5 uppercase tracking-wide">{item.unitType || 'pcs'}</div>
            </div>
            <button disabled={localPending || (stock != null && item.quantity >= stock)} onClick={() => adjust(1)} className="p-2 disabled:opacity-30 text-gray-600 hover:bg-gray-50" aria-label={stock!=null && item.quantity>=stock ? 'Stock limit reached' : 'Increase quantity'}>
              <Plus size={14} />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-medium text-gray-500 tracking-wide">Line Total</span>
            <span className="text-sm font-semibold text-gray-900">৳{(price * item.quantity).toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  )
})

export default CartItem
