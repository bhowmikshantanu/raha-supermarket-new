import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import {
  useFocusEffect,
  useRouter,
} from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BannerCard } from "@/src/components/BannerCard";
import { FreeDeliveryProgress } from "@/src/components/FreeDeliveryProgress";
import { HomeHeader } from "@/src/components/HomeHeader";
import { ProductCard } from "@/src/components/ProductCard";
import { useToast } from "@/src/components/Toast";
import {
  COLORS,
  FONT,
  RADIUS,
  SHADOW,
  SPACING,
} from "@/src/config/theme";
import { useApp } from "@/src/context/AppContext";
import { useProducts } from "@/src/context/ProductContext";
import { CATEGORIES } from "@/src/data/categories";
import { BANNERS } from "@/src/data/products";
import { getRecommendedProducts } from "@/src/data/recommendations";
import { getRecentlyViewedProductIds } from "@/src/data/recentlyViewed";
import type { Product } from "@/src/types";

interface ProductSectionProps {
  title: string;
  subtitle?: string;
  products: Product[];
  testID: string;
  getQuantity: (productId: string) => number;
  onProductPress: (product: Product) => void;
  onAdd: (product: Product) => void;
  onIncrement: (product: Product) => void;
  onDecrement: (product: Product) => void;
  onSeeAll: () => void;
}

interface QuickAction {
  id: string;
  title: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  color: string;
  backgroundColor: string;
  onPress: () => void;
}

const ProductSection: React.FC<ProductSectionProps> = React.memo(
  ({
    title,
    subtitle,
    products,
    testID,
    getQuantity,
    onProductPress,
    onAdd,
    onIncrement,
    onDecrement,
    onSeeAll,
  }) => {
    if (products.length === 0) return null;

    return (
      <View style={styles.section} testID={testID}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeading}>
            <Text style={styles.sectionTitle}>{title}</Text>

            {subtitle ? (
              <Text style={styles.sectionSubtitle}>{subtitle}</Text>
            ) : null}
          </View>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onSeeAll}
            style={styles.seeAllButton}
            accessibilityRole="button"
            accessibilityLabel={`See all ${title}`}
          >
            <Text style={styles.seeAll}>See all</Text>
            <Ionicons
              name="chevron-forward"
              size={14}
              color={COLORS.primary}
            />
          </TouchableOpacity>
        </View>

        <FlatList
          data={products}
          keyExtractor={(item) => String(item.id)}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalProductList}
          initialNumToRender={4}
          maxToRenderPerBatch={5}
          windowSize={5}
          removeClippedSubviews
          renderItem={({ item }) => (
            <View style={styles.horizontalProductCard}>
              <ProductCard
                product={item}
                quantity={getQuantity(item.id)}
                onPress={() => onProductPress(item)}
                onAdd={() => onAdd(item)}
                onIncrement={() => onIncrement(item)}
                onDecrement={() => onDecrement(item)}
              />
            </View>
          )}
        />
      </View>
    );
  },
);

ProductSection.displayName = "ProductSection";

export default function HomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();

  const {
    addToCart,
    updateQuantity,
    getQuantity,
    cartSubtotal,
    cart,
    wishlist,
  } = useApp();

  const {
    products,
    loading: productsLoading,
  } = useProducts();

  const { showToast } = useToast();

  const [bannerIndex, setBannerIndex] = useState(0);
  const [recentlyViewedIds, setRecentlyViewedIds] =
    useState<string[]>([]);

  const bannerListRef = useRef<FlatList<typeof BANNERS[number]> | null>(null);

  const bannerWidth = Math.max(
    280,
    width - SPACING.md * 2,
  );

  const featured = useMemo(
    () =>
      products.filter(
        (product) => product.isFeatured,
      ),
    [products],
  );

  const flashDeals = useMemo(
    () =>
      products.filter(
        (product) => product.isBestOffer,
      ),
    [products],
  );

  const continueShopping = useMemo(
    () =>
      products
        .filter(
          (product) => product.isFeatured,
        )
        .slice(0, 4),
    [products],
  );

  const recentlyViewed = useMemo(
    () =>
      recentlyViewedIds
        .map((productId) =>
          products.find(
            (product) => product.id === productId,
          ),
        )
        .filter(
          (product): product is Product =>
            Boolean(product),
        ),
    [products, recentlyViewedIds],
  );

  const recommendedProducts = useMemo(
    () =>
      getRecommendedProducts({
        products,
        cart,
        wishlist,
        recentlyViewedIds,
        limit: 10,
      }),
    [
      products,
      cart,
      wishlist,
      recentlyViewedIds,
    ],
  );

  const popularBrands = useMemo(
    () => CATEGORIES.slice(0, 4),
    [],
  );

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const loadRecentlyViewed = async () => {
        const productIds =
          await getRecentlyViewedProductIds();

        if (active) {
          setRecentlyViewedIds(productIds);
        }
      };

      void loadRecentlyViewed();

      return () => {
        active = false;
      };
    }, []),
  );

  useEffect(() => {
    if (BANNERS.length <= 1) return undefined;
    const interval = setInterval(() => {
      setBannerIndex((current) => {
        const next = (current + 1) % BANNERS.length;
        bannerListRef.current?.scrollToOffset({
          offset: next * (bannerWidth + SPACING.sm),
          animated: true,
        });
        return next;
      });
    }, 4500);

    return () => clearInterval(interval);
  }, [bannerWidth]);

  const handleProductPress = useCallback(
    (product: Product) => {
      router.push({
        pathname: "/product/[id]",
        params: { id: product.id },
      });
    },
    [router],
  );

  const handleAdd = useCallback(
    (product: Product) => {
      const result = addToCart(product.id, 1);

      if (!result.ok) {
        showToast(
          result.message ?? "Unable to add this product",
          "error",
        );
        return;
      }

      showToast(
        `${product.name} added to cart`,
        "success",
      );
    },
    [addToCart, showToast],
  );

  const handleIncrement = useCallback(
    (product: Product) => {
      const currentQuantity = getQuantity(product.id);
      const result = updateQuantity(
        product.id,
        currentQuantity + 1,
      );

      if (result && !result.ok) {
        showToast(
          result.message ?? "Unable to update quantity",
          "error",
        );
      }
    },
    [getQuantity, showToast, updateQuantity],
  );

  const handleDecrement = useCallback(
    (product: Product) => {
      const currentQuantity = getQuantity(product.id);

      updateQuantity(
        product.id,
        Math.max(0, currentQuantity - 1),
      );
    },
    [getQuantity, updateQuantity],
  );

  const handleBannerScrollEnd = useCallback(
    (
      event: NativeSyntheticEvent<NativeScrollEvent>,
    ) => {
      const offset = event.nativeEvent.contentOffset.x;
      const itemWidth = bannerWidth + SPACING.sm;

      setBannerIndex(
        Math.round(offset / itemWidth),
      );
    },
    [bannerWidth],
  );

  const quickActions = useMemo<QuickAction[]>(
    () => [
      {
        id: "categories",
        title: "Categories",
        icon: "grid-outline",
        color: COLORS.indigo,
        backgroundColor: COLORS.indigoLight,
        onPress: () =>
          router.push("/(tabs)/categories"),
      },
      {
        id: "offers",
        title: "Best Offers",
        icon: "pricetag-outline",
        color: COLORS.saffronDark,
        backgroundColor: COLORS.saffronLight,
        onPress: () =>
          router.push({
            pathname: "/products",
            params: { filter: "offers" },
          }),
      },
      {
        id: "popular",
        title: "Popular",
        icon: "flame-outline",
        color: COLORS.maroon,
        backgroundColor: COLORS.primaryLight,
        onPress: () =>
          router.push({
            pathname: "/products",
            params: { filter: "popular" },
          }),
      },
      {
        id: "search",
        title: "Search",
        icon: "search-outline",
        color: COLORS.indigo,
        backgroundColor: COLORS.indigoLight,
        onPress: () => router.push("/search"),
      },
    ],
    [router],
  );

  const listHeader = (
    <>
      {productsLoading ? (
        <View style={styles.firebaseStatusCard}>
          <Ionicons
            name="cloud-download-outline"
            size={20}
            color={COLORS.primary}
          />

          <View style={styles.firebaseStatusContent}>
            <Text style={styles.firebaseStatusTitle}>
              Loading live products
            </Text>

            <Text style={styles.firebaseStatusText}>
              Syncing the latest prices and stock from Firebase.
            </Text>
          </View>
        </View>
      ) : products.length === 0 ? (
        <View style={styles.firebaseStatusCard}>
          <Ionicons
            name="alert-circle-outline"
            size={20}
            color={COLORS.danger}
          />

          <View style={styles.firebaseStatusContent}>
            <Text style={styles.firebaseStatusTitle}>
              No products available
            </Text>

            <Text style={styles.firebaseStatusText}>
              No active products were returned from Firestore.
            </Text>
          </View>
        </View>
      ) : null}

      <View style={styles.categoryShowcase}>
        <View style={styles.categoryShowcaseHeader}>
          <Text style={styles.categoryShowcaseTitle}>Shop by Category</Text>
          <TouchableOpacity onPress={() => router.push("/(tabs)/categories")} activeOpacity={0.75}>
            <Text style={styles.categoryShowcaseAll}>View all</Text>
          </TouchableOpacity>
        </View>
        <FlatList
          data={CATEGORIES}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryStrip}
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.82}
              style={styles.categoryTile}
              onPress={() => router.push({ pathname: "/products", params: { category: item.id } })}
            >
              <View style={[styles.categoryImageWrap, { backgroundColor: item.color }]}>
                <Image source={{ uri: item.image }} style={styles.categoryImage} contentFit="cover" />
              </View>
              <Text style={styles.categoryName} numberOfLines={2}>{item.name}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <View style={styles.heroSection}>
        <FlatList
          ref={bannerListRef}
          data={BANNERS}
          keyExtractor={(banner) => String(banner.id)}
          horizontal
          decelerationRate="fast"
          snapToInterval={bannerWidth + SPACING.sm}
          snapToAlignment="start"
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleBannerScrollEnd}
          contentContainerStyle={styles.bannerList}
          renderItem={({ item }) => (
            <View
              style={[
                styles.bannerItem,
                { width: bannerWidth },
              ]}
            >
              <BannerCard
                image={item.image}
                title={item.title}
                subtitle={item.subtitle}
                cta={item.cta}
                onPress={() => router.push("/products")}
              />
            </View>
          )}
        />

        {BANNERS.length > 1 ? (
          <View style={styles.bannerDots}>
            {BANNERS.map((banner, index) => (
              <View
                key={String(banner.id)}
                style={[
                  styles.dot,
                  index === bannerIndex &&
                    styles.dotActive,
                ]}
              />
            ))}
          </View>
        ) : null}
      </View>

      <View style={styles.serviceHighlights}>
        <View style={[styles.serviceCard, styles.serviceCardPink]}>
          <Ionicons name="gift-outline" size={21} color={COLORS.maroon} />
          <View style={styles.serviceTextWrap}>
            <Text style={styles.serviceTitle}>₹500+ Free Delivery</Text>
            <Text style={styles.serviceText}>Save on delivery</Text>
          </View>
        </View>
        <View style={[styles.serviceCard, styles.serviceCardBlue]}>
          <Ionicons name="time-outline" size={21} color={COLORS.indigo} />
          <View style={styles.serviceTextWrap}>
            <Text style={styles.serviceTitle}>10 AM – 8 PM</Text>
            <Text style={styles.serviceText}>Daily delivery</Text>
          </View>
        </View>
      </View>

      <View style={styles.promoGrid}>
        <TouchableOpacity style={styles.promoCard} activeOpacity={0.88} onPress={() => router.push({ pathname: "/products", params: { category: "dairy" } })}>
          <LinearGradient colors={["#0757A6", "#1597E5"]} style={styles.promoGradient}>
            <Ionicons name="water-outline" size={27} color="#FFFFFF" />
            <Text style={styles.promoEyebrow}>FRESH EVERY DAY</Text>
            <Text style={styles.promoTitle}>Milk & Dairy{"\n"}Essentials</Text>
            <Text style={styles.promoCta}>SHOP NOW  ›</Text>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity style={styles.promoCard} activeOpacity={0.88} onPress={() => router.push({ pathname: "/products", params: { category: "snacks-biscuits" } })}>
          <LinearGradient colors={["#F28C28", "#D94D14"]} style={styles.promoGradient}>
            <Ionicons name="fast-food-outline" size={27} color="#FFFFFF" />
            <Text style={styles.promoEyebrow}>TASTY SAVINGS</Text>
            <Text style={styles.promoTitle}>Snacks &{"\n"}Biscuits</Text>
            <Text style={styles.promoCta}>EXPLORE  ›</Text>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity style={styles.promoCard} activeOpacity={0.88} onPress={() => router.push({ pathname: "/products", params: { category: "grocery-staples" } })}>
          <LinearGradient colors={["#6B2817", "#B34A19"]} style={styles.promoGradient}>
            <Ionicons name="basket-outline" size={27} color="#FFFFFF" />
            <Text style={styles.promoEyebrow}>VALUE PACKS</Text>
            <Text style={styles.promoTitle}>Rice, Atta &{"\n"}Staples</Text>
            <Text style={styles.promoCta}>SHOP NOW  ›</Text>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity style={styles.promoCard} activeOpacity={0.88} onPress={() => router.push({ pathname: "/products", params: { category: "household" } })}>
          <LinearGradient colors={["#5B248A", "#B43CC1"]} style={styles.promoGradient}>
            <Ionicons name="sparkles-outline" size={27} color="#FFFFFF" />
            <Text style={styles.promoEyebrow}>CLEAN & SHINE</Text>
            <Text style={styles.promoTitle}>Home Care{"\n"}Essentials</Text>
            <Text style={styles.promoCta}>EXPLORE  ›</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <View style={styles.quickActionsSection}>
        {quickActions.map((action) => (
          <TouchableOpacity
            key={action.id}
            activeOpacity={0.75}
            style={styles.quickAction}
            onPress={action.onPress}
            accessibilityRole="button"
            accessibilityLabel={action.title}
            testID={`quick-action-${action.id}`}
          >
            <View
              style={[
                styles.quickActionIcon,
                { backgroundColor: action.backgroundColor },
              ]}
            >
              <Ionicons
                name={action.icon}
                size={21}
                color={action.color}
              />
            </View>

            <Text
              style={styles.quickActionText}
              numberOfLines={1}
            >
              {action.title}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {cart.length > 0 ? (
        <View style={styles.deliverySection}>
          <FreeDeliveryProgress
            subtotal={cartSubtotal}
          />
        </View>
      ) : null}

      <View style={styles.sectionTopMeta}>
        <View style={styles.sectionTag}>
          <Text style={styles.sectionTagText}>Premium Picks</Text>
        </View>
        <Text style={styles.sectionLead}>
          Discover fresh essentials, premium brands, and fast deals.
        </Text>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeaderCompact}>
          <Text style={styles.sectionTitle}>Flash Deals</Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() =>
              router.push({
                pathname: "/products",
                params: { filter: "offers" },
              })
            }
            style={styles.seeAllButton}
            accessibilityRole="button"
            accessibilityLabel="See all flash deals"
          >
            <Text style={styles.seeAll}>View all</Text>
            <Ionicons
              name="chevron-forward"
              size={14}
              color={COLORS.primary}
            />
          </TouchableOpacity>
        </View>
        <FlatList
          data={flashDeals}
          keyExtractor={(p) => p.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalProductList}
          renderItem={({ item }) => (
            <View style={styles.horizontalProductCard}>
              <ProductCard
                product={item}
                quantity={getQuantity(item.id)}
                onPress={() => handleProductPress(item)}
                onAdd={() => handleAdd(item)}
                onIncrement={() => handleIncrement(item)}
                onDecrement={() => handleDecrement(item)}
              />
            </View>
          )}
        />
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeaderCompact}>
          <Text style={styles.sectionTitle}>Featured Products</Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() =>
              router.push({
                pathname: "/products",
                params: { filter: "featured" },
              })
            }
            style={styles.seeAllButton}
            accessibilityRole="button"
            accessibilityLabel="See all featured products"
          >
            <Text style={styles.seeAll}>Explore</Text>
            <Ionicons
              name="chevron-forward"
              size={14}
              color={COLORS.primary}
            />
          </TouchableOpacity>
        </View>

        <FlatList
          data={featured}
          keyExtractor={(p) => p.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalProductList}
          renderItem={({ item }) => (
            <View style={styles.horizontalProductCard}>
              <ProductCard
                product={item}
                quantity={getQuantity(item.id)}
                onPress={() => handleProductPress(item)}
                onAdd={() => handleAdd(item)}
                onIncrement={() => handleIncrement(item)}
                onDecrement={() => handleDecrement(item)}
              />
            </View>
          )}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Popular Brands</Text>
        <FlatList
          data={popularBrands}
          keyExtractor={(brand) => brand.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.brandList}
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.brandCard}
              onPress={() =>
                router.push({
                  pathname: "/products",
                  params: { category: item.id },
                })
              }
              accessibilityRole="button"
              accessibilityLabel={`Browse ${item.name}`}
            >
              <Text style={styles.brandName}>{item.name}</Text>
              <Text style={styles.brandCount}>Curated grocery essentials</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeaderCompact}>
          <Text style={styles.sectionTitle}>Continue Shopping</Text>
          <Text style={styles.sectionAction}>Resume your recent finds</Text>
        </View>
        <FlatList
          data={continueShopping}
          keyExtractor={(p) => p.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalProductList}
          renderItem={({ item }) => (
            <View style={styles.horizontalProductCard}>
              <ProductCard
                product={item}
                quantity={getQuantity(item.id)}
                onPress={() => handleProductPress(item)}
                onAdd={() => handleAdd(item)}
                onIncrement={() => handleIncrement(item)}
                onDecrement={() => handleDecrement(item)}
              />
            </View>
          )}
        />
      </View>

      {recentlyViewed.length > 0 ? (
        <View style={styles.section}>
          <View style={styles.sectionHeaderCompact}>
            <Text style={styles.sectionTitle}>
              Recently Viewed
            </Text>

            <Text style={styles.sectionAction}>
              Based on your browsing
            </Text>
          </View>

          <FlatList
            data={recentlyViewed}
            keyExtractor={(product) => product.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={
              styles.horizontalProductList
            }
            renderItem={({ item }) => (
              <View style={styles.horizontalProductCard}>
                <ProductCard
                  product={item}
                  quantity={getQuantity(item.id)}
                  onPress={() =>
                    handleProductPress(item)
                  }
                  onAdd={() => handleAdd(item)}
                  onIncrement={() =>
                    handleIncrement(item)
                  }
                  onDecrement={() =>
                    handleDecrement(item)
                  }
                />
              </View>
            )}
          />
        </View>
      ) : null}

      <ProductSection
        title="Recommended for You"
        subtitle="Personalized from your cart, wishlist and browsing"
        products={recommendedProducts}
        testID="section-recommended"
        getQuantity={getQuantity}
        onProductPress={handleProductPress}
        onAdd={handleAdd}
        onIncrement={handleIncrement}
        onDecrement={handleDecrement}
        onSeeAll={() =>
          router.push({ pathname: "/products" })
        }
      />

      <View style={styles.bottomSpace} />
    </>
  );

  return (
    <SafeAreaView
      style={styles.container}
      edges={["top"]}
    >
      <HomeHeader
        onSearchPress={() => router.push("/search")}
        onVoicePress={() => router.push("/search")}
        onNotificationsPress={() =>
          router.push("/(tabs)/notifications")
        }
        onProfilePress={() =>
          router.push("/(tabs)/profile")
        }
      />

      <FlatList<never>
        data={[]}
        renderItem={() => null}
        ListHeaderComponent={listHeader}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  scrollContent: {
    paddingBottom: SPACING.xxl,
  },

  bannerList: {
    paddingLeft: SPACING.md,
    paddingRight: SPACING.md,
  },

  bannerItem: {
    marginRight: SPACING.sm,
  },

  bannerDots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: SPACING.sm,
  },

  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.border,
  },

  dotActive: {
    width: 20,
    backgroundColor: COLORS.primary,
  },

  quickActionsSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.md,
    marginTop: SPACING.lg,
    gap: SPACING.sm,
  },

  sectionTopMeta: {
    paddingHorizontal: SPACING.md,
    marginTop: SPACING.xl,
  },

  sectionTagText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.primary,
  },
  sectionTag: {
    alignSelf: "flex-start",
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.saffronLight,
    marginBottom: SPACING.sm,
  },

  sectionLead: {
    fontSize: FONT.size.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
    maxWidth: "82%",
  },

  sectionHeaderCompact: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },

  sectionAction: {
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
  },

  brandList: {
    paddingLeft: SPACING.md,
    paddingRight: SPACING.md,
  },

  brandCard: {
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    marginRight: SPACING.sm,
    width: 180,
  },

  brandName: {
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.semibold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },

  brandCount: {
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },

  quickAction: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
  },

  quickActionIcon: {
    width: 50,
    height: 50,
    borderRadius: RADIUS.lg,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOW.card,
  },

  quickActionText: {
    marginTop: 6,
    width: "100%",
    textAlign: "center",
    color: COLORS.textPrimary,
    fontSize: FONT.size.xs,
    fontWeight: FONT.weight.semibold,
  },

  deliverySection: {
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.md,
  },

  section: {
    marginTop: SPACING.xl,
    paddingHorizontal: SPACING.md,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },

  sectionHeading: {
    flex: 1,
  },

  sectionTitle: {
    fontSize: FONT.size.lg,
    fontWeight: FONT.weight.bold,
    color: COLORS.maroon,
  },

  sectionSubtitle: {
    marginTop: 3,
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
  },

  seeAllButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 1,
    paddingVertical: 6,
    paddingLeft: 8,
  },

  seeAll: {
    color: COLORS.saffronDark,
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.semibold,
  },

  horizontalProductList: {
    paddingRight: SPACING.md,
  },

  horizontalProductCard: {
    width: 170,
    marginRight: SPACING.md,
  },

  bottomSpace: {
    height: SPACING.xxxl,
  },

  firebaseStatusCard: {
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },

  firebaseStatusContent: {
    flex: 1,
  },

  firebaseStatusTitle: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },

  firebaseStatusText: {
    marginTop: 2,
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
    lineHeight: 17,
  },

  heroSection: {
    marginTop: SPACING.md,
  },

  categoryShowcase: {
    marginTop: SPACING.md,
  },
  categoryShowcaseHeader: {
    paddingHorizontal: SPACING.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  categoryShowcaseTitle: {
    fontSize: FONT.size.lg,
    fontWeight: FONT.weight.bold,
    color: COLORS.maroon,
  },
  categoryShowcaseAll: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.semibold,
    color: COLORS.saffronDark,
  },
  categoryStrip: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
  },
  categoryTile: {
    width: 82,
    alignItems: "center",
  },
  categoryImageWrap: {
    width: 68,
    height: 68,
    borderRadius: 20,
    padding: 4,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(122,31,61,0.08)",
    ...SHADOW.card,
  },
  categoryImage: {
    width: "100%",
    height: "100%",
    borderRadius: 16,
  },
  categoryName: {
    marginTop: 6,
    minHeight: 30,
    textAlign: "center",
    fontSize: 10.5,
    lineHeight: 14,
    fontWeight: FONT.weight.semibold,
    color: COLORS.textPrimary,
  },
  serviceHighlights: {
    flexDirection: "row",
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  serviceCard: {
    flex: 1,
    minHeight: 64,
    borderRadius: RADIUS.lg,
    padding: SPACING.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  serviceCardPink: {
    backgroundColor: "#FFF0F3",
  },
  serviceCardBlue: {
    backgroundColor: "#EDF8FF",
  },
  serviceTextWrap: {
    flex: 1,
  },
  serviceTitle: {
    fontSize: FONT.size.xs,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },
  serviceText: {
    marginTop: 2,
    fontSize: 9.5,
    color: COLORS.textSecondary,
  },
  promoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  promoCard: {
    width: "48.5%",
    minHeight: 132,
    borderRadius: RADIUS.lg,
    overflow: "hidden",
    ...SHADOW.card,
  },
  promoGradient: {
    flex: 1,
    padding: SPACING.md,
    justifyContent: "flex-end",
  },
  promoEyebrow: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 9,
    fontWeight: FONT.weight.bold,
    marginTop: 7,
    letterSpacing: 0.5,
  },
  promoTitle: {
    color: "#FFFFFF",
    fontSize: FONT.size.lg,
    lineHeight: 19,
    fontWeight: FONT.weight.heavy,
    marginTop: 2,
  },
  promoCta: {
    color: "#FFE58A",
    fontSize: 10,
    fontWeight: FONT.weight.heavy,
    marginTop: 7,
  },
});