import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  getApp,
  getApps,
  initializeApp,
  type FirebaseApp,
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

function createAuth(targetApp: FirebaseApp): Auth {
  try {
    const getRNPersistence =
      firebaseAuthModule.getReactNativePersistence;

    if (getRNPersistence) {
      return initializeAuth(targetApp, {
        persistence: getRNPersistence(AsyncStorage),
      });
    }

    return getAuth(targetApp);
  } catch {
    return getAuth(targetApp);
  }
}

export const auth = createAuth(app);

/*
 * Customer orders use their own Firebase Auth session.
 * Admin/delivery login must never replace the customer's
 * anonymous authentication session.
 */
const CUSTOMER_APP_NAME = "raha-customer";

export const customerApp =
  getApps().find(
    (existingApp) =>
      existingApp.name === CUSTOMER_APP_NAME,
  ) ??
  initializeApp(
    firebaseConfig,
    CUSTOMER_APP_NAME,
  );

export const customerAuth =
  createAuth(customerApp);

export const db = getFirestore(app);

export const customerDb =
  getFirestore(customerApp);

export const storage = getStorage(app);