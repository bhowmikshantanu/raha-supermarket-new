import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { EmptyState } from "@/src/components/EmptyState";
import { ProductCard } from "@/src/components/ProductCard";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { useToast } from "@/src/components/Toast";
import { COLORS, FONT, RADIUS, SPACING } from "@/src/config/theme";
import { useApp } from "@/src/context/AppContext";
import { CATEGORIES, getCategoryById } from "@/src/data/categories";
import { PRODUCTS } from "@/src/data/products";
import type { CategoryId, Product } from "@/src/types";

type SortKey = "relevance" | "price-low" | "price-high" | "discount";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "relevance", label: "Recommended" },
  { key: "price-low", label: "Price: Low to High" },
  { key: "price-high", label: "Price: High to Low" },
  { key: "discount", label: "Discount: High to Low" },
];

export default function ProductListing() {
  const router = useRouter();
  const { category } = useLocalSearchParams<{ category?: string }>();
  const { addToCart, updateQuantity, getQuantity, cartCount } = useApp();
  const { showToast } = useToast();

  const [activeCat, setActiveCat] = useState<CategoryId | "all">((category as CategoryId) || "all");
  const [sort, setSort] = useState<SortKey>("relevance");
  const [layout, setLayout] = useState<"grid" | "list">("grid");
  const [inStockOnly, setInStockOnly] = useState(false);

  const products: Product[] = useMemo(() => {
    let list = PRODUCTS.slice();
    if (activeCat !== "all") list = list.filter((p) => p.category === activeCat);
    if (inStockOnly) list = list.filter((p) => p.stock > 0);
    switch (sort) {
      case "price-low": list.sort((a, b) => a.price - b.price); break;
      case "price-high": list.sort((a, b) => b.price - a.price); break;
      case "discount":
        list.sort((a, b) => (b.mrp - b.price) / b.mrp - (a.mrp - a.price) / a.mrp);
        break;
      default: break;
    }
    return list;
  }, [activeCat, sort, inStockOnly]);

  const handleAdd = (p: Product) => {
    const r = addToCart(p.id, 1);
    if (!r.ok) showToast(r.message ?? "Unable to add", "error");
    else showToast(`${p.name} added`, "success");
  };

  const cat = activeCat !== "all" ? getCategoryById(activeCat) : null;
  const title = cat ? cat.name : "All Products";

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScreenHeader
        title={title}
        subtitle={`${products.length} products`}
        rightIcon="cart-outline"
        onRightPress={() => router.push("/(tabs)/cart")}
        rightBadge={cartCount}
      />

      {/* Category chips */}
      <View style={styles.chipsRow}>
        <FlatList
          data={[{ id: "all", name: "All", color: COLORS.surface } as { id: string; name: string; color: string }, ...CATEGORIES]}
          keyExtractor={(c) => c.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsList}
          renderItem={({ item }) => {
            const active = activeCat === item.id;
            return (
              <TouchableOpacity
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setActiveCat(item.id as CategoryId | "all")}
                testID={`chip-${item.id}`}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{item.name}</Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Sort/filter toolbar */}
      <View style={styles.toolbar}>
        <TouchableOpacity
          style={styles.toolbarBtn}
          onPress={() => {
            const idx = SORT_OPTIONS.findIndex((o) => o.key === sort);
            setSort(SORT_OPTIONS[(idx + 1) % SORT_OPTIONS.length].key);
          }}
          testID="sort-toggle"
        >
          <Ionicons name="swap-vertical" size={16} color={COLORS.textPrimary} />
          <Text style={styles.toolbarText}>{SORT_OPTIONS.find((o) => o.key === sort)?.label}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toolbarBtn, inStockOnly && styles.toolbarBtnActive]}
          onPress={() => setInStockOnly((v) => !v)}
          testID="filter-instock"
        >
          <Ionicons name="checkmark-circle-outline" size={16} color={inStockOnly ? COLORS.primary : COLORS.textPrimary} />
          <Text style={[styles.toolbarText, inStockOnly && { color: COLORS.primary }]}>In stock</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.toolbarLayout}
          onPress={() => setLayout((l) => (l === "grid" ? "list" : "grid"))}
          testID="layout-toggle"
        >
          <Ionicons name={layout === "grid" ? "list" : "grid"} size={18} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>

      {products.length === 0 ? (
        <EmptyState icon="cube-outline" title="No products found" description="Try adjusting filters or explore other categories." />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(p) => p.id}
          key={layout}
          numColumns={layout === "grid" ? 2 : 1}
          columnWrapperStyle={layout === "grid" ? { gap: SPACING.md } : undefined}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: SPACING.md }} />}
          renderItem={({ item }) => (
            <View style={layout === "grid" ? { flex: 1 } : undefined}>
              <ProductCard
                product={item}
                quantity={getQuantity(item.id)}
                onPress={() => router.push({ pathname: "/product/[id]", params: { id: item.id } })}
                onAdd={() => handleAdd(item)}
                onIncrement={() => updateQuantity(item.id, getQuantity(item.id) + 1)}
                onDecrement={() => updateQuantity(item.id, getQuantity(item.id) - 1)}
                layout={layout}
              />
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  chipsRow: {
    backgroundColor: COLORS.background,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  chipsList: { paddingHorizontal: SPACING.md, gap: SPACING.sm },
  chip: {
    paddingHorizontal: SPACING.md,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: FONT.size.sm, color: COLORS.textPrimary, fontWeight: FONT.weight.semibold },
  chipTextActive: { color: COLORS.textOnPrimary },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    padding: SPACING.md,
  },
  toolbarBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    backgroundColor: COLORS.background,
  },
  toolbarBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  toolbarText: { fontSize: FONT.size.sm, color: COLORS.textPrimary, fontWeight: FONT.weight.semibold },
  toolbarLayout: {
    marginLeft: "auto",
    width: 40, height: 36, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.borderLight,
    justifyContent: "center", alignItems: "center",
  },
  list: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.xxxl },
});
