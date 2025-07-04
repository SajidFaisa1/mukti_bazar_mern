import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faShoppingCart, faUser, faSearch, faLanguage, faCaretDown } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../contexts/VendorAuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useCart } from '../contexts/CartContext';
import { translations } from '../translations/translations';
import './navbar.css';
import logo from '../assets/logo.png';
import logo2 from '../assets/Mukti.png';

const Navbar = () => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileRef = useRef(null);

  const { user, role, logout } = useAuth();
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

  const handleLogout = () => {
    setShowProfileMenu(false);

    logout();
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
