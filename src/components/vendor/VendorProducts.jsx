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
import "./VendorProducts.css"

const VendorProducts = () => {
 
  const apiBase = "http://localhost:5005/api"
  const [products, setProducts] = useState([])
  const [editingProduct, setEditingProduct] = useState(null)
  const [creditLeft, setCreditLeft] = useState(0)
  const [showFeatureModal, setShowFeatureModal] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const { user } = useAuth()

  // Fetch products for this vendor
  // Fetch vendor credit once
  useEffect(() => {
    if (!user?.storeId) return
    fetch(`${apiBase}/vendors/store/${user.storeId}`)
      .then(res => res.json())
      .then(v => setCreditLeft(v.featuredCredit ?? 0))
      .catch(console.error)
  }, [user])

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
  }
  const [newProduct, setNewProduct] = useState(initialProduct)

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

    const payload = {
      ...newProduct,
      images: await Promise.all(
        newProduct.images.map((item) => {
          // If the item is already a string (existing URL/base64) just keep it
          if (typeof item === "string") return item
          // Otherwise it is a File object that needs converting
          return new Promise((res) => {
            const reader = new FileReader()
            reader.onload = () => res(reader.result)
            reader.readAsDataURL(item)
          })
        }),
      ),
      vendorUid: user.uid,
      storeId: user.storeId,
      businessName: user.businessName || user.sellerName || "",
    }

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
      if (!res.ok) throw new Error("Failed to save")
      const saved = await res.json()
      if (editingProduct) {
        setProducts((prev) => prev.map((p) => {
      // Prefer MongoDB _id comparison; fall back to id only if both are defined
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
  // Preserve existing image URLs so the vendor doesn't have to re-upload
  // File inputs cannot be pre-filled, but we can keep the URLs in state so
  // they are re-submitted if the user does not choose new files.
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
    if (!selectedProduct) return;
    try {
      const id = selectedProduct._id || selectedProduct.id;
      const res = await fetch(`${apiBase}/products/feature/${id}`, { method: 'PATCH' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to feature product');
      // update product list
      setProducts(prev => prev.map(p => (p._id === data.product._id ? data.product : p)));
      setCreditLeft(data.featuredCredit);
      setShowFeatureModal(false);
    } catch (err) {
      alert(err.message);
      console.error(err);
    }
  };

  const getCategoryColor = (category) => {
    const colors = {
      Seeds: "category-seeds",
      "Fresh Produce": "category-fresh",
      "Animal Feed": "category-feed",
      Fertilizer: "category-fertilizer",
      Machinery: "category-machinery",
    }
    return colors[category] || "category-default"
  }

  return (
    <div className="vendor-products-container">
      {/* Header Section */}
      <div className="page-header">
        <div className="header-content">
          <div className="header-text">
            <h1 className="page-title">My Products</h1>
            <p className="page-description">Manage and showcase your agricultural products</p>
          </div>
          <div className="header-stats">
            <div className="stat-item">
              <span className="stat-number">{creditLeft}</span>
              <span className="stat-label">Feature Credits</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{products.length}</span>
              <span className="stat-label">Products</span>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <span className="stat-number">{products.filter((p) => p.totalQty > 0).length}</span>
              <span className="stat-label">In Stock</span>
            </div>
          </div>
        </div>
        <button className="add-product-btn" onClick={() => setShowAddForm(true)}>
          <Plus className="btn-icon" />
          <span>Add Product</span>
        </button>
      </div>

      {/* Products Grid */}
      <div className="products-section">
        {products.length > 0 ? (
          <div className="products-grid">
            {products.map((product) => (
              <div key={product.id || product._id} className="product-card">
                <div className="product-image-container">
                  {product.images && product.images[0] ? (
                    <img src={product.images[0] || "/placeholder.svg"} alt={product.name} className="product-image" />
                  ) : (
                    <div className="product-image-placeholder">
                      <Package className="placeholder-icon" />
                    </div>
                  )}
                  <div className="product-overlay">
                    <button className="overlay-btn" onClick={() => openEditForm(product)}>
                      <Edit2 className="overlay-icon" />
                    </button>
                    <button className="overlay-btn delete" onClick={() => deleteProduct(product.id || product._id)}>
                      <Trash2 className="overlay-icon" />
                    </button>
                    {!product.isFeatured && (
                      <button className="overlay-btn feature" onClick={() => { setSelectedProduct(product); setShowFeatureModal(true); }}>
                        <Star className="overlay-icon" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="product-info">
                  <div className="product-header">
                    <h3 className="product-name">{product.name}</h3>
                    <span className={`product-category ${getCategoryColor(product.category)}`}>{product.category}</span>
                  </div>

                  <p className="product-description">{product.description}</p>

                  <div className="product-pricing">
                    <div className="price-main">
                      <span className="currency">৳</span>
                      <span className="price">{product.unitPrice}</span>
                    </div>
                    {product.offerPrice && <span className="price-original">৳{product.offerPrice}</span>}
                    <span className="price-unit">per {product.unitType}</span>
                  </div>

                  <div className="product-meta">
                    <div className="meta-item">
                      <Package className="meta-icon" />
                      <span>
                        {product.totalQty} {product.unitType} available
                      </span>
                    </div>
                    <div className="meta-item">
                      <Truck className="meta-icon" />
                      <span>{product.deliveryOption}</span>
                    </div>
                    <div className="meta-item">
                      <User className="meta-icon" />
                      <span>Admin Approved: {product.isApproved ? "Yes" : "No"}</span>
                    </div>
                    <div className="meta-item">
                      <User className="meta-icon" />
                      <span>Featured: {product.isFeatured ? "Yes" : "No"}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-illustration">
              <Package className="empty-icon" />
            </div>
            <h3 className="empty-title">No products yet</h3>
            <p className="empty-description">
              Start building your product catalog by adding your first agricultural product.
            </p>
            <button className="empty-cta-btn" onClick={() => setShowAddForm(true)}>
              <Plus className="btn-icon" />
              Add Your First Product
            </button>
          </div>
        )}
      </div>

      {/* Add/Edit Product Modal */}
      {showAddForm && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowAddForm(false)}>
          <div className="modal-container">
            <div className="modal-header">
              <div className="modal-title-section">
                <div className="modal-icon-wrapper">
                  <Package className="modal-icon" />
                </div>
                <div>
                  <h2 className="modal-title">{editingProduct ? "Edit Product" : "Add New Product"}</h2>
                  <p className="modal-subtitle">Fill in the details below</p>
                </div>
              </div>
              <button className="modal-close-btn" onClick={() => setShowAddForm(false)}>
                <X className="close-icon" />
              </button>
            </div>

            <form className="product-form" onSubmit={handleSubmit}>
              <div className="form-content">
                {/* Basic Information */}
                <div className="form-section">
                  <h3 className="section-title">
                    <Tag className="section-icon" />
                    Basic Information
                  </h3>

                  <div className="form-grid">
                    <div className="form-group span-2">
                      <label className="form-label">
                        Product Name <span className="required">*</span>
                      </label>
                      <div className="input-group">
                        <Package className="input-icon" />
                        <input
                          type="text"
                          name="name"
                          value={newProduct.name}
                          onChange={handleInputChange}
                          className="form-input"
                          placeholder="Enter product name"
                          required
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        Category <span className="required">*</span>
                      </label>
                      <div className="select-group">
                        <select
                          name="category"
                          value={newProduct.category}
                          onChange={handleInputChange}
                          className="form-select"
                          required
                        >
                          <option value="">Select category</option>
                          <option value="Seeds">Seeds</option>
                          <option value="Fresh Produce">Fresh Produce</option>
                          <option value="Animal Feed">Animal Feed</option>
                          <option value="Fertilizer">Fertilizer</option>
                          <option value="Machinery">Machinery</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-group span-2">
                      <label className="form-label">Description</label>
                      <textarea
                        name="description"
                        value={newProduct.description}
                        onChange={handleInputChange}
                        className="form-textarea"
                        placeholder="Describe your product..."
                        rows="3"
                      />
                    </div>
                  </div>
                </div>

                {/* Pricing & Inventory */}
                <div className="form-section">
                  <h3 className="section-title">
                    <DollarSign className="section-icon" />
                    Pricing & Inventory
                  </h3>

                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">
                        Unit Price (৳) <span className="required">*</span>
                      </label>
                      <div className="input-group">
                        <DollarSign className="input-icon" />
                        <input
                          type="number"
                          name="unitPrice"
                          value={newProduct.unitPrice}
                          onChange={handleInputChange}
                          className="form-input"
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                          required
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Offer Price (৳)</label>
                      <div className="input-group">
                        <Tag className="input-icon" />
                        <input
                          type="number"
                          name="offerPrice"
                          value={newProduct.offerPrice}
                          onChange={handleInputChange}
                          className="form-input"
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Unit Type</label>
                      <div className="select-group">
                        <select
                          name="unitType"
                          value={newProduct.unitType}
                          onChange={handleInputChange}
                          className="form-select"
                        >
                          <option value="kg">kg</option>
                          <option value="ton">ton</option>
                          <option value="liter">liter</option>
                          <option value="bag">bag</option>
                          <option value="pcs">pcs</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        Total Quantity <span className="required">*</span>
                      </label>
                      <div className="input-group">
                        <Scale className="input-icon" />
                        <input
                          type="number"
                          name="totalQty"
                          value={newProduct.totalQty}
                          onChange={handleInputChange}
                          className="form-input"
                          placeholder="0"
                          min="0"
                          required
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Min Order Quantity</label>
                      <div className="input-group">
                        <Package className="input-icon" />
                        <input
                          type="number"
                          name="minOrderQty"
                          value={newProduct.minOrderQty}
                          onChange={handleInputChange}
                          className="form-input"
                          placeholder="1"
                          min="1"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Delivery & Options */}
                <div className="form-section">
                  <h3 className="section-title">
                    <Truck className="section-icon" />
                    Delivery & Options
                  </h3>

                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">Delivery Option</label>
                      <div className="select-group">
                        <select
                          name="deliveryOption"
                          value={newProduct.deliveryOption}
                          onChange={handleInputChange}
                          className="form-select"
                        >
                          <option value="Pickup">Pickup</option>
                          <option value="Home Delivery">Home Delivery</option>
                          <option value="Negotiable">Negotiable</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Estimated Delivery Time</label>
                      <div className="input-group">
                        <Calendar className="input-icon" />
                        <input
                          type="text"
                          name="estDeliveryTime"
                          value={newProduct.estDeliveryTime}
                          onChange={handleInputChange}
                          className="form-input"
                          placeholder="e.g., 2-3 days"
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Shelf Life</label>
                      <div className="input-group">
                        <Calendar className="input-icon" />
                        <input
                          type="text"
                          name="shelfLife"
                          value={newProduct.shelfLife}
                          onChange={handleInputChange}
                          className="form-input"
                          placeholder="e.g., 6 months"
                        />
                      </div>
                    </div>

                    <div className="form-group span-2">
                      <div className="checkbox-group">
                        <label className="checkbox-item">
                          <input
                            type="checkbox"
                            name="barterAvailable"
                            checked={newProduct.barterAvailable}
                            onChange={handleInputChange}
                            className="checkbox-input"
                          />
                          <span className="checkbox-custom"></span>
                          <span className="checkbox-label">Barter Available</span>
                        </label>
                        <label className="checkbox-item">
                          <input
                            type="checkbox"
                            name="negotiationAvailable"
                            checked={newProduct.negotiationAvailable}
                            onChange={handleInputChange}
                            className="checkbox-input"
                          />
                          <span className="checkbox-custom"></span>
                          <span className="checkbox-label">Price Negotiable</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Image Upload */}
                <div className="form-section">
                  <h3 className="section-title">
                    <ImageIcon className="section-icon" />
                    Product Images
                  </h3>

                  <div className="upload-area">
                      <input
                        type="file"
                        name="images"
                        accept="image/*"
                        multiple
                        onChange={handleInputChange}
                        className="upload-input"
                        id="image-upload"
                      />
                      <label htmlFor="image-upload" className="upload-label">
                        <Upload className="upload-icon" />
                        <div className="upload-text">
                          <span className="upload-title">Upload Product Images</span>
                          <span className="upload-subtitle">Choose up to 3 images (JPG, PNG)</span>
                        </div>
                      </label>

                      {newProduct.images.length > 0 && (
                        <div className="upload-preview-list">
                          {newProduct.images.map((img, idx) => (
                            <div key={idx} className="upload-preview-item">
                              <img
                                src={typeof img === "string" ? img : URL.createObjectURL(img)}
                                alt="preview"
                                className="preview-img"
                              />
                              <button type="button" className="remove-img-btn" onClick={() => removeImage(idx)}>
                                <X size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                  </div> {/* end form-section */}

                </div> {/* end form-content */}

                {/* Form Actions */}
                <div className="form-actions">
                  <button type="button" className="btn-secondary" onClick={() => setShowAddForm(false)}>
                    <X className="btn-icon" />
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    <CheckCircle className="btn-icon" />
                    {editingProduct ? "Update Product" : "Save Product"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
     {showFeatureModal && selectedProduct && (
        <div
          className="feature-modal-backdrop"
          onClick={(e) => e.target === e.currentTarget && setShowFeatureModal(false)}
        >
          <div className="feature-confirmation-card">
            <div className="confirmation-header">
              <div className="header-icon-wrapper">
                <Star className="feature-icon" />
              </div>
              <div className="header-content">
                <h3 className="confirmation-title">Feature This Product?</h3>
                <p className="confirmation-subtitle">Boost visibility and reach more customers</p>
              </div>
            </div>

            <div className="confirmation-body">
              <div className="product-preview">
                <div className="preview-image">
                  {selectedProduct.images?.[0] ? (
                    <img
                      src={selectedProduct.images[0] || "/placeholder.svg"}
                      alt={selectedProduct.name}
                      className="product-thumbnail"
                    />
                  ) : (
                    <Package className="thumbnail-placeholder" />
                  )}
                </div>
                <div className="preview-details">
                  <h4 className="preview-name">{selectedProduct.name}</h4>
                  <span className="preview-category">{selectedProduct.category}</span>
                </div>
              </div>

              <div className="credit-info-card">
                <div className="credit-cost">
                  <Zap className="credit-icon" />
                  <span className="cost-text">
                    This will use <strong>1 credit</strong>
                  </span>
                </div>
                <div className="credit-balance">
                  <div className="balance-indicator">
                    <span className="balance-label">Available Credits</span>
                    <span className={`balance-count ${creditLeft <= 0 ? "balance-low" : "balance-good"}`}>
                      {creditLeft}
                    </span>
                  </div>
                  {creditLeft <= 0 && (
                    <div className="insufficient-credits">
                      <AlertCircle className="warning-icon" />
                      <span className="warning-text">Insufficient credits</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="feature-benefits">
                <h5 className="benefits-title">What you get:</h5>
                <ul className="benefits-list">
                  <li className="benefit-item">
                    <CheckCircle className="benefit-icon" />
                    <span>Priority placement in search results</span>
                  </li>
                  <li className="benefit-item">
                    <CheckCircle className="benefit-icon" />
                    <span>Featured badge on your product</span>
                  </li>
                  <li className="benefit-item">
                    <CheckCircle className="benefit-icon" />
                    <span>Increased visibility for 30 days</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="confirmation-actions">
              <button type="button" className="action-btn cancel-action" onClick={() => setShowFeatureModal(false)}>
                <X className="action-icon" />
                <span>Cancel</span>
              </button>
              <button
                type="button"
                className={`action-btn confirm-action ${creditLeft <= 0 ? "action-disabled" : ""}`}
                disabled={creditLeft <= 0}
                onClick={featureProduct}
              >
                <Star className="action-icon" />
                <span>Feature Product</span>
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
  )
}

     

export default VendorProducts
