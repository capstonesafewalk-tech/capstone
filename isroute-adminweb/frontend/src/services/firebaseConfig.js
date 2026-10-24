import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAUbtoBgI9k3s7GpNBKtN0YGD-OqWJfOVs",
  authDomain: "safewalk-e4af1.firebaseapp.com",
  projectId: "safewalk-e4af1",
  storageBucket: "safewalk-e4af1.firebasestorage.app",
  messagingSenderId: "1003443990353",
  appId: "1:1003443990353:web:c9653ce6140954fa062d70"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
