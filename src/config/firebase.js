// src/config/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Firebase configuration จากโปรเจคเว็บ
const firebaseConfig = {
  apiKey: "AIzaSyAzZMBCRgWHjRn1gL2umKadATEUytrAQkA",
  authDomain: "arproject-b2e7b.firebaseapp.com",
  databaseURL: "https://arproject-b2e7b-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "arproject-b2e7b",
  storageBucket: "arproject-b2e7b.appspot.com",
  messagingSenderId: "1078776578060",
  appId: "1:1078776578060:web:798a417cc282a9a149ee29",
  measurementId: "G-NZL9ZDREN5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth with AsyncStorage persistence
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

// Initialize Firestore and Storage
const db = getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage };
export default app;