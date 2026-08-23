import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { useApp } from "@/src/context/AppContext";

type NotificationBellProps = {
  iconColor?: string;
  size?: number;
};

export const NotificationBell: React.FC<NotificationBellProps> = ({
  iconColor = "#1F2937",
  size = 25,
}) => {
  const router = useRouter();
  const { unreadNotificationCount } = useApp();

  const badgeText =
    unreadNotificationCount > 99
      ? "99+"
      : String(unreadNotificationCount);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Notifications, ${unreadNotificationCount} unread`}
      hitSlop={10}
      onPress={() => router.push("/notifications")}
      style={({ pressed }) => [
        styles.button,
        pressed && styles.pressed,
      ]}
    >
      <Ionicons
        name={
          unreadNotificationCount > 0
            ? "notifications"
            : "notifications-outline"
        }
        size={size}
        color={iconColor}
      />

      {unreadNotificationCount > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badgeText}</Text>
        </View>
      ) : null}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
  },
  pressed: {
    opacity: 0.65,
  },
  badge: {
    position: "absolute",
    top: 3,
    right: 1,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#DC2626",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    lineHeight: 11,
    fontWeight: "800",
  },
});