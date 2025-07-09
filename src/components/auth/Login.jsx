"use client"

import { useState, useEffect } from "react"
import { Link, useNavigate, useLocation } from "react-router-dom"
import { useVendorAuth } from "../../contexts/VendorAuthContext"
import { useClientAuth } from "../../contexts/ClientAuthContext"
import { auth, login, logout, signInWithGoogle } from "../../firebase"
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle2 } from "lucide-react"
import { FaGoogle, FaFacebook } from "react-icons/fa"
import '../../styles/login.css';

const ModernLoginForm = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { login: vendorLogin, loading: vendorLoading } = useVendorAuth()
  const { login: clientLogin, loginWithGoogle: clientLoginWithGoogle, loading: clientLoading } = useClientAuth()
  const authLoading = vendorLoading || clientLoading
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    role: "client", // Default role is client
  })

  const [showPassword, setShowPassword] = useState(false)

  // Check for messages in location state (e.g., after email verification)
  useEffect(() => {
    if (location.state?.message) {
      setSuccess(location.state.message)
      // Clear the message from location state
      window.history.replaceState({}, document.title)
    }

    // Check for email verification status
    if (location.search.includes("mode=verifyEmail")) {
      setSuccess("Email verified successfully! You can now log in.")
      // Clear the query params
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [location])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const redirectUser = (role) => {
    switch (role) {
      case "vendor":
        navigate("/vendor/dashboard")
        break
      case "client":
      default:
        navigate("/")
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    // Basic validation
    if (!formData.email || !formData.password) {
      setError("Please enter both email and password")
      return
    }

    setIsSubmitting(true)
    setIsLoading(true)

    try {
      const loginData = formData

      // ---- CLIENT / VENDOR SEPARATE LOGIC ----
      if (loginData.role === "client") {
        await clientLogin({ email: loginData.email, password: loginData.password });
        redirectUser("client");
        return; // done
        // ----- CLIENT login via JWT backend -----
        try {
          const res = await fetch("http://localhost:5005/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: loginData.email, password: loginData.password })
          });
          if (!res.ok) {
            const { error = "Invalid credentials" } = await res.json().catch(() => ({}));
            throw new Error(error);
          }
          const { token, user } = await res.json();
          // Persist token for later authenticated requests (simple localStorage for now)
          localStorage.setItem("clientToken", token);
          redirectUser("client");
          return; // done
        } catch (clientErr) {
          console.error("Client login error:", clientErr);
          throw clientErr;
        }
      }

      // ----- VENDOR login (Firebase + backend) -----
      let firebaseUser
      try {
        // Sign in with Firebase Authentication
        firebaseUser = await login(loginData.email, loginData.password)

        // Check if email is verified
        if (!firebaseUser.emailVerified) {
          // Sign out the user if email is not verified
          await logout()
          throw new Error("Please verify your email before logging in. Check your inbox for the verification link.")
        }
      } catch (firebaseError) {
        console.error("Firebase login error:", firebaseError)
        throw new Error(firebaseError.message || "Failed to authenticate with Firebase")
      }

      try {
        // Now call our backend with the Firebase UID and login data
        const credentials = {
          firebaseUid: firebaseUser.uid,
          email: firebaseUser.email,
          role: loginData.role,
        }

        // For vendor login, we need to include password for the backend
        if (loginData.role === "vendor") {
          credentials.password = loginData.password
        }

        // Call VendorAuthContext login
        await vendorLogin({ email: loginData.email, password: loginData.password })

        // Redirect based on the role selected in the form
        redirectUser(loginData.role)
      } catch (error) {
        console.error("Login error:", error)
        let errorMessage = "Login failed. Please try again."

        // Handle Firebase auth errors
        if (error && error.code) {
          switch (error.code) {
            case "auth/user-not-found":
            case "auth/wrong-password":
              errorMessage = "Invalid email or password"
              break
            case "auth/too-many-requests":
              errorMessage = "Too many failed login attempts. Please try again later."
              break
            case "auth/user-disabled":
              errorMessage = "This account has been disabled. Please contact support."
              break
            case "auth/invalid-email":
              errorMessage = "Invalid email address"
              break
            default:
              errorMessage = `Authentication error: ${error.code}. Please try again.`
          }
        } else if (error && error.message) {
          errorMessage = error.message
        }
        console.error("Login error details:", { message: errorMessage, originalError: error })
        throw new Error(errorMessage)
      }
    } catch (error) {
      console.error("Login error:", error)
      setError(error.message || "Failed to log in")
    } finally {
      setIsSubmitting(false)
      setIsLoading(false)
    }
  }

  // Handle Google Sign In
  const handleGoogleSignIn = async () => {
    try {
      setError("")
      setSuccess("")
      setIsSubmitting(true)

      // Use the imported signInWithGoogle function from firebase.js
      const user = await signInWithGoogle()

      // Persist / login via backend using ClientAuthContext
      await clientLoginWithGoogle({ uid: user.uid, email: user.email, name: user.displayName });
      // Redirect to home page
      navigate("/")
    } catch (error) {
      console.error("Google sign in error:", error)

      let errorMessage = "Google sign in failed. Please try again."

      // Handle specific Google auth errors
      if (error.code === "auth/account-exists-with-different-credential") {
        errorMessage = "An account already exists with the same email but different sign-in method."
      } else if (error.code === "auth/popup-closed-by-user") {
        // User closed the popup, no need to show an error
        setIsSubmitting(false)
        return
      } else if (error.code === "auth/popup-blocked") {
        errorMessage = "Popup was blocked by your browser. Please allow popups for this site."
      }

      setError(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle password reset
  const handlePasswordReset = async () => {
    if (!formData.email) {
      setError("Please enter your email address to reset your password")
      return
    }

    try {
      setIsLoading(true)
      await auth.sendPasswordResetEmail(formData.email)
      setSuccess(`Password reset email sent to ${formData.email}. Please check your inbox.`)
    } catch (error) {
      console.error("Password reset error:", error)
      setError("Failed to send password reset email. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  // Show loading state while auth is initializing or processing
  if (authLoading || isLoading) {
    return (
      <div className="modern-login-container">
        <div className="modern-auth-loading">
          <div className="modern-spinner-large"></div>
          <p>{isLoading ? "Processing..." : "Loading..."}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="modern-login-container">
      <div className="modern-login-card">
        <div className="modern-login-content">
          {/* Left Side - Image and Welcome Text */}
          <div className="modern-login-left">
            <div className="modern-login-overlay">
              
            </div>
          </div>

          {/* Right Side - Login Form */}
          <div className="modern-login-right">
            <div className="modern-login-form-container">
              <h2 className="modern-login-heading">Sign In</h2>
              <p className="modern-login-description">
                Don't have an account?{" "}
                <Link to="/signup" className="modern-login-link">
                  Create your account
                </Link>{" "}
                it takes less than a minute.
              </p>

              {error && (
                <div className="modern-alert modern-alert-error">
                  <AlertCircle className="modern-alert-icon" />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="modern-alert modern-alert-success">
                  <CheckCircle2 className="modern-alert-icon" />
                  <span>{success}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="modern-login-form">
                {/* Role Selection */}
                <div className="modern-form-group">
                  <label className="modern-form-label">I AM A</label>
                  <div className="modern-radio-group">
                    <label className="modern-radio-option">
                      <input
                        type="radio"
                        name="role"
                        value="client"
                        checked={formData.role === "client"}
                        onChange={() => setFormData((prev) => ({ ...prev, role: "client" }))}
                      />
                      <span className="modern-radio-text">Client</span>
                    </label>
                    <label className="modern-radio-option">
                      <input
                        type="radio"
                        name="role"
                        value="vendor"
                        checked={formData.role === "vendor"}
                        onChange={(e) => setFormData((prev) => ({ ...prev, role: e.target.value }))}
                      />
                      <span className="modern-radio-text">Vendor</span>
                    </label>
                  </div>
                </div>

                {/* Email Field */}
                <div className="modern-form-group">
                  <label className="modern-form-label">EMAIL ID</label>
                  <input
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="modern-form-input"
                    required
                    disabled={isSubmitting}
                    autoComplete="username"
                  />
                </div>

                {/* Password Field */}
                <div className="modern-form-group">
                  <div className="modern-form-header">
                    <label className="modern-form-label">PASSWORD</label>
                    <button
                      type="button"
                      onClick={handlePasswordReset}
                      className="modern-forgot-password"
                      disabled={isSubmitting}
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="modern-password-container">
                    <input
                      name="password"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={handleChange}
                      className="modern-form-input"
                      required
                      disabled={isSubmitting}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="modern-password-toggle"
                      disabled={isSubmitting}
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <button type="submit" className="modern-login-button" disabled={isSubmitting || authLoading}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="modern-spinner" />
                      Logging in...
                    </>
                  ) : (
                    "LOGIN"
                  )}
                </button>
              </form>

              {/* Social Login */}
              <div className={`modern-social-section ${formData.role !== "client" ? "hidden" : ""}`}>
                {formData.role === "client" && (
                  <>
                    <div className="modern-divider">
                      <span className="modern-divider-text">OR</span>
                    </div>
                    <div className="modern-social-buttons">
                      <button
                        type="button"
                        onClick={handleGoogleSignIn}
                        className="modern-social-button modern-social-google"
                        disabled={isSubmitting || authLoading}
                      >
                        <FaGoogle className="modern-social-icon" />
                        Continue with Google
                      </button>
                      <button type="button" className="modern-social-button modern-social-facebook" disabled={true}>
                        <FaFacebook className="modern-social-icon" />
                        Continue with Facebook
                      </button>
                    </div>
                    <p className="modern-social-footer">Coming Soon: Facebook Login</p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ModernLoginForm
