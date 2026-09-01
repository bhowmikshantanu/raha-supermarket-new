import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/src/components/Button";
import { useToast } from "@/src/components/Toast";
import { BRAND } from "@/src/config/brand";
import { COLORS, FONT, RADIUS, SHADOW, SPACING } from "@/src/config/theme";
import { useApp } from "@/src/context/AppContext";
import { formatMobile } from "@/src/utils/format";
import { getStoreStatus } from "@/src/utils/storeStatus";

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, addresses, orders, wishlistCount } = useApp();
  const { showToast } = useToast();
  const status = getStoreStatus();

  const openWhatsApp = async () => {
    const url = `whatsapp://send?phone=91${BRAND.whatsapp}&text=${encodeURIComponent(`Hi ${BRAND.name}, I need some help.`)}`;
    const fallback = `https://wa.me/91${BRAND.whatsapp}`;
    const supported = await Linking.canOpenURL(url).catch(() => false);
    try {
      await Linking.openURL(supported ? url : fallback);
    } catch {
      showToast("Unable to open WhatsApp", "error");
    }
  };

  const callStore = async () => {
    try {
      await Linking.openURL(`tel:+91${BRAND.whatsapp}`);
    } catch {
      showToast("Unable to place call", "error");
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.userCard}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={32} color={COLORS.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.userName}>
              {user?.isGuest ? "Guest User" : (user?.name || "Customer")}
            </Text>
            <Text style={styles.userMobile}>
              {user?.isGuest ? "Login to save your details" : `+91 ${formatMobile(user?.mobile || "")}`}
            </Text>
          </View>
          {user?.isGuest && (
            <Button label="Login" size="sm" onPress={() => router.replace("/login")} testID="profile-login-btn" />
          )}
        </View>

        <View style={styles.stats}>
          <StatCell icon="receipt-outline" label="Orders" value={String(orders.length)} />
          <View style={styles.statDivider} />
          <StatCell icon="heart-outline" label="Wishlist" value={String(wishlistCount)} />
          <View style={styles.statDivider} />
          <StatCell icon="location-outline" label="Addresses" value={String(addresses.length)} />
        </View>

        <SectionTitle title="Account" />
        <MenuRow icon="receipt-outline" label="My Orders" onPress={() => router.push("/(tabs)/orders")} testID="menu-orders" />
        <MenuRow
          icon="heart-outline"
          iconColor={COLORS.danger}
          label="My Wishlist"
          subtitle={wishlistCount > 0 ? `${wishlistCount} saved product${wishlistCount !== 1 ? "s" : ""}` : "No saved products yet"}
          badge={wishlistCount}
          onPress={() => router.push("/wishlist")}
          testID="menu-wishlist"
        />
        <MenuRow icon="location-outline" label="Saved Addresses" onPress={() => router.push("/addresses")} testID="menu-addresses" />

        <SectionTitle title="Support" />
        <MenuRow icon="logo-whatsapp" iconColor="#25D366" label="WhatsApp Store" subtitle={BRAND.whatsappDisplay} onPress={openWhatsApp} testID="menu-whatsapp" />
        <MenuRow icon="call-outline" label="Contact Store" subtitle="Call for queries" onPress={callStore} testID="menu-call" />

        <SectionTitle title="Store Information" />
        <InfoCard>
          <InfoLine icon="storefront-outline" label={BRAND.name} value={BRAND.address} />
          <InfoLine icon="time-outline" label="Hours" value={BRAND.storeHours.displayText} />
          <InfoLine icon="bicycle-outline" label="Delivery" value={`Radius ${BRAND.delivery.radiusKm} km · Free above ₹${BRAND.delivery.freeThreshold}`} />
          <InfoLine icon="checkmark-circle-outline" label="Store Status" value={status.isOpen ? "Open now" : "Currently closed"} />
        </InfoCard>

        <SectionTitle title="Legal" />
        <MenuRow icon="shield-checkmark-outline" label="Privacy Policy" onPress={() => router.push("/legal/privacy")} testID="menu-privacy" />
        <MenuRow icon="document-text-outline" label="Terms & Conditions" onPress={() => router.push("/legal/terms")} testID="menu-terms" />
        <MenuRow icon="key-outline" label="Staff Login" subtitle="Admin & delivery partners" onPress={() => router.push("/admin/login")} testID="menu-staff-login" />

        {!user?.isGuest && (
          <TouchableOpacity style={styles.logout} onPress={handleLogout} testID="logout-button">
            <Ionicons name="log-out-outline" size={20} color={COLORS.danger} />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.version}>{BRAND.name} · v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const SectionTitle: React.FC<{ title: string }> = ({ title }) => (
  <Text style={styles.sectionTitle}>{title}</Text>
);

const StatCell: React.FC<{ icon: keyof typeof Ionicons.glyphMap; label: string; value: string; tone?: "primary" | "danger" }> = ({
  icon, label, value, tone = "primary",
}) => (
  <View style={styles.statCell}>
    <Ionicons name={icon} size={20} color={tone === "danger" ? COLORS.danger : COLORS.primary} />
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const MenuRow: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  label: string;
  subtitle?: string;
  badge?: number;
  onPress: () => void;
  testID?: string;
}> = ({ icon, iconColor = COLORS.textPrimary, label, subtitle, badge = 0, onPress, testID }) => (
  <TouchableOpacity onPress={onPress} style={styles.menuRow} testID={testID} activeOpacity={0.7}>
    <View style={styles.menuIconWrap}>
      <Ionicons name={icon} size={20} color={iconColor} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.menuLabel}>{label}</Text>
      {subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
    </View>
    {badge > 0 && (
      <View style={styles.menuBadge}>
        <Text style={styles.menuBadgeText}>{badge > 99 ? "99+" : badge}</Text>
      </View>
    )}
    <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
  </TouchableOpacity>
);

const InfoCard: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <View style={styles.infoCard}>{children}</View>
);

const InfoLine: React.FC<{ icon: keyof typeof Ionicons.glyphMap; label: string; value: string }> = ({ icon, label, value }) => (
  <View style={styles.infoLine}>
    <Ionicons name={icon} size={18} color={COLORS.primary} />
    <View style={{ flex: 1 }}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: SPACING.md, paddingBottom: SPACING.xxxl * 2 },
  userCard: {
    flexDirection: "row", alignItems: "center", gap: SPACING.md, padding: SPACING.md,
    backgroundColor: COLORS.background, borderRadius: RADIUS.lg, borderWidth: 1,
    borderColor: COLORS.borderLight, ...SHADOW.card,
  },
  avatar: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.primaryLight,
    justifyContent: "center", alignItems: "center",
  },
  userName: { fontSize: FONT.size.lg, fontWeight: FONT.weight.bold, color: COLORS.textPrimary },
  userMobile: { fontSize: FONT.size.sm, color: COLORS.textSecondary, marginTop: 2 },
  stats: {
    marginTop: SPACING.md, flexDirection: "row", backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg, paddingVertical: SPACING.md,
  },
  statCell: { flex: 1, alignItems: "center", gap: 4 },
  statValue: { fontSize: FONT.size.lg, fontWeight: FONT.weight.bold, color: COLORS.textPrimary },
  statLabel: { fontSize: FONT.size.xs, color: COLORS.textSecondary },
  statDivider: { width: 1, backgroundColor: COLORS.borderLight },
  sectionTitle: {
    fontSize: FONT.size.xs, fontWeight: FONT.weight.bold, color: COLORS.textMuted,
    marginTop: SPACING.xl, marginBottom: SPACING.sm, letterSpacing: 0.5, textTransform: "uppercase",
  },
  menuRow: {
    flexDirection: "row", alignItems: "center", gap: SPACING.md, paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md, backgroundColor: COLORS.background, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.borderLight, marginBottom: SPACING.sm,
  },
  menuIconWrap: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.surface,
    justifyContent: "center", alignItems: "center",
  },
  menuLabel: { fontSize: FONT.size.md, color: COLORS.textPrimary, fontWeight: FONT.weight.semibold },
  menuSubtitle: { fontSize: FONT.size.xs, color: COLORS.textSecondary, marginTop: 2 },
  menuBadge: {
    minWidth: 24, height: 24, paddingHorizontal: 7, borderRadius: 12,
    alignItems: "center", justifyContent: "center", backgroundColor: COLORS.danger,
  },
  menuBadgeText: { fontSize: 11, fontWeight: FONT.weight.bold, color: COLORS.textOnPrimary },
  infoCard: {
    backgroundColor: COLORS.primarySoft, borderRadius: RADIUS.lg, padding: SPACING.md,
    gap: SPACING.md, borderWidth: 1, borderColor: COLORS.primaryLight,
  },
  infoLine: { flexDirection: "row", gap: SPACING.md, alignItems: "flex-start" },
  infoLabel: { fontSize: FONT.size.xs, color: COLORS.textSecondary, fontWeight: FONT.weight.semibold },
  infoValue: { fontSize: FONT.size.sm, color: COLORS.textPrimary, marginTop: 2 },
  logout: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: SPACING.sm,
    paddingVertical: SPACING.md, marginTop: SPACING.xl, borderWidth: 1.5,
    borderColor: COLORS.dangerLight, borderRadius: RADIUS.md, backgroundColor: COLORS.dangerLight,
  },
  logoutText: { color: COLORS.danger, fontWeight: FONT.weight.bold, fontSize: FONT.size.md },
  version: { textAlign: "center", color: COLORS.textMuted, fontSize: FONT.size.xs, marginTop: SPACING.xl },
});