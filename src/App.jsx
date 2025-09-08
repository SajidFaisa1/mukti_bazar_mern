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
import { ThemeProvider } from './contexts/ThemeContext';
import SmartChatbot from './components/SmartChatbot';
import './App.css';
import { ToastProvider } from './components/ui/ToastProvider';

function App() {
  return (
    <ThemeProvider>
      <ClientAuthProvider>
        <VendorAuthProvider>
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
                          <SmartChatbot />
                        </div>
                      </Router>
                    </ToastProvider>
                  </LoadingProvider>
                </NotificationProvider>
              </CartProvider>
            </LanguageProvider>
          </AdminAuthProvider>
        </VendorAuthProvider>
      </ClientAuthProvider>
    </ThemeProvider>
  );
}

export default App
