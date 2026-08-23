import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/src/components/Button";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { COLORS, FONT, RADIUS, SPACING } from "@/src/config/theme";
import { useApp } from "@/src/context/AppContext";
import type { Address } from "@/src/types";

type AddressForm = Omit<Address, "id">;

const INITIAL_FORM: AddressForm = {
  fullName: "",
  mobile: "",
  house: "",
  landmark: "",
  area: "",
  pincode: "",
  instructions: "",
  isDefault: false,
};

export default function AddAddress() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();

  const addressId = Array.isArray(params.id) ? params.id[0] : params.id;

  const {
    addresses,
    addAddress,
    updateAddress,
  } = useApp();

  const existingAddress = useMemo(
    () => addresses.find((address) => address.id === addressId),
    [addresses, addressId],
  );

  const isEditing = Boolean(addressId);

  const [form, setForm] = useState<AddressForm>(INITIAL_FORM);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!existingAddress) return;

    setForm({
      fullName: existingAddress.fullName,
      mobile: existingAddress.mobile,
      house: existingAddress.house,
      landmark: existingAddress.landmark,
      area: existingAddress.area,
      pincode: existingAddress.pincode,
      instructions: existingAddress.instructions ?? "",
      isDefault: Boolean(existingAddress.isDefault),
    });
  }, [existingAddress]);

  const updateField = <K extends keyof AddressForm>(
    field: K,
    value: AddressForm[K],
  ) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const validateForm = (): string | null => {
    const fullName = form.fullName.trim();
    const mobile = form.mobile.replace(/\D/g, "");
    const house = form.house.trim();
    const area = form.area.trim();
    const pincode = form.pincode.replace(/\D/g, "");

    if (fullName.length < 2) {
      return "Please enter the customer's full name.";
    }

    if (mobile.length !== 10) {
      return "Please enter a valid 10-digit mobile number.";
    }

    if (!/^[6-9]/.test(mobile)) {
      return "Please enter a valid Indian mobile number.";
    }

    if (!house) {
      return "Please enter the house, flat or shop number.";
    }

    if (!area) {
      return "Please enter the area, street or locality.";
    }

    if (pincode.length !== 6) {
      return "Please enter a valid 6-digit PIN code.";
    }

    return null;
  };

  const handleSave = () => {
    const validationMessage = validateForm();

    if (validationMessage) {
      Alert.alert("Check Address", validationMessage);
      return;
    }

    const cleanAddress: AddressForm = {
      fullName: form.fullName.trim(),
      mobile: form.mobile.replace(/\D/g, ""),
      house: form.house.trim(),
      landmark: form.landmark.trim(),
      area: form.area.trim(),
      pincode: form.pincode.replace(/\D/g, ""),
      instructions: form.instructions?.trim() ?? "",
      isDefault: form.isDefault,
    };

    try {
      setIsSaving(true);

      if (isEditing && addressId) {
        if (!existingAddress) {
          Alert.alert(
            "Address Not Found",
            "This saved address could not be found.",
          );
          return;
        }

        updateAddress(addressId, cleanAddress);
      } else {
        addAddress(cleanAddress);
      }

      router.back();
    } catch {
      Alert.alert(
        "Unable to Save",
        "Something went wrong while saving the address. Please try again.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (isEditing && addressId && !existingAddress) {
    return (
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        <ScreenHeader title="Edit Address" />

        <View style={styles.notFoundContainer}>
          <View style={styles.notFoundIcon}>
            <Ionicons
              name="location-outline"
              size={34}
              color={COLORS.primary}
            />
          </View>

          <Text style={styles.notFoundTitle}>Address not found</Text>

          <Text style={styles.notFoundDescription}>
            This address may have already been removed.
          </Text>

          <Button label="Go Back" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScreenHeader
        title={isEditing ? "Edit Address" : "Add New Address"}
      />

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.infoCard}>
            <View style={styles.infoIcon}>
              <Ionicons
                name="location"
                size={22}
                color={COLORS.primary}
              />
            </View>

            <View style={styles.infoTextContainer}>
              <Text style={styles.infoTitle}>Delivery Address</Text>

              <Text style={styles.infoDescription}>
                Add complete details so the delivery partner can find the
                location easily.
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contact Details</Text>

            <FormField
              label="Full Name"
              required
              icon="person-outline"
              placeholder="Enter full name"
              value={form.fullName}
              onChangeText={(value) => updateField("fullName", value)}
              textContentType="name"
              autoCapitalize="words"
              maxLength={60}
              testID="address-full-name"
            />

            <FormField
              label="Mobile Number"
              required
              icon="call-outline"
              placeholder="10-digit mobile number"
              value={form.mobile}
              onChangeText={(value) =>
                updateField(
                  "mobile",
                  value.replace(/\D/g, "").slice(0, 10),
                )
              }
              keyboardType="number-pad"
              textContentType="telephoneNumber"
              maxLength={10}
              prefix="+91"
              testID="address-mobile"
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Address Details</Text>

            <FormField
              label="House / Flat / Shop"
              required
              icon="home-outline"
              placeholder="House no., flat no. or shop no."
              value={form.house}
              onChangeText={(value) => updateField("house", value)}
              autoCapitalize="words"
              maxLength={100}
              testID="address-house"
            />

            <FormField
              label="Area / Street / Locality"
              required
              icon="map-outline"
              placeholder="Area, street or locality"
              value={form.area}
              onChangeText={(value) => updateField("area", value)}
              autoCapitalize="words"
              maxLength={120}
              testID="address-area"
            />

            <FormField
              label="Landmark"
              icon="navigate-outline"
              placeholder="Nearby landmark (optional)"
              value={form.landmark}
              onChangeText={(value) => updateField("landmark", value)}
              autoCapitalize="words"
              maxLength={100}
              testID="address-landmark"
            />

            <FormField
              label="PIN Code"
              required
              icon="mail-outline"
              placeholder="6-digit PIN code"
              value={form.pincode}
              onChangeText={(value) =>
                updateField(
                  "pincode",
                  value.replace(/\D/g, "").slice(0, 6),
                )
              }
              keyboardType="number-pad"
              textContentType="postalCode"
              maxLength={6}
              testID="address-pincode"
            />

            <FormField
              label="Delivery Instructions"
              icon="document-text-outline"
              placeholder="For example: Call before delivery"
              value={form.instructions ?? ""}
              onChangeText={(value) =>
                updateField("instructions", value)
              }
              autoCapitalize="sentences"
              multiline
              maxLength={180}
              testID="address-instructions"
            />
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.defaultCard}
            onPress={() =>
              updateField("isDefault", !form.isDefault)
            }
            testID="address-default-toggle-card"
          >
            <View style={styles.defaultIcon}>
              <Ionicons
                name="checkmark-circle-outline"
                size={22}
                color={COLORS.primary}
              />
            </View>

            <View style={styles.defaultTextContainer}>
              <Text style={styles.defaultTitle}>
                Set as default address
              </Text>

              <Text style={styles.defaultDescription}>
                This address will be selected automatically during checkout.
              </Text>
            </View>

            <Switch
              value={Boolean(form.isDefault)}
              onValueChange={(value) =>
                updateField("isDefault", value)
              }
              trackColor={{
                false: COLORS.borderLight,
                true: COLORS.primaryLight,
              }}
              thumbColor={
                form.isDefault
                  ? COLORS.primary
                  : COLORS.textSecondary
              }
              testID="address-default-switch"
            />
          </TouchableOpacity>

          <View style={styles.saveButtonContainer}>
            <Button
              label={
                isSaving
                  ? "Saving..."
                  : isEditing
                    ? "Update Address"
                    : "Save Address"
              }
              onPress={handleSave}
              disabled={isSaving}
            />
          </View>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => router.back()}
            disabled={isSaving}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

interface FormFieldProps {
  label: string;
  required?: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  prefix?: string;
  multiline?: boolean;
  testID?: string;
  value: string;
  placeholder: string;
  onChangeText: (value: string) => void;
  keyboardType?: React.ComponentProps<typeof TextInput>["keyboardType"];
  textContentType?: React.ComponentProps<
    typeof TextInput
  >["textContentType"];
  autoCapitalize?: React.ComponentProps<
    typeof TextInput
  >["autoCapitalize"];
  maxLength?: number;
}

function FormField({
  label,
  required = false,
  icon,
  prefix,
  multiline = false,
  testID,
  value,
  placeholder,
  onChangeText,
  keyboardType = "default",
  textContentType,
  autoCapitalize = "none",
  maxLength,
}: FormFieldProps) {
  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>

      <View
        style={[
          styles.inputContainer,
          multiline && styles.multilineInputContainer,
        ]}
      >
        <Ionicons
          name={icon}
          size={19}
          color={COLORS.textSecondary}
          style={multiline ? styles.multilineIcon : undefined}
        />

        {prefix ? <Text style={styles.prefix}>{prefix}</Text> : null}

        <TextInput
          testID={testID}
          style={[
            styles.input,
            multiline && styles.multilineInput,
          ]}
          value={value}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textSecondary}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          textContentType={textContentType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          maxLength={maxLength}
          multiline={multiline}
          numberOfLines={multiline ? 3 : 1}
          textAlignVertical={multiline ? "top" : "center"}
          returnKeyType={multiline ? "default" : "next"}
        />
      </View>

      {maxLength && multiline ? (
        <Text style={styles.characterCount}>
          {value.length}/{maxLength}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  keyboardContainer: {
    flex: 1,
  },

  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
  },

  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primaryLight,
  },

  infoIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.background,
  },

  infoTextContainer: {
    flex: 1,
  },

  infoTitle: {
    color: COLORS.textPrimary,
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.bold,
  },

  infoDescription: {
    marginTop: 3,
    color: COLORS.textSecondary,
    fontSize: FONT.size.sm,
    lineHeight: 19,
  },

  section: {
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.background,
  },

  sectionTitle: {
    marginBottom: SPACING.md,
    color: COLORS.textPrimary,
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.bold,
  },

  fieldContainer: {
    marginBottom: SPACING.md,
  },

  label: {
    marginBottom: 7,
    color: COLORS.textPrimary,
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.semibold,
  },

  required: {
    color: COLORS.danger,
  },

  inputContainer: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.background,
  },

  multilineInputContainer: {
    minHeight: 96,
    alignItems: "flex-start",
    paddingTop: 14,
  },

  multilineIcon: {
    marginTop: 2,
  },

  prefix: {
    color: COLORS.textPrimary,
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.semibold,
  },

  input: {
    flex: 1,
    minHeight: 48,
    paddingVertical: 0,
    color: COLORS.textPrimary,
    fontSize: FONT.size.md,
  },

  multilineInput: {
    minHeight: 75,
    paddingTop: 0,
    paddingBottom: SPACING.sm,
  },

  characterCount: {
    marginTop: 5,
    textAlign: "right",
    color: COLORS.textSecondary,
    fontSize: FONT.size.xs,
  },

  defaultCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.background,
  },

  defaultIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primaryLight,
  },

  defaultTextContainer: {
    flex: 1,
  },

  defaultTitle: {
    color: COLORS.textPrimary,
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.bold,
  },

  defaultDescription: {
    marginTop: 3,
    color: COLORS.textSecondary,
    fontSize: FONT.size.xs,
    lineHeight: 17,
  },

  saveButtonContainer: {
    marginTop: SPACING.xl,
  },

  cancelButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.md,
  },

  cancelButtonText: {
    color: COLORS.textSecondary,
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.semibold,
  },

  notFoundContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.xl,
  },

  notFoundIcon: {
    width: 72,
    height: 72,
    marginBottom: SPACING.md,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primaryLight,
  },

  notFoundTitle: {
    color: COLORS.textPrimary,
    fontSize: FONT.size.lg,
    fontWeight: FONT.weight.bold,
  },

  notFoundDescription: {
    marginTop: SPACING.sm,
    marginBottom: SPACING.xl,
    color: COLORS.textSecondary,
    fontSize: FONT.size.sm,
    textAlign: "center",
  },
});