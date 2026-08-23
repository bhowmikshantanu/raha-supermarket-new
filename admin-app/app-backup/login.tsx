import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/src/components/Button";
import { Input } from "@/src/components/Input";
import { BRAND } from "@/src/config/brand";
import { COLORS, FONT, RADIUS, SPACING } from "@/src/config/theme";
import { useApp } from "@/src/context/AppContext";
import { isValidIndianMobile } from "@/src/utils/format";

// Login screen (Phase 1 — mock OTP). Enter mobile, hit send OTP → routes to /otp.
export default function Login() {
  const router = useRouter();
  const { loginAsGuest } = useApp();
  const [mobile, setMobile] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSendOtp = () => {
    if (!isValidIndianMobile(mobile)) {
      setError("Enter a valid 10-digit Indian mobile number");
      return;
    }
    setError(null);
    router.push({ pathname: "/otp", params: { mobile: mobile.replace(/\D/g, "") } });
  };

  const handleGuest = async () => {
    await loginAsGuest();
    router.replace("/(tabs)");
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.logoWrap}>
            <Text style={styles.logoLetter}>{BRAND.logoLetter}</Text>
          </View>
          <Text style={styles.title}>Welcome to {BRAND.name}</Text>
          <Text style={styles.subtitle}>Login with your mobile number to get started</Text>

          <View style={styles.form}>
            <View style={styles.mobileRow}>
              <View style={styles.prefixBox}>
                <Text style={styles.prefixText}>{BRAND.country.phonePrefix}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  leftIcon="call-outline"
                  keyboardType="phone-pad"
                  maxLength={10}
                  placeholder="10-digit mobile number"
                  value={mobile}
                  onChangeText={(t) => {
                    setMobile(t.replace(/\D/g, ""));
                    if (error) setError(null);
                  }}
                  error={error ?? undefined}
                  containerTestID="mobile-input-container"
                  testID="mobile-input"
                />
              </View>
            </View>

            <Button
              label="Send OTP"
              onPress={handleSendOtp}
              size="lg"
              fullWidth
              testID="send-otp-button"
              disabled={mobile.length !== 10}
            />

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity style={styles.guestBtn} onPress={handleGuest} testID="guest-login-button">
              <Ionicons name="person-outline" size={20} color={COLORS.textPrimary} />
              <Text style={styles.guestText}>Continue as Guest</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.terms}>
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: SPACING.xxl, gap: SPACING.md },
  logoWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginTop: SPACING.xl,
    marginBottom: SPACING.md,
  },
  logoLetter: {
    color: COLORS.textOnPrimary,
    fontSize: 36,
    fontWeight: FONT.weight.heavy,
  },
  title: {
    fontSize: FONT.size.xxl,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: FONT.size.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xl,
  },
  form: { gap: SPACING.md },
  mobileRow: { flexDirection: "row", gap: SPACING.sm, alignItems: "flex-start" },
  prefixBox: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    justifyContent: "center",
  },
  prefixText: {
    fontSize: FONT.size.base,
    color: COLORS.textPrimary,
    fontWeight: FONT.weight.semibold,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    marginVertical: SPACING.sm,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.borderLight },
  dividerText: { color: COLORS.textMuted, fontSize: FONT.size.sm, fontWeight: FONT.weight.semibold },
  guestBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  guestText: {
    fontSize: FONT.size.base,
    color: COLORS.textPrimary,
    fontWeight: FONT.weight.semibold,
  },
  terms: {
    fontSize: FONT.size.xs,
    color: COLORS.textMuted,
    textAlign: "center",
    marginTop: SPACING.xl,
    paddingHorizontal: SPACING.md,
  },
});
