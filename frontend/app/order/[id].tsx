import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams } from "expo-router";
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { EmptyState } from "@/src/components/EmptyState";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { StatusPill } from "@/src/components/StatusPill";
import { COLORS, FONT, RADIUS, SPACING } from "@/src/config/theme";
import { useApp } from "@/src/context/AppContext";
import type { OrderStatus } from "@/src/types";
import { formatCurrency, formatDateTime } from "@/src/utils/format";

const TIMELINE: { key: OrderStatus; label: string; desc: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "placed", label: "Order Placed", desc: "We received your order", icon: "checkmark-circle" },
  { key: "confirmed", label: "Confirmed", desc: "Your order is confirmed by the store", icon: "checkmark-done" },
  { key: "preparing", label: "Preparing", desc: "Your items are being packed", icon: "cube" },
  { key: "out-for-delivery", label: "Out for Delivery", desc: "Rider is on the way", icon: "bicycle" },
  { key: "delivered", label: "Delivered", desc: "Order delivered — enjoy!", icon: "home" },
];

export default function OrderDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getOrderById } = useApp();
  const order = getOrderById(id || "");

  if (!order) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
        <ScreenHeader title="Order Details" />
        <EmptyState icon="alert-circle-outline" title="Order not found" description="This order may have been cleared." />
      </SafeAreaView>
    );
  }

  const isCancelled = order.status === "cancelled";
  const activeIdx = TIMELINE.findIndex((s) => s.key === order.status);

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScreenHeader title={`Order #${order.id}`} subtitle={formatDateTime(order.createdAt)} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Status timeline */}
        <View style={styles.card}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: SPACING.md }}>
            <Text style={styles.sectionTitle}>Order Status</Text>
            <StatusPill
              label={isCancelled ? "Cancelled" : TIMELINE[activeIdx]?.label || "Placed"}
              tone={isCancelled ? "danger" : activeIdx === TIMELINE.length - 1 ? "success" : "info"}
            />
          </View>
          {isCancelled ? (
            <View style={styles.cancelBox}>
              <Ionicons name="close-circle" size={20} color={COLORS.danger} />
              <Text style={styles.cancelText}>This order was cancelled.</Text>
            </View>
          ) : (
            <View>
              {TIMELINE.map((step, i) => {
                const done = i <= activeIdx;
                const isLast = i === TIMELINE.length - 1;
                return (
                  <View key={step.key} style={styles.stepRow}>
                    <View style={styles.stepIconCol}>
                      <View style={[styles.stepDot, done && styles.stepDotDone]}>
                        <Ionicons name={step.icon} size={14} color={done ? COLORS.textOnPrimary : COLORS.textMuted} />
                      </View>
                      {!isLast && <View style={[styles.stepLine, i < activeIdx && styles.stepLineDone]} />}
                    </View>
                    <View style={{ flex: 1, paddingBottom: isLast ? 0 : SPACING.md }}>
                      <Text style={[styles.stepLabel, done && styles.stepLabelDone]}>{step.label}</Text>
                      <Text style={styles.stepDesc}>{step.desc}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Items */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Items ({order.items.length})</Text>
          {order.items.map((it) => (
            <View key={it.productId} style={styles.itemRow}>
              <View style={styles.itemImgWrap}>
                <Image source={{ uri: it.image }} style={styles.itemImg} contentFit="contain" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName} numberOfLines={2}>{it.name}</Text>
                <Text style={styles.itemMeta}>{it.size} · Qty {it.quantity}</Text>
              </View>
              <Text style={styles.itemPrice}>{formatCurrency(it.price * it.quantity)}</Text>
            </View>
          ))}
        </View>

        {/* Bill */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Bill Details</Text>
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Subtotal</Text>
            <Text style={styles.billValue}>{formatCurrency(order.subtotal)}</Text>
          </View>
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Delivery Fee</Text>
            <Text style={styles.billValue}>{order.deliveryFee === 0 ? "FREE" : formatCurrency(order.deliveryFee)}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.billRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatCurrency(order.total)}</Text>
          </View>
        </View>

        {/* Delivery */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Delivery Address</Text>
          <Text style={styles.addrName}>{order.address.fullName}</Text>
          <Text style={styles.addrText}>
            {order.address.house}, {order.address.area}
            {order.address.landmark ? `, near ${order.address.landmark}` : ""}
          </Text>
          <Text style={styles.addrText}>Pincode: {order.address.pincode}</Text>
          <Text style={styles.addrText}>+91 {order.address.mobile}</Text>
          {order.address.instructions && (
            <View style={styles.noteBox}>
              <Ionicons name="chatbubble-ellipses-outline" size={14} color={COLORS.textSecondary} />
              <Text style={styles.noteText}>{order.address.instructions}</Text>
            </View>
          )}
        </View>

        {/* Payment */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING.sm }}>
            <Ionicons name={order.paymentMethod === "cod" ? "cash-outline" : "card-outline"} size={20} color={COLORS.primary} />
            <Text style={styles.addrName}>{order.paymentMethod === "cod" ? "Cash on Delivery" : "Online Payment"}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: SPACING.md, gap: SPACING.md, paddingBottom: SPACING.xxxl },
  card: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    gap: SPACING.sm,
  },
  sectionTitle: {
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  stepRow: { flexDirection: "row", gap: SPACING.md },
  stepIconCol: { alignItems: "center", width: 28 },
  stepDot: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: COLORS.surfaceAlt,
    justifyContent: "center", alignItems: "center",
    borderWidth: 2, borderColor: COLORS.borderLight,
  },
  stepDotDone: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  stepLine: { flex: 1, width: 2, backgroundColor: COLORS.borderLight, minHeight: 20, marginVertical: 2 },
  stepLineDone: { backgroundColor: COLORS.primary },
  stepLabel: { color: COLORS.textSecondary, fontWeight: FONT.weight.semibold, fontSize: FONT.size.md },
  stepLabelDone: { color: COLORS.textPrimary },
  stepDesc: { color: COLORS.textMuted, fontSize: FONT.size.xs, marginTop: 2 },
  cancelBox: {
    flexDirection: "row", alignItems: "center", gap: SPACING.sm,
    padding: SPACING.md, backgroundColor: COLORS.dangerLight, borderRadius: RADIUS.md,
  },
  cancelText: { color: COLORS.danger, fontWeight: FONT.weight.semibold },

  itemRow: {
    flexDirection: "row", alignItems: "center", gap: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1, borderBottomColor: COLORS.borderLight,
  },
  itemImgWrap: {
    width: 48, height: 48, backgroundColor: COLORS.surface, borderRadius: RADIUS.sm,
    justifyContent: "center", alignItems: "center",
  },
  itemImg: { width: "85%", height: "85%" },
  itemName: { fontSize: FONT.size.sm, fontWeight: FONT.weight.semibold, color: COLORS.textPrimary },
  itemMeta: { fontSize: FONT.size.xs, color: COLORS.textSecondary, marginTop: 2 },
  itemPrice: { fontSize: FONT.size.sm, fontWeight: FONT.weight.bold, color: COLORS.textPrimary },

  billRow: { flexDirection: "row", justifyContent: "space-between" },
  billLabel: { color: COLORS.textSecondary, fontSize: FONT.size.sm },
  billValue: { color: COLORS.textPrimary, fontSize: FONT.size.sm, fontWeight: FONT.weight.semibold },
  divider: { height: 1, backgroundColor: COLORS.borderLight, marginVertical: SPACING.xs },
  totalLabel: { color: COLORS.textPrimary, fontSize: FONT.size.md, fontWeight: FONT.weight.bold },
  totalValue: { color: COLORS.primary, fontSize: FONT.size.lg, fontWeight: FONT.weight.bold },

  addrName: { color: COLORS.textPrimary, fontSize: FONT.size.sm, fontWeight: FONT.weight.semibold },
  addrText: { color: COLORS.textSecondary, fontSize: FONT.size.xs, marginTop: 2, lineHeight: 18 },
  noteBox: { flexDirection: "row", gap: 6, padding: SPACING.sm, backgroundColor: COLORS.surface, borderRadius: RADIUS.sm, marginTop: SPACING.sm, alignItems: "flex-start" },
  noteText: { flex: 1, fontSize: FONT.size.xs, color: COLORS.textSecondary },
});
