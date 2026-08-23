import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CategoryTile } from "@/src/components/CategoryTile";
import {
  COLORS,
  FONT,
  SPACING,
} from "@/src/config/theme";
import { useProducts } from "@/src/context/ProductContext";
import { CATEGORIES } from "@/src/data/categories";

export default function CategoriesScreen() {
  const router = useRouter();

  const {
    products,
    loading: productsLoading,
  } = useProducts();

  const productCountByCategory = useMemo(() => {
    const counts = new Map<string, number>();

    for (const product of products) {
      counts.set(
        product.category,
        (counts.get(product.category) ?? 0) + 1,
      );
    }

    return counts;
  }, [products]);

  return (
    <SafeAreaView
      style={styles.container}
      edges={["top"]}
    >
      <View style={styles.header}>
        <Text style={styles.title}>
          Categories
        </Text>

        <Text style={styles.subtitle}>
          Discover essentials across all categories
        </Text>

        {productsLoading ? (
          <Text style={styles.syncText}>
            Syncing live products…
          </Text>
        ) : (
          <Text style={styles.syncText}>
            {products.length} live product
            {products.length === 1 ? "" : "s"} available
          </Text>
        )}
      </View>

      <FlatList
        data={CATEGORIES}
        keyExtractor={(category) => category.id}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        columnWrapperStyle={styles.columnWrapper}
        ItemSeparatorComponent={() => (
          <View style={styles.separator} />
        )}
        renderItem={({ item }) => {
          const count =
            productCountByCategory.get(item.id) ?? 0;

          return (
            <View style={styles.cell}>
              <CategoryTile
                category={item}
                onPress={() =>
                  router.push({
                    pathname: "/products",
                    params: {
                      category: item.id,
                    },
                  })
                }
              />

              <Text style={styles.count}>
                {productsLoading
                  ? "Loading…"
                  : `${count} ${
                      count === 1 ? "item" : "items"
                    }`}
              </Text>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  header: {
    padding: SPACING.lg,
    paddingBottom: SPACING.md,
    gap: 4,
  },

  title: {
    fontSize: FONT.size.xxl,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },

  subtitle: {
    color: COLORS.textSecondary,
    fontSize: FONT.size.md,
  },

  syncText: {
    marginTop: 4,
    color: COLORS.primary,
    fontSize: FONT.size.xs,
    fontWeight: FONT.weight.medium,
  },

  list: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xxl,
  },

  columnWrapper: {
    gap: SPACING.md,
  },

  separator: {
    height: SPACING.md,
  },

  cell: {
    flex: 1,
    gap: 4,
  },

  count: {
    fontSize: FONT.size.xs,
    color: COLORS.textMuted,
    textAlign: "center",
    fontWeight: FONT.weight.medium,
  },
});