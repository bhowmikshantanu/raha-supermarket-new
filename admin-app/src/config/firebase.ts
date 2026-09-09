import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  getApp,
  getApps,
  initializeApp,
} from "firebase/app";

import {
  getAuth,
  initializeAuth,
  type Auth,
  type Persistence,
} from "firebase/auth";

import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

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

/*
 * firebase v12 ships `getReactNativePersistence` only in its
 * react-native bundle (which Metro resolves for iOS/Android). The
 * browser type declarations do not expose it, so we look it up
 * dynamically to stay TypeScript-clean on every platform.
 *
 * - Native: AsyncStorage persistence -> logins survive app restarts.
 * - Web: falls back to getAuth() -> default indexedDB persistence,
 *   so admin sessions survive browser refreshes.
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const firebaseAuthModule = require("firebase/auth") as {
  getReactNativePersistence?: (
    storage: typeof AsyncStorage,
  ) => Persistence;
};

function createAuth(): Auth {
  try {
    const getRNPersistence =
      firebaseAuthModule.getReactNativePersistence;

    if (getRNPersistence) {
      return initializeAuth(app, {
        persistence: getRNPersistence(AsyncStorage),
      });
    }

    return getAuth(app);
  } catch {
    return getAuth(app);
  }
}

export const auth = createAuth();

export const db = getFirestore(app);
export const storage = getStorage(app);