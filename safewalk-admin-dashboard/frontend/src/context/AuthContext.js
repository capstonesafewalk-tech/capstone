import React, { createContext, useState, useCallback } from 'react';
import { auth, db } from '../services/firebaseConfig';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [role, setRole] = useState(localStorage.getItem('role') || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const isSuperAdmin = role === 'superadmin';

  const login = useCallback(async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Get Firebase ID token
      const idToken = await user.getIdToken();

      // Fetch role from Firestore admins collection
      let userRole = 'brgy';
      try {
        const q = query(collection(db, 'admins'), where('uid', '==', user.uid));
        const snap = await getDocs(q);
        if (!snap.empty) {
          userRole = snap.docs[0].data().role || 'brgy';
        } else {
          // Fallback: check by email (for legacy accounts without uid field)
          const qEmail = query(collection(db, 'admins'), where('email', '==', user.email));
          const snapEmail = await getDocs(qEmail);
          if (!snapEmail.empty) {
            userRole = snapEmail.docs[0].data().role || 'brgy';
          }
        }
      } catch (roleErr) {
        console.warn('Could not fetch role from Firestore:', roleErr);
      }

      setToken(idToken);
      setAdmin({ id: user.uid, email: user.email });
      setRole(userRole);
      localStorage.setItem('token', idToken);
      localStorage.setItem('role', userRole);
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
      setRole(null);
      localStorage.removeItem('token');
      localStorage.removeItem('role');
    } catch (err) {
      setError(err.message || 'Logout failed');
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ admin, token, role, isSuperAdmin, loading, error, login, logout }}>
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
