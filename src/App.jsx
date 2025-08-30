import { BrowserRouter as Router } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import FloatingMessageButton from './components/messaging/FloatingMessageButton';
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

function App() {
  return (
    <ClientAuthProvider>
      <AdminAuthProvider>
        <LanguageProvider>
          <CartProvider>
            <NotificationProvider>
              <LoadingProvider>
                <Router>
                  <div className="app min-h-screen flex flex-col">
                    <Navbar />
                    
                    <AppLayout>
                      <AppRoutes />
                    </AppLayout>
                    
                    {/* Floating Message Button - appears on all pages */}
                    <VendorAuthProvider>
                      <FloatingMessageButton />
                    </VendorAuthProvider>
                    
                    <Footer />
                    
                    {/* AI Chatbot - Available on all pages */}
                    <AIChatbot />
                  </div>
                </Router>
              </LoadingProvider>
            </NotificationProvider>
          </CartProvider>
        </LanguageProvider>
      </AdminAuthProvider>
    </ClientAuthProvider>
  );
}

export default App
