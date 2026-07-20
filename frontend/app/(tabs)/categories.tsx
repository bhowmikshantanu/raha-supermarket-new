import { useRouter } from "expo-router";
import React from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CategoryTile } from "@/src/components/CategoryTile";
import { COLORS, FONT, SPACING } from "@/src/config/theme";
import { CATEGORIES } from "@/src/data/categories";
import { getProductsByCategory } from "@/src/data/products";

export default function CategoriesScreen() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Categories</Text>
        <Text style={styles.subtitle}>Discover essentials across all categories</Text>
      </View>
      <FlatList
        data={CATEGORIES}
        keyExtractor={(c) => c.id}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        columnWrapperStyle={{ gap: SPACING.md }}
        ItemSeparatorComponent={() => <View style={{ height: SPACING.md }} />}
        renderItem={({ item }) => {
          const count = getProductsByCategory(item.id).length;
          return (
            <View style={styles.cell}>
              <CategoryTile
                category={item}
                onPress={() => router.push({ pathname: "/products", params: { category: item.id } })}
              />
              <Text style={styles.count}>{count} {count === 1 ? "item" : "items"}</Text>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
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
  subtitle: { color: COLORS.textSecondary, fontSize: FONT.size.md },
  list: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.xxl },
  cell: { flex: 1, gap: 4 },
  count: {
    fontSize: FONT.size.xs,
    color: COLORS.textMuted,
    textAlign: "center",
    fontWeight: FONT.weight.medium,
  },
});
