"use client"

import { useState, useEffect } from "react"
import { useAuth } from "../../contexts/VendorAuthContext"
import {
  Plus,
  Edit2,
  X,
  Upload,
  Package,
  DollarSign,
  Truck,
  Calendar,
  Scale,
  Tag,
  CheckCircle,
  Trash2,
  ImageIcon,
  User,
  Star,
  Zap,
  AlertCircle,
} from "lucide-react"

const VendorProducts = () => {
  
  const apiBase = "http://localhost:5005/api"
  const [products, setProducts] = useState([])
  const [editingProduct, setEditingProduct] = useState(null)
  const [creditLeft, setCreditLeft] = useState(0)
  const [showFeatureModal, setShowFeatureModal] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const { user, token } = useAuth()
  const [loadingAddressLoc, setLoadingAddressLoc] = useState(false)
  const [addressError, setAddressError] = useState(null)
  const [showAddressPicker, setShowAddressPicker] = useState(false)
  const [addressList, setAddressList] = useState([])
  const [addressListLoading, setAddressListLoading] = useState(false)
  const [addressListError, setAddressListError] = useState('')

  const loadAddresses = async () => {
    if (!token) return
    setAddressListLoading(true)
    setAddressListError('')
    try {
      const res = await fetch('http://localhost:5005/api/addresses', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Failed to load addresses')
      const data = await res.json()
      setAddressList(Array.isArray(data) ? data : [])
    } catch (e) {
      setAddressListError(e.message || 'Failed to load addresses')
    } finally {
      setAddressListLoading(false)
    }
  }

  // Fetch vendor credit once
  useEffect(() => {
    if (!user?.storeId) return
    fetch(`${apiBase}/vendors/store/${user.storeId}`)
      .then(res => res.json())
      .then(v => setCreditLeft(v.featuredCredit ?? 0))
      .catch(console.error)
  }, [user])

  // Fetch products
  useEffect(() => {
    if (!user?.storeId) return
    fetch(`${apiBase}/products/vendor/${user.storeId}`)
      .then((res) => res.json())
      .then((data) => setProducts(Array.isArray(data) ? data : []))
      .catch(console.error)
  }, [user])

  const [showAddForm, setShowAddForm] = useState(false)
  const initialProduct = {
    name: "",
    category: "",
    description: "",
    images: [],
    unitPrice: "",
    offerPrice: "",
    unitType: "kg",
    minOrderQty: "",
    totalQty: "",
    deliveryOption: "Pickup",
    estDeliveryTime: "",
    barterAvailable: false,
    negotiationAvailable: false,
    shelfLife: "",
    lowStockThreshold: 10,
    // optional vendorLocation (advanced)
    vendorLocation: {
      division: "",
      district: "",
      upazila: "",
      union: ""
    }
  }
  const [newProduct, setNewProduct] = useState(initialProduct)
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Auto-fill vendorLocation from default address
  useEffect(() => {
    const loadDefaultAddress = async () => {
      if (!user?.uid) return
      setLoadingAddressLoc(true)
      setAddressError(null)
      try {
        const res = await fetch(`http://localhost:5005/api/addresses/default/${user.uid}`)
        if (!res.ok) {
          setAddressError('No default address found')
          return
        }
        const addr = await res.json()
        setNewProduct(prev => ({
          ...prev,
          vendorLocation: {
            division: addr.division || addr.state || prev.vendorLocation.division || '',
            district: addr.district || prev.vendorLocation.district || '',
            upazila: addr.upazila || addr.city || prev.vendorLocation.upazila || '',
            union: addr.union || prev.vendorLocation.union || ''
          }
        }))
      } catch (e) {
        setAddressError('Failed to load address')
      } finally {
        setLoadingAddressLoc(false)
      }
    }
    loadDefaultAddress()
  }, [user?.uid])

  const removeImage = (idx) => {
    setNewProduct((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== idx),
    }))
  }

  const handleInputChange = (e) => {
    const { name, value, type, files, checked } = e.target
    if (type === "file") {
      setNewProduct((prev) => ({ ...prev, images: Array.from(files).slice(0, 3) }))
    } else if (type === "checkbox") {
      setNewProduct((prev) => ({ ...prev, [name]: checked }))
    } else if (name.startsWith('vendorLocation.')) {
      const key = name.split('.')[1]
      setNewProduct(prev => ({ ...prev, vendorLocation: { ...prev.vendorLocation, [key]: value } }))
    } else {
      setNewProduct((prev) => ({ ...prev, [name]: value }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!newProduct.name || !newProduct.category) {
      alert("Name and category required")
      return
    }

    // Prepare / sanitize payload
    const rawImages = await Promise.all(
      newProduct.images.map((item) => {
        if (typeof item === "string") return item
        return new Promise((res) => {
          const reader = new FileReader()
          reader.onload = () => res(reader.result)
          reader.readAsDataURL(item)
        })
      }),
    )

  const numericFields = ["unitPrice", "offerPrice", "totalQty", "minOrderQty", "lowStockThreshold"]
    const payload = {
      ...newProduct,
      images: rawImages,
      vendorUid: user.uid,
      storeId: user.storeId,
      businessName: user.businessName || user.sellerName || "",
    }

    numericFields.forEach(f => {
      if (payload[f] === '' || payload[f] === null || payload[f] === undefined) {
        if (f === 'offerPrice') {
          delete payload[f] // optional
        } else if (f === 'minOrderQty') {
          // allow backend default
          delete payload[f]
        }
      } else {
        const num = Number(payload[f])
        if (Number.isNaN(num)) {
          return alert(`${f} is invalid number`)
        }
        payload[f] = num
      }
    })

    if (typeof payload.unitPrice !== 'number') {
      alert('Unit price required')
      return
    }
    if (typeof payload.totalQty !== 'number') {
      alert('Total quantity required')
      return
    }

    // Remove any empty string fields so validator doesn't see wrong types
    Object.keys(payload).forEach(k => { if (payload[k] === '') delete payload[k] })
    // Clean vendorLocation if all empty
    if (payload.vendorLocation) {
      const allEmpty = Object.values(payload.vendorLocation).every(v => !v)
      if (allEmpty) delete payload.vendorLocation
    }

    console.debug('Submitting product payload', payload)

    try {
      const endpoint = editingProduct
        ? `${apiBase}/products/${editingProduct._id || editingProduct.id}`
        : `${apiBase}/products`
      const method = editingProduct ? "PUT" : "POST"
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        let errJson = {}
        try { errJson = await res.json() } catch (_) {}
        console.error('Product save failed', errJson)
        throw new Error(errJson.details?.join(', ') || errJson.error || "Failed to save")
      }
      const saved = await res.json()
      if (editingProduct) {
        setProducts((prev) => prev.map((p) => {
          if (p._id && saved._id) {
            return p._id === saved._id ? saved : p
          }
          if (p.id && saved.id) {
            return p.id === saved.id ? saved : p
          }
          return p
        }))
      } else {
        setProducts((prev) => [...prev, saved])
      }
      setNewProduct(initialProduct)
      setShowAddForm(false)
      setEditingProduct(null)
    } catch (err) {
      alert(err.message)
      console.error(err)
    }
  }

  const openEditForm = (prod) => {
    setEditingProduct(prod)
    const { images: existingImages = [], ...rest } = prod
    setNewProduct({ ...initialProduct, ...rest, images: existingImages })
    setShowAddForm(true)
  }

  const deleteProduct = async (id) => {
    if (!confirm("Are you sure you want to delete this product?")) return
    try {
      const res = await fetch(`${apiBase}/products/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Delete failed")
      setProducts((prev) => prev.filter((p) => p._id !== id && p.id !== id))
    } catch (err) {
      alert(err.message)
      console.error(err)
    }
  }

  const featureProduct = async () => {
    if (!selectedProduct) return
    try {
      const id = selectedProduct._id || selectedProduct.id
      const res = await fetch(`${apiBase}/products/feature/${id}`, { method: 'PATCH' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to feature product')
      setProducts(prev => prev.map(p => (p._id === data.product._id ? data.product : p)))
      setCreditLeft(data.featuredCredit)
      setShowFeatureModal(false)
    } catch (err) {
      alert(err.message)
      console.error(err)
    }
  }

  const getCategoryColor = (category) => {
    const map = {
      Seeds: 'bg-lime-100 text-lime-700 ring-1 ring-lime-200',
      'Fresh Produce': 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200',
      'Animal Feed': 'bg-amber-100 text-amber-700 ring-1 ring-amber-200',
      Fertilizer: 'bg-green-100 text-green-700 ring-1 ring-green-200',
      Machinery: 'bg-sky-100 text-sky-700 ring-1 ring-sky-200'
    }
    return map[category] || 'bg-accent-100 text-accent-700 ring-1 ring-accent-200'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-100 px-4 py-8 sm:px-8 font-primary">
      {/* Header */}
      <div className="flex flex-col lg:flex-row gap-6 items-start justify-between mb-10">
        <div className="w-full bg-white/80 backdrop-blur border border-primary-100 rounded-2xl p-6 shadow-soft relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary-200/40 rounded-full blur-2xl" />
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-primary-600 to-primary-400 bg-clip-text text-transparent">My Products</h1>
          <p className="text-accent-600 mt-2 text-sm md:text-base">Manage and showcase your agricultural products</p>
          <div className="mt-6 grid grid-cols-3 sm:flex sm:items-center sm:gap-10">
            <div className="flex flex-col"><span className="text-2xl font-extrabold text-primary-700">{creditLeft}</span><span className="text-xs font-medium text-accent-500 uppercase tracking-wide">Feature Credits</span></div>
            <div className="flex flex-col"><span className="text-2xl font-extrabold text-primary-700">{products.length}</span><span className="text-xs font-medium text-accent-500 uppercase tracking-wide">Products</span></div>
            <div className="flex flex-col"><span className="text-2xl font-extrabold text-primary-700">{products.filter(p=>p.totalQty>0).length}</span><span className="text-xs font-medium text-accent-500 uppercase tracking-wide">In Stock</span></div>
          </div>
        </div>
        <button onClick={()=>setShowAddForm(true)} className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 text-white font-semibold px-6 py-4 shadow-medium hover:shadow-lg transition-all hover:-translate-y-0.5 focus:outline-none focus:ring-4 focus:ring-primary-300">
          <Plus className="w-5 h-5" />
          <span>Add Product</span>
          <span className="absolute inset-0 rounded-xl bg-white/10 opacity-0 group-hover:opacity-100 transition" />
        </button>
      </div>

      {/* Products Grid */}
      <div>
        {products.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map(product => (
              <div key={product.id || product._id} className="group relative bg-white/80 backdrop-blur border border-primary-100 rounded-2xl shadow-soft hover:shadow-medium hover:border-primary-300 transition flex flex-col overflow-hidden">
                <div className="relative aspect-[4/3] w-full overflow-hidden">
                  {product.images?.[0] ? (
                    <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover transition duration-500 group-hover:scale-105" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-accent-100 to-accent-200 text-accent-500">
                      <Package className="w-12 h-12" />
                    </div>
                  )}
                  {product.isFeatured && (
                    <span className="absolute top-3 left-3 flex items-center gap-1 rounded-full bg-amber-400/90 text-amber-900 text-xs font-semibold px-3 py-1 shadow"> <Star className="w-3.5 h-3.5" /> Featured</span>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition flex items-start justify-end gap-2 p-3">
                    <button onClick={()=>openEditForm(product)} className="relative inline-flex items-center justify-center w-9 h-9 rounded-lg bg-white/90 text-accent-700 hover:bg-primary-600 hover:text-white shadow-sm backdrop-blur focus:outline-none focus:ring-2 focus:ring-primary-400 transition"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={()=>deleteProduct(product.id || product._id)} className="relative inline-flex items-center justify-center w-9 h-9 rounded-lg bg-white/90 text-red-600 hover:bg-red-600 hover:text-white shadow-sm backdrop-blur focus:outline-none focus:ring-2 focus:ring-red-400 transition"><Trash2 className="w-4 h-4" /></button>
                    {!product.isFeatured && (
                      <button onClick={()=>{setSelectedProduct(product); setShowFeatureModal(true)}} className="relative inline-flex items-center justify-center w-9 h-9 rounded-lg bg-white/90 text-amber-600 hover:bg-amber-500 hover:text-white shadow-sm backdrop-blur focus:outline-none focus:ring-2 focus:ring-amber-400 transition"><Star className="w-4 h-4" /></button>
                    )}
                  </div>
                </div>
                <div className="p-5 flex flex-col flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-lg font-semibold leading-snug text-accent-800 line-clamp-2">{product.name}</h3>
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wide ${getCategoryColor(product.category)}`}>{product.category || 'Other'}</span>
                  </div>
                  <p className="mt-2 text-sm text-accent-600 line-clamp-2">{product.description}</p>
                  <div className="mt-4 flex items-end gap-2 flex-wrap">
                    <div className="flex items-baseline gap-1">
                      <span className="text-primary-600 font-bold text-xl">৳{product.unitPrice}</span>
                      <span className="text-xs text-accent-500 font-medium">/ {product.unitType}</span>
                    </div>
                    {product.offerPrice && (
                      <span className="text-xs line-through text-red-500 font-medium">৳{product.offerPrice}</span>
                    )}
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-accent-600">
                    <div className="flex items-center gap-1.5"><Package className="w-3.5 h-3.5 text-primary-500" /><span>{product.totalQty} {product.unitType} in stock</span></div>
                    <div className="flex items-center gap-1.5"><Truck className="w-3.5 h-3.5 text-primary-500" /><span>{product.deliveryOption}</span></div>
                    <div className="flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-primary-500" /><span>Approved: {product.isApproved ? 'Yes' : 'No'}</span></div>
                    <div className="flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-primary-500" /><span>Featured: {product.isFeatured ? 'Yes' : 'No'}</span></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center py-24 px-6 bg-white/70 backdrop-blur border border-dashed border-primary-200 rounded-3xl shadow-soft">
            <div className="w-20 h-20 flex items-center justify-center rounded-2xl bg-primary-100 text-primary-500 mb-6"><Package className="w-10 h-10" /></div>
            <h3 className="text-2xl font-bold text-accent-800">No products yet</h3>
            <p className="mt-2 max-w-md text-accent-600 text-sm">Start building your product catalog by adding your first agricultural product.</p>
            <button onClick={()=>setShowAddForm(true)} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 text-white font-semibold px-6 py-3 shadow-soft hover:shadow-medium transition hover:-translate-y-0.5 focus:outline-none focus:ring-4 focus:ring-primary-300">
              <Plus className="w-5 h-5" /> Add Your First Product
            </button>
          </div>
        )}
      </div>

      {/* Add/Edit Product Modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={(e)=> e.target === e.currentTarget && setShowAddForm(false)}>
          <div className="w-full max-w-5xl bg-white rounded-3xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-start justify-between gap-4 px-8 py-6 border-b border-primary-100 bg-gradient-to-r from-primary-50 to-primary-100">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary-100 text-primary-600 flex items-center justify-center shadow-inner"><Package className="w-6 h-6" /></div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-accent-800">{editingProduct ? 'Edit Product' : 'Add New Product'}</h2>
                  <p className="text-xs font-medium text-accent-500">Fill in the details below</p>
                </div>
              </div>
              <button onClick={()=>setShowAddForm(false)} className="w-10 h-10 inline-flex items-center justify-center rounded-xl bg-white/70 hover:bg-red-50 text-accent-500 hover:text-red-600 border border-accent-200 hover:border-red-300 transition focus:outline-none focus:ring-2 focus:ring-red-400"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-8 pb-8 pt-6 space-y-10">
              {/* Basic Information */}
              <section className="space-y-6">
                <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-primary-700"><Tag className="w-4 h-4" /> Basic Information</h3>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-xs font-semibold tracking-wide text-accent-600 flex items-center gap-1">Product Name <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <Package className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-accent-400" />
                      <input type="text" name="name" value={newProduct.name} onChange={handleInputChange} required placeholder="Enter product name" className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-accent-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-200 bg-white font-medium text-accent-700 placeholder:text-accent-300 transition" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold tracking-wide text-accent-600 flex items-center gap-1">Category <span className="text-red-500">*</span></label>
                    <select name="category" value={newProduct.category} onChange={handleInputChange} required className="w-full px-4 py-3 rounded-xl border-2 border-accent-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-200 bg-white font-medium text-accent-700 transition">
                    <option value="Seeds">Seeds</option>
                    <option value="Fresh Vegetables">Fresh Vegetables</option>
                    <option value="Fruits">Fruits</option>
                    <option value="Grains & Pulses">Grains & Pulses</option>
                    <option value="Spices & Herbs">Spices & Herbs</option>
                    
                    
                    <option value="Fresh Fish">Fresh Fish</option>
                    <option value="Dried Fish">Dried Fish</option>
                    <option value="Fish Feed">Fish Feed</option>
                    <option value="Aquaculture Products">Aquaculture Products</option>
                    
                    
                    <option value="Dairy Products">Dairy Products</option>
                    <option value="Meat & Poultry">Meat & Poultry</option>
                    <option value="Animal Feed">Animal Feed</option>
                    <option value="Livestock Equipment">Livestock Equipment</option>
 
 
                    <option value="Fertilizer">Fertilizer</option>
                    <option value="Pesticides">Pesticides</option>
                    <option value="Machinery">Machinery</option>
                    <option value="Irrigation Equipment">Irrigation Equipment</option>
                    
                    
                    <option value="Organic Products">Organic Products</option>
                    <option value="Honey & Natural">Honey & Natural Products</option>
                    <option value="Processed Food">Processed Food</option>
                    
                    
                    <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-xs font-semibold tracking-wide text-accent-600">Description</label>
                    <textarea name="description" value={newProduct.description} onChange={handleInputChange} rows={3} placeholder="Describe your product..." className="w-full px-4 py-3 rounded-xl border-2 border-accent-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-200 bg-white font-medium text-accent-700 placeholder:text-accent-300 transition" />
                  </div>
                </div>
              </section>

              {/* Pricing & Inventory */}
              <section className="space-y-6">
                <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-primary-700"><DollarSign className="w-4 h-4" /> Pricing & Inventory</h3>
                <div className="grid gap-6 md:grid-cols-3">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold tracking-wide text-accent-600 flex items-center gap-1">Unit Price (৳) <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-accent-400" />
                      <input type="number" name="unitPrice" value={newProduct.unitPrice} onChange={handleInputChange} min="0" step="0.01" required placeholder="0.00" className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-accent-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-200 bg-white font-medium text-accent-700 placeholder:text-accent-300 transition" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold tracking-wide text-accent-600">Offer Price (৳)</label>
                    <div className="relative">
                      <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-accent-400" />
                      <input type="number" name="offerPrice" value={newProduct.offerPrice} onChange={handleInputChange} min="0" step="0.01" placeholder="0.00" className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-accent-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-200 bg-white font-medium text-accent-700 placeholder:text-accent-300 transition" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold tracking-wide text-accent-600">Unit Type</label>
                    <select name="unitType" value={newProduct.unitType} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border-2 border-accent-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-200 bg-white font-medium text-accent-700 transition">
                      <option value="kg">kg</option>
                      <option value="ton">ton</option>
                      <option value="liter">liter</option>
                      <option value="bag">bag</option>
                      <option value="pcs">pcs</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold tracking-wide text-accent-600 flex items-center gap-1">Total Quantity <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <Scale className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-accent-400" />
                      <input type="number" name="totalQty" value={newProduct.totalQty} onChange={handleInputChange} min="0" required placeholder="0" className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-accent-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-200 bg-white font-medium text-accent-700 placeholder:text-accent-300 transition" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold tracking-wide text-accent-600">Min Order Quantity</label>
                    <div className="relative">
                      <Package className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-accent-400" />
                      <input type="number" name="minOrderQty" value={newProduct.minOrderQty} onChange={handleInputChange} min="1" placeholder="1" className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-accent-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-200 bg-white font-medium text-accent-700 placeholder:text-accent-300 transition" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold tracking-wide text-accent-600 flex items-center gap-1">Low Stock Threshold</label>
                    <div className="relative">
                      <AlertCircle className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-accent-400" />
                      <input type="number" name="lowStockThreshold" value={newProduct.lowStockThreshold} onChange={handleInputChange} min="0" placeholder="10" className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-accent-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-200 bg-white font-medium text-accent-700 placeholder:text-accent-300 transition" />
                    </div>
                    <p className="text-[10px] text-accent-500">Used to show low stock badge when remaining qty ≤ this number.</p>
                  </div>
                  <div className="md:col-span-3 text-[11px] text-accent-500 italic -mt-2">Available Qty auto-calculated: {(Number(newProduct.totalQty)||0)} (reserved shown after orders).</div>
                </div>
              </section>

              {/* Delivery & Options */}
              <section className="space-y-6">
                <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-primary-700"><Truck className="w-4 h-4" /> Delivery & Options</h3>
                <div className="grid gap-6 md:grid-cols-3">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold tracking-wide text-accent-600">Delivery Option</label>
                    <select name="deliveryOption" value={newProduct.deliveryOption} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border-2 border-accent-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-200 bg-white font-medium text-accent-700 transition">
                      <option value="Pickup">Pickup</option>
                      <option value="Home Delivery">Home Delivery</option>
                      <option value="Negotiable">Negotiable</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold tracking-wide text-accent-600">Estimated Delivery Time</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-accent-400" />
                      <input type="text" name="estDeliveryTime" value={newProduct.estDeliveryTime} onChange={handleInputChange} placeholder="e.g., 2-3 days" className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-accent-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-200 bg-white font-medium text-accent-700 placeholder:text-accent-300 transition" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold tracking-wide text-accent-600">Shelf Life</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-accent-400" />
                      <input type="text" name="shelfLife" value={newProduct.shelfLife} onChange={handleInputChange} placeholder="e.g., 6 months" className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-accent-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-200 bg-white font-medium text-accent-700 placeholder:text-accent-300 transition" />
                    </div>
                  </div>
                  <div className="md:col-span-3 flex flex-wrap gap-4">
                    <label className="inline-flex items-center gap-3 text-sm font-medium text-accent-700 cursor-pointer select-none">
                      <input type="checkbox" name="barterAvailable" checked={newProduct.barterAvailable} onChange={handleInputChange} className="appearance-none w-5 h-5 rounded-md border-2 border-accent-300 checked:bg-primary-600 checked:border-primary-600 flex items-center justify-center relative transition focus:outline-none focus:ring-2 focus:ring-primary-300" />
                      <span>Barter Available</span>
                    </label>
                    <label className="inline-flex items-center gap-3 text-sm font-medium text-accent-700 cursor-pointer select-none">
                      <input type="checkbox" name="negotiationAvailable" checked={newProduct.negotiationAvailable} onChange={handleInputChange} className="appearance-none w-5 h-5 rounded-md border-2 border-accent-300 checked:bg-primary-600 checked:border-primary-600 flex items-center justify-center relative transition focus:outline-none focus:ring-2 focus:ring-primary-300" />
                      <span>Price Negotiable</span>
                    </label>
                  </div>
                </div>
              </section>

              {/* Advanced (Vendor Location) */}
              <section className="space-y-4">
                <button type="button" onClick={()=>setShowAdvanced(s=>!s)} className="text-xs font-semibold tracking-wide text-primary-700 flex items-center gap-2">
                  <span className="underline">{showAdvanced ? 'Hide' : 'Show'} Advanced Fields</span>
                </button>
                {showAdvanced && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      <span className="font-semibold text-accent-600">Auto-filled from your default address</span>
                      <button type="button" onClick={() => { const uid=user?.uid; if(!uid)return; setLoadingAddressLoc(true); fetch(`http://localhost:5005/api/addresses/default/${uid}`).then(r=>r.ok?r.json():Promise.reject()).then(addr=>{ setNewProduct(prev=>({...prev, vendorLocation:{division:addr.division||addr.state||'',district:addr.district||'',upazila:addr.upazila||addr.city||'',union:addr.union||''}})) }).catch(()=>setAddressError('Reload failed')).finally(()=>setLoadingAddressLoc(false)) }} className="px-2 py-1 rounded-md border border-accent-300 hover:bg-accent-50">Reload</button>
                      <button type="button" onClick={() => { setShowAddressPicker(true); loadAddresses(); }} className="px-2 py-1 rounded-md border border-primary-300 text-primary-700 hover:bg-primary-50 flex items-center gap-1">Change <Edit2 className="w-3 h-3" /></button>
                      {loadingAddressLoc && <span className="text-primary-600">Loading...</span>}
                      {addressError && <span className="text-red-500">{addressError}</span>}
                    </div>
                    <div className="grid gap-6 md:grid-cols-4">
                      {['division','district','upazila','union'].map(field => (
                        <div key={field} className="space-y-2">
                          <label className="text-xs font-semibold tracking-wide text-accent-600 capitalize">{field}</label>
                          <input disabled value={newProduct.vendorLocation[field] || ''} className="w-full px-3 py-2 rounded-lg border-2 border-accent-200 bg-accent-50 text-sm text-accent-700" />
                        </div>
                      ))}
                      <div className="md:col-span-4 text-[10px] text-accent-500">Update your default address to change these values.</div>
                    </div>
                  </div>
                )}
              </section>

              {/* Image Upload */}
              <section className="space-y-6">
                <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-primary-700"><ImageIcon className="w-4 h-4" /> Product Images</h3>
                <div className="space-y-4">
                  <div className="relative rounded-2xl border-2 border-dashed border-accent-300 hover:border-primary-400 bg-gradient-to-br from-accent-50 to-primary-50 p-10 flex flex-col items-center justify-center text-center transition group">
                    <input type="file" name="images" accept="image/*" multiple onChange={handleInputChange} id="image-upload" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    <Upload className="w-14 h-14 text-accent-300 group-hover:text-primary-500 transition" />
                    <p className="mt-4 font-semibold text-accent-700">Upload Product Images</p>
                    <p className="text-xs text-accent-500">Choose up to 3 images (JPG, PNG)</p>
                  </div>
                  {newProduct.images.length > 0 && (
                    <div className="flex flex-wrap gap-3">
                      {newProduct.images.map((img, idx) => (
                        <div key={idx} className="relative w-24 h-24 rounded-xl overflow-hidden border border-accent-200 group">
                          <img src={typeof img === 'string' ? img : URL.createObjectURL(img)} alt="preview" className="object-cover w-full h-full" />
                          <button type="button" onClick={()=>removeImage(idx)} className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center text-[10px] hover:bg-red-600 transition"><X className="w-3 h-3" /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              {/* Form Actions */}
              <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-accent-200/60">
                <button type="button" onClick={()=>setShowAddForm(false)} className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border-2 border-accent-200 text-accent-600 hover:border-red-300 hover:bg-red-50 hover:text-red-600 font-semibold transition focus:outline-none focus:ring-4 focus:ring-red-200"><X className="w-4 h-4" /> Cancel</button>
                <button type="submit" className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 text-white font-semibold shadow-soft hover:shadow-medium hover:-translate-y-0.5 transition focus:outline-none focus:ring-4 focus:ring-primary-300"><CheckCircle className="w-4 h-4" /> {editingProduct ? 'Update Product' : 'Save Product'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Feature Product Modal */}
      {showFeatureModal && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={(e)=> e.target === e.currentTarget && setShowFeatureModal(false)}>
          <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden animate-[fadeIn_0.3s_ease]">
            <div className="flex items-center gap-4 px-6 py-5 bg-gradient-to-r from-primary-50 to-primary-100 border-b border-primary-100">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center shadow-inner"><Star className="w-6 h-6 text-white" /></div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-accent-800">Feature This Product?</h3>
                <p className="text-xs font-medium text-primary-600">Boost visibility and reach more customers</p>
              </div>
            </div>
            <div className="px-6 py-6 space-y-6 max-h-[65vh] overflow-y-auto">
              <div className="flex items-center gap-4 p-3 rounded-xl bg-accent-50 border border-accent-200">
                <div className="w-14 h-14 rounded-lg overflow-hidden bg-white border border-accent-200 flex items-center justify-center">
                  {selectedProduct.images?.[0] ? (
                    <img src={selectedProduct.images[0]} alt={selectedProduct.name} className="object-cover w-full h-full" />
                  ) : (
                    <Package className="w-6 h-6 text-accent-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-accent-800 truncate">{selectedProduct.name}</h4>
                  <span className="inline-flex mt-1 items-center rounded-full bg-primary-100 text-primary-700 text-[10px] font-semibold px-2 py-0.5 uppercase tracking-wide">{selectedProduct.category}</span>
                </div>
              </div>
              <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50 p-4 flex flex-col sm:flex-row gap-4">
                <div className="flex items-center gap-3">
                  <Zap className="w-5 h-5 text-amber-500" />
                  <span className="text-sm text-amber-800">This will use <strong className="font-semibold">1 credit</strong></span>
                </div>
                <div className="ml-auto flex items-center gap-3">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-700">Available</span>
                  <span className={`text-lg font-extrabold ${creditLeft <=0 ? 'text-red-600' : 'text-primary-600'}`}>{creditLeft}</span>
                  {creditLeft <= 0 && (
                    <div className="flex items-center gap-1 text-red-600 text-[10px] font-semibold"><AlertCircle className="w-3.5 h-3.5" /> Insufficient</div>
                  )}
                </div>
              </div>
              <div className="rounded-xl border border-primary-100 bg-primary-50/60 p-4">
                <h5 className="text-[11px] font-semibold tracking-wide text-primary-700 uppercase mb-3">What you get</h5>
                <ul className="space-y-2 text-sm text-accent-700">
                  <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-primary-500" /> Priority placement in search results</li>
                  <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-primary-500" /> Featured badge on your product</li>
                  <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-primary-500" /> Increased visibility for 30 days</li>
                </ul>
              </div>
            </div>
            <div className="flex gap-4 px-6 py-5 bg-accent-50 border-t border-accent-200">
              <button onClick={()=>setShowFeatureModal(false)} className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border-2 border-accent-200 px-5 py-3 text-accent-600 font-semibold hover:bg-accent-100 hover:text-accent-800 transition focus:outline-none focus:ring-4 focus:ring-accent-300"><X className="w-4 h-4" /> Cancel</button>
              <button disabled={creditLeft <=0} onClick={featureProduct} className={`flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 font-semibold transition focus:outline-none focus:ring-4 ${creditLeft<=0 ? 'bg-accent-200 text-accent-400 cursor-not-allowed focus:ring-transparent' : 'bg-gradient-to-r from-amber-500 to-amber-400 text-white shadow-soft hover:shadow-medium hover:-translate-y-0.5 focus:ring-amber-300'}`}><Star className="w-4 h-4" /> Feature Product</button>
            </div>
          </div>
        </div>
      )}
      {showAddressPicker && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={(e)=> e.target===e.currentTarget && setShowAddressPicker(false)}>
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-accent-200 bg-gradient-to-r from-primary-50 to-primary-100">
              <h3 className="text-sm font-semibold tracking-wide text-primary-700 uppercase">Select Address</h3>
              <button onClick={()=>setShowAddressPicker(false)} className="w-9 h-9 inline-flex items-center justify-center rounded-lg bg-white/80 hover:bg-red-50 text-accent-500 hover:text-red-600 border border-accent-200 hover:border-red-300"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
              {addressListLoading && <div className="text-sm text-accent-500">Loading addresses…</div>}
              {addressListError && <div className="text-sm text-red-600">{addressListError}</div>}
              {!addressListLoading && !addressListError && addressList.length === 0 && (
                <div className="text-sm text-accent-500">No addresses found. Add one from settings.</div>
              )}
              <ul className="space-y-3">
                {addressList.map(addr => (
                  <li key={addr._id} className={`p-4 rounded-xl border flex flex-col gap-2 cursor-pointer group transition ${addr.isDefault ? 'border-primary-400 bg-primary-50/60' : 'border-accent-200 hover:border-primary-300 hover:bg-primary-50/40'}`}
                      onClick={async ()=> {
                        // Optimistic update location fields
                        setNewProduct(prev=>({...prev, vendorLocation:{
                          division: addr.division || addr.state || '',
                          district: addr.district || '',
                          upazila: addr.upazila || addr.city || '',
                          union: addr.union || ''
                        }}))
                        // Set as default if not already
                        try {
                          if (!addr.isDefault) {
                            await fetch(`http://localhost:5005/api/addresses/${addr._id}/default`, { method:'PATCH', headers:{ Authorization:`Bearer ${token}` } })
                          }
                          setShowAddressPicker(false)
                        } catch (e) {
                          setAddressListError('Failed to set default')
                        }
                      }}>
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-accent-800 truncate">{addr.label || addr.name || 'Address'}</div>
                      {addr.isDefault && <span className="text-[10px] font-bold tracking-wide text-primary-700 bg-primary-200/70 px-2 py-0.5 rounded-full">Default</span>}
                    </div>
                    <div className="text-xs text-accent-600 leading-relaxed">
                      {(addr.addressLine1 || '') + (addr.addressLine2 ? ', '+addr.addressLine2 : '')}
                      <br />
                      {[addr.city||addr.upazila, addr.district, addr.state||addr.division].filter(Boolean).join(', ')}{addr.zip ? ', '+addr.zip : ''}
                    </div>
                    <div className="flex gap-2 text-[10px] text-accent-500">
                      <span>{addr.phone}</span>
                      {addr.country && <span>{addr.country}</span>}
                    </div>
                    <div className="text-[10px] text-primary-600 opacity-0 group-hover:opacity-100 transition">Click to {addr.isDefault ? 'use this address' : 'set as default & use'}</div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="px-6 py-4 border-t border-accent-200 bg-accent-50 flex items-center justify-end gap-3 text-[11px] text-accent-600">
              <span>Manage addresses from your settings page.</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default VendorProducts
