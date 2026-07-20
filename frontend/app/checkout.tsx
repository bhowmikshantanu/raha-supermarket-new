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
import { FreeDeliveryProgress } from "@/src/components/FreeDeliveryProgress";
import { Input } from "@/src/components/Input";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { StatusPill } from "@/src/components/StatusPill";
import { useToast } from "@/src/components/Toast";
import { COLORS, FONT, RADIUS, SHADOW, SPACING } from "@/src/config/theme";
import { useApp } from "@/src/context/AppContext";
import { getProductById } from "@/src/data/products";
import { formatCurrency, isValidIndianMobile, isValidPincode } from "@/src/utils/format";

interface FormState {
  fullName: string;
  mobile: string;
  house: string;
  landmark: string;
  area: string;
  pincode: string;
  instructions: string;
}
type Errors = Partial<Record<keyof FormState, string>>;

export default function Checkout() {
  const router = useRouter();
  const { cart, cartSubtotal, deliveryFee, cartTotal, placeOrder, addAddress, defaultAddress, user } = useApp();
  const { showToast } = useToast();

  const [form, setForm] = useState<FormState>({
    fullName: defaultAddress?.fullName ?? user?.name ?? "",
    mobile: defaultAddress?.mobile ?? user?.mobile ?? "",
    house: defaultAddress?.house ?? "",
    landmark: defaultAddress?.landmark ?? "",
    area: defaultAddress?.area ?? "",
    pincode: defaultAddress?.pincode ?? "",
    instructions: defaultAddress?.instructions ?? "",
  });
  const [errors, setErrors] = useState<Errors>({});
  const [payment, setPayment] = useState<"cod" | "online">("cod");
  const [saveAddress, setSaveAddress] = useState(true);
  const [placing, setPlacing] = useState(false);

  const setField = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const validate = (): boolean => {
    const e: Errors = {};
    if (!form.fullName.trim()) e.fullName = "Name is required";
    if (!isValidIndianMobile(form.mobile)) e.mobile = "Enter a valid 10-digit mobile";
    if (!form.house.trim()) e.house = "House / flat is required";
    if (!form.area.trim()) e.area = "Area is required";
    if (!isValidPincode(form.pincode)) e.pincode = "Enter a valid 6-digit pincode";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handlePlace = () => {
    if (cart.length === 0) return showToast("Your cart is empty", "error");
    if (payment === "online") return showToast("Online payment coming soon", "info");
    if (!validate()) return showToast("Please fix the highlighted fields", "error");

    setPlacing(true);
    const addr = {
      fullName: form.fullName.trim(),
      mobile: form.mobile.trim(),
      house: form.house.trim(),
      landmark: form.landmark.trim(),
      area: form.area.trim(),
      pincode: form.pincode.trim(),
      instructions: form.instructions.trim(),
    };
    setTimeout(() => {
      if (saveAddress) addAddress({ ...addr, isDefault: true });
      const order = placeOrder({ id: "temp", ...addr }, payment);
      setPlacing(false);
      if (!order) {
        showToast("Failed to place order", "error");
        return;
      }
      router.replace({ pathname: "/order-confirmation", params: { id: order.id } });
    }, 700);
  };

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScreenHeader title="Checkout" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <FreeDeliveryProgress subtotal={cartSubtotal} compact />

          {/* Address form */}
          <Text style={styles.sectionTitle}>Delivery Address</Text>
          <Input label="Full Name" placeholder="Your name" value={form.fullName} onChangeText={(t) => setField("fullName", t)} error={errors.fullName} leftIcon="person-outline" testID="in-fullname" />
          <Input label="Mobile Number" placeholder="10-digit mobile" keyboardType="phone-pad" maxLength={10} value={form.mobile} onChangeText={(t) => setField("mobile", t.replace(/\D/g, ""))} error={errors.mobile} leftIcon="call-outline" testID="in-mobile" />
          <Input label="House / Flat / Building" placeholder="e.g. H.No 12, 2nd floor" value={form.house} onChangeText={(t) => setField("house", t)} error={errors.house} leftIcon="home-outline" testID="in-house" />
          <Input label="Landmark (optional)" placeholder="Nearby landmark" value={form.landmark} onChangeText={(t) => setField("landmark", t)} leftIcon="flag-outline" testID="in-landmark" />
          <Input label="Area / Colony" placeholder="e.g. Gularbhoj Road" value={form.area} onChangeText={(t) => setField("area", t)} error={errors.area} leftIcon="map-outline" testID="in-area" />
          <Input label="Pincode" placeholder="6-digit pincode" keyboardType="number-pad" maxLength={6} value={form.pincode} onChangeText={(t) => setField("pincode", t.replace(/\D/g, ""))} error={errors.pincode} leftIcon="pin-outline" testID="in-pincode" />
          <Input label="Delivery Instructions (optional)" placeholder="e.g. Ring the bell twice" value={form.instructions} onChangeText={(t) => setField("instructions", t)} multiline leftIcon="chatbubble-ellipses-outline" testID="in-instructions" />

          <TouchableOpacity style={styles.checkboxRow} onPress={() => setSaveAddress((v) => !v)} testID="save-address-toggle">
            <View style={[styles.checkbox, saveAddress && styles.checkboxOn]}>
              {saveAddress && <Ionicons name="checkmark" size={14} color={COLORS.textOnPrimary} />}
            </View>
            <Text style={styles.checkboxText}>Save this address for future orders</Text>
          </TouchableOpacity>

          {/* Payment */}
          <Text style={styles.sectionTitle}>Payment Method</Text>
          <TouchableOpacity
            style={[styles.paymentCard, payment === "cod" && styles.paymentCardActive]}
            onPress={() => setPayment("cod")}
            testID="pay-cod"
          >
            <View style={styles.payIcon}>
              <Ionicons name="cash-outline" size={22} color={payment === "cod" ? COLORS.primary : COLORS.textPrimary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.payTitle}>Cash on Delivery</Text>
              <Text style={styles.paySubtitle}>Pay when your order arrives</Text>
            </View>
            <View style={[styles.radio, payment === "cod" && styles.radioOn]}>
              {payment === "cod" && <View style={styles.radioInner} />}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.paymentCard, payment === "online" && styles.paymentCardActive]}
            onPress={() => setPayment("online")}
            testID="pay-online"
          >
            <View style={styles.payIcon}>
              <Ionicons name="card-outline" size={22} color={payment === "online" ? COLORS.primary : COLORS.textPrimary} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={styles.payTitle}>Online Payment</Text>
                <StatusPill label="Coming Soon" tone="warning" />
              </View>
              <Text style={styles.paySubtitle}>UPI, Cards, Netbanking</Text>
            </View>
            <View style={[styles.radio, payment === "online" && styles.radioOn]}>
              {payment === "online" && <View style={styles.radioInner} />}
            </View>
          </TouchableOpacity>

          {/* Order summary */}
          <Text style={styles.sectionTitle}>Order Summary</Text>
          <View style={styles.summaryCard}>
            {cart.map((i) => {
              const p = getProductById(i.productId);
              if (!p) return null;
              return (
                <View key={i.productId} style={styles.summaryItem}>
                  <Text style={styles.summaryItemName} numberOfLines={1}>{p.name} × {i.quantity}</Text>
                  <Text style={styles.summaryItemPrice}>{formatCurrency(p.price * i.quantity)}</Text>
                </View>
              );
            })}
            <View style={styles.summaryDivider} />
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Subtotal</Text>
              <Text style={styles.rowValue}>{formatCurrency(cartSubtotal)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Delivery Fee</Text>
              {deliveryFee === 0 ? (
                <Text style={[styles.rowValue, { color: COLORS.primary }]}>FREE</Text>
              ) : (
                <Text style={styles.rowValue}>{formatCurrency(deliveryFee)}</Text>
              )}
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.row}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{formatCurrency(cartTotal)}</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <View style={{ flex: 1 }}>
          <Text style={styles.footerLabel}>Total ({cart.length} item{cart.length > 1 ? "s" : ""})</Text>
          <Text style={styles.footerAmt}>{formatCurrency(cartTotal)}</Text>
        </View>
        <Button
          label={placing ? "Placing…" : "Place Order"}
          onPress={handlePlace}
          disabled={placing || cart.length === 0}
          loading={placing}
          size="lg"
          testID="place-order-btn"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: SPACING.md, paddingBottom: 120, gap: SPACING.md },
  sectionTitle: {
    fontSize: FONT.size.lg,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  checkboxRow: { flexDirection: "row", alignItems: "center", gap: SPACING.sm, marginTop: SPACING.xs },
  checkbox: {
    width: 20, height: 20, borderRadius: 4,
    borderWidth: 1.5, borderColor: COLORS.border,
    justifyContent: "center", alignItems: "center",
  },
  checkboxOn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  checkboxText: { color: COLORS.textPrimary, fontSize: FONT.size.sm, fontWeight: FONT.weight.medium },

  paymentCard: {
    flexDirection: "row", alignItems: "center", gap: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.borderLight,
    backgroundColor: COLORS.background,
  },
  paymentCardActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primarySoft, borderWidth: 1.5 },
  payIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.surface, justifyContent: "center", alignItems: "center",
  },
  payTitle: { fontSize: FONT.size.md, fontWeight: FONT.weight.semibold, color: COLORS.textPrimary },
  paySubtitle: { fontSize: FONT.size.xs, color: COLORS.textSecondary, marginTop: 2 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: COLORS.border, justifyContent: "center", alignItems: "center" },
  radioOn: { borderColor: COLORS.primary },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary },

  summaryCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.md, gap: SPACING.sm,
  },
  summaryItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  summaryItemName: { flex: 1, color: COLORS.textPrimary, fontSize: FONT.size.sm },
  summaryItemPrice: { color: COLORS.textPrimary, fontSize: FONT.size.sm, fontWeight: FONT.weight.semibold, marginLeft: SPACING.md },
  summaryDivider: { height: 1, backgroundColor: COLORS.borderLight },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  rowLabel: { color: COLORS.textSecondary, fontSize: FONT.size.md },
  rowValue: { color: COLORS.textPrimary, fontSize: FONT.size.md, fontWeight: FONT.weight.semibold },
  totalLabel: { color: COLORS.textPrimary, fontSize: FONT.size.lg, fontWeight: FONT.weight.bold },
  totalValue: { color: COLORS.primary, fontSize: FONT.size.xl, fontWeight: FONT.weight.bold },

  footer: {
    position: "absolute",
    left: 0, right: 0, bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.background,
    borderTopWidth: 1, borderTopColor: COLORS.borderLight,
    ...SHADOW.header,
  },
  footerLabel: { fontSize: FONT.size.xs, color: COLORS.textSecondary },
  footerAmt: { fontSize: FONT.size.lg, fontWeight: FONT.weight.bold, color: COLORS.textPrimary },
});
