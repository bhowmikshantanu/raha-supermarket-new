import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { COLORS, FONT, RADIUS, SHADOW, SPACING } from "@/src/config/theme";
import type { Product } from "@/src/types";
import { calcDiscountPercent, formatCurrency } from "@/src/utils/format";

interface Props {
  product: Product;
  quantity: number;
  onPress: () => void;
  onAdd: () => void;
  onIncrement: () => void;
  onDecrement: () => void;
  layout?: "grid" | "list";
}

export const ProductCard: React.FC<Props> = React.memo(
  ({ product, quantity, onPress, onAdd, onIncrement, onDecrement, layout = "grid" }) => {
    const discount = calcDiscountPercent(product.mrp, product.price);
    const isOOS = product.stock <= 0;

    if (layout === "list") {
      return (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onPress}
          style={styles.listCard}
          testID={`product-card-${product.id}`}
        >
          <View style={styles.listImageWrap}>
            <Image source={{ uri: product.image }} style={styles.listImage} contentFit="contain" />
            {discount > 0 && (
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>{discount}% OFF</Text>
              </View>
            )}
          </View>
          <View style={styles.listInfo}>
            <Text style={styles.name} numberOfLines={2}>
              {product.name}
            </Text>
            <Text style={styles.size}>{product.size}</Text>
            <View style={styles.priceRow}>
              <Text style={styles.price}>{formatCurrency(product.price)}</Text>
              {product.mrp > product.price && (
                <Text style={styles.mrp}>{formatCurrency(product.mrp)}</Text>
              )}
            </View>
            {isOOS ? (
              <View style={styles.oosPill}>
                <Text style={styles.oosText}>Out of stock</Text>
              </View>
            ) : quantity > 0 ? (
              <QtyStepper qty={quantity} onInc={onIncrement} onDec={onDecrement} pid={product.id} />
            ) : (
              <TouchableOpacity
                onPress={onAdd}
                style={styles.addBtnList}
                testID={`add-to-cart-${product.id}`}
              >
                <Text style={styles.addBtnText}>ADD</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        style={styles.gridCard}
        testID={`product-card-${product.id}`}
      >
        <View style={styles.gridImageWrap}>
          <Image source={{ uri: product.image }} style={styles.gridImage} contentFit="contain" />
          {discount > 0 && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>{discount}% OFF</Text>
            </View>
          )}
        </View>
        <Text style={styles.name} numberOfLines={2}>
          {product.name}
        </Text>
        <Text style={styles.size}>{product.size}</Text>
        <View style={styles.priceRow}>
          <Text style={styles.price}>{formatCurrency(product.price)}</Text>
          {product.mrp > product.price && (
            <Text style={styles.mrp}>{formatCurrency(product.mrp)}</Text>
          )}
        </View>
        {isOOS ? (
          <View style={styles.oosPill}>
            <Text style={styles.oosText}>Out of stock</Text>
          </View>
        ) : quantity > 0 ? (
          <QtyStepper qty={quantity} onInc={onIncrement} onDec={onDecrement} pid={product.id} />
        ) : (
          <TouchableOpacity onPress={onAdd} style={styles.addBtn} testID={`add-to-cart-${product.id}`}>
            <Ionicons name="add" size={16} color={COLORS.primary} />
            <Text style={styles.addBtnText}>ADD</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  },
);
ProductCard.displayName = "ProductCard";

const QtyStepper: React.FC<{ qty: number; onInc: () => void; onDec: () => void; pid: string }> = ({
  qty,
  onInc,
  onDec,
  pid,
}) => (
  <View style={styles.stepper} testID={`qty-stepper-${pid}`}>
    <TouchableOpacity onPress={onDec} style={styles.stepBtn} testID={`qty-dec-${pid}`}>
      <Ionicons name="remove" size={16} color={COLORS.textOnPrimary} />
    </TouchableOpacity>
    <Text style={styles.stepQty} testID={`qty-value-${pid}`}>
      {qty}
    </Text>
    <TouchableOpacity onPress={onInc} style={styles.stepBtn} testID={`qty-inc-${pid}`}>
      <Ionicons name="add" size={16} color={COLORS.textOnPrimary} />
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  gridCard: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOW.card,
  },
  gridImageWrap: {
    aspectRatio: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SPACING.sm,
    overflow: "hidden",
    position: "relative",
  },
  gridImage: { width: "85%", height: "85%" },
  listCard: {
    flexDirection: "row",
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    gap: SPACING.md,
    ...SHADOW.card,
  },
  listImageWrap: {
    width: 96,
    height: 96,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    position: "relative",
  },
  listImage: { width: "85%", height: "85%" },
  listInfo: { flex: 1, justifyContent: "space-between" },
  discountBadge: {
    position: "absolute",
    top: 6,
    left: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  discountText: {
    color: COLORS.textOnPrimary,
    fontSize: 10,
    fontWeight: FONT.weight.bold,
  },
  name: {
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.semibold,
    color: COLORS.textPrimary,
    marginBottom: 2,
    minHeight: 36,
  },
  size: { fontSize: FONT.size.xs, color: COLORS.textSecondary, marginBottom: 6 },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: SPACING.sm },
  price: {
    fontSize: FONT.size.lg,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },
  mrp: {
    fontSize: FONT.size.sm,
    color: COLORS.textMuted,
    textDecorationLine: "line-through",
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 8,
    backgroundColor: COLORS.primaryLight,
  },
  addBtnList: {
    alignSelf: "flex-start",
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingHorizontal: 20,
    paddingVertical: 6,
    backgroundColor: COLORS.primaryLight,
  },
  addBtnText: {
    color: COLORS.primary,
    fontWeight: FONT.weight.bold,
    fontSize: FONT.size.sm,
    letterSpacing: 0.5,
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  stepBtn: {
    width: 26,
    height: 26,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  stepQty: {
    color: COLORS.textOnPrimary,
    fontWeight: FONT.weight.bold,
    fontSize: FONT.size.md,
  },
  oosPill: {
    borderRadius: RADIUS.md,
    paddingVertical: 8,
    backgroundColor: COLORS.dangerLight,
    alignItems: "center",
  },
  oosText: {
    color: COLORS.danger,
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.semibold,
  },
});
