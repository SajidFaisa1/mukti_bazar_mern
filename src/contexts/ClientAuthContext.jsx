import React, { createContext, useContext, useState, useEffect } from 'react';
import { signup as firebaseSignup, login as firebaseLogin, logout as firebaseLogout } from '../firebase';

// Simple JWT-based auth context for CLIENTS (buyers)
// – signup: POST /api/clients/signup
// – login:  POST /api/auth/login (role inferred as client)
// – token persisted in localStorage under clientToken
// This context is entirely separate from Vendor Firebase auth

const ClientAuthContext = createContext();

export const ClientAuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('clientToken') || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // populate user if token already present (optional enhancement)
  useEffect(() => {
    if (!token) return;
    // For now the /api/auth/login response already included user, so we store that in localStorage too
    try {
      const stored = JSON.parse(localStorage.getItem('clientUser') || 'null');
      if (stored) setUser(stored);
    } catch (_) {}
  }, [token]);

  const signup = async ({ firstName, lastName, email, password, confirmPassword, phone }) => {
    setError('');
    setSuccess('');
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      // 1. Create Firebase account & send verification
      const firebaseUser = await firebaseSignup(email, password, `${firstName} ${lastName}`);
      await firebaseLogout(); // force email verification before first login

      // 2. Store user in our DB (uid included)
      const res = await fetch('http://localhost:5005/api/clients/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, email, password, confirmPassword, phone, uid: firebaseUser.uid })
      });
      if (!res.ok) {
        const { error = 'Signup failed' } = await res.json().catch(() => ({}));
        throw new Error(error);
      }
      const data = await res.json();
      setSuccess('Account created! Please verify your e-mail then log in.');
      return data;
    } catch (err) {
      console.error(err);
      setError(err.message || 'Signup failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };


  const login = async ({ email, password }) => {
    // Clear any vendor auth remnants when logging in as client
    sessionStorage.removeItem('vendorUser');
    sessionStorage.removeItem('vendorToken');
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      // 1. Firebase auth check (ensures email verified)
      await firebaseLogin(email, password);

      // 2. Backend token/login for app features (keeps previous behaviour)
      const res = await fetch('http://localhost:5005/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      if (!res.ok) {
        const { error = 'Invalid credentials' } = await res.json().catch(() => ({}));
        throw new Error(error);
      }
      const { token: jwt, user: userObj } = await res.json();
      localStorage.setItem('clientToken', jwt);
      localStorage.setItem('clientUser', JSON.stringify(userObj));
      setToken(jwt);
      setUser(userObj);
      setSuccess('Logged in');
      return userObj;
    } catch (err) {
      console.error(err);
      setError(err.message || 'Login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async ({ uid, email, name }) => {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5005/api/auth/google-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, email, name })
      });
      if (!res.ok) {
        const { error = 'Login failed' } = await res.json().catch(() => ({}));
        throw new Error(error);
      }
      const { token: jwt, user: userObj } = await res.json();
      localStorage.setItem('clientToken', jwt);
      localStorage.setItem('clientUser', JSON.stringify(userObj));
      setToken(jwt);
      setUser(userObj);
      setSuccess('Logged in');
      return userObj;
    } catch (err) {
      console.error(err);
      setError(err.message || 'Login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try { await firebaseLogout(); } catch (_) {}
    // remove client artefacts
    localStorage.removeItem('clientToken');
    localStorage.removeItem('clientUser');
    // also clear any vendor artefacts so session is clean
    sessionStorage.removeItem('vendorUser');
    sessionStorage.removeItem('vendorToken');
    setToken(null);
    setUser(null);
  };

  const value = { user, token, loading, error, success, signup, login, loginWithGoogle, logout };
  return <ClientAuthContext.Provider value={value}>{children}</ClientAuthContext.Provider>;
};

export const useClientAuth = () => useContext(ClientAuthContext);
