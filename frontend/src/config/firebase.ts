import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  getApp,
  getApps,
  initializeApp,
} from "firebase/app";

import {
  getAuth,
  getReactNativePersistence,
  initializeAuth,
  type Auth,
} from "firebase/auth";

import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey:
    "AIzaSyAauK1bUbKhjMrWCj3ZlcebEuP4hfIAy2E",
  authDomain:
    "raha-supermarket.firebaseapp.com",
  projectId: "raha-supermarket",
  storageBucket:
    "raha-supermarket.firebasestorage.app",
  messagingSenderId: "445497095650",
  appId:
    "1:445497095650:web:cccdfafeba2366e14d75bb",
};

export const app =
  getApps().length > 0
    ? getApp()
    : initializeApp(firebaseConfig);

function createAuth(): Auth {
  try {
    return initializeAuth(app, {
      persistence:
        getReactNativePersistence(
          AsyncStorage,
        ),
    });
  } catch {
    return getAuth(app);
  }
}

export const auth = createAuth();

export const db = getFirestore(app);