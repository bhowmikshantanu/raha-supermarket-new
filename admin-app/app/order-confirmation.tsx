import { Ionicons } from "@expo/vector-icons";
import {
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import React, { useMemo } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/src/components/Button";
import { BRAND } from "@/src/config/brand";
import {
  COLORS,
  FONT,
  RADIUS,
  SHADOW,
  SPACING,
} from "@/src/config/theme";
import { useApp } from "@/src/context/AppContext";
import { formatCurrency } from "@/src/utils/format";
import {
  printInvoice,
  shareInvoicePdf,
  type InvoiceOrder,
} from "@/src/utils/invoice";

interface ExtendedOrderFields {
  couponCode?: string;
  couponDiscount?: number;
  deliveryDiscount?: number;
  deliveryDay?: "today" | "tomorrow";
  deliveryDateLabel?: string;
  deliverySlotId?: string;
  deliverySlotLabel?: string;
}

export default function OrderConfirmation() {
  const router = useRouter();

  const params = useLocalSearchParams<{
    id?: string | string[];
  }>();

  const { getOrderById } = useApp();

  const orderId = Array.isArray(params.id)
    ? params.id[0]
    : params.id ?? "";

  const baseOrder = getOrderById(orderId);

  const order = baseOrder
    ? Object.assign(baseOrder, {}) as typeof baseOrder &
        ExtendedOrderFields
    : null;

  const invoiceNumber = useMemo(() => {
    if (!order) {
      return "";
    }

    return `INV-${order.id.replace(
      /[^a-zA-Z0-9]/g,
      "",
    )}`;
  }, [order]);

  const orderDate = useMemo(() => {
    if (!order) {
      return "";
    }

    return new Date(order.createdAt).toLocaleString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      },
    );
  }, [order]);

  const totalMrp = useMemo(() => {
    if (!order) {
      return 0;
    }

    return order.items.reduce(
      (total, item) =>
        total + item.mrp * item.quantity,
      0,
    );
  }, [order]);

  const productDiscount = useMemo(() => {
    if (!order) {
      return 0;
    }

    return Math.max(
      totalMrp - order.subtotal,
      0,
    );
  }, [order, totalMrp]);

  const couponDiscount =
    order?.couponDiscount ?? 0;

  const deliveryDiscount =
    order?.deliveryDiscount ?? 0;

  const totalSavings =
    productDiscount +
    couponDiscount +
    deliveryDiscount;

  const handleShareInvoice = async () => {
    if (!order) return;

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
    }
  };

  const handlePrintInvoice = async () => {
    if (!order) return;

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
    }
  };

  if (!order) {
    return (
      <SafeAreaView
        style={styles.container}
        edges={["top", "bottom"]}
      >
        <View style={styles.notFoundWrap}>
          <View style={styles.notFoundIcon}>
            <Ionicons
              name="receipt-outline"
              size={44}
              color={COLORS.textMuted}
            />
          </View>

          <Text style={styles.notFoundTitle}>
            Order not found
          </Text>

          <Text style={styles.notFoundText}>
            This order may have been removed or
            could not be loaded.
          </Text>

          <Button
            label="Go to Orders"
            onPress={() =>
              router.replace("/(tabs)/orders")
            }
          />
        </View>
      </SafeAreaView>
    );
  }

  const deliveryDisplay =
    order.deliverySlotLabel
      ? `${order.deliveryDateLabel ?? ""} · ${
          order.deliverySlotLabel
        }`
      : `Within ${order.estimatedDeliveryMinutes} minutes`;

  return (
    <SafeAreaView
      style={styles.container}
      edges={["top", "bottom"]}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.successSection}>
          <View style={styles.iconWrap}>
            <View style={styles.iconBg}>
              <Ionicons
                name="checkmark"
                size={58}
                color={COLORS.textOnPrimary}
              />
            </View>
          </View>

          <Text style={styles.title}>
            Order Confirmed!
          </Text>

          <Text style={styles.subtitle}>
            Thank you for shopping with{" "}
            {BRAND.name}
          </Text>

          <View style={styles.successBadge}>
            <Ionicons
              name="shield-checkmark-outline"
              size={16}
              color={COLORS.primary}
            />

            <Text style={styles.successBadgeText}>
              Your order has been placed securely
            </Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardEyebrow}>
                ORDER SUMMARY
              </Text>

              <Text style={styles.cardTitle}>
                #{order.id}
              </Text>
            </View>

            <View style={styles.statusBadge}>
              <View style={styles.statusDot} />

              <Text style={styles.statusText}>
                Placed
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <Text style={styles.label}>
              Invoice Number
            </Text>

            <Text style={styles.value}>
              {invoiceNumber}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>
              Order Date
            </Text>

            <Text
              style={[
                styles.value,
                styles.valueRight,
              ]}
            >
              {orderDate}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>
              Payment Method
            </Text>

            <Text style={styles.value}>
              {order.paymentMethod === "cod"
                ? "Cash on Delivery"
                : "Online Payment"}
            </Text>
          </View>

          {order.couponCode ? (
            <View style={styles.row}>
              <Text style={styles.label}>
                Coupon
              </Text>

              <View style={styles.couponBadge}>
                <Ionicons
                  name="ticket-outline"
                  size={14}
                  color={COLORS.primary}
                />

                <Text
                  style={styles.couponBadgeText}
                >
                  {order.couponCode}
                </Text>
              </View>
            </View>
          ) : null}
        </View>

        <View style={styles.deliveryCard}>
          <View style={styles.deliveryIcon}>
            <Ionicons
              name="bicycle-outline"
              size={24}
              color={COLORS.primary}
            />
          </View>

          <View style={styles.deliveryContent}>
            <Text style={styles.deliveryLabel}>
              Estimated Delivery
            </Text>

            <Text style={styles.deliveryValue}>
              {deliveryDisplay}
            </Text>

            <Text style={styles.deliveryHint}>
              You will receive order status updates
              in the app.
            </Text>
          </View>

          <Ionicons
            name="checkmark-circle"
            size={23}
            color={COLORS.primary}
          />
        </View>

        <View style={styles.invoiceCard}>
          <View style={styles.invoiceHeader}>
            <View>
              <Text style={styles.invoiceEyebrow}>
                TAX INVOICE
              </Text>

              <Text style={styles.invoiceStoreName}>
                {BRAND.name}
              </Text>
            </View>

            <View style={styles.invoiceIconWrap}>
              <Ionicons
                name="receipt-outline"
                size={24}
                color={COLORS.primary}
              />
            </View>
          </View>

          <View style={styles.invoiceMeta}>
            <View style={styles.invoiceMetaItem}>
              <Text style={styles.invoiceMetaLabel}>
                Invoice No.
              </Text>

              <Text style={styles.invoiceMetaValue}>
                {invoiceNumber}
              </Text>
            </View>

            <View style={styles.invoiceMetaItem}>
              <Text style={styles.invoiceMetaLabel}>
                Order ID
              </Text>

              <Text
                style={styles.invoiceMetaValue}
                testID="oc-order-id"
              >
                {order.id}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <Text style={styles.invoiceSectionTitle}>
            Items
          </Text>

          <View style={styles.itemsList}>
            {order.items.map((item) => (
              <View
                key={`${item.productId}-${item.name}`}
                style={styles.itemRow}
              >
                <View style={styles.itemContent}>
                  <Text
                    style={styles.itemName}
                    numberOfLines={2}
                  >
                    {item.name}
                  </Text>

                  <Text style={styles.itemMeta}>
                    {item.size} × {item.quantity}
                  </Text>
                </View>

                <Text style={styles.itemPrice}>
                  {formatCurrency(
                    item.price * item.quantity,
                  )}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.divider} />

          <View style={styles.billRow}>
            <Text style={styles.billLabel}>
              Item MRP
            </Text>

            <Text style={styles.billValue}>
              {formatCurrency(totalMrp)}
            </Text>
          </View>

          {productDiscount > 0 ? (
            <View style={styles.billRow}>
              <Text style={styles.discountLabel}>
                Product Discount
              </Text>

              <Text style={styles.discountValue}>
                -{formatCurrency(productDiscount)}
              </Text>
            </View>
          ) : null}

          <View style={styles.billRow}>
            <Text style={styles.billLabel}>
              Item Total
            </Text>

            <Text style={styles.billValue}>
              {formatCurrency(order.subtotal)}
            </Text>
          </View>

          {couponDiscount > 0 ? (
            <View style={styles.billRow}>
              <Text style={styles.discountLabel}>
                Coupon Discount
              </Text>

              <Text style={styles.discountValue}>
                -{formatCurrency(couponDiscount)}
              </Text>
            </View>
          ) : null}

          {deliveryDiscount > 0 ? (
            <View style={styles.billRow}>
              <Text style={styles.discountLabel}>
                Delivery Discount
              </Text>

              <Text style={styles.discountValue}>
                -{formatCurrency(deliveryDiscount)}
              </Text>
            </View>
          ) : null}

          <View style={styles.billRow}>
            <Text style={styles.billLabel}>
              Delivery Fee
            </Text>

            <Text
              style={[
                styles.billValue,
                order.deliveryFee === 0 &&
                  styles.freeValue,
              ]}
            >
              {order.deliveryFee === 0
                ? "FREE"
                : formatCurrency(
                    order.deliveryFee,
                  )}
            </Text>
          </View>

          <View style={styles.totalDivider} />

          <View style={styles.billRow}>
            <Text style={styles.totalLabel}>
              Grand Total
            </Text>

            <Text style={styles.totalValue}>
              {formatCurrency(order.total)}
            </Text>
          </View>

          {totalSavings > 0 ? (
            <View style={styles.savingsBanner}>
              <Ionicons
                name="sparkles-outline"
                size={17}
                color={COLORS.primary}
              />

              <Text style={styles.savingsText}>
                You saved{" "}
                {formatCurrency(totalSavings)} on
                this order.
              </Text>
            </View>
          ) : null}

          <View style={styles.invoiceActionRow}>
            <TouchableOpacity
              activeOpacity={0.82}
              style={styles.downloadInvoiceButton}
              onPress={handleShareInvoice}
              accessibilityRole="button"
              accessibilityLabel="Download or share invoice PDF"
            >
              <Ionicons
                name="download-outline"
                size={19}
                color={COLORS.textOnPrimary}
              />

              <Text
                style={styles.downloadInvoiceText}
              >
                Download / Share PDF
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.82}
              style={styles.printInvoiceButton}
              onPress={handlePrintInvoice}
              accessibilityRole="button"
              accessibilityLabel="Print invoice"
            >
              <Ionicons
                name="print-outline"
                size={19}
                color={COLORS.primary}
              />

              <Text
                style={styles.printInvoiceText}
              >
                Print
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.addressCard}>
          <View style={styles.addressHeader}>
            <View style={styles.addressIcon}>
              <Ionicons
                name="location-outline"
                size={21}
                color={COLORS.primary}
              />
            </View>

            <Text style={styles.addressTitle}>
              Delivery Address
            </Text>
          </View>

          <Text style={styles.addrName}>
            {order.address.fullName}
          </Text>

          <Text style={styles.addrText}>
            {order.address.house},{" "}
            {order.address.area}
            {order.address.landmark
              ? `, near ${order.address.landmark}`
              : ""}{" "}
            - {order.address.pincode}
          </Text>

          <View style={styles.mobileRow}>
            <Ionicons
              name="call-outline"
              size={15}
              color={COLORS.textSecondary}
            />

            <Text style={styles.addrText}>
              +91 {order.address.mobile}
            </Text>
          </View>

          {order.address.instructions ? (
            <View style={styles.instructionsBox}>
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={16}
                color={COLORS.primary}
              />

              <Text
                style={styles.instructionsText}
              >
                {order.address.instructions}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.tips}>
          <Ionicons
            name="information-circle"
            size={18}
            color={COLORS.info}
          />

          <Text style={styles.tipsText}>
            You&apos;ll receive updates as your
            order progresses. Contact Raha
            Supermarket if you need help with this
            order.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label="Continue Shopping"
          variant="outline"
          size="lg"
          style={styles.footerButton}
          onPress={() =>
            router.replace("/(tabs)")
          }
          testID="oc-continue-shopping"
        />

        <Button
          label="Track Order"
          size="lg"
          style={styles.footerButton}
          onPress={() =>
            router.replace({
              pathname: "/order/[id]",
              params: {
                id: order.id,
              },
            })
          }
          testID="oc-track-order"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  scroll: {
    padding: SPACING.md,
    paddingBottom: 130,
    gap: SPACING.md,
  },

  successSection: {
    alignItems: "center",
    paddingTop: SPACING.md,
  },

  iconWrap: {
    marginBottom: SPACING.md,
  },

  iconBg: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    ...SHADOW.fab,
  },

  title: {
    fontSize: FONT.size.xxl,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
    textAlign: "center",
  },

  subtitle: {
    marginTop: 4,
    fontSize: FONT.size.md,
    color: COLORS.textSecondary,
    textAlign: "center",
  },

  successBadge: {
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.primaryLight,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  successBadgeText: {
    fontSize: FONT.size.xs,
    fontWeight: FONT.weight.semibold,
    color: COLORS.primary,
  },

  summaryCard: {
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    gap: SPACING.sm,
    ...SHADOW.card,
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  cardEyebrow: {
    fontSize: 10,
    fontWeight: FONT.weight.bold,
    color: COLORS.textMuted,
    letterSpacing: 0.8,
  },

  cardTitle: {
    marginTop: 3,
    fontSize: FONT.size.lg,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },

  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 7,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.primaryLight,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },

  statusText: {
    fontSize: FONT.size.xs,
    fontWeight: FONT.weight.bold,
    color: COLORS.primary,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: SPACING.md,
  },

  label: {
    color: COLORS.textSecondary,
    fontSize: FONT.size.sm,
  },

  value: {
    color: COLORS.textPrimary,
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.semibold,
  },

  valueRight: {
    flex: 1,
    textAlign: "right",
  },

  divider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginVertical: SPACING.xs,
  },

  couponBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 5,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primaryLight,
  },

  couponBadgeText: {
    fontSize: FONT.size.xs,
    fontWeight: FONT.weight.bold,
    color: COLORS.primary,
  },

  deliveryCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
  },

  deliveryIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
  },

  deliveryContent: {
    flex: 1,
  },

  deliveryLabel: {
    fontSize: FONT.size.xs,
    fontWeight: FONT.weight.semibold,
    color: COLORS.textSecondary,
  },

  deliveryValue: {
    marginTop: 3,
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },

  deliveryHint: {
    marginTop: 3,
    fontSize: 10,
    color: COLORS.textSecondary,
  },

  invoiceCard: {
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOW.card,
  },

  invoiceHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  invoiceEyebrow: {
    fontSize: 10,
    fontWeight: FONT.weight.bold,
    color: COLORS.textMuted,
    letterSpacing: 0.9,
  },

  invoiceStoreName: {
    marginTop: 3,
    fontSize: FONT.size.lg,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },

  invoiceIconWrap: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },

  invoiceMeta: {
    marginTop: SPACING.md,
    flexDirection: "row",
    gap: SPACING.md,
  },

  invoiceMetaItem: {
    flex: 1,
  },

  invoiceMetaLabel: {
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
  },

  invoiceMetaValue: {
    marginTop: 3,
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.semibold,
    color: COLORS.textPrimary,
  },

  invoiceSectionTitle: {
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },

  itemsList: {
    gap: SPACING.sm,
  },

  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
  },

  itemContent: {
    flex: 1,
  },

  itemName: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.medium,
    color: COLORS.textPrimary,
    lineHeight: 18,
  },

  itemMeta: {
    marginTop: 2,
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
  },

  itemPrice: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.semibold,
    color: COLORS.textPrimary,
  },

  billRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: SPACING.sm,
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

  discountLabel: {
    fontSize: FONT.size.sm,
    color: COLORS.primary,
  },

  discountValue: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.semibold,
    color: COLORS.primary,
  },

  freeValue: {
    color: COLORS.primary,
  },

  totalDivider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginVertical: SPACING.md,
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

  savingsBanner: {
    marginTop: SPACING.md,
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primaryLight,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  savingsText: {
    flex: 1,
    fontSize: FONT.size.xs,
    fontWeight: FONT.weight.semibold,
    color: COLORS.primary,
  },

  invoiceActionRow: {
    marginTop: SPACING.md,
    flexDirection: "row",
    gap: SPACING.sm,
  },

  downloadInvoiceButton: {
    flex: 1.35,
    minHeight: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },

  downloadInvoiceText: {
    fontSize: FONT.size.xs,
    fontWeight: FONT.weight.bold,
    color: COLORS.textOnPrimary,
  },

  printInvoiceButton: {
    flex: 0.65,
    minHeight: 44,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },

  printInvoiceText: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.bold,
    color: COLORS.primary,
  },

  addressCard: {
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },

  addressHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },

  addressIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },

  addressTitle: {
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },

  addrName: {
    color: COLORS.textPrimary,
    fontWeight: FONT.weight.semibold,
    fontSize: FONT.size.sm,
  },

  addrText: {
    color: COLORS.textSecondary,
    fontSize: FONT.size.xs,
    marginTop: 3,
    lineHeight: 17,
  },

  mobileRow: {
    marginTop: SPACING.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  instructionsBox: {
    marginTop: SPACING.md,
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.background,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
  },

  instructionsText: {
    flex: 1,
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
    lineHeight: 17,
  },

  tips: {
    flexDirection: "row",
    gap: SPACING.sm,
    padding: SPACING.md,
    backgroundColor: COLORS.infoLight,
    borderRadius: RADIUS.md,
  },

  tipsText: {
    flex: 1,
    color: "#1E40AF",
    fontSize: FONT.size.xs,
    lineHeight: 18,
  },

  footer: {
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
  },

  footerButton: {
    flex: 1,
  },

  notFoundWrap: {
    flex: 1,
    padding: SPACING.xxl,
    alignItems: "center",
    justifyContent: "center",
  },

  notFoundIcon: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.lg,
  },

  notFoundTitle: {
    fontSize: FONT.size.xl,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },

  notFoundText: {
    marginTop: SPACING.sm,
    marginBottom: SPACING.xl,
    textAlign: "center",
    fontSize: FONT.size.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
});