import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { EmptyState } from "@/src/components/EmptyState";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import {
  COLORS,
  FONT,
  RADIUS,
  SHADOW,
  SPACING,
} from "@/src/config/theme";
import { useApp } from "@/src/context/AppContext";
import { useProducts } from "@/src/context/ProductContext";
import type { Product } from "@/src/types";
import {
  calcDiscountPercent,
  formatCurrency,
} from "@/src/utils/format";

export default function WishlistScreen() {
  const router = useRouter();

  const {
    wishlist,
    wishlistCount,
    clearWishlist,
    removeFromWishlist,
    addToCart,
    getQuantity,
  } = useApp();

  const {
    loading: productsLoading,
    getProductById,
  } = useProducts();

  const products = useMemo(
    () =>
      wishlist
        .map((productId) => getProductById(productId))
        .filter((product): product is Product => Boolean(product)),
    [wishlist, getProductById],
  );

  const handleClearWishlist = () => {
    if (wishlistCount === 0) return;

    Alert.alert(
      "Clear Wishlist",
      "Remove all products from your wishlist?",
      [
        {
          text: "Keep Products",
          style: "cancel",
        },
        {
          text: "Clear All",
          style: "destructive",
          onPress: clearWishlist,
        },
      ],
    );
  };

  const handleAddToCart = (product: Product) => {
    const result = addToCart(String(product.id), 1);

    if (!result.ok) {
      Alert.alert(
        "Unable to Add",
        result.message ??
          "This product could not be added to your cart.",
      );
      return;
    }

    Alert.alert(
      "Added to Cart",
      `${product.name} has been added to your cart.`,
      [
        {
          text: "Continue",
          style: "cancel",
        },
        {
          text: "View Cart",
          onPress: () =>
            router.push("/(tabs)/cart" as any),
        },
      ],
    );
  };

  if (productsLoading) {
    return (
      <SafeAreaView
        style={styles.container}
        edges={["bottom"]}
      >
        <ScreenHeader
          title="My Wishlist"
          subtitle="Syncing saved products…"
        />

        <View style={styles.loadingWrap}>
          <Ionicons
            name="cloud-download-outline"
            size={42}
            color={COLORS.primary}
          />

          <Text style={styles.loadingTitle}>
            Loading wishlist
          </Text>

          <Text style={styles.loadingText}>
            Syncing the latest product prices and stock from Firebase.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={styles.container}
      edges={["bottom"]}
    >
      <ScreenHeader
        title="My Wishlist"
        subtitle={
          wishlistCount === 0
            ? "Save products you love"
            : `${wishlistCount} saved product${
                wishlistCount !== 1 ? "s" : ""
              }`
        }
        rightAction={
          wishlistCount > 0
            ? {
                icon: "trash-outline",
                accessibilityLabel: "Clear wishlist",
                onPress: handleClearWishlist,
              }
            : undefined
        }
      />

      {products.length === 0 ? (
        <EmptyState
          icon="heart-outline"
          title="Your wishlist is empty"
          description="Tap the heart icon on any product to save it here."
          actionLabel="Start Shopping"
          onAction={() =>
            router.replace("/(tabs)" as any)
          }
        />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => (
            <View style={styles.separator} />
          )}
          renderItem={({ item }) => (
            <WishlistProductCard
              product={item}
              quantity={getQuantity(String(item.id))}
              onPress={() =>
                router.push({
                  pathname: "/product/[id]",
                  params: {
                    id: String(item.id),
                  },
                })
              }
              onAddToCart={() =>
                handleAddToCart(item)
              }
              onRemove={() =>
                removeFromWishlist(String(item.id))
              }
              onViewCart={() =>
                router.push("/(tabs)/cart" as any)
              }
            />
          )}
          ListHeaderComponent={
            <View style={styles.infoBanner}>
              <View style={styles.infoIcon}>
                <Ionicons
                  name="heart"
                  size={20}
                  color={COLORS.danger}
                />
              </View>

              <View style={styles.infoContent}>
                <Text style={styles.infoTitle}>
                  Saved for later
                </Text>

                <Text style={styles.infoText}>
                  Add products to your cart whenever
                  you are ready.
                </Text>
              </View>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

function WishlistProductCard({
  product,
  quantity,
  onPress,
  onAddToCart,
  onRemove,
  onViewCart,
}: {
  product: Product;
  quantity: number;
  onPress: () => void;
  onAddToCart: () => void;
  onRemove: () => void;
  onViewCart: () => void;
}) {
  const [imageFailed, setImageFailed] =
    useState(false);

  const discount = calcDiscountPercent(
    product.mrp,
    product.price,
  );

  const isOutOfStock = product.stock <= 0;

  const confirmRemove = () => {
    Alert.alert(
      "Remove from Wishlist",
      `Remove ${product.name} from your wishlist?`,
      [
        {
          text: "Keep",
          style: "cancel",
        },
        {
          text: "Remove",
          style: "destructive",
          onPress: onRemove,
        },
      ],
    );
  };

  return (
    <View style={styles.productCard}>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        style={styles.productImageWrap}
        accessibilityRole="button"
        accessibilityLabel={`Open ${product.name} details`}
      >
        {!product.image || imageFailed ? (
          <View style={styles.imageFallback}>
            <Ionicons
              name="image-outline"
              size={32}
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
              styles.productImage,
              isOutOfStock &&
                styles.outOfStockImage,
            ]}
            contentFit="contain"
            transition={180}
            cachePolicy="memory-disk"
            recyclingKey={String(product.id)}
            onError={() => setImageFailed(true)}
          />
        )}

        {discount > 0 && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>
              {discount}% OFF
            </Text>
          </View>
        )}
      </TouchableOpacity>

      <View style={styles.productContent}>
        <View style={styles.productTopRow}>
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={onPress}
            style={styles.productNameWrap}
            accessibilityRole="button"
            accessibilityLabel={`Open ${product.name} details`}
          >
            <Text
              style={styles.productName}
              numberOfLines={2}
            >
              {product.name}
            </Text>

            <Text style={styles.productSize}>
              {product.size}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.75}
            style={styles.removeButton}
            onPress={confirmRemove}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${product.name} from wishlist`}
          >
            <Ionicons
              name="heart"
              size={21}
              color={COLORS.danger}
            />
          </TouchableOpacity>
        </View>

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
          <View style={styles.outOfStockBox}>
            <Ionicons
              name="alert-circle-outline"
              size={17}
              color={COLORS.danger}
            />

            <Text style={styles.outOfStockText}>
              Currently out of stock
            </Text>
          </View>
        ) : quantity > 0 ? (
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.viewCartButton}
            onPress={onViewCart}
            accessibilityRole="button"
            accessibilityLabel={`View cart with ${quantity} ${product.name}`}
          >
            <Ionicons
              name="checkmark-circle"
              size={18}
              color={COLORS.textOnPrimary}
            />

            <Text style={styles.viewCartText}>
              In Cart ({quantity}) · View Cart
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.addButton}
            onPress={onAddToCart}
            accessibilityRole="button"
            accessibilityLabel={`Add ${product.name} to cart`}
          >
            <Ionicons
              name="cart-outline"
              size={19}
              color={COLORS.textOnPrimary}
            />

            <Text style={styles.addButtonText}>
              Add to Cart
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  listContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxxl,
  },

  separator: {
    height: SPACING.md,
  },

  infoBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    marginBottom: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.dangerLight,
  },

  infoIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.background,
  },

  infoContent: {
    flex: 1,
  },

  infoTitle: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },

  infoText: {
    marginTop: 3,
    fontSize: FONT.size.xs,
    lineHeight: 17,
    color: COLORS.textSecondary,
  },

  productCard: {
    flexDirection: "row",
    gap: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    backgroundColor: COLORS.background,
    ...SHADOW.card,
  },

  productImageWrap: {
    position: "relative",
    width: 112,
    height: 112,
    overflow: "hidden",
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surface,
  },

  productImage: {
    width: "86%",
    height: "86%",
  },

  outOfStockImage: {
    opacity: 0.45,
  },

  imageFallback: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING.sm,
  },

  imageFallbackText: {
    marginTop: 4,
    fontSize: 9,
    textAlign: "center",
    color: COLORS.textMuted,
  },

  discountBadge: {
    position: "absolute",
    top: 7,
    left: 7,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primary,
  },

  discountText: {
    fontSize: 9,
    fontWeight: FONT.weight.bold,
    color: COLORS.textOnPrimary,
  },

  productContent: {
    flex: 1,
    minWidth: 0,
  },

  productTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: SPACING.sm,
  },

  productNameWrap: {
    flex: 1,
  },

  productName: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.bold,
    lineHeight: 19,
    color: COLORS.textPrimary,
  },

  productSize: {
    marginTop: 4,
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
  },

  removeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.dangerLight,
  },

  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 7,
    marginTop: SPACING.sm,
  },

  price: {
    fontSize: FONT.size.lg,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },

  mrp: {
    fontSize: FONT.size.sm,
    textDecorationLine: "line-through",
    color: COLORS.textMuted,
  },

  addButton: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
  },

  addButtonText: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.bold,
    color: COLORS.textOnPrimary,
  },

  viewCartButton: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
  },

  viewCartText: {
    fontSize: FONT.size.xs,
    fontWeight: FONT.weight.bold,
    color: COLORS.textOnPrimary,
  },

  outOfStockBox: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.dangerLight,
  },

  outOfStockText: {
    fontSize: FONT.size.xs,
    fontWeight: FONT.weight.semibold,
    color: COLORS.danger,
  },


  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.xxl,
  },

  loadingTitle: {
    marginTop: SPACING.md,
    fontSize: FONT.size.lg,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },

  loadingText: {
    marginTop: SPACING.sm,
    maxWidth: 290,
    textAlign: "center",
    fontSize: FONT.size.sm,
    lineHeight: 20,
    color: COLORS.textSecondary,
  },
});