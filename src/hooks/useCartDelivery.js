import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCart } from '../contexts/CartContext'

// Isolates delivery method + fee logic
export default function useCartDelivery(cart) {
  const { getDeliveryMethods, calculateDeliveryFee, updateDeliveryDetails } = useCart()
  const [deliveryMethods, setDeliveryMethods] = useState([])
  const [selectedDeliveryMethod, setSelectedDeliveryMethod] = useState('')
  const [deliveryFee, setDeliveryFee] = useState(0)
  const [negotiatedFee, setNegotiatedFee] = useState(0)
  const [totalWeight, setTotalWeight] = useState(0)
  const [loadingDeliveryMethods, setLoadingDeliveryMethods] = useState(false)
  const [feeLoading, setFeeLoading] = useState(false)
  const [pendingUpdates, setPendingUpdates] = useState({ deliveryMethod: null, deliveryFee: null, negotiatedFee: null, needsUpdate: false })
  const feeTimeoutRef = useRef(null)

  // quantity signature
  const quantitySignature = useMemo(() => cart.items.map(it => `${it._id||it.id}:${it.quantity}`).join('|'), [cart.items])

  useEffect(() => {
    const load = async () => {
      if (!cart.items?.length) return
      if (deliveryMethods.length) return
      setLoadingDeliveryMethods(true)
      try {
        const data = await getDeliveryMethods()
        setDeliveryMethods(data.deliveryMethods || [])
        setTotalWeight(data.totalWeight || 0)
        if (cart.deliveryMethod) {
          setSelectedDeliveryMethod(cart.deliveryMethod)
          setDeliveryFee(cart.deliveryFee || 0)
          if (cart.deliveryMethod === 'negotiated') setNegotiatedFee(cart.deliveryFee || 0)
        } else if (data.recommendedMethod) {
          setSelectedDeliveryMethod(data.recommendedMethod)
          const feeData = await calculateDeliveryFee(data.recommendedMethod)
          setDeliveryFee(feeData.deliveryFee || 0)
          await updateDeliveryDetails(data.recommendedMethod, feeData.deliveryFee || 0, '', 0)
        }
      } catch (e) {
        console.warn('Delivery methods load failed', e)
      } finally {
        setLoadingDeliveryMethods(false)
      }
    }
    load()
  }, [cart.items.length])

  // recalc on quantity change
  useEffect(() => {
    if (!selectedDeliveryMethod || selectedDeliveryMethod === 'negotiated') return
    if (!cart.items?.length) return
    if (feeTimeoutRef.current) clearTimeout(feeTimeoutRef.current)
    feeTimeoutRef.current = setTimeout(async () => {
      try {
        setFeeLoading(true)
        const feeData = await calculateDeliveryFee(selectedDeliveryMethod)
        if (feeData?.deliveryFee !== undefined && feeData.deliveryFee !== deliveryFee) {
          setDeliveryFee(feeData.deliveryFee)
          setPendingUpdates(p => ({ ...p, deliveryFee: feeData.deliveryFee, needsUpdate: true }))
        }
        if (feeData?.totalWeight !== undefined) setTotalWeight(feeData.totalWeight)
      } catch(e){ console.error(e) } finally { setFeeLoading(false) }
    }, 400)
    return () => feeTimeoutRef.current && clearTimeout(feeTimeoutRef.current)
  }, [quantitySignature, selectedDeliveryMethod])

  const handleDeliveryMethodChange = useCallback((methodId) => {
    if (methodId === selectedDeliveryMethod) return
    setSelectedDeliveryMethod(methodId)
    const method = deliveryMethods.find(m => m.id === methodId)
    let fee = 0
    if (method) fee = methodId === 'negotiated' ? negotiatedFee : (method.fee || 0)
    setDeliveryFee(fee)
    setPendingUpdates(p => ({ ...p, deliveryMethod: methodId, deliveryFee: fee, needsUpdate: true }))
    if (methodId !== 'negotiated') {
      (async () => {
        try {
          setFeeLoading(true)
          const feeData = await calculateDeliveryFee(methodId)
          if (feeData?.deliveryFee !== undefined) {
            setDeliveryFee(feeData.deliveryFee)
            setPendingUpdates(p => ({ ...p, deliveryFee: feeData.deliveryFee, needsUpdate: true }))
          }
          if (feeData?.totalWeight !== undefined) setTotalWeight(feeData.totalWeight)
        } catch(e){ console.warn('Immediate fee calc failed', e) } finally { setFeeLoading(false) }
      })()
    }
  }, [selectedDeliveryMethod, deliveryMethods, negotiatedFee])

  const handleNegotiatedFeeChange = useCallback((fee) => {
    if (fee === negotiatedFee) return
    setNegotiatedFee(fee)
    if (selectedDeliveryMethod === 'negotiated') {
      setDeliveryFee(fee)
      setPendingUpdates(p => ({ ...p, negotiatedFee: fee, deliveryFee: fee, needsUpdate: true }))
      localStorage.setItem('negotiatedFeeDraft', String(fee))
    }
  }, [negotiatedFee, selectedDeliveryMethod])

  const restoreNegotiatedDraft = useCallback(() => {
    const draft = localStorage.getItem('negotiatedFeeDraft')
    if (draft && !Number.isNaN(Number(draft))) setNegotiatedFee(Number(draft))
  }, [])

  useEffect(() => { restoreNegotiatedDraft() }, [restoreNegotiatedDraft])

  const savePendingUpdates = useCallback(async () => {
    if (!pendingUpdates.needsUpdate) return
    try {
      const updates = { ...pendingUpdates }
      setPendingUpdates({ deliveryMethod: null, deliveryFee: null, negotiatedFee: null, needsUpdate: false })
      await updateDeliveryDetails(
        updates.deliveryMethod || selectedDeliveryMethod,
        updates.deliveryFee !== null ? updates.deliveryFee : deliveryFee,
        '',
        updates.negotiatedFee !== null ? updates.negotiatedFee : negotiatedFee
      )
    } catch(e){ console.error('Save pending failed', e); setPendingUpdates(p => ({ ...p, needsUpdate: true })) }
  }, [pendingUpdates, selectedDeliveryMethod, deliveryFee, negotiatedFee])

  return {
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
  }
}
