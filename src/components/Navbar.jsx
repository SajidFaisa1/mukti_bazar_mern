import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faShoppingCart, faUser, faSearch, faLanguage, faCaretDown, faUpload } from '@fortawesome/free-solid-svg-icons';
import { useVendorAuth } from '../contexts/VendorAuthContext';
import { useClientAuth } from '../contexts/ClientAuthContext';
import { useAdminAuth } from '../contexts/AdminAuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useCart } from '../contexts/CartContext';
import { auth } from '../firebase';
import { signOut as firebaseSignOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { translations } from '../translations/translations';
import MessageNotificationIcon from './messaging/MessageNotificationIcon';
import NotificationPanel from './notifications/NotificationPanel';
import logo from '../assets/logo.png';
import logo2 from '../assets/Mukti.png';

const Navbar = () => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showLogoUpload, setShowLogoUpload] = useState(false);
  const [currentLogo, setCurrentLogo] = useState(logo2);
  const profileRef = useRef(null);
  const logoUploadRef = useRef(null);

    // Grab all auth contexts (either may be undefined if its provider isn't mounted)
  const vendorAuth = useVendorAuth() || {};
  const clientAuth = useClientAuth() || {};
  const adminAuth = useAdminAuth() || {};

  // Consolidate user/role/logout, fallback to localStorage vendorUser
  let storedVendor = null;
  try {
    storedVendor = JSON.parse(sessionStorage.getItem('vendorUser') || localStorage.getItem('vendorUser') || 'null');
  } catch (_) {}

  // Priority: Admin > Vendor > Client > Stored Vendor
  const user = adminAuth.admin || vendorAuth.user || clientAuth.user || storedVendor || null;
  const role = adminAuth.admin ? 'admin' : (vendorAuth.role || clientAuth.user?.role || storedVendor?.role || null);
  const logout = adminAuth.logout || vendorAuth.logout || clientAuth.logout || (() => {});

  const navigate = useNavigate();
  const location = useLocation();
  const { language, toggleLanguage } = useLanguage();
  const { cart } = useCart();
  const currentTranslations = translations[language] || translations.en;
  const t = currentTranslations.navbar;
  
  // Calculate total items in cart, safely handling undefined items
  const cartItemCount = cart?.items?.reduce((total, item) => total + (item?.quantity || 0), 0) || 0;

  // Fetch current logo on mount and when admin role is available
  useEffect(() => {
    if (role === 'admin' && adminAuth.token) {
      fetchCurrentLogo();
    }
    
    // Listen for logo updates
    const handleLogoUpdate = (event) => {
      setCurrentLogo(event.detail.logoUrl);
    };
    
    window.addEventListener('logoUpdated', handleLogoUpdate);
    return () => window.removeEventListener('logoUpdated', handleLogoUpdate);
  }, [role, adminAuth.token]);

  const fetchCurrentLogo = async () => {
    try {
      const response = await fetch('http://localhost:5005/api/admin/logo', {
        headers: {
          'Authorization': `Bearer ${adminAuth.token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setCurrentLogo(data.logoUrl || logo2);
      }
    } catch (error) {
      console.error('Error fetching logo:', error);
      setCurrentLogo(logo2); // Fallback to default
    }
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  const toggleLanguageHandler = () => {
    toggleLanguage();
  };

  const handleLogout = async () => {
    setShowProfileMenu(false);

    // Call available context logout(s) based on current role
    if (role === 'admin' && adminAuth.logout) {
      adminAuth.logout();
    } else if (role === 'vendor' && vendorAuth.logout) {
      await vendorAuth.logout();
    } else if (role === 'client' && clientAuth.logout) {
      clientAuth.logout();
    }
    
    // Fallback: sign out Firebase user in case vendorAuth provider not mounted
    try { await firebaseSignOut(auth); } catch (_) {}

    // Clear any cached data (sessionStorage preferred)
    sessionStorage.removeItem('vendorUser');
    sessionStorage.removeItem('clientToken');
    sessionStorage.removeItem('clientUser');
    sessionStorage.removeItem('admin_token');
    localStorage.removeItem('vendorUser');
    localStorage.removeItem('clientToken');
    localStorage.removeItem('clientUser');
    localStorage.removeItem('admin_token');

    navigate('/');
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleSearchInputChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleSearchKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch(e);
    }
  };

  // Handle logo upload for admin using Cloudinary
  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (file && role === 'admin') {
      try {
        const formData = new FormData();
        formData.append('logo', file);

        const response = await fetch('http://localhost:5005/api/admin/upload-logo', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${adminAuth.token}`
          },
          body: formData
        });

        if (response.ok) {
          const data = await response.json();
          setCurrentLogo(data.logoUrl);
          
          // Dispatch custom event to notify other components
          window.dispatchEvent(new CustomEvent('logoUpdated', {
            detail: { logoUrl: data.logoUrl }
          }));
        } else {
          console.error('Failed to upload logo');
        }
      } catch (error) {
        console.error('Error uploading logo:', error);
      }
    }
  };

  // Load custom logo from backend on component mount
  useEffect(() => {
    if (role === 'admin') {
      fetchCurrentLogo();
    }
  }, [role]);

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
    <nav className="sticky top-0 z-50 bg-white shadow-lg">
      {/* Top Header Section */}
      <div style={{backgroundColor: '#262626'}} className="text-white">
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Left: Logo */}
            <div className="flex items-center">
              <Link to="/" className="flex items-center space-x-3">
                <div className="relative" style={{backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '8px', padding: '4px'}}>
                  <img 
                    src={currentLogo} 
                    alt="Mukti Bazar" 
                    className="h-12 w-auto transition-transform duration-300 hover:scale-110"
                    onError={(e) => {
                      e.target.src = logo2;
                      setCurrentLogo(logo2);
                    }}
                  />
                  {/* Admin Logo Upload Button */}
                  {role === 'admin' && (
                    <button
                      onClick={() => logoUploadRef.current?.click()}
                      className="absolute -top-1 -right-1 bg-blue-500 hover:bg-blue-600 text-white rounded-full p-1 text-xs transition-colors duration-200"
                      title="Change Logo"
                    >
                      <FontAwesomeIcon icon={faUpload} size="xs" />
                    </button>
                  )}
                  <input
                    ref={logoUploadRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </div>
                <span className="text-2xl font-bold text-white"></span>
              </Link>
            </div>

            {/* Right: Login/User Menu */}
            <div className="flex items-center space-x-4">
              {/* Language Toggle */}
              <button 
                onClick={toggleLanguageHandler}
                className="p-2 text-gray-300 hover:text-white transition-colors duration-200"
                title={language === 'en' ? 'Switch to Bangla' : 'Switch to English'}
              >
                <FontAwesomeIcon icon={faLanguage} size="lg" />
              </button>
              
              {/* User Menu or Login */}
              {user ? (
                <div className="relative" ref={profileRef}>
                  <button 
                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                    className="flex items-center space-x-2 bg-gray-800 hover:bg-gray-700 rounded-full py-2 px-4 transition-colors duration-200"
                  >
                    <FontAwesomeIcon icon={faUser} className="text-gray-300" size="sm" />
                    <span className="text-sm font-medium text-gray-300 max-w-24 truncate">
                      {user.businessName || user.name || user.email}
                    </span>
                    <FontAwesomeIcon 
                      icon={faCaretDown} 
                      className={`text-gray-400 transition-transform duration-200 ${showProfileMenu ? 'rotate-180' : ''}`} 
                      size="sm"
                    />
                  </button>
                  
                  {showProfileMenu && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-100 py-2 z-50">
                      {role === 'admin' && (
                        <>
                          <Link 
                            to="/admin" 
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200" 
                            onClick={() => setShowProfileMenu(false)}
                          >
                            Admin Dashboard
                          </Link>
                          <Link 
                            to="/admin/fraud-panel" 
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200" 
                            onClick={() => setShowProfileMenu(false)}
                          >
                            Fraud Panel
                          </Link>
                          <Link 
                            to="/admin/test-fraud" 
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200" 
                            onClick={() => setShowProfileMenu(false)}
                          >
                            Test Fraud
                          </Link>
                        </>
                      )}
                      {role === 'vendor' && (
                        <>
                          <Link 
                            to="/vendor/profile" 
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200" 
                            onClick={() => setShowProfileMenu(false)}
                          >
                            Finalize Profile
                          </Link>
                          <Link 
                            to="/vendor/dashboard" 
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200" 
                            onClick={() => setShowProfileMenu(false)}
                          >
                            Dashboard
                          </Link>
                          <Link 
                            to="/vendor/products" 
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200" 
                            onClick={() => setShowProfileMenu(false)}
                          >
                            Products
                          </Link>
                          <Link 
                            to="/vendor/orders" 
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200" 
                            onClick={() => setShowProfileMenu(false)}
                          >
                            Orders
                          </Link>
                        </>
                      )}
                      {role === 'client' && (
                        <>
                          <Link 
                            to="/profile" 
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200" 
                            onClick={() => setShowProfileMenu(false)}
                          >
                            Profile
                          </Link>
                          <Link 
                            to="/orders" 
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200" 
                            onClick={() => setShowProfileMenu(false)}
                          >
                            My Orders
                          </Link>
                          <Link 
                            to="/negotiations" 
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200" 
                            onClick={() => setShowProfileMenu(false)}
                          >
                            💰 Negotiations
                          </Link>
                        </>
                      )}
                      {role !== 'admin' && (
                        <>
                          <div className="border-t border-gray-100 my-2"></div>
                          <Link 
                            to="/settings" 
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200" 
                            onClick={() => setShowProfileMenu(false)}
                          >
                            Settings
                          </Link>
                          <Link 
                            to="/support" 
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200" 
                            onClick={() => setShowProfileMenu(false)}
                          >
                            Support
                          </Link>
                        </>
                      )}
                      <div className="border-t border-gray-100 my-2"></div>
                      <button 
                        onClick={handleLogout} 
                        className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors duration-200"
                      >
                        {t.logout}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link 
                  to="/login" 
                  className="flex items-center space-x-2 bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-full text-base font-medium transition-colors duration-200"
                >
                  <FontAwesomeIcon icon={faUser} size="sm" />
                  <span>{t.login}</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation Section */}
      <div style={{backgroundColor: 'rgba(255, 255, 255, 0.95)'}} className="border-b border-gray-200">
        <div className="max-w-[85%] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Left: Navigation Links */}
            <div className="hidden md:flex items-center space-x-1">
              <Link 
                to="/" 
                className={`px-5 py-2 rounded-full text-base font-medium transition-all duration-200 ${
                  isActive('/') 
                    ? 'bg-green-600 text-white shadow-md' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {t.home}
              </Link>
              
              {user && role === 'admin' && (
                <Link 
                  to="/admin" 
                  className={`px-5 py-2 rounded-full text-base font-medium transition-all duration-200 ${
                    isActive('/admin') 
                      ? 'bg-green-600 text-white shadow-md' 
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Dashboard
                </Link>
              )}
              
              {user && role === 'vendor' && (
                <>
                  <Link 
                    to="/vendor/products" 
                    className={`px-5 py-2 rounded-full text-base font-medium transition-all duration-200 ${
                      isActive('/vendor/products') 
                        ? 'bg-green-600 text-white shadow-md' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    Products
                  </Link>
                  <Link 
                    to="/vendor/orders" 
                    className={`px-5 py-2 rounded-full text-base font-medium transition-all duration-200 ${
                      isActive('/vendor/orders') 
                        ? 'bg-green-600 text-white shadow-md' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    Orders
                  </Link>
                </>
              )}
              
              {user && role !== 'admin' && (
                <>
                  <Link 
                    to="/orders" 
                    className={`px-5 py-2 rounded-full text-base font-medium transition-all duration-200 ${
                      isActive('/orders') 
                        ? 'bg-green-600 text-white shadow-md' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    My Orders
                  </Link>
                  <Link 
                    to="/negotiations" 
                    className={`px-5 py-2 rounded-full text-base font-medium transition-all duration-200 ${
                      isActive('/negotiations') 
                        ? 'bg-green-600 text-white shadow-md' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    💰 Negotiations
                  </Link>
                </>
              )}
              
              <Link 
                to="/deals" 
                className={`px-5 py-2 rounded-full text-base font-medium transition-all duration-200 ${
                  isActive('/deals') 
                    ? 'bg-green-600 text-white shadow-md' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {t.deals}
              </Link>
              
              <Link 
                to="/analysis" 
                className={`px-5 py-2 rounded-full text-base font-medium transition-all duration-200 ${
                  isActive('/analysis') 
                    ? 'bg-green-600 text-white shadow-md' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {t.analysis}
              </Link>
            </div>

            {/* Right: Search, Cart, Notifications */}
            <div className="flex items-center space-x-3">
              
              {/* Search */}
              <div className="hidden sm:block">
                <form onSubmit={handleSearch} className="relative">
                  <input 
                    type="text" 
                    placeholder="Search products..."
                    className="w-64 pl-10 pr-12 py-3 border-0 rounded-full focus:outline-none focus:ring-2 focus:ring-gray-300 transition-all duration-200 text-base"
                    value={searchQuery}
                    onChange={handleSearchInputChange}
                    onKeyPress={handleSearchKeyPress}
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FontAwesomeIcon icon={faSearch} className="text-gray-400" />
                  </div>
                  <button 
                    type="submit" 
                    className="absolute inset-y-0 right-0 pr-2 flex items-center"
                  >
                    <div className="bg-green-600 hover:bg-green-700 text-white rounded-full p-2 transition-colors duration-200">
                      <FontAwesomeIcon icon={faSearch} size="sm" />
                    </div>
                  </button>
                </form>
              </div>

              {/* Cart (for non-admin users) */}
              {role !== 'admin' && (
                <Link 
                  to="/cart" 
                  className="relative p-2 text-gray-600 hover:text-green-600 transition-colors duration-200"
                >
                  <FontAwesomeIcon icon={faShoppingCart} size="lg" />
                  {cartItemCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                      {cartItemCount}
                    </span>
                  )}
                </Link>
              )}
              
              {/* Message Notifications (for non-admin users) */}
              {role !== 'admin' && <MessageNotificationIcon />}
              
              {/* General Notifications (for non-admin users) */}
              {user && role !== 'admin' && <NotificationPanel />}
            </div>
          </div>

          {/* Mobile Navigation */}
          <div className="md:hidden border-t border-gray-200 py-3">
            <div className="flex flex-wrap gap-2 justify-center mb-3">
              <Link 
                to="/" 
                className={`px-3 py-1 rounded-full text-sm font-medium transition-all duration-200 ${
                  isActive('/') 
                    ? 'bg-green-600 text-white' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {t.home}
              </Link>
              
              {user && role === 'admin' && (
                <Link 
                  to="/admin" 
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-all duration-200 ${
                    isActive('/admin') 
                      ? 'bg-green-600 text-white' 
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Dashboard
                </Link>
              )}
              
              {user && role === 'vendor' && (
                <>
                  <Link 
                    to="/vendor/products" 
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-all duration-200 ${
                      isActive('/vendor/products') 
                        ? 'bg-green-600 text-white' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    Products
                  </Link>
                  <Link 
                    to="/vendor/orders" 
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-all duration-200 ${
                      isActive('/vendor/orders') 
                        ? 'bg-green-600 text-white' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    Orders
                  </Link>
                </>
              )}
              
              {user && role !== 'admin' && (
                <>
                  <Link 
                    to="/orders" 
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-all duration-200 ${
                      isActive('/orders') 
                        ? 'bg-green-600 text-white' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    My Orders
                  </Link>
                  <Link 
                    to="/negotiations" 
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-all duration-200 ${
                      isActive('/negotiations') 
                        ? 'bg-green-600 text-white' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    💰 Negotiations
                  </Link>
                </>
              )}
              
              <Link 
                to="/deals" 
                className={`px-3 py-1 rounded-full text-sm font-medium transition-all duration-200 ${
                  isActive('/deals') 
                    ? 'bg-green-600 text-white' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {t.deals}
              </Link>
              
              <Link 
                to="/analysis" 
                className={`px-3 py-1 rounded-full text-sm font-medium transition-all duration-200 ${
                  isActive('/analysis') 
                    ? 'bg-green-600 text-white' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {t.analysis}
              </Link>
            </div>
            
            {/* Mobile Search */}
            <div className="px-2">
              <form onSubmit={handleSearch} className="relative">
                <input 
                  type="text" 
                  placeholder="Search products..."
                  className="w-full pl-10 pr-12 py-2 border-0 rounded-full focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50"
                  value={searchQuery}
                  onChange={handleSearchInputChange}
                  onKeyPress={handleSearchKeyPress}
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FontAwesomeIcon icon={faSearch} className="text-gray-400" />
                </div>
                <button 
                  type="submit" 
                  className="absolute inset-y-0 right-0 pr-2 flex items-center"
                >
                  <div className="bg-green-600 hover:bg-green-700 text-white rounded-full p-2">
                    <FontAwesomeIcon icon={faSearch} size="sm" />
                  </div>
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
