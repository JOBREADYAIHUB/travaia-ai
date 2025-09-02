// Firebase configuration for profile components
import { app } from '../firebaseConfig';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Initialize Firebase services directly
const db = getFirestore(app);
const storage = getStorage(app);

export { db, storage };
