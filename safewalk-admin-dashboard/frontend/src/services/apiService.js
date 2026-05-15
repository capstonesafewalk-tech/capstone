import { db } from './firebaseConfig';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, deleteDoc, orderBy } from 'firebase/firestore';

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

  // Incident endpoints
  getIncidents: async () => {
    const q = query(collection(db, 'incidents'), orderBy('timestamp', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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
};
