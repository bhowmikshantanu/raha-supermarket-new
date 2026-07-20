import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/src/components/Button";
import { EmptyState } from "@/src/components/EmptyState";
import { FreeDeliveryProgress } from "@/src/components/FreeDeliveryProgress";
import { useToast } from "@/src/components/Toast";
import { BRAND } from "@/src/config/brand";
import { COLORS, FONT, RADIUS, SHADOW, SPACING } from "@/src/config/theme";
import { useApp } from "@/src/context/AppContext";
import { getProductById } from "@/src/data/products";
import { calcDiscountPercent, formatCurrency } from "@/src/utils/format";

export default function CartScreen() {
  const router = useRouter();
  const { cart, cartSubtotal, deliveryFee, cartTotal, updateQuantity, removeFromCart } = useApp();
  const { showToast } = useToast();

  if (cart.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          <Text style={styles.title}>My Cart</Text>
        </View>
        <EmptyState
          icon="cart-outline"
          title="Your cart is empty"
          description="Add fresh essentials from our store to get started."
        >
          <Button label="Continue Shopping" onPress={() => router.push("/(tabs)")} testID="empty-cart-shop" />
        </EmptyState>
      </SafeAreaView>
    );
  }

  const handleQty = (pid: string, next: number) => {
    const r = updateQuantity(pid, next);
    if (!r.ok) showToast(r.message ?? "Unable to update", "error");
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>My Cart</Text>
        <Text style={styles.subtitle}>{cart.length} item{cart.length > 1 ? "s" : ""}</Text>
      </View>

      <FlatList
        data={cart}
        keyExtractor={(i) => i.productId}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={{ marginBottom: SPACING.md }}>
            <FreeDeliveryProgress subtotal={cartSubtotal} />
          </View>
        }
        ItemSeparatorComponent={() => <View style={{ height: SPACING.md }} />}
        renderItem={({ item }) => {
          const p = getProductById(item.productId);
          if (!p) return null;
          const discount = calcDiscountPercent(p.mrp, p.price);
          return (
            <View style={styles.itemCard} testID={`cart-item-${p.id}`}>
              <View style={styles.itemImgWrap}>
                <Image source={{ uri: p.image }} style={styles.itemImg} contentFit="contain" />
              </View>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName} numberOfLines={2}>{p.name}</Text>
                <Text style={styles.itemSize}>{p.size}</Text>
                <View style={styles.priceRow}>
                  <Text style={styles.itemPrice}>{formatCurrency(p.price)}</Text>
                  {discount > 0 && (
                    <Text style={styles.itemMrp}>{formatCurrency(p.mrp)}</Text>
                  )}
                </View>
              </View>
              <View style={styles.itemActions}>
                <TouchableOpacity
                  onPress={() => { removeFromCart(p.id); showToast("Item removed", "info"); }}
                  hitSlop={8}
                  testID={`cart-remove-${p.id}`}
                >
                  <Ionicons name="trash-outline" size={20} color={COLORS.danger} />
                </TouchableOpacity>
                <View style={styles.stepper}>
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => handleQty(p.id, item.quantity - 1)}
                    testID={`cart-dec-${p.id}`}
                  >
                    <Ionicons name="remove" size={16} color={COLORS.textOnPrimary} />
                  </TouchableOpacity>
                  <Text style={styles.stepQty}>{item.quantity}</Text>
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => handleQty(p.id, item.quantity + 1)}
                    testID={`cart-inc-${p.id}`}
                  >
                    <Ionicons name="add" size={16} color={COLORS.textOnPrimary} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        }}
        ListFooterComponent={
          <View style={styles.summary}>
            <Text style={styles.summaryTitle}>Bill Details</Text>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Item Total</Text>
              <Text style={styles.rowValue}>{formatCurrency(cartSubtotal)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Delivery Fee</Text>
              {deliveryFee === 0 ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={[styles.rowValue, styles.strike]}>{formatCurrency(BRAND.delivery.fee)}</Text>
                  <Text style={[styles.rowValue, { color: COLORS.primary }]}>FREE</Text>
                </View>
              ) : (
                <Text style={styles.rowValue}>{formatCurrency(deliveryFee)}</Text>
              )}
            </View>
            <View style={styles.divider} />
            <View style={styles.row}>
              <Text style={styles.totalLabel}>To Pay</Text>
              <Text style={styles.totalValue} testID="cart-total">{formatCurrency(cartTotal)}</Text>
            </View>
          </View>
        }
      />

      <View style={styles.footer}>
        <View style={{ flex: 1 }}>
          <Text style={styles.footerTotalLabel}>Total</Text>
          <Text style={styles.footerTotal}>{formatCurrency(cartTotal)}</Text>
        </View>
        <Button
          label="Proceed to Checkout"
          onPress={() => router.push("/checkout")}
          size="lg"
          testID="proceed-to-checkout"
          rightIcon={<Ionicons name="arrow-forward" size={18} color={COLORS.textOnPrimary} />}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { padding: SPACING.lg, paddingBottom: SPACING.sm, gap: 2 },
  title: { fontSize: FONT.size.xxl, fontWeight: FONT.weight.bold, color: COLORS.textPrimary },
  subtitle: { fontSize: FONT.size.sm, color: COLORS.textSecondary },
  list: { padding: SPACING.md, paddingBottom: SPACING.xxxl * 3 },
  itemCard: {
    flexDirection: "row",
    gap: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOW.card,
  },
  itemImgWrap: {
    width: 72,
    height: 72,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    justifyContent: "center",
    alignItems: "center",
  },
  itemImg: { width: "85%", height: "85%" },
  itemInfo: { flex: 1, gap: 2 },
  itemName: { fontSize: FONT.size.md, fontWeight: FONT.weight.semibold, color: COLORS.textPrimary },
  itemSize: { fontSize: FONT.size.xs, color: COLORS.textSecondary },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  itemPrice: { fontSize: FONT.size.md, fontWeight: FONT.weight.bold, color: COLORS.textPrimary },
  itemMrp: { fontSize: FONT.size.xs, color: COLORS.textMuted, textDecorationLine: "line-through" },
  itemActions: { justifyContent: "space-between", alignItems: "flex-end", gap: SPACING.sm },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingHorizontal: 4,
    paddingVertical: 3,
    gap: 4,
  },
  stepBtn: { width: 24, height: 24, justifyContent: "center", alignItems: "center" },
  stepQty: { color: COLORS.textOnPrimary, fontWeight: FONT.weight.bold, minWidth: 18, textAlign: "center" },
  summary: {
    marginTop: SPACING.md,
    padding: SPACING.lg,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    gap: SPACING.sm,
  },
  summaryTitle: {
    fontSize: FONT.size.lg,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  rowLabel: { color: COLORS.textSecondary, fontSize: FONT.size.md },
  rowValue: { color: COLORS.textPrimary, fontSize: FONT.size.md, fontWeight: FONT.weight.semibold },
  strike: { textDecorationLine: "line-through", color: COLORS.textMuted },
  divider: { height: 1, backgroundColor: COLORS.borderLight, marginVertical: SPACING.sm },
  totalLabel: { color: COLORS.textPrimary, fontSize: FONT.size.lg, fontWeight: FONT.weight.bold },
  totalValue: { color: COLORS.primary, fontSize: FONT.size.xl, fontWeight: FONT.weight.bold },
  footer: {
    position: "absolute",
    bottom: 0, left: 0, right: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  footerTotalLabel: { fontSize: FONT.size.xs, color: COLORS.textSecondary },
  footerTotal: { fontSize: FONT.size.lg, fontWeight: FONT.weight.bold, color: COLORS.textPrimary },
});
