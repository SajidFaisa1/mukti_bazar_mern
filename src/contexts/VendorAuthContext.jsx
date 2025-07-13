import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../firebase';
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  reload as reloadUser
} from 'firebase/auth';

/*
  Minimal vendor-only auth context.
  – signupVendor: creates Firebase user, sends verify e-mail, POSTs minimal record to /api/vendors/signup
  – loginVendor: Firebase email/password login, ensures e-mail verified, pulls vendor doc from /api/vendors/uid/:uid
  – logout
*/
const VendorAuthContext = createContext();

export const useVendorAuth = () => useContext(VendorAuthContext) || {};
// Temporary alias so legacy imports of useAuth / AuthProvider keep working
export const useAuth = useVendorAuth;

export const VendorAuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [token, setToken] = useState(() => sessionStorage.getItem('vendorToken') || '');

  // Firebase listener keeps state in sync on refresh
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      // If not verified yet we treat as logged out
      await reloadUser(firebaseUser);
      if (!firebaseUser.emailVerified) {
        setUser(null);
        setLoading(false);
        return;
      }

      // Fetch vendor doc
      try {
        const r = await fetch(`http://localhost:5005/api/vendors/uid/${firebaseUser.uid}`);
        if (r.ok) {
          const vendorData = await r.json();
          // obtain backend JWT
          try {
            const jwtRes = await fetch('http://localhost:5005/api/auth/vendor-jwt', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ uid: firebaseUser.uid })
            });
            if (jwtRes.ok) {
              const { token: jwt } = await jwtRes.json();
              setToken(jwt);
              sessionStorage.setItem('vendorToken', jwt);
            }
          } catch (_) {}

          const fullVendor = { ...vendorData, uid: firebaseUser.uid };
          setUser(fullVendor);
          sessionStorage.setItem('vendorUser', JSON.stringify(fullVendor));
        }
      } catch (_) {}
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // ----- actions -----
  const signupVendor = async ({ businessName, email, password, confirmPassword }) => {
    setError('');
    setSuccess('');
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const { user: firebaseUser } = await createUserWithEmailAndPassword(auth, email, password);
      await sendEmailVerification(firebaseUser);

      // backend record
      const res = await fetch('http://localhost:5005/api/vendors/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessName, email, password, confirmPassword, uid: firebaseUser.uid })
      });
      if (!res.ok) {
        const { error = 'Server error' } = await res.json().catch(() => ({}));
        throw new Error(error);
      }

      await firebaseSignOut(auth); // force email verification login
      setSuccess('Account created! Verify your email then log in.');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  const loginVendor = async ({ email, password }) => {
    // Clear any existing client auth remnants when logging in as vendor
    localStorage.removeItem('clientToken');
    localStorage.removeItem('clientUser');
    setError('');
    setLoading(true);
    try {
      const { user: firebaseUser } = await signInWithEmailAndPassword(auth, email, password);
      await reloadUser(firebaseUser);
      if (!firebaseUser.emailVerified) {
        await firebaseSignOut(auth);
        throw new Error('Please verify your email before logging in.');
      }
      // fetch vendor doc
      const r = await fetch(`http://localhost:5005/api/vendors/uid/${firebaseUser.uid}`);
      if (!r.ok) throw new Error('Account not found.');
      const vendorData = await r.json();

      // obtain backend JWT to access protected routes
      try {
        const jwtRes = await fetch('http://localhost:5005/api/auth/vendor-jwt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uid: firebaseUser.uid })
        });
        if (jwtRes.ok) {
          const { token: jwt } = await jwtRes.json();
          setToken(jwt);
          sessionStorage.setItem('vendorToken', jwt);
        }
      } catch (_) {}

      const fullVendor = { ...vendorData, uid: firebaseUser.uid };
      setUser(fullVendor);
      sessionStorage.setItem('vendorUser', JSON.stringify(fullVendor));
    } catch (err) {
      console.error(err);
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    // also clear any client artefacts so session is clean
    localStorage.removeItem('clientToken');
    localStorage.removeItem('clientUser');
    await firebaseSignOut(auth);
    sessionStorage.removeItem('vendorUser');
    sessionStorage.removeItem('vendorToken');
    setToken('');
    setUser(null);
  };

  const role = user?.role || null;
  const isApproved = user?.isApproved || false;
  // Provide legacy-friendly aliases `login` and `signup` so older components work without refactor
  const value = {
    user,
    role,
    isApproved,
    token,
    loading,
    error,
    success,
    signupVendor,
    loginVendor,
    logout,
    // aliases
    login: loginVendor,
    signup: signupVendor,
  };
  return <VendorAuthContext.Provider value={value}>{children}</VendorAuthContext.Provider>;
};

// Legacy export names to keep existing imports working
export const AuthProvider = VendorAuthProvider;
export default VendorAuthProvider;
