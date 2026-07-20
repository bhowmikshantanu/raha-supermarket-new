import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { BRAND } from "@/src/config/brand";
import { COLORS, FONT, RADIUS, SPACING } from "@/src/config/theme";
import { getStoreStatus } from "@/src/utils/storeStatus";

interface Props {
  onSearchPress: () => void;
  onProfilePress: () => void;
}

// Home header — location, store status, search bar entry.
export const HomeHeader: React.FC<Props> = ({ onSearchPress, onProfilePress }) => {
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
              <Text style={styles.brandName} numberOfLines={1}>{BRAND.name}</Text>
              <View style={[styles.statusDot, { backgroundColor: status.isOpen ? COLORS.primary : COLORS.danger }]} />
              <Text style={[styles.statusText, { color: status.isOpen ? COLORS.primary : COLORS.danger }]}>
                {status.label}
              </Text>
            </View>
            <View style={styles.locSubRow}>
              <Ionicons name="location" size={12} color={COLORS.textSecondary} />
              <Text style={styles.address} numberOfLines={1}>Delivering to · {BRAND.shortAddress}</Text>
            </View>
          </View>
        </View>
        <TouchableOpacity onPress={onProfilePress} style={styles.profileBtn} testID="header-profile">
          <Ionicons name="person-circle-outline" size={32} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        onPress={onSearchPress}
        activeOpacity={0.85}
        style={styles.searchBar}
        testID="home-search-bar"
      >
        <Ionicons name="search" size={18} color={COLORS.textSecondary} />
        <Text style={styles.searchPlaceholder}>Search “Amul butter”, “oil”, “biscuits”…</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
    gap: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  topRow: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
  locWrap: { flex: 1, flexDirection: "row", alignItems: "center", gap: SPACING.sm },
  locIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  logoLetter: {
    color: COLORS.textOnPrimary,
    fontSize: FONT.size.xl,
    fontWeight: FONT.weight.bold,
  },
  locTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  brandName: {
    fontSize: FONT.size.lg,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
    flexShrink: 1,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: FONT.size.xs, fontWeight: FONT.weight.semibold },
  locSubRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  address: { fontSize: FONT.size.xs, color: COLORS.textSecondary, flexShrink: 1 },
  profileBtn: { width: 40, height: 40, justifyContent: "center", alignItems: "center" },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
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
});
