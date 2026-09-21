import { Ionicons } from "@expo/vector-icons";
import { FirebaseError } from "firebase/app";
import {
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import {
  doc,
  getDoc,
} from "firebase/firestore";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
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
import {
  COLORS,
  FONT,
  RADIUS,
  SHADOW,
  SPACING,
} from "@/src/config/theme";
import {
  auth,
  db,
} from "@/src/config/firebase";

function getLoginErrorMessage(
  error: unknown,
): string {
  if (!(error instanceof FirebaseError)) {
    return "Unable to sign in. Please try again.";
  }

  switch (error.code) {
    case "auth/invalid-email":
      return "Please enter a valid email address.";

    case "auth/missing-password":
      return "Please enter your password.";

    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Email or password is incorrect.";

    case "auth/too-many-requests":
      return "Too many failed attempts. Please wait and try again.";

    case "auth/network-request-failed":
      return "Internet connection problem. Please check your network.";

    default:
      return "Unable to sign in. Please try again.";
  }
}

export default function AdminLoginScreen() {
  const router = useRouter();

  const { orderId } = useLocalSearchParams<{
    orderId?: string;
  }>();

  const [email, setEmail] = useState(
    "admin@rahasupermarket.in",
  );

  const [password, setPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const handleLogin = async () => {
    const normalizedEmail = email
      .trim()
      .toLowerCase();

    if (!normalizedEmail) {
      setErrorMessage(
        "Please enter your admin email.",
      );
      return;
    }

    if (!password) {
      setErrorMessage(
        "Please enter your password.",
      );
      return;
    }

    if (loading) {
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const credential =
        await signInWithEmailAndPassword(
          auth,
          normalizedEmail,
          password,
        );

      const adminSnapshot = await getDoc(
        doc(
          db,
          "admins",
          credential.user.uid,
        ),
      );

      if (!adminSnapshot.exists()) {
        await signOut(auth);

        setErrorMessage(
          "This account is not registered as an administrator.",
        );
        return;
      }

      const adminData =
        adminSnapshot.data();

      const isAdmin =
        adminData.role === "admin" &&
        adminData.active === true;

      if (!isAdmin) {
        await signOut(auth);

        setErrorMessage(
          "This administrator account is inactive or unauthorized.",
        );
        return;
      }

      if (orderId) {
        router.replace({
          pathname: "/admin/orders",
          params: { orderId },
        });
      } else {
        router.replace("/admin");
      }
    } catch (error) {
      console.error(
        "Admin login failed:",
        error,
      );

      try {
        await signOut(auth);
      } catch {
        // Ignore sign-out error.
      }

      setErrorMessage(
        getLoginErrorMessage(error),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView
      style={styles.container}
      edges={["top", "bottom"]}
    >
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : undefined
        }
      >
        <ScrollView
          contentContainerStyle={
            styles.scrollContent
          }
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={true}
        >
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons
              name="chevron-back"
              size={24}
              color={COLORS.textPrimary}
            />
          </TouchableOpacity>

          <View style={styles.logoWrap}>
            <Ionicons
              name="shield-checkmark"
              size={46}
              color={COLORS.textOnPrimary}
            />
          </View>

          <Text style={styles.title}>
            Admin Login
          </Text>

          <Text style={styles.subtitle}>
            Manage Raha Supermarket products,
            prices, stock and orders.
          </Text>

          <View style={styles.card}>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>
                Admin Email
              </Text>

              <View style={styles.inputWrap}>
                <Ionicons
                  name="mail-outline"
                  size={19}
                  color={
                    COLORS.textSecondary
                  }
                />

                <TextInput
                  value={email}
                  onChangeText={(value) => {
                    setEmail(value);
                    setErrorMessage("");
                  }}
                  placeholder="Enter admin email"
                  placeholderTextColor={
                    COLORS.textMuted
                  }
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                  style={styles.input}
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>
                Password
              </Text>

              <View style={styles.inputWrap}>
                <Ionicons
                  name="lock-closed-outline"
                  size={19}
                  color={
                    COLORS.textSecondary
                  }
                />

                <TextInput
                  value={password}
                  onChangeText={(value) => {
                    setPassword(value);
                    setErrorMessage("");
                  }}
                  placeholder="Enter admin password"
                  placeholderTextColor={
                    COLORS.textMuted
                  }
                  secureTextEntry={
                    !showPassword
                  }
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                  style={styles.input}
                  onSubmitEditing={
                    handleLogin
                  }
                />

                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={() =>
                    setShowPassword(
                      (current) => !current,
                    )
                  }
                >
                  <Ionicons
                    name={
                      showPassword
                        ? "eye-off-outline"
                        : "eye-outline"
                    }
                    size={20}
                    color={
                      COLORS.textSecondary
                    }
                  />
                </TouchableOpacity>
              </View>
            </View>

            {errorMessage ? (
              <View style={styles.errorBox}>
                <Ionicons
                  name="alert-circle-outline"
                  size={18}
                  color={COLORS.danger}
                />

                <Text
                  style={styles.errorText}
                >
                  {errorMessage}
                </Text>
              </View>
            ) : null}

            <Button
              label={
                loading
                  ? "Verifying Admin →  ..."
                  : "Login to Admin Panel"
              }
              onPress={handleLogin}
              loading={loading}
              disabled={loading}
              fullWidth
              size="lg"
              leftIcon={
                !loading ? (
                  <Ionicons
                    name="log-in-outline"
                    size={20}
                    color={
                      COLORS.textOnPrimary
                    }
                  />
                ) : undefined
              }
            />
          </View>

          <View style={styles.securityNote}>
            <Ionicons
              name="lock-closed"
              size={17}
              color={COLORS.primary}
            />

            <Text
              style={styles.securityText}
            >
              Authorized administrators only.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.deliveryLink}
            onPress={() => router.replace("/delivery/login")}
            testID="admin-login-delivery-link"
          >
            <Ionicons
              name="bicycle-outline"
              size={16}
              color={COLORS.textSecondary}
            />
            <Text style={styles.deliveryLinkText}>
              Delivery Boy Login
            </Text>
            <Ionicons
              name="arrow-forward"
              size={14}
              color={COLORS.textSecondary}
            />
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  keyboardView: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: SPACING.xl,
    paddingBottom: SPACING.xxxl,
  },

  backButton: {
    position: "absolute",
    top: SPACING.md,
    left: SPACING.md,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surface,
  },

  logoWrap: {
    width: 92,
    height: 92,
    borderRadius: 46,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    ...SHADOW.fab,
  },

  title: {
    marginTop: SPACING.xl,
    textAlign: "center",
    fontSize: FONT.size.xxl,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },

  subtitle: {
    marginTop: SPACING.sm,
    marginHorizontal: SPACING.md,
    textAlign: "center",
    fontSize: FONT.size.sm,
    lineHeight: 21,
    color: COLORS.textSecondary,
  },

  card: {
    marginTop: SPACING.xxl,
    padding: SPACING.xl,
    gap: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.background,
    ...SHADOW.card,
  },

  fieldGroup: {
    gap: SPACING.sm,
  },

  label: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.semibold,
    color: COLORS.textPrimary,
  },

  inputWrap: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
  },

  input: {
    flex: 1,
    paddingVertical: 0,
    fontSize: FONT.size.base,
    color: COLORS.textPrimary,
  },

  errorBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: SPACING.sm,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.dangerLight,
  },

  errorText: {
    flex: 1,
    fontSize: FONT.size.sm,
    lineHeight: 19,
    color: COLORS.danger,
  },

  securityNote: {
    marginTop: SPACING.xl,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
  },

  securityText: {
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
  },

  deliveryLink: {
    marginTop: SPACING.md,
    marginHorizontal: SPACING.md,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    backgroundColor: COLORS.surface,
  },
  deliveryLinkText: {
    fontSize: FONT.size.xs,
    fontWeight: FONT.weight.semibold,
    color: COLORS.textSecondary,
  },
});
