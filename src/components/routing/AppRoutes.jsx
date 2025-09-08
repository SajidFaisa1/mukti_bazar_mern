import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import PageLoader from '../common/PageLoader';
import { useLoading } from '../../contexts/LoadingContext';

// Lazy load components for better performance
const Home = lazy(() => import('../Home'));
const Analysis = lazy(() => import('../Analysis'));
const Chat = lazy(() => import('../Chat'));
const MessagingInterface = lazy(() => import('../messaging/MessagingInterface'));
const GroupManagement = lazy(() => import('../messaging/GroupManagement'));
const Deals = lazy(() => import('../Deals'));
const Login = lazy(() => import('../auth/Login'));
const SignupChoice = lazy(() => import('../auth/SignupChoice'));
const ClientSignupSimple = lazy(() => import('../auth/ClientSignupSimple'));
const VendorSignupSimple = lazy(() => import('../auth/VendorSignupSimple'));
const AdminPanel = lazy(() => import('../admin/AdminPanel'));
const AdminFraudPanelSimple = lazy(() => import('../AdminFraudPanelSimple'));
const FraudTestingPanel = lazy(() => import('../FraudTestingPanel'));
const Cart = lazy(() => import('../Cart'));
const Checkout = lazy(() => import('../checkout/Checkout'));
const OrderConfirmation = lazy(() => import('../checkout/OrderConfirmation'));
const UserProfile = lazy(() => import('../user/UserProfile'));
const VendorProducts = lazy(() => import('../vendor/VendorProducts'));
const VendorDashboard = lazy(() => import('../vendor/VendorDashboard'));
const VendorProfileCompletion = lazy(() => import('../vendor/VendorProfileCompletion'));
const StoreFront = lazy(() => import('../store/StoreFront'));
const ProductDetail = lazy(() => import('../ProductDetail'));
const VendorOrders = lazy(() => import('../vendor/VendorOrders'));
const BarterManagement = lazy(() => import('../vendor/BarterManagement'));
const MyOrders = lazy(() => import('../orders/MyOrders'));
const OrderDetails = lazy(() => import('../orders/OrderDetails'));
const Settings = lazy(() => import('../settings/Settings'));
const AddressBook = lazy(() => import('../settings/AddressBook'));
const NegotiationDashboard = lazy(() => import('../negotiation/NegotiationDashboard.jsx'));
const PaymentSuccess = lazy(() => import('../payment/PaymentSuccess'));
const PaymentFailed = lazy(() => import('../payment/PaymentFailed'));
const PaymentCancel = lazy(() => import('../payment/PaymentCancel'));
const SearchResults = lazy(() => import('../SearchResults'));
const AdminLogin = lazy(() => import('../admin/AdminLogin'));
const PlantDiseaseDetector = lazy(() => import('../PlantDiseaseDetector'));
const VerificationPage = lazy(() => import('../verification/VerificationPage'));
const DiscoverStoresPage = lazy(()=> import('../store/DiscoverStoresPage'));
const AnnouncementsPage = lazy(() => import('../../pages/AnnouncementsPage'));

// Components that don't need loading (simple/lightweight)
import ProtectedRoute from '../auth/ProtectedRoute';
import AdminProtectedRoute from '../auth/AdminProtectedRoute';
import { VendorAuthProvider } from '../../contexts/VendorAuthContext';

const AppRoutes = () => {
  const { setLoading } = useLoading();

  const LoadingFallback = ({ message = "Loading page..." }) => (
    <PageLoader 
      message={message}
      minHeight="h-96"
      showSkeleton={false}
    />
  );

  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route path="/" element={
          <Suspense fallback={<LoadingFallback message="Loading home page..." />}>
            <VendorAuthProvider><Home /></VendorAuthProvider>
          </Suspense>
        } />
        
        <Route path="/search" element={
          <Suspense fallback={<LoadingFallback message="Loading search results..." />}>
            <VendorAuthProvider><SearchResults /></VendorAuthProvider>
          </Suspense>
        } />
        
        <Route path="/shops" element={<h1>Shops</h1>} />
        <Route path="/stores" element={
          <Suspense fallback={<LoadingFallback message="Loading stores..." />}>
            <DiscoverStoresPage />
          </Suspense>
        } />
        
        <Route path="/plant-disease" element={
          <Suspense fallback={<LoadingFallback message="Loading disease detector..." />}>
            <PlantDiseaseDetector />
          </Suspense>
        } />
        
        <Route path="/announcements" element={
          <Suspense fallback={<LoadingFallback message="Loading announcements..." />}>
            <AnnouncementsPage />
          </Suspense>
        } />
        
        <Route path="/deals" element={
          <Suspense fallback={<LoadingFallback message="Loading deals..." />}>
            <VendorAuthProvider><Deals /></VendorAuthProvider>
          </Suspense>
        } />
        
        <Route path="/cart" element={
          <Suspense fallback={<LoadingFallback message="Loading cart..." />}>
            <VendorAuthProvider><ProtectedRoute element={<Cart />} /></VendorAuthProvider>
          </Suspense>
        } />
        
        <Route path="/checkout" element={
          <Suspense fallback={<LoadingFallback message="Loading checkout..." />}>
            <VendorAuthProvider><ProtectedRoute element={<Checkout />} /></VendorAuthProvider>
          </Suspense>
        } />
        
        <Route path="/order-confirmation/:orderNumber" element={
          <Suspense fallback={<LoadingFallback message="Loading order confirmation..." />}>
            <VendorAuthProvider><ProtectedRoute element={<OrderConfirmation />} /></VendorAuthProvider>
          </Suspense>
        } />
        
        <Route path="/user" element={
          <Suspense fallback={<LoadingFallback message="Loading user profile..." />}>
            <VendorAuthProvider><ProtectedRoute element={<UserProfile />} /></VendorAuthProvider>
          </Suspense>
        } />
        
        <Route path="/analysis" element={
          <Suspense fallback={<LoadingFallback message="Loading analysis..." />}>
            <Analysis />
          </Suspense>
        } />
        
        <Route path="/chat" element={
          <Suspense fallback={<LoadingFallback message="Loading chat..." />}>
            <Chat />
          </Suspense>
        } />
        
        <Route path="/messages" element={
          <Suspense fallback={<LoadingFallback message="Loading messages..." />}>
            <VendorAuthProvider><ProtectedRoute element={<MessagingInterface />} /></VendorAuthProvider>
          </Suspense>
        } />

        <Route path="/store/:storeId" element={
          <Suspense fallback={<LoadingFallback message="Loading store..." />}>
            <StoreFront />
          </Suspense>
        } />

        <Route path="/product/:id" element={
          <Suspense fallback={<LoadingFallback message="Loading product..." />}>
            <ProductDetail />
          </Suspense>
        } />
        
        <Route path="/login" element={
          <Suspense fallback={<LoadingFallback message="Loading login..." />}>
            <VendorAuthProvider><Login /></VendorAuthProvider>
          </Suspense>
        } />
        
        <Route path="/signup" element={
          <Suspense fallback={<LoadingFallback message="Loading signup..." />}>
            <SignupChoice />
          </Suspense>
        } />
        
        <Route path="/signup/client" element={
          <Suspense fallback={<LoadingFallback message="Loading client signup..." />}>
            <ClientSignupSimple />
          </Suspense>
        } />
        
        <Route path="/signup/vendor" element={
          <Suspense fallback={<LoadingFallback message="Loading vendor signup..." />}>
            <VendorAuthProvider><VendorSignupSimple /></VendorAuthProvider>
          </Suspense>
        } />
        
        <Route path="/admin" element={
          <Suspense fallback={<LoadingFallback message="Loading admin panel..." />}>
            <AdminProtectedRoute element={<AdminPanel />} />
          </Suspense>
        } />
        
        <Route path="/admin/fraud-panel" element={
          <Suspense fallback={<LoadingFallback message="Loading fraud panel..." />}>
            <AdminProtectedRoute element={<AdminFraudPanelSimple />} />
          </Suspense>
        } />
        
        <Route path="/admin/test-fraud" element={
          <Suspense fallback={<LoadingFallback message="Loading fraud testing..." />}>
            <AdminProtectedRoute element={<FraudTestingPanel />} />
          </Suspense>
        } />
        
        <Route path="/vendor/dashboard" element={
          <Suspense fallback={<LoadingFallback message="Loading vendor dashboard..." />}>
            <VendorAuthProvider>
              <ProtectedRoute element={<VendorDashboard />} requiredRole="vendor" />
            </VendorAuthProvider>
          </Suspense>
        } />
        
        <Route path="/vendor/products" element={
          <Suspense fallback={<LoadingFallback message="Loading vendor products..." />}>
            <VendorAuthProvider>
              <ProtectedRoute element={<VendorProducts />} requiredRole="vendor" />
            </VendorAuthProvider>
          </Suspense>
        } />
        
        <Route path="/vendor/profile" element={
          <Suspense fallback={<LoadingFallback message="Loading vendor profile..." />}>
            <VendorAuthProvider>
              <ProtectedRoute element={<VendorProfileCompletion />} requiredRole="vendor" />
            </VendorAuthProvider>
          </Suspense>
        } />
        
        <Route path="/settings" element={
          <Suspense fallback={<LoadingFallback message="Loading settings..." />}>
            <VendorAuthProvider><ProtectedRoute element={<Settings />} /></VendorAuthProvider>
          </Suspense>
        } />
        
        <Route path="/settings/address-book" element={
          <Suspense fallback={<LoadingFallback message="Loading address book..." />}>
            <VendorAuthProvider><ProtectedRoute element={<AddressBook />} /></VendorAuthProvider>
          </Suspense>
        } />
        
        <Route path="/vendor/orders" element={
          <Suspense fallback={<LoadingFallback message="Loading vendor orders..." />}>
            <VendorAuthProvider>
              <ProtectedRoute element={<VendorOrders />} requiredRole="vendor" />
            </VendorAuthProvider>
          </Suspense>
        } />
        
        <Route path="/vendor/barter" element={
          <Suspense fallback={<LoadingFallback message="Loading barter management..." />}>
            <VendorAuthProvider>
              <ProtectedRoute element={<BarterManagement />} requiredRole="vendor" />
            </VendorAuthProvider>
          </Suspense>
        } />
        
        <Route path="/vendor/groups" element={
          <Suspense fallback={<LoadingFallback message="Loading group management..." />}>
            <VendorAuthProvider>
              <ProtectedRoute element={<GroupManagement />} requiredRole="vendor" />
            </VendorAuthProvider>
          </Suspense>
        } />
        
        <Route path="/orders" element={
          <Suspense fallback={<LoadingFallback message="Loading orders..." />}>
            <VendorAuthProvider><ProtectedRoute element={<MyOrders />} /></VendorAuthProvider>
          </Suspense>
        } />
        
        <Route path="/orders/:orderNumber" element={
          <Suspense fallback={<LoadingFallback message="Loading order details..." />}>
            <VendorAuthProvider><ProtectedRoute element={<OrderDetails />} /></VendorAuthProvider>
          </Suspense>
        } />

        <Route path="/account/verification" element={
          <Suspense fallback={<LoadingFallback message="Loading verification..." />}>
            <VendorAuthProvider><ProtectedRoute element={<VerificationPage />} /></VendorAuthProvider>
          </Suspense>
        } />
        
        <Route path="/negotiations" element={
          <Suspense fallback={<LoadingFallback message="Loading negotiations..." />}>
            <VendorAuthProvider><ProtectedRoute element={<NegotiationDashboard />} /></VendorAuthProvider>
          </Suspense>
        } />
        
        <Route path="/payment/success" element={
          <Suspense fallback={<LoadingFallback message="Loading payment confirmation..." />}>
            <VendorAuthProvider><ProtectedRoute element={<PaymentSuccess />} /></VendorAuthProvider>
          </Suspense>
        } />
        
        <Route path="/payment/fail" element={
          <Suspense fallback={<LoadingFallback message="Loading payment status..." />}>
            <VendorAuthProvider><ProtectedRoute element={<PaymentFailed />} /></VendorAuthProvider>
          </Suspense>
        } />
        
        <Route path="/payment/cancel" element={
          <Suspense fallback={<LoadingFallback message="Loading payment status..." />}>
            <VendorAuthProvider><ProtectedRoute element={<PaymentCancel />} /></VendorAuthProvider>
          </Suspense>
        } />
        
        <Route path="/admin/login" element={
          <Suspense fallback={<LoadingFallback message="Loading admin login..." />}>
            <AdminLogin />
          </Suspense>
        } />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
