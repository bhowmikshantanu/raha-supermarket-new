import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BannerCard } from "@/src/components/BannerCard";
import { CategoryTile } from "@/src/components/CategoryTile";
import { FreeDeliveryProgress } from "@/src/components/FreeDeliveryProgress";
import { HomeHeader } from "@/src/components/HomeHeader";
import { ProductCard } from "@/src/components/ProductCard";
import { useToast } from "@/src/components/Toast";
import { COLORS, FONT, SPACING } from "@/src/config/theme";
import { useApp } from "@/src/context/AppContext";
import { CATEGORIES } from "@/src/data/categories";
import { BANNERS, PRODUCTS } from "@/src/data/products";
import type { Product } from "@/src/types";

const { width } = Dimensions.get("window");
const BANNER_WIDTH = width - SPACING.md * 2;

export default function HomeScreen() {
  const router = useRouter();
  const { addToCart, updateQuantity, getQuantity, cartSubtotal, cart } = useApp();
  const { showToast } = useToast();
  const [bannerIndex, setBannerIndex] = useState(0);
  const bannerRef = useRef<FlatList>(null);

  const featured = PRODUCTS.filter((p) => p.isFeatured);
  const bestOffers = PRODUCTS.filter((p) => p.isBestOffer);
  const popular = PRODUCTS.filter((p) => p.isPopular);

  const goProduct = (p: Product) => router.push({ pathname: "/product/[id]", params: { id: p.id } });

  const handleAdd = (p: Product) => {
    const r = addToCart(p.id, 1);
    if (!r.ok) showToast(r.message ?? "Unable to add", "error");
    else showToast(`${p.name} added to cart`, "success");
  };

  const renderProductRow = (title: string, list: Product[], testID: string) => (
    <View style={styles.section} testID={testID}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <TouchableOpacity onPress={() => router.push("/products")}> 
          <Text style={styles.seeAll}>See all</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={list}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.hList}
        renderItem={({ item }) => (
          <View style={styles.hCard}>
            <ProductCard
              product={item}
              quantity={getQuantity(item.id)}
              onPress={() => goProduct(item)}
              onAdd={() => handleAdd(item)}
              onIncrement={() => updateQuantity(item.id, getQuantity(item.id) + 1)}
              onDecrement={() => updateQuantity(item.id, getQuantity(item.id) - 1)}
            />
          </View>
        )}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <HomeHeader
        onSearchPress={() => router.push("/search")}
        onProfilePress={() => router.push("/(tabs)/profile")}
      />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Banner carousel */}
        <View style={styles.bannerWrap}>
          <FlatList
            ref={bannerRef}
            data={BANNERS}
            keyExtractor={(b) => b.id}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            snapToInterval={BANNER_WIDTH + SPACING.sm}
            decelerationRate="fast"
            onMomentumScrollEnd={(e) =>
              setBannerIndex(Math.round(e.nativeEvent.contentOffset.x / (BANNER_WIDTH + SPACING.sm)))
            }
            renderItem={({ item }) => (
              <View style={{ width: BANNER_WIDTH, marginRight: SPACING.sm }}>
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
          <View style={styles.bannerDots}>
            {BANNERS.map((_, i) => (
              <View key={i} style={[styles.dot, i === bannerIndex && styles.dotActive]} />
            ))}
          </View>
        </View>

        {/* Free delivery progress if cart has items */}
        {cart.length > 0 && (
          <View style={styles.section}>
            <FreeDeliveryProgress subtotal={cartSubtotal} />
          </View>
        )}

        {/* Categories */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Shop by Category</Text>
            <TouchableOpacity onPress={() => router.push("/(tabs)/categories")}>
              <Text style={styles.seeAll}>See all</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={CATEGORIES}
            keyExtractor={(c) => c.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.catList}
            renderItem={({ item }) => (
              <View style={{ marginRight: SPACING.sm }}>
                <CategoryTile
                  category={item}
                  size="sm"
                  onPress={() => router.push({ pathname: "/products", params: { category: item.id } })}
                />
              </View>
            )}
          />
        </View>

        {renderProductRow("Featured Products", featured, "section-featured")}
        {renderProductRow("Best Offers", bestOffers, "section-best-offers")}
        {renderProductRow("Popular Right Now", popular, "section-popular")}

        <View style={{ height: SPACING.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { paddingBottom: SPACING.xxl },
  bannerWrap: {
    paddingTop: SPACING.md,
    paddingLeft: SPACING.md,
  },
  bannerDots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginTop: SPACING.sm,
    marginRight: SPACING.md,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.border },
  dotActive: { width: 18, backgroundColor: COLORS.primary },
  section: {
    marginTop: SPACING.xl,
    paddingHorizontal: SPACING.md,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONT.size.lg,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },
  seeAll: { color: COLORS.primary, fontSize: FONT.size.sm, fontWeight: FONT.weight.semibold },
  catList: { gap: SPACING.sm, paddingRight: SPACING.md },
  hList: { gap: SPACING.md, paddingRight: SPACING.md },
  hCard: { width: 160 },
});
