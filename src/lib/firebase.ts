import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBKacfaGKJoh7-2q2zgKYxDGGuRy5v90mU",
  authDomain: "masksolutions-464416.firebaseapp.com",
  databaseURL: "https://masksolutions-464416-default-rtdb.firebaseio.com",
  projectId: "masksolutions-464416",
  storageBucket: "masksolutions-464416.firebasestorage.app",
  messagingSenderId: "661722209769",
  appId: "1:661722209769:web:cc8ae0f4eb02031f3fff78",
  measurementId: "G-SXMYH21YJ4"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const auth = getAuth(app);
const db = getDatabase(app);
const storage = getStorage(app);

export { app, auth, db, storage };
