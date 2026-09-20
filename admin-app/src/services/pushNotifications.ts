import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import {
  onAuthStateChanged,
  signInAnonymously,
  type User,
} from "firebase/auth";
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { Platform } from "react-native";

import { auth, db } from "@/src/config/firebase";

type PushRole = "customer" | "admin" | "delivery";

let cachedExpoPushToken: string | null = null;
let registrationPromise: Promise<string | null> | null = null;

export function setupNotificationHandler() {
  // expo-notifications is not supported in the browser preview.
  if (Platform.OS === "web") {
    return;
  }

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

async function createAndroidChannels() {
  if (Platform.OS !== "android") {
    return;
  }

  await Notifications.setNotificationChannelAsync("orders", {
    name: "Orders",
    description: "Order status and delivery updates",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#16A34A",
    sound: "default",
  });

  await Notifications.setNotificationChannelAsync("offers", {
    name: "Offers & Deals",
    description: "Raha Supermarket offers and discounts",
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: "default",
  });

  await Notifications.setNotificationChannelAsync("general", {
    name: "General",
    description: "General Raha Supermarket updates",
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: "default",
  });
}

function getExpoProjectId(): string | undefined {
  const easProjectId = Constants.easConfig?.projectId;

  if (easProjectId) {
    return easProjectId;
  }

  const extra = Constants.expoConfig?.extra as
    | {
        eas?: {
          projectId?: string;
        };
      }
    | undefined;

  return extra?.eas?.projectId;
}

async function ensureFirebaseUser(): Promise<User> {
  if (auth.currentUser) {
    return auth.currentUser;
  }

  // Wait for the persisted session to restore before falling back to
  // anonymous auth â€” prevents clobbering an admin/rider login on app
  // restart.
  const restoredUser = await new Promise<User | null>((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });

  if (restoredUser) {
    return restoredUser;
  }

  const credential = await signInAnonymously(auth);
  return credential.user;
}

async function resolveRole(user: User): Promise<PushRole> {
  try {
    const adminSnapshot = await getDoc(
      doc(db, "admins", user.uid),
    );

    if (
      adminSnapshot.exists() &&
      adminSnapshot.data()?.active === true &&
      adminSnapshot.data()?.role === "admin"
    ) {
      return "admin";
    }
  } catch (error) {
    console.warn("[Push] Admin role lookup failed:", error);
  }

  // Delivery boys sign in with real Firebase Auth (not anonymous).
  // Skip the lookup for anonymous customer sessions â€” that's the vast
  // majority of Firestore reads on this collection today.
  if (!user.isAnonymous) {
    try {
      const deliverySnapshot = await getDoc(
        doc(db, "deliveryBoys", user.uid),
      );

      if (
        deliverySnapshot.exists() &&
        deliverySnapshot.data()?.active !== false
      ) {
        return "delivery";
      }
    } catch (error) {
      console.warn("[Push] Delivery role lookup failed:", error);
    }
  }

  return "customer";
}

async function savePushTokenForUser(
  user: User,
  token: string,
): Promise<void> {
  const role = await resolveRole(user);

  await setDoc(
    doc(db, "pushTokens", user.uid),
    {
      uid: user.uid,
      expoPushToken: token,
      role,
      platform: Platform.OS,
      deviceName:
        Device.modelName ??
        Device.deviceName ??
        "Unknown device",
      email: user.email ?? null,
      isAnonymous: user.isAnonymous,
      active: true,
      updatedAt: serverTimestamp(),
    },
    {
      merge: true,
    },
  );

  console.log(
    "[Push] Token saved to Firestore:",
    user.uid,
    role,
  );
}

export async function getOrCreateExpoPushToken(): Promise<string | null> {
  if (cachedExpoPushToken) {
    return cachedExpoPushToken;
  }

  if (registrationPromise) {
    return registrationPromise;
  }

  registrationPromise = (async () => {
    try {
      await createAndroidChannels();

      if (!Device.isDevice) {
        console.warn(
          "[Push] Remote push notifications require a physical device.",
        );
        return null;
      }

      const currentPermissions =
        await Notifications.getPermissionsAsync();

      let finalStatus = currentPermissions.status;

      if (finalStatus !== "granted") {
        const requestedPermissions =
          await Notifications.requestPermissionsAsync();

        finalStatus = requestedPermissions.status;
      }

      if (finalStatus !== "granted") {
        console.warn(
          "[Push] Notification permission was not granted.",
        );
        return null;
      }

      const projectId = getExpoProjectId();

      if (!projectId) {
        console.warn("[Push] EAS projectId is missing.");
        return null;
      }

      const pushToken =
        await Notifications.getExpoPushTokenAsync({
          projectId,
        });

      cachedExpoPushToken = pushToken.data;

      console.log(
        "[Push] Expo Push Token:",
        pushToken.data,
      );

      return pushToken.data;
    } catch (error) {
      console.error(
        "[Push] Token generation failed:",
        error,
      );
      return null;
    } finally {
      registrationPromise = null;
    }
  })();

  return registrationPromise;
}

export async function registerForPushNotifications(): Promise<
  string | null
> {
  if (Platform.OS === "web") {
    return null;
  }

  const token = await getOrCreateExpoPushToken();

  if (!token) {
    return null;
  }

  const user = await ensureFirebaseUser();
  await savePushTokenForUser(user, token);

  return token;
}

export function startPushTokenRegistrationLifecycle(): () => void {
  // No remote push on web â€” skip entirely so the browser preview
  // never touches expo-notifications native APIs.
  if (Platform.OS === "web") {
    return () => {};
  }

  let cancelled = false;

  void registerForPushNotifications().catch((error) => {
    console.error(
      "[Push] Initial registration failed:",
      error,
    );
  });

  const unsubscribe = onAuthStateChanged(
    auth,
    async (user) => {
      if (cancelled || !user) {
        return;
      }

      try {
        const token = await getOrCreateExpoPushToken();

        if (cancelled || !token) {
          return;
        }

        await savePushTokenForUser(user, token);
      } catch (error) {
        console.error(
          "[Push] Auth-state token registration failed:",
          error,
        );
      }
    },
  );

  return () => {
    cancelled = true;
    unsubscribe();
  };
}

export async function deactivateCurrentPushToken(): Promise<void> {
  const user = auth.currentUser;

  if (!user) {
    return;
  }

  try {
    await setDoc(
      doc(db, "pushTokens", user.uid),
      {
        active: false,
        updatedAt: serverTimestamp(),
      },
      {
        merge: true,
      },
    );
  } catch (error) {
    console.error(
      "[Push] Token deactivation failed:",
      error,
    );
  }
}

export async function scheduleLocalNotification(
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<string> {
  return Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: data ?? {},
      sound: "default",
    },
    trigger: null,
  });
}
