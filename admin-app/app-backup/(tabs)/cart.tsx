import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/src/components/Button";
import { EmptyState } from "@/src/components/EmptyState";
import { FreeDeliveryProgress } from "@/src/components/FreeDeliveryProgress";
import { useToast } from "@/src/components/Toast";
import { BRAND } from "@/src/config/brand";
import {
  COLORS,
  FONT,
  RADIUS,
  SHADOW,
  SPACING,
} from "@/src/config/theme";
import { useApp } from "@/src/context/AppContext";
import { useProducts } from "@/src/context/ProductContext";
import {
  calcDiscountPercent,
  formatCurrency,
} from "@/src/utils/format";

export default function CartScreen() {
  const router = useRouter();
  const { showToast } = useToast();

  const {
    loading: productsLoading,
    getProductById,
  } = useProducts();

  const {
    cart,
    cartSubtotal,
    deliveryFee,
    cartTotal,
    updateQuantity,
    removeFromCart,
    isWishlisted,
    toggleWishlist,
    savedForLater,
    saveForLater,
    moveSavedItemToCart,
    removeSavedItem,
    clearSavedForLater,
  } = useApp();

  const cartProducts = useMemo(() => {
    return cart
      .map((item) => {
        const product = getProductById(item.productId);

        if (!product) {
          return null;
        }

        return {
          ...item,
          product,
        };
      })
      .filter(Boolean);
  }, [cart, getProductById]);

  const savedProducts = useMemo(() => {
    return savedForLater
      .map((item) => {
        const product = getProductById(
          item.productId,
        );

        if (!product) {
          return null;
        }

        return {
          ...item,
          product,
        };
      })
      .filter(Boolean);
  }, [savedForLater, getProductById]);

  const totalMrp = useMemo(() => {
    return cartProducts.reduce((total, item) => {
      if (!item) return total;

      return (
        total +
        item.product.mrp * item.quantity
      );
    }, 0);
  }, [cartProducts]);

  const productSavings = Math.max(
    totalMrp - cartSubtotal,
    0,
  );

  const totalSavings =
    productSavings +
    (deliveryFee === 0 && cartSubtotal > 0
      ? BRAND.delivery.fee
      : 0);

  const handleQuantityChange = (
    productId: string,
    nextQuantity: number,
  ) => {
    const result = updateQuantity(
      productId,
      nextQuantity,
    );

    if (!result.ok) {
      showToast(
        result.message ??
          "Unable to update quantity",
        "error",
      );
    }
  };

  const handleRemove = (productId: string) => {
    removeFromCart(productId);
    showToast("Item removed from cart", "info");
  };

  const handleProductPress = (
    productId: string,
  ) => {
    router.push({
      pathname: "/product/[id]",
      params: {
        id: productId,
      },
    });
  };

  const handleWishlist = (
    productId: string,
  ) => {
    const result = toggleWishlist(productId);

    showToast(
      result.message,
      result.added ? "success" : "info",
    );
  };

  const handleSaveForLater = (
    productId: string,
  ) => {
    const result = saveForLater(productId);

    showToast(
      result.message ??
        "Unable to save this item.",
      result.ok ? "success" : "error",
    );
  };

  const handleMoveSavedItemToCart = (
    productId: string,
  ) => {
    const result =
      moveSavedItemToCart(productId);

    showToast(
      result.message ??
        "Unable to move this item.",
      result.ok ? "success" : "error",
    );
  };

  const handleRemoveSavedItem = (
    productId: string,
  ) => {
    removeSavedItem(productId);
    showToast(
      "Saved item removed.",
      "info",
    );
  };

  const handleOffersPress = () => {
    router.push("/checkout");
  };

  if (productsLoading) {
    return (
      <SafeAreaView
        style={styles.container}
        edges={["top"]}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>
              My Cart
            </Text>

            <Text style={styles.subtitle}>
              Syncing live products…
            </Text>
          </View>
        </View>

        <View style={styles.loadingWrap}>
          <Ionicons
            name="cloud-download-outline"
            size={42}
            color={COLORS.primary}
          />

          <Text style={styles.loadingTitle}>
            Loading your cart
          </Text>

          <Text style={styles.loadingText}>
            Syncing the latest prices and stock from Firebase.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (
    cart.length === 0 &&
    savedForLater.length === 0
  ) {
    return (
      <SafeAreaView
        style={styles.container}
        edges={["top"]}
      >
        <View style={styles.header}>
          <Text style={styles.title}>
            My Cart
          </Text>
        </View>

        <EmptyState
          icon="cart-outline"
          title="Your cart is empty"
          description="Add fresh essentials from Raha Supermarket to get started."
        >
          <Button
            label="Continue Shopping"
            onPress={() =>
              router.push("/(tabs)")
            }
            testID="empty-cart-shop"
          />
        </EmptyState>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={styles.container}
      edges={["top"]}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>
            My Cart
          </Text>

          <Text style={styles.subtitle}>
            {cart.length > 0
              ? `${cart.length} item${
                  cart.length !== 1 ? "s" : ""
                } in your cart`
              : `${savedForLater.length} saved item${
                  savedForLater.length !== 1
                    ? "s"
                    : ""
                }`}
          </Text>
        </View>

        <View style={styles.secureBadge}>
          <Ionicons
            name="shield-checkmark"
            size={15}
            color={COLORS.primary}
          />

          <Text style={styles.secureBadgeText}>
            Secure
          </Text>
        </View>
      </View>

      <FlatList
        data={cart}
        keyExtractor={(item) => item.productId}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <FreeDeliveryProgress
              subtotal={cartSubtotal}
            />

            <View style={styles.deliveryCard}>
              <View style={styles.deliveryIcon}>
                <Ionicons
                  name="flash"
                  size={20}
                  color={COLORS.primary}
                />
              </View>

              <View style={styles.deliveryContent}>
                <Text style={styles.deliveryTitle}>
                  Delivery from Raha Supermarket
                </Text>

                <Text
                  style={styles.deliveryDescription}
                >
                  Estimated delivery during store
                  hours
                </Text>
              </View>

              <Ionicons
                name="checkmark-circle"
                size={22}
                color={COLORS.primary}
              />
            </View>

            {totalSavings > 0 ? (
              <View style={styles.savingsBanner}>
                <Ionicons
                  name="pricetag"
                  size={18}
                  color={COLORS.primary}
                />

                <Text
                  style={styles.savingsBannerText}
                >
                  You are saving{" "}
                  <Text
                    style={styles.savingsAmount}
                  >
                    {formatCurrency(totalSavings)}
                  </Text>{" "}
                  on this order
                </Text>
              </View>
            ) : null}

            <Text style={styles.sectionTitle}>
              Cart Items
            </Text>
          </View>
        }
        ItemSeparatorComponent={() => (
          <View style={styles.itemSeparator} />
        )}
        renderItem={({ item }) => {
          const product = getProductById(
            item.productId,
          );

          if (!product) {
            return null;
          }

          const discount = calcDiscountPercent(
            product.mrp,
            product.price,
          );

          const itemSaving =
            Math.max(
              product.mrp - product.price,
              0,
            ) * item.quantity;

          const wishlisted = isWishlisted(
            product.id,
          );

          const isOutOfStock =
            product.stock <= 0;

          const isLowStock =
            product.stock > 0 &&
            product.stock <= 5;

          return (
            <View
              style={styles.itemCard}
              testID={`cart-item-${product.id}`}
            >
              <TouchableOpacity
                activeOpacity={0.82}
                style={styles.itemImageSection}
                onPress={() =>
                  handleProductPress(product.id)
                }
                accessibilityRole="button"
                accessibilityLabel={`View ${product.name} details`}
              >
                <View
                  style={styles.itemImageWrapper}
                >
                  <Image
                    source={{
                      uri: product.image,
                    }}
                    style={styles.itemImage}
                    contentFit="contain"
                  />

                  {discount > 0 ? (
                    <View
                      style={styles.discountBadge}
                    >
                      <Text
                        style={
                          styles.discountBadgeText
                        }
                      >
                        {discount}% OFF
                      </Text>
                    </View>
                  ) : null}
                </View>

                <View style={styles.viewDetailsHint}>
                  <Text
                    style={styles.viewDetailsText}
                  >
                    View details
                  </Text>

                  <Ionicons
                    name="chevron-forward"
                    size={12}
                    color={COLORS.primary}
                  />
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.82}
                style={styles.itemInformation}
                onPress={() =>
                  handleProductPress(product.id)
                }
                accessibilityRole="button"
                accessibilityLabel={`Open ${product.name}`}
              >
                <Text
                  style={styles.itemName}
                  numberOfLines={2}
                >
                  {product.name}
                </Text>

                <Text style={styles.itemSize}>
                  {product.size}
                </Text>

                <View style={styles.priceRow}>
                  <Text style={styles.itemPrice}>
                    {formatCurrency(
                      product.price,
                    )}
                  </Text>

                  {discount > 0 ? (
                    <Text style={styles.itemMrp}>
                      {formatCurrency(
                        product.mrp,
                      )}
                    </Text>
                  ) : null}
                </View>

                {itemSaving > 0 ? (
                  <Text style={styles.itemSaving}>
                    Save{" "}
                    {formatCurrency(itemSaving)}
                  </Text>
                ) : null}

                <View style={styles.stockRow}>
                  <Ionicons
                    name={
                      isOutOfStock
                        ? "close-circle"
                        : isLowStock
                          ? "alert-circle"
                          : "checkmark-circle"
                    }
                    size={14}
                    color={
                      isOutOfStock
                        ? COLORS.danger
                        : isLowStock
                          ? "#F59E0B"
                          : COLORS.primary
                    }
                  />

                  <Text
                    style={[
                      styles.stockText,
                      isOutOfStock &&
                        styles.stockTextDanger,
                      isLowStock &&
                        styles.stockTextWarning,
                    ]}
                  >
                    {isOutOfStock
                      ? "Out of stock"
                      : isLowStock
                        ? `Only ${product.stock} left`
                        : "In stock"}
                  </Text>
                </View>

                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={() =>
                    handleSaveForLater(
                      product.id,
                    )
                  }
                  style={
                    styles.saveForLaterInlineButton
                  }
                  accessibilityRole="button"
                  accessibilityLabel={`Save ${product.name} for later`}
                >
                  <Ionicons
                    name="bookmark-outline"
                    size={15}
                    color={COLORS.primary}
                  />

                  <Text
                    style={
                      styles.saveForLaterInlineText
                    }
                  >
                    Save for later
                  </Text>
                </TouchableOpacity>
              </TouchableOpacity>

              <View style={styles.itemActions}>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() =>
                    handleRemove(product.id)
                  }
                  hitSlop={8}
                  testID={`cart-remove-${product.id}`}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${product.name} from cart`}
                >
                  <Ionicons
                    name="trash-outline"
                    size={19}
                    color={COLORS.danger}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.wishlistButton,
                    wishlisted &&
                      styles.wishlistButtonActive,
                  ]}
                  onPress={() =>
                    handleWishlist(product.id)
                  }
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={
                    wishlisted
                      ? `Remove ${product.name} from wishlist`
                      : `Add ${product.name} to wishlist`
                  }
                >
                  <Ionicons
                    name={
                      wishlisted
                        ? "heart"
                        : "heart-outline"
                    }
                    size={18}
                    color={
                      wishlisted
                        ? COLORS.danger
                        : COLORS.textSecondary
                    }
                  />
                </TouchableOpacity>

                <View style={styles.stepper}>
                  <TouchableOpacity
                    style={styles.stepButton}
                    onPress={() =>
                      handleQuantityChange(
                        product.id,
                        item.quantity - 1,
                      )
                    }
                    testID={`cart-dec-${product.id}`}
                    accessibilityRole="button"
                    accessibilityLabel={`Decrease ${product.name} quantity`}
                  >
                    <Ionicons
                      name="remove"
                      size={17}
                      color={COLORS.primary}
                    />
                  </TouchableOpacity>

                  <Text
                    style={styles.stepQuantity}
                  >
                    {item.quantity}
                  </Text>

                  <TouchableOpacity
                    style={styles.stepButton}
                    onPress={() =>
                      handleQuantityChange(
                        product.id,
                        item.quantity + 1,
                      )
                    }
                    disabled={
                      isOutOfStock ||
                      item.quantity >=
                        product.stock
                    }
                    testID={`cart-inc-${product.id}`}
                    accessibilityRole="button"
                    accessibilityLabel={`Increase ${product.name} quantity`}
                  >
                    <Ionicons
                      name="add"
                      size={17}
                      color={
                        isOutOfStock ||
                        item.quantity >=
                          product.stock
                          ? COLORS.textMuted
                          : COLORS.primary
                      }
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        }}
        ListFooterComponent={
          <View style={styles.footerContent}>
            {savedProducts.length > 0 ? (
              <View style={styles.savedSection}>
                <View style={styles.savedSectionHeader}>
                  <View>
                    <Text style={styles.savedSectionTitle}>
                      Saved for Later
                    </Text>

                    <Text style={styles.savedSectionSubtitle}>
                      {savedProducts.length} item
                      {savedProducts.length !== 1
                        ? "s"
                        : ""}{" "}
                      saved
                    </Text>
                  </View>

                  <TouchableOpacity
                    activeOpacity={0.75}
                    onPress={() => {
                      clearSavedForLater();
                      showToast(
                        "Saved items cleared.",
                        "info",
                      );
                    }}
                    style={styles.clearSavedButton}
                    accessibilityRole="button"
                    accessibilityLabel="Clear all saved items"
                  >
                    <Text style={styles.clearSavedText}>
                      Clear all
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.savedList}>
                  {savedProducts.map((savedItem) => {
                    if (!savedItem) {
                      return null;
                    }

                    const { product } = savedItem;
                    const isOutOfStock =
                      product.stock <= 0;
                    const isLowStock =
                      product.stock > 0 &&
                      product.stock <= 5;
                    const discount =
                      calcDiscountPercent(
                        product.mrp,
                        product.price,
                      );

                    return (
                      <View
                        key={product.id}
                        style={styles.savedCard}
                      >
                        <TouchableOpacity
                          activeOpacity={0.82}
                          onPress={() =>
                            handleProductPress(
                              product.id,
                            )
                          }
                          style={styles.savedImageWrap}
                          accessibilityRole="button"
                          accessibilityLabel={`View ${product.name}`}
                        >
                          <Image
                            source={{
                              uri: product.image,
                            }}
                            style={styles.savedImage}
                            contentFit="contain"
                          />

                          {discount > 0 ? (
                            <View
                              style={
                                styles.savedDiscountBadge
                              }
                            >
                              <Text
                                style={
                                  styles.savedDiscountText
                                }
                              >
                                {discount}% OFF
                              </Text>
                            </View>
                          ) : null}
                        </TouchableOpacity>

                        <View
                          style={
                            styles.savedInformation
                          }
                        >
                          <TouchableOpacity
                            activeOpacity={0.82}
                            onPress={() =>
                              handleProductPress(
                                product.id,
                              )
                            }
                          >
                            <Text
                              style={
                                styles.savedProductName
                              }
                              numberOfLines={2}
                            >
                              {product.name}
                            </Text>

                            <Text
                              style={
                                styles.savedProductSize
                              }
                            >
                              {product.size}
                            </Text>
                          </TouchableOpacity>

                          <View
                            style={
                              styles.savedPriceRow
                            }
                          >
                            <Text
                              style={styles.savedPrice}
                            >
                              {formatCurrency(
                                product.price,
                              )}
                            </Text>

                            {product.mrp >
                            product.price ? (
                              <Text
                                style={
                                  styles.savedMrp
                                }
                              >
                                {formatCurrency(
                                  product.mrp,
                                )}
                              </Text>
                            ) : null}
                          </View>

                          <View
                            style={
                              styles.savedStockRow
                            }
                          >
                            <Ionicons
                              name={
                                isOutOfStock
                                  ? "close-circle"
                                  : isLowStock
                                    ? "alert-circle"
                                    : "checkmark-circle"
                              }
                              size={14}
                              color={
                                isOutOfStock
                                  ? COLORS.danger
                                  : isLowStock
                                    ? "#F59E0B"
                                    : COLORS.primary
                              }
                            />

                            <Text
                              style={[
                                styles.savedStockText,
                                isOutOfStock &&
                                  styles.stockTextDanger,
                                isLowStock &&
                                  styles.stockTextWarning,
                              ]}
                            >
                              {isOutOfStock
                                ? "Out of stock"
                                : isLowStock
                                  ? `Only ${product.stock} left`
                                  : "In stock"}
                            </Text>
                          </View>

                          <Text
                            style={
                              styles.savedQuantityText
                            }
                          >
                            Saved quantity:{" "}
                            {savedItem.quantity}
                          </Text>

                          <View
                            style={
                              styles.savedActionsRow
                            }
                          >
                            <TouchableOpacity
                              activeOpacity={0.8}
                              disabled={isOutOfStock}
                              onPress={() =>
                                handleMoveSavedItemToCart(
                                  product.id,
                                )
                              }
                              style={[
                                styles.moveToCartButton,
                                isOutOfStock &&
                                  styles.moveToCartButtonDisabled,
                              ]}
                              accessibilityRole="button"
                              accessibilityLabel={`Move ${product.name} to cart`}
                            >
                              <Ionicons
                                name="cart-outline"
                                size={16}
                                color={
                                  isOutOfStock
                                    ? COLORS.textMuted
                                    : COLORS.textOnPrimary
                                }
                              />

                              <Text
                                style={[
                                  styles.moveToCartText,
                                  isOutOfStock &&
                                    styles.moveToCartTextDisabled,
                                ]}
                              >
                                Move to Cart
                              </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              activeOpacity={0.8}
                              onPress={() =>
                                handleRemoveSavedItem(
                                  product.id,
                                )
                              }
                              style={
                                styles.removeSavedButton
                              }
                              accessibilityRole="button"
                              accessibilityLabel={`Delete ${product.name} from saved items`}
                            >
                              <Ionicons
                                name="trash-outline"
                                size={17}
                                color={COLORS.danger}
                              />
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            ) : null}

            {cart.length > 0 ? (
              <>
            <View style={styles.offerCard}>
              <View style={styles.offerHeader}>
                <View style={styles.offerIcon}>
                  <Ionicons
                    name="gift"
                    size={22}
                    color={COLORS.primary}
                  />
                </View>

                <View
                  style={
                    styles.offerHeadingContent
                  }
                >
                  <Text style={styles.offerTitle}>
                    Coupons & Rewards
                  </Text>

                  <Text
                    style={styles.offerSubtitle}
                  >
                    Apply promo codes, cashback
                    and points at checkout
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.offerButton}
                onPress={handleOffersPress}
                activeOpacity={0.8}
              >
                <Text
                  style={styles.offerButtonText}
                >
                  View available offers
                </Text>

                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={COLORS.primary}
                />
              </TouchableOpacity>

              <View style={styles.rewardOptions}>
                <View style={styles.rewardOption}>
                  <Ionicons
                    name="ticket-outline"
                    size={18}
                    color={COLORS.primary}
                  />

                  <Text
                    style={
                      styles.rewardOptionText
                    }
                  >
                    Promo Code
                  </Text>
                </View>

                <View
                  style={styles.rewardDivider}
                />

                <View style={styles.rewardOption}>
                  <Ionicons
                    name="wallet-outline"
                    size={18}
                    color={COLORS.primary}
                  />

                  <Text
                    style={
                      styles.rewardOptionText
                    }
                  >
                    Cashback
                  </Text>
                </View>

                <View
                  style={styles.rewardDivider}
                />

                <View style={styles.rewardOption}>
                  <Ionicons
                    name="star-outline"
                    size={18}
                    color={COLORS.primary}
                  />

                  <Text
                    style={
                      styles.rewardOptionText
                    }
                  >
                    Points
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.summary}>
              <Text style={styles.summaryTitle}>
                Bill Details
              </Text>

              <View style={styles.billRow}>
                <Text style={styles.rowLabel}>
                  Item MRP
                </Text>

                <Text style={styles.rowValue}>
                  {formatCurrency(totalMrp)}
                </Text>
              </View>

              {productSavings > 0 ? (
                <View style={styles.billRow}>
                  <Text style={styles.rowLabel}>
                    Product Discount
                  </Text>

                  <Text
                    style={styles.discountValue}
                  >
                    −{" "}
                    {formatCurrency(
                      productSavings,
                    )}
                  </Text>
                </View>
              ) : null}

              <View style={styles.billRow}>
                <Text style={styles.rowLabel}>
                  Item Total
                </Text>

                <Text style={styles.rowValue}>
                  {formatCurrency(
                    cartSubtotal,
                  )}
                </Text>
              </View>

              <View style={styles.billRow}>
                <View
                  style={
                    styles.deliveryFeeLabel
                  }
                >
                  <Text style={styles.rowLabel}>
                    Delivery Fee
                  </Text>

                  <Ionicons
                    name="information-circle-outline"
                    size={16}
                    color={COLORS.textMuted}
                  />
                </View>

                {deliveryFee === 0 ? (
                  <View
                    style={
                      styles.freeDeliveryRow
                    }
                  >
                    <Text
                      style={styles.strikeValue}
                    >
                      {formatCurrency(
                        BRAND.delivery.fee,
                      )}
                    </Text>

                    <Text
                      style={styles.freeText}
                    >
                      FREE
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.rowValue}>
                    {formatCurrency(
                      deliveryFee,
                    )}
                  </Text>
                )}
              </View>

              <View style={styles.divider} />

              <View style={styles.billRow}>
                <Text style={styles.totalLabel}>
                  To Pay
                </Text>

                <Text
                  style={styles.totalValue}
                  testID="cart-total"
                >
                  {formatCurrency(cartTotal)}
                </Text>
              </View>

              {totalSavings > 0 ? (
                <View
                  style={
                    styles.totalSavingsRow
                  }
                >
                  <Ionicons
                    name="sparkles"
                    size={16}
                    color={COLORS.primary}
                  />

                  <Text
                    style={
                      styles.totalSavingsText
                    }
                  >
                    Your total savings are{" "}
                    {formatCurrency(
                      totalSavings,
                    )}
                  </Text>
                </View>
              ) : null}
            </View>

            <View
              style={styles.checkoutBenefits}
            >
              <View style={styles.benefitItem}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={20}
                  color={COLORS.primary}
                />

                <Text style={styles.benefitText}>
                  Secure payment
                </Text>
              </View>

              <View style={styles.benefitItem}>
                <Ionicons
                  name="refresh-outline"
                  size={20}
                  color={COLORS.primary}
                />

                <Text style={styles.benefitText}>
                  Easy replacement
                </Text>
              </View>

              <View style={styles.benefitItem}>
                <Ionicons
                  name="storefront-outline"
                  size={20}
                  color={COLORS.primary}
                />

                <Text style={styles.benefitText}>
                  Local store support
                </Text>
              </View>
            </View>
              </>
            ) : null}
          </View>
        }
      />

      {cart.length > 0 ? (
        <View style={styles.checkoutFooter}>
        <View
          style={
            styles.checkoutAmountSection
          }
        >
          {totalSavings > 0 ? (
            <Text
              style={styles.checkoutSaving}
            >
              Save{" "}
              {formatCurrency(totalSavings)}
            </Text>
          ) : null}

          <Text
            style={styles.checkoutTotalLabel}
          >
            Total
          </Text>

          <Text style={styles.checkoutTotal}>
            {formatCurrency(cartTotal)}
          </Text>
        </View>

        <View
          style={styles.checkoutButtonWrapper}
        >
          <Button
            label="Checkout"
            onPress={() =>
              router.push("/checkout")
            }
            size="lg"
            testID="proceed-to-checkout"
            rightIcon={
              <Ionicons
                name="arrow-forward"
                size={18}
                color={COLORS.textOnPrimary}
              />
            }
          />
        </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  title: {
    fontSize: FONT.size.xxl,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },

  subtitle: {
    marginTop: 2,
    fontSize: FONT.size.sm,
    color: COLORS.textSecondary,
  },

  secureBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
  },

  secureBadgeText: {
    fontSize: FONT.size.xs,
    fontWeight: FONT.weight.semibold,
    color: COLORS.primary,
  },

  list: {
    paddingHorizontal: SPACING.md,
    paddingBottom: 150,
  },

  listHeader: {
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },

  deliveryCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },

  deliveryIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surface,
  },

  deliveryContent: {
    flex: 1,
  },

  deliveryTitle: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.semibold,
    color: COLORS.textPrimary,
  },

  deliveryDescription: {
    marginTop: 2,
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
  },

  savingsBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
  },

  savingsBannerText: {
    flex: 1,
    fontSize: FONT.size.sm,
    color: COLORS.textSecondary,
  },

  savingsAmount: {
    fontWeight: FONT.weight.bold,
    color: COLORS.primary,
  },

  sectionTitle: {
    marginTop: SPACING.xs,
    fontSize: FONT.size.lg,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },

  itemSeparator: {
    height: SPACING.md,
  },

  itemCard: {
    flexDirection: "row",
    gap: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOW.card,
  },

  itemImageSection: {
    alignItems: "center",
  },

  itemImageWrapper: {
    width: 82,
    height: 82,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },

  itemImage: {
    width: "82%",
    height: "82%",
  },

  discountBadge: {
    position: "absolute",
    top: -6,
    left: -6,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primary,
  },

  discountBadgeText: {
    fontSize: 9,
    fontWeight: FONT.weight.bold,
    color: COLORS.textOnPrimary,
  },

  viewDetailsHint: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 1,
  },

  viewDetailsText: {
    fontSize: 10,
    color: COLORS.primary,
    fontWeight: FONT.weight.semibold,
  },

  itemInformation: {
    flex: 1,
  },

  itemName: {
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.semibold,
    color: COLORS.textPrimary,
    lineHeight: 20,
  },

  itemSize: {
    marginTop: 3,
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
  },

  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 7,
  },

  itemPrice: {
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },

  itemMrp: {
    fontSize: FONT.size.xs,
    color: COLORS.textMuted,
    textDecorationLine: "line-through",
  },

  itemSaving: {
    marginTop: 3,
    fontSize: FONT.size.xs,
    fontWeight: FONT.weight.semibold,
    color: COLORS.primary,
  },

  stockRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },

  stockText: {
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
  },

  stockTextDanger: {
    color: COLORS.danger,
  },

  stockTextWarning: {
    color: "#B45309",
  },

  saveForLaterInlineButton: {
    marginTop: 8,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 4,
  },

  saveForLaterInlineText: {
    fontSize: FONT.size.xs,
    fontWeight: FONT.weight.semibold,
    color: COLORS.primary,
  },

  itemActions: {
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: SPACING.sm,
  },

  removeButton: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surface,
  },

  wishlistButton: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },

  wishlistButtonActive: {
    borderColor: COLORS.danger,
    backgroundColor: "#FFF1F2",
  },

  stepper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
    overflow: "hidden",
  },

  stepButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surface,
  },

  stepQuantity: {
    minWidth: 30,
    textAlign: "center",
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.bold,
    color: COLORS.primary,
  },

  savedSection: {
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOW.card,
  },

  savedSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: SPACING.md,
  },

  savedSectionTitle: {
    fontSize: FONT.size.lg,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },

  savedSectionSubtitle: {
    marginTop: 2,
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
  },

  clearSavedButton: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 7,
  },

  clearSavedText: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.semibold,
    color: COLORS.danger,
  },

  savedList: {
    gap: SPACING.md,
  },

  savedCard: {
    flexDirection: "row",
    gap: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },

  savedImageWrap: {
    width: 88,
    height: 88,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },

  savedImage: {
    width: "82%",
    height: "82%",
  },

  savedDiscountBadge: {
    position: "absolute",
    top: -5,
    left: -5,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primary,
  },

  savedDiscountText: {
    fontSize: 9,
    fontWeight: FONT.weight.bold,
    color: COLORS.textOnPrimary,
  },

  savedInformation: {
    flex: 1,
  },

  savedProductName: {
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.semibold,
    color: COLORS.textPrimary,
    lineHeight: 20,
  },

  savedProductSize: {
    marginTop: 3,
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
  },

  savedPriceRow: {
    marginTop: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  savedPrice: {
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },

  savedMrp: {
    fontSize: FONT.size.xs,
    color: COLORS.textMuted,
    textDecorationLine: "line-through",
  },

  savedStockRow: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  savedStockText: {
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
  },

  savedQuantityText: {
    marginTop: 5,
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
  },

  savedActionsRow: {
    marginTop: SPACING.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },

  moveToCartButton: {
    flex: 1,
    minHeight: 38,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  moveToCartButtonDisabled: {
    backgroundColor: COLORS.borderLight,
  },

  moveToCartText: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.bold,
    color: COLORS.textOnPrimary,
  },

  moveToCartTextDisabled: {
    color: COLORS.textMuted,
  },

  removeSavedButton: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.md,
    backgroundColor: "#FFF1F2",
    alignItems: "center",
    justifyContent: "center",
  },

  footerContent: {
    gap: SPACING.md,
    marginTop: SPACING.lg,
  },

  offerCard: {
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },

  offerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },

  offerIcon: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surface,
  },

  offerHeadingContent: {
    flex: 1,
  },

  offerTitle: {
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },

  offerSubtitle: {
    marginTop: 2,
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
  },

  offerButton: {
    marginTop: SPACING.md,
    paddingVertical: SPACING.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },

  offerButtonText: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.semibold,
    color: COLORS.primary,
  },

  rewardOptions: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },

  rewardOption: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },

  rewardOptionText: {
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
  },

  rewardDivider: {
    width: 1,
    height: 30,
    backgroundColor: COLORS.borderLight,
  },

  summary: {
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    gap: SPACING.sm,
  },

  summaryTitle: {
    marginBottom: SPACING.xs,
    fontSize: FONT.size.lg,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },

  billRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  rowLabel: {
    fontSize: FONT.size.sm,
    color: COLORS.textSecondary,
  },

  rowValue: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.semibold,
    color: COLORS.textPrimary,
  },

  discountValue: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.semibold,
    color: COLORS.primary,
  },

  deliveryFeeLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  freeDeliveryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  strikeValue: {
    fontSize: FONT.size.sm,
    color: COLORS.textMuted,
    textDecorationLine: "line-through",
  },

  freeText: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.bold,
    color: COLORS.primary,
  },

  divider: {
    height: 1,
    marginVertical: SPACING.sm,
    backgroundColor: COLORS.borderLight,
  },

  totalLabel: {
    fontSize: FONT.size.lg,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },

  totalValue: {
    fontSize: FONT.size.xl,
    fontWeight: FONT.weight.bold,
    color: COLORS.primary,
  },

  totalSavingsRow: {
    marginTop: SPACING.sm,
    padding: SPACING.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
  },

  totalSavingsText: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.semibold,
    color: COLORS.primary,
  },

  checkoutBenefits: {
    padding: SPACING.md,
    flexDirection: "row",
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
  },

  benefitItem: {
    flex: 1,
    alignItems: "center",
    gap: 5,
  },

  benefitText: {
    fontSize: 10,
    textAlign: "center",
    color: COLORS.textSecondary,
  },

  checkoutFooter: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    ...SHADOW.card,
  },

  checkoutAmountSection: {
    minWidth: 100,
  },

  checkoutSaving: {
    marginBottom: 2,
    fontSize: FONT.size.xs,
    fontWeight: FONT.weight.semibold,
    color: COLORS.primary,
  },

  checkoutTotalLabel: {
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
  },

  checkoutTotal: {
    fontSize: FONT.size.lg,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },

  checkoutButtonWrapper: {
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
    maxWidth: 290,
    textAlign: "center",
    fontSize: FONT.size.sm,
    lineHeight: 20,
    color: COLORS.textSecondary,
  },
});