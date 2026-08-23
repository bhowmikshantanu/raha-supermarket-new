import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { doc, onSnapshot } from "firebase/firestore";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
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
import { db } from "@/src/config/firebase";
import { COLORS, FONT, RADIUS, SHADOW, SPACING } from "@/src/config/theme";
import {
  adminResetDeliveryBoyPassword,
  adminUpdateDeliveryBoy,
} from "@/src/services/firebaseDeliveryBoys";
import type { DeliveryBoy } from "@/src/types";

const MOBILE_RE = /^[6-9]\d{9}$/;

export default function EditDeliveryBoyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();

  const [rider, setRider] = useState<DeliveryBoy | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!id) return;
    const unsubscribe = onSnapshot(
      doc(db, "deliveryBoys", id),
      (snapshot) => {
        if (!snapshot.exists()) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        const data = snapshot.data();
        const item: DeliveryBoy = {
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
              : undefined,
          createdAt:
            typeof data.createdAtMs === "number"
              ? data.createdAtMs
              : Date.now(),
        };
        setRider(item);
        setName(item.name);
        setMobile(item.mobile);
        setVehicleNumber(item.vehicleNumber ?? "");
        setLoading(false);
      },
      (err) => {
        console.error("[Admin] Rider read failed:", err);
        setError("Unable to load rider.");
        setLoading(false);
      },
    );
    return unsubscribe;
  }, [id]);

  const dirty = useMemo(() => {
    if (!rider) return false;
    return (
      name.trim() !== rider.name ||
      mobile.trim() !== rider.mobile ||
      (vehicleNumber.trim() || "") !== (rider.vehicleNumber ?? "")
    );
  }, [rider, name, mobile, vehicleNumber]);

  const handleSave = async () => {
    if (!rider) return;
    if (!name.trim()) return setError("Name is required.");
    if (!MOBILE_RE.test(mobile.replace(/\D/g, "")))
      return setError("Enter a valid 10-digit mobile number.");
    setError(null);
    try {
      setSaving(true);
      await adminUpdateDeliveryBoy(rider.id, {
        name: name.trim(),
        mobile: mobile.trim(),
        vehicleNumber:
          vehicleNumber.trim() === "" ? null : vehicleNumber.trim(),
      });
      showToast("Rider updated", "success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async () => {
    if (!rider) return;
    try {
      setSaving(true);
      await adminUpdateDeliveryBoy(rider.id, { active: !rider.active });
      showToast(!rider.active ? "Rider activated" : "Rider deactivated", "success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update.");
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async () => {
    if (!rider) return;
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setError(null);
    try {
      setResetting(true);
      await adminResetDeliveryBoyPassword(rider.id, newPassword);
      setNewPassword("");
      showToast("Password reset successfully", "success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to reset password.");
    } finally {
      setResetting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (notFound || !rider) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <View style={styles.loadingWrap}>
          <Ionicons
            name="alert-circle-outline"
            size={48}
            color={COLORS.textMuted}
          />
          <Text style={styles.emptyTitle}>Delivery boy not found</Text>
          <TouchableOpacity
            style={styles.backCta}
            onPress={() => router.replace("/admin/delivery-boys")}
          >
            <Text style={styles.backCtaText}>Back to riders</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: SPACING.sm }}>
          <Text style={styles.title}>{rider.name}</Text>
          <Text style={styles.subtitle}>
            {rider.active ? "Active" : "Inactive"} · {rider.email}
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
          <SectionTitle title="Profile" />
          <FormRow label="Full Name" icon="person-outline">
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Rider name"
              placeholderTextColor={COLORS.textMuted}
              style={styles.input}
              testID="edit-rider-name"
            />
          </FormRow>
          <FormRow label="Mobile Number" icon="call-outline">
            <TextInput
              value={mobile}
              onChangeText={(t) => setMobile(t.replace(/\D/g, ""))}
              placeholder="10-digit mobile"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="phone-pad"
              maxLength={10}
              style={styles.input}
              testID="edit-rider-mobile"
            />
          </FormRow>
          <FormRow label="Vehicle Number (optional)" icon="bicycle-outline">
            <TextInput
              value={vehicleNumber}
              onChangeText={setVehicleNumber}
              placeholder="e.g. UK 06 EF 1234"
              placeholderTextColor={COLORS.textMuted}
              autoCapitalize="characters"
              style={styles.input}
            />
          </FormRow>

          <Button
            label={saving ? "Saving…" : "Save Changes"}
            onPress={() => void handleSave()}
            disabled={saving || !dirty}
            loading={saving}
            fullWidth
            size="lg"
            testID="edit-rider-save"
          />

          <SectionTitle title="Account" />
          <TouchableOpacity
            style={[
              styles.toggleCard,
              rider.active
                ? { borderColor: COLORS.danger, backgroundColor: COLORS.dangerLight }
                : { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
            ]}
            onPress={() => void handleToggleActive()}
            disabled={saving}
            testID="edit-rider-toggle-active"
          >
            <Ionicons
              name={rider.active ? "pause-circle-outline" : "play-circle-outline"}
              size={22}
              color={rider.active ? COLORS.danger : COLORS.primaryDark}
            />
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.toggleCardTitle,
                  { color: rider.active ? COLORS.danger : COLORS.primaryDark },
                ]}
              >
                {rider.active ? "Deactivate rider" : "Activate rider"}
              </Text>
              <Text style={styles.toggleCardHint}>
                Inactive riders cannot log in and stop receiving orders.
              </Text>
            </View>
          </TouchableOpacity>

          <SectionTitle title="Reset Password" />
          <FormRow label="New Password" icon="lock-closed-outline">
            <TextInput
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Minimum 6 characters"
              placeholderTextColor={COLORS.textMuted}
              secureTextEntry={!showPassword}
              style={styles.input}
              testID="edit-rider-newpass"
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
          </FormRow>
          <Button
            label={resetting ? "Resetting…" : "Reset Password"}
            onPress={() => void handleResetPassword()}
            disabled={resetting || newPassword.length < 6}
            loading={resetting}
            variant="outline"
            fullWidth
            testID="edit-rider-reset"
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
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

function FormRow({
  label,
  icon,
  children,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.fieldWrap}>
        <Ionicons name={icon} size={18} color={COLORS.textSecondary} />
        {children}
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
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.xl,
    gap: SPACING.md,
  },
  emptyTitle: {
    marginTop: SPACING.md,
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },
  backCta: {
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
  },
  backCtaText: {
    color: COLORS.textOnPrimary,
    fontWeight: FONT.weight.bold,
  },
  scroll: { padding: SPACING.md, gap: SPACING.md, paddingBottom: SPACING.xxxl },
  sectionTitle: {
    marginTop: SPACING.md,
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },
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
  toggleCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    ...SHADOW.header,
  },
  toggleCardTitle: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.bold,
  },
  toggleCardHint: {
    marginTop: 2,
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
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
  },
});
