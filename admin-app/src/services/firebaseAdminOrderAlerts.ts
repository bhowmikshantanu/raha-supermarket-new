import * as Device from "expo-device";
import { Platform } from "react-native";

import { auth } from "@/src/config/firebase";
import { getOrCreateExpoPushToken } from "@/src/services/pushNotifications";

const BACKEND_URL = (
  process.env.EXPO_PUBLIC_BACKEND_URL || ""
).replace(/\/+$/, "");

export type OrderAlertRecipient = {
  id: string;
  phone: string;
  active: boolean;
  registeredDevices: number;
};

async function adminRequest(
  path: string,
  init?: RequestInit,
): Promise<any> {
  if (!BACKEND_URL) {
    throw new Error("Backend URL is not configured.");
  }

  const user = auth.currentUser;

  if (!user) {
    throw new Error("Admin login is required.");
  }

  const idToken = await user.getIdToken(true);

  const response = await fetch(
    `${BACKEND_URL}${path}`,
    {
      ...init,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
        ...(init?.headers || {}),
      },
    },
  );

  let body: any = {};

  try {
    body = await response.json();
  } catch {
    body = {};
  }

  if (!response.ok) {
    throw new Error(
      typeof body?.detail === "string"
        ? body.detail
        : `Backend returned ${response.status}.`,
    );
  }

  return body;
}

export async function getOrderAlertRecipients():
Promise<OrderAlertRecipient[]> {
  const result = await adminRequest(
    "/api/admin/order-alert-recipients",
  );

  return Array.isArray(result?.recipients)
    ? result.recipients
    : [];
}

export async function addOrderAlertRecipient(
  phone: string,
): Promise<void> {
  await adminRequest(
    "/api/admin/order-alert-recipients",
    {
      method: "POST",
      body: JSON.stringify({ phone }),
    },
  );
}

export async function removeOrderAlertRecipient(
  id: string,
): Promise<void> {
  await adminRequest(
    `/api/admin/order-alert-recipients/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
    },
  );
}

export async function registerThisDeviceForOrderAlerts(
  phone: string,
): Promise<void> {
  if (Platform.OS === "web") {
    throw new Error(
      "Open Raha Supermarket Android app to register this phone.",
    );
  }

  const expoPushToken =
    await getOrCreateExpoPushToken();

  if (!expoPushToken) {
    throw new Error(
      "Notification permission/token is unavailable on this phone.",
    );
  }

  await adminRequest(
    "/api/admin/order-alert-devices/register",
    {
      method: "POST",
      body: JSON.stringify({
        phone,
        expoPushToken,
        platform: Platform.OS,
        deviceName:
          Device.modelName ??
          Device.deviceName ??
          "Raha Android device",
      }),
    },
  );
}
