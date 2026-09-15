import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { BRAND } from "@/src/config/brand";
import { COLORS, FONT, SPACING } from "@/src/config/theme";
import { useApp } from "@/src/context/AppContext";

export default function Index() {
  const router = useRouter();
  const { hydrated, hasSeenOnboarding, user } = useApp();

  useEffect(() => {
    if (!hydrated) return;

    // Web-only: route custom subdomains directly to their portals.
    // This block does NOT run inside the Android/iOS app.
    if (Platform.OS === "web" && typeof window !== "undefined") {
      const hostname = window.location.hostname.toLowerCase();

      if (hostname === "admin.rahasupermarket.in") {
        router.replace("/admin/login");
        return;
      }

      if (hostname === "delivery.rahasupermarket.in") {
        router.replace("/delivery/login");
        return;
      }
    }

    // Normal customer flow
    const t = setTimeout(() => {
      if (!hasSeenOnboarding) {
        router.replace("/onboarding");
      } else if (!user) {
        router.replace("/login");
      } else {
        router.replace("/(tabs)");
      }
    }, 900);

    return () => clearTimeout(t);
  }, [hydrated, hasSeenOnboarding, user, router]);

  return (
    <View style={styles.container} testID="splash-screen">
      <View style={styles.logoWrap}>
        <Text style={styles.logoLetter}>{BRAND.logoLetter}</Text>
      </View>

      <Text style={styles.brand}>{BRAND.name}</Text>
      <Text style={styles.tagline}>{BRAND.tagline}</Text>

      <ActivityIndicator
        style={{ marginTop: SPACING.xxl }}
        color={COLORS.primary}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.xxl,
  },
  logoWrap: {
    width: 96,
    height: 96,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  logoLetter: {
    fontSize: 44,
    fontWeight: FONT.weight.heavy,
    color: COLORS.textOnPrimary,
  },
  brand: {
    marginTop: SPACING.lg,
    fontSize: FONT.size.xxl,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },
  tagline: {
    marginTop: SPACING.xs,
    fontSize: FONT.size.sm,
    color: COLORS.textSecondary,
  },
});
