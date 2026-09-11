import {
  collection,
  doc,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type DocumentData,
  type Unsubscribe,
} from "firebase/firestore";

import {
  onAuthStateChanged,
  signInAnonymously,
  type User,
} from "firebase/auth";

import {
  customerAuth,
  customerDb,
  db,
} from "@/src/config/firebase";

import type {
  Order,
  OrderStatus,
} from "@/src/types";

const ORDERS_COLLECTION = "orders";
const PRODUCTS_COLLECTION = "products";

function removeUndefinedDeep(
  value: unknown,
): unknown {
  if (Array.isArray(value)) {
    return value.map((item) =>
      removeUndefinedDeep(item),
    );
  }

  if (
    value !== null &&
    typeof value === "object"
  ) {
    const result: Record<string, unknown> = {};

    for (const [key, nestedValue] of Object.entries(
      value as Record<string, unknown>,
    )) {
      if (nestedValue === undefined) {
        continue;
      }

      result[key] =
        removeUndefinedDeep(nestedValue);
    }

    return result;
  }

  return value;
}

function waitForInitialAuthState(): Promise<User | null> {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(customerAuth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
}

async function ensureFirebaseUser(): Promise<string> {
  if (customerAuth.currentUser) {
    console.log(
      "[Orders] Customer Firebase user already available:",
      customerAuth.currentUser.uid,
    );

    return customerAuth.currentUser.uid;
  }

  /*
   * IMPORTANT: wait for the persisted session (admin / delivery /
   * returning customer) to restore before creating an anonymous
   * user — otherwise a page refresh or app restart clobbers the
   * signed-in admin/rider session with a fresh anonymous account.
   */
  const restoredUser = await waitForInitialAuthState();

  if (restoredUser) {
    console.log(
      "[Orders] Restored persisted Firebase user:",
      restoredUser.uid,
    );

    return restoredUser.uid;
  }

  console.log(
    "[Orders] Signing customer in anonymously...",
  );

  const credential =
    await signInAnonymously(customerAuth);

  console.log(
    "[Orders] Anonymous Firebase UID:",
    credential.user.uid,
  );

  return credential.user.uid;
}

function safeNumber(
  value: unknown,
  fallback = 0,
): number {
  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : fallback;
}

function documentToOrder(
  documentId: string,
  data: DocumentData,
): Order | null {
  if (
    !data ||
    !Array.isArray(data.items) ||
    !data.address
  ) {
    return null;
  }

  const createdAt =
    typeof data.createdAtMs === "number"
      ? data.createdAtMs
      : Date.now();

  return {
    id: documentId,
    items: data.items,
    subtotal: safeNumber(data.subtotal),
    deliveryFee: safeNumber(data.deliveryFee),
    total: safeNumber(data.total),

    status:
      (data.status as OrderStatus) ??
      "placed",

    createdAt,
    address: data.address,

    paymentMethod:
      data.paymentMethod === "online"
        ? "online"
        : "cod",

    estimatedDeliveryMinutes:
      safeNumber(
        data.estimatedDeliveryMinutes,
        30,
      ),

    // Delivery rider assignment (optional, backward-compatible).
    deliveryBoyId:
      typeof data.deliveryBoyId === "string"
        ? data.deliveryBoyId
        : undefined,

    deliveryBoyUid:
      typeof data.deliveryBoyUid === "string"
        ? data.deliveryBoyUid
        : undefined,

    deliveryBoyName:
      typeof data.deliveryBoyName === "string"
        ? data.deliveryBoyName
        : undefined,

    deliveryBoyMobile:
      typeof data.deliveryBoyMobile === "string"
        ? data.deliveryBoyMobile
        : undefined,

    assignedAt:
      safeNumber(data.assignedAtMs, 0) ||
      undefined,

    pickedUpAt:
      safeNumber(data.pickedUpAtMs, 0) ||
      undefined,

    deliveredAt:
      safeNumber(data.deliveredAtMs, 0) ||
      undefined,

    couponCode:
      typeof data.couponCode === "string" && data.couponCode
        ? data.couponCode
        : undefined,

    couponDiscount:
      safeNumber(data.couponDiscount, 0) ||
      undefined,

    paymentStatus:
      data.paymentStatus === "paid"
        ? "paid"
        : data.paymentStatus === "pending"
          ? "pending"
          : undefined,

    razorpayOrderId:
      typeof data.razorpayOrderId === "string" && data.razorpayOrderId
        ? data.razorpayOrderId
        : undefined,

    razorpayPaymentId:
      typeof data.razorpayPaymentId === "string" && data.razorpayPaymentId
        ? data.razorpayPaymentId
        : undefined,

    paidAt:
      safeNumber(data.paidAtMs, 0) ||
      undefined,
  };
}

function sortOrders(
  orders: Order[],
): Order[] {
  return [...orders].sort(
    (first, second) =>
      second.createdAt -
      first.createdAt,
  );
}

export async function createFirebaseOrder(
  order: Order,
  extraData?: Record<string, unknown>,
): Promise<Order> {
  try {
    const customerUid =
      await ensureFirebaseUser();

    console.log(
      "[Orders] Creating Firestore order:",
      order.id,
    );

    const rawPayload = {
      ...order,

      customerUid,

      customerName:
        order.address.fullName,

      customerMobile:
        order.address.mobile,

      status:
        order.status,

      createdAtMs:
        order.createdAt,

      // Persist paid timestamp in the *Ms convention the mapper reads.
      ...(order.paidAt
        ? { paidAtMs: order.paidAt }
        : {}),

      /*
       * Inventory is NOT deducted when the
       * customer places the order.
       *
       * It is reserved/deducted atomically
       * when the admin confirms the order.
       */
      inventoryCommitted: false,

      createdAt:
        serverTimestamp(),

      updatedAt:
        serverTimestamp(),

      ...(extraData ?? {}),
    };

    const cleanPayload =
      removeUndefinedDeep(
        rawPayload,
      ) as Record<string, unknown>;

    await setDoc(
      doc(
        customerDb,
        ORDERS_COLLECTION,
        order.id,
      ),
      cleanPayload,
    );

    console.log(
      "[Orders] Firestore order saved successfully:",
      order.id,
    );

    return order;
  } catch (error) {
    console.error(
      "[Orders] createFirebaseOrder FAILED:",
      error,
    );

    throw error;
  }
}

export function subscribeToCustomerOrders(
  onOrders: (
    orders: Order[],
  ) => void,

  onError?: (
    error: Error,
  ) => void,
): Unsubscribe {
  let unsubscribe:
    | Unsubscribe
    | null = null;

  let cancelled = false;

  void ensureFirebaseUser()
    .then((customerUid) => {
      if (cancelled) {
        return;
      }

      console.log(
        "[Orders] Starting customer orders subscription:",
        customerUid,
      );

      const ordersQuery =
        query(
          collection(
            customerDb,
            ORDERS_COLLECTION,
          ),
          where(
            "customerUid",
            "==",
            customerUid,
          ),
        );

      unsubscribe =
        onSnapshot(
          ordersQuery,

          (snapshot) => {
            const orders =
              snapshot.docs
                .map(
                  (
                    snapshotDocument,
                  ) =>
                    documentToOrder(
                      snapshotDocument.id,
                      snapshotDocument.data(),
                    ),
                )
                .filter(
                  (
                    order,
                  ): order is Order =>
                    Boolean(order),
                );

            const sorted =
              sortOrders(orders);

            console.log(
              "[Orders] Customer orders received:",
              sorted.length,
            );

            onOrders(sorted);
          },

          (error) => {
            console.error(
              "[Orders] Customer subscription failed:",
              error,
            );

            onError?.(error);
          },
        );
    })
    .catch((error) => {
      console.error(
        "[Orders] Firebase customer auth failed:",
        error,
      );

      onError?.(
        error instanceof Error
          ? error
          : new Error(
              "Unable to authenticate customer.",
            ),
      );
    });

  return () => {
    cancelled = true;
    unsubscribe?.();
  };
}

export function subscribeToAllOrders(
  onOrders: (
    orders: Order[],
  ) => void,

  onError?: (
    error: Error,
  ) => void,
): Unsubscribe {
  console.log(
    "[Orders] Starting admin orders subscription",
  );

  return onSnapshot(
    collection(
      db,
      ORDERS_COLLECTION,
    ),

    (snapshot) => {
      const orders =
        snapshot.docs
          .map(
            (
              snapshotDocument,
            ) =>
              documentToOrder(
                snapshotDocument.id,
                snapshotDocument.data(),
              ),
          )
          .filter(
            (
              order,
            ): order is Order =>
              Boolean(order),
          );

      const sorted =
        sortOrders(orders);

      console.log(
        "[Orders] Admin orders received:",
        sorted.length,
      );

      onOrders(sorted);
    },

    (error) => {
      console.error(
        "[Orders] Admin orders subscription failed:",
        error,
      );

      onError?.(error);
    },
  );
}

/**
 * Admin-only status update with inventory protection.
 *
 * placed -> confirmed:
 *   - validates every product
 *   - deducts stock atomically
 *   - marks inventoryCommitted=true
 *
 * confirmed/preparing/out-for-delivery -> cancelled:
 *   - restores stock atomically
 *   - marks inventoryCommitted=false
 *
 * Other status transitions:
 *   - status only
 *
 * Firestore Security Rules must keep product writes
 * restricted to admins.
 */
export async function adminUpdateFirebaseOrderStatus(
  orderId: string,
  nextStatus: OrderStatus,
): Promise<void> {
  const orderReference =
    doc(
      db,
      ORDERS_COLLECTION,
      orderId,
    );

  await runTransaction(
    db,
    async (transaction) => {
      const orderSnapshot =
        await transaction.get(
          orderReference,
        );

      if (!orderSnapshot.exists()) {
        throw new Error(
          "Order not found.",
        );
      }

      const orderData =
        orderSnapshot.data();

      const currentStatus =
        (orderData.status ??
          "placed") as OrderStatus;

      const inventoryCommitted =
        orderData.inventoryCommitted ===
        true;

      const items =
        Array.isArray(orderData.items)
          ? orderData.items
          : [];

      if (
        currentStatus ===
        "delivered"
      ) {
        throw new Error(
          "Delivered orders cannot be changed.",
        );
      }

      if (
        currentStatus ===
        "cancelled"
      ) {
        throw new Error(
          "Cancelled orders cannot be changed.",
        );
      }

      /*
       * CONFIRM ORDER:
       * Deduct stock only once.
       */
      if (
        nextStatus ===
          "confirmed" &&
        !inventoryCommitted
      ) {
        const productRows: Array<{
          reference: ReturnType<typeof doc>;
          stock: number;
          quantity: number;
          name: string;
        }> = [];

        /*
         * Firestore transactions require reads
         * before writes, so collect all product
         * snapshots first.
         */
        for (
          const item
          of items
        ) {
          const productId =
            String(
              item?.productId ??
                "",
            );

          const quantity =
            Math.max(
              0,
              Math.floor(
                safeNumber(
                  item?.quantity,
                ),
              ),
            );

          if (
            !productId ||
            quantity <= 0
          ) {
            throw new Error(
              "Order contains an invalid product.",
            );
          }

          const productReference =
            doc(
              db,
              PRODUCTS_COLLECTION,
              productId,
            );

          const productSnapshot =
            await transaction.get(
              productReference,
            );

          if (
            !productSnapshot.exists()
          ) {
            throw new Error(
              `${item?.name ?? "A product"} no longer exists.`,
            );
          }

          const productData =
            productSnapshot.data();

          if (
            productData.isActive ===
            false
          ) {
            throw new Error(
              `${item?.name ?? "A product"} is currently inactive.`,
            );
          }

          const currentStock =
            Math.max(
              0,
              Math.floor(
                safeNumber(
                  productData.stock,
                ),
              ),
            );

          if (
            currentStock <
            quantity
          ) {
            throw new Error(
              `${item?.name ?? "Product"} has only ${currentStock} item(s) in stock.`,
            );
          }

          productRows.push({
            reference:
              productReference,
            stock:
              currentStock,
            quantity,
            name:
              String(
                item?.name ??
                  productId,
              ),
          });
        }

        for (
          const row
          of productRows
        ) {
          transaction.update(
            row.reference,
            {
              stock:
                row.stock -
                row.quantity,

              updatedAt:
                serverTimestamp(),
            },
          );
        }

        transaction.update(
          orderReference,
          {
            status:
              "confirmed",

            inventoryCommitted:
              true,

            inventoryCommittedAt:
              serverTimestamp(),

            updatedAt:
              serverTimestamp(),
          },
        );

        return;
      }

      /*
       * Prevent jumping directly from placed
       * to preparation/delivery without stock
       * first being committed.
       */
      if (
        !inventoryCommitted &&
        (
          nextStatus ===
            "preparing" ||
          nextStatus ===
            "out-for-delivery" ||
          nextStatus ===
            "delivered"
        )
      ) {
        throw new Error(
          "Confirm the order before moving it to preparation or delivery.",
        );
      }

      /*
       * ADMIN CANCEL:
       * If stock was already deducted, restore it.
       */
      if (
        nextStatus ===
        "cancelled"
      ) {
        if (
          inventoryCommitted
        ) {
          const productRows: Array<{
            reference: ReturnType<typeof doc>;
            stock: number;
            quantity: number;
          }> = [];

          for (
            const item
            of items
          ) {
            const productId =
              String(
                item?.productId ??
                  "",
              );

            const quantity =
              Math.max(
                0,
                Math.floor(
                  safeNumber(
                    item?.quantity,
                  ),
                ),
              );

            if (
              !productId ||
              quantity <= 0
            ) {
              continue;
            }

            const productReference =
              doc(
                db,
                PRODUCTS_COLLECTION,
                productId,
              );

            const productSnapshot =
              await transaction.get(
                productReference,
              );

            if (
              !productSnapshot.exists()
            ) {
              /*
               * Product deletion should not
               * prevent the order itself from
               * being cancelled.
               */
              continue;
            }

            productRows.push({
              reference:
                productReference,

              stock:
                Math.max(
                  0,
                  Math.floor(
                    safeNumber(
                      productSnapshot.data()
                        .stock,
                    ),
                  ),
                ),

              quantity,
            });
          }

          for (
            const row
            of productRows
          ) {
            transaction.update(
              row.reference,
              {
                stock:
                  row.stock +
                  row.quantity,

                updatedAt:
                  serverTimestamp(),
              },
            );
          }
        }

        transaction.update(
          orderReference,
          {
            status:
              "cancelled",

            inventoryCommitted:
              false,

            inventoryRestoredAt:
              inventoryCommitted
                ? serverTimestamp()
                : null,

            updatedAt:
              serverTimestamp(),
          },
        );

        return;
      }

      /*
       * Normal status progression after stock
       * has been committed.
       */
      transaction.update(
        orderReference,
        {
          status:
            nextStatus,

          updatedAt:
            serverTimestamp(),
        },
      );
    },
  );

  console.log(
    "[Orders] Admin order status transaction completed:",
    orderId,
    nextStatus,
  );
}

/**
 * Simple status updater retained for places where
 * no stock mutation is required.
 *
 * Prefer adminUpdateFirebaseOrderStatus() from the
 * Admin Orders screen.
 */
export async function updateFirebaseOrderStatus(
  orderId: string,
  status: OrderStatus,
): Promise<void> {
  try {
    console.log(
      "[Orders] Updating order status:",
      orderId,
      status,
    );

    await updateDoc(
      doc(
        db,
        ORDERS_COLLECTION,
        orderId,
      ),
      {
        status,
        updatedAt:
          serverTimestamp(),
      },
    );

    console.log(
      "[Orders] Order status updated:",
      orderId,
      status,
    );
  } catch (error) {
    console.error(
      "[Orders] Status update failed:",
      error,
    );

    throw error;
  }
}

/**
 * Customer cancellation.
 *
 * For secure inventory handling, the customer should
 * only cancel while the order is still "placed".
 * Once admin confirms it, stock is committed and
 * cancellation should be handled by the admin flow.
 */
export async function cancelFirebaseOrder(
  orderId: string,
): Promise<void> {
  const orderReference =
    doc(
      customerDb,
      ORDERS_COLLECTION,
      orderId,
    );

  await runTransaction(
    customerDb,
    async (transaction) => {
      const snapshot =
        await transaction.get(
          orderReference,
        );

      if (!snapshot.exists()) {
        throw new Error(
          "Order not found.",
        );
      }

      const data = snapshot.data();

      const currentStatus =
        (data.status ??
          "placed") as OrderStatus;

      /*
       * Customer cancellation is permitted only
       * before the store confirms the order.
       *
       * Firestore status is checked here instead
       * of trusting potentially stale local state.
       */
      if (currentStatus !== "placed") {
        throw new Error(
          "This order can no longer be cancelled after it has been confirmed by the store.",
        );
      }

      transaction.update(
        orderReference,
        {
          status: "cancelled",
          updatedAt:
            serverTimestamp(),
        },
      );
    },
  );
}