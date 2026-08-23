import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import {
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/src/components/Button";
import { EmptyState } from "@/src/components/EmptyState";
import { ProductCard } from "@/src/components/ProductCard";
import { RatingStars } from "@/src/components/RatingStars";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { StatusPill } from "@/src/components/StatusPill";
import { useToast } from "@/src/components/Toast";
import {
  COLORS,
  FONT,
  RADIUS,
  SHADOW,
  SPACING,
} from "@/src/config/theme";
import { useApp } from "@/src/context/AppContext";
import { getCategoryById } from "@/src/data/categories";
import { getFrequentlyBoughtTogether } from "@/src/data/frequentlyBoughtTogether";
import { getPeopleAlsoBought } from "@/src/data/peopleAlsoBought";
import { useProducts } from "@/src/context/ProductContext";
import {
  getRatingSummary,
  getReviewsByProductId,
} from "@/src/data/reviews";
import { addRecentlyViewedProduct } from "@/src/data/recentlyViewed";
import {
  calcDiscountPercent,
  formatCurrency,
} from "@/src/utils/format";

export default function ProductDetails() {
  const params = useLocalSearchParams<{
    id?: string | string[];
  }>();

  const router = useRouter();

  const productId = Array.isArray(params.id)
    ? params.id[0]
    : params.id ?? "";

  const {
    products,
    loading: productsLoading,
    getProductById,
  } = useProducts();

  const product = getProductById(productId);

  const {
    addToCart,
    updateQuantity,
    getQuantity,
    cartCount,
    isWishlisted,
    toggleWishlist,
  } = useApp();

  const { showToast } = useToast();

  const [
    selectedTogetherProductIds,
    setSelectedTogetherProductIds,
  ] = useState<string[]>([]);

  const productReviews = useMemo(
    () =>
      product
        ? getReviewsByProductId(product.id)
        : [],
    [product],
  );

  const ratingSummary = useMemo(
    () => getRatingSummary(productReviews),
    [productReviews],
  );

  const frequentlyBoughtTogether = useMemo(
    () =>
      product
        ? getFrequentlyBoughtTogether({
            currentProduct: product,
            products,
            limit: 3,
          })
        : [],
    [product, products],
  );

  const peopleAlsoBought = useMemo(
    () =>
      product
        ? getPeopleAlsoBought({
            currentProduct: product,
            products,
            limit: 6,
          })
        : [],
    [product, products],
  );

  const selectedTogetherProducts = useMemo(
    () =>
      frequentlyBoughtTogether.filter((item) =>
        selectedTogetherProductIds.includes(item.id),
      ),
    [
      frequentlyBoughtTogether,
      selectedTogetherProductIds,
    ],
  );

  const togetherTotal = useMemo(
    () =>
      selectedTogetherProducts.reduce(
        (total, item) => total + item.price,
        0,
      ),
    [selectedTogetherProducts],
  );

  useEffect(() => {
    if (!product?.id) {
      return;
    }

    void addRecentlyViewedProduct(product.id);
  }, [product?.id]);

  useEffect(() => {
    setSelectedTogetherProductIds(
      frequentlyBoughtTogether.map((item) => item.id),
    );
  }, [product?.id, frequentlyBoughtTogether]);

  if (productsLoading) {
    return (
      <SafeAreaView
        style={styles.container}
        edges={["bottom"]}
      >
        <ScreenHeader title="Product" />

        <View style={styles.loadingWrap}>
          <Ionicons
            name="cloud-download-outline"
            size={42}
            color={COLORS.primary}
          />

          <Text style={styles.loadingTitle}>
            Loading product
          </Text>

          <Text style={styles.loadingText}>
            Syncing the latest price and stock from Firebase.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!product) {
    return (
      <SafeAreaView
        style={styles.container}
        edges={["bottom"]}
      >
        <ScreenHeader title="Product" />

        <EmptyState
          icon="alert-circle-outline"
          title="Product not found"
          description="This product may have been removed."
        />
      </SafeAreaView>
    );
  }

  const qty = getQuantity(product.id);

  const discount = calcDiscountPercent(
    product.mrp,
    product.price,
  );

  const isOOS = product.stock <= 0;

  const category = getCategoryById(
    product.category,
  );

  const similar = products
    .filter(
      (item) =>
        item.category === product.category &&
        item.id !== product.id,
    )
    .slice(0, 6);

  const wishlisted = isWishlisted(product.id);

  const handleAdd = () => {
    const result = addToCart(product.id, 1);

    if (!result.ok) {
      showToast(
        result.message ?? "Unable to add",
        "error",
      );

      return;
    }

    showToast("Added to cart", "success");
  };

  const handleBuyNow = () => {
    if (qty === 0) {
      const result = addToCart(product.id, 1);

      if (!result.ok) {
        showToast(
          result.message ?? "Unable to add",
          "error",
        );

        return;
      }
    }

    router.push("/checkout");
  };

  const handleWishlist = () => {
    const result = toggleWishlist(product.id);

    showToast(
      result.message,
      result.added ? "success" : "info",
    );
  };

  const handleViewReviews = () => {
    router.push({
      pathname: "/reviews/[productId]",
      params: {
        productId: product.id,
      },
    });
  };

  const toggleTogetherProduct = (
    togetherProductId: string,
  ) => {
    setSelectedTogetherProductIds((previous) =>
      previous.includes(togetherProductId)
        ? previous.filter(
            (id) => id !== togetherProductId,
          )
        : [...previous, togetherProductId],
    );
  };

  const handleTogetherProductPress = (
    togetherProductId: string,
  ) => {
    router.push({
      pathname: "/product/[id]",
      params: {
        id: togetherProductId,
      },
    });
  };

  const handleAddSelectedTogether = () => {
    if (selectedTogetherProducts.length === 0) {
      showToast(
        "Select at least one product.",
        "info",
      );
      return;
    }

    let addedCount = 0;
    let failedCount = 0;
    let lastErrorMessage = "";

    for (const item of selectedTogetherProducts) {
      const result = addToCart(item.id, 1);

      if (result.ok) {
        addedCount += 1;
      } else {
        failedCount += 1;
        lastErrorMessage =
          result.message ?? "Some items could not be added.";
      }
    }

    if (addedCount > 0 && failedCount === 0) {
      showToast(
        `${addedCount} product${
          addedCount === 1 ? "" : "s"
        } added to cart.`,
        "success",
      );
      return;
    }

    if (addedCount > 0) {
      showToast(
        `${addedCount} added. ${failedCount} could not be added due to stock limits.`,
        "info",
      );
      return;
    }

    showToast(
      lastErrorMessage ||
        "Selected products could not be added.",
      "error",
    );
  };

  const handlePeopleAlsoBoughtAdd = (
    itemId: string,
  ) => {
    const result = addToCart(itemId, 1);

    if (!result.ok) {
      showToast(
        result.message ?? "Unable to add",
        "error",
      );
      return;
    }

    showToast("Added to cart", "success");
  };

  const handlePeopleAlsoBoughtWishlist = (
    itemId: string,
  ) => {
    const result = toggleWishlist(itemId);

    showToast(
      result.message,
      result.added ? "success" : "info",
    );
  };

  return (
    <SafeAreaView
      style={styles.container}
      edges={["bottom"]}
    >
      <ScreenHeader
        title={category?.name || "Product"}
        rightIcon="cart-outline"
        onRightPress={() =>
          router.push("/(tabs)/cart")
        }
        rightBadge={cartCount}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.imgWrap}>
          <Image
            source={{ uri: product.image }}
            style={styles.image}
            contentFit="contain"
          />

          {discount > 0 ? (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>
                {discount}% OFF
              </Text>
            </View>
          ) : null}

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleWishlist}
            style={[
              styles.wishlistButton,
              wishlisted &&
                styles.wishlistButtonActive,
            ]}
            accessibilityRole="button"
            accessibilityLabel={
              wishlisted
                ? "Remove from wishlist"
                : "Add to wishlist"
            }
          >
            <Ionicons
              name={
                wishlisted
                  ? "heart"
                  : "heart-outline"
              }
              size={24}
              color={
                wishlisted
                  ? COLORS.danger
                  : COLORS.textPrimary
              }
            />
          </TouchableOpacity>
        </View>

        <View style={styles.info}>
          <Text style={styles.name}>
            {product.name}
          </Text>

          <Text style={styles.size}>
            {product.size}
          </Text>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleViewReviews}
            style={styles.ratingPreview}
            accessibilityRole="button"
            accessibilityLabel="View product ratings and reviews"
          >
            <View style={styles.ratingLeft}>
              <RatingStars
                rating={
                  ratingSummary.averageRating
                }
                size={18}
              />

              <Text style={styles.ratingValue}>
                {ratingSummary.averageRating.toFixed(
                  1,
                )}
              </Text>

              <Text style={styles.reviewCount}>
                ({ratingSummary.totalReviews}{" "}
                {ratingSummary.totalReviews === 1
                  ? "review"
                  : "reviews"}
                )
              </Text>
            </View>

            <View style={styles.viewReviewsWrap}>
              <Text style={styles.viewReviewsText}>
                View all
              </Text>

              <Ionicons
                name="chevron-forward"
                size={17}
                color={COLORS.primary}
              />
            </View>
          </TouchableOpacity>

          <View style={styles.priceRow}>
            <Text style={styles.price}>
              {formatCurrency(product.price)}
            </Text>

            {product.mrp > product.price ? (
              <>
                <Text style={styles.mrp}>
                  {formatCurrency(product.mrp)}
                </Text>

                <View style={styles.savePill}>
                  <Text style={styles.saveText}>
                    Save{" "}
                    {formatCurrency(
                      product.mrp -
                        product.price,
                    )}
                  </Text>
                </View>
              </>
            ) : null}
          </View>

          <View style={styles.statusRow}>
            {isOOS ? (
              <StatusPill
                label="Out of stock"
                tone="danger"
              />
            ) : product.stock <= 5 ? (
              <StatusPill
                label={`Only ${product.stock} left`}
                tone="warning"
              />
            ) : (
              <StatusPill
                label="In stock"
                tone="success"
              />
            )}

            <StatusPill
              label="Delivery in 30 mins"
              tone="info"
            />
          </View>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>
            About this product
          </Text>

          <Text style={styles.description}>
            {product.description}
          </Text>

          <TouchableOpacity
            activeOpacity={0.82}
            style={styles.reviewsCard}
            onPress={handleViewReviews}
            accessibilityRole="button"
            accessibilityLabel="Open ratings and reviews"
          >
            <View style={styles.reviewsCardLeft}>
              <View style={styles.reviewIconWrap}>
                <Ionicons
                  name="star"
                  size={22}
                  color="#F5A623"
                />
              </View>

              <View style={styles.reviewsCardContent}>
                <Text style={styles.reviewsCardTitle}>
                  Ratings & Reviews
                </Text>

                <Text
                  style={styles.reviewsCardSubtitle}
                >
                  {ratingSummary.totalReviews > 0
                    ? `${ratingSummary.averageRating.toFixed(
                        1,
                      )} rating from ${
                        ratingSummary.totalReviews
                      } customer${
                        ratingSummary.totalReviews ===
                        1
                          ? ""
                          : "s"
                      }`
                    : "No customer reviews yet"}
                </Text>
              </View>
            </View>

            <Ionicons
              name="chevron-forward"
              size={21}
              color={COLORS.textSecondary}
            />
          </TouchableOpacity>

          {frequentlyBoughtTogether.length > 0 ? (
            <>
              <View style={styles.divider} />

              <View style={styles.togetherHeader}>
                <View style={styles.togetherHeadingContent}>
                  <Text style={styles.sectionTitle}>
                    Frequently Bought Together
                  </Text>

                  <Text style={styles.togetherSubtitle}>
                    Select useful add-ons and add them in one tap.
                  </Text>
                </View>

                <View style={styles.togetherCountBadge}>
                  <Text style={styles.togetherCountText}>
                    {selectedTogetherProducts.length} selected
                  </Text>
                </View>
              </View>

              <View style={styles.togetherCard}>
                {frequentlyBoughtTogether.map(
                  (item, index) => {
                    const selected =
                      selectedTogetherProductIds.includes(
                        item.id,
                      );

                    return (
                      <View key={item.id}>
                        <View style={styles.togetherProductRow}>
                          <TouchableOpacity
                            activeOpacity={0.75}
                            onPress={() =>
                              toggleTogetherProduct(item.id)
                            }
                            style={[
                              styles.togetherCheckbox,
                              selected &&
                                styles.togetherCheckboxSelected,
                            ]}
                            accessibilityRole="checkbox"
                            accessibilityState={{
                              checked: selected,
                            }}
                            accessibilityLabel={`Select ${item.name}`}
                          >
                            {selected ? (
                              <Ionicons
                                name="checkmark"
                                size={16}
                                color={COLORS.textOnPrimary}
                              />
                            ) : null}
                          </TouchableOpacity>

                          <TouchableOpacity
                            activeOpacity={0.82}
                            style={
                              styles.togetherProductDetailsButton
                            }
                            onPress={() =>
                              handleTogetherProductPress(item.id)
                            }
                            accessibilityRole="button"
                            accessibilityLabel={`View ${item.name}`}
                          >
                            <View style={styles.togetherImageWrap}>
                              <Image
                                source={{ uri: item.image }}
                                style={styles.togetherImage}
                                contentFit="contain"
                              />
                            </View>

                            <View style={styles.togetherProductInfo}>
                              <Text
                                style={styles.togetherProductName}
                                numberOfLines={2}
                              >
                                {item.name}
                              </Text>

                              <Text style={styles.togetherProductSize}>
                                {item.size}
                              </Text>

                              <View style={styles.togetherPriceRow}>
                                <Text style={styles.togetherPrice}>
                                  {formatCurrency(item.price)}
                                </Text>

                                {item.mrp > item.price ? (
                                  <Text style={styles.togetherMrp}>
                                    {formatCurrency(item.mrp)}
                                  </Text>
                                ) : null}
                              </View>
                            </View>

                            <Ionicons
                              name="chevron-forward"
                              size={19}
                              color={COLORS.textMuted}
                            />
                          </TouchableOpacity>
                        </View>

                        {index <
                        frequentlyBoughtTogether.length - 1 ? (
                          <View style={styles.togetherRowDivider} />
                        ) : null}
                      </View>
                    );
                  },
                )}

                <View style={styles.togetherFooter}>
                  <View style={styles.togetherTotalWrap}>
                    <Text style={styles.togetherTotalLabel}>
                      Selected total
                    </Text>

                    <Text style={styles.togetherTotalValue}>
                      {formatCurrency(togetherTotal)}
                    </Text>
                  </View>

                  <TouchableOpacity
                    activeOpacity={0.82}
                    onPress={handleAddSelectedTogether}
                    disabled={
                      selectedTogetherProducts.length === 0
                    }
                    style={[
                      styles.addTogetherButton,
                      selectedTogetherProducts.length === 0 &&
                        styles.addTogetherButtonDisabled,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Add selected products to cart"
                  >
                    <Ionicons
                      name="cart-outline"
                      size={18}
                      color={COLORS.textOnPrimary}
                    />

                    <Text style={styles.addTogetherButtonText}>
                      Add Selected
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          ) : null}

          {peopleAlsoBought.length > 0 ? (
            <>
              <View style={styles.divider} />

              <View style={styles.peopleHeader}>
                <View style={styles.peopleHeaderText}>
                  <Text style={styles.sectionTitle}>
                    People Also Bought
                  </Text>

                  <Text style={styles.peopleSubtitle}>
                    Popular choices customers often add with this product.
                  </Text>
                </View>

                <View style={styles.peopleBadge}>
                  <Ionicons
                    name="people-outline"
                    size={16}
                    color={COLORS.primary}
                  />

                  <Text style={styles.peopleBadgeText}>
                    Popular
                  </Text>
                </View>
              </View>

              <FlatList
                data={peopleAlsoBought}
                keyExtractor={(item) => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.peopleList}
                renderItem={({ item }) => {
                  const itemWishlisted = isWishlisted(
                    item.id,
                  );

                  return (
                    <View style={styles.peopleCard}>
                      <TouchableOpacity
                        activeOpacity={0.82}
                        onPress={() =>
                          router.push({
                            pathname: "/product/[id]",
                            params: {
                              id: item.id,
                            },
                          })
                        }
                        style={styles.peopleMainArea}
                        accessibilityRole="button"
                        accessibilityLabel={`View ${item.name}`}
                      >
                        <View style={styles.peopleImageWrap}>
                          <Image
                            source={{ uri: item.image }}
                            style={styles.peopleImage}
                            contentFit="contain"
                          />

                          <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() =>
                              handlePeopleAlsoBoughtWishlist(
                                item.id,
                              )
                            }
                            style={[
                              styles.peopleWishlistButton,
                              itemWishlisted &&
                                styles.peopleWishlistButtonActive,
                            ]}
                            accessibilityRole="button"
                            accessibilityLabel={
                              itemWishlisted
                                ? `Remove ${item.name} from wishlist`
                                : `Add ${item.name} to wishlist`
                            }
                          >
                            <Ionicons
                              name={
                                itemWishlisted
                                  ? "heart"
                                  : "heart-outline"
                              }
                              size={17}
                              color={
                                itemWishlisted
                                  ? COLORS.danger
                                  : COLORS.textPrimary
                              }
                            />
                          </TouchableOpacity>
                        </View>

                        <Text
                          style={styles.peopleProductName}
                          numberOfLines={2}
                        >
                          {item.name}
                        </Text>

                        <Text style={styles.peopleProductSize}>
                          {item.size}
                        </Text>

                        <View style={styles.peoplePriceRow}>
                          <Text style={styles.peoplePrice}>
                            {formatCurrency(item.price)}
                          </Text>

                          {item.mrp > item.price ? (
                            <Text style={styles.peopleMrp}>
                              {formatCurrency(item.mrp)}
                            </Text>
                          ) : null}
                        </View>
                      </TouchableOpacity>

                      <TouchableOpacity
                        activeOpacity={0.82}
                        onPress={() =>
                          handlePeopleAlsoBoughtAdd(item.id)
                        }
                        style={styles.peopleAddButton}
                        accessibilityRole="button"
                        accessibilityLabel={`Add ${item.name} to cart`}
                      >
                        <Ionicons
                          name="add"
                          size={17}
                          color={COLORS.textOnPrimary}
                        />

                        <Text style={styles.peopleAddText}>
                          Add
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                }}
              />
            </>
          ) : null}

          {similar.length > 0 ? (
            <>
              <View style={styles.divider} />

              <Text style={styles.sectionTitle}>
                Similar products
              </Text>

              <FlatList
                data={similar}
                keyExtractor={(item) => item.id}
                horizontal
                showsHorizontalScrollIndicator={
                  false
                }
                contentContainerStyle={
                  styles.similarList
                }
                renderItem={({ item }) => (
                  <View
                    style={
                      styles.similarProductWrap
                    }
                  >
                    <ProductCard
                      product={item}
                      quantity={getQuantity(item.id)}
                      onPress={() =>
                        router.push({
                          pathname:
                            "/product/[id]",
                          params: {
                            id: item.id,
                          },
                        })
                      }
                      onAdd={() => {
                        const result = addToCart(
                          item.id,
                          1,
                        );

                        if (!result.ok) {
                          showToast(
                            result.message ??
                              "Unable to add",
                            "error",
                          );

                          return;
                        }

                        showToast(
                          "Added to cart",
                          "success",
                        );
                      }}
                      onIncrement={() => {
                        const result =
                          updateQuantity(
                            item.id,
                            getQuantity(
                              item.id,
                            ) + 1,
                          );

                        if (!result.ok) {
                          showToast(
                            result.message ??
                              "Reached stock limit",
                            "error",
                          );
                        }
                      }}
                      onDecrement={() =>
                        updateQuantity(
                          item.id,
                          getQuantity(item.id) -
                            1,
                        )
                      }
                    />
                  </View>
                )}
              />
            </>
          ) : null}
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        {isOOS ? (
          <Button
            label="Notify Me"
            onPress={() =>
              showToast(
                "We'll notify you when it's back in stock",
                "info",
              )
            }
            fullWidth
            size="lg"
            variant="outline"
            testID="notify-me"
          />
        ) : qty > 0 ? (
          <>
            <View style={styles.stepper}>
              <TouchableOpacity
                style={styles.stepBtn}
                onPress={() =>
                  updateQuantity(
                    product.id,
                    qty - 1,
                  )
                }
                testID="pd-dec"
              >
                <Ionicons
                  name="remove"
                  size={20}
                  color={COLORS.textOnPrimary}
                />
              </TouchableOpacity>

              <Text style={styles.stepQty}>
                {qty}
              </Text>

              <TouchableOpacity
                style={styles.stepBtn}
                onPress={() => {
                  const result =
                    updateQuantity(
                      product.id,
                      qty + 1,
                    );

                  if (!result.ok) {
                    showToast(
                      result.message ??
                        "Reached stock limit",
                      "error",
                    );
                  }
                }}
                testID="pd-inc"
              >
                <Ionicons
                  name="add"
                  size={20}
                  color={COLORS.textOnPrimary}
                />
              </TouchableOpacity>
            </View>

            <Button
              label="Go to Cart"
              onPress={() =>
                router.push("/(tabs)/cart")
              }
              size="lg"
              style={styles.flexButton}
              testID="pd-go-cart"
            />
          </>
        ) : (
          <>
            <Button
              label="Add to Cart"
              onPress={handleAdd}
              size="lg"
              variant="outline"
              style={styles.flexButton}
              testID="pd-add-to-cart"
            />

            <Button
              label="Buy Now"
              onPress={handleBuyNow}
              size="lg"
              style={styles.flexButton}
              testID="pd-buy-now"
            />
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  scrollContent: {
    paddingBottom: 120,
  },

  imgWrap: {
    height: 320,
    backgroundColor: COLORS.surface,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },

  image: {
    width: "80%",
    height: "80%",
  },

  discountBadge: {
    position: "absolute",
    top: SPACING.md,
    left: SPACING.md,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
  },

  discountText: {
    color: COLORS.textOnPrimary,
    fontWeight: FONT.weight.bold,
  },

  wishlistButton: {
    position: "absolute",
    top: SPACING.md,
    right: SPACING.md,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOW.card,
  },

  wishlistButtonActive: {
    borderColor: COLORS.danger,
  },

  info: {
    padding: SPACING.lg,
    gap: 4,
  },

  name: {
    fontSize: FONT.size.xxl,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },

  size: {
    fontSize: FONT.size.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },

  ratingPreview: {
    marginBottom: SPACING.md,
    minHeight: 44,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  ratingLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  ratingValue: {
    marginLeft: SPACING.sm,
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },

  reviewCount: {
    marginLeft: 4,
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
  },

  viewReviewsWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: SPACING.sm,
  },

  viewReviewsText: {
    fontSize: FONT.size.xs,
    fontWeight: FONT.weight.semibold,
    color: COLORS.primary,
  },

  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    flexWrap: "wrap",
  },

  price: {
    fontSize: FONT.size.xxl,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },

  mrp: {
    fontSize: FONT.size.md,
    color: COLORS.textMuted,
    textDecorationLine: "line-through",
  },

  savePill: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    backgroundColor: COLORS.primaryLight,
    borderRadius: RADIUS.pill,
  },

  saveText: {
    color: COLORS.primaryDark,
    fontWeight: FONT.weight.bold,
    fontSize: FONT.size.xs,
  },

  statusRow: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginTop: SPACING.sm,
    flexWrap: "wrap",
  },

  divider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginVertical: SPACING.lg,
  },

  sectionTitle: {
    fontSize: FONT.size.lg,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },

  description: {
    fontSize: FONT.size.md,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },

  reviewsCard: {
    marginTop: SPACING.lg,
    minHeight: 76,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    ...SHADOW.card,
  },

  reviewsCardLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },

  reviewIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#FFF3D6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.md,
  },

  reviewsCardContent: {
    flex: 1,
  },

  reviewsCardTitle: {
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },

  reviewsCardSubtitle: {
    marginTop: 4,
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
    lineHeight: 17,
  },

  togetherHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },

  togetherHeadingContent: {
    flex: 1,
  },

  togetherSubtitle: {
    marginTop: 3,
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
    lineHeight: 17,
  },

  togetherCountBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.primaryLight,
  },

  togetherCountText: {
    fontSize: FONT.size.xs,
    fontWeight: FONT.weight.semibold,
    color: COLORS.primary,
  },

  togetherCard: {
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    overflow: "hidden",
    ...SHADOW.card,
  },

  togetherProductRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.md,
    gap: SPACING.sm,
  },

  togetherCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.background,
  },

  togetherCheckboxSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },

  togetherProductDetailsButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },

  togetherImageWrap: {
    width: 58,
    height: 58,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
  },

  togetherImage: {
    width: "82%",
    height: "82%",
  },

  togetherProductInfo: {
    flex: 1,
  },

  togetherProductName: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.semibold,
    color: COLORS.textPrimary,
    lineHeight: 18,
  },

  togetherProductSize: {
    marginTop: 2,
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
  },

  togetherPriceRow: {
    marginTop: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  togetherPrice: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },

  togetherMrp: {
    fontSize: FONT.size.xs,
    color: COLORS.textMuted,
    textDecorationLine: "line-through",
  },

  togetherRowDivider: {
    height: 1,
    marginLeft: 56,
    backgroundColor: COLORS.borderLight,
  },

  togetherFooter: {
    padding: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    backgroundColor: COLORS.background,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
  },

  togetherTotalWrap: {
    flex: 1,
  },

  togetherTotalLabel: {
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
  },

  togetherTotalValue: {
    marginTop: 2,
    fontSize: FONT.size.lg,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },

  addTogetherButton: {
    minHeight: 44,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },

  addTogetherButtonDisabled: {
    opacity: 0.45,
  },

  addTogetherButtonText: {
    color: COLORS.textOnPrimary,
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.bold,
  },

  peopleHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },

  peopleHeaderText: {
    flex: 1,
  },

  peopleSubtitle: {
    marginTop: 3,
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
    lineHeight: 17,
  },

  peopleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.primaryLight,
  },

  peopleBadgeText: {
    fontSize: FONT.size.xs,
    fontWeight: FONT.weight.semibold,
    color: COLORS.primary,
  },

  peopleList: {
    gap: SPACING.md,
    paddingTop: SPACING.xs,
    paddingBottom: SPACING.sm,
  },

  peopleCard: {
    width: 168,
    padding: SPACING.sm,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOW.card,
  },

  peopleMainArea: {
    flex: 1,
  },

  peopleImageWrap: {
    height: 118,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
  },

  peopleImage: {
    width: "78%",
    height: "78%",
  },

  peopleWishlistButton: {
    position: "absolute",
    top: 7,
    right: 7,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },

  peopleWishlistButtonActive: {
    borderColor: COLORS.danger,
  },

  peopleProductName: {
    marginTop: SPACING.sm,
    minHeight: 38,
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.semibold,
    color: COLORS.textPrimary,
    lineHeight: 18,
  },

  peopleProductSize: {
    marginTop: 3,
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
  },

  peoplePriceRow: {
    marginTop: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },

  peoplePrice: {
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },

  peopleMrp: {
    fontSize: FONT.size.xs,
    color: COLORS.textMuted,
    textDecorationLine: "line-through",
  },

  peopleAddButton: {
    marginTop: SPACING.sm,
    minHeight: 38,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },

  peopleAddText: {
    color: COLORS.textOnPrimary,
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.bold,
  },

  similarList: {
    gap: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.sm,
  },

  similarProductWrap: {
    width: 160,
  },

  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    gap: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    ...SHADOW.header,
  },

  stepper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.sm,
    gap: SPACING.sm,
  },

  stepBtn: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },

  stepQty: {
    color: COLORS.textOnPrimary,
    fontWeight: FONT.weight.bold,
    fontSize: FONT.size.lg,
    minWidth: 20,
    textAlign: "center",
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

  flexButton: {
    flex: 1,
  },
});