import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
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
} from "@/src/config/firebase";

export interface NotificationCampaign {
  id: string;
  title: string;
  message: string;
  type: "order" | "offer" | "system";
  route?: string;
  createdAt: number;
}

function waitForInitialAuthState(): Promise<User | null> {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(
      customerAuth,
      (user) => {
        unsubscribe();
        resolve(user);
      },
    );
  });
}

async function ensureCustomerUser(): Promise<void> {
  if (customerAuth.currentUser) {
    return;
  }

  const restoredUser =
    await waitForInitialAuthState();

  if (restoredUser) {
    return;
  }

  await signInAnonymously(customerAuth);
}

function campaignToNotification(
  id: string,
  data: DocumentData,
): NotificationCampaign | null {
  const title =
    typeof data.title === "string"
      ? data.title.trim()
      : "";

  const message =
    typeof data.body === "string"
      ? data.body.trim()
      : "";

  if (!title || !message) {
    return null;
  }

  const channel =
    typeof data.channel === "string"
      ? data.channel
      : "general";

  const type: NotificationCampaign["type"] =
    channel === "offers"
      ? "offer"
      : channel === "orders"
        ? "order"
        : "system";

  const route =
    typeof data.route === "string" &&
    data.route.trim()
      ? data.route.trim()
      : undefined;

  const createdAt =
    typeof data.createdAt?.toMillis === "function"
      ? data.createdAt.toMillis()
      : Date.now();

  return {
    id: `campaign:${id}`,
    title,
    message,
    type,
    route,
    createdAt,
  };
}

export function subscribeToNotificationCampaigns(
  onChange: (
    campaigns: NotificationCampaign[],
  ) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  let firestoreUnsubscribe: Unsubscribe | null =
    null;

  let cancelled = false;

  void ensureCustomerUser()
    .then(() => {
      if (cancelled) {
        return;
      }

      const campaignsQuery = query(
        collection(
          customerDb,
          "notificationCampaigns",
        ),
        orderBy("createdAt", "desc"),
        limit(100),
      );

      firestoreUnsubscribe = onSnapshot(
        campaignsQuery,
        (snapshot) => {
          const campaigns = snapshot.docs
            .map((document) =>
              campaignToNotification(
                document.id,
                document.data(),
              ),
            )
            .filter(
              (
                campaign,
              ): campaign is NotificationCampaign =>
                campaign !== null,
            );

          onChange(campaigns);
        },
        (error) => {
          console.error(
            "[Notifications] Campaign sync failed:",
            error,
          );

          onError?.(
            error instanceof Error
              ? error
              : new Error(
                  "Notification campaign sync failed.",
                ),
          );
        },
      );
    })
    .catch((error) => {
      console.error(
        "[Notifications] Customer authentication failed:",
        error,
      );

      onError?.(
        error instanceof Error
          ? error
          : new Error(
              "Notification authentication failed.",
            ),
      );
    });

  return () => {
    cancelled = true;
    firestoreUnsubscribe?.();
  };
}
