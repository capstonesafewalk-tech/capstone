import { db } from './firebaseConfig';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, deleteDoc, orderBy } from 'firebase/firestore';

const BACKEND_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

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
    const activeCrimesQuery = query(collection(db, 'crimes'), where('status', '==', 'active'));
    const archivedCrimesQuery = query(collection(db, 'crimes'), where('status', '==', 'archived'));

    const activeSnapshot = await getDocs(activeCrimesQuery);
    const archivedSnapshot = await getDocs(archivedCrimesQuery);

    const allCrimes = [...activeSnapshot.docs, ...archivedSnapshot.docs].map(doc => doc.data());

    const locationMap = {};
    allCrimes.forEach(crime => {
      if (crime.status === 'active') {
        const key = `${crime.latitude},${crime.longitude}`;
        if (!locationMap[key]) {
          locationMap[key] = { latitude: crime.latitude, longitude: crime.longitude, crime_count: 0 };
        }
        locationMap[key].crime_count++;
      }
    });

    const highRiskAreas = Object.values(locationMap).filter(area => area.crime_count >= 10);
    const recentCrimes = activeSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 10);

    return {
      activeCrimes: activeSnapshot.size,
      archivedCrimes: archivedSnapshot.size,
      highRiskAreas: highRiskAreas.length,
      recentCrimes,
      highRiskLocations: highRiskAreas,
    };
  },

  createCrime: async (crimeData) => {
    const docRef = await addDoc(collection(db, 'crimes'), {
      ...crimeData,
      status: 'active',
      createdAt: new Date(),
    });
    return { id: docRef.id, message: 'Crime report created' };
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
        where('status', 'in', ['pending', 'under_review']),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (_) {
      // Fallback: get all incidents, sort client-side
      const querySnapshot = await getDocs(collection(db, 'incidents'));
      const docs = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      return docs
        .filter(d => !d.status || d.status === 'pending' || d.status === 'under_review')
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

  // ── Super Admin — Brgy User Management (via backend) ──
  getBrgyUsers: () => callBackend('/super-admin/users', 'GET'),
  createBrgyUser: (email, password, brgyName) => callBackend('/super-admin/users', 'POST', { email, password, brgyName }),
  deleteBrgyUser: (uid) => callBackend(`/super-admin/users/${uid}`, 'DELETE'),
};
