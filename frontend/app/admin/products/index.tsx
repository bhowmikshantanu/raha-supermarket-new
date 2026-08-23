import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { deleteDoc, doc } from "firebase/firestore";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/src/components/Button";
import { EmptyState } from "@/src/components/EmptyState";
import { useToast } from "@/src/components/Toast";
import { db } from "@/src/config/firebase";
import {
  COLORS,
  FONT,
  RADIUS,
  SHADOW,
  SPACING,
} from "@/src/config/theme";
import { useProducts } from "@/src/context/ProductContext";
import { CATEGORIES } from "@/src/data/categories";
import type { CategoryId, Product } from "@/src/types";
import {
  calcDiscountPercent,
  formatCurrency,
} from "@/src/utils/format";

type StockFilter = "all" | "in-stock" | "low-stock" | "out-of-stock";
type CategoryFilter = CategoryId | "all";

const STOCK_FILTERS: {
  id: StockFilter;
  label: string;
}[] = [
  { id: "all", label: "All" },
  { id: "in-stock", label: "In stock" },
  { id: "low-stock", label: "Low stock" },
  { id: "out-of-stock", label: "Out of stock" },
];

export default function AdminProductsScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const { products, loading } = useProducts();

  const [query, setQuery] = useState("");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [categoryFilter, setCategoryFilter] =
    useState<CategoryFilter>("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return products
      .filter((product) => {
        if (!normalizedQuery) {
          return true;
        }

        return [
          product.name,
          product.category,
          product.size,
          product.description,
          product.id,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      })
      .filter((product) => {
        if (categoryFilter === "all") {
          return true;
        }

        return product.category === categoryFilter;
      })
      .filter((product) => {
        switch (stockFilter) {
          case "in-stock":
            return product.stock > 5;
          case "low-stock":
            return product.stock > 0 && product.stock <= 5;
          case "out-of-stock":
            return product.stock <= 0;
          default:
            return true;
        }
      })
      .sort((first, second) =>
        first.name.localeCompare(second.name),
      );
  }, [products, query, categoryFilter, stockFilter]);

  const stats = useMemo(() => {
    const lowStock = products.filter(
      (product) => product.stock > 0 && product.stock <= 5,
    ).length;

    const outOfStock = products.filter(
      (product) => product.stock <= 0,
    ).length;

    return {
      total: products.length,
      lowStock,
      outOfStock,
    };
  }, [products]);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 700);
  };

  const confirmDelete = (product: Product) => {
    Alert.alert(
      "Delete product?",
      `${product.name} will be permanently removed from Firestore and the customer app.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            void handleDelete(product);
          },
        },
      ],
    );
  };

  const handleDelete = async (product: Product) => {
    if (deletingId) {
      return;
    }

    setDeletingId(product.id);

    try {
      await deleteDoc(doc(db, "products", product.id));
      showToast(`${product.name} deleted`, "success");
    } catch (error) {
      console.error("Product delete failed:", error);
      showToast(
        "Unable to delete product. Check admin login and Firestore rules.",
        "error",
      );
    } finally {
      setDeletingId(null);
    }
  };

  const clearFilters = () => {
    setQuery("");
    setStockFilter("all");
    setCategoryFilter("all");
  };

  const hasActiveFilters =
    Boolean(query.trim()) ||
    stockFilter !== "all" ||
    categoryFilter !== "all";

  return (
    <SafeAreaView
      style={styles.container}
      edges={["top", "bottom"]}
    >
      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.headerButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons
            name="chevron-back"
            size={24}
            color={COLORS.textPrimary}
          />
        </TouchableOpacity>

        <View style={styles.headerContent}>
          <Text style={styles.title}>Product Management</Text>
          <Text style={styles.subtitle}>
            {loading
              ? "Syncing live products…"
              : `${products.length} live ${
                  products.length === 1 ? "product" : "products"
                }`}
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.addButton}
          onPress={() => router.push("/admin/products/new")}
          accessibilityRole="button"
          accessibilityLabel="Add product"
        >
          <Ionicons
            name="add"
            size={25}
            color={COLORS.textOnPrimary}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.overviewRow}>
        <OverviewCard
          label="Total"
          value={loading ? "—" : String(stats.total)}
          icon="cube-outline"
        />
        <OverviewCard
          label="Low stock"
          value={loading ? "—" : String(stats.lowStock)}
          icon="alert-circle-outline"
          warning
        />
        <OverviewCard
          label="Out of stock"
          value={loading ? "—" : String(stats.outOfStock)}
          icon="close-circle-outline"
          danger
        />
      </View>

      <View style={styles.searchWrap}>
        <Ionicons
          name="search-outline"
          size={20}
          color={COLORS.textSecondary}
        />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search name, category or product ID"
          placeholderTextColor={COLORS.textMuted}
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {query ? (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setQuery("")}
          >
            <Ionicons
              name="close-circle"
              size={21}
              color={COLORS.textMuted}
            />
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.filtersArea}>
        <FlatList
          horizontal
          data={STOCK_FILTERS}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
          renderItem={({ item }) => {
            const active = stockFilter === item.id;
            return (
              <TouchableOpacity
                activeOpacity={0.82}
                style={[
                  styles.filterChip,
                  active && styles.filterChipActive,
                ]}
                onPress={() => setStockFilter(item.id)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    active && styles.filterChipTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />

        <FlatList
          horizontal
          data={[
            { id: "all", name: "All categories" },
            ...CATEGORIES.map((category) => ({
              id: category.id,
              name: category.name,
            })),
          ]}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryList}
          renderItem={({ item }) => {
            const active = categoryFilter === item.id;
            return (
              <TouchableOpacity
                activeOpacity={0.82}
                style={[
                  styles.categoryChip,
                  active && styles.categoryChipActive,
                ]}
                onPress={() =>
                  setCategoryFilter(item.id as CategoryFilter)
                }
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    active && styles.categoryChipTextActive,
                  ]}
                >
                  {item.name}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <Ionicons
            name="cloud-download-outline"
            size={44}
            color={COLORS.primary}
          />
          <Text style={styles.loadingTitle}>
            Loading live products
          </Text>
          <Text style={styles.loadingText}>
            Fetching current prices and stock from Firestore.
          </Text>
        </View>
      ) : filteredProducts.length === 0 ? (
        <EmptyState
          icon="cube-outline"
          title="No products found"
          description={
            hasActiveFilters
              ? "Try changing or clearing the active filters."
              : "Add your first product to Raha Supermarket."
          }
        >
          <View style={styles.emptyActions}>
            {hasActiveFilters ? (
              <Button
                label="Clear Filters"
                variant="outline"
                onPress={clearFilters}
              />
            ) : null}
            <Button
              label="Add Product"
              onPress={() => router.push("/admin/products/new")}
              leftIcon={
                <Ionicons
                  name="add-circle-outline"
                  size={19}
                  color={COLORS.textOnPrimary}
                />
              }
            />
          </View>
        </EmptyState>
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          }
          ItemSeparatorComponent={() => (
            <View style={styles.separator} />
          )}
          ListHeaderComponent={
            <View style={styles.resultHeader}>
              <Text style={styles.resultText}>
                {filteredProducts.length} result
                {filteredProducts.length === 1 ? "" : "s"}
              </Text>
              {hasActiveFilters ? (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={clearFilters}
                >
                  <Text style={styles.clearText}>Clear filters</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          }
          renderItem={({ item }) => (
            <AdminProductCard
              product={item}
              deleting={deletingId === item.id}
              onEdit={() =>
                router.push({
                  pathname: "/admin/products/[id]",
                  params: { id: item.id },
                })
              }
              onDelete={() => confirmDelete(item)}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

function OverviewCard({
  label,
  value,
  icon,
  warning,
  danger,
}: {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  warning?: boolean;
  danger?: boolean;
}) {
  const accent = danger
    ? COLORS.danger
    : warning
      ? COLORS.warning
      : COLORS.primary;

  const background = danger
    ? COLORS.dangerLight
    : warning
      ? COLORS.warningLight
      : COLORS.primaryLight;

  return (
    <View style={styles.overviewCard}>
      <View
        style={[
          styles.overviewIcon,
          { backgroundColor: background },
        ]}
      >
        <Ionicons name={icon} size={18} color={accent} />
      </View>
      <Text style={styles.overviewValue}>{value}</Text>
      <Text style={styles.overviewLabel}>{label}</Text>
    </View>
  );
}

function AdminProductCard({
  product,
  deleting,
  onEdit,
  onDelete,
}: {
  product: Product;
  deleting: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const discount = calcDiscountPercent(
    product.mrp,
    product.price,
  );

  const outOfStock = product.stock <= 0;
  const lowStock = product.stock > 0 && product.stock <= 5;

  return (
    <View style={styles.productCard}>
      <View style={styles.imageWrap}>
        {product.image ? (
          <Image
            source={{ uri: product.image }}
            style={styles.image}
            contentFit="contain"
            transition={160}
          />
        ) : (
          <Ionicons
            name="image-outline"
            size={32}
            color={COLORS.textMuted}
          />
        )}

        {discount > 0 ? (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>
              {discount}% OFF
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>
          {product.name}
        </Text>
        <Text style={styles.productMeta} numberOfLines={1}>
          {product.size} · {product.category}
        </Text>
        <Text style={styles.productId} numberOfLines={1}>
          ID: {product.id}
        </Text>

        <View style={styles.priceRow}>
          <Text style={styles.price}>
            {formatCurrency(product.price)}
          </Text>
          {product.mrp > product.price ? (
            <Text style={styles.mrp}>
              {formatCurrency(product.mrp)}
            </Text>
          ) : null}
        </View>

        <View style={styles.statusRow}>
          <View
            style={[
              styles.stockBadge,
              outOfStock
                ? styles.outOfStockBadge
                : lowStock
                  ? styles.lowStockBadge
                  : styles.inStockBadge,
            ]}
          >
            <Ionicons
              name={
                outOfStock
                  ? "close-circle"
                  : lowStock
                    ? "alert-circle"
                    : "checkmark-circle"
              }
              size={14}
              color={
                outOfStock
                  ? COLORS.danger
                  : lowStock
                    ? "#B45309"
                    : COLORS.primary
              }
            />
            <Text
              style={[
                styles.stockText,
                outOfStock
                  ? styles.stockDanger
                  : lowStock
                    ? styles.stockWarning
                    : styles.stockSuccess,
              ]}
            >
              {outOfStock
                ? "Out of stock"
                : lowStock
                  ? `${product.stock} left`
                  : `${product.stock} in stock`}
            </Text>
          </View>

          {product.isFeatured ||
          product.isPopular ||
          product.isBestOffer ? (
            <View style={styles.visibilityBadge}>
              <Ionicons
                name="sparkles"
                size={13}
                color={COLORS.info}
              />
              <Text style={styles.visibilityText}>Promoted</Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.editButton}
          onPress={onEdit}
          accessibilityRole="button"
          accessibilityLabel={`Edit ${product.name}`}
        >
          <Ionicons
            name="create-outline"
            size={20}
            color={COLORS.primary}
          />
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          disabled={deleting}
          style={[
            styles.deleteButton,
            deleting && styles.disabledButton,
          ]}
          onPress={onDelete}
          accessibilityRole="button"
          accessibilityLabel={`Delete ${product.name}`}
        >
          <Ionicons
            name={deleting ? "hourglass-outline" : "trash-outline"}
            size={20}
            color={COLORS.danger}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    backgroundColor: COLORS.background,
    ...SHADOW.header,
  },
  headerButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surface,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: FONT.size.lg,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },
  subtitle: {
    marginTop: 2,
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    ...SHADOW.fab,
  },
  overviewRow: {
    flexDirection: "row",
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
  },
  overviewCard: {
    flex: 1,
    minHeight: 98,
    padding: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.background,
  },
  overviewIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  overviewValue: {
    marginTop: SPACING.sm,
    fontSize: FONT.size.lg,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },
  overviewLabel: {
    marginTop: 2,
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  searchWrap: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    backgroundColor: COLORS.surface,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 0,
    fontSize: FONT.size.base,
    color: COLORS.textPrimary,
  },
  filtersArea: {
    paddingVertical: SPACING.sm,
  },
  filterList: {
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  filterChip: {
    minHeight: 36,
    paddingHorizontal: SPACING.md,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.background,
  },
  filterChipActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: FONT.size.xs,
    fontWeight: FONT.weight.semibold,
    color: COLORS.textPrimary,
  },
  filterChipTextActive: {
    color: COLORS.textOnPrimary,
  },
  categoryList: {
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
  },
  categoryChip: {
    minHeight: 32,
    paddingHorizontal: SPACING.md,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surface,
  },
  categoryChipActive: {
    backgroundColor: COLORS.primaryLight,
  },
  categoryChipText: {
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
  },
  categoryChipTextActive: {
    fontWeight: FONT.weight.bold,
    color: COLORS.primary,
  },
  list: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xxxl,
  },
  separator: {
    height: SPACING.md,
  },
  resultHeader: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  resultText: {
    fontSize: FONT.size.xs,
    fontWeight: FONT.weight.semibold,
    color: COLORS.textSecondary,
  },
  clearText: {
    fontSize: FONT.size.xs,
    fontWeight: FONT.weight.bold,
    color: COLORS.primary,
  },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.xxl,
  },
  loadingTitle: {
    marginTop: SPACING.md,
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },
  loadingText: {
    marginTop: SPACING.sm,
    textAlign: "center",
    fontSize: FONT.size.sm,
    color: COLORS.textSecondary,
  },
  emptyActions: {
    marginTop: SPACING.sm,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: SPACING.sm,
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
  imageWrap: {
    width: 94,
    height: 104,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
  },
  image: {
    width: "88%",
    height: "88%",
  },
  discountBadge: {
    position: "absolute",
    top: 5,
    left: 5,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primary,
  },
  discountText: {
    fontSize: 9,
    fontWeight: FONT.weight.bold,
    color: COLORS.textOnPrimary,
  },
  productInfo: {
    flex: 1,
    minWidth: 0,
  },
  productName: {
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },
  productMeta: {
    marginTop: 4,
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
  },
  productId: {
    marginTop: 2,
    fontSize: 9,
    color: COLORS.textMuted,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 7,
  },
  price: {
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },
  mrp: {
    fontSize: FONT.size.xs,
    textDecorationLine: "line-through",
    color: COLORS.textMuted,
  },
  statusRow: {
    marginTop: 7,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 5,
  },
  stockBadge: {
    minHeight: 25,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    borderRadius: RADIUS.pill,
  },
  inStockBadge: {
    backgroundColor: COLORS.primaryLight,
  },
  lowStockBadge: {
    backgroundColor: COLORS.warningLight,
  },
  outOfStockBadge: {
    backgroundColor: COLORS.dangerLight,
  },
  stockText: {
    fontSize: 10,
    fontWeight: FONT.weight.semibold,
  },
  stockSuccess: {
    color: COLORS.primary,
  },
  stockWarning: {
    color: "#B45309",
  },
  stockDanger: {
    color: COLORS.danger,
  },
  visibilityBadge: {
    minHeight: 25,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.infoLight,
  },
  visibilityText: {
    fontSize: 10,
    fontWeight: FONT.weight.semibold,
    color: COLORS.info,
  },
  actions: {
    justifyContent: "space-between",
    alignItems: "center",
  },
  editButton: {
    width: 39,
    height: 39,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primaryLight,
  },
  deleteButton: {
    width: 39,
    height: 39,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.dangerLight,
  },
  disabledButton: {
    opacity: 0.45,
  },
});