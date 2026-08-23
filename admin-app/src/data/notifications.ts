import type { AppNotification } from "@/src/context/NotificationContext";

export const SAMPLE_NOTIFICATIONS: AppNotification[] = [
  {
    id: "1",
    title: "Welcome to Raha Supermarket",
    message: "Thanks for installing our app. Happy shopping!",
    type: "general",
    isRead: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: "2",
    title: "Special Offer",
    message: "Get 10% OFF on orders above ₹999.",
    type: "offer",
    isRead: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: "3",
    title: "Order Delivered",
    message: "Your recent order has been delivered successfully.",
    type: "order",
    isRead: true,
    createdAt: new Date().toISOString(),
  },
];