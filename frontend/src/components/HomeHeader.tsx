import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { BRAND } from "@/src/config/brand";
import { COLORS, FONT, RADIUS, SPACING } from "@/src/config/theme";
import { getStoreStatus } from "@/src/utils/storeStatus";

interface Props {
  onSearchPress: () => void;
  onProfilePress: () => void;
  onVoicePress?: () => void;
  onNotificationsPress?: () => void;
}

// Home header — location, store status, search bar entry.
export const HomeHeader: React.FC<Props> = ({
  onSearchPress,
  onProfilePress,
  onVoicePress,
  onNotificationsPress,
}) => {
  const status = getStoreStatus();
  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View style={styles.locWrap}>
          <View style={styles.locIcon}>
            <Text style={styles.logoLetter}>{BRAND.logoLetter}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.locTitleRow}>
              <Text style={styles.brandName} numberOfLines={1}>
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
                    color: status.isOpen ? COLORS.primary : COLORS.danger,
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
              <Text style={styles.address} numberOfLines={1}>
                Delivering to · {BRAND.shortAddress}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.actionIcons}>
          <TouchableOpacity
            onPress={onNotificationsPress}
            style={styles.iconBtn}
            testID="header-notifications"
            accessibilityRole="button"
            accessibilityLabel="Notifications"
          >
            <Ionicons
              name="notifications-outline"
              size={22}
              color={COLORS.textPrimary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onProfilePress}
            style={styles.profileBtn}
            testID="header-profile"
            accessibilityRole="button"
            accessibilityLabel="Profile"
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
          testID="home-search-bar"
        >
          <Ionicons name="search" size={18} color={COLORS.textSecondary} />
          <Text style={styles.searchPlaceholder}>
            Search “Amul butter”, “oil”, “biscuits”…
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onVoicePress}
          activeOpacity={0.85}
          style={styles.voiceBtn}
          testID="header-voice"
          accessibilityRole="button"
          accessibilityLabel="Voice search"
        >
          <Ionicons name="mic-outline" size={20} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

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
