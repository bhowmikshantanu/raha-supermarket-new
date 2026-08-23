import React, {
  createContext,
  useContext,
  useMemo,
  useState,
} from "react";

export type AppNotification = {
  id: string;
  title: string;
  message: string;
  type: "order" | "offer" | "wishlist" | "general";
  isRead: boolean;
  createdAt: string;
};

type NotificationContextType = {
  notifications: AppNotification[];
  unreadCount: number;

  addNotification: (
    notification: Omit<
      AppNotification,
      "id" | "isRead" | "createdAt"
    >
  ) => void;

  markAsRead: (id: string) => void;

  markAllAsRead: () => void;

  deleteNotification: (id: string) => void;

  clearNotifications: () => void;
};

const NotificationContext =
  createContext<NotificationContextType | null>(null);

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [notifications, setNotifications] = useState<
    AppNotification[]
  >([]);

  const addNotification = (
    notification: Omit<
      AppNotification,
      "id" | "isRead" | "createdAt"
    >
  ) => {
    setNotifications((prev) => [
      {
        id: Date.now().toString(),
        isRead: false,
        createdAt: new Date().toISOString(),
        ...notification,
      },
      ...prev,
    ]);
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, isRead: true }
          : item
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) =>
      prev.map((item) => ({
        ...item,
        isRead: true,
      }))
    );
  };

  const deleteNotification = (id: string) => {
    setNotifications((prev) =>
      prev.filter((item) => item.id !== id)
    );
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const unreadCount = useMemo(
    () =>
      notifications.filter((n) => !n.isRead).length,
    [notifications]
  );

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        clearNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);

  if (!context) {
    throw new Error(
      "useNotifications must be used inside NotificationProvider"
    );
  }

  return context;
}