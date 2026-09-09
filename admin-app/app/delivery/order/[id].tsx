import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useToast } from "@/src/components/Toast";
import { auth, db } from "@/src/config/firebase";
import { COLORS, FONT, RADIUS, SHADOW, SPACING } from "@/src/config/theme";
import {
  deliveryUpdateOrderStatus,
  notifyCustomerOfOrderUpdate,
} from "@/src/services/firebaseDeliveryOrders";
import type { Order, OrderStatus } from "@/src/types";
import { formatCurrency } from "@/src/utils/format";

const STATUS_LABEL: Record<OrderStatus, string> = {
  placed: "Placed",
  confirmed: "Confirmed",
  preparing: "Ready to pickup",
  "out-for-delivery": "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

function documentToOrder(id: string, data: any): Order | null {
  if (!data || !Array.isArray(data.items) || !data.address) return null;
  const createdAt =
    typeof data.createdAtMs === "number" ? data.createdAtMs : Date.now();
  return {
    id,
    items: data.items,
    subtotal: Number(data.subtotal ?? 0),
    deliveryFee: Number(data.deliveryFee ?? 0),
    total: Number(data.total ?? 0),
    status: (data.status as OrderStatus) ?? "placed",
    createdAt,
    address: data.address,
    paymentMethod: data.paymentMethod === "online" ? "online" : "cod",
    estimatedDeliveryMinutes: Number(data.estimatedDeliveryMinutes ?? 30),
    deliveryBoyId: data.deliveryBoyId ?? undefined,
    deliveryBoyUid: data.deliveryBoyUid ?? undefined,
    deliveryBoyName: data.deliveryBoyName ?? undefined,
    deliveryBoyMobile: data.deliveryBoyMobile ?? undefined,
    pickedUpAt:
      typeof data.pickedUpAtMs === "number" ? data.pickedUpAtMs : undefined,
    deliveredAt:
      typeof data.deliveredAtMs === "number" ? data.deliveredAtMs : undefined,
    assignedAt:
      typeof data.assignedAtMs === "number" ? data.assignedAtMs : undefined,
    couponCode:
      typeof data.couponCode === "string" && data.couponCode
        ? data.couponCode
        : undefined,
    couponDiscount:
      Number(data.couponDiscount ?? 0) > 0
        ? Number(data.couponDiscount)
        : undefined,
  };
}

export default function DeliveryOrderDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { showToast } = useToast();

  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [notAssigned, setNotAssigned] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) router.replace("/delivery/login");
      else setFirebaseUser(user);
    });
    return unsubscribe;
  }, [router]);

  useEffect(() => {
    if (!id || !firebaseUser) return;
    const unsubscribe = onSnapshot(
      doc(db, "orders", id),
      (snapshot) => {
        if (!snapshot.exists()) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        const orderData = documentToOrder(snapshot.id, snapshot.data());
        if (!orderData) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        if (orderData.deliveryBoyUid !== firebaseUser.uid) {
          setNotAssigned(true);
          setLoading(false);
          return;
        }
        setOrder(orderData);
        setLoading(false);
      },
      (err) => {
        console.error("Order detail read failed:", err);
        setLoading(false);
      },
    );
    return unsubscribe;
  }, [id, firebaseUser]);

  const next = useMemo((): OrderStatus | null => {
    if (!order) return null;
    if (order.status === "confirmed" || order.status === "preparing") {
      return "out-for-delivery";
    }
    if (order.status === "out-for-delivery") return "delivered";
    return null;
  }, [order]);

  const nextLabel = useMemo(() => {
    if (!next) return null;
    if (next === "out-for-delivery") return "Picked Up · Start Delivery";
    if (next === "delivered") return "Mark as Delivered";
    return null;
  }, [next]);

  const callCustomer = async () => {
    if (!order?.address?.mobile) return;
    try {
      await Linking.openURL(`tel:+91${order.address.mobile}`);
    } catch {
      showToast("Unable to place call", "error");
    }
  };

  const openMaps = async () => {
    if (!order?.address) return;
    const addr = [
      order.address.house,
      order.address.landmark,
      order.address.area,
      order.address.pincode,
    ]
      .filter(Boolean)
      .join(", ");
    const query = encodeURIComponent(addr || order.address.pincode || "");
    const url = `https://www.google.com/maps/search/?api=1&query=${query}`;
    try {
      await Linking.openURL(url);
    } catch {
      showToast("Unable to open maps", "error");
    }
  };

  const handleNext = async () => {
    if (!order || !next) return;
    try {
      setUpdating(true);
      await deliveryUpdateOrderStatus(order.id, next);
      showToast(
        next === "out-for-delivery"
          ? "Order picked up"
          : "Order marked as delivered",
        "success",
      );
      // Best-effort customer push (never blocks the flow).
      void notifyCustomerOfOrderUpdate(order.id, next);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Unable to update status",
        "error",
      );
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (notFound || notAssigned || !order) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <Header title="Order" onBack={() => router.back()} />
        <View style={styles.centered}>
          <Ionicons
            name={notAssigned ? "lock-closed-outline" : "alert-circle-outline"}
            size={48}
            color={COLORS.textMuted}
          />
          <Text style={styles.errorTitle}>
            {notAssigned
              ? "Not assigned to you"
              : "Order not found"}
          </Text>
          <Text style={styles.errorMessage}>
            {notAssigned
              ? "This order was reassigned. Please check your dashboard."
              : "The order may have been removed."}
          </Text>
          <TouchableOpacity
            style={styles.backHome}
            onPress={() => router.replace("/delivery")}
          >
            <Text style={styles.backHomeText}>Back to dashboard</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const itemCount = order.items.reduce((sum, it) => sum + it.quantity, 0);

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <Header
        title={`#${order.id}`}
        subtitle={STATUS_LABEL[order.status]}
        onBack={() => router.back()}
      />

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Customer</Text>
          <View style={styles.customerRow}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={22} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.customerName}>
                {order.address.fullName || "Customer"}
              </Text>
              <Text style={styles.customerMeta}>
                +91 {order.address.mobile}
              </Text>
            </View>
          </View>
          <View style={styles.customerActions}>
            <TouchableOpacity
              style={styles.customerBtn}
              onPress={callCustomer}
              testID="delivery-call-btn"
            >
              <Ionicons name="call" size={18} color={COLORS.primary} />
              <Text style={styles.customerBtnText}>Call</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.customerBtn}
              onPress={openMaps}
              testID="delivery-navigate-btn"
            >
              <Ionicons name="navigate" size={18} color={COLORS.primary} />
              <Text style={styles.customerBtnText}>Navigate</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Delivery Address</Text>
          <View style={styles.addressBox}>
            <Ionicons name="location" size={18} color={COLORS.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.addressText}>
                {[
                  order.address.house,
                  order.address.landmark,
                  order.address.area,
                ]
                  .filter(Boolean)
                  .join(", ")}
              </Text>
              <Text style={styles.addressMeta}>
                Pincode: {order.address.pincode}
              </Text>
            </View>
          </View>
          {order.address.instructions ? (
            <View style={styles.noteBox}>
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={15}
                color={COLORS.textSecondary}
              />
              <Text style={styles.noteText}>
                {order.address.instructions}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.card}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: SPACING.sm,
            }}
          >
            <Text style={styles.sectionTitle}>Items ({itemCount})</Text>
            <View
              style={[
                styles.paymentPill,
                order.paymentMethod === "cod"
                  ? { backgroundColor: COLORS.warningLight }
                  : { backgroundColor: COLORS.primaryLight },
              ]}
            >
              <Ionicons
                name={
                  order.paymentMethod === "cod"
                    ? "cash-outline"
                    : "checkmark-circle-outline"
                }
                size={14}
                color={
                  order.paymentMethod === "cod"
                    ? "#B45309"
                    : COLORS.primaryDark
                }
              />
              <Text
                style={[
                  styles.paymentText,
                  {
                    color:
                      order.paymentMethod === "cod"
                        ? "#B45309"
                        : COLORS.primaryDark,
                  },
                ]}
              >
                {order.paymentMethod === "cod"
                  ? "Collect COD"
                  : "Online (Paid)"}
              </Text>
            </View>
          </View>

          {order.items.map((it, idx) => (
            <View
              key={`${it.productId}-${idx}`}
              style={[styles.itemRow, idx > 0 && styles.itemRowBorder]}
            >
              <View style={styles.itemQty}>
                <Text style={styles.itemQtyText}>{it.quantity}×</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{it.name}</Text>
                <Text style={styles.itemSize}>{it.size}</Text>
              </View>
              <Text style={styles.itemPrice}>
                {formatCurrency(it.price * it.quantity)}
              </Text>
            </View>
          ))}

          <View style={styles.billBox}>
            <View style={styles.billRow}>
              <Text style={styles.billLabel}>Subtotal</Text>
              <Text style={styles.billValue}>
                {formatCurrency(order.subtotal)}
              </Text>
            </View>
            {(() => {
              const discount =
                order.couponDiscount ??
                Math.max(0, order.subtotal + order.deliveryFee - order.total);
              if (discount <= 0) return null;
              return (
                <View style={styles.billRow}>
                  <Text style={styles.billLabel}>
                    {order.couponCode
                      ? `Discount (${order.couponCode})`
                      : "Discount"}
                  </Text>
                  <Text style={styles.billValue}>
                    -{formatCurrency(discount)}
                  </Text>
                </View>
              );
            })()}
            <View style={styles.billRow}>
              <Text style={styles.billLabel}>Delivery Fee</Text>
              <Text style={styles.billValue}>
                {order.deliveryFee === 0
                  ? "FREE"
                  : formatCurrency(order.deliveryFee)}
              </Text>
            </View>
            <View style={styles.billDivider} />
            <View style={styles.billRow}>
              <Text style={styles.billLabelStrong}>
                {order.paymentMethod === "cod"
                  ? "Amount to Collect"
                  : "Order Total"}
              </Text>
              <Text style={styles.billValueStrong}>
                {formatCurrency(order.total)}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {next && nextLabel ? (
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.primaryBtn, updating && styles.primaryBtnDisabled]}
            onPress={() => void handleNext()}
            disabled={updating}
            testID="delivery-next-status-btn"
          >
            {updating ? (
              <ActivityIndicator color={COLORS.textOnPrimary} />
            ) : (
              <>
                <Ionicons
                  name={
                    next === "delivered"
                      ? "checkmark-done"
                      : "bicycle"
                  }
                  size={20}
                  color={COLORS.textOnPrimary}
                />
                <Text style={styles.primaryBtnText}>{nextLabel}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      ) : order.status === "delivered" ? (
        <View style={styles.bottomBar}>
          <View style={styles.doneBox}>
            <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
            <Text style={styles.doneText}>Delivered — great work!</Text>
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

function Header({
  title,
  subtitle,
  onBack,
}: {
  title: string;
  subtitle?: string;
  onBack: () => void;
}) {
  return (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.backBtn}
        onPress={onBack}
        testID="delivery-order-back"
      >
        <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
      </TouchableOpacity>
      <View style={{ flex: 1, marginLeft: SPACING.sm }}>
        <Text style={styles.headerTitle}>{title}</Text>
        {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.xl,
    gap: SPACING.md,
  },
  errorTitle: {
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },
  errorMessage: {
    fontSize: FONT.size.sm,
    color: COLORS.textSecondary,
    textAlign: "center",
    maxWidth: 280,
  },
  backHome: {
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
  },
  backHomeText: {
    color: COLORS.textOnPrimary,
    fontWeight: FONT.weight.bold,
    fontSize: FONT.size.sm,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surface,
  },
  headerTitle: {
    fontSize: FONT.size.lg,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },
  headerSubtitle: {
    marginTop: 2,
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
  },
  scroll: {
    padding: SPACING.md,
    gap: SPACING.md,
    paddingBottom: 120,
  },
  card: {
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    backgroundColor: COLORS.background,
    ...SHADOW.card,
  },
  sectionTitle: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  customerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primaryLight,
  },
  customerName: {
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },
  customerMeta: {
    marginTop: 2,
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
  },
  customerActions: {
    marginTop: SPACING.md,
    flexDirection: "row",
    gap: SPACING.sm,
  },
  customerBtn: {
    flex: 1,
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  customerBtnText: {
    color: COLORS.primary,
    fontWeight: FONT.weight.bold,
    fontSize: FONT.size.sm,
  },
  addressBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: SPACING.sm,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
  },
  addressText: {
    fontSize: FONT.size.sm,
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
  addressMeta: {
    marginTop: 4,
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
  },
  noteBox: {
    marginTop: SPACING.sm,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: SPACING.sm,
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.warningLight,
  },
  noteText: {
    flex: 1,
    fontSize: FONT.size.xs,
    color: "#92400E",
    lineHeight: 18,
  },
  paymentPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
  },
  paymentText: {
    fontSize: 10,
    fontWeight: FONT.weight.bold,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  itemRowBorder: {
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  itemQty: {
    minWidth: 32,
  },
  itemQtyText: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.bold,
    color: COLORS.primary,
  },
  itemName: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.semibold,
    color: COLORS.textPrimary,
  },
  itemSize: {
    marginTop: 2,
    fontSize: FONT.size.xs,
    color: COLORS.textMuted,
  },
  itemPrice: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.semibold,
    color: COLORS.textPrimary,
  },
  billBox: {
    marginTop: SPACING.sm,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    gap: SPACING.xs,
  },
  billRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  billLabel: { fontSize: FONT.size.sm, color: COLORS.textSecondary },
  billValue: { fontSize: FONT.size.sm, color: COLORS.textPrimary },
  billLabelStrong: {
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },
  billValueStrong: {
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.bold,
    color: COLORS.primary,
  },
  billDivider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginVertical: SPACING.sm,
  },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: SPACING.md,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    ...SHADOW.header,
  },
  primaryBtn: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primary,
  },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnText: {
    color: COLORS.textOnPrimary,
    fontWeight: FONT.weight.bold,
    fontSize: FONT.size.md,
  },
  doneBox: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primaryLight,
  },
  doneText: {
    color: COLORS.primaryDark,
    fontWeight: FONT.weight.bold,
    fontSize: FONT.size.md,
  },
});
