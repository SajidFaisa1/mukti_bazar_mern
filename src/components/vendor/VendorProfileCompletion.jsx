"use client"

import { useState, useEffect } from "react"
import { getAllDivision, getAllDistrict, getAllUpazila, getAllUnion } from "bd-divisions-to-unions"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../../contexts/VendorAuthContext"
import { useApiLoading } from "../../hooks/useLoadingStates.jsx"
import { useLoading } from "../../contexts/LoadingContext"
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
  Shield,
  Eye,
  EyeOff,
  Camera,
  Fingerprint,
  Clock,
} from "lucide-react"
import ClientDeviceFingerprint from "../../services/clientDeviceFingerprint"
import LoadingSpinner from "../common/LoadingSpinner"
import BankingValidationService from "../../services/bankingValidation"

// Simple vendor profile completion form
// Adjust fields as per backend schema
const VendorProfileCompletion = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { startLoading, stopLoading } = useApiLoading()
  const { loadingStates } = useLoading()
  const isSubmitting = loadingStates.api
  const [form, setForm] = useState({
    sellerName: user?.sellerName || "",
    businessName: user?.businessName || "",
    address: { division: "", district: "", union: "" },
    phone: user?.phone || "",
    description: user?.description || "",
    shopLogo: null,
    farmingLicense: null,
    kycDocument: null,
    // Enhanced validation fields
    businessRegistrationNumber: "",
    taxIdentificationNumber: "",
    bankAccountDetails: {
      accountNumber: "",
      bankName: "",
      branchName: "",
      routingNumber: ""
    },
    businessType: "",
    yearsInBusiness: "",
    expectedMonthlyVolume: "",
    primaryProducts: [],
    certifications: [],
    socialMediaLinks: {
      facebook: "",
      website: "",
      whatsapp: ""
    }
  })
  const [error, setError] = useState("")
  const [validationErrors, setValidationErrors] = useState({})
  const [securityChecks, setSecurityChecks] = useState({
    deviceFingerprint: null,
    ipAddress: null,
    locationConsent: false,
    automationDetected: false,
    riskScore: 0
  })
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
    
    // Initialize security checks
    initializeSecurityChecks()
  }, [])

  // Initialize device fingerprinting and security checks
  const initializeSecurityChecks = async () => {
    try {
      // Collect device fingerprint
      const fingerprint = await ClientDeviceFingerprint.collect()
      
      // Get IP address (simplified - in production use proper IP detection)
      const ipResponse = await fetch('https://api.ipify.org?format=json')
        .then(res => res.json())
        .catch(() => ({ ip: 'unknown' }))
      
      setSecurityChecks(prev => ({
        ...prev,
        deviceFingerprint: fingerprint.hash,
        ipAddress: ipResponse.ip,
        automationDetected: fingerprint.automation?.detected || false,
        riskScore: calculateInitialRiskScore(fingerprint)
      }))
    } catch (error) {
      console.warn('Security check initialization failed:', error)
    }
  }

  // Calculate initial risk score based on device fingerprint
  const calculateInitialRiskScore = (fingerprint) => {
    let riskScore = 0
    
    // High risk indicators
    if (fingerprint.automation?.detected) riskScore += 40
    if (fingerprint.userAgent?.includes('HeadlessChrome')) riskScore += 30
    if (!fingerprint.canvas || fingerprint.canvas === 'canvas-blocked') riskScore += 20
    if (!fingerprint.webgl || fingerprint.webgl === 'webgl-blocked') riskScore += 15
    if (fingerprint.plugins?.length === 0) riskScore += 10
    
    // Medium risk indicators
    if (!fingerprint.fonts || fingerprint.fonts.length < 5) riskScore += 5
    if (fingerprint.storage && !fingerprint.storage.localStorage) riskScore += 5
    
    return Math.min(riskScore, 100) // Cap at 100
  }

  // Enhanced validation
  const validateForm = () => {
    const errors = {}
    
    // Basic validations
    if (!form.sellerName.trim()) errors.sellerName = "Seller name is required"
    if (!form.businessName.trim()) errors.businessName = "Business name is required"
    if (!form.phone.trim()) errors.phone = "Phone number is required"
    if (!form.address.division) errors.division = "Division is required"
    if (!form.address.district) errors.district = "District is required"
    if (!form.address.union) errors.union = "Union is required"
    
    // Enhanced validations
    if (!form.businessRegistrationNumber.trim()) {
      errors.businessRegistrationNumber = "Business registration number is required"
    } else if (!/^[A-Z0-9]{6,20}$/.test(form.businessRegistrationNumber)) {
      errors.businessRegistrationNumber = "Invalid business registration format"
    }
    
    if (!form.taxIdentificationNumber.trim()) {
      errors.taxIdentificationNumber = "Tax identification number is required"
    }
    
    if (!form.businessType) {
      errors.businessType = "Please select your business type"
    }
    
    if (!form.yearsInBusiness || form.yearsInBusiness < 0) {
      errors.yearsInBusiness = "Please specify years in business"
    }
    
    if (!form.expectedMonthlyVolume) {
      errors.expectedMonthlyVolume = "Please estimate your monthly volume"
    }
    
    // Enhanced banking validation using validation service
    const bankingValidation = BankingValidationService.validateBankingInfo({
      accountNumber: form.bankAccountDetails.accountNumber,
      bankName: form.bankAccountDetails.bankName,
      routingNumber: form.bankAccountDetails.routingNumber,
      branchName: form.bankAccountDetails.branchName
    });
    
    if (!bankingValidation.isValid) {
      Object.assign(errors, bankingValidation.errors);
    }
    
    // Phone validation
    if (!/^(\+88)?01[3-9]\d{8}$/.test(form.phone.replace(/\s/g, ''))) {
      errors.phone = "Please enter a valid Bangladeshi phone number"
    }
    
    // Document validation
    if (!form.farmingLicense) {
      errors.farmingLicense = "Farming license is required"
    }
    
    if (!form.kycDocument) {
      errors.kycDocument = "KYC document is required"
    }
    
    // Security validation
    if (securityChecks.riskScore > 70) {
      errors.security = "High risk detected. Please contact support for manual verification."
    }
    
    return errors
  }

  const [success, setSuccess] = useState("")

  // If the vendor has already been approved by admin, show a friendly message
  if (user?.isApproved) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50">
        <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg p-8 text-center border border-green-100">
          <div className="mb-6">
            <CheckCircle size={64} className="mx-auto text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-green-800 mb-4">Profile Verified & Approved!</h2>
          <p className="text-green-700 mb-6">Your vendor profile has been successfully verified. You can now add products and manage your agricultural store.</p>
          <button 
            onClick={() => navigate('/vendor/dashboard')}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    )
  }

  // If the vendor has submitted their profile but not yet approved, show waiting message
  if (user?.isSubmitted && !user?.isApproved) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50">
        <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg p-8 text-center border border-amber-200">
          <div className="mb-6">
            <Clock size={64} className="mx-auto text-amber-600" />
          </div>
          <h2 className="text-2xl font-bold text-amber-800 mb-4">Profile Under Review</h2>
          <p className="text-amber-700 mb-6">
            Your profile has been submitted successfully and is currently under admin review. 
            You will be notified once your profile is approved.
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-amber-800">
              <strong>Review Status:</strong> {user?.verificationStatus || 'Under Review'}
            </p>
            {user?.verificationLevel && (
              <p className="text-sm text-amber-800 mt-1">
                <strong>Verification Level:</strong> {user.verificationLevel.replace('_', ' ')}
              </p>
            )}
          </div>
          <button 
            onClick={() => navigate('/vendor/dashboard')}
            className="w-full bg-amber-600 hover:bg-amber-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    )
  }

  const handleChange = (e) => {
    const { name, value, files } = e.target
    
    // Clear validation error for this field
    if (validationErrors[name]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
    
    if (files) {
      // Validate file size (5MB limit)
      if (files[0].size > 5 * 1024 * 1024) {
        setValidationErrors(prev => ({
          ...prev,
          [name]: "File size must be less than 5MB"
        }))
        return
      }
      
      // Validate file type
      const allowedTypes = {
        shopLogo: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'],
        farmingLicense: ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'],
        kycDocument: ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
      }
      
      if (allowedTypes[name] && !allowedTypes[name].includes(files[0].type)) {
        setValidationErrors(prev => ({
          ...prev,
          [name]: "Invalid file type"
        }))
        return
      }
      
      setForm((prev) => ({ ...prev, [name]: files[0] }))
    } else {
      // Handle nested objects
      if (name.includes('.')) {
        const [parent, child] = name.split('.')
        setForm((prev) => ({
          ...prev,
          [parent]: {
            ...prev[parent],
            [child]: value
          }
        }))
      } else {
        setForm((prev) => ({ ...prev, [name]: value }))
      }
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
    
    // Validate form
    const errors = validateForm()
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors)
      setError("Please fix the validation errors before submitting.")
      return
    }
    
    try {
      startLoading("Processing your profile...")
      
      // Collect final device fingerprint and security data
      const finalFingerprint = await ClientDeviceFingerprint.collect()
      
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
        // Basic info
        sellerName: form.sellerName,
        businessName: form.businessName,
        address: form.address,
        phone: form.phone,
        description: form.description,
        profileCompleted: true,
        
        // Enhanced validation data
        businessRegistrationNumber: form.businessRegistrationNumber,
        taxIdentificationNumber: form.taxIdentificationNumber,
        bankAccountDetails: form.bankAccountDetails,
        businessType: form.businessType,
        yearsInBusiness: parseInt(form.yearsInBusiness),
        expectedMonthlyVolume: form.expectedMonthlyVolume,
        primaryProducts: form.primaryProducts,
        certifications: form.certifications,
        socialMediaLinks: form.socialMediaLinks,
        
        // Documents
        shopLogo: logo64 ? { data: logo64 } : undefined,
        farmingLicense: license64 ? { data: license64 } : undefined,
        kycDocument: kyc64 ? { data: kyc64 } : undefined,
        
        // Security and fraud prevention data
        securityInfo: {
          deviceFingerprint: finalFingerprint.hash,
          deviceDetails: {
            userAgent: finalFingerprint.userAgent,
            platform: finalFingerprint.platform,
            language: finalFingerprint.language,
            timezone: finalFingerprint.timezone,
            screen: finalFingerprint.screen
          },
          ipAddress: securityChecks.ipAddress,
          riskScore: securityChecks.riskScore,
          automationDetected: finalFingerprint.automation?.detected || false,
          fingerprintComponents: {
            canvas: finalFingerprint.canvas !== 'canvas-blocked',
            webgl: finalFingerprint.webgl !== 'webgl-blocked',
            audio: finalFingerprint.audio !== 'audio-blocked',
            fonts: finalFingerprint.fonts?.length || 0,
            plugins: finalFingerprint.plugins?.length || 0
          },
          locationData: finalFingerprint.geolocation || null,
          connectionInfo: finalFingerprint.connection || null,
          submissionTime: new Date().toISOString()
        },
        
        // Verification status
        verificationLevel: securityChecks.riskScore < 30 ? 'low_risk' : 
                          securityChecks.riskScore < 60 ? 'medium_risk' : 'high_risk'
      }

      const res = await fetch(`http://localhost:5005/api/vendors/${user.uid}/profile`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "X-Device-Fingerprint": finalFingerprint.hash,
          "X-Risk-Score": securityChecks.riskScore.toString()
        },
        body: JSON.stringify(payload),
      })
      
      if (!res.ok) {
        const { error: msg = "Failed to update profile" } = await res.json().catch(() => ({}))
        throw new Error(msg)
      }
      
      const responseData = await res.json()
      setSuccess(responseData.requiresManualReview ? 
        "Profile submitted for enhanced verification due to security checks." :
        "Profile completed! Please wait for admin approval.")
      
      // Delay then redirect to dashboard
      setTimeout(() => navigate("/vendor/dashboard", { 
        state: { 
          message: responseData.requiresManualReview ? 
            "Your profile is under enhanced security review." :
            "Please wait for admin approval.",
          riskLevel: payload.verificationLevel
        } 
      }), 2000)
      
    } catch (err) {
      console.error(err)
      setError(err.message || "Failed to update profile")
    } finally {
      stopLoading()
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="bg-white rounded-xl shadow-lg border border-green-100 mb-8 overflow-hidden">
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2">Complete Your Vendor Profile</h1>
                <p className="text-green-100">Join our agricultural marketplace and start connecting with farmers and buyers</p>
              </div>
              <div className="hidden md:flex items-center space-x-4">
                <div className="flex items-center bg-white/20 rounded-lg px-4 py-2">
                  <div className="w-8 h-8 bg-white text-green-600 rounded-full flex items-center justify-center text-sm font-bold mr-3">1</div>
                  <span className="text-sm">Profile Info</span>
                </div>
                <div className="w-8 h-0.5 bg-white/30"></div>
                <div className="flex items-center bg-white/10 rounded-lg px-4 py-2">
                  <div className="w-8 h-8 bg-white/30 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">2</div>
                  <span className="text-sm opacity-70">Verification</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Security Status Banner */}
        {securityChecks.deviceFingerprint && (
          <div className={`rounded-lg p-4 mb-6 flex items-center ${
            securityChecks.riskScore < 30 ? 'bg-green-50 border border-green-200' :
            securityChecks.riskScore < 60 ? 'bg-yellow-50 border border-yellow-200' :
            'bg-red-50 border border-red-200'
          }`}>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-4 ${
              securityChecks.riskScore < 30 ? 'bg-green-100' :
              securityChecks.riskScore < 60 ? 'bg-yellow-100' :
              'bg-red-100'
            }`}>
              <Shield className={`h-5 w-5 ${
                securityChecks.riskScore < 30 ? 'text-green-600' :
                securityChecks.riskScore < 60 ? 'text-yellow-600' :
                'text-red-600'
              }`} />
            </div>
            <div className="flex-1">
              <div className={`font-semibold ${
                securityChecks.riskScore < 30 ? 'text-green-800' :
                securityChecks.riskScore < 60 ? 'text-yellow-800' :
                'text-red-800'
              }`}>
                Security Status: {securityChecks.riskScore < 30 ? 'Verified' : 
                                securityChecks.riskScore < 60 ? 'Under Review' : 'High Risk'}
              </div>
              <div className={`text-sm ${
                securityChecks.riskScore < 30 ? 'text-green-600' :
                securityChecks.riskScore < 60 ? 'text-yellow-600' :
                'text-red-600'
              }`}>
                <Fingerprint className="inline h-4 w-4 mr-1" />
                Device verified • Risk Score: {securityChecks.riskScore}%
                {securityChecks.automationDetected && ' • Automation detected'}
              </div>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-3 flex-shrink-0" />
            <span className="text-red-700">{error}</span>
          </div>
        )}

        {/* Success Alert */}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-center">
            <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
            <span className="text-green-700">{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Personal Information Section */}
          <div className="bg-white rounded-xl shadow-lg border border-green-100 overflow-hidden">
            <div className="bg-gradient-to-r from-green-100 to-emerald-100 p-6 border-b border-green-200">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center mr-4">
                  <User className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-green-800">Personal Information</h3>
                  <p className="text-green-600 text-sm">Tell us about yourself and your business</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Seller Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-green-500" />
                    <input
                      name="sellerName"
                      value={form.sellerName}
                      onChange={handleChange}
                      required
                      className="w-full pl-10 pr-4 py-3 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                      placeholder="Enter your full name"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Business Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-green-500" />
                    <input
                      name="businessName"
                      value={form.businessName}
                      onChange={handleChange}
                      required
                      className="w-full pl-10 pr-4 py-3 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                      placeholder="Enter your business name"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-green-500" />
                    <input
                      name="phone"
                      value={form.phone}
                      onChange={handleChange}
                      required
                      className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors ${
                        validationErrors.phone ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-green-200'
                      }`}
                      placeholder="01XXXXXXXXX"
                    />
                  </div>
                  {validationErrors.phone && (
                    <p className="text-red-500 text-xs mt-1">{validationErrors.phone}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Business Verification Section */}
          <div className="bg-white rounded-xl shadow-lg border border-green-100 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-100 to-indigo-100 p-6 border-b border-green-200">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center mr-4">
                  <Building2 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-blue-800">Business Verification</h3>
                  <p className="text-blue-600 text-sm">Provide official business documentation and details</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Business Registration Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="businessRegistrationNumber"
                    value={form.businessRegistrationNumber}
                    onChange={handleChange}
                    required
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors ${
                      validationErrors.businessRegistrationNumber ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-green-200'
                    }`}
                    placeholder="e.g., TRAD/DHAKA/123456"
                  />
                  {validationErrors.businessRegistrationNumber && (
                    <p className="text-red-500 text-xs mt-1">{validationErrors.businessRegistrationNumber}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Tax Identification Number (TIN) <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="taxIdentificationNumber"
                    value={form.taxIdentificationNumber}
                    onChange={handleChange}
                    required
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors ${
                      validationErrors.taxIdentificationNumber ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-green-200'
                    }`}
                    placeholder="12-digit TIN number"
                  />
                  {validationErrors.taxIdentificationNumber && (
                    <p className="text-red-500 text-xs mt-1">{validationErrors.taxIdentificationNumber}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Business Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="businessType"
                    value={form.businessType}
                    onChange={handleChange}
                    required
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors bg-white ${
                      validationErrors.businessType ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-green-200'
                    }`}
                  >
                    <option value="">Select Business Type</option>
                    <option value="farmer">Individual Farmer</option>
                    <option value="cooperative">Farmers' Cooperative</option>
                    <option value="wholesaler">Agricultural Wholesaler</option>
                    <option value="processor">Food Processor</option>
                    <option value="retailer">Agricultural Retailer</option>
                    <option value="exporter">Agricultural Exporter</option>
                    <option value="supplier">Input Supplier</option>
                  </select>
                  {validationErrors.businessType && (
                    <p className="text-red-500 text-xs mt-1">{validationErrors.businessType}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Years in Business <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="yearsInBusiness"
                    type="number"
                    min="0"
                    max="50"
                    value={form.yearsInBusiness}
                    onChange={handleChange}
                    required
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors ${
                      validationErrors.yearsInBusiness ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-green-200'
                    }`}
                    placeholder="e.g., 5"
                  />
                  {validationErrors.yearsInBusiness && (
                    <p className="text-red-500 text-xs mt-1">{validationErrors.yearsInBusiness}</p>
                  )}
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Expected Monthly Volume <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="expectedMonthlyVolume"
                    value={form.expectedMonthlyVolume}
                    onChange={handleChange}
                    required
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors bg-white ${
                      validationErrors.expectedMonthlyVolume ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-green-200'
                    }`}
                  >
                    <option value="">Select Expected Volume</option>
                    <option value="under-10k">Under ৳10,000</option>
                    <option value="10k-50k">৳10,000 - ৳50,000</option>
                    <option value="50k-200k">৳50,000 - ৳2,00,000</option>
                    <option value="200k-500k">৳2,00,000 - ৳5,00,000</option>
                    <option value="500k-1m">৳5,00,000 - ৳10,00,000</option>
                    <option value="over-1m">Over ৳10,00,000</option>
                  </select>
                  {validationErrors.expectedMonthlyVolume && (
                    <p className="text-red-500 text-xs mt-1">{validationErrors.expectedMonthlyVolume}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Banking Information Section */}
          <div className="bg-white rounded-xl shadow-lg border border-green-100 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-100 to-pink-100 p-6 border-b border-green-200">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center mr-4">
                  <Building2 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-purple-800">Banking Information</h3>
                  <p className="text-purple-600 text-sm">Secure payment processing details</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Bank Name <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="bankAccountDetails.bankName"
                    value={form.bankAccountDetails.bankName}
                    onChange={handleChange}
                    required
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors bg-white ${
                      validationErrors.bankName ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-green-200'
                    }`}
                  >
                    <option value="">Select Your Bank</option>
                    {BankingValidationService.getBankNames().map((bankName) => (
                      <option key={bankName} value={bankName}>
                        {bankName}
                      </option>
                    ))}
                  </select>
                  {validationErrors.bankName && (
                    <p className="text-red-500 text-xs mt-1">{validationErrors.bankName}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Bank Account Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="bankAccountDetails.accountNumber"
                    value={form.bankAccountDetails.accountNumber}
                    onChange={handleChange}
                    required
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors ${
                      validationErrors.accountNumber ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-green-200'
                    }`}
                    placeholder="1234567890123"
                    maxLength="20"
                  />
                  {validationErrors.accountNumber && (
                    <p className="text-red-500 text-xs mt-1">{validationErrors.accountNumber}</p>
                  )}
                  {form.bankAccountDetails.accountNumber && BankingValidationService.validateAccountNumber(form.bankAccountDetails.accountNumber, form.bankAccountDetails.bankName) && (
                    <p className="text-green-600 text-xs mt-1">✓ Account number format is valid</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Routing Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="bankAccountDetails.routingNumber"
                    value={form.bankAccountDetails.routingNumber}
                    onChange={handleChange}
                    required
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors ${
                      validationErrors.routingNumber ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-green-200'
                    }`}
                    placeholder="123456789"
                    maxLength="9"
                  />
                  {validationErrors.routingNumber && (
                    <p className="text-red-500 text-xs mt-1">{validationErrors.routingNumber}</p>
                  )}
                  {form.bankAccountDetails.routingNumber && BankingValidationService.validateRoutingNumber(form.bankAccountDetails.routingNumber, form.bankAccountDetails.bankName) && (
                    <p className="text-green-600 text-xs mt-1">✓ Routing number format is valid</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Branch Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="bankAccountDetails.branchName"
                    value={form.bankAccountDetails.branchName}
                    onChange={handleChange}
                    required
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors ${
                      validationErrors.branchName ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-green-200'
                    }`}
                    placeholder="e.g., Dhanmondi Branch"
                  />
                  {validationErrors.branchName && (
                    <p className="text-red-500 text-xs mt-1">{validationErrors.branchName}</p>
                  )}
                </div>
              </div>

              {/* Banking Information Help */}
              {form.bankAccountDetails.bankName && (
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-2">Banking Information Guide</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Account numbers should be {BankingValidationService.getBankInfo(form.bankAccountDetails.bankName)?.accountPattern ? '13 digits' : '11-13 digits'}</li>
                    <li>• Routing numbers should be 9 digits</li>
                    <li>• Double-check all information to avoid payment delays</li>
                    <li>• This information will be used for secure payments</li>
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Contact & Social Media Section */}
          <div className="bg-white rounded-xl shadow-lg border border-green-100 overflow-hidden">
            <div className="bg-gradient-to-r from-cyan-100 to-blue-100 p-6 border-b border-green-200">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-cyan-600 rounded-lg flex items-center justify-center mr-4">
                  <Phone className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-cyan-800">Contact & Social Media</h3>
                  <p className="text-cyan-600 text-sm">Help customers find and connect with you</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Facebook Page
                  </label>
                  <input
                    name="socialMediaLinks.facebook"
                    value={form.socialMediaLinks.facebook}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                    placeholder="https://facebook.com/yourpage"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    WhatsApp Number
                  </label>
                  <input
                    name="socialMediaLinks.whatsapp"
                    value={form.socialMediaLinks.whatsapp}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                    placeholder="01XXXXXXXXX"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Website
                  </label>
                  <input
                    name="socialMediaLinks.website"
                    value={form.socialMediaLinks.website}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                    placeholder="https://yourwebsite.com"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Address Information Section */}
          <div className="bg-white rounded-xl shadow-lg border border-green-100 overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-100 to-teal-100 p-6 border-b border-green-200">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center mr-4">
                  <MapPin className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-emerald-800">Address Information</h3>
                  <p className="text-emerald-600 text-sm">Where is your business located?</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Division <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="division"
                    value={form.address.division}
                    onChange={handleAddressChange}
                    required
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors bg-white ${
                      validationErrors.division ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-green-200'
                    }`}
                  >
                    <option value="">Select Division</option>
                    {divisions.map((div) => (
                      <option key={div.value} value={div.value}>
                        {div.title}
                      </option>
                    ))}
                  </select>
                  {validationErrors.division && (
                    <p className="text-red-500 text-xs mt-1">{validationErrors.division}</p>
                  )}
                </div>

                {districtOptions.length > 0 && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      District/Zilla <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="district"
                      value={form.address.district}
                      onChange={handleAddressChange}
                      required
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors bg-white ${
                        validationErrors.district ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-green-200'
                      }`}
                    >
                      <option value="">Select District</option>
                      {districtOptions.map((d) => (
                        <option key={d.value} value={d.value}>
                          {d.title}
                        </option>
                      ))}
                    </select>
                    {validationErrors.district && (
                      <p className="text-red-500 text-xs mt-1">{validationErrors.district}</p>
                    )}
                  </div>
                )}

                {unionOptions.length > 0 && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Union/Upazila <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="union"
                      value={form.address.union}
                      onChange={handleAddressChange}
                      required
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors bg-white ${
                        validationErrors.union ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-green-200'
                      }`}
                    >
                      <option value="">Select Union</option>
                      {unionOptions.map((u, idx) => (
                        <option key={u + idx} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                    {validationErrors.union && (
                      <p className="text-red-500 text-xs mt-1">{validationErrors.union}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Business Description Section */}
          <div className="bg-white rounded-xl shadow-lg border border-green-100 overflow-hidden">
            <div className="bg-gradient-to-r from-teal-100 to-cyan-100 p-6 border-b border-green-200">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-teal-600 rounded-lg flex items-center justify-center mr-4">
                  <FileText className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-teal-800">Business Description</h3>
                  <p className="text-teal-600 text-sm">Describe your agricultural business</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Store Description
                </label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows="4"
                  className="w-full px-4 py-3 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors resize-none"
                  placeholder="Describe your business, products, and services... Tell customers about your agricultural expertise and what makes your products special."
                />
              </div>
            </div>
          </div>

          {/* Document Upload Section */}
          <div className="bg-white rounded-xl shadow-lg border border-green-100 overflow-hidden">
            <div className="bg-gradient-to-r from-amber-100 to-orange-100 p-6 border-b border-green-200">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-amber-600 rounded-lg flex items-center justify-center mr-4">
                  <Upload className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-amber-800">Document Upload</h3>
                  <p className="text-amber-600 text-sm">Upload your business documents for verification</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-4">
                  <label className="block cursor-pointer">
                    <div className={`border-2 border-dashed rounded-lg p-6 text-center hover:border-green-400 hover:bg-green-50 transition-colors ${
                      validationErrors.shopLogo ? 'border-red-300 bg-red-50' : 'border-green-300'
                    }`}>
                      <ImageIcon className="h-10 w-10 text-green-500 mx-auto mb-3" />
                      <div className="text-sm font-medium text-gray-700 mb-1">Shop Logo</div>
                      <div className="text-xs text-gray-500 mb-3">Upload your business logo (Max 5MB)</div>
                      <input
                        type="file"
                        name="shopLogo"
                        accept="image/*"
                        onChange={handleChange}
                        className="hidden"
                      />
                      {form.shopLogo && (
                        <div className="mt-2 text-xs text-green-600 font-medium">
                          ✓ {form.shopLogo.name}
                        </div>
                      )}
                    </div>
                    {validationErrors.shopLogo && (
                      <p className="text-red-500 text-xs mt-1">{validationErrors.shopLogo}</p>
                    )}
                  </label>
                </div>

                <div className="space-y-4">
                  <label className="block cursor-pointer">
                    <div className={`border-2 border-dashed rounded-lg p-6 text-center hover:border-green-400 hover:bg-green-50 transition-colors ${
                      validationErrors.farmingLicense ? 'border-red-300 bg-red-50' : 'border-green-300'
                    }`}>
                      <FileCheck className="h-10 w-10 text-green-500 mx-auto mb-3" />
                      <div className="text-sm font-medium text-gray-700 mb-1">Farming License <span className="text-red-500">*</span></div>
                      <div className="text-xs text-gray-500 mb-3">Upload license document (Max 5MB)</div>
                      <input
                        type="file"
                        name="farmingLicense"
                        accept="image/*,application/pdf"
                        onChange={handleChange}
                        className="hidden"
                      />
                      {form.farmingLicense && (
                        <div className="mt-2 text-xs text-green-600 font-medium">
                          ✓ {form.farmingLicense.name}
                        </div>
                      )}
                    </div>
                    {validationErrors.farmingLicense && (
                      <p className="text-red-500 text-xs mt-1">{validationErrors.farmingLicense}</p>
                    )}
                  </label>
                </div>

                <div className="space-y-4">
                  <label className="block cursor-pointer">
                    <div className={`border-2 border-dashed rounded-lg p-6 text-center hover:border-green-400 hover:bg-green-50 transition-colors ${
                      validationErrors.kycDocument ? 'border-red-300 bg-red-50' : 'border-green-300'
                    }`}>
                      <FileText className="h-10 w-10 text-green-500 mx-auto mb-3" />
                      <div className="text-sm font-medium text-gray-700 mb-1">KYC Document <span className="text-red-500">*</span></div>
                      <div className="text-xs text-gray-500 mb-3">Upload identification document (Max 5MB)</div>
                      <input
                        type="file"
                        name="kycDocument"
                        accept="image/*,application/pdf"
                        onChange={handleChange}
                        className="hidden"
                      />
                      {form.kycDocument && (
                        <div className="mt-2 text-xs text-green-600 font-medium">
                          ✓ {form.kycDocument.name}
                        </div>
                      )}
                    </div>
                    {validationErrors.kycDocument && (
                      <p className="text-red-500 text-xs mt-1">{validationErrors.kycDocument}</p>
                    )}
                  </label>
                </div>
              </div>

              {/* Security validation error */}
              {validationErrors.security && (
                <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center">
                    <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                    <span className="text-red-700 font-medium">{validationErrors.security}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-center pb-8">
            <button 
              type="submit" 
              disabled={isSubmitting} 
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-4 px-8 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:transform-none disabled:cursor-not-allowed flex items-center space-x-3 text-lg"
            >
              {isSubmitting ? (
                <>
                  <LoadingSpinner size="small" className="border-white border-t-green-300" />
                  <span>Processing Profile...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5" />
                  <span>Complete Profile</span>
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
