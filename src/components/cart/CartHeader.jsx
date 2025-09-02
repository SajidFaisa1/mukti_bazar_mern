import React from 'react'
import { ShoppingCart, Trash2, Save } from 'lucide-react'

const CartHeader = React.memo(function CartHeader({ t, itemCount, pendingUpdates, savePendingUpdates, clearCart }) {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-8">
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 rounded-xl bg-emerald-100 flex items-center justify-center">
          <ShoppingCart className="text-emerald-600" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">{t("cart.title")}</h1>
          <p className="text-sm text-gray-500 mt-1">{itemCount} {itemCount === 1 ? 'item' : 'items'} in your cart</p>
        </div>
      </div>
      <div className="flex gap-3">
        {pendingUpdates.needsUpdate && (
          <button onClick={savePendingUpdates} className="inline-flex items-center gap-2 rounded-lg border border-amber-400 bg-amber-50 px-4 py-2 text-xs font-medium text-amber-700 hover:bg-amber-100">
            <Save size={14} /> Save Delivery Changes
          </button>
        )}
        <button onClick={clearCart} className="inline-flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-100">
          <Trash2 size={14} /> {t("cart.clearCart")}
        </button>
      </div>
    </div>
  )
})

export default CartHeader
