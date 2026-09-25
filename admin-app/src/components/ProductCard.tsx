import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React, { useCallback, useMemo, useState } from "react";
import {
  GestureResponderEvent,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {
  COLORS,
  FONT,
  RADIUS,
  SHADOW,
  SPACING,
} from "@/src/config/theme";
import { useApp } from "@/src/context/AppContext";
import type { Product } from "@/src/types";
import {
  calcDiscountPercent,
  formatCurrency,
} from "@/src/utils/format";

interface Props {
  product: Product;
  quantity: number;
  onPress: () => void;
  onAdd: () => void;
  onIncrement: () => void;
  onDecrement: () => void;
  layout?: "grid" | "list";
}

interface QtyStepperProps {
  qty: number;
  onInc: () => void;
  onDec: () => void;
  pid: string;
}

export const ProductCard: React.FC<Props> = React.memo(
  ({
    product,
    quantity,
    onPress,
    onAdd,
    onIncrement,
    onDecrement,
    layout = "grid",
  }) => {
    const [imageFailed, setImageFailed] = useState(false);
    const { isWishlisted, toggleWishlist } = useApp();

    const wishlisted = isWishlisted(String(product.id));

    const discount = useMemo(
      () => calcDiscountPercent(product.mrp, product.price),
      [product.mrp, product.price],
    );

    const isOutOfStock = product.stock <= 0;
    const isLowStock = product.stock > 0 && product.stock <= 5;

    const handleWishlistPress = useCallback(
      (event: GestureResponderEvent) => {
        event.stopPropagation();
        toggleWishlist(String(product.id));
      },
      [product.id, toggleWishlist],
    );

    const handleActionPress = useCallback(
      (event: GestureResponderEvent, action: () => void) => {
        event.stopPropagation();
        action();
      },
      [],
    );

    const productImage = (
      <View
        style={[
          layout === "list"
            ? styles.listImageWrap
            : styles.gridImageWrap,
          isOutOfStock && styles.outOfStockImageWrap,
        ]}
      >
        {imageFailed || !product.image ? (
          <View style={styles.imageFallback}>
            <Ionicons
              name="image-outline"
              size={layout === "list" ? 30 : 38}
              color={COLORS.textMuted}
            />
            <Text style={styles.imageFallbackText}>
              Image unavailable
            </Text>
          </View>
        ) : (
          <Image
            source={{ uri: product.image }}
            style={[
              layout === "list"
                ? styles.listImage
                : styles.gridImage,
              isOutOfStock && styles.outOfStockImage,
            ]}
            contentFit="contain"
            transition={180}
            cachePolicy="memory-disk"
            recyclingKey={String(product.id)}
            onError={() => setImageFailed(true)}
            accessibilityLabel={`${product.name} product image`}
          />
        )}

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleWishlistPress}
          style={[
            styles.wishlistButton,
            wishlisted && styles.wishlistButtonActive,
          ]}
          accessibilityRole="button"
          accessibilityLabel={
            wishlisted
              ? `Remove ${product.name} from wishlist`
              : `Add ${product.name} to wishlist`
          }
          testID={`wishlist-${product.id}`}
        >
          <Ionicons
            name={wishlisted ? "heart" : "heart-outline"}
            size={18}
            color={wishlisted ? COLORS.danger : COLORS.textPrimary}
          />
        </TouchableOpacity>

        {discount > 0 && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>
              {discount}% OFF
            </Text>
          </View>
        )}

        {(isLowStock || isOutOfStock) && (
          <View style={styles.stockBadge}>
            <Ionicons
              name={isOutOfStock ? "ban" : "flash"}
              size={10}
              color={isOutOfStock ? COLORS.danger : COLORS.primary}
            />
            <Text style={styles.stockText}>
              {isOutOfStock
                ? "Out of stock"
                : `Only ${product.stock} left`}
            </Text>
          </View>
        )}
      </View>
    );

    const productDetails = (
      <>
        <Text
          style={styles.name}
          numberOfLines={2}
          ellipsizeMode="tail"
        >
          {product.name}
        </Text>

        <Text
          style={styles.size}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {product.size}
        </Text>

        <View style={styles.priceRow}>
          <Text style={styles.price}>
            {formatCurrency(product.price)}
          </Text>

          {product.mrp > product.price && (
            <Text style={styles.mrp}>
              {formatCurrency(product.mrp)}
            </Text>
          )}
        </View>

        {isOutOfStock ? (
          <View
            style={styles.oosPill}
            accessibilityRole="text"
            accessibilityLabel={`${product.name} is out of stock`}
          >
            <Ionicons
              name="alert-circle-outline"
              size={15}
              color={COLORS.danger}
            />
            <Text style={styles.oosText}>
              Out of stock
            </Text>
          </View>
        ) : quantity > 0 ? (
          <QtyStepper
            qty={quantity}
            onInc={onIncrement}
            onDec={onDecrement}
            pid={String(product.id)}
          />
        ) : (
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={(event) =>
              handleActionPress(event, onAdd)
            }
            style={[
              layout === "list"
                ? styles.addBtnList
                : styles.addBtn,
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Add ${product.name} to cart`}
            accessibilityHint="Adds one unit of this product to your cart"
            testID={`add-to-cart-${product.id}`}
          >
            <Ionicons
              name="add-circle-outline"
              size={17}
              color={COLORS.primary}
            />
            <Text style={styles.addBtnText}>
              ADD
            </Text>
          </TouchableOpacity>
        )}
      </>
    );

    if (layout === "list") {
      return (
        <Pressable
          onPress={onPress}
          style={styles.listCard}
          accessibilityRole={Platform.OS === "web" ? undefined : "button"}
          accessibilityLabel={`${product.name}, ${product.size}, ${formatCurrency(
            product.price,
          )}`}
          accessibilityHint="Opens product details"
          testID={`product-card-${product.id}`}
        >
          {productImage}

          <View style={styles.listInfo}>
            {productDetails}
          </View>
        </Pressable>
      );
    }

    return (
      <Pressable
        onPress={onPress}
        style={styles.gridCard}
        accessibilityRole={Platform.OS === "web" ? undefined : "button"}
        accessibilityLabel={`${product.name}, ${product.size}, ${formatCurrency(
          product.price,
        )}`}
        accessibilityHint="Opens product details"
        testID={`product-card-${product.id}`}
      >
        {productImage}
        {productDetails}
      </Pressable>
    );
  },
);

ProductCard.displayName = "ProductCard";

const QtyStepper: React.FC<QtyStepperProps> = React.memo(
  ({ qty, onInc, onDec, pid }) => {
    const handlePress = useCallback(
      (event: GestureResponderEvent, action: () => void) => {
        event.stopPropagation();
        action();
      },
      [],
    );

    return (
      <View
        style={styles.stepper}
        accessibilityLabel={`Quantity ${qty}`}
        testID={`qty-stepper-${pid}`}
      >
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={(event) =>
            handlePress(event, onDec)
          }
          style={styles.stepBtn}
          accessibilityRole="button"
          accessibilityLabel="Decrease quantity"
          hitSlop={{
            top: 8,
            bottom: 8,
            left: 8,
            right: 8,
          }}
          testID={`qty-dec-${pid}`}
        >
          <Ionicons
            name={qty === 1 ? "trash-outline" : "remove"}
            size={qty === 1 ? 15 : 17}
            color={COLORS.textOnPrimary}
          />
        </TouchableOpacity>

        <Text
          style={styles.stepQty}
          accessibilityLiveRegion="polite"
          testID={`qty-value-${pid}`}
        >
          {qty}
        </Text>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={(event) =>
            handlePress(event, onInc)
          }
          style={styles.stepBtn}
          accessibilityRole="button"
          accessibilityLabel="Increase quantity"
          hitSlop={{
            top: 8,
            bottom: 8,
            left: 8,
            right: 8,
          }}
          testID={`qty-inc-${pid}`}
        >
          <Ionicons
            name="add"
            size={17}
            color={COLORS.textOnPrimary}
          />
        </TouchableOpacity>
      </View>
    );
  },
);

QtyStepper.displayName = "QtyStepper";

const styles = StyleSheet.create({
  gridCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: RADIUS.xl,
    padding: SPACING.sm,
    borderWidth: 1,
    borderColor: "#F0E3DB",
    ...SHADOW.card,
  },

  gridImageWrap: {
    aspectRatio: 1,
    backgroundColor: "#FFF7EF",
    borderRadius: RADIUS.lg,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SPACING.sm,
    overflow: "hidden",
    position: "relative",
  },

  gridImage: {
    width: "84%",
    height: "84%",
  },

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
    width: 88,
    height: 88,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    position: "relative",
  },

  listImage: {
    width: "84%",
    height: "84%",
  },

  listInfo: {
    flex: 1,
    justifyContent: "space-between",
    minWidth: 0,
  },

  outOfStockImageWrap: {
    backgroundColor: COLORS.surface,
  },

  outOfStockImage: {
    opacity: 0.45,
  },

  imageFallback: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING.sm,
  },

  imageFallbackText: {
    marginTop: 4,
    fontSize: 9,
    color: COLORS.textMuted,
    textAlign: "center",
  },

  discountBadge: {
    position: "absolute",
    top: 7,
    left: 7,
    zIndex: 3,
    backgroundColor: "#D94732",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
  },

  discountText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: FONT.weight.bold,
    letterSpacing: 0.2,
  },

  wishlistButton: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.95)",
    justifyContent: "center",
    alignItems: "center",
    ...SHADOW.card,
    zIndex: 4,
  },

  wishlistButtonActive: {
    backgroundColor: COLORS.dangerLight,
  },

  stockBadge: {
    position: "absolute",
    bottom: 10,
    left: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.background,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },

  stockText: {
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
    fontWeight: FONT.weight.semibold,
  },

  name: {
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.semibold,
    color: COLORS.textPrimary,
    marginBottom: 3,
    minHeight: 34,
    lineHeight: 17,
  },

  size: {
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
    marginBottom: 7,
  },

  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: SPACING.sm,
  },

  price: {
    fontSize: FONT.size.lg,
    fontWeight: FONT.weight.bold,
    color: COLORS.maroon,
  },

  mrp: {
    fontSize: FONT.size.sm,
    color: COLORS.textMuted,
    textDecorationLine: "line-through",
  },

  addBtn: {
    minHeight: 34,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    borderWidth: 0,
    borderRadius: RADIUS.md,
    paddingVertical: 9,
    paddingHorizontal: 10,
    backgroundColor: "#FFD44A",
  },

  addBtnList: {
    minHeight: 34,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingHorizontal: 20,
    paddingVertical: 7,
    backgroundColor: COLORS.primaryLight,
  },

  addBtnText: {
    color: COLORS.maroonDark,
    fontWeight: FONT.weight.heavy,
    fontSize: FONT.size.sm,
    letterSpacing: 0.5,
  },

  stepper: {
    minHeight: 34,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingHorizontal: 5,
    paddingVertical: 4,
  },

  stepBtn: {
    width: 28,
    height: 28,
    borderRadius: 7,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
  },

  stepQty: {
    minWidth: 30,
    textAlign: "center",
    color: COLORS.textOnPrimary,
    fontWeight: FONT.weight.bold,
    fontSize: FONT.size.md,
  },

  oosPill: {
    minHeight: 40,
    flexDirection: "row",
    gap: 5,
    borderRadius: RADIUS.md,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: COLORS.dangerLight,
    alignItems: "center",
    justifyContent: "center",
  },

  oosText: {
    color: COLORS.danger,
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.semibold,
  },
});