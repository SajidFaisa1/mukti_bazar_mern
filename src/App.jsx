import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import Navbar from './components/Navbar'
import Home from './components/Home';
import Analysis from './components/Analysis';
import Chat from './components/Chat';
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
import UserProfile from './components/user/UserProfile';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AdminProtectedRoute from './components/auth/AdminProtectedRoute';
import VendorProducts from './components/vendor/VendorProducts';
import VendorDashboard from './components/vendor/VendorDashboard';
import VendorProfileCompletion from './components/vendor/VendorProfileCompletion';
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
                <Route path="/deals" element={<h1>Deals</h1>} />
                <Route path="/cart" element={<ProtectedRoute element={<Cart />} />} />
                <Route path="/user" element={<ProtectedRoute element={<UserProfile />} />} />
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
                <Route path="/vendor/orders" element={
                  <VendorAuthProvider>
                    <ProtectedRoute element={<h1>Vendor Orders</h1>} requiredRole="vendor" />
                  </VendorAuthProvider>
                } />
                <Route path="/admin/login" element={<AdminLogin />} />
              </Routes>
            </div>
          </Router>
        </CartProvider>
      </LanguageProvider>
    </AdminAuthProvider>
    </ClientAuthProvider>
    
  );
}

export default App
