import {
  collection,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";

import { auth, db } from "@/src/config/firebase";

export type AdminNotificationChannel =
  | "general"
  | "offers"
  | "orders";

export type NotificationCampaign = {
  id: string;
  title: string;
  body: string;
  channel: AdminNotificationChannel;
  route?: string;
  recipientCount: number;
  acceptedCount: number;
  failedCount: number;
  createdByUid?: string;
  createdByEmail?: string;
  createdAt?: unknown;
};

export type SendNotificationInput = {
  title: string;
  body: string;
  channel: AdminNotificationChannel;
  route?: string;
};

export type SendNotificationResult = {
  recipientCount: number;
  acceptedCount: number;
  failedCount: number;
  campaignId?: string;
};

const CAMPAIGNS_COLLECTION = "notificationCampaigns";

const BACKEND_URL = (
  process.env.EXPO_PUBLIC_BACKEND_URL || ""
).replace(/\/+$/, "");

function mapCampaign(
  id: string,
  data: Record<string, any>,
): NotificationCampaign {
  return {
    id,
    title: String(data.title ?? ""),
    body: String(data.body ?? ""),
    channel:
      data.channel === "offers" || data.channel === "orders"
        ? data.channel
        : "general",
    route:
      typeof data.route === "string" && data.route.trim()
        ? data.route
        : undefined,
    recipientCount: Number(data.recipientCount ?? 0),
    acceptedCount: Number(data.acceptedCount ?? 0),
    failedCount: Number(data.failedCount ?? 0),
    createdByUid:
      typeof data.createdByUid === "string"
        ? data.createdByUid
        : undefined,
    createdByEmail:
      typeof data.createdByEmail === "string"
        ? data.createdByEmail
        : undefined,
    createdAt: data.createdAt,
  };
}

export async function sendCustomerPushNotification(
  input: SendNotificationInput,
): Promise<SendNotificationResult> {
  const title = input.title.trim();
  const body = input.body.trim();

  if (!title) {
    throw new Error("Notification title is required.");
  }

  if (!body) {
    throw new Error("Notification message is required.");
  }

  if (!BACKEND_URL) {
    throw new Error("Backend URL is not configured.");
  }

  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error("Admin login is required.");
  }

  const idToken = await currentUser.getIdToken(true);

  const response = await fetch(
    `${BACKEND_URL}/api/admin/notifications/send`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        title,
        body,
        channel: input.channel,
        route: input.route?.trim() || "/notifications",
      }),
    },
  );

  let responseBody: Record<string, any> | undefined;

  try {
    responseBody = await response.json();
  } catch {
    responseBody = undefined;
  }

  if (!response.ok) {
    const detail =
      typeof responseBody?.detail === "string"
        ? responseBody.detail
        : `Backend returned ${response.status}.`;

    throw new Error(detail);
  }

  return {
    recipientCount: Number(responseBody?.recipientCount ?? 0),
    acceptedCount: Number(responseBody?.acceptedCount ?? 0),
    failedCount: Number(responseBody?.failedCount ?? 0),
    campaignId:
      typeof responseBody?.campaignId === "string"
        ? responseBody.campaignId
        : undefined,
  };
}

export function subscribeToNotificationCampaigns(
  callback: (campaigns: NotificationCampaign[]) => void,
  onError?: (error: Error) => void,
): () => void {
  const campaignsQuery = query(
    collection(db, CAMPAIGNS_COLLECTION),
    orderBy("createdAt", "desc"),
  );

  return onSnapshot(
    campaignsQuery,
    (snapshot) => {
      callback(
        snapshot.docs.map((item) =>
          mapCampaign(item.id, item.data()),
        ),
      );
    },
    (error) => {
      console.error(
        "[Admin Push] Campaign history subscription failed:",
        error,
      );

      onError?.(
        error instanceof Error
          ? error
          : new Error("Unable to load notification history."),
      );
    },
  );
}
