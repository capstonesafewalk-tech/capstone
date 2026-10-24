const admin = require('firebase-admin');
require('dotenv').config();

const firebaseConfig = {
  apiKey: "AIzaSyAUbtoBgI9k3s7GpNBKtN0YGD-OqWJfOVs",
  authDomain: "safewalk-e4af1.firebaseapp.com",
  projectId: "safewalk-e4af1",
  storageBucket: "safewalk-e4af1.firebasestorage.app",
  messagingSenderId: "1003443990353",
  appId: "1:1003443990353:web:c9653ce6140954fa062d70"
};

let db = null;
let adminAuth = null;

try {
  if (process.env.FIREBASE_CREDENTIALS) {
    const credentials = JSON.parse(process.env.FIREBASE_CREDENTIALS);
    admin.initializeApp({
      credential: admin.credential.cert(credentials),
      projectId: firebaseConfig.projectId,
    });
  } else {
    // Use default credentials or skip Firebase
    try {
      admin.initializeApp({
        projectId: firebaseConfig.projectId,
      });
    } catch (e) {
      console.warn('Firebase Admin SDK initialization skipped - credentials not available');
    }
  }
  
  db = admin.firestore();
  adminAuth = admin.auth();
} catch (error) {
  console.warn('Firebase initialization failed:', error.message);
  console.log('Running in offline mode - Firebase features will be unavailable');
}

// Mock implementations for development
const mockDb = {
  collection: () => ({
    add: () => Promise.resolve({ id: 'mock-id' }),
    where: () => ({
      get: () => Promise.resolve({ docs: [] })
    }),
    doc: () => ({
      get: () => Promise.resolve({ data: () => ({}) }),
      delete: () => Promise.resolve()
    })
  })
};

const mockAuth = {
  createUser: ({ email, password }) => Promise.resolve({ uid: 'mock-uid', email }),
  deleteUser: () => Promise.resolve(),
  getUser: () => Promise.resolve({ uid: 'mock-uid' })
};

module.exports = { 
  db: db || mockDb,
  admin: { auth: () => adminAuth || mockAuth, ...admin }
};
