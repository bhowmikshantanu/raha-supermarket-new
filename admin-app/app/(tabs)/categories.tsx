import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
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
import {
  FirebaseCategory,
  subscribeToFirebaseCategories,
} from "@/src/services/firebaseCategories";
import type { Category } from "@/src/types";

export default function CategoriesScreen() {
  const router = useRouter();

  const {
    products,
    loading: productsLoading,
  } = useProducts();

  const [firebaseCategories, setFirebaseCategories] = useState<
    FirebaseCategory[]
  >([]);
  const [categoriesLoading, setCategoriesLoading] =
    useState(true);
  const [categoriesError, setCategoriesError] =
    useState<string | null>(null);

  useEffect(() => {
    const unsubscribe =
      subscribeToFirebaseCategories(
        (categories) => {
          setFirebaseCategories(categories);
          setCategoriesError(null);
          setCategoriesLoading(false);
        },
        (error) => {
          console.error(
            "[Customer Categories] Unable to load categories:",
            error,
          );

          setCategoriesError(
            "Unable to load categories right now.",
          );
          setCategoriesLoading(false);
        },
      );

    return unsubscribe;
  }, []);

  const categories = useMemo<Category[]>(
    () =>
      firebaseCategories
        .filter((category) => category.active)
        .sort(
          (a, b) =>
            a.sortOrder - b.sortOrder ||
            a.name.localeCompare(b.name),
        )
        .map((category) => ({
          id: category.id,
          name: category.name,
          image:
            category.image ??
            "https://images.pexels.com/photos/264636/pexels-photo-264636.jpeg?auto=compress&cs=tinysrgb&w=400",
          color: COLORS.surface,
          icon: category.icon ?? "grid-outline",
        })),
    [firebaseCategories],
  );

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

        {categoriesLoading || productsLoading ? (
          <Text style={styles.syncText}>
            Syncing live categories and products…
          </Text>
        ) : categoriesError ? (
          <Text style={styles.errorText}>
            {categoriesError}
          </Text>
        ) : (
          <Text style={styles.syncText}>
            {categories.length} active categor
            {categories.length === 1 ? "y" : "ies"} •{" "}
            {products.length} live product
            {products.length === 1 ? "" : "s"} available
          </Text>
        )}
      </View>

      <FlatList
        data={categories}
        keyExtractor={(category) => category.id}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        columnWrapperStyle={styles.columnWrapper}
        ItemSeparatorComponent={() => (
          <View style={styles.separator} />
        )}
        ListEmptyComponent={
          !categoriesLoading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>
                No categories available
              </Text>

              <Text style={styles.emptyText}>
                Active categories added from the admin panel
                will appear here automatically.
              </Text>
            </View>
          ) : null
        }
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

  errorText: {
    marginTop: 4,
    color: COLORS.danger,
    fontSize: FONT.size.xs,
    fontWeight: FONT.weight.medium,
  },

  list: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xxl,
    flexGrow: 1,
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

  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.xl,
  },

  emptyTitle: {
    fontSize: FONT.size.lg,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
    textAlign: "center",
  },

  emptyText: {
    marginTop: SPACING.sm,
    fontSize: FONT.size.sm,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
});
