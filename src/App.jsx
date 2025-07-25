import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Home from './components/Home';
import Analysis from './components/Analysis';
import Chat from './components/Chat';
import Deals from './components/Deals';
import { LanguageProvider } from './contexts/LanguageContext';
import { VendorAuthProvider } from './contexts/VendorAuthContext';
import { ClientAuthProvider } from './contexts/ClientAuthContext';
import { AdminAuthProvider } from './contexts/AdminAuthContext';
import { CartProvider } from './contexts/CartContext';
import Login from './components/auth/Login';
import SignupChoice from './components/auth/SignupChoice';
import ClientSignupSimple from './components/auth/ClientSignupSimple';
import VendorSignupSimple from './components/auth/VendorSignupSimple';
import AdminPanel from './components/admin/AdminPanel';
import Cart from './components/Cart';
import Checkout from './components/checkout/Checkout';
import OrderConfirmation from './components/checkout/OrderConfirmation';
import UserProfile from './components/user/UserProfile';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AdminProtectedRoute from './components/auth/AdminProtectedRoute';
import VendorProducts from './components/vendor/VendorProducts';
import VendorDashboard from './components/vendor/VendorDashboard';
import VendorProfileCompletion from './components/vendor/VendorProfileCompletion';
import VendorOrders from './components/vendor/VendorOrders';
import Settings from './components/settings/Settings';
import AddressBook from './components/settings/AddressBook';
import './App.css';
import AdminLogin from './components/auth/AdminLogin';

function App() {
  return (
    <ClientAuthProvider>
    <AdminAuthProvider>
    <LanguageProvider>
      <CartProvider>
        <Router>
          <div className="app">
              <Navbar />
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/shops" element={<h1>Shops</h1>} />
                <Route path="/categories" element={<h1>Categories</h1>} />
                <Route path="/deals" element={<Deals />} />
                <Route path="/cart" element={<VendorAuthProvider><ProtectedRoute element={<Cart />} /></VendorAuthProvider>} />
                <Route path="/checkout" element={<VendorAuthProvider><ProtectedRoute element={<Checkout />} /></VendorAuthProvider>} />
                <Route path="/order-confirmation/:orderNumber" element={<VendorAuthProvider><ProtectedRoute element={<OrderConfirmation />} /></VendorAuthProvider>} />
                <Route path="/user" element={<VendorAuthProvider><ProtectedRoute element={<UserProfile />} /></VendorAuthProvider>} />
                <Route path="/analysis" element={<Analysis />} />
                <Route path="/chat" element={<Chat />} />
                <Route path="/login" element={<VendorAuthProvider><Login /></VendorAuthProvider>} />
                <Route path="/signup" element={<SignupChoice />} />
                <Route path="/signup/client" element={<ClientSignupSimple />} />
                <Route path="/signup/vendor" element={<VendorAuthProvider><VendorSignupSimple /></VendorAuthProvider>} />
                <Route path="/admin" element={<AdminProtectedRoute element={<AdminPanel />} />} />
                <Route path="/vendor/dashboard" element={
                  <VendorAuthProvider>
                    <ProtectedRoute element={<VendorDashboard />} requiredRole="vendor" />
                  </VendorAuthProvider>
                } />
                <Route path="/vendor/products" element={
                  <VendorAuthProvider>
                    <ProtectedRoute element={<VendorProducts />} requiredRole="vendor" />
                  </VendorAuthProvider>
                } />
                <Route path="/vendor/profile" element={
                  <VendorAuthProvider>
                    <ProtectedRoute element={<VendorProfileCompletion />} requiredRole="vendor" />
                  </VendorAuthProvider>
                } />
                <Route path="/settings" element={<VendorAuthProvider><ProtectedRoute element={<Settings />} /></VendorAuthProvider>} />
                <Route path="/settings/address-book" element={<VendorAuthProvider><ProtectedRoute element={<AddressBook />} /></VendorAuthProvider>} />
                <Route path="/vendor/orders" element={
                  <VendorAuthProvider>
                    <ProtectedRoute element={<VendorOrders />} requiredRole="vendor" />
                  </VendorAuthProvider>
                } />
                <Route path="/admin/login" element={<AdminLogin />} />
              </Routes>
            <Footer />
            </div>
          </Router>
        </CartProvider>
      </LanguageProvider>
    </AdminAuthProvider>
    </ClientAuthProvider>
    
  );
}

export default App
