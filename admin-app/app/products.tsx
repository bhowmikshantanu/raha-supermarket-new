import { Ionicons } from "@expo/vector-icons";
import {
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import React, {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { EmptyState } from "@/src/components/EmptyState";
import { ProductCard } from "@/src/components/ProductCard";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { useToast } from "@/src/components/Toast";
import {
  COLORS,
  FONT,
  RADIUS,
  SPACING,
} from "@/src/config/theme";
import { useApp } from "@/src/context/AppContext";
import { useProducts } from "@/src/context/ProductContext";
import {
  CATEGORIES,
  getCategoryById,
} from "@/src/data/categories";
import type {
  CategoryId,
  Product,
} from "@/src/types";

type SortKey =
  | "relevance"
  | "price-low"
  | "price-high"
  | "discount";

type ProductFilter =
  | "featured"
  | "popular"
  | "offers";

const SORT_OPTIONS: {
  key: SortKey;
  label: string;
}[] = [
  {
    key: "relevance",
    label: "Recommended",
  },
  {
    key: "price-low",
    label: "Price: Low to High",
  },
  {
    key: "price-high",
    label: "Price: High to Low",
  },
  {
    key: "discount",
    label: "Discount: High to Low",
  },
];

function getDiscountRatio(
  product: Product,
): number {
  if (
    product.mrp <= 0 ||
    product.price >= product.mrp
  ) {
    return 0;
  }

  return (
    (product.mrp - product.price) /
    product.mrp
  );
}

function isValidFilter(
  value: string | undefined,
): value is ProductFilter {
  return (
    value === "featured" ||
    value === "popular" ||
    value === "offers"
  );
}

export default function ProductListing() {
  const router = useRouter();

  const params = useLocalSearchParams<{
    category?: string | string[];
    filter?: string | string[];
  }>();

  const categoryParam = Array.isArray(
    params.category,
  )
    ? params.category[0]
    : params.category;

  const filterParam = Array.isArray(
    params.filter,
  )
    ? params.filter[0]
    : params.filter;

  const initialCategory =
    (categoryParam as CategoryId | undefined) ??
    "all";

  const {
    products: liveProducts,
    loading: productsLoading,
  } = useProducts();

  const {
    addToCart,
    updateQuantity,
    getQuantity,
    cartCount,
  } = useApp();

  const { showToast } = useToast();

  const [activeCat, setActiveCat] = useState<
    CategoryId | "all"
  >(initialCategory);

  const [sort, setSort] =
    useState<SortKey>("relevance");

  const [layout, setLayout] = useState<
    "grid" | "list"
  >("grid");

  const [inStockOnly, setInStockOnly] =
    useState(false);

  useEffect(() => {
    setActiveCat(
      (categoryParam as CategoryId | undefined) ??
        "all",
    );
  }, [categoryParam]);

  const activeFilter = isValidFilter(
    filterParam,
  )
    ? filterParam
    : undefined;

  const products = useMemo<Product[]>(() => {
    let list = [...liveProducts];

    if (activeCat !== "all") {
      list = list.filter(
        (product) =>
          product.category === activeCat,
      );
    }

    if (activeFilter === "featured") {
      list = list.filter(
        (product) =>
          product.isFeatured === true,
      );
    }

    if (activeFilter === "popular") {
      list = list.filter(
        (product) =>
          product.isPopular === true,
      );
    }

    if (activeFilter === "offers") {
      list = list.filter(
        (product) =>
          product.isBestOffer === true ||
          product.price < product.mrp,
      );
    }

    if (inStockOnly) {
      list = list.filter(
        (product) => product.stock > 0,
      );
    }

    switch (sort) {
      case "price-low":
        list.sort(
          (first, second) =>
            first.price - second.price,
        );
        break;

      case "price-high":
        list.sort(
          (first, second) =>
            second.price - first.price,
        );
        break;

      case "discount":
        list.sort(
          (first, second) =>
            getDiscountRatio(second) -
            getDiscountRatio(first),
        );
        break;

      case "relevance":
      default:
        list.sort((first, second) => {
          const firstPriority =
            Number(first.isFeatured) * 3 +
            Number(first.isPopular) * 2 +
            Number(first.isBestOffer);

          const secondPriority =
            Number(second.isFeatured) * 3 +
            Number(second.isPopular) * 2 +
            Number(second.isBestOffer);

          return (
            secondPriority -
              firstPriority ||
            first.name.localeCompare(
              second.name,
            )
          );
        });
        break;
    }

    return list;
  }, [
    liveProducts,
    activeCat,
    activeFilter,
    inStockOnly,
    sort,
  ]);

  const category =
    activeCat !== "all"
      ? getCategoryById(activeCat)
      : null;

  const title = useMemo(() => {
    if (category) {
      return category.name;
    }

    if (activeFilter === "featured") {
      return "Featured Products";
    }

    if (activeFilter === "popular") {
      return "Popular Products";
    }

    if (activeFilter === "offers") {
      return "Best Offers";
    }

    return "All Products";
  }, [category, activeFilter]);

  const handleAdd = (
    product: Product,
  ) => {
    const result = addToCart(
      product.id,
      1,
    );

    if (!result.ok) {
      showToast(
        result.message ??
          "Unable to add product",
        "error",
      );
      return;
    }

    showToast(
      `${product.name} added`,
      "success",
    );
  };

  const handleIncrement = (
    product: Product,
  ) => {
    const result = updateQuantity(
      product.id,
      getQuantity(product.id) + 1,
    );

    if (!result.ok) {
      showToast(
        result.message ??
          "Reached stock limit",
        "error",
      );
    }
  };

  const handleDecrement = (
    product: Product,
  ) => {
    const result = updateQuantity(
      product.id,
      getQuantity(product.id) - 1,
    );

    if (!result.ok) {
      showToast(
        result.message ??
          "Unable to update quantity",
        "error",
      );
    }
  };

  const cycleSort = () => {
    const currentIndex =
      SORT_OPTIONS.findIndex(
        (option) =>
          option.key === sort,
      );

    const nextIndex =
      (currentIndex + 1) %
      SORT_OPTIONS.length;

    setSort(
      SORT_OPTIONS[nextIndex].key,
    );
  };

  const currentSortLabel =
    SORT_OPTIONS.find(
      (option) => option.key === sort,
    )?.label ?? "Recommended";

  const categoryOptions = useMemo(
    () => [
      {
        id: "all",
        name: "All",
      },
      ...CATEGORIES.map((item) => ({
        id: item.id,
        name: item.name,
      })),
    ],
    [],
  );

  return (
    <SafeAreaView
      style={styles.container}
      edges={["bottom"]}
    >
      <ScreenHeader
        title={title}
        subtitle={
          productsLoading
            ? "Syncing products…"
            : `${products.length} ${
                products.length === 1
                  ? "product"
                  : "products"
              }`
        }
        rightIcon="cart-outline"
        onRightPress={() =>
          router.push("/(tabs)/cart")
        }
        rightBadge={cartCount}
      />

      <View style={styles.chipsRow}>
        <FlatList
          data={categoryOptions}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={
            false
          }
          contentContainerStyle={
            styles.chipsList
          }
          renderItem={({ item }) => {
            const active =
              activeCat === item.id;

            return (
              <TouchableOpacity
                activeOpacity={0.8}
                style={[
                  styles.chip,
                  active &&
                    styles.chipActive,
                ]}
                onPress={() =>
                  setActiveCat(
                    item.id as
                      | CategoryId
                      | "all",
                  )
                }
                testID={`chip-${item.id}`}
              >
                <Text
                  style={[
                    styles.chipText,
                    active &&
                      styles.chipTextActive,
                  ]}
                >
                  {item.name}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      <View style={styles.toolbar}>
        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.toolbarBtn}
          onPress={cycleSort}
          testID="sort-toggle"
        >
          <Ionicons
            name="swap-vertical"
            size={16}
            color={COLORS.textPrimary}
          />

          <Text
            style={styles.toolbarText}
            numberOfLines={1}
          >
            {currentSortLabel}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          style={[
            styles.toolbarBtn,
            inStockOnly &&
              styles.toolbarBtnActive,
          ]}
          onPress={() =>
            setInStockOnly(
              (current) => !current,
            )
          }
          testID="filter-instock"
        >
          <Ionicons
            name="checkmark-circle-outline"
            size={16}
            color={
              inStockOnly
                ? COLORS.primary
                : COLORS.textPrimary
            }
          />

          <Text
            style={[
              styles.toolbarText,
              inStockOnly &&
                styles.toolbarTextActive,
            ]}
          >
            In stock
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.toolbarLayout}
          onPress={() =>
            setLayout((current) =>
              current === "grid"
                ? "list"
                : "grid",
            )
          }
          testID="layout-toggle"
        >
          <Ionicons
            name={
              layout === "grid"
                ? "list"
                : "grid"
            }
            size={18}
            color={COLORS.textPrimary}
          />
        </TouchableOpacity>
      </View>

      {productsLoading ? (
        <View style={styles.loadingWrap}>
          <Ionicons
            name="cloud-download-outline"
            size={42}
            color={COLORS.primary}
          />

          <Text style={styles.loadingTitle}>
            Loading live products
          </Text>

          <Text style={styles.loadingText}>
            Syncing the latest prices and
            stock from Firebase.
          </Text>
        </View>
      ) : products.length === 0 ? (
        <EmptyState
          icon="cube-outline"
          title="No products found"
          description="Try adjusting filters or explore other categories."
        />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(product) =>
            product.id
          }
          key={layout}
          numColumns={
            layout === "grid" ? 2 : 1
          }
          columnWrapperStyle={
            layout === "grid"
              ? styles.columnWrapper
              : undefined
          }
          contentContainerStyle={
            styles.list
          }
          showsVerticalScrollIndicator={
            false
          }
          ItemSeparatorComponent={() => (
            <View style={styles.separator} />
          )}
          renderItem={({ item }) => (
            <View
              style={
                layout === "grid"
                  ? styles.gridCell
                  : undefined
              }
            >
              <ProductCard
                product={item}
                quantity={getQuantity(
                  item.id,
                )}
                onPress={() =>
                  router.push({
                    pathname:
                      "/product/[id]",
                    params: {
                      id: item.id,
                    },
                  })
                }
                onAdd={() =>
                  handleAdd(item)
                }
                onIncrement={() =>
                  handleIncrement(item)
                }
                onDecrement={() =>
                  handleDecrement(item)
                }
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
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  chipsRow: {
    backgroundColor: COLORS.background,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor:
      COLORS.borderLight,
  },

  chipsList: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
  },

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

  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },

  chipText: {
    fontSize: FONT.size.sm,
    color: COLORS.textPrimary,
    fontWeight: FONT.weight.semibold,
  },

  chipTextActive: {
    color: COLORS.textOnPrimary,
  },

  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    padding: SPACING.md,
  },

  toolbarBtn: {
    maxWidth: "46%",
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

  toolbarBtnActive: {
    borderColor: COLORS.primary,
    backgroundColor:
      COLORS.primaryLight,
  },

  toolbarText: {
    flexShrink: 1,
    fontSize: FONT.size.sm,
    color: COLORS.textPrimary,
    fontWeight: FONT.weight.semibold,
  },

  toolbarTextActive: {
    color: COLORS.primary,
  },

  toolbarLayout: {
    marginLeft: "auto",
    width: 40,
    height: 36,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    justifyContent: "center",
    alignItems: "center",
  },

  list: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xxxl,
  },

  columnWrapper: {
    gap: SPACING.md,
  },

  separator: {
    height: SPACING.md,
  },

  gridCell: {
    flex: 1,
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
    maxWidth: 280,
    textAlign: "center",
    fontSize: FONT.size.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
});