import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo } from "react";
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  COLORS,
  FONT,
  RADIUS,
  SHADOW,
  SPACING,
} from "@/src/config/theme";
import { useApp } from "@/src/context/AppContext";
import type {
  AppNotification,
  NotificationType,
} from "@/src/types";

type NotificationIconName =
  React.ComponentProps<typeof Ionicons>["name"];

interface NotificationAppearance {
  icon: NotificationIconName;
  backgroundColor: string;
  iconColor: string;
}

function getNotificationAppearance(
  type: NotificationType,
): NotificationAppearance {
  switch (type) {
    case "order":
      return {
        icon: "bag-check-outline",
        backgroundColor: "#E8F5E9",
        iconColor: "#2E7D32",
      };

    case "offer":
      return {
        icon: "pricetag-outline",
        backgroundColor: "#FFF3E0",
        iconColor: "#EF6C00",
      };

    case "payment":
      return {
        icon: "card-outline",
        backgroundColor: "#E3F2FD",
        iconColor: "#1565C0",
      };

    case "wishlist":
      return {
        icon: "heart-outline",
        backgroundColor: "#FCE4EC",
        iconColor: "#C2185B",
      };

    case "system":
    default:
      return {
        icon: "notifications-outline",
        backgroundColor: COLORS.primaryLight,
        iconColor: COLORS.primary,
      };
  }
}

function formatNotificationTime(createdAt: number): string {
  const now = Date.now();
  const difference = Math.max(0, now - createdAt);

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (difference < minute) {
    return "Just now";
  }

  if (difference < hour) {
    const minutes = Math.floor(difference / minute);
    return `${minutes} min ago`;
  }

  if (difference < day) {
    const hours = Math.floor(difference / hour);
    return `${hours} hr ago`;
  }

  if (difference < day * 7) {
    const days = Math.floor(difference / day);
    return `${days} day${days > 1 ? "s" : ""} ago`;
  }

  return new Date(createdAt).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function NotificationsScreen() {
  const router = useRouter();

  const {
    notifications,
    unreadNotificationCount,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
    clearNotifications,
  } = useApp();

  const sortedNotifications = useMemo(
    () =>
      [...notifications].sort(
        (first, second) =>
          second.createdAt - first.createdAt,
      ),
    [notifications],
  );

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/(tabs)");
  }, [router]);

  const handleNotificationPress = useCallback(
    (notification: AppNotification) => {
      if (!notification.isRead) {
        markNotificationRead(notification.id);
      }

      if (notification.actionRoute) {
        router.push(notification.actionRoute as never);
        return;
      }

      if (notification.orderId) {
        router.push({
          pathname: "/order/[id]",
          params: {
            id: notification.orderId,
          },
        });
        return;
      }

      if (notification.productId) {
        router.push({
          pathname: "/product/[id]",
          params: {
            id: notification.productId,
          },
        });
      }
    },
    [markNotificationRead, router],
  );

  const handleDeleteNotification = useCallback(
    (notification: AppNotification) => {
      Alert.alert(
        "Delete notification?",
        "This notification will be removed permanently.",
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Delete",
            style: "destructive",
            onPress: () =>
              deleteNotification(notification.id),
          },
        ],
      );
    },
    [deleteNotification],
  );

  const handleClearAll = useCallback(() => {
    if (notifications.length === 0) {
      return;
    }

    Alert.alert(
      "Clear all notifications?",
      "All notifications will be removed permanently.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Clear All",
          style: "destructive",
          onPress: clearNotifications,
        },
      ],
    );
  }, [clearNotifications, notifications.length]);

  const renderNotification = useCallback(
    ({ item }: { item: AppNotification }) => {
      const appearance = getNotificationAppearance(
        item.type,
      );

      return (
        <TouchableOpacity
          activeOpacity={0.82}
          style={[
            styles.notificationCard,
            !item.isRead && styles.unreadCard,
          ]}
          onPress={() =>
            handleNotificationPress(item)
          }
          accessibilityRole="button"
          accessibilityLabel={`${item.title}. ${item.message}`}
          testID={`notification-${item.id}`}
        >
          {!item.isRead ? (
            <View style={styles.unreadIndicator} />
          ) : null}

          <View
            style={[
              styles.iconContainer,
              {
                backgroundColor:
                  appearance.backgroundColor,
              },
            ]}
          >
            <Ionicons
              name={appearance.icon}
              size={23}
              color={appearance.iconColor}
            />
          </View>

          <View style={styles.notificationContent}>
            <View style={styles.notificationTopRow}>
              <Text
                style={[
                  styles.notificationTitle,
                  !item.isRead &&
                    styles.unreadTitle,
                ]}
                numberOfLines={2}
              >
                {item.title}
              </Text>

              <TouchableOpacity
                activeOpacity={0.65}
                style={styles.deleteButton}
                onPress={() =>
                  handleDeleteNotification(item)
                }
                accessibilityRole="button"
                accessibilityLabel={`Delete ${item.title}`}
                hitSlop={{
                  top: 10,
                  bottom: 10,
                  left: 10,
                  right: 10,
                }}
              >
                <Ionicons
                  name="trash-outline"
                  size={18}
                  color={COLORS.textSecondary}
                />
              </TouchableOpacity>
            </View>

            <Text
              style={styles.notificationMessage}
              numberOfLines={3}
            >
              {item.message}
            </Text>

            <View style={styles.notificationFooter}>
              <Text style={styles.notificationTime}>
                {formatNotificationTime(
                  item.createdAt,
                )}
              </Text>

              {!item.isRead ? (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() =>
                    markNotificationRead(item.id)
                  }
                  style={styles.markReadButton}
                  accessibilityRole="button"
                  accessibilityLabel="Mark notification as read"
                >
                  <Text style={styles.markReadText}>
                    Mark as read
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.readStatus}>
                  <Ionicons
                    name="checkmark-done-outline"
                    size={15}
                    color={COLORS.primary}
                  />
                  <Text style={styles.readStatusText}>
                    Read
                  </Text>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [
      handleDeleteNotification,
      handleNotificationPress,
      markNotificationRead,
    ],
  );

  return (
    <SafeAreaView
      style={styles.container}
      edges={["top"]}
    >
      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.headerIconButton}
          onPress={handleBack}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={COLORS.textPrimary}
          />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>
            Notifications
          </Text>

          <Text style={styles.headerSubtitle}>
            {unreadNotificationCount > 0
              ? `${unreadNotificationCount} unread`
              : "You’re all caught up"}
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={
            notifications.length > 0 ? 0.7 : 1
          }
          style={styles.headerIconButton}
          onPress={handleClearAll}
          disabled={notifications.length === 0}
          accessibilityRole="button"
          accessibilityLabel="Clear all notifications"
        >
          <Ionicons
            name="trash-bin-outline"
            size={21}
            color={
              notifications.length > 0
                ? COLORS.textPrimary
                : COLORS.border
            }
          />
        </TouchableOpacity>
      </View>

      {notifications.length > 0 ? (
        <View style={styles.actionBar}>
          <View>
            <Text style={styles.actionBarTitle}>
              Recent updates
            </Text>
            <Text style={styles.actionBarSubtitle}>
              Orders, offers and important alerts
            </Text>
          </View>

          {unreadNotificationCount > 0 ? (
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.markAllButton}
              onPress={markAllNotificationsRead}
              accessibilityRole="button"
              accessibilityLabel="Mark all notifications as read"
            >
              <Ionicons
                name="checkmark-done"
                size={17}
                color={COLORS.primary}
              />
              <Text style={styles.markAllText}>
                Mark all read
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      <FlatList
        data={sortedNotifications}
        keyExtractor={(item) => item.id}
        renderItem={renderNotification}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.listContent,
          sortedNotifications.length === 0 &&
            styles.emptyListContent,
        ]}
        ItemSeparatorComponent={() => (
          <View style={styles.separator} />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Ionicons
                name="notifications-off-outline"
                size={42}
                color={COLORS.primary}
              />
            </View>

            <Text style={styles.emptyTitle}>
              No notifications yet
            </Text>

            <Text style={styles.emptyMessage}>
              Order updates, exclusive offers and important
              information will appear here.
            </Text>

            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.continueButton}
              onPress={() =>
                router.replace("/(tabs)")
              }
              accessibilityRole="button"
              accessibilityLabel="Continue shopping"
            >
              <Ionicons
                name="storefront-outline"
                size={19}
                color="#FFFFFF"
              />
              <Text style={styles.continueButtonText}>
                Continue Shopping
              </Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  header: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    backgroundColor: COLORS.surface,
  },

  headerIconButton: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.lg,
    alignItems: "center",
    justifyContent: "center",
  },

  headerTitleContainer: {
    flex: 1,
    paddingHorizontal: SPACING.sm,
  },

  headerTitle: {
    fontSize: FONT.size.lg,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },

  headerSubtitle: {
    marginTop: 2,
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
  },

  actionBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
    gap: SPACING.sm,
  },

  actionBarTitle: {
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.semibold,
    color: COLORS.textPrimary,
  },

  actionBarSubtitle: {
    marginTop: 2,
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
  },

  markAllButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.primaryLight,
  },

  markAllText: {
    fontSize: FONT.size.xs,
    fontWeight: FONT.weight.semibold,
    color: COLORS.primary,
  },

  listContent: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xxxl,
  },

  emptyListContent: {
    flexGrow: 1,
  },

  notificationCard: {
    position: "relative",
    flexDirection: "row",
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    overflow: "hidden",
    ...SHADOW.card,
  },

  unreadCard: {
    borderColor: COLORS.primary,
    backgroundColor: "#FAFFFB",
  },

  unreadIndicator: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: COLORS.primary,
  },

  iconContainer: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.md,
  },

  notificationContent: {
    flex: 1,
  },

  notificationTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: SPACING.sm,
  },

  notificationTitle: {
    flex: 1,
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.semibold,
    color: COLORS.textPrimary,
    lineHeight: 21,
  },

  unreadTitle: {
    fontWeight: FONT.weight.bold,
  },

  deleteButton: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },

  notificationMessage: {
    marginTop: 5,
    fontSize: FONT.size.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },

  notificationFooter: {
    marginTop: SPACING.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  notificationTime: {
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
  },

  markReadButton: {
    paddingVertical: 3,
    paddingHorizontal: 6,
  },

  markReadText: {
    fontSize: FONT.size.xs,
    color: COLORS.primary,
    fontWeight: FONT.weight.semibold,
  },

  readStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },

  readStatusText: {
    fontSize: FONT.size.xs,
    color: COLORS.primary,
  },

  separator: {
    height: SPACING.sm,
  },

  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING.xxl,
    paddingBottom: SPACING.xxxl,
  },

  emptyIconContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primaryLight,
    marginBottom: SPACING.lg,
  },

  emptyTitle: {
    fontSize: FONT.size.xl,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
    textAlign: "center",
  },

  emptyMessage: {
    marginTop: SPACING.sm,
    fontSize: FONT.size.sm,
    color: COLORS.textSecondary,
    lineHeight: 21,
    textAlign: "center",
  },

  continueButton: {
    marginTop: SPACING.xl,
    minHeight: 48,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.pill,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
  },

  continueButtonText: {
    color: "#FFFFFF",
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.bold,
  },
});