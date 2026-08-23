/**
 * Delivery-rider ("Delivery Boy") data service.
 *
 * Keeps everything additive — no existing service or Firestore
 * document required by the current admin/customer flow is touched.
 *
 * Collections used
 *  - deliveryBoys           (new)  document id === firebaseUid
 *  - pushTokens             (existing) role field already supports "delivery"
 *
 * Firebase Auth user creation is delegated to the backend because
 * only the Admin SDK can create email/password users. Local reads
 * and non-privileged writes (name, mobile, vehicleNumber, active)
 * go directly to Firestore.
 */

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type DocumentData,
  type Unsubscribe,
} from "firebase/firestore";

import { auth, db } from "@/src/config/firebase";
import type { DeliveryBoy } from "@/src/types";

const DELIVERY_BOYS_COLLECTION = "deliveryBoys";
const PUSH_TOKENS_COLLECTION = "pushTokens";

const BACKEND_URL = (
  process.env.EXPO_PUBLIC_BACKEND_URL || ""
).replace(/\/+$/, "");

// -----------------------------------------------------------------------------
// Mapping helpers
// -----------------------------------------------------------------------------

function toEpochMillis(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (
    value &&
    typeof value === "object" &&
    typeof (value as { toMillis?: () => number }).toMillis === "function"
  ) {
    try {
      return (value as { toMillis: () => number }).toMillis();
    } catch {
      return fallback;
    }
  }
  return fallback;
}

function documentToDeliveryBoy(
  id: string,
  data: DocumentData | undefined,
): DeliveryBoy | null {
  if (!data) return null;

  const name = String(data.name ?? "").trim();
  const mobile = String(data.mobile ?? "").trim();
  const email = String(data.email ?? "").trim();

  if (!name || !mobile) {
    // Skip malformed rows instead of crashing the list.
    return null;
  }

  return {
    id,
    name,
    mobile,
    email,
    active: data.active !== false,
    vehicleNumber:
      typeof data.vehicleNumber === "string" && data.vehicleNumber.trim()
        ? data.vehicleNumber.trim()
        : undefined,
    firebaseUid:
      typeof data.firebaseUid === "string" && data.firebaseUid.trim()
        ? data.firebaseUid.trim()
        : undefined,
    createdAt: toEpochMillis(data.createdAtMs ?? data.createdAt, Date.now()),
    updatedAt: toEpochMillis(data.updatedAtMs ?? data.updatedAt, 0) || undefined,
  };
}

function sortDeliveryBoys(riders: DeliveryBoy[]): DeliveryBoy[] {
  return [...riders].sort((a, b) => {
    if (a.active !== b.active) return a.active ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

// -----------------------------------------------------------------------------
// Realtime subscriptions
// -----------------------------------------------------------------------------

export function subscribeToDeliveryBoys(
  onData: (riders: DeliveryBoy[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    collection(db, DELIVERY_BOYS_COLLECTION),
    (snapshot) => {
      const riders = snapshot.docs
        .map((snapshotDocument) =>
          documentToDeliveryBoy(snapshotDocument.id, snapshotDocument.data()),
        )
        .filter((rider): rider is DeliveryBoy => Boolean(rider));

      onData(sortDeliveryBoys(riders));
    },
    (error) => {
      console.error("[DeliveryBoys] Subscription failed:", error);
      onError?.(error);
    },
  );
}

export function subscribeToActiveDeliveryBoys(
  onData: (riders: DeliveryBoy[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const activeQuery = query(
    collection(db, DELIVERY_BOYS_COLLECTION),
    where("active", "==", true),
  );

  return onSnapshot(
    activeQuery,
    (snapshot) => {
      const riders = snapshot.docs
        .map((snapshotDocument) =>
          documentToDeliveryBoy(snapshotDocument.id, snapshotDocument.data()),
        )
        .filter((rider): rider is DeliveryBoy => Boolean(rider));

      onData(sortDeliveryBoys(riders));
    },
    (error) => {
      console.error("[DeliveryBoys] Active subscription failed:", error);
      onError?.(error);
    },
  );
}

export async function getDeliveryBoyByUid(
  uid: string,
): Promise<DeliveryBoy | null> {
  if (!uid) return null;
  try {
    const snapshot = await getDoc(doc(db, DELIVERY_BOYS_COLLECTION, uid));
    if (!snapshot.exists()) return null;
    return documentToDeliveryBoy(snapshot.id, snapshot.data());
  } catch (error) {
    console.error("[DeliveryBoys] getDeliveryBoyByUid failed:", error);
    return null;
  }
}

// -----------------------------------------------------------------------------
// Admin write operations
// -----------------------------------------------------------------------------

export interface CreateDeliveryBoyInput {
  name: string;
  mobile: string;
  email: string;
  password: string;
  vehicleNumber?: string;
}

/**
 * Requires the calling user to be signed in as an admin.
 *
 * Delegates to the backend so we can:
 *  1. Create a Firebase Auth user with the Admin SDK.
 *  2. Write the deliveryBoys/{uid} document under service-role privileges.
 *
 * Backward compatibility: this touches only NEW records, never the
 * existing customer or admin flows.
 */
export async function adminCreateDeliveryBoy(
  input: CreateDeliveryBoyInput,
): Promise<DeliveryBoy> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error("Please sign in as an administrator.");
  }

  if (!BACKEND_URL) {
    throw new Error("Backend URL is not configured.");
  }

  const idToken = await currentUser.getIdToken(true);

  const response = await fetch(
    `${BACKEND_URL}/api/admin/delivery-boys/create`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        name: input.name.trim(),
        mobile: input.mobile.trim(),
        email: input.email.trim().toLowerCase(),
        password: input.password,
        vehicleNumber: input.vehicleNumber?.trim() || undefined,
      }),
    },
  );

  let body: Record<string, unknown> | undefined;
  try {
    body = await response.json();
  } catch {
    body = undefined;
  }

  if (!response.ok) {
    const detail =
      typeof body?.detail === "string"
        ? body.detail
        : `Backend returned ${response.status}.`;
    throw new Error(detail);
  }

  return {
    id: String(body?.id ?? body?.firebaseUid ?? ""),
    name: String(body?.name ?? input.name),
    mobile: String(body?.mobile ?? input.mobile),
    email: String(body?.email ?? input.email),
    active: body?.active !== false,
    vehicleNumber:
      typeof body?.vehicleNumber === "string" && body.vehicleNumber
        ? String(body.vehicleNumber)
        : undefined,
    firebaseUid:
      typeof body?.firebaseUid === "string" ? String(body.firebaseUid) : undefined,
    createdAt: Number(body?.createdAtMs ?? Date.now()),
  };
}

export interface UpdateDeliveryBoyInput {
  name?: string;
  mobile?: string;
  vehicleNumber?: string | null; // null => remove
  active?: boolean;
}

export async function adminUpdateDeliveryBoy(
  id: string,
  patch: UpdateDeliveryBoyInput,
): Promise<void> {
  if (!id) throw new Error("Delivery boy id is required.");

  const update: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
    updatedAtMs: Date.now(),
  };

  if (typeof patch.name === "string") update.name = patch.name.trim();
  if (typeof patch.mobile === "string") update.mobile = patch.mobile.trim();
  if (patch.vehicleNumber === null) {
    update.vehicleNumber = null;
  } else if (typeof patch.vehicleNumber === "string") {
    update.vehicleNumber = patch.vehicleNumber.trim();
  }
  if (typeof patch.active === "boolean") update.active = patch.active;

  await updateDoc(doc(db, DELIVERY_BOYS_COLLECTION, id), update);

  // Deactivating a rider should also stop their push notifications.
  if (patch.active === false) {
    try {
      await setDoc(
        doc(db, PUSH_TOKENS_COLLECTION, id),
        { active: false, updatedAt: serverTimestamp() },
        { merge: true },
      );
    } catch (error) {
      // Non-fatal — the token can be cleaned up later.
      console.warn("[DeliveryBoys] Could not deactivate push token:", error);
    }
  }
}

export async function adminDeleteDeliveryBoy(id: string): Promise<void> {
  if (!id) throw new Error("Delivery boy id is required.");
  await deleteDoc(doc(db, DELIVERY_BOYS_COLLECTION, id));
}

export async function adminResetDeliveryBoyPassword(
  id: string,
  newPassword: string,
): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error("Please sign in as an administrator.");
  }
  if (!BACKEND_URL) {
    throw new Error("Backend URL is not configured.");
  }
  if (!newPassword || newPassword.length < 6) {
    throw new Error("Password must be at least 6 characters.");
  }

  const idToken = await currentUser.getIdToken(true);

  const response = await fetch(
    `${BACKEND_URL}/api/admin/delivery-boys/${encodeURIComponent(id)}/reset-password`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ password: newPassword }),
    },
  );

  if (!response.ok) {
    let body: Record<string, unknown> | undefined;
    try {
      body = await response.json();
    } catch {
      body = undefined;
    }
    const detail =
      typeof body?.detail === "string"
        ? body.detail
        : `Backend returned ${response.status}.`;
    throw new Error(detail);
  }
}
