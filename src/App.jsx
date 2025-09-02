import { BrowserRouter as Router } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import AppRoutes from './components/routing/AppRoutes';
import AppLayout from './components/layout/AppLayout';
import { LanguageProvider } from './contexts/LanguageContext';
import { VendorAuthProvider } from './contexts/VendorAuthContext';
import { ClientAuthProvider } from './contexts/ClientAuthContext';
import { AdminAuthProvider } from './contexts/AdminAuthContext';
import { CartProvider } from './contexts/CartContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { LoadingProvider } from './contexts/LoadingContext';
import AIChatbot from './components/AIChatbot';
import './App.css';
import { ToastProvider } from './components/ui/ToastProvider';

function App() {
  return (
    <ClientAuthProvider>
      <AdminAuthProvider>
        <LanguageProvider>
          <CartProvider>
            <NotificationProvider>
              <LoadingProvider>
                <ToastProvider>
                  <Router>
                    <div className="app min-h-screen flex flex-col">
                      <Navbar />
                      <AppLayout>
                        <AppRoutes />
                      </AppLayout>
                      {/* Removed floating message button; inline buttons used inside product views */}
                      <Footer />
                      <AIChatbot />
                    </div>
                  </Router>
                </ToastProvider>
              </LoadingProvider>
            </NotificationProvider>
          </CartProvider>
        </LanguageProvider>
      </AdminAuthProvider>
    </ClientAuthProvider>
  );
}

export default App
