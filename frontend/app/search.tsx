import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { EmptyState } from "@/src/components/EmptyState";
import { ProductCard } from "@/src/components/ProductCard";
import { useToast } from "@/src/components/Toast";
import { COLORS, FONT, RADIUS, SPACING } from "@/src/config/theme";
import { useApp } from "@/src/context/AppContext";
import { PRODUCTS, searchProducts } from "@/src/data/products";
import type { Product } from "@/src/types";

export default function SearchScreen() {
  const router = useRouter();
  const { recentSearches, addRecentSearch, clearRecentSearches, addToCart, updateQuantity, getQuantity } = useApp();
  const { showToast } = useToast();
  const [query, setQuery] = useState("");

  const results = useMemo(() => (query.trim() ? searchProducts(query) : []), [query]);
  const suggestions = useMemo(() => PRODUCTS.filter((p) => p.isPopular || p.isFeatured).slice(0, 6), []);

  const commit = (q: string) => {
    setQuery(q);
    if (q.trim()) addRecentSearch(q.trim());
  };

  const goProduct = (p: Product) => router.push({ pathname: "/product/[id]", params: { id: p.id } });

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.searchWrap}>
        <TouchableOpacity onPress={() => router.back()} testID="search-back">
          <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={COLORS.textSecondary} />
          <TextInput
            autoFocus
            placeholder="Search products, categories…"
            placeholderTextColor={COLORS.textMuted}
            style={styles.input}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => commit(query)}
            returnKeyType="search"
            testID="search-input"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery("")} testID="search-clear">
              <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {query.trim() ? (
        results.length === 0 ? (
          <EmptyState icon="search-outline" title={`No results for “${query}”`} description="Try a different keyword or explore categories." />
        ) : (
          <FlatList
            data={results}
            keyExtractor={(p) => p.id}
            keyboardShouldPersistTaps="handled"
            onScrollBeginDrag={Keyboard.dismiss}
            numColumns={2}
            columnWrapperStyle={{ gap: SPACING.md }}
            contentContainerStyle={styles.grid}
            ItemSeparatorComponent={() => <View style={{ height: SPACING.md }} />}
            renderItem={({ item }) => (
              <View style={{ flex: 1 }}>
                <ProductCard
                  product={item}
                  quantity={getQuantity(item.id)}
                  onPress={() => { commit(query); goProduct(item); }}
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
        )
      ) : (
        <FlatList
          data={[]}
          keyExtractor={(_, i) => `l${i}`}
          renderItem={() => null}
          ListHeaderComponent={
            <View style={{ padding: SPACING.md }}>
              {recentSearches.length > 0 && (
                <View style={{ marginBottom: SPACING.xl }}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Recent searches</Text>
                    <TouchableOpacity onPress={clearRecentSearches} testID="clear-recent">
                      <Text style={styles.link}>Clear</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.chips}>
                    {recentSearches.map((q) => (
                      <TouchableOpacity
                        key={q}
                        style={styles.chip}
                        onPress={() => commit(q)}
                        testID={`recent-${q}`}
                      >
                        <Ionicons name="time-outline" size={14} color={COLORS.textSecondary} />
                        <Text style={styles.chipText}>{q}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
              <Text style={styles.sectionTitle}>Suggested for you</Text>
              <View style={styles.suggestGrid}>
                {suggestions.map((p) => (
                  <View key={p.id} style={{ width: "48%" }}>
                    <ProductCard
                      product={p}
                      quantity={getQuantity(p.id)}
                      onPress={() => goProduct(p)}
                      onAdd={() => {
                        const r = addToCart(p.id, 1);
                        if (!r.ok) showToast(r.message ?? "Unable to add", "error");
                        else showToast("Added to cart", "success");
                      }}
                      onIncrement={() => updateQuantity(p.id, getQuantity(p.id) + 1)}
                      onDecrement={() => updateQuantity(p.id, getQuantity(p.id) - 1)}
                    />
                  </View>
                ))}
              </View>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
  },
  input: { flex: 1, fontSize: FONT.size.base, color: COLORS.textPrimary, padding: 0 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: SPACING.md },
  sectionTitle: { fontSize: FONT.size.md, fontWeight: FONT.weight.bold, color: COLORS.textPrimary },
  link: { color: COLORS.primary, fontWeight: FONT.weight.semibold, fontSize: FONT.size.sm },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm },
  chip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: SPACING.md, paddingVertical: 6,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.pill,
    borderWidth: 1, borderColor: COLORS.borderLight,
  },
  chipText: { color: COLORS.textPrimary, fontSize: FONT.size.sm, fontWeight: FONT.weight.medium },
  suggestGrid: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.md, marginTop: SPACING.md },
  grid: { padding: SPACING.md },
});
