// Configuración de Firebase (opcional).
// Si no hay variables VITE_FIREBASE_* en el .env, la app trabaja en
// "Modo demo (sin Firebase)" guardando todo en localStorage.
import { initializeApp } from 'firebase/app';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentSingleTabManager,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId,
);

let app = null;
let db = null;
let auth = null;

if (firebaseConfigured) {
  app = initializeApp(firebaseConfig);
  // Persistencia offline: los datos quedan en IndexedDB y Firestore
  // sincroniza solo cuando hay conexión (API actual de firebase v13).
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentSingleTabManager(),
    }),
  });
  auth = getAuth(app);
}

export { app, db, auth };
