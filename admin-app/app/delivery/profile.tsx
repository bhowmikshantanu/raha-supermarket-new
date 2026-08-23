import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useToast } from "@/src/components/Toast";
import { BRAND } from "@/src/config/brand";
import { auth, db } from "@/src/config/firebase";
import { COLORS, FONT, RADIUS, SHADOW, SPACING } from "@/src/config/theme";
import { deactivateCurrentPushToken } from "@/src/services/pushNotifications";
import type { DeliveryBoy } from "@/src/types";

export default function DeliveryProfileScreen() {
  const router = useRouter();
  const { showToast } = useToast();

  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [rider, setRider] = useState<DeliveryBoy | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/delivery/login");
        return;
      }
      setFirebaseUser(user);
      try {
        const snapshot = await getDoc(doc(db, "deliveryBoys", user.uid));
        if (!snapshot.exists()) {
          router.replace("/delivery/login");
          return;
        }
        const data = snapshot.data();
        setRider({
          id: snapshot.id,
          name: String(data.name ?? "").trim(),
          mobile: String(data.mobile ?? "").trim(),
          email: String(data.email ?? "").trim(),
          active: data.active !== false,
          vehicleNumber:
            typeof data.vehicleNumber === "string"
              ? data.vehicleNumber
              : undefined,
          firebaseUid:
            typeof data.firebaseUid === "string"
              ? data.firebaseUid
              : user.uid,
          createdAt:
            typeof data.createdAtMs === "number"
              ? data.createdAtMs
              : Date.now(),
        });
      } finally {
        setLoading(false);
      }
    });
    return unsubscribe;
  }, [router]);

  const contactAdmin = async () => {
    try {
      await Linking.openURL(
        `whatsapp://send?phone=91${BRAND.whatsapp}&text=${encodeURIComponent("Hi Admin, I need help with a Raha Supermarket delivery.")}`,
      );
    } catch {
      try {
        await Linking.openURL(`https://wa.me/91${BRAND.whatsapp}`);
      } catch {
        showToast("Unable to contact admin", "error");
      }
    }
  };

  const handleSignOut = async () => {
    if (signingOut) return;
    try {
      setSigningOut(true);
      // Stop receiving further order notifications on this device.
      await deactivateCurrentPushToken().catch(() => undefined);
      await signOut(auth);
      router.replace("/delivery/login");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Unable to sign out", "error");
    } finally {
      setSigningOut(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!rider || !firebaseUser) return null;

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          testID="delivery-profile-back"
        >
          <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <View style={styles.avatarBig}>
            <Ionicons name="person" size={36} color={COLORS.textOnPrimary} />
          </View>
          <Text style={styles.name}>{rider.name}</Text>
          <View
            style={[
              styles.statusPill,
              {
                backgroundColor: rider.active
                  ? COLORS.primaryLight
                  : COLORS.dangerLight,
              },
            ]}
          >
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor: rider.active
                    ? COLORS.primary
                    : COLORS.danger,
                },
              ]}
            />
            <Text
              style={[
                styles.statusText,
                {
                  color: rider.active
                    ? COLORS.primaryDark
                    : COLORS.danger,
                },
              ]}
            >
              {rider.active ? "Active" : "Inactive"}
            </Text>
          </View>

          <InfoRow icon="mail-outline" label="Email" value={rider.email} />
          <InfoRow
            icon="call-outline"
            label="Mobile"
            value={`+91 ${rider.mobile}`}
          />
          {rider.vehicleNumber ? (
            <InfoRow
              icon="bicycle-outline"
              label="Vehicle"
              value={rider.vehicleNumber}
            />
          ) : null}
        </View>

        <TouchableOpacity
          style={styles.rowBtn}
          onPress={contactAdmin}
          testID="delivery-contact-admin"
        >
          <View style={styles.rowBtnIcon}>
            <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowBtnTitle}>Contact Admin</Text>
            <Text style={styles.rowBtnSubtitle}>
              Message the store on WhatsApp
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() => void handleSignOut()}
          disabled={signingOut}
          testID="delivery-logout-btn"
        >
          {signingOut ? (
            <ActivityIndicator color={COLORS.danger} />
          ) : (
            <>
              <Ionicons name="log-out-outline" size={20} color={COLORS.danger} />
              <Text style={styles.logoutText}>Logout</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.version}>
          {BRAND.name} · Delivery App v1.0
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={18} color={COLORS.primary} />
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surface,
  },
  headerTitle: {
    marginLeft: SPACING.sm,
    fontSize: FONT.size.lg,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },
  scroll: {
    padding: SPACING.md,
    gap: SPACING.md,
    paddingBottom: SPACING.xxxl,
  },
  card: {
    alignItems: "center",
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    backgroundColor: COLORS.background,
    gap: SPACING.sm,
    ...SHADOW.card,
  },
  avatarBig: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    ...SHADOW.fab,
  },
  name: {
    fontSize: FONT.size.xl,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.pill,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 11, fontWeight: FONT.weight.bold },
  infoRow: {
    width: "100%",
    marginTop: SPACING.sm,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
  },
  infoLabel: {
    fontSize: FONT.size.xs,
    color: COLORS.textMuted,
    fontWeight: FONT.weight.semibold,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  infoValue: {
    marginTop: 2,
    fontSize: FONT.size.sm,
    color: COLORS.textPrimary,
    fontWeight: FONT.weight.semibold,
  },
  rowBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    backgroundColor: COLORS.background,
  },
  rowBtnIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surface,
  },
  rowBtnTitle: {
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },
  rowBtnSubtitle: {
    marginTop: 2,
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
  },
  logoutBtn: {
    marginTop: SPACING.md,
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
    borderWidth: 1.5,
    borderColor: COLORS.danger,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.dangerLight,
  },
  logoutText: {
    color: COLORS.danger,
    fontWeight: FONT.weight.bold,
    fontSize: FONT.size.md,
  },
  version: {
    textAlign: "center",
    marginTop: SPACING.lg,
    color: COLORS.textMuted,
    fontSize: FONT.size.xs,
  },
});
