import { db } from './firebaseConfig';
import {
  collection, query, where, getDocs, addDoc,
  updateDoc, doc, deleteDoc, orderBy, setDoc, getDoc,
} from 'firebase/firestore';
import {
  initializeApp, getApps, deleteApp,
} from 'firebase/app';
import {
  getAuth, createUserWithEmailAndPassword,
  updatePassword, signOut as fbSignOut,
} from 'firebase/auth';

const BACKEND_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// ── Secondary Firebase app (isolated) for creating tanod accounts ─────────────
// Using a secondary app means the admin's own auth session is NEVER disturbed.
const SECONDARY_APP_NAME = 'tanod-creator';
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyAUbtoBgI9k3s7GpNBKtN0YGD-OqWJfOVs",
  authDomain: "safewalk-e4af1.firebaseapp.com",
  projectId: "safewalk-e4af1",
  storageBucket: "safewalk-e4af1.firebasestorage.app",
  messagingSenderId: "1003443990353",
  appId: "1:1003443990353:web:c9653ce6140954fa062d70",
};

const callBackend = async (path, method = 'GET', body = null) => {
  const token = localStorage.getItem('token');
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BACKEND_URL}${path}`, opts);
  if (!res.ok) { const err = await res.json().catch(() => ({ error: res.statusText })); throw new Error(err.error || 'Request failed'); }
  return res.json();
};

export const apiService = {
  // Crime endpoints
  getCrimes: async () => {
    const q = query(collection(db, 'crimes'), where('status', '==', 'active'));
    const querySnapshot = await getDocs(q);
    const docs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return docs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  },

  getAllCrimes: async () => {
    const q = query(collection(db, 'crimes'), orderBy('timestamp', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  getArchivedCrimes: async () => {
    const q = query(collection(db, 'crimes'), where('status', '==', 'archived'));
    const querySnapshot = await getDocs(q);
    const docs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return docs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  },

  getStatistics: async () => {
    const [activeSnapshot, archivedSnapshot, solvedSnapshot] = await Promise.all([
      getDocs(query(collection(db, 'crimes'), where('status', '==', 'active'))),
      getDocs(query(collection(db, 'crimes'), where('status', '==', 'archived'))),
      getDocs(query(collection(db, 'crimes'), where('status', '==', 'solved'))),
    ]);

    const activeDocs = activeSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    const recentCrimes = [...activeDocs]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 10);

    return {
      activeCrimes:   activeSnapshot.size,
      archivedCrimes: archivedSnapshot.size,
      solvedCrimes:   solvedSnapshot.size,
      recentCrimes,
      activeDocs,   // full active crime list for chart computations
    };
  },


  createCrime: async (crimeData) => {
    const docRef = await addDoc(collection(db, 'crimes'), {
      status: 'active', // default — overridden if crimeData.status is provided
      ...crimeData,
      createdAt: new Date(),
    });
    return { id: docRef.id, message: 'Crime report created' };
  },

  getSolvedCrimes: async () => {
    const q = query(collection(db, 'crimes'), where('status', '==', 'solved'));
    const querySnapshot = await getDocs(q);
    const docs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return docs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  },

  updateCrime: async (id, crimeData) => {
    await updateDoc(doc(db, 'crimes', id), {
      ...crimeData,
      updatedAt: new Date(),
    });
    return { message: 'Crime report updated' };
  },

  archiveCrime: async (id) => {
    await updateDoc(doc(db, 'crimes', id), {
      status: 'archived',
      updatedAt: new Date(),
    });
    return { message: 'Crime report archived' };
  },

  restoreCrime: async (id) => {
    await updateDoc(doc(db, 'crimes', id), {
      status: 'active',
      updatedAt: new Date(),
    });
    return { message: 'Crime report restored' };
  },

  // Permanently delete a crime (Super Admin only)
  deleteCrime: async (id) => {
    await deleteDoc(doc(db, 'crimes', id));
    return { message: 'Crime report permanently deleted' };
  },

  // Incident endpoints
  getIncidents: async () => {
    // Try ordering by createdAt (Firestore server timestamp from mobile app);
    // fall back to all docs sorted client-side if index is missing
    try {
      const q = query(
        collection(db, 'incidents'),
        where('status', 'in', ['verify', 'pending', 'duplicated', 'fabricated', 'under_review']),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (_) {
      // Fallback: get all incidents, sort client-side
      const querySnapshot = await getDocs(collection(db, 'incidents'));
      const docs = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      return docs
        .filter(d => !d.status || ['verify', 'pending', 'duplicated', 'fabricated', 'under_review'].includes(d.status))
        .sort((a, b) => {
          const tA = a.createdAt?.toDate?.() || new Date(a.timestamp || 0);
          const tB = b.createdAt?.toDate?.() || new Date(b.timestamp || 0);
          return tB - tA;
        });
    }
  },

  getIncidentById: async (id) => {
    const docSnapshot = await getDocs(query(collection(db, 'incidents'), where('__name__', '==', id)));
    if (docSnapshot.empty) return null;
    return { id: docSnapshot.docs[0].id, ...docSnapshot.docs[0].data() };
  },

  updateIncident: async (id, status) => {
    await updateDoc(doc(db, 'incidents', id), {
      status,
      updatedAt: new Date(),
    });
    return { message: 'Incident updated' };
  },

  approveIncident: async (id) => {
    await updateDoc(doc(db, 'incidents', id), {
      status: 'approved',
      updatedAt: new Date(),
    });
    return { message: 'Incident approved' };
  },


  deleteIncident: async (id) => {
    await deleteDoc(doc(db, 'incidents', id));
    return { message: 'Incident deleted' };
  },

  // ── Tanod Account Management (secondary Firebase app — admin never signed out) ─
  getTanodAccounts: async () => {
    const snap = await getDocs(query(collection(db, 'admins'), where('role', '==', 'tanod')));
    const accounts = snap.docs.map(d => {
      const data = d.data();
      return {
        uid: d.id,
        name: data.name || '',
        email: data.email || '',
        isActive: data.isActive !== false,
        createdAt: data.createdAt?.toDate?.() || null,
      };
    });
    accounts.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    return accounts;
  },

  createTanodAccount: async ({ fullName, email, password }) => {
    // Use a secondary isolated Firebase app so the admin stays signed in
    let secondaryApp;
    let isNewApp = false;
    try {
      const existing = getApps().find(a => a.name === SECONDARY_APP_NAME);
      if (existing) {
        secondaryApp = existing;
      } else {
        secondaryApp = initializeApp(FIREBASE_CONFIG, SECONDARY_APP_NAME);
        isNewApp = true;
      }

      const secondaryAuth = getAuth(secondaryApp);

      // Create the user in Firebase Auth using the secondary app
      const credential = await createUserWithEmailAndPassword(
        secondaryAuth,
        email.trim().toLowerCase(),
        password,
      );
      const uid = credential.user.uid;

      // Sign out the secondary app immediately — keeps it clean
      await fbSignOut(secondaryAuth);

      // Save tanod profile in Firestore admins collection
      await setDoc(doc(db, 'admins', uid), {
        uid,
        email: email.trim().toLowerCase(),
        name: fullName.trim(),
        role: 'tanod',
        isActive: true,
        createdAt: new Date(),
      });

      return { uid, email: email.trim().toLowerCase(), name: fullName.trim() };
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        throw new Error('An account with that email already exists.');
      }
      if (err.code === 'auth/invalid-email') {
        throw new Error('Invalid email address.');
      }
      if (err.code === 'auth/weak-password') {
        throw new Error('Password must be at least 6 characters.');
      }
      throw new Error(err.message || 'Failed to create account.');
    } finally {
      // Clean up the secondary app instance
      if (isNewApp && secondaryApp) {
        try { await deleteApp(secondaryApp); } catch { /* ignore */ }
      }
    }
  },

  setTanodAccountStatus: async (uid, isActive) => {
    await updateDoc(doc(db, 'admins', uid), { isActive });
    return { message: `Account ${isActive ? 'activated' : 'deactivated'}.` };
  },

  resetTanodPassword: async (uid, newPassword) => {
    // Send a Firebase password reset email to the tanod's registered email.
    // This is the secure approach — no plaintext passwords ever stored.
    const snap = await getDoc(doc(db, 'admins', uid));
    if (!snap.exists()) throw new Error('Tanod account not found.');
    const email = snap.data().email;
    if (!email) throw new Error('No email found for this account.');

    const { sendPasswordResetEmail } = await import('firebase/auth');
    const { auth } = await import('./firebaseConfig');
    await sendPasswordResetEmail(auth, email);
    return { message: `Password reset email sent to ${email}.` };
  },

};
