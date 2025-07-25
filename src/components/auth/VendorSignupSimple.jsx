"use client"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useVendorAuth } from "../../contexts/VendorAuthContext"
import { Eye, EyeOff, Loader2, AlertCircle } from "lucide-react"
import "./vendor-signup.css"

const VendorSignupSimple = () => {
  const navigate = useNavigate()
  const { signupVendor } = useVendorAuth()
  const [form, setForm] = useState({
    businessName: "",
    email: "",
    password: "",
    confirmPassword: "",
  })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setError("")
    if (form.password !== form.confirmPassword) {
      return setError("Passwords do not match")
    }
    try {
      setLoading(true)
      await signupVendor(form)
      alert("Account created! Verify your email then log in.")
      navigate("/login")
    } catch (err) {
      setError(err.message || "Signup failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modern-auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2 className="auth-title">Create Vendor Account</h2>
          <p className="auth-subtitle">
            Don't have an account? <a href="/login">Sign in here</a> it takes less than a minute.
          </p>
        </div>

        {error && (
          <div className="error-alert">
            <AlertCircle className="alert-icon" />
            <span className="error-text">{error}</span>
          </div>
        )}

        <form className="modern-auth-form" onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Business Name</label>
            <div className="input-wrapper">
              <input
                name="businessName"
                placeholder="Enter your business name"
                value={form.businessName}
                onChange={handleChange}
                required
                className="modern-input"
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Email ID</label>
            <div className="input-wrapper">
              <input
                type="email"
                name="email"
                placeholder="Enter your email address"
                value={form.email}
                onChange={handleChange}
                required
                className="modern-input"
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="input-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Create a strong password"
                value={form.password}
                onChange={handleChange}
                required
                className="modern-input"
                disabled={loading}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
              >
                {showPassword ? <EyeOff className="toggle-icon" /> : <Eye className="toggle-icon" />}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Confirm Password</label>
            <div className="input-wrapper">
              <input
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                placeholder="Confirm your password"
                value={form.confirmPassword}
                onChange={handleChange}
                required
                className="modern-input"
                disabled={loading}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={loading}
              >
                {showConfirmPassword ? <EyeOff className="toggle-icon" /> : <Eye className="toggle-icon" />}
              </button>
            </div>
          </div>

          <button type="submit" className="submit-button" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="loading-icon" />
                Creating...
              </>
            ) : (
              "Sign Up"
            )}
          </button>

          <div className="social-section">
            <div className="divider">
              <span className="divider-text">OR</span>
            </div>
            <div className="social-buttons">
              <button type="button" className="social-button" disabled={true}>
                <svg className="social-icon" viewBox="0 0 24 24">
                  <path
                    fill="#4285f4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34a853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#fbbc05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#ea4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continue with Google
              </button>
              <button type="button" className="social-button" disabled={true}>
                <svg className="social-icon" fill="#1877f2" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                Continue with Facebook
              </button>
            </div>
            <p
              style={{
                textAlign: "center",
                fontSize: "0.75rem",
                color: "#9ca3af",
                fontStyle: "italic",
                marginTop: "0.5rem",
              }}
            >
              Coming Soon: Social Login
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}

export default VendorSignupSimple
