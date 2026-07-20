import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/src/components/Button";
import { EmptyState } from "@/src/components/EmptyState";
import { ProductCard } from "@/src/components/ProductCard";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { StatusPill } from "@/src/components/StatusPill";
import { useToast } from "@/src/components/Toast";
import { COLORS, FONT, RADIUS, SHADOW, SPACING } from "@/src/config/theme";
import { useApp } from "@/src/context/AppContext";
import { getCategoryById } from "@/src/data/categories";
import { PRODUCTS, getProductById } from "@/src/data/products";
import { calcDiscountPercent, formatCurrency } from "@/src/utils/format";

export default function ProductDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const product = getProductById(id || "");
  const { addToCart, updateQuantity, getQuantity, cartCount } = useApp();
  const { showToast } = useToast();

  if (!product) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
        <ScreenHeader title="Product" />
        <EmptyState icon="alert-circle-outline" title="Product not found" description="This product may have been removed." />
      </SafeAreaView>
    );
  }

  const qty = getQuantity(product.id);
  const discount = calcDiscountPercent(product.mrp, product.price);
  const isOOS = product.stock <= 0;
  const category = getCategoryById(product.category);
  const similar = PRODUCTS.filter((p) => p.category === product.category && p.id !== product.id).slice(0, 6);

  const handleAdd = () => {
    const r = addToCart(product.id, 1);
    if (!r.ok) showToast(r.message ?? "Unable to add", "error");
    else showToast("Added to cart", "success");
  };
  const handleBuyNow = () => {
    if (qty === 0) {
      const r = addToCart(product.id, 1);
      if (!r.ok) return showToast(r.message ?? "Unable to add", "error");
    }
    router.push("/checkout");
  };

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScreenHeader
        title={category?.name || "Product"}
        rightIcon="cart-outline"
        onRightPress={() => router.push("/(tabs)/cart")}
        rightBadge={cartCount}
      />
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <View style={styles.imgWrap}>
          <Image source={{ uri: product.image }} style={styles.image} contentFit="contain" />
          {discount > 0 && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>{discount}% OFF</Text>
            </View>
          )}
        </View>

        <View style={styles.info}>
          <Text style={styles.name}>{product.name}</Text>
          <Text style={styles.size}>{product.size}</Text>

          <View style={styles.priceRow}>
            <Text style={styles.price}>{formatCurrency(product.price)}</Text>
            {product.mrp > product.price && (
              <>
                <Text style={styles.mrp}>{formatCurrency(product.mrp)}</Text>
                <View style={styles.savePill}>
                  <Text style={styles.saveText}>Save {formatCurrency(product.mrp - product.price)}</Text>
                </View>
              </>
            )}
          </View>

          <View style={{ flexDirection: "row", gap: SPACING.sm, marginTop: SPACING.sm }}>
            {isOOS ? (
              <StatusPill label="Out of stock" tone="danger" />
            ) : product.stock <= 5 ? (
              <StatusPill label={`Only ${product.stock} left`} tone="warning" />
            ) : (
              <StatusPill label="In stock" tone="success" />
            )}
            <StatusPill label="Delivery in 30 mins" tone="info" />
          </View>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>About this product</Text>
          <Text style={styles.description}>{product.description}</Text>

          {similar.length > 0 && (
            <>
              <View style={styles.divider} />
              <Text style={styles.sectionTitle}>Similar products</Text>
              <FlatList
                data={similar}
                keyExtractor={(p) => p.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: SPACING.md, paddingTop: SPACING.sm, paddingBottom: SPACING.sm }}
                renderItem={({ item }) => (
                  <View style={{ width: 160 }}>
                    <ProductCard
                      product={item}
                      quantity={getQuantity(item.id)}
                      onPress={() => router.push({ pathname: "/product/[id]", params: { id: item.id } })}
                      onAdd={() => {
                        const r = addToCart(item.id, 1);
                        if (!r.ok) showToast(r.message ?? "Unable to add", "error");
                        else showToast("Added to cart", "success");
                      }}
                      onIncrement={() => updateQuantity(item.id, getQuantity(item.id) + 1)}
                      onDecrement={() => updateQuantity(item.id, getQuantity(item.id) - 1)}
                    />
                  </View>
                )}
              />
            </>
          )}
        </View>
      </ScrollView>

      {/* Bottom action bar */}
      <View style={styles.bottomBar}>
        {isOOS ? (
          <Button label="Notify Me" onPress={() => showToast("We'll notify you when it's back in stock", "info")} fullWidth size="lg" variant="outline" testID="notify-me" />
        ) : qty > 0 ? (
          <>
            <View style={styles.stepper}>
              <TouchableOpacity style={styles.stepBtn} onPress={() => updateQuantity(product.id, qty - 1)} testID="pd-dec">
                <Ionicons name="remove" size={20} color={COLORS.textOnPrimary} />
              </TouchableOpacity>
              <Text style={styles.stepQty}>{qty}</Text>
              <TouchableOpacity
                style={styles.stepBtn}
                onPress={() => {
                  const r = updateQuantity(product.id, qty + 1);
                  if (!r.ok) showToast(r.message ?? "Reached stock limit", "error");
                }}
                testID="pd-inc"
              >
                <Ionicons name="add" size={20} color={COLORS.textOnPrimary} />
              </TouchableOpacity>
            </View>
            <Button label="Go to Cart" onPress={() => router.push("/(tabs)/cart")} size="lg" style={{ flex: 1 }} testID="pd-go-cart" />
          </>
        ) : (
          <>
            <Button label="Add to Cart" onPress={handleAdd} size="lg" variant="outline" style={{ flex: 1 }} testID="pd-add-to-cart" />
            <Button label="Buy Now" onPress={handleBuyNow} size="lg" style={{ flex: 1 }} testID="pd-buy-now" />
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  imgWrap: {
    height: 320,
    backgroundColor: COLORS.surface,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  image: { width: "80%", height: "80%" },
  discountBadge: {
    position: "absolute",
    top: SPACING.md,
    left: SPACING.md,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
  },
  discountText: { color: COLORS.textOnPrimary, fontWeight: FONT.weight.bold },
  info: { padding: SPACING.lg, gap: 4 },
  name: { fontSize: FONT.size.xxl, fontWeight: FONT.weight.bold, color: COLORS.textPrimary },
  size: { fontSize: FONT.size.md, color: COLORS.textSecondary, marginBottom: SPACING.sm },
  priceRow: { flexDirection: "row", alignItems: "center", gap: SPACING.sm, flexWrap: "wrap" },
  price: { fontSize: FONT.size.xxl, fontWeight: FONT.weight.bold, color: COLORS.textPrimary },
  mrp: { fontSize: FONT.size.md, color: COLORS.textMuted, textDecorationLine: "line-through" },
  savePill: {
    paddingHorizontal: SPACING.sm, paddingVertical: 4,
    backgroundColor: COLORS.primaryLight, borderRadius: RADIUS.pill,
  },
  saveText: { color: COLORS.primaryDark, fontWeight: FONT.weight.bold, fontSize: FONT.size.xs },
  divider: { height: 1, backgroundColor: COLORS.borderLight, marginVertical: SPACING.lg },
  sectionTitle: { fontSize: FONT.size.lg, fontWeight: FONT.weight.bold, color: COLORS.textPrimary, marginBottom: SPACING.sm },
  description: { fontSize: FONT.size.md, color: COLORS.textSecondary, lineHeight: 22 },

  bottomBar: {
    position: "absolute",
    left: 0, right: 0, bottom: 0,
    flexDirection: "row",
    gap: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    ...SHADOW.header,
  },
  stepper: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md, paddingHorizontal: SPACING.sm,
    gap: SPACING.sm,
  },
  stepBtn: { width: 32, height: 32, justifyContent: "center", alignItems: "center" },
  stepQty: { color: COLORS.textOnPrimary, fontWeight: FONT.weight.bold, fontSize: FONT.size.lg, minWidth: 20, textAlign: "center" },
});
