





// import React, { createContext, useContext, useState, useEffect } from 'react';
// import { auth } from '../firebase';
// import { 
//   onAuthStateChanged, 
//   createUserWithEmailAndPassword, 
//   sendEmailVerification, 
//   signInWithEmailAndPassword,
//   reload as reloadUser,
//   signOut as firebaseSignOut
// } from 'firebase/auth';

// const AuthContext = createContext();

// export const useAuth = () => {
//   return useContext(AuthContext);
// };

// export const AuthProvider = ({ children }) => {
//   const [user, setUser] = useState(null);
//   const [role, setRole] = useState(null);
//   const [isActive, setIsActive] = useState(false);
//   const [loading, setLoading] = useState(true);
//   const [emailVerified, setEmailVerified] = useState(false);
//   const [error, setError] = useState('');
//   const [success, setSuccess] = useState('');

//   // Helper function to fetch user data from the combined users/vendors endpoint
//   const fetchUserData = async (uid, email) => {
//     try {
//       // Use the combined endpoint that checks both users and vendors
//       const response = await fetch(`http://localhost:5005/api/users/${uid}`);
      
//       if (!response.ok) {
//         console.error('User not found in both users and vendors');
//         return null;
//       }
      
//       if (response.ok) {
//         const userData = await response.json();
        
//         // Update state with user data
//         const currentUser = {
//           ...userData,
//           uid: uid,
//           email: email,
//           emailVerified: auth.currentUser?.emailVerified || false
//         };
        
//         setUser(currentUser);
//         setRole(userData.role || 'client');
//         setIsActive(userData.isActive !== false);
//         setEmailVerified(auth.currentUser?.emailVerified || false);
        
//         // Store in local storage
//         localStorage.setItem('user', JSON.stringify(currentUser));
//         localStorage.setItem('role', userData.role || 'client');
//         localStorage.setItem('isActive', String(userData.isActive !== false));
//         localStorage.setItem('emailVerified', String(auth.currentUser?.emailVerified || false));
        
//         return userData;
//       }
      
//       console.error('User not found in both users and vendors');
//       return null;
      
//     } catch (err) {
//       console.error('Error getting user data:', err);
//       return null;
//     }
//   };

//   // Set up auth state listener
//   useEffect(() => {
//     const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
//       if (firebaseUser) {
//         // User is signed in with Firebase
//         await fetchUserData(firebaseUser.uid, firebaseUser.email);
//       } else {
//         // User is signed out
//         setUser(null);
//         setRole(null);
//         setIsActive(false);
//         setEmailVerified(false);
//         localStorage.removeItem('user');
//         localStorage.removeItem('role');
//         localStorage.removeItem('isActive');
//         localStorage.removeItem('emailVerified');
//       }
//       setLoading(false);
//     });

//     // Cleanup subscription on unmount
//     return () => unsubscribe();
//   }, []);

//   // Login function
//   const login = async (credentials) => {
//     setError('');
//     setLoading(true);
    
//     try {
//       // Handle Firebase UID login (for clients)
//       if (credentials.firebaseUid) {
//         const data = await fetchUserData(credentials.firebaseUid, credentials.email);
//         if (!data) {
//           setError('Account not found. Please complete signup.');
//           return null;
//         }
//         return data;
//       }
      
//       // Handle email/password login (for vendors/admins)
//       const { email, password } = credentials;
  
//       try {
//         // First try admin login
//         if (email === 'admin@example.com') {
//           const response = await fetch('http://localhost:5005/api/admin/login', {
//             method: 'POST',
//             headers: { 'Content-Type': 'application/json' },
//             body: JSON.stringify({
//               email,
//               password
//             })
//           });

//           if (!response.ok) {
//             const errorData = await response.json().catch(() => ({}));
//             throw new Error(errorData.error || 'Admin login failed. Please check your credentials.');
//           }

//           const data = await response.json();
//           const adminUser = {
//             ...data.user,
//             uid: 'admin-1',
//             emailVerified: true,
//             profileImage: null
//           };

//           setUser(adminUser);
//           setRole('admin');
//           setIsActive(true);
//           setEmailVerified(true);
//           setIsApproved(true);

//           localStorage.setItem('user', JSON.stringify(adminUser));
//           localStorage.setItem('role', 'admin');
//           localStorage.setItem('isActive', 'true');
//           localStorage.setItem('emailVerified', 'true');
//           localStorage.setItem('profileImage', '');
//           localStorage.setItem('isApproved', 'true');

//           return adminUser;
//         }

//         // For regular users (vendors/clients)
//         const { user: firebaseUser } = await signInWithEmailAndPassword(auth, email, password);
        
//         // Reload user to get latest emailVerified status after verification
//         await reloadUser(firebaseUser);

//         // Check if email is verified
//         if (!firebaseUser.emailVerified) {
//           await firebaseSignOut(auth);
//           setError('Please verify your email before logging in.');
//           return null;
//         }
        
//         // Fetch user/vendor data from backend
//         const userData = await fetchUserData(firebaseUser.uid, firebaseUser.email);
//         if (!userData) {
//           await firebaseSignOut(auth);
//           setError('Account not found. Please complete signup or contact support.');
//           return null;
//         }

//         // For vendors ensure admin approval
//         if (userData.role === 'vendor' && !userData.isApproved) {
//           await firebaseSignOut(auth);
//           setError('Your account is pending admin approval');
//           return null;
//         }
        
//         return userData;
        
//       } catch (firebaseError) {
//         console.error('Firebase auth error:', firebaseError);
        
//         // Handle specific Firebase errors
//         if (firebaseError.code) {
//           switch (firebaseError.code) {
//             case 'auth/user-not-found':
//             case 'auth/wrong-password':
//               setError('Invalid email or password');
//               break;
//             case 'auth/too-many-requests':
//               setError('Too many login attempts. Please try again later.');
//               break;
//             default:
//               setError(firebaseError.message || 'Authentication failed. Please try again.');
//           }
//         } else {
//           setError('An unexpected error occurred. Please try again.');
//         }
//         return null;
//       }
      
//     } catch (error) {
//       console.error('Login error:', error);
//       setError('An error occurred during login. Please try again.');
//       return null;
      
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Vendor signup function
//   const signupVendor = async ({ businessName, email, password, confirmPassword }) => {
//     try {
//       setError('');
//       setLoading(true);

//       // 1. Create Firebase Auth user in Firebase
//       const { user: firebaseUser } = await createUserWithEmailAndPassword(
//         auth,
//         email,
//         password
//       );

//       // 2. Send email verification
//       await sendEmailVerification(firebaseUser);

//       // 3. Persist minimal vendor document in our backend
//       const response = await fetch('http://localhost:5005/api/vendors/signup', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({
//           businessName,
//           email,
//           password,
//           confirmPassword,
//           uid: firebaseUser.uid
//         })
//       });

//       if (!response.ok) {
//         const { error = 'Server error' } = await response.json().catch(() => ({}));
//         throw new Error(error);
//       }

//       // 4. Force email verification before first login
//       await logout();

//       setSuccess('Vendor account created! Verify your email, then log in to complete your profile.');
//       return { uid: firebaseUser.uid };
//     } catch (err) {
//       console.error('Vendor signup error:', err);
//       setError(err.message || 'Failed to create vendor account.');
//       throw err;
//     } finally {
//       setLoading(false);
//     }
//   };


//     try {
//       setError('');
//       setLoading(true);
      
//       // 1. Create Firebase Auth user
//       const { user: firebaseUser } = await createUserWithEmailAndPassword(
//         auth,
//         formData.email,
//         formData.password
//       );

//       // 2. Send email verification
//       await sendEmailVerification(firebaseUser);

//       // 3. Create vendor in backend
//       const response = await fetch('http://localhost:5005/api/vendors/signup', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({
//           ...formData,
//           uid: firebaseUser.uid,
//           emailVerified: firebaseUser.emailVerified,
//           role: 'vendor'
//         })
//       });
      
//       if (!response.ok) {
//         ...formData,
//         uid: firebaseUser.uid,
//         emailVerified: firebaseUser.emailVerified,
//         role: 'vendor'
//       })
//     });
    
//     if (!response.ok) {
//       const error = await response.json().catch(() => ({}));
//       throw new Error(error.error || 'Server error');
//       delete userData.vendorProfileImage;
//       delete userData.kycDocument;
//       delete userData.farmingLicense;
      
      
      
      
      
//       // Sign out the user after successful signup
//       await logout();
      
//       setSuccess('Vendor account created! Verify your email, then log in to complete your profile.');
//       return {
//         ...vendorData,
//         emailVerified: firebaseUser.emailVerified,
//         uid: firebaseUser.uid
//       };
//     } catch (error) {
//       console.error('Vendor signup error:', error);
      
//       // Handle specific Firebase errors
//       if (error.code) {
//         switch (error.code) {
//           case 'auth/email-already-in-use':
//             setError('An account with this email already exists.');
//             break;
//           case 'auth/invalid-email':
//             setError('Please enter a valid email address.');
//             break;
//           case 'auth/weak-password':
//             setError('Password should be at least 6 characters.');
//             break;
//           default:
//             setError(error.message || 'Failed to create vendor account. Please try again.');
//         }
//       } else {
//         setError(error.message || 'Failed to create vendor account. Please try again.');
//       }
      
//       throw error;
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Client signup function
//   const signup = async (userData) => {
//     try {
//       setError('');
//       setLoading(true);
      
//       // Don't allow admin signup through the regular signup form
//       if (userData.role === 'admin') {
//         throw new Error('Admin accounts cannot be created through signup');
//       }
      
//       // 1. Create Firebase Auth user
//       const { user: firebaseUser } = await createUserWithEmailAndPassword(
//         auth,
//         userData.email,
//         userData.password
//       );
      
//       // 2. Send email verification
//       await sendEmailVerification(firebaseUser);
      
//       // 3. Create user in backend
//       const response = await fetch('http://localhost:5005/api/clients/signup', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({
//           uid: firebaseUser.uid,
//           email: firebaseUser.email,
//           ...userData,
//           role: 'client', // Default role for signup
//           emailVerified: firebaseUser.emailVerified
//         })
//       });
      
//       if (!response.ok) {
//         const error = await response.json();
//         throw new Error(error.message || 'Failed to create user');
//       }
      
//       const createdUser = await response.json();
      
//       // Sign out the user after successful signup
//       await logout();
      
//       setSuccess('Account created successfully! Please check your email to verify your account.');
//       return createdUser;
//     } catch (error) {
//       console.error('Signup error:', error);
      
//       // Handle specific Firebase errors
//       if (error.code) {
//         switch (error.code) {
//           case 'auth/email-already-in-use':
//             setError('An account with this email already exists.');
//             break;
//           case 'auth/invalid-email':
//             setError('Please enter a valid email address.');
//             break;
//           case 'auth/weak-password':
//             setError('Password should be at least 6 characters.');
//             break;
//           default:
//             setError(error.message || 'Failed to create account. Please try again.');
//         }
//       } else {
//         setError(error.message || 'Failed to create account. Please try again.');
//       }
      
//       throw error;
//     } finally {
//       setLoading(false);
//     }
//   };



//     try {
//       setError('');
//       setLoading(true);
      
//       const response = await fetch(`http://localhost:5005/api/vendors/approve/${vendorId}`, {
//         method: 'PATCH',
//         headers: { 'Content-Type': 'application/json' }
//       });
      
//       if (!response.ok) {
//         const error = await response.json();
//         throw new Error(error.message || 'Failed to approve vendor');
//       }
      
//       return await response.json();
//     } catch (error) {
//       console.error('Error approving vendor:', error);
//       setError(error.message || 'Failed to approve vendor. Please try again.');
//       throw error;
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Logout function
//   const logout = async () => {
//     try {
//       setError('');
//       await firebaseSignOut(auth);
      
//       // Clear state
//       setUser(null);
//       setRole(null);
//       setIsActive(false);
//       setEmailVerified(false);
      
//       // Clear local storage
//       localStorage.clear();
      
//       // Force a hard refresh to ensure all state is reset
//       window.location.href = '/login';
//     } catch (error) {
//       console.error('Logout error:', error);
//       setError('Failed to log out. Please try again.');
//       throw error;
//     }
//   };

//   // Context value
//   const value = {
//     user,
//     role,
//     isActive,
//     loading,
//     emailVerified,
//     error,
//     success,
//     login,
//     logout,
//     signup,
//     signupVendor,
//     approveVendor
//   };

//   return (
//     <AuthContext.Provider value={value}>
//       {!loading && children}
//     </AuthContext.Provider>
//   );
// };

// export default AuthProvider;

// // Export approveVendor and approveProduct as standalone functions
// export const approveVendor = async (vendorId) => {
//   try {
//     const response = await fetch(`http://localhost:5005/api/vendors/approve/${vendorId}`, {
//       method: 'PATCH',
//       headers: { 'Content-Type': 'application/json' }
//     });

//     if (!response.ok) {
//       const error = await response.json();
//       throw new Error(error.message || 'Failed to approve vendor');
//     }

//     return await response.json();
//   } catch (error) {
//     console.error('Error approving vendor:', error);
//     throw error;
//   }
// };

// export const approveProduct = async (productId) => {
//   try {
//     const response = await fetch(`http://localhost:5005/api/products/approve/${productId}`, {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' }
//     });

//     if (!response.ok) {
//       const error = await response.json();
//       throw new Error(error.message || 'Failed to approve product');
//     }

//     return await response.json();
//   } catch (error) {
//     console.error('Error approving product:', error);
//     throw error;
//   }
// };
