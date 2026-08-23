import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { BRAND } from "@/src/config/brand";
import { COLORS, FONT, SPACING } from "@/src/config/theme";
import { useApp } from "@/src/context/AppContext";

// Splash / bootstrap route. Waits for storage hydration then routes.
export default function Index() {
  const router = useRouter();
  const { hydrated, hasSeenOnboarding, user } = useApp();

  useEffect(() => {
    if (!hydrated) return;
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
      <ActivityIndicator style={{ marginTop: SPACING.xxl }} color={COLORS.primary} />
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
    borderRadius: 48,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SPACING.xl,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  logoLetter: {
    fontSize: 48,
    color: COLORS.textOnPrimary,
    fontWeight: FONT.weight.heavy,
  },
  brand: {
    fontSize: FONT.size.xxl,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  tagline: {
    fontSize: FONT.size.md,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
});
