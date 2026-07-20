import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/src/components/Button";
import { BRAND } from "@/src/config/brand";
import { COLORS, FONT, RADIUS, SHADOW, SPACING } from "@/src/config/theme";
import { useApp } from "@/src/context/AppContext";
import { formatCurrency } from "@/src/utils/format";

export default function OrderConfirmation() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getOrderById } = useApp();
  const order = getOrderById(id || "");

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.iconWrap}>
          <View style={styles.iconBg}>
            <Ionicons name="checkmark" size={64} color={COLORS.textOnPrimary} />
          </View>
        </View>
        <Text style={styles.title}>Order Placed Successfully!</Text>
        <Text style={styles.subtitle}>Thank you for shopping with {BRAND.name}</Text>

        {order && (
          <View style={styles.orderCard}>
            <View style={styles.row}>
              <Text style={styles.label}>Order ID</Text>
              <Text style={styles.value} testID="oc-order-id">#{order.id}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.row}>
              <Text style={styles.label}>Items</Text>
              <Text style={styles.value}>{order.items.length}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Total Paid</Text>
              <Text style={[styles.value, { color: COLORS.primary }]}>{formatCurrency(order.total)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Payment</Text>
              <Text style={styles.value}>{order.paymentMethod === "cod" ? "Cash on Delivery" : "Online"}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.etaBox}>
              <Ionicons name="time" size={20} color={COLORS.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.etaTitle}>Estimated delivery</Text>
                <Text style={styles.etaText}>Within {order.estimatedDeliveryMinutes} minutes</Text>
              </View>
            </View>
            <View style={styles.addressBox}>
              <Ionicons name="location" size={20} color={COLORS.textSecondary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.addrName}>{order.address.fullName}</Text>
                <Text style={styles.addrText}>
                  {order.address.house}, {order.address.area}
                  {order.address.landmark ? `, near ${order.address.landmark}` : ""} - {order.address.pincode}
                </Text>
                <Text style={styles.addrText}>+91 {order.address.mobile}</Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.tips}>
          <Ionicons name="information-circle" size={18} color={COLORS.info} />
          <Text style={styles.tipsText}>
            You&apos;ll receive updates as your order progresses. Feel free to contact us on WhatsApp if you need any help.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button label="Continue Shopping" variant="outline" size="lg" style={{ flex: 1 }} onPress={() => router.replace("/(tabs)")} testID="oc-continue-shopping" />
        <Button label="Track Order" size="lg" style={{ flex: 1 }} onPress={() => router.replace({ pathname: "/order/[id]", params: { id: order?.id ?? "" } })} testID="oc-track-order" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: SPACING.xxl, alignItems: "center", paddingBottom: 120 },
  iconWrap: { marginTop: SPACING.md, marginBottom: SPACING.lg },
  iconBg: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: COLORS.primary,
    justifyContent: "center", alignItems: "center",
    ...SHADOW.fab,
  },
  title: {
    fontSize: FONT.size.xxl,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
    textAlign: "center",
  },
  subtitle: {
    fontSize: FONT.size.md,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: 4,
    marginBottom: SPACING.xl,
  },
  orderCard: {
    width: "100%",
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    gap: SPACING.sm,
    ...SHADOW.card,
  },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  label: { color: COLORS.textSecondary, fontSize: FONT.size.sm },
  value: { color: COLORS.textPrimary, fontSize: FONT.size.md, fontWeight: FONT.weight.semibold },
  divider: { height: 1, backgroundColor: COLORS.borderLight, marginVertical: SPACING.xs },
  etaBox: {
    flexDirection: "row", alignItems: "center", gap: SPACING.sm,
    padding: SPACING.md,
    backgroundColor: COLORS.primarySoft, borderRadius: RADIUS.md,
    marginTop: SPACING.sm,
  },
  etaTitle: { color: COLORS.textPrimary, fontWeight: FONT.weight.semibold, fontSize: FONT.size.sm },
  etaText: { color: COLORS.textSecondary, fontSize: FONT.size.xs, marginTop: 2 },
  addressBox: {
    flexDirection: "row", gap: SPACING.sm,
    padding: SPACING.md,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
  },
  addrName: { color: COLORS.textPrimary, fontWeight: FONT.weight.semibold, fontSize: FONT.size.sm },
  addrText: { color: COLORS.textSecondary, fontSize: FONT.size.xs, marginTop: 2, lineHeight: 16 },
  tips: {
    flexDirection: "row", gap: SPACING.sm,
    padding: SPACING.md,
    marginTop: SPACING.md,
    backgroundColor: COLORS.infoLight,
    borderRadius: RADIUS.md,
  },
  tipsText: { flex: 1, color: "#1E40AF", fontSize: FONT.size.xs, lineHeight: 18 },
  footer: {
    position: "absolute",
    left: 0, right: 0, bottom: 0,
    flexDirection: "row", gap: SPACING.md, padding: SPACING.md,
    backgroundColor: COLORS.background,
    borderTopWidth: 1, borderTopColor: COLORS.borderLight,
  },
});
