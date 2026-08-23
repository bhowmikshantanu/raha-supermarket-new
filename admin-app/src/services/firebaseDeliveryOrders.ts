/**
 * Delivery-rider order operations.
 *
 * Keeps `firebaseOrders.ts` UNTOUCHED — every function here is
 * additive and never overwrites unrelated fields on the order.
 */

import {
  collection,
  doc,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  where,
  type DocumentData,
  type Unsubscribe,
} from "firebase/firestore";

import { auth, db } from "@/src/config/firebase";
import type { DeliveryBoy, Order, OrderStatus } from "@/src/types";

const ORDERS_COLLECTION = "orders";

const BACKEND_URL = (
  process.env.EXPO_PUBLIC_BACKEND_URL || ""
).replace(/\/+$/, "");

// Statuses a delivery boy is allowed to see on their dashboard.
const ELIGIBLE_ASSIGN_STATUSES = new Set<OrderStatus>([
  "confirmed",
  "preparing",
  "out-for-delivery",
]);

function safeNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function documentToOrder(id: string, data: DocumentData): Order | null {
  if (!data || !Array.isArray(data.items) || !data.address) return null;

  const createdAt =
    typeof data.createdAtMs === "number" ? data.createdAtMs : Date.now();

  return {
    id,
    items: data.items,
    subtotal: safeNumber(data.subtotal),
    deliveryFee: safeNumber(data.deliveryFee),
    total: safeNumber(data.total),
    status: (data.status as OrderStatus) ?? "placed",
    createdAt,
    address: data.address,
    paymentMethod: data.paymentMethod === "online" ? "online" : "cod",
    estimatedDeliveryMinutes: safeNumber(data.estimatedDeliveryMinutes, 30),
    deliveryBoyId:
      typeof data.deliveryBoyId === "string" ? data.deliveryBoyId : undefined,
    deliveryBoyUid:
      typeof data.deliveryBoyUid === "string" ? data.deliveryBoyUid : undefined,
    deliveryBoyName:
      typeof data.deliveryBoyName === "string" ? data.deliveryBoyName : undefined,
    deliveryBoyMobile:
      typeof data.deliveryBoyMobile === "string"
        ? data.deliveryBoyMobile
        : undefined,
    assignedAt: safeNumber(data.assignedAtMs, 0) || undefined,
    pickedUpAt: safeNumber(data.pickedUpAtMs, 0) || undefined,
    deliveredAt: safeNumber(data.deliveredAtMs, 0) || undefined,
  };
}

function sortByCreated(orders: Order[]): Order[] {
  return [...orders].sort((a, b) => b.createdAt - a.createdAt);
}

// -----------------------------------------------------------------------------
// Admin: assign / reassign a rider to an eligible order
// -----------------------------------------------------------------------------

export function isOrderEligibleForAssignment(order: Order): boolean {
  return ELIGIBLE_ASSIGN_STATUSES.has(order.status);
}

export async function assignDeliveryBoyToOrder(
  orderId: string,
  rider: DeliveryBoy,
): Promise<void> {
  if (!orderId) throw new Error("Order id is required.");
  if (!rider?.id) throw new Error("Delivery boy id is required.");
  if (rider.active === false) {
    throw new Error("This delivery boy is not active.");
  }

  const orderReference = doc(db, ORDERS_COLLECTION, orderId);

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(orderReference);
    if (!snapshot.exists()) throw new Error("Order not found.");

    const currentStatus = (snapshot.data().status ?? "placed") as OrderStatus;

    if (currentStatus === "delivered" || currentStatus === "cancelled") {
      throw new Error(
        "Delivered or cancelled orders cannot be reassigned to a rider.",
      );
    }

    if (currentStatus === "placed") {
      throw new Error(
        "Confirm the order before assigning it to a delivery boy.",
      );
    }

    transaction.update(orderReference, {
      deliveryBoyId: rider.id,
      deliveryBoyUid: rider.firebaseUid ?? rider.id,
      deliveryBoyName: rider.name,
      deliveryBoyMobile: rider.mobile,
      assignedAt: serverTimestamp(),
      assignedAtMs: Date.now(),
      updatedAt: serverTimestamp(),
    });
  });
}

export async function unassignDeliveryBoyFromOrder(
  orderId: string,
): Promise<void> {
  if (!orderId) throw new Error("Order id is required.");

  const orderReference = doc(db, ORDERS_COLLECTION, orderId);

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(orderReference);
    if (!snapshot.exists()) throw new Error("Order not found.");

    const currentStatus = (snapshot.data().status ?? "placed") as OrderStatus;
    if (currentStatus === "out-for-delivery" || currentStatus === "delivered") {
      throw new Error(
        "Cannot unassign a rider after the order is out for delivery.",
      );
    }

    transaction.update(orderReference, {
      deliveryBoyId: null,
      deliveryBoyUid: null,
      deliveryBoyName: null,
      deliveryBoyMobile: null,
      assignedAt: null,
      assignedAtMs: null,
      updatedAt: serverTimestamp(),
    });
  });
}

// -----------------------------------------------------------------------------
// Delivery boy: subscribe to their own orders
// -----------------------------------------------------------------------------

export function subscribeToDeliveryBoyOrders(
  deliveryUid: string,
  onOrders: (orders: Order[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  if (!deliveryUid) {
    onError?.(new Error("Missing delivery boy uid."));
    return () => {};
  }

  const ordersQuery = query(
    collection(db, ORDERS_COLLECTION),
    where("deliveryBoyUid", "==", deliveryUid),
  );

  return onSnapshot(
    ordersQuery,
    (snapshot) => {
      const orders = snapshot.docs
        .map((snapshotDocument) =>
          documentToOrder(snapshotDocument.id, snapshotDocument.data()),
        )
        .filter((order): order is Order => Boolean(order));

      onOrders(sortByCreated(orders));
    },
    (error) => {
      console.error("[DeliveryOrders] Subscription failed:", error);
      onError?.(error);
    },
  );
}

// -----------------------------------------------------------------------------
// Delivery boy: safe rider-side status transitions
// -----------------------------------------------------------------------------
//
// Allowed transitions (enforced with a Firestore transaction so
// two riders cannot race):
//
//   confirmed | preparing            -> out-for-delivery
//   out-for-delivery                 -> delivered
//
// Anything else raises — no invalid transitions and never touches
// admin-only paths (like inventory commit / cancellation).

const RIDER_ALLOWED_NEXT: Partial<Record<OrderStatus, OrderStatus[]>> = {
  confirmed: ["out-for-delivery"],
  preparing: ["out-for-delivery"],
  "out-for-delivery": ["delivered"],
};

export interface DeliveryStatusUpdateResult {
  nextStatus: OrderStatus;
  order: Order;
}

export async function deliveryUpdateOrderStatus(
  orderId: string,
  nextStatus: OrderStatus,
): Promise<DeliveryStatusUpdateResult> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error("Please sign in to update this order.");
  }

  const orderReference = doc(db, ORDERS_COLLECTION, orderId);

  const updatedOrder = await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(orderReference);
    if (!snapshot.exists()) throw new Error("Order not found.");

    const data = snapshot.data();

    // Ownership guard — a rider can only touch their own orders.
    if (data.deliveryBoyUid !== currentUser.uid) {
      throw new Error("This order is not assigned to you.");
    }

    const currentStatus = (data.status ?? "placed") as OrderStatus;
    const allowed = RIDER_ALLOWED_NEXT[currentStatus] ?? [];

    if (!allowed.includes(nextStatus)) {
      throw new Error(
        `Cannot move an order from ${currentStatus} to ${nextStatus}.`,
      );
    }

    const patch: Record<string, unknown> = {
      status: nextStatus,
      updatedAt: serverTimestamp(),
    };

    if (nextStatus === "out-for-delivery") {
      patch.pickedUpAt = serverTimestamp();
      patch.pickedUpAtMs = Date.now();
    }
    if (nextStatus === "delivered") {
      patch.deliveredAt = serverTimestamp();
      patch.deliveredAtMs = Date.now();
    }

    transaction.update(orderReference, patch);

    return documentToOrder(snapshot.id, { ...data, ...patch });
  });

  if (!updatedOrder) {
    throw new Error("Order became invalid after update.");
  }

  return { nextStatus, order: updatedOrder };
}

// -----------------------------------------------------------------------------
// Push a status change to the customer via the existing Railway backend.
// Best-effort — never blocks the local status update if push fails.
// -----------------------------------------------------------------------------

export async function notifyCustomerOfOrderUpdate(
  orderId: string,
  nextStatus: OrderStatus,
): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) return; // silently skip

  if (!BACKEND_URL) {
    console.warn("[DeliveryOrders] Backend URL missing; skipping push.");
    return;
  }

  let idToken: string;
  try {
    idToken = await currentUser.getIdToken();
  } catch (error) {
    console.warn("[DeliveryOrders] Could not read auth token:", error);
    return;
  }

  try {
    const response = await fetch(
      `${BACKEND_URL}/api/orders/${encodeURIComponent(orderId)}/customer-notify`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ status: nextStatus }),
      },
    );

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      console.warn(
        "[DeliveryOrders] Customer notification failed:",
        response.status,
        text,
      );
    }
  } catch (error) {
    console.warn("[DeliveryOrders] Customer notification error:", error);
  }
}
