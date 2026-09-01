import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { BRAND } from "@/src/config/brand";
import {
  COLORS,
  FONT,
  RADIUS,
  SPACING,
} from "@/src/config/theme";
import { useApp } from "@/src/context/AppContext";
import { getStoreStatus } from "@/src/utils/storeStatus";

interface Props {
  onSearchPress: () => void;
  onProfilePress: () => void;
  onVoicePress?: () => void;
  onNotificationsPress?: () => void;
}

export const HomeHeader: React.FC<Props> = ({
  onSearchPress,
  onProfilePress,
  onVoicePress,
  onNotificationsPress,
}) => {
  const status = getStoreStatus();

  const { unreadNotificationCount } = useApp();

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View style={styles.locWrap}>
          <View style={styles.locIcon}>
            <Text style={styles.logoLetter}>
              {BRAND.logoLetter}
            </Text>
          </View>

          <View style={styles.brandContent}>
            <View style={styles.locTitleRow}>
              <Text
                style={styles.brandName}
                numberOfLines={1}
              >
                {BRAND.name}
              </Text>

              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor: status.isOpen
                      ? COLORS.primary
                      : COLORS.danger,
                  },
                ]}
              />

              <Text
                style={[
                  styles.statusText,
                  {
                    color: status.isOpen
                      ? COLORS.primary
                      : COLORS.danger,
                  },
                ]}
              >
                {status.label}
              </Text>
            </View>

            <View style={styles.locSubRow}>
              <Ionicons
                name="location"
                size={12}
                color={COLORS.textSecondary}
              />

              <Text
                style={styles.address}
                numberOfLines={1}
              >
                Delivering to · {BRAND.shortAddress}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.actionIcons}>
          <TouchableOpacity
            onPress={onNotificationsPress}
            activeOpacity={0.8}
            style={styles.iconBtn}
            accessibilityRole="button"
            accessibilityLabel={
              unreadNotificationCount > 0
                ? `${unreadNotificationCount} unread notifications`
                : "Notifications"
            }
          >
            <Ionicons
              name={
                unreadNotificationCount > 0
                  ? "notifications"
                  : "notifications-outline"
              }
              size={22}
              color={
                unreadNotificationCount > 0
                  ? COLORS.primary
                  : COLORS.textPrimary
              }
            />

            {unreadNotificationCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text
                  style={styles.notificationBadgeText}
                  numberOfLines={1}
                >
                  {unreadNotificationCount > 99
                    ? "99+"
                    : unreadNotificationCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onProfilePress}
            activeOpacity={0.8}
            style={styles.profileBtn}
            accessibilityRole="button"
            accessibilityLabel="Open profile"
          >
            <Ionicons
              name="person-circle-outline"
              size={32}
              color={COLORS.textPrimary}
            />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchRow}>
        <TouchableOpacity
          onPress={onSearchPress}
          activeOpacity={0.85}
          style={styles.searchBar}
          accessibilityRole="button"
          accessibilityLabel="Search products"
        >
          <Ionicons
            name="search"
            size={18}
            color={COLORS.textSecondary}
          />

          <Text
            style={styles.searchPlaceholder}
            numberOfLines={1}
          >
            {'Search "Amul butter", "oil", "biscuits"...'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onVoicePress}
          activeOpacity={0.85}
          style={styles.voiceBtn}
          accessibilityRole="button"
          accessibilityLabel="Voice search"
        >
          <Ionicons
            name="mic-outline"
            size={20}
            color={COLORS.primary}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
    gap: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },

  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },

  locWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },

  locIcon: {
    width: 44,
    height: 44,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },

  logoLetter: {
    color: COLORS.textOnPrimary,
    fontSize: FONT.size.xl,
    fontWeight: FONT.weight.bold,
  },

  brandContent: {
    flex: 1,
  },

  locTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  brandName: {
    fontSize: FONT.size.xl,
    fontWeight: FONT.weight.heavy,
    color: COLORS.textPrimary,
    flexShrink: 1,
  },

  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  statusText: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.semibold,
  },

  locSubRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },

  address: {
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
    flexShrink: 1,
  },

  actionIcons: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },

  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    position: "relative",
  },

  notificationBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: COLORS.danger,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: COLORS.background,
  },

  notificationBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800",
    lineHeight: 11,
    textAlign: "center",
  },

  profileBtn: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },

  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },

  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    paddingVertical: 12,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },

  searchPlaceholder: {
    color: COLORS.textSecondary,
    fontSize: FONT.size.md,
    flex: 1,
  },

  voiceBtn: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1,
    borderColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },
});