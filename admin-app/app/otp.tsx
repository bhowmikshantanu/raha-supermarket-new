import {
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import React, {
  useEffect,
  useRef,
  useState,
} from "react";
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
import {
  COLORS,
  FONT,
  RADIUS,
  SPACING,
} from "@/src/config/theme";
import { useApp } from "@/src/context/AppContext";
import {
  getPhoneAuthErrorMessage,
  sendPhoneOtp,
  verifyPhoneOtp,
} from "@/src/services/firebasePhoneAuth";
import { formatMobile } from "@/src/utils/format";

const OTP_LENGTH = 6;

export default function OtpScreen() {
  const router = useRouter();

  const { mobile = "" } =
    useLocalSearchParams<{
      mobile: string;
    }>();

  const { loginWithMobile } =
    useApp();

  const { showToast } =
    useToast();

  const [digits, setDigits] =
    useState<string[]>(
      Array(OTP_LENGTH).fill(""),
    );

  const [timer, setTimer] =
    useState(30);

  const [verifying, setVerifying] =
    useState(false);

  const [resending, setResending] =
    useState(false);

  const inputs =
    useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    if (timer <= 0) {
      return;
    }

    const interval =
      setInterval(() => {
        setTimer((seconds) =>
          Math.max(
            0,
            seconds - 1,
          ),
        );
      }, 1000);

    return () =>
      clearInterval(interval);
  }, [timer]);

  const setDigit = (
    index: number,
    value: string,
  ) => {
    const cleaned =
      value
        .replace(/\D/g, "")
        .slice(-1);

    setDigits((previous) => {
      const next = [...previous];
      next[index] = cleaned;
      return next;
    });

    if (
      cleaned &&
      index < OTP_LENGTH - 1
    ) {
      inputs.current[
        index + 1
      ]?.focus();
    }
  };

  const handleKeyPress = (
    index: number,
    key: string,
  ) => {
    if (
      key === "Backspace" &&
      !digits[index] &&
      index > 0
    ) {
      inputs.current[
        index - 1
      ]?.focus();
    }
  };

  const verify = async () => {
    const entered =
      digits.join("");

    if (
      entered.length !== OTP_LENGTH
    ) {
      return;
    }

    try {
      setVerifying(true);

      await verifyPhoneOtp(
        entered,
      );

      await loginWithMobile(
        mobile,
      );

      showToast(
        "Login successful",
        "success",
      );

      router.replace(
        "/(tabs)",
      );
    } catch (error) {
      showToast(
        getPhoneAuthErrorMessage(
          error,
        ),
        "error",
      );

      setDigits(
        Array(
          OTP_LENGTH,
        ).fill(""),
      );

      inputs.current[0]?.focus();
    } finally {
      setVerifying(false);
    }
  };

  const resend = async () => {
    if (
      timer > 0 ||
      resending
    ) {
      return;
    }

    try {
      setResending(true);

      await sendPhoneOtp(
        mobile,
      );

      setTimer(30);

      showToast(
        `OTP sent to +91 ${formatMobile(
          mobile,
        )}`,
        "success",
      );
    } catch (error) {
      showToast(
        getPhoneAuthErrorMessage(
          error,
        ),
        "error",
      );
    } finally {
      setResending(false);
    }
  };

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor:
          COLORS.background,
      }}
      edges={["bottom"]}
    >
      <ScreenHeader
        title="Verify OTP"
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : undefined
        }
      >
        <ScrollView
          contentContainerStyle={
            styles.scroll
          }
          keyboardShouldPersistTaps="handled"
        >
          <Text
            style={styles.title}
          >
            Enter verification code
          </Text>

          <Text
            style={styles.subtitle}
          >
            We&apos;ve sent a
            6-digit OTP to{" "}
            <Text
              style={styles.mobile}
            >
              +91{" "}
              {formatMobile(
                mobile,
              )}
            </Text>
          </Text>

          <View
            style={styles.otpRow}
          >
            {digits.map(
              (digit, index) => (
                <TextInput
                  key={index}
                  ref={(input) => {
                    inputs.current[
                      index
                    ] = input;
                  }}
                  value={digit}
                  onChangeText={(
                    value,
                  ) =>
                    setDigit(
                      index,
                      value,
                    )
                  }
                  onKeyPress={({
                    nativeEvent,
                  }) =>
                    handleKeyPress(
                      index,
                      nativeEvent.key,
                    )
                  }
                  keyboardType="number-pad"
                  maxLength={1}
                  style={[
                    styles.otpBox,
                    digit &&
                      styles.otpBoxFilled,
                  ]}
                  testID={`otp-digit-${index}`}
                />
              ),
            )}
          </View>

          <Button
            label={
              verifying
                ? "Verifying…"
                : "Verify & Continue"
            }
            onPress={verify}
            disabled={
              digits.join("")
                .length !==
                OTP_LENGTH ||
              verifying
            }
            loading={verifying}
            size="lg"
            fullWidth
            testID="verify-otp-button"
          />

          <View
            style={styles.resendRow}
          >
            <Text
              style={styles.resendText}
            >
              Didn&apos;t get the
              code?{" "}
            </Text>

            <TouchableOpacity
              onPress={resend}
              disabled={
                timer > 0 ||
                resending
              }
              testID="resend-otp-button"
            >
              <Text
                style={[
                  styles.resendLink,
                  timer > 0 && {
                    color:
                      COLORS.textMuted,
                  },
                ]}
              >
                {resending
                  ? "Sending…"
                  : timer > 0
                    ? `Resend in ${timer}s`
                    : "Resend OTP"}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles =
  StyleSheet.create({
    scroll: {
      padding: SPACING.xxl,
      gap: SPACING.md,
    },

    title: {
      fontSize:
        FONT.size.xxl,
      fontWeight:
        FONT.weight.bold,
      color:
        COLORS.textPrimary,
    },

    subtitle: {
      fontSize:
        FONT.size.md,
      color:
        COLORS.textSecondary,
      lineHeight: 20,
    },

    mobile: {
      color:
        COLORS.textPrimary,
      fontWeight:
        FONT.weight.semibold,
    },

    otpRow: {
      flexDirection: "row",
      justifyContent:
        "center",
      gap: 8,
      marginVertical:
        SPACING.xl,
    },

    otpBox: {
      width: 44,
      height: 58,
      borderRadius:
        RADIUS.md,
      borderWidth: 2,
      borderColor:
        COLORS.border,
      backgroundColor:
        COLORS.background,
      textAlign: "center",
      fontSize:
        FONT.size.xl,
      fontWeight:
        FONT.weight.bold,
      color:
        COLORS.textPrimary,
    },

    otpBoxFilled: {
      borderColor:
        COLORS.primary,
      backgroundColor:
        COLORS.primaryLight,
    },

    resendRow: {
      flexDirection: "row",
      justifyContent:
        "center",
      marginTop:
        SPACING.lg,
    },

    resendText: {
      color:
        COLORS.textSecondary,
      fontSize:
        FONT.size.md,
    },

    resendLink: {
      color:
        COLORS.primary,
      fontSize:
        FONT.size.md,
      fontWeight:
        FONT.weight.bold,
    },
  });
