import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/src/components/Button";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { useToast } from "@/src/components/Toast";
import { COLORS, FONT, RADIUS, SPACING } from "@/src/config/theme";
import { useApp } from "@/src/context/AppContext";
import { formatMobile } from "@/src/utils/format";

const OTP_LENGTH = 4;
// Mock static OTP for Phase 1 (also displayed on-screen for demo).
const MOCK_OTP = "1234";

export default function OtpScreen() {
  const router = useRouter();
  const { mobile = "" } = useLocalSearchParams<{ mobile: string }>();
  const { loginWithMobile } = useApp();
  const { showToast } = useToast();

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [timer, setTimer] = useState(30);
  const [verifying, setVerifying] = useState(false);
  const inputs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    if (timer <= 0) return;
    const t = setInterval(() => setTimer((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [timer]);

  const setDigit = (i: number, v: string) => {
    const cleaned = v.replace(/\D/g, "").slice(-1);
    setDigits((prev) => {
      const arr = [...prev];
      arr[i] = cleaned;
      return arr;
    });
    if (cleaned && i < OTP_LENGTH - 1) inputs.current[i + 1]?.focus();
  };

  const handleKeyPress = (i: number, key: string) => {
    if (key === "Backspace" && !digits[i] && i > 0) inputs.current[i - 1]?.focus();
  };

  const verify = async () => {
    const entered = digits.join("");
    if (entered.length !== OTP_LENGTH) return;
    setVerifying(true);
    // Mock verification delay
    setTimeout(async () => {
      if (entered === MOCK_OTP) {
        await loginWithMobile(mobile);
        showToast("Login successful", "success");
        router.replace("/(tabs)");
      } else {
        showToast("Invalid OTP. Try 1234 for demo", "error");
        setDigits(Array(OTP_LENGTH).fill(""));
        inputs.current[0]?.focus();
      }
      setVerifying(false);
    }, 600);
  };

  const resend = () => {
    if (timer > 0) return;
    setTimer(30);
    showToast(`OTP resent to +91 ${formatMobile(mobile)}`, "info");
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }} edges={["bottom"]}>
      <ScreenHeader title="Verify OTP" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Enter verification code</Text>
          <Text style={styles.subtitle}>
            We&apos;ve sent a 4-digit OTP to{" "}
            <Text style={styles.mobile}>+91 {formatMobile(mobile)}</Text>
          </Text>

          <View style={styles.demoTip} testID="otp-demo-hint">
            <Text style={styles.demoTipText}>Demo tip: use OTP <Text style={styles.demoOtp}>{MOCK_OTP}</Text></Text>
          </View>

          <View style={styles.otpRow}>
            {digits.map((d, i) => (
              <TextInput
                key={i}
                ref={(r) => { inputs.current[i] = r; }}
                value={d}
                onChangeText={(v) => setDigit(i, v)}
                onKeyPress={({ nativeEvent }) => handleKeyPress(i, nativeEvent.key)}
                keyboardType="number-pad"
                maxLength={1}
                style={[styles.otpBox, d && styles.otpBoxFilled]}
                testID={`otp-digit-${i}`}
              />
            ))}
          </View>

          <Button
            label={verifying ? "Verifying…" : "Verify & Continue"}
            onPress={verify}
            disabled={digits.join("").length !== OTP_LENGTH || verifying}
            loading={verifying}
            size="lg"
            fullWidth
            testID="verify-otp-button"
          />

          <View style={styles.resendRow}>
            <Text style={styles.resendText}>Didn&apos;t get the code? </Text>
            <TouchableOpacity onPress={resend} disabled={timer > 0} testID="resend-otp-button">
              <Text style={[styles.resendLink, timer > 0 && { color: COLORS.textMuted }]}>
                {timer > 0 ? `Resend in ${timer}s` : "Resend OTP"}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: SPACING.xxl, gap: SPACING.md },
  title: {
    fontSize: FONT.size.xxl,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },
  subtitle: { fontSize: FONT.size.md, color: COLORS.textSecondary, lineHeight: 20 },
  mobile: { color: COLORS.textPrimary, fontWeight: FONT.weight.semibold },
  demoTip: {
    backgroundColor: COLORS.warningLight,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginVertical: SPACING.sm,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.warning,
  },
  demoTipText: { color: "#92400E", fontSize: FONT.size.sm },
  demoOtp: { fontWeight: FONT.weight.bold },
  otpRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: SPACING.md,
    marginVertical: SPACING.xl,
  },
  otpBox: {
    width: 56,
    height: 64,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    textAlign: "center",
    fontSize: FONT.size.xxl,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },
  otpBoxFilled: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  resendRow: { flexDirection: "row", justifyContent: "center", marginTop: SPACING.lg },
  resendText: { color: COLORS.textSecondary, fontSize: FONT.size.md },
  resendLink: { color: COLORS.primary, fontSize: FONT.size.md, fontWeight: FONT.weight.bold },
});
