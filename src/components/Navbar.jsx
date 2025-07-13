import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faShoppingCart, faUser, faSearch, faLanguage, faCaretDown } from '@fortawesome/free-solid-svg-icons';
import { useVendorAuth } from '../contexts/VendorAuthContext';
import { useClientAuth } from '../contexts/ClientAuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useCart } from '../contexts/CartContext';
import { auth } from '../firebase';
import { signOut as firebaseSignOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { translations } from '../translations/translations';
import './navbar.css';
import logo from '../assets/logo.png';
import logo2 from '../assets/Mukti.png';

const Navbar = () => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileRef = useRef(null);

    // Grab both auth contexts (either may be undefined if its provider isn't mounted)
  const vendorAuth = useVendorAuth() || {};
  const clientAuth = useClientAuth() || {};

  // Consolidate user/role/logout, fallback to localStorage vendorUser
  let storedVendor = null;
  try {
    storedVendor = JSON.parse(sessionStorage.getItem('vendorUser') || localStorage.getItem('vendorUser') || 'null');
  } catch (_) {}

  const user = vendorAuth.user || clientAuth.user || storedVendor || null;
  const role = vendorAuth.role || clientAuth.user?.role || storedVendor?.role || null;
  const logout = vendorAuth.logout || clientAuth.logout || (() => {});

  const navigate = useNavigate();
  const location = useLocation();
  const { language, toggleLanguage } = useLanguage();
  const { cart } = useCart();
  const currentTranslations = translations[language] || translations.en;
  const t = currentTranslations.navbar;
  
  // Calculate total items in cart, safely handling undefined items
  const cartItemCount = cart?.items?.reduce((total, item) => total + (item?.quantity || 0), 0) || 0;

  const isActive = (path) => {
    return location.pathname === path;
  };

  const toggleLanguageHandler = () => {
    toggleLanguage();
  };

  const handleLogout = async () => {
    setShowProfileMenu(false);

    // Call available context logout(s)
    if (vendorAuth.logout) await vendorAuth.logout();
    if (clientAuth.logout) clientAuth.logout();
    // Fallback: sign out Firebase user in case vendorAuth provider not mounted
    try { await firebaseSignOut(auth); } catch (_) {}

    // Clear any cached data (sessionStorage preferred)
    sessionStorage.removeItem('vendorUser');
    sessionStorage.removeItem('clientToken');
    sessionStorage.removeItem('clientUser');
    localStorage.removeItem('vendorUser');
    localStorage.removeItem('clientToken');
    localStorage.removeItem('clientUser');

    navigate('/');
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand">
          <Link to="/" className="brand-logo">
            <span className="logo-text"><img className='logo' src={logo2} alt="" /></span>
          </Link>
        </div>
        
        <div className="navbar-links">
          <Link 
            to="/" 
            className={`nav-link br-hendrix font-size-regular ${isActive('/') ? 'active' : ''}`}
          >
            {t.home}
          </Link>
          
          <Link 
            to="/categories" 
            className={`nav-link br-hendrix font-size-regular ${isActive('/categories') ? 'active' : ''}`}
          >
            {t.categories}
          </Link>
          {user && role === 'admin' && (
            <Link 
              to="/admin" 
              className={`nav-link br-hendrix font-size-regular ${isActive('/admin') ? 'active' : ''}`}
            >
              Dashboard
            </Link>
          )}
          {user && role === 'vendor' && (
            <Link 
              to="/vendor/products" 
              className={`nav-link br-hendrix font-size-regular ${isActive('/vendor/products') ? 'active' : ''}`}
            >
              Products
            </Link>
          )}
          {user && role === 'vendor' && (
            <Link 
              to="/vendor/orders" 
              className={`nav-link br-hendrix font-size-regular ${isActive('/vendor/orders') ? 'active' : ''}`}
            >
              Orders
            </Link>
            
            
          )}
          <Link 
            to="/deals" 
            className={`nav-link br-hendrix font-size-regular ${isActive('/deals') ? 'active' : ''}`}
          >
            {t.deals}
          </Link>
          <Link 
            to="/analysis" 
            className={`nav-link br-hendrix font-size-regular ${isActive('/analysis') ? 'active' : ''}`}
          >
            {t.analysis}
          </Link>
        </div>

        <div className="navbar-search">
          <input 
            type="text" 
            placeholder="Search products..."
            className="search-input"
          />
          <button className="search-button">
            <FontAwesomeIcon className='bg-icon' icon={faSearch} />
          </button>
        </div>

        <div className="navbar-actions">
          <Link to="/cart" className="nav-link br-hendrix font-size-regular cart-link">
            <FontAwesomeIcon icon={faShoppingCart} />
            {cartItemCount > 0 && <span className="cart-badge">{cartItemCount}</span>}
            <span className="sr-only">Cart ({cartItemCount} items)</span>
          </Link>
          
          
          {user ? (
            <div className="user-profile" ref={profileRef}>
              <button type="button" className="nav-link profile-btn" onClick={() => setShowProfileMenu(!showProfileMenu)}>
                <FontAwesomeIcon icon={faUser} />
                <span className="user-name">{user.businessName || user.name || user.email}</span>
                <FontAwesomeIcon icon={faCaretDown} className="caret-icon" />
              </button>
              {showProfileMenu && (
                <div className="profile-dropdown">
                  <Link to="/vendor/profile" className="dropdown-item" onClick={() => setShowProfileMenu(false)}>Finalize Profile</Link>
                  <Link to="/vendor/dashboard" className="dropdown-item" onClick={() => setShowProfileMenu(false)}>Dashboard</Link>
                  <Link to="/settings" className="dropdown-item" onClick={() => setShowProfileMenu(false)}>Settings</Link>
                  <Link to="/support" className="dropdown-item" onClick={() => setShowProfileMenu(false)}>Support</Link>
                </div>
              )}
              <button 
                onClick={handleLogout} 
                className="nav-link logout-btn"
              >
                {t.logout}
              </button>   
            </div>
          ) : (
            <Link to="/login" className="nav-link login-btn br-hendrix font-size-regular">
              <FontAwesomeIcon icon={faUser} />
              {t.login}
            </Link>
          )}

          <button 
            onClick={toggleLanguageHandler}
            className="nav-link"
            title={language === 'en' ? 'Switch to Bangla' : 'Switch to English'}
          >
            <FontAwesomeIcon icon={faLanguage} />
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
