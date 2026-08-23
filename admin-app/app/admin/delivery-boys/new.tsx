import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
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
import { useToast } from "@/src/components/Toast";
import { COLORS, FONT, RADIUS, SHADOW, SPACING } from "@/src/config/theme";
import { adminCreateDeliveryBoy } from "@/src/services/firebaseDeliveryBoys";

const MOBILE_RE = /^[6-9]\d{9}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AddDeliveryBoyScreen() {
  const router = useRouter();
  const { showToast } = useToast();

  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validate = (): string | null => {
    if (!name.trim()) return "Enter the rider's full name.";
    if (!MOBILE_RE.test(mobile.replace(/\D/g, "")))
      return "Enter a valid 10-digit mobile number.";
    if (!EMAIL_RE.test(email.trim().toLowerCase()))
      return "Enter a valid email address.";
    if (password.length < 6)
      return "Password must be at least 6 characters.";
    return null;
  };

  const handleSave = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    try {
      setSaving(true);
      const rider = await adminCreateDeliveryBoy({
        name: name.trim(),
        mobile: mobile.replace(/\D/g, ""),
        email: email.trim().toLowerCase(),
        password,
        vehicleNumber: vehicleNumber.trim() || undefined,
      });
      showToast(`${rider.name} added successfully`, "success");
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to add rider.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          testID="add-rider-back"
        >
          <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: SPACING.sm }}>
          <Text style={styles.title}>Add Delivery Boy</Text>
          <Text style={styles.subtitle}>
            Create login credentials and rider profile
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <FormField
            label="Full Name"
            icon="person-outline"
            value={name}
            onChangeText={(t) => {
              setName(t);
              setError(null);
            }}
            placeholder="e.g. Ramesh Kumar"
            testID="in-rider-name"
          />
          <FormField
            label="Mobile Number"
            icon="call-outline"
            value={mobile}
            onChangeText={(t) => {
              setMobile(t.replace(/\D/g, ""));
              setError(null);
            }}
            placeholder="10-digit mobile"
            keyboardType="phone-pad"
            maxLength={10}
            testID="in-rider-mobile"
          />
          <FormField
            label="Login Email"
            icon="mail-outline"
            value={email}
            onChangeText={(t) => {
              setEmail(t);
              setError(null);
            }}
            placeholder="ramesh@rahasupermarket.in"
            keyboardType="email-address"
            autoCapitalize="none"
            testID="in-rider-email"
          />
          <FormField
            label="Password"
            icon="lock-closed-outline"
            value={password}
            onChangeText={(t) => {
              setPassword(t);
              setError(null);
            }}
            placeholder="Minimum 6 characters"
            secureTextEntry={!showPassword}
            rightIcon={showPassword ? "eye-off-outline" : "eye-outline"}
            onRightIconPress={() => setShowPassword((v) => !v)}
            testID="in-rider-password"
          />
          <FormField
            label="Vehicle Number (optional)"
            icon="bicycle-outline"
            value={vehicleNumber}
            onChangeText={setVehicleNumber}
            placeholder="e.g. UK 06 EF 1234"
            autoCapitalize="characters"
            testID="in-rider-vehicle"
          />

          {error ? (
            <View style={styles.errorBox}>
              <Ionicons
                name="alert-circle-outline"
                size={18}
                color={COLORS.danger}
              />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.tips}>
            <Ionicons
              name="information-circle-outline"
              size={18}
              color={COLORS.info}
            />
            <Text style={styles.tipsText}>
              The rider will use the email and password below to log in to the
              Delivery Boy app.
            </Text>
          </View>

          <Button
            label={saving ? "Saving…" : "Create Delivery Boy"}
            onPress={() => void handleSave()}
            loading={saving}
            disabled={saving}
            fullWidth
            size="lg"
            testID="save-rider-btn"
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function FormField({
  label,
  icon,
  rightIcon,
  onRightIconPress,
  ...rest
}: {
  label: string;
  icon: keyof typeof import("@expo/vector-icons").Ionicons.glyphMap;
  rightIcon?: keyof typeof import("@expo/vector-icons").Ionicons.glyphMap;
  onRightIconPress?: () => void;
} & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.fieldWrap}>
        <Ionicons name={icon} size={18} color={COLORS.textSecondary} />
        <TextInput
          {...rest}
          placeholderTextColor={COLORS.textMuted}
          style={styles.input}
        />
        {rightIcon ? (
          <TouchableOpacity onPress={onRightIconPress} hitSlop={8}>
            <Ionicons
              name={rightIcon}
              size={18}
              color={COLORS.textSecondary}
            />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surface,
  },
  title: {
    fontSize: FONT.size.lg,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },
  subtitle: {
    marginTop: 2,
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
  },
  scroll: { padding: SPACING.md, gap: SPACING.md, paddingBottom: SPACING.xxxl },
  field: { gap: SPACING.xs },
  fieldLabel: {
    fontSize: FONT.size.sm,
    color: COLORS.textPrimary,
    fontWeight: FONT.weight.semibold,
  },
  fieldWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    backgroundColor: COLORS.surface,
  },
  input: {
    flex: 1,
    fontSize: FONT.size.base,
    color: COLORS.textPrimary,
    padding: 0,
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
    color: COLORS.danger,
    fontSize: FONT.size.sm,
    lineHeight: 18,
  },
  tips: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: SPACING.sm,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.infoLight,
    ...SHADOW.header,
  },
  tipsText: {
    flex: 1,
    color: "#1E40AF",
    fontSize: FONT.size.xs,
    lineHeight: 18,
  },
});
