import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { EmptyState } from "@/src/components/EmptyState";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { StatusPill } from "@/src/components/StatusPill";
import { COLORS, FONT, RADIUS, SPACING } from "@/src/config/theme";
import { useApp } from "@/src/context/AppContext";
import type { OrderItem, OrderStatus } from "@/src/types";
import { formatCurrency, formatDateTime } from "@/src/utils/format";
import {
  getInvoiceNumber,
  printInvoice,
  shareInvoicePdf,
  type InvoiceOrder,
} from "@/src/utils/invoice";

const STORE_PHONE = "8130011378";

type TimelineStep = {
  key: OrderStatus;
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const TIMELINE: TimelineStep[] = [
  {
    key: "placed",
    label: "Order Placed",
    description: "We have received your order.",
    icon: "receipt-outline",
  },
  {
    key: "confirmed",
    label: "Order Confirmed",
    description: "Raha Supermarket has confirmed your order.",
    icon: "checkmark-done-outline",
  },
  {
    key: "preparing",
    label: "Packing Items",
    description: "Your grocery items are being packed carefully.",
    icon: "cube-outline",
  },
  {
    key: "out-for-delivery",
    label: "Out for Delivery",
    description: "Your order is on the way to your address.",
    icon: "bicycle-outline",
  },
  {
    key: "delivered",
    label: "Delivered",
    description: "Your order has been delivered successfully.",
    icon: "home-outline",
  },
];

const STATUS_LABEL: Record<OrderStatus, string> = {
  placed: "Order Placed",
  confirmed: "Confirmed",
  preparing: "Packing",
  "out-for-delivery": "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const STATUS_DESCRIPTION: Record<OrderStatus, string> = {
  placed: "Your order has been received successfully.",
  confirmed: "The store has confirmed your order.",
  preparing: "Your grocery items are being packed.",
  "out-for-delivery": "Your order is currently on the way.",
  delivered: "Your order has been delivered successfully.",
  cancelled: "This order was cancelled.",
};

const STATUS_ICON: Record<OrderStatus, keyof typeof Ionicons.glyphMap> = {
  placed: "receipt-outline",
  confirmed: "checkmark-circle-outline",
  preparing: "cube-outline",
  "out-for-delivery": "bicycle-outline",
  delivered: "checkmark-done-circle-outline",
  cancelled: "close-circle-outline",
};

const STATUS_TONE: Record<
  OrderStatus,
  "primary" | "warning" | "info" | "success" | "danger"
> = {
  placed: "info",
  confirmed: "info",
  preparing: "warning",
  "out-for-delivery": "warning",
  delivered: "success",
  cancelled: "danger",
};

export default function OrderDetails() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();

  const { getOrderById, reorderOrder, cancelOrder } = useApp();
  const [invoiceBusy, setInvoiceBusy] = useState<
    "share" | "print" | null
  >(null);

  const orderId = Array.isArray(params.id) ? params.id[0] : params.id ?? "";
  const order = getOrderById(orderId);

  const pulseAnimation = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnimation, {
          toValue: 1.13,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnimation, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [pulseAnimation]);

  const estimatedDelivery = useMemo(() => {
    if (!order) return "";

    return getEstimatedDelivery(
      order.createdAt,
      order.status,
      order.estimatedDeliveryMinutes,
    );
  }, [order]);

  const totalSavings = useMemo(() => {
    if (!order) return 0;
    return calculateSavings(order.items);
  }, [order]);

  if (!order) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title="Order Details" />

        <EmptyState
          icon="alert-circle-outline"
          title="Order not found"
          description="This order may have been removed or is no longer available."
        />
      </SafeAreaView>
    );
  }

  const isCancelled = order.status === "cancelled";
  const isDelivered = order.status === "delivered";

  const activeStepIndex = TIMELINE.findIndex((step) => step.key === order.status);

  const callStore = async () => {
    try {
      await Linking.openURL(`tel:${STORE_PHONE}`);
    } catch {
      Alert.alert(
        "Unable to call",
        `Please call Raha Supermarket at +91 ${STORE_PHONE}.`,
      );
    }
  };

  const openWhatsApp = async () => {
    const message = encodeURIComponent(
      `Hello Raha Supermarket, I need help with order #${shortOrderId(order.id)}.`,
    );

    const url = `https://wa.me/91${STORE_PHONE}?text=${message}`;

    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert(
        "WhatsApp unavailable",
        `Please contact Raha Supermarket at +91 ${STORE_PHONE}.`,
      );
    }
  };

  const reorder = () => {
    const result = reorderOrder(order.id);

    if (!result.ok) {
      Alert.alert(
        "Unable to Reorder",
        result.message ?? "Products could not be added to the cart.",
      );
      return;
    }

    Alert.alert(
      "Added to Cart",
      result.message ?? "Order items have been added to your cart.",
      [
        {
          text: "Continue Shopping",
          style: "cancel",
        },
        {
          text: "View Cart",
          onPress: () => router.push("/(tabs)/cart" as any),
        },
      ],
    );
  };

  const handleInvoiceShare = async () => {
    if (invoiceBusy) return;

    setInvoiceBusy("share");

    try {
      await shareInvoicePdf(
        order as InvoiceOrder,
      );
    } catch (error) {
      console.error(
        "Invoice share error:",
        error,
      );

      Alert.alert(
        "Invoice unavailable",
        "The invoice PDF could not be generated or shared.",
      );
    } finally {
      setInvoiceBusy(null);
    }
  };

  const handleInvoicePrint = async () => {
    if (invoiceBusy) return;

    setInvoiceBusy("print");

    try {
      await printInvoice(
        order as InvoiceOrder,
      );
    } catch (error) {
      console.error(
        "Invoice print error:",
        error,
      );

      Alert.alert(
        "Unable to print",
        "The invoice could not be opened for printing.",
      );
    } finally {
      setInvoiceBusy(null);
    }
  };

  const handleCancelOrder = () => {
    const confirmCancel = () => {
      const result = cancelOrder(order.id);

      if (!result.ok) {
        if (Platform.OS === "web") {
          window.alert(
            result.message ?? "This order could not be cancelled.",
          );
        } else {
          Alert.alert(
            "Unable to Cancel",
            result.message ?? "This order could not be cancelled.",
          );
        }
        return;
      }

      if (Platform.OS === "web") {
        window.alert(
          result.message ?? "Your order has been cancelled successfully.",
        );
      } else {
        Alert.alert(
          "Order Cancelled",
          result.message ?? "Your order has been cancelled successfully.",
        );
      }
    };

    // RN-web's Alert.alert is a no-op, so use the browser confirm there.
    if (Platform.OS === "web") {
      if (window.confirm("Are you sure you want to cancel this order?")) {
        confirmCancel();
      }
      return;
    }

    Alert.alert(
      "Cancel Order",
      "Are you sure you want to cancel this order?",
      [
        {
          text: "Keep Order",
          style: "cancel",
        },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: confirmCancel,
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScreenHeader
        title={`Order #${shortOrderId(order.id)}`}
        subtitle={formatDateTime(order.createdAt)}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[styles.statusHero, isCancelled && styles.statusHeroCancelled]}
        >
          <View
            style={[styles.heroIcon, isCancelled && styles.heroIconCancelled]}
          >
            <Ionicons
              name={STATUS_ICON[order.status]}
              size={30}
              color={isCancelled ? COLORS.danger : COLORS.primary}
            />
          </View>

          <View style={styles.heroContent}>
            <Text style={styles.heroEyebrow}>CURRENT STATUS</Text>

            <Text style={styles.heroTitle}>
              {STATUS_LABEL[order.status]}
            </Text>

            <Text style={styles.heroDescription}>
              {STATUS_DESCRIPTION[order.status]}
            </Text>
          </View>

          <StatusPill
            label={STATUS_LABEL[order.status]}
            tone={STATUS_TONE[order.status]}
          />
        </View>

        {!isCancelled && (
          <View style={styles.estimatedCard}>
            <View style={styles.estimatedIcon}>
              <Ionicons
                name={
                  isDelivered
                    ? "checkmark-circle-outline"
                    : "time-outline"
                }
                size={25}
                color={COLORS.primary}
              />
            </View>

            <View style={styles.estimatedContent}>
              <Text style={styles.estimatedLabel}>
                {isDelivered
                  ? "DELIVERY COMPLETED"
                  : "ESTIMATED DELIVERY"}
              </Text>

              <Text style={styles.estimatedValue}>
                {estimatedDelivery}
              </Text>

              {!isDelivered && (
                <Text style={styles.estimatedNote}>
                  Delivery time may vary depending on order volume.
                </Text>
              )}
            </View>
          </View>
        )}

        <View style={styles.card}>
          <View style={styles.sectionHeadingRow}>
            <View>
              <Text style={styles.sectionTitle}>Track Order</Text>
              <Text style={styles.sectionSubtitle}>
                Follow your order progress
              </Text>
            </View>

            <Ionicons
              name="location-outline"
              size={23}
              color={COLORS.primary}
            />
          </View>

          {isCancelled ? (
            <View style={styles.cancelBox}>
              <Ionicons
                name="close-circle"
                size={25}
                color={COLORS.danger}
              />

              <View style={styles.cancelContent}>
                <Text style={styles.cancelTitle}>Order Cancelled</Text>
                <Text style={styles.cancelText}>
                  This order will not be processed or delivered.
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.timeline}>
              {TIMELINE.map((step, index) => {
                const completed = index <= activeStepIndex;
                const current = index === activeStepIndex;
                const isLast = index === TIMELINE.length - 1;

                return (
                  <View key={step.key} style={styles.stepRow}>
                    <View style={styles.stepIconColumn}>
                      {current ? (
                        <Animated.View
                          style={[
                            styles.stepDot,
                            styles.stepDotCompleted,
                            styles.stepDotCurrent,
                            {
                              transform: [{ scale: pulseAnimation }],
                            },
                          ]}
                        >
                          <Ionicons
                            name="checkmark"
                            size={16}
                            color={COLORS.textOnPrimary}
                          />
                        </Animated.View>
                      ) : (
                        <View
                          style={[
                            styles.stepDot,
                            completed && styles.stepDotCompleted,
                          ]}
                        >
                          <Ionicons
                            name={completed ? "checkmark" : step.icon}
                            size={15}
                            color={
                              completed
                                ? COLORS.textOnPrimary
                                : COLORS.textMuted
                            }
                          />
                        </View>
                      )}

                      {!isLast && (
                        <View
                          style={[
                            styles.stepLine,
                            index < activeStepIndex &&
                              styles.stepLineCompleted,
                          ]}
                        />
                      )}
                    </View>

                    <View
                      style={[
                        styles.stepContent,
                        !isLast && styles.stepContentSpacing,
                      ]}
                    >
                      <View style={styles.stepTitleRow}>
                        <Text
                          style={[
                            styles.stepLabel,
                            completed && styles.stepLabelCompleted,
                          ]}
                        >
                          {step.label}
                        </Text>

                        {current && (
                          <View style={styles.currentBadge}>
                            <Text style={styles.currentBadgeText}>
                              Current
                            </Text>
                          </View>
                        )}
                      </View>

                      <Text style={styles.stepDescription}>
                        {step.description}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeadingRow}>
            <View>
              <Text style={styles.sectionTitle}>Order Items</Text>
              <Text style={styles.sectionSubtitle}>
                {order.items.length} item
                {order.items.length !== 1 ? "s" : ""} in this order
              </Text>
            </View>

            <View style={styles.itemCountBadge}>
              <Text style={styles.itemCountText}>
                {order.items.length}
              </Text>
            </View>
          </View>

          {order.items.map((item, index) => (
            <OrderProductRow
              key={`${item.productId}-${index}`}
              item={item}
              showBorder={index !== order.items.length - 1}
            />
          ))}
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeadingRow}>
            <View>
              <Text style={styles.sectionTitle}>Bill Details</Text>
              <Text style={styles.sectionSubtitle}>
                Complete payment summary
              </Text>
            </View>

            <Ionicons
              name="receipt-outline"
              size={23}
              color={COLORS.primary}
            />
          </View>

          <View style={styles.billSection}>
            <View style={styles.billRow}>
              <Text style={styles.billLabel}>Item Total</Text>
              <Text style={styles.billValue}>
                {formatCurrency(order.subtotal)}
              </Text>
            </View>

            <View style={styles.billRow}>
              <Text style={styles.billLabel}>Delivery Fee</Text>

              {order.deliveryFee === 0 ? (
                <View style={styles.freeRow}>
                  <Ionicons
                    name="checkmark-circle"
                    size={15}
                    color={COLORS.primary}
                  />
                  <Text style={styles.freeText}>FREE</Text>
                </View>
              ) : (
                <Text style={styles.billValue}>
                  {formatCurrency(order.deliveryFee)}
                </Text>
              )}
            </View>

            {totalSavings > 0 && (
              <View style={styles.billRow}>
                <Text style={styles.savingsLabel}>You Saved</Text>
                <Text style={styles.savingsValue}>
                  {formatCurrency(totalSavings)}
                </Text>
              </View>
            )}

            <View style={styles.divider} />

            <View style={styles.billRow}>
              <Text style={styles.totalLabel}>Total Amount</Text>
              <Text style={styles.totalValue}>
                {formatCurrency(order.total)}
              </Text>
            </View>
          </View>

          {totalSavings > 0 && (
            <View style={styles.savingsBox}>
              <Ionicons
                name="pricetag-outline"
                size={18}
                color={COLORS.primary}
              />
              <Text style={styles.savingsMessage}>
                You saved {formatCurrency(totalSavings)} on this order.
              </Text>
            </View>
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.invoiceHeadingRow}>
            <View style={styles.invoiceHeadingIcon}>
              <Ionicons
                name="document-text-outline"
                size={23}
                color={COLORS.primary}
              />
            </View>

            <View style={styles.invoiceHeadingContent}>
              <Text style={styles.sectionTitle}>
                Invoice
              </Text>

              <Text style={styles.sectionSubtitle}>
                {getInvoiceNumber(order.id)}
              </Text>
            </View>

            <StatusPill
              label="PDF Ready"
              tone="success"
            />
          </View>

          <Text style={styles.invoiceDescription}>
            Download, save, share or print this
            invoice anytime from your order
            history.
          </Text>

          <View style={styles.invoiceActions}>
            <TouchableOpacity
              activeOpacity={0.85}
              disabled={invoiceBusy !== null}
              onPress={handleInvoiceShare}
              style={styles.invoicePrimaryButton}
            >
              <Ionicons
                name="download-outline"
                size={19}
                color={COLORS.textOnPrimary}
              />

              <Text
                style={styles.invoicePrimaryText}
              >
                {invoiceBusy === "share"
                  ? "Preparing PDF…"
                  : "Download / Share PDF"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              disabled={invoiceBusy !== null}
              onPress={handleInvoicePrint}
              style={styles.invoiceSecondaryButton}
            >
              <Ionicons
                name="print-outline"
                size={19}
                color={COLORS.primary}
              />

              <Text
                style={styles.invoiceSecondaryText}
              >
                {invoiceBusy === "print"
                  ? "Opening…"
                  : "Print"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeadingRow}>
            <View>
              <Text style={styles.sectionTitle}>Delivery Address</Text>
              <Text style={styles.sectionSubtitle}>
                Order delivery location
              </Text>
            </View>

            <Ionicons
              name="location-outline"
              size={23}
              color={COLORS.primary}
            />
          </View>

          <View style={styles.addressContent}>
            <View style={styles.addressIcon}>
              <Ionicons
                name="home-outline"
                size={24}
                color={COLORS.primary}
              />
            </View>

            <View style={styles.addressDetails}>
              <Text style={styles.addressName}>
                {order.address.fullName}
              </Text>

              <Text style={styles.addressText}>
                {order.address.house}, {order.address.area}
                {order.address.landmark
                  ? `, near ${order.address.landmark}`
                  : ""}
              </Text>

              <Text style={styles.addressText}>
                Pincode: {order.address.pincode}
              </Text>

              <View style={styles.mobileRow}>
                <Ionicons
                  name="call-outline"
                  size={15}
                  color={COLORS.textSecondary}
                />
                <Text style={styles.addressText}>
                  +91 {order.address.mobile}
                </Text>
              </View>
            </View>
          </View>

          {!!order.address.instructions && (
            <View style={styles.instructionsBox}>
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={18}
                color={COLORS.primary}
              />

              <View style={styles.instructionsContent}>
                <Text style={styles.instructionsLabel}>
                  Delivery Instructions
                </Text>
                <Text style={styles.instructionsText}>
                  {order.address.instructions}
                </Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeadingRow}>
            <View>
              <Text style={styles.sectionTitle}>Payment</Text>
              <Text style={styles.sectionSubtitle}>
                Payment method and status
              </Text>
            </View>

            <StatusPill
              label={
                order.paymentMethod === "cod"
                  ? isDelivered
                    ? "Collected"
                    : "Pay on Delivery"
                  : "Paid Online"
              }
              tone={
                isDelivered || order.paymentMethod !== "cod"
                  ? "success"
                  : "info"
              }
            />
          </View>

          <View style={styles.paymentRow}>
            <View style={styles.paymentIcon}>
              <Ionicons
                name={
                  order.paymentMethod === "cod"
                    ? "cash-outline"
                    : "card-outline"
                }
                size={25}
                color={COLORS.primary}
              />
            </View>

            <View style={styles.paymentContent}>
              <Text style={styles.paymentTitle}>
                {order.paymentMethod === "cod"
                  ? "Cash on Delivery"
                  : "Online Payment"}
              </Text>

              <Text style={styles.paymentDescription}>
                {order.paymentMethod === "cod"
                  ? isDelivered
                    ? "Payment was collected during delivery."
                    : `Pay ${formatCurrency(
                        order.total,
                      )} when the order arrives.`
                  : "Payment was completed online."}
              </Text>
            </View>
          </View>
        </View>

        {(order.status === "placed" || order.status === "confirmed") && (
          <TouchableOpacity
            style={styles.cancelOrderButton}
            activeOpacity={0.85}
            onPress={handleCancelOrder}
          >
            <Ionicons
              name="close-circle-outline"
              size={22}
              color={COLORS.danger}
            />

            <View style={styles.cancelOrderText}>
              <Text style={styles.cancelOrderTitle}>Cancel Order</Text>
              <Text style={styles.cancelOrderDescription}>
                Available before packing starts
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={20}
              color={COLORS.danger}
            />
          </TouchableOpacity>
        )}

        {(isDelivered || isCancelled) && (
          <TouchableOpacity
            style={styles.reorderButton}
            activeOpacity={0.85}
            onPress={reorder}
          >
            <Ionicons
              name="cart-outline"
              size={21}
              color={COLORS.textOnPrimary}
            />

            <View style={styles.reorderText}>
              <Text style={styles.reorderTitle}>Reorder These Items</Text>
              <Text style={styles.reorderDescription}>
                Add available products directly to your cart
              </Text>
            </View>

            <Ionicons
              name="arrow-forward"
              size={20}
              color={COLORS.textOnPrimary}
            />
          </TouchableOpacity>
        )}

        <View style={styles.supportCard}>
          <View style={styles.supportHeader}>
            <View style={styles.supportIcon}>
              <Ionicons
                name="headset-outline"
                size={25}
                color={COLORS.primary}
              />
            </View>

            <View style={styles.supportContent}>
              <Text style={styles.supportTitle}>Need Help?</Text>
              <Text style={styles.supportDescription}>
                Contact Raha Supermarket regarding this order.
              </Text>
            </View>
          </View>

          <View style={styles.supportActions}>
            <TouchableOpacity
              style={styles.secondaryAction}
              onPress={callStore}
              activeOpacity={0.85}
            >
              <Ionicons
                name="call-outline"
                size={19}
                color={COLORS.primary}
              />
              <Text style={styles.secondaryActionText}>Call Store</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.primaryAction}
              onPress={openWhatsApp}
              activeOpacity={0.85}
            >
              <Ionicons
                name="logo-whatsapp"
                size={20}
                color={COLORS.textOnPrimary}
              />
              <Text style={styles.primaryActionText}>WhatsApp</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.orderReference}>
          <Ionicons
            name="shield-checkmark-outline"
            size={17}
            color={COLORS.textSecondary}
          />
          <Text style={styles.orderReferenceText}>
            Order reference: {order.id}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function OrderProductRow({
  item,
  showBorder,
}: {
  item: OrderItem;
  showBorder: boolean;
}) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <View style={[styles.itemRow, showBorder && styles.itemRowBorder]}>
      <View style={styles.itemImageWrapper}>
        {!!item.image && !imageFailed ? (
          <Image
            source={{ uri: item.image }}
            style={styles.itemImage}
            contentFit="contain"
            transition={200}
            onError={() => setImageFailed(true)}
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons
              name="basket-outline"
              size={27}
              color={COLORS.primary}
            />
            <Text style={styles.placeholderText}>Product</Text>
          </View>
        )}
      </View>

      <View style={styles.itemContent}>
        <Text style={styles.itemName} numberOfLines={2}>
          {item.name}
        </Text>

        <Text style={styles.itemMeta}>
          {item.size || "Standard size"} · Quantity {item.quantity}
        </Text>

        <View style={styles.itemPriceDetails}>
          <Text style={styles.itemUnitPrice}>
            {formatCurrency(item.price)} each
          </Text>

          {item.mrp > item.price && (
            <Text style={styles.itemMrp}>
              {formatCurrency(item.mrp)}
            </Text>
          )}
        </View>
      </View>

      <Text style={styles.itemPrice}>
        {formatCurrency(item.price * item.quantity)}
      </Text>
    </View>
  );
}

function calculateSavings(items: OrderItem[]) {
  return items.reduce((total, item) => {
    const savingPerItem = Math.max(0, item.mrp - item.price);
    return total + savingPerItem * item.quantity;
  }, 0);
}

function shortOrderId(orderId: string) {
  if (orderId.length <= 12) return orderId.toUpperCase();
  return orderId.slice(-10).toUpperCase();
}

function getEstimatedDelivery(
  createdAt: string | number | Date,
  status: OrderStatus,
  estimatedDeliveryMinutes: number,
) {
  if (status === "delivered") return "Delivered successfully";
  if (status === "cancelled") return "Delivery cancelled";

  const createdDate = new Date(createdAt);
  const elapsedMinutes =
    (Date.now() - createdDate.getTime()) / (60 * 1000);

  const remainingMinutes = Math.max(
    10,
    estimatedDeliveryMinutes - elapsedMinutes,
  );

  const estimate = new Date(Date.now() + remainingMinutes * 60 * 1000);
  const today = new Date();

  const dayLabel =
    estimate.toDateString() === today.toDateString()
      ? "Today"
      : estimate.toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
        });

  const timeLabel = estimate.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return `${dayLabel}, around ${timeLabel}`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxxl,
    gap: SPACING.md,
  },
  statusHero: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    backgroundColor: COLORS.surface,
  },
  statusHeroCancelled: {
    backgroundColor: COLORS.dangerLight,
  },
  heroIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.background,
  },
  heroIconCancelled: {
    backgroundColor: COLORS.background,
  },
  heroContent: {
    flex: 1,
  },
  heroEyebrow: {
    fontSize: 9,
    fontWeight: FONT.weight.bold,
    letterSpacing: 1.1,
    color: COLORS.textSecondary,
  },
  heroTitle: {
    marginTop: 3,
    fontSize: FONT.size.lg,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },
  heroDescription: {
    marginTop: 3,
    fontSize: FONT.size.xs,
    lineHeight: 18,
    color: COLORS.textSecondary,
  },
  estimatedCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
  },
  estimatedIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.background,
  },
  estimatedContent: {
    flex: 1,
  },
  estimatedLabel: {
    fontSize: 9,
    fontWeight: FONT.weight.bold,
    letterSpacing: 1,
    color: COLORS.textSecondary,
  },
  estimatedValue: {
    marginTop: 4,
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },
  estimatedNote: {
    marginTop: 3,
    fontSize: 10,
    color: COLORS.textMuted,
  },
  card: {
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    backgroundColor: COLORS.background,
  },
  sectionHeadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },
  sectionSubtitle: {
    marginTop: 3,
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
  },
  timeline: {
    paddingTop: SPACING.xs,
  },
  stepRow: {
    flexDirection: "row",
    gap: SPACING.md,
  },
  stepIconColumn: {
    width: 36,
    alignItems: "center",
  },
  stepDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: COLORS.borderLight,
    backgroundColor: COLORS.surfaceAlt,
  },
  stepDotCompleted: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  stepDotCurrent: {
    borderWidth: 3,
  },
  stepLine: {
    flex: 1,
    minHeight: 31,
    width: 3,
    marginVertical: 3,
    backgroundColor: COLORS.borderLight,
  },
  stepLineCompleted: {
    backgroundColor: COLORS.primary,
  },
  stepContent: {
    flex: 1,
    paddingTop: 6,
  },
  stepContentSpacing: {
    paddingBottom: SPACING.md,
  },
  stepTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  stepLabel: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.semibold,
    color: COLORS.textSecondary,
  },
  stepLabelCompleted: {
    color: COLORS.textPrimary,
  },
  stepDescription: {
    marginTop: 4,
    fontSize: FONT.size.xs,
    lineHeight: 17,
    color: COLORS.textMuted,
  },
  currentBadge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surface,
  },
  currentBadgeText: {
    fontSize: 9,
    fontWeight: FONT.weight.bold,
    color: COLORS.primary,
  },
  cancelBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: SPACING.sm,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.dangerLight,
  },
  cancelContent: {
    flex: 1,
  },
  cancelTitle: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.bold,
    color: COLORS.danger,
  },
  cancelText: {
    marginTop: 3,
    fontSize: FONT.size.xs,
    lineHeight: 17,
    color: COLORS.danger,
  },
  itemCountBadge: {
    minWidth: 32,
    height: 32,
    paddingHorizontal: 9,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surface,
  },
  itemCountText: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.bold,
    color: COLORS.primary,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  itemRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  itemImageWrapper: {
    width: 66,
    height: 66,
    overflow: "hidden",
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surface,
  },
  itemImage: {
    width: "88%",
    height: "88%",
  },
  imagePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: {
    marginTop: 2,
    fontSize: 8,
    fontWeight: FONT.weight.semibold,
    color: COLORS.textMuted,
  },
  itemContent: {
    flex: 1,
  },
  itemName: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.semibold,
    lineHeight: 19,
    color: COLORS.textPrimary,
  },
  itemMeta: {
    marginTop: 3,
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
  },
  itemPriceDetails: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 3,
  },
  itemUnitPrice: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  itemMrp: {
    fontSize: 10,
    textDecorationLine: "line-through",
    color: COLORS.textMuted,
  },
  itemPrice: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },
  billSection: {
    gap: SPACING.sm,
  },
  billRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  billLabel: {
    fontSize: FONT.size.sm,
    color: COLORS.textSecondary,
  },
  billValue: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.semibold,
    color: COLORS.textPrimary,
  },
  freeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  freeText: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.bold,
    color: COLORS.primary,
  },
  savingsLabel: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.semibold,
    color: COLORS.primary,
  },
  savingsValue: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.bold,
    color: COLORS.primary,
  },
  divider: {
    height: 1,
    marginVertical: SPACING.xs,
    backgroundColor: COLORS.borderLight,
  },
  totalLabel: {
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },
  totalValue: {
    fontSize: FONT.size.lg,
    fontWeight: FONT.weight.bold,
    color: COLORS.primary,
  },
  savingsBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: SPACING.md,
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
  },
  savingsMessage: {
    flex: 1,
    fontSize: FONT.size.xs,
    fontWeight: FONT.weight.semibold,
    color: COLORS.primary,
  },
  invoiceHeadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  invoiceHeadingIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surface,
  },
  invoiceHeadingContent: {
    flex: 1,
  },
  invoiceDescription: {
    marginTop: SPACING.md,
    fontSize: FONT.size.xs,
    lineHeight: 18,
    color: COLORS.textSecondary,
  },
  invoiceActions: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  invoicePrimaryButton: {
    flex: 1.35,
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
  },
  invoicePrimaryText: {
    fontSize: FONT.size.xs,
    fontWeight: FONT.weight.bold,
    color: COLORS.textOnPrimary,
  },
  invoiceSecondaryButton: {
    flex: 0.65,
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.background,
  },
  invoiceSecondaryText: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.semibold,
    color: COLORS.primary,
  },
  addressContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: SPACING.md,
  },
  addressIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surface,
  },
  addressDetails: {
    flex: 1,
  },
  addressName: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },
  addressText: {
    marginTop: 3,
    fontSize: FONT.size.xs,
    lineHeight: 18,
    color: COLORS.textSecondary,
  },
  mobileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 2,
  },
  instructionsBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: SPACING.sm,
    marginTop: SPACING.md,
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
  },
  instructionsContent: {
    flex: 1,
  },
  instructionsLabel: {
    fontSize: FONT.size.xs,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },
  instructionsText: {
    marginTop: 3,
    fontSize: FONT.size.xs,
    lineHeight: 17,
    color: COLORS.textSecondary,
  },
  paymentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
  },
  paymentIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surface,
  },
  paymentContent: {
    flex: 1,
  },
  paymentTitle: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },
  paymentDescription: {
    marginTop: 3,
    fontSize: FONT.size.xs,
    lineHeight: 17,
    color: COLORS.textSecondary,
  },
  cancelOrderButton: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.danger,
    backgroundColor: COLORS.dangerLight,
  },
  cancelOrderText: {
    flex: 1,
  },
  cancelOrderTitle: {
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.bold,
    color: COLORS.danger,
  },
  cancelOrderDescription: {
    marginTop: 3,
    fontSize: FONT.size.xs,
    color: COLORS.danger,
    opacity: 0.85,
  },
  reorderButton: {
    minHeight: 78,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primary,
  },
  reorderText: {
    flex: 1,
  },
  reorderTitle: {
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.bold,
    color: COLORS.textOnPrimary,
  },
  reorderDescription: {
    marginTop: 3,
    fontSize: FONT.size.xs,
    color: COLORS.textOnPrimary,
    opacity: 0.85,
  },
  supportCard: {
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
  },
  supportHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
  },
  supportIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.background,
  },
  supportContent: {
    flex: 1,
  },
  supportTitle: {
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },
  supportDescription: {
    marginTop: 3,
    fontSize: FONT.size.xs,
    lineHeight: 17,
    color: COLORS.textSecondary,
  },
  supportActions: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  secondaryAction: {
    flex: 1,
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.background,
  },
  secondaryActionText: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.semibold,
    color: COLORS.primary,
  },
  primaryAction: {
    flex: 1,
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.primary,
  },
  primaryActionText: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.semibold,
    color: COLORS.textOnPrimary,
  },
  orderReference: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: SPACING.sm,
  },
  orderReferenceText: {
    flexShrink: 1,
    fontSize: 10,
    textAlign: "center",
    color: COLORS.textSecondary,
  },
});