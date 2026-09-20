import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
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
import {
  COLORS,
  FONT,
  RADIUS,
  SHADOW,
  SPACING,
} from "@/src/config/theme";
import { useProducts } from "@/src/context/ProductContext";
import {
  subscribeToFirebaseCategories,
  type FirebaseCategory,
} from "@/src/services/firebaseCategories";
import {
  checkProductRemovalSafety,
  deactivateProductSafely,
} from "@/src/services/firebaseProducts";
import type { Product } from "@/src/types";
import {
  calcDiscountPercent,
  formatCurrency,
} from "@/src/utils/format";

type StockFilter = "all" | "in-stock" | "low-stock" | "out-of-stock";
type CategoryFilter = string;

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
  const [categories, setCategories] = useState<FirebaseCategory[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeToFirebaseCategories(
      (items) => {
        setCategories(items);
      },
      (error) => {
        console.error("Unable to load categories:", error);
        showToast("Unable to load live categories.", "error");
      },
    );

    return unsubscribe;
  }, [showToast]);

  const visibleCategories = useMemo(
    () => categories.filter((category) => category.active),
    [categories],
  );

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

  const confirmDelete = async (product: Product) => {
    if (deletingId) {
      return;
    }

    setDeletingId(product.id);

    try {
      const safety = await checkProductRemovalSafety(product.id);

      if (!safety.ok) {
        if (safety.reason === "active-order") {
          const statusLabel = safety.status
            .replace(/-/g, " ")
            .replace(/\b\w/g, (letter) => letter.toUpperCase());

          showToast(
            `Cannot remove ${product.name}. Active order ${safety.orderId} is ${statusLabel}. Complete or cancel that order first.`,
            "error",
          );
          return;
        }

        if (safety.reason === "stock") {
          showToast(
            `Cannot remove ${product.name}. ${safety.stock} item(s) are still in stock. Set stock to 0 first.`,
            "error",
          );
          return;
        }

        showToast("This product no longer exists.", "error");
        return;
      }

      const message =
        `${product.name} has zero stock and no active orders.\n\n` +
        "Remove it from the live store? Order history will be preserved.";

      let confirmed = false;

      if (Platform.OS === "web") {
        confirmed = window.confirm(
          `Remove product?\n\n${message}`,
        );
      } else {
        confirmed = await new Promise<boolean>((resolve) => {
          Alert.alert(
            "Remove product?",
            message,
            [
              {
                text: "Cancel",
                style: "cancel",
                onPress: () => resolve(false),
              },
              {
                text: "Remove",
                style: "destructive",
                onPress: () => resolve(true),
              },
            ],
            {
              cancelable: true,
              onDismiss: () => resolve(false),
            },
          );
        });
      }

      if (!confirmed) {
        return;
      }

      await deactivateProductSafely(product.id);

      showToast(
        `${product.name} removed from live store`,
        "success",
      );
    } catch (error) {
      console.error("Product removal failed:", error);

      const message =
        error instanceof Error
          ? error.message
          : "";

      if (message.startsWith("ACTIVE_ORDER:")) {
        const [, orderId, status] = message.split(":");

        showToast(
          `Cannot remove product. Active order ${orderId} is ${status.replace(/-/g, " ")}. Complete or cancel it first.`,
          "error",
        );
      } else if (message.startsWith("STOCK:")) {
        const stock = message.split(":")[1];

        showToast(
          `Cannot remove product. ${stock} item(s) are still in stock. Set stock to 0 first.`,
          "error",
        );
      } else {
        showToast(
          "Unable to remove product. Please try again.",
          "error",
        );
      }
    } finally {
      setDeletingId(null);
    }
  };

  const handleDelete = (product: Product) => {
    void confirmDelete(product);
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

        <View style={styles.headerActions}>
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.bulkButton}
            onPress={() => router.push("/admin/products/bulk")}
            accessibilityRole="button"
            accessibilityLabel="Bulk import products"
          >
            <Ionicons
              name="cloud-upload-outline"
              size={20}
              color={COLORS.textOnPrimary}
            />
            <Text style={styles.bulkButtonText}>Bulk Import</Text>
          </TouchableOpacity>

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
            ...visibleCategories.map((category) => ({
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
                  setCategoryFilter(item.id)
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
          showsVerticalScrollIndicator={true}
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
    backgroundColor: "#F4F7FB",
  },

  /* ---------- HEADER ---------- */
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    shadowColor: "#0F172A",
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 21,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: -0.4,
  },
  subtitle: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: "500",
    color: "#64748B",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  bulkButton: {
    minHeight: 44,
    borderRadius: 13,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: "#102A43",
    shadowColor: "#102A43",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  bulkButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 12,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#D69E2E",
    shadowColor: "#D69E2E",
    shadowOpacity: 0.25,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },

  /* ---------- OVERVIEW ---------- */
  overviewRow: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: SPACING.md,
    paddingTop: 18,
  },
  overviewCard: {
    flex: 1,
    minHeight: 104,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    shadowColor: "#0F172A",
    shadowOpacity: 0.055,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  overviewIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  overviewValue: {
    marginTop: 10,
    fontSize: 22,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: -0.5,
  },
  overviewLabel: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
  },

  /* ---------- SEARCH ---------- */
  searchWrap: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    marginHorizontal: SPACING.md,
    marginTop: 16,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#DDE5EF",
    backgroundColor: "#FFFFFF",
    shadowColor: "#0F172A",
    shadowOpacity: 0.035,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 0,
    fontSize: FONT.size.base,
    color: "#0F172A",
  },

  /* ---------- FILTERS ---------- */
  filtersArea: {
    paddingVertical: 12,
  },
  filterList: {
    gap: 8,
    paddingHorizontal: SPACING.md,
  },
  filterChip: {
    minHeight: 37,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#DDE5EF",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
  },
  filterChipActive: {
    borderColor: "#102A43",
    backgroundColor: "#102A43",
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },
  filterChipTextActive: {
    color: "#FFFFFF",
  },
  categoryList: {
    gap: 8,
    paddingHorizontal: SPACING.md,
    paddingTop: 10,
  },
  categoryChip: {
    minHeight: 34,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
  },
  categoryChipActive: {
    borderColor: "#E0B341",
    backgroundColor: "#FFF7DF",
  },
  categoryChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
  },
  categoryChipTextActive: {
    fontWeight: "800",
    color: "#9A6700",
  },

  /* ---------- PRODUCT LIST ---------- */
  list: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xxxl,
  },
  separator: {
    height: 12,
  },
  resultHeader: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  resultText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
  },
  clearText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0F766E",
  },

  /* ---------- LOADING / EMPTY ---------- */
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.xxl,
  },
  loadingTitle: {
    marginTop: SPACING.md,
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
  },
  loadingText: {
    marginTop: SPACING.sm,
    textAlign: "center",
    fontSize: 13,
    color: "#64748B",
  },
  emptyActions: {
    marginTop: SPACING.sm,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: SPACING.sm,
  },

  /* ---------- PRODUCT CARD ---------- */
  productCard: {
    flexDirection: "row",
    gap: 16,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E1E8F0",
    backgroundColor: "#FFFFFF",
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  imageWrap: {
    width: 96,
    height: 106,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#E8EDF3",
    backgroundColor: "#F8FAFC",
  },
  image: {
    width: "88%",
    height: "88%",
  },
  discountBadge: {
    position: "absolute",
    top: 6,
    left: 6,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 7,
    backgroundColor: "#0F766E",
  },
  discountText: {
    fontSize: 9,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  productInfo: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
  },
  productName: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0F172A",
  },
  productMeta: {
    marginTop: 5,
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
  },
  productId: {
    marginTop: 3,
    fontSize: 9,
    color: "#94A3B8",
  },

  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 9,
  },
  price: {
    fontSize: 17,
    fontWeight: "900",
    color: "#102A43",
  },
  mrp: {
    fontSize: 11,
    textDecorationLine: "line-through",
    color: "#94A3B8",
  },

  statusRow: {
    marginTop: 9,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  stockBadge: {
    minHeight: 27,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    borderRadius: 9,
  },
  inStockBadge: {
    backgroundColor: "#E7F8F1",
  },
  lowStockBadge: {
    backgroundColor: "#FFF4D6",
  },
  outOfStockBadge: {
    backgroundColor: "#FDECEC",
  },
  stockText: {
    fontSize: 10,
    fontWeight: "800",
  },
  stockSuccess: {
    color: "#087A5A",
  },
  stockWarning: {
    color: "#A15C00",
  },
  stockDanger: {
    color: "#C53030",
  },

  visibilityBadge: {
    minHeight: 27,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    borderRadius: 9,
    backgroundColor: "#EEF2FF",
  },
  visibilityText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#4F46E5",
  },

  /* ---------- ACTIONS ---------- */
  actions: {
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 3,
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#CDE7E2",
    backgroundColor: "#E7F8F1",
  },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#F5CCCC",
    backgroundColor: "#FDECEC",
  },
  disabledButton: {
    opacity: 0.45,
  },
});
