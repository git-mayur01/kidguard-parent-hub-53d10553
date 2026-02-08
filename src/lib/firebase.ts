import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCubo9jivz4xgAz3i5RBhaXTEAwLYrk7Os",
  authDomain: "kidguard-17180.firebaseapp.com",
  projectId: "kidguard-17180",
  storageBucket: "kidguard-17180.firebasestorage.app",
  messagingSenderId: "618750014493",
  appId: "1:618750014493:web:69371b67dfaca25e6d02f4",
  measurementId: "G-1HVC628XLG"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
