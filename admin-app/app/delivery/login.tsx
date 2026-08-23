import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { FirebaseError } from "firebase/app";
import {
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
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
import { auth, db } from "@/src/config/firebase";
import { COLORS, FONT, RADIUS, SHADOW, SPACING } from "@/src/config/theme";

function firebaseErrorMessage(error: unknown): string {
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

export default function DeliveryLoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) return setError("Please enter your email.");
    if (!password) return setError("Please enter your password.");
    if (loading) return;

    setLoading(true);
    setError("");

    try {
      const credential = await signInWithEmailAndPassword(
        auth,
        normalizedEmail,
        password,
      );

      const riderSnapshot = await getDoc(
        doc(db, "deliveryBoys", credential.user.uid),
      );

      if (!riderSnapshot.exists()) {
        await signOut(auth);
        setError("This account is not registered as a delivery boy.");
        return;
      }

      const data = riderSnapshot.data();

      if (data.active === false) {
        await signOut(auth);
        setError("Your account has been deactivated. Contact admin.");
        return;
      }

      router.replace("/delivery");
    } catch (err) {
      console.error("Delivery login failed:", err);
      try {
        await signOut(auth);
      } catch {
        // ignore secondary sign-out failure
      }
      setError(firebaseErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.logo}>
            <Ionicons name="bicycle" size={44} color={COLORS.textOnPrimary} />
          </View>
          <Text style={styles.title}>Delivery Boy Login</Text>
          <Text style={styles.subtitle}>
            Sign in with the credentials shared by Raha Supermarket admin.
          </Text>

          <View style={styles.card}>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Email</Text>
              <View style={styles.fieldWrap}>
                <Ionicons name="mail-outline" size={18} color={COLORS.textSecondary} />
                <TextInput
                  value={email}
                  onChangeText={(v) => {
                    setEmail(v);
                    setError("");
                  }}
                  placeholder="Enter your email"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                  style={styles.input}
                  testID="delivery-login-email"
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Password</Text>
              <View style={styles.fieldWrap}>
                <Ionicons name="lock-closed-outline" size={18} color={COLORS.textSecondary} />
                <TextInput
                  value={password}
                  onChangeText={(v) => {
                    setPassword(v);
                    setError("");
                  }}
                  placeholder="Enter your password"
                  placeholderTextColor={COLORS.textMuted}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                  style={styles.input}
                  onSubmitEditing={handleLogin}
                  testID="delivery-login-password"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword((v) => !v)}
                  hitSlop={8}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={18}
                    color={COLORS.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle-outline" size={18} color={COLORS.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <Button
              label={loading ? "Signing in…" : "Login"}
              onPress={() => void handleLogin()}
              loading={loading}
              disabled={loading}
              fullWidth
              size="lg"
              testID="delivery-login-submit"
            />
          </View>

          <View style={styles.footer}>
            <Ionicons name="shield-checkmark-outline" size={16} color={COLORS.primary} />
            <Text style={styles.footerText}>
              Authorized delivery riders only.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  keyboard: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    padding: SPACING.xl,
    paddingBottom: SPACING.xxxl,
  },
  logo: {
    alignSelf: "center",
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
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
  field: { gap: SPACING.sm },
  fieldLabel: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.semibold,
    color: COLORS.textPrimary,
  },
  fieldWrap: {
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
    color: COLORS.danger,
    lineHeight: 19,
  },
  footer: {
    marginTop: SPACING.xl,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
  },
  footerText: {
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
  },
});
