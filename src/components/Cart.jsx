"use client"
import { useCart } from "../contexts/CartContext"
import { Link, useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { ShoppingBag, X, ArrowLeft } from "lucide-react"
import { useState, useEffect, useCallback, useRef, useMemo, lazy, Suspense } from "react"
import AddAddressModal from "./settings/AddAddressModal"
import { useVendorAuth } from "../contexts/VendorAuthContext"
import { useClientAuth } from "../contexts/ClientAuthContext"
// Tailwind refactor: legacy CSS removed
import CartVerificationNotice from './cart/CartVerificationNotice'
const VerificationUpload = lazy(() => import('./verification/VerificationUpload'))
import CartHeader from './cart/CartHeader'
import CartItem from './cart/CartItem'
import CartSummary from './cart/CartSummary'
import useCartDelivery from '../hooks/useCartDelivery'
import { useToast } from './ui/ToastProvider'

const ModernCart = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { 
    cart, 
  removeFromCart, 
  reAddItem,
    updateQuantity, 
    clearCart, 
    cartTotal, 
    itemCount, 
    loading, 
    error, 
    updateDeliveryAddress
  } = useCart()
  
  // Use auth contexts
  const vendorAuth = useVendorAuth() || {}
  const clientAuth = useClientAuth() || {}
  
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false)
  const [showVerificationUpload, setShowVerificationUpload] = useState(false)
  const [verificationStatus, setVerificationStatus] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)
  const [loadingAddress, setLoadingAddress] = useState(false)
  
  // Delivery logic extracted to hook
  const {
    deliveryMethods,
    selectedDeliveryMethod,
    deliveryFee,
    negotiatedFee,
    totalWeight,
    loadingDeliveryMethods,
    feeLoading,
    pendingUpdates,
    handleDeliveryMethodChange,
    handleNegotiatedFeeChange,
    savePendingUpdates,
    setSelectedDeliveryMethod,
    setNegotiatedFee,
    setDeliveryFee
  } = useCartDelivery(cart)

  const toast = useToast()
  const removedItemRef = useRef(null)

  // Get delivery address from cart or fetch default if cart doesn't have one
  useEffect(() => {
    const setupAddressAndUser = async () => {
      try {
        // Get current user info from auth contexts with fallback to storage
        let userInfo = null
        let userRole = null
        let token = null
        
        // Check vendor auth first
        if (vendorAuth.user) {
          userInfo = vendorAuth.user
          userRole = 'vendor'
          token = vendorAuth.token
        } else if (clientAuth.user) {
          userInfo = clientAuth.user
          userRole = 'client'
          token = clientAuth.token
        } else {
          // Fallback to storage if contexts are not available
          const clientUser = JSON.parse(localStorage.getItem('clientUser') || 'null')
          if (clientUser) {
            userInfo = clientUser
            userRole = 'client'
            token = localStorage.getItem('clientToken')
          } else {
            const vendorUser = JSON.parse(sessionStorage.getItem('vendorUser') || 'null')
            if (vendorUser) {
              userInfo = vendorUser
              userRole = 'vendor'
              token = sessionStorage.getItem('vendorToken')
            }
          }
        }
        
        // Derive verification status for clients
        let vStatus = null
        if (userRole === 'client') {
          const rawStatus = userInfo?.verification?.status
          if (['required','pending','rejected'].includes(rawStatus)) vStatus = rawStatus
        }
        setVerificationStatus(vStatus)
        setCurrentUser({ ...userInfo, role: userRole, token })
      } catch (error) {
        console.error('Failed to setup user:', error)
      }
    }

    setupAddressAndUser()
  }, [vendorAuth.user, clientAuth.user]) // Only re-run when auth state changes

  // Separate useEffect for address loading to prevent interference with quantity updates
  useEffect(() => {
    const loadDefaultAddress = async () => {
      // Only try to set default address if we have user info, cart is loaded, and cart doesn't have delivery address
      if (currentUser?.uid && cart && cart.items !== undefined && !cart.deliveryAddress && !loadingAddress) {
        setLoadingAddress(true)
        try {
          console.log('Fetching default address for uid:', currentUser.uid)
          const response = await fetch(`http://localhost:5005/api/addresses/default/${currentUser.uid}`)
          console.log('Default address fetch response:', response.status, response.ok)
          
          if (response.ok) {
            const address = await response.json()
            console.log('Found default address, updating cart:', address)
            // Update cart with default address
            await updateDeliveryAddress(address._id)
          } else {
            console.log('No default address found')
          }
        } catch (error) {
          console.error('Failed to set default address:', error)
        } finally {
          setLoadingAddress(false)
        }
      }
    }

    // Only load address if we have current user and cart is ready
    // Add a small delay to prevent interference with quantity updates
    if (currentUser?.uid && cart && cart.items !== undefined && !cart.deliveryAddress && !loading) {
      const timeoutId = setTimeout(() => {
        loadDefaultAddress()
      }, 300) // Small delay to let cart operations settle
      
      return () => clearTimeout(timeoutId)
    }
  }, [currentUser?.uid, cart.deliveryAddress, loading]) // Only depend on user, delivery address, and loading state

  // undo removal handling
  const handleRemove = useCallback((item) => {
    removedItemRef.current = item
    removeFromCart(item._id || item.id)
    toast.push({
      title: t('cart.itemRemoved'),
      action: {
        label: t('cart.undo'),
        onClick: () => {
    if (!removedItemRef.current) return
    reAddItem(removedItemRef.current)
    toast.push({ title: t('cart.itemRestored') })
        }
      }
    })
  }, [removeFromCart, reAddItem, toast, t])

  const handleAddAddress = async () => {
    // Refresh the address after adding a new one
    try {
      // Get current user info from auth contexts with fallback to storage
      let userInfo = null
      
      if (vendorAuth.user) {
        userInfo = vendorAuth.user
      } else if (clientAuth.user) {
        userInfo = clientAuth.user
      } else {
        // Fallback to storage
        const clientUser = JSON.parse(localStorage.getItem('clientUser') || 'null')
        if (clientUser) {
          userInfo = clientUser
        } else {
          const vendorUser = JSON.parse(sessionStorage.getItem('vendorUser') || 'null')
          if (vendorUser) {
            userInfo = vendorUser
          }
        }
      }
      
      console.log('Refreshing address for user:', userInfo)
      
      if (userInfo?.uid) {
        const response = await fetch(`http://localhost:5005/api/addresses/default/${userInfo.uid}`)
        console.log('Address refresh response:', response.status, response.ok)
        
        if (response.ok) {
          const address = await response.json()
          console.log('Refreshed address:', address)
          
          // Update the cart's delivery address
          if (address._id) {
            await updateDeliveryAddress(address._id)
          }
        }
      }
    } catch (error) {
      console.error('Failed to refresh address:', error)
    }
    setIsAddressModalOpen(false)
  }

  const handleQuantityChange = useCallback((itemId, newQuantity, minQty = 1) => {
    const item = cart.items.find(it => (it._id || it.id) === itemId)
    if (!item) return
    const stock = [
      'stock','availableStock','quantityAvailable','inventory','qty','availableQuantity','availableQty','totalQty','remainingQty','remainingQuantity'
    ].map(k => item[k] ?? item.product?.[k]).find(v => v !== undefined && v !== null)
    if (newQuantity < minQty) {
      toast.push({ title: t('cart.minQuantity'), message: t('cart.quantity') })
      return
    }
    if (stock != null && newQuantity > stock) {
      toast.push({ title: t('cart.maxQuantity'), message: `${stock} ${t('cart.quantity')} max` })
      return
    }
    updateQuantity(itemId, newQuantity)
  }, [cart.items, updateQuantity, t, toast])

  // (delivery method change handled in hook)

  const handleSaveNegotiatedFee = () => savePendingUpdates()
  const handleNegotiatedFeeKeyPress = useCallback((e) => { if (e.key === 'Enter') savePendingUpdates() }, [savePendingUpdates])

  // Guard checkout against quantities exceeding stock
  const hasOverstock = cart.items.some(it => {
    const stock = ['stock','availableStock','quantityAvailable','inventory','qty','availableQuantity']
      .map(k => it[k])
      .find(v => v !== undefined && v !== null)
    return stock != null && it.quantity > stock
  })

  // Cleanup timeout on unmount
  // (timeouts handled inside hook now)

  // Save on page unload (refresh/close)
  useEffect(() => {
    const handleBeforeUnload = (e) => { if (pendingUpdates.needsUpdate) { e.preventDefault(); e.returnValue = ''; savePendingUpdates() } }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [pendingUpdates.needsUpdate, savePendingUpdates])

  // Save on component unmount or navigation
  useEffect(() => () => { if (pendingUpdates.needsUpdate) savePendingUpdates() }, [pendingUpdates.needsUpdate, savePendingUpdates])

  // Show loading state
  // Only block UI with loader on initial/empty load to prevent flicker during small updates
  if (loading && cart.items.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-gray-600">
          <div className="h-10 w-10 rounded-full border-4 border-emerald-500/20 border-t-emerald-600 animate-spin" />
          <p className="text-sm font-medium">Loading cart...</p>
        </div>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="max-w-md mx-auto py-16 px-6">
        <div className="rounded-2xl border border-red-200 bg-red-50/70 p-8 text-center space-y-4">
          <div className="mx-auto h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
            <X className="text-red-600" />
          </div>
          <h2 className="text-lg font-semibold text-red-700">Cart Error</h2>
          <p className="text-sm text-red-600">{error}</p>
          <button onClick={() => window.location.reload()} className="inline-flex items-center gap-2 rounded-md bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2">Reload</button>
        </div>
      </div>
    )
  }

  if (cart.items.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-6">
        <div className="w-full max-w-md text-center rounded-2xl bg-white/80 backdrop-blur shadow-sm border border-gray-200 p-10">
          <div className="mx-auto mb-6 h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center">
            <ShoppingBag className="text-emerald-600" size={34} />
          </div>
          <h2 className="text-xl font-semibold tracking-tight text-gray-800 mb-2">{t("cart.empty")}</h2>
          <p className="text-sm text-gray-500 mb-6">{t("cart.addItems")}</p>
          <Link to="/" className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-5 py-2.5 shadow-sm">
            <ArrowLeft size={14} /> {t("cart.continueShopping")}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
  <CartHeader t={t} itemCount={itemCount} pendingUpdates={pendingUpdates} savePendingUpdates={savePendingUpdates} clearCart={clearCart} />

      {verificationStatus && currentUser?.role === 'client' && (
        <CartVerificationNotice status={verificationStatus} onOpenUpload={() => setShowVerificationUpload(true)} />
      )}

      <div className="grid lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 space-y-5">
          {cart.items.map(item => (
            <CartItem key={item._id || item.id} item={item} removeFromCart={() => handleRemove(item)} handleQuantityChange={handleQuantityChange} t={t} />
          ))}
        </div>
        <div className="space-y-6">
          <CartSummary
            t={t}
            cart={cart}
            cartTotal={cartTotal}
            deliveryFee={deliveryFee}
            loadingAddress={loadingAddress}
            setIsAddressModalOpen={setIsAddressModalOpen}
            deliveryMethods={deliveryMethods}
            selectedDeliveryMethod={selectedDeliveryMethod}
            handleDeliveryMethodChange={handleDeliveryMethodChange}
            loadingDeliveryMethods={loadingDeliveryMethods}
            totalWeight={totalWeight}
            negotiatedFee={negotiatedFee}
            handleNegotiatedFeeChange={handleNegotiatedFeeChange}
            handleNegotiatedFeeKeyPress={handleNegotiatedFeeKeyPress}
            handleSaveNegotiatedFee={handleSaveNegotiatedFee}
            pendingUpdates={pendingUpdates}
            verificationStatus={verificationStatus}
            navigate={navigate}
            savePendingUpdates={savePendingUpdates}
            setShowVerificationUpload={setShowVerificationUpload}
            feeLoading={feeLoading}
            hasOverstock={hasOverstock}
          />
        </div>
      </div>

      {isAddressModalOpen && (
        <AddAddressModal
          token={currentUser?.token || vendorAuth.token || clientAuth.token || localStorage.getItem('clientToken') || sessionStorage.getItem('vendorToken')}
          uid={currentUser?.uid}
          role={currentUser?.role}
          onClose={() => setIsAddressModalOpen(false)}
          onSaved={handleAddAddress}
        />
      )}
      {showVerificationUpload && (
        <Suspense fallback={<div className="fixed inset-0 bg-black/10 flex items-center justify-center"><div className="h-10 w-10 rounded-full border-4 border-emerald-500/30 border-t-emerald-600 animate-spin" /></div>}>
          <VerificationUpload onClose={() => setShowVerificationUpload(false)} onSubmitted={(s)=> { setVerificationStatus(s); }} />
        </Suspense>
      )}
    </div>
  )
}

export default ModernCart
