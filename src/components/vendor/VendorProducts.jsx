"use client"

import { useState, useEffect } from "react"
import { useAuth } from "../../contexts/VendorAuthContext"
import {
  Plus,
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
} from "lucide-react"
import "./VendorProducts.css"

const VendorProducts = () => {
  const { user } = useAuth()
    const apiBase = 'http://localhost:5005/api';
  const [products, setProducts] = useState([]);

  // Fetch products for this vendor
  useEffect(() => {
    if (!user?.storeId) return;
    fetch(`${apiBase}/products/vendor/${user.storeId}`)
      .then(res => res.json())
      .then(data => setProducts(Array.isArray(data) ? data : []))
      .catch(console.error);
  }, [user]);
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
    e.preventDefault();
    if (!newProduct.name || !newProduct.category) {
      alert('Name and category required');
      return;
    }

    const payload = {
      ...newProduct,
      images: newProduct.images.map(f => URL.createObjectURL(f)), // TODO: proper upload
      vendorUid: user.uid,
      storeId: user.storeId,
    };
    try {
      const res = await fetch(`${apiBase}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to save');
      const saved = await res.json();
      setProducts(prev => [...prev, saved]);
      setNewProduct(initialProduct);
      setShowAddForm(false);
    } catch (err) {
      alert(err.message);
      console.error(err);
    }
  }

  const deleteProduct = async (id) => {
    try {
      const res = await fetch(`${apiBase}/products/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      setProducts(prev => prev.filter(p => p._id !== id && p.id !== id));
    } catch (err) {
      alert(err.message);
      console.error(err);
    }
  }

  return (
    <div className="modern-vendor-products">
      <div className="vendor-header">
        <div className="header-content">
          <h1 className="page-title">My Products</h1>
          <p className="page-subtitle">Manage your agricultural products and inventory</p>
        </div>
        <button className="modern-add-btn" onClick={() => setShowAddForm(true)}>
          <Plus className="btn-icon" />
          Add New Product
        </button>
      </div>

      {showAddForm && (
        <div className="modern-modal-overlay">
          <div className="modern-modal">
            <div className="modal-header">
              <div className="modal-title-section">
                <Package className="modal-icon" />
                <h2 className="modal-title">Add New Product</h2>
              </div>
              <button className="modal-close" onClick={() => setShowAddForm(false)}>
                <X className="close-icon" />
              </button>
            </div>

            <form className="modern-product-form" onSubmit={handleSubmit}>
              {/* Basic Information Section */}
              <div className="form-section">
                <div className="section-header">
                  <Tag className="section-icon" />
                  <h3>Basic Information</h3>
                </div>

                <div className="form-grid">
                  <div className="form-group full-width">
                    <label className="modern-label">
                      <span>Product Name</span>
                      <span className="required">*</span>
                    </label>
                    <div className="input-wrapper">
                      <Package className="input-icon" />
                      <input
                        name="name"
                        value={newProduct.name}
                        onChange={handleInputChange}
                        required
                        className="modern-input"
                        placeholder="Enter product name"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="modern-label">
                      <span>Category</span>
                      <span className="required">*</span>
                    </label>
                    <div className="select-wrapper">
                      <select
                        name="category"
                        value={newProduct.category}
                        onChange={handleInputChange}
                        required
                        className="modern-select"
                      >
                        <option value="">Select category</option>
                        <option>Animal Feed</option>
                        <option>Seeds</option>
                        <option>Fertilizer</option>
                        <option>Machinery</option>
                        <option>Fresh Produce</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group full-width">
                    <label className="modern-label">
                      <span>Description</span>
                      <span className="required">*</span>
                    </label>
                    <div className="textarea-wrapper">
                      <textarea
                        name="description"
                        value={newProduct.description}
                        onChange={handleInputChange}
                        required
                        className="modern-textarea"
                        placeholder="Describe your product in detail..."
                        rows="4"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Pricing Section */}
              <div className="form-section">
                <div className="section-header">
                  <DollarSign className="section-icon" />
                  <h3>Pricing & Quantity</h3>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="modern-label">
                      <span>Unit Price (BDT)</span>
                      <span className="required">*</span>
                    </label>
                    <div className="input-wrapper">
                      <DollarSign className="input-icon" />
                      <input
                        type="number"
                        name="unitPrice"
                        value={newProduct.unitPrice}
                        onChange={handleInputChange}
                        min="0"
                        step="0.01"
                        required
                        className="modern-input"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="modern-label">
                      <span>Offer Price (BDT)</span>
                    </label>
                    <div className="input-wrapper">
                      <Tag className="input-icon" />
                      <input
                        type="number"
                        name="offerPrice"
                        value={newProduct.offerPrice}
                        onChange={handleInputChange}
                        min="0"
                        step="0.01"
                        className="modern-input"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="modern-label">
                      <span>Unit Type</span>
                    </label>
                    <div className="select-wrapper">
                      <select
                        name="unitType"
                        value={newProduct.unitType}
                        onChange={handleInputChange}
                        className="modern-select"
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
                    <label className="modern-label">
                      <span>Min Order Qty</span>
                      <span className="required">*</span>
                    </label>
                    <div className="input-wrapper">
                      <Scale className="input-icon" />
                      <input
                        type="number"
                        name="minOrderQty"
                        value={newProduct.minOrderQty}
                        onChange={handleInputChange}
                        min="1"
                        required
                        className="modern-input"
                        placeholder="1"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="modern-label">
                      <span>Total Qty</span>
                      <span className="required">*</span>
                    </label>
                    <div className="input-wrapper">
                      <Package className="input-icon" />
                      <input
                        type="number"
                        name="totalQty"
                        value={newProduct.totalQty}
                        onChange={handleInputChange}
                        min="0"
                        required
                        className="modern-input"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Delivery & Options Section */}
              <div className="form-section">
                <div className="section-header">
                  <Truck className="section-icon" />
                  <h3>Delivery & Options</h3>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="modern-label">
                      <span>Delivery Option</span>
                    </label>
                    <div className="select-wrapper">
                      <select
                        name="deliveryOption"
                        value={newProduct.deliveryOption}
                        onChange={handleInputChange}
                        className="modern-select"
                      >
                        <option value="Pickup">Pickup</option>
                        <option value="Home Delivery">Home Delivery</option>
                        <option value="Negotiable">Negotiable</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="modern-label">
                      <span>Estimated Delivery Time</span>
                    </label>
                    <div className="input-wrapper">
                      <Calendar className="input-icon" />
                      <input
                        name="estDeliveryTime"
                        value={newProduct.estDeliveryTime}
                        onChange={handleInputChange}
                        className="modern-input"
                        placeholder="e.g., 3 days"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="modern-label">
                      <span>Shelf Life / Expiry</span>
                    </label>
                    <div className="input-wrapper">
                      <Calendar className="input-icon" />
                      <input
                        name="shelfLife"
                        value={newProduct.shelfLife}
                        onChange={handleInputChange}
                        className="modern-input"
                        placeholder="e.g., 6 months"
                      />
                    </div>
                  </div>

                  <div className="form-group full-width">
                    <div className="checkbox-group">
                      <label className="modern-checkbox">
                        <input
                          type="checkbox"
                          name="barterAvailable"
                          checked={newProduct.barterAvailable}
                          onChange={handleInputChange}
                        />
                        <span className="checkmark"></span>
                        <span className="checkbox-text">Barter Available</span>
                      </label>
                      <label className="modern-checkbox">
                        <input
                          type="checkbox"
                          name="negotiationAvailable"
                          checked={newProduct.negotiationAvailable}
                          onChange={handleInputChange}
                        />
                        <span className="checkmark"></span>
                        <span className="checkbox-text">Negotiation Available</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Image Upload Section */}
              <div className="form-section">
                <div className="section-header">
                  <ImageIcon className="section-icon" />
                  <h3>Product Images</h3>
                </div>

                <div className="upload-section">
                  <label className="upload-area">
                    <Upload className="upload-icon" />
                    <span className="upload-title">Upload Product Images</span>
                    <span className="upload-subtitle">Choose up to 3 images (JPG, PNG)</span>
                    <input
                      type="file"
                      name="images"
                      accept="image/*"
                      multiple
                      onChange={handleInputChange}
                      required
                      className="upload-input"
                    />
                    {newProduct.images.length > 0 && (
                      <span className="file-count">{newProduct.images.length} file(s) selected</span>
                    )}
                  </label>
                </div>
              </div>

              {/* Form Actions */}
              <div className="form-actions">
                <button type="button" className="cancel-btn" onClick={() => setShowAddForm(false)}>
                  <X className="btn-icon" />
                  Cancel
                </button>
                <button type="submit" className="save-btn">
                  <CheckCircle className="btn-icon" />
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="products-grid">
        {products.map((p) => (
          <div key={p.id} className="modern-product-card">
            {p.images[0] && <img src={p.images[0] || "/placeholder.svg"} alt={p.name} className="product-image" />}
            <div className="product-content">
              <div className="product-header">
                <h3 className="product-name">{p.name}</h3>
                <span className="product-category">{p.category}</span>
              </div>
              <p className="product-description">{p.description}</p>
              <div className="product-pricing">
                <span className="current-price">৳{p.unitPrice}</span>
                {p.offerPrice && <span className="offer-price">৳{p.offerPrice}</span>}
                <span className="unit-type">per {p.unitType}</span>
              </div>
              <div className="product-stock">
                <Package className="stock-icon" />
                <span>
                  Available: {p.totalQty} {p.unitType}
                </span>
              </div>
              <div className="product-actions">
                <button className="delete-btn" onClick={() => deleteProduct(p.id)}>
                  <Trash2 className="btn-icon" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {products.length === 0 && !showAddForm && (
        <div className="empty-state">
          <div className="empty-content">
            <Package className="empty-icon" />
            <h3>No Products Yet</h3>
            <p>You haven't added any products yet. Start by adding your first product to showcase your offerings.</p>
            <button className="empty-action-btn" onClick={() => setShowAddForm(true)}>
              <Plus className="btn-icon" />
              Add Your First Product
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default VendorProducts
