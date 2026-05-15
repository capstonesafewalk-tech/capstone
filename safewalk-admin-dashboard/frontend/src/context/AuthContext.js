import React, { createContext, useState, useCallback } from 'react';
import { auth, db } from '../services/firebaseConfig';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, addDoc } from 'firebase/firestore';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Get token from Firebase
      const idToken = await user.getIdToken();
      
      setToken(idToken);
      setAdmin({ id: user.uid, email: user.email });
      localStorage.setItem('token', idToken);
      return true;
    } catch (err) {
      if (err.code === 'auth/configuration-not-found') {
        setError('Firebase Error: Email/Password authentication is not enabled in your Firebase Console.');
      } else {
        setError(err.message || 'Login failed');
      }
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await signOut(auth);
      setToken(null);
      setAdmin(null);
      localStorage.removeItem('token');
    } catch (err) {
      setError(err.message || 'Logout failed');
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Store admin in Firestore
      await addDoc(collection(db, 'admins'), {
        uid: user.uid,
        email: user.email,
        createdAt: new Date(),
      });
      
      return true;
    } catch (err) {
      if (err.code === 'auth/configuration-not-found') {
        setError('Firebase Error: Email/Password authentication is not enabled in your Firebase Console.');
      } else {
        setError(err.message || 'Registration failed');
      }
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ admin, token, loading, error, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
