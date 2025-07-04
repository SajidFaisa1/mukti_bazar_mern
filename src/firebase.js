import { initializeApp } from 'firebase/app';
import { getAuth, 
         createUserWithEmailAndPassword, 
         signInWithEmailAndPassword, 
         signOut, 
         sendEmailVerification,
         onAuthStateChanged,
         updateProfile,
         GithubAuthProvider,
         GoogleAuthProvider,
         FacebookAuthProvider,
         signInWithPopup,
       } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyAyJ0AH8zHErcrTTvlTvfPWsmnIRBtJssw",
  authDomain: "mukti-bazar.firebaseapp.com",
  projectId: "mukti-bazar",
  storageBucket: "mukti-bazar.firebasestorage.app",
  messagingSenderId: "340253137840",
  appId: "1:340253137840:web:8be3882fbc6b35e7b85475"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// OAuth Providers
export const googleProvider = new GoogleAuthProvider();
export const facebookProvider = new FacebookAuthProvider();

export const signup = async (email, password, displayName) => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(userCredential.user, { displayName });
  await sendEmailVerification(userCredential.user);
  return userCredential.user;
};

export const login = async (email, password) => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  if (!userCredential.user.emailVerified) {
    throw new Error('Please verify your email before logging in.');
  }
  return userCredential.user;
};

export const signInWithGoogle = async () => {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
};

export const signInWithFacebook = async () => {
  const result = await signInWithPopup(auth, facebookProvider);
  return result.user;
};

export const logout = async () => {
  await signOut(auth);
};

export const getCurrentUser = () => {
  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(auth, user => {
      unsubscribe();
      resolve(user);
    }, reject);
  });
};