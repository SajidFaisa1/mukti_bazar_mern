"use client"

import { useState, useEffect } from "react"
import { getAllDivision, getAllDistrict, getAllUpazila, getAllUnion } from "bd-divisions-to-unions"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../../contexts/VendorAuthContext"
import {
  Upload,
  User,
  Building2,
  MapPin,
  Phone,
  FileText,
  ImageIcon,
  FileCheck,
  Loader2,
  CheckCircle,
  AlertCircle,
} from "lucide-react"
import "./VendorProfileCompletion.css"

// Simple vendor profile completion form
// Adjust fields as per backend schema
const VendorProfileCompletion = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    sellerName: user?.sellerName || "",
    businessName: user?.businessName || "",
    address: { division: "", district: "", union: "" },
    phone: user?.phone || "",
    description: user?.description || "",
    shopLogo: null,
    farmingLicense: null,
    kycDocument: null,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  // load admin area data
  const [divisions, setDivisions] = useState([]) // [{id,name}]
  const [districtMap, setDistrictMap] = useState({}) // key divisionId -> array
  const [upazilaMap, setUpazilaMap] = useState({}) // key districtId -> array
  const [unionMap, setUnionMap] = useState({}) // key upazilaId -> array
  const [districtOptions, setDistrictOptions] = useState([])
  const [unionOptions, setUnionOptions] = useState([])

  useEffect(() => {
    setDivisions(Object.values(getAllDivision("en")))
    setDistrictMap(getAllDistrict("en"))
    setUpazilaMap(getAllUpazila("en"))
    setUnionMap(getAllUnion("en"))
  }, [])

  const [success, setSuccess] = useState("")

  // If the vendor has already been approved by admin, show a friendly message
  if (user?.isApproved) {
    return (
      <div className="vendor-profile-approved">
        <CheckCircle size={64} color="#16a34a" />
        <h2>Your vendor profile is verified &amp; approved!</h2>
        <p>You can now add products and manage your store.</p>
      </div>
    )
  }

  const handleChange = (e) => {
    const { name, value, files } = e.target
    if (files) {
      setForm((prev) => ({ ...prev, [name]: files[0] }))
    } else {
      setForm((prev) => ({ ...prev, [name]: value }))
    }
  }

  // address cascading select handler
  const handleAddressChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({
      ...prev,
      address: {
        ...prev.address,
        [name]: value,
        ...(name === "division" ? { district: "", union: "" } : {}),
        ...(name === "district" ? { union: "" } : {}),
      },
    }))

    if (name === "division") {
      const distsArr = districtMap[value] || []
      setDistrictOptions(distsArr)
      setUnionOptions([])
    }
    if (name === "district") {
      const upazilasArr = upazilaMap[value] || []
      const names = []
      upazilasArr.forEach((u) => {
        names.push(u.title)
        const unionsArr = unionMap[u.value] || []
        unionsArr.forEach((un) => names.push(un.title))
      })
      setUnionOptions(names)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setLoading(true)
    try {
      // convert selected files to base64 strings
      const fileToBase64 = (file) =>
        new Promise((resolve) => {
          if (!file) return resolve(null)
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result)
          reader.readAsDataURL(file)
        })

      const [logo64, license64, kyc64] = await Promise.all([
        fileToBase64(form.shopLogo),
        fileToBase64(form.farmingLicense),
        fileToBase64(form.kycDocument),
      ])

      const payload = {
        sellerName: form.sellerName,
        businessName: form.businessName,
        address: form.address,
        phone: form.phone,
        description: form.description,
        profileCompleted: true,
        shopLogo: logo64 ? { data: logo64 } : undefined,
        farmingLicense: license64 ? { data: license64 } : undefined,
        kycDocument: kyc64 ? { data: kyc64 } : undefined,
      }

      const res = await fetch(`http://localhost:5005/api/vendors/${user.uid}/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const { error: msg = "Failed to update profile" } = await res.json().catch(() => ({}))
        throw new Error(msg)
      }
      setSuccess("Profile completed! Please wait for admin approval.")
      // Delay then redirect to dashboard
      setTimeout(() => navigate("/vendor/dashboard", { state: { message: "Please wait for admin approval." } }), 1500)
    } catch (err) {
      console.error(err)
      setError(err.message || "Failed to update profile")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modern-vendor-profile">
      <div className="modern-profile-container">
        <div className="modern-profile-header">
          <div className="header-content">
            <h1 className="profile-title">Complete Your Vendor Profile</h1>
            <p className="profile-subtitle">Fill in your business details to start selling on our platform</p>
          </div>
          <div className="progress-indicator">
            <div className="progress-step active">
              <div className="step-number">1</div>
              <span>Profile Info</span>
            </div>
            <div className="progress-line"></div>
            <div className="progress-step">
              <div className="step-number">2</div>
              <span>Verification</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="modern-alert modern-alert-error">
            <AlertCircle className="alert-icon" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="modern-alert modern-alert-success">
            <CheckCircle className="alert-icon" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="modern-profile-form">
          {/* Personal Information Section */}
          <div className="form-section">
            <div className="section-header">
              <User className="section-icon" />
              <h3>Personal Information</h3>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="modern-label">
                  <span>Seller Name</span>
                  <span className="required">*</span>
                </label>
                <div className="input-wrapper">
                  <User className="input-icon" />
                  <input
                    name="sellerName"
                    value={form.sellerName}
                    onChange={handleChange}
                    required
                    className="modern-input"
                    placeholder="Enter your full name"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="modern-label">
                  <span>Business Name</span>
                  <span className="required">*</span>
                </label>
                <div className="input-wrapper">
                  <Building2 className="input-icon" />
                  <input
                    name="businessName"
                    value={form.businessName}
                    onChange={handleChange}
                    required
                    className="modern-input"
                    placeholder="Enter your business name"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="modern-label">
                  <span>Phone Number</span>
                  <span className="required">*</span>
                </label>
                <div className="input-wrapper">
                  <Phone className="input-icon" />
                  <input
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    required
                    className="modern-input"
                    placeholder="Enter your phone number"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Address Information Section */}
          <div className="form-section">
            <div className="section-header">
              <MapPin className="section-icon" />
              <h3>Address Information</h3>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="modern-label">
                  <span>Division</span>
                  <span className="required">*</span>
                </label>
                <div className="select-wrapper">
                  <select
                    name="division"
                    value={form.address.division}
                    onChange={handleAddressChange}
                    required
                    className="modern-select"
                  >
                    <option value="">Select Division</option>
                    {divisions.map((div) => (
                      <option key={div.value} value={div.value}>
                        {div.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {districtOptions.length > 0 && (
                <div className="form-group">
                  <label className="modern-label">
                    <span>District/Zilla</span>
                    <span className="required">*</span>
                  </label>
                  <div className="select-wrapper">
                    <select
                      name="district"
                      value={form.address.district}
                      onChange={handleAddressChange}
                      required
                      className="modern-select"
                    >
                      <option value="">Select District</option>
                      {districtOptions.map((d) => (
                        <option key={d.value} value={d.value}>
                          {d.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {unionOptions.length > 0 && (
                <div className="form-group">
                  <label className="modern-label">
                    <span>Union/Upazila</span>
                    <span className="required">*</span>
                  </label>
                  <div className="select-wrapper">
                    <select
                      name="union"
                      value={form.address.union}
                      onChange={handleAddressChange}
                      required
                      className="modern-select"
                    >
                      <option value="">Select Union</option>
                      {unionOptions.map((u, idx) => (
                        <option key={u + idx} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Business Description Section */}
          <div className="form-section">
            <div className="section-header">
              <FileText className="section-icon" />
              <h3>Business Description</h3>
            </div>

            <div className="form-group full-width">
              <label className="modern-label">
                <span>Store Description</span>
              </label>
              <div className="textarea-wrapper">
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows="4"
                  className="modern-textarea"
                  placeholder="Describe your business, products, and services..."
                />
              </div>
            </div>
          </div>

          {/* Document Upload Section */}
          <div className="form-section">
            <div className="section-header">
              <Upload className="section-icon" />
              <h3>Document Upload</h3>
            </div>

            <div className="upload-grid">
              <div className="upload-group">
                <label className="upload-label">
                  <ImageIcon className="upload-icon" />
                  <span className="upload-title">Shop Logo</span>
                  <span className="upload-subtitle">Upload your business logo</span>
                  <input
                    type="file"
                    name="shopLogo"
                    accept="image/*"
                    onChange={handleChange}
                    className="upload-input"
                  />
                  {form.shopLogo && <span className="file-name">{form.shopLogo.name}</span>}
                </label>
              </div>

              <div className="upload-group">
                <label className="upload-label">
                  <FileCheck className="upload-icon" />
                  <span className="upload-title">Farming License</span>
                  <span className="upload-subtitle">Upload license document</span>
                  <input
                    type="file"
                    name="farmingLicense"
                    accept="image/*,application/pdf"
                    onChange={handleChange}
                    className="upload-input"
                  />
                  {form.farmingLicense && <span className="file-name">{form.farmingLicense.name}</span>}
                </label>
              </div>

              <div className="upload-group">
                <label className="upload-label">
                  <FileText className="upload-icon" />
                  <span className="upload-title">KYC Document</span>
                  <span className="upload-subtitle">Upload identification document</span>
                  <input
                    type="file"
                    name="kycDocument"
                    accept="image/*,application/pdf"
                    onChange={handleChange}
                    className="upload-input"
                  />
                  {form.kycDocument && <span className="file-name">{form.kycDocument.name}</span>}
                </label>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="form-actions">
            <button type="submit" disabled={loading} className="modern-submit-btn">
              {loading ? (
                <>
                  <Loader2 className="btn-icon spinning" />
                  Saving Profile...
                </>
              ) : (
                <>
                  <CheckCircle className="btn-icon" />
                  Complete Profile
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default VendorProfileCompletion
