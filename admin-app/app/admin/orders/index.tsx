import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  COLORS,
  FONT,
  RADIUS,
  SHADOW,
  SPACING,
} from "@/src/config/theme";
import { AssignRiderSheet } from "@/src/components/AssignRiderSheet";
import {
  adminUpdateFirebaseOrderStatus,
  subscribeToAllOrders,
} from "@/src/services/firebaseOrders";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

import { auth, db } from "@/src/config/firebase";
import { isOrderEligibleForAssignment } from "@/src/services/firebaseDeliveryOrders";
import { subscribeToDeliveryBoys } from "@/src/services/firebaseDeliveryBoys";
import type {
  DeliveryBoy,
  Order,
  OrderStatus,
} from "@/src/types";
import { formatCurrency } from "@/src/utils/format";

type FilterKey = "all" | OrderStatus;

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "placed", label: "New" },
  { key: "confirmed", label: "Confirmed" },
  { key: "preparing", label: "Preparing" },
  { key: "out-for-delivery", label: "Out for delivery" },
  { key: "delivered", label: "Delivered" },
  { key: "cancelled", label: "Cancelled" },
];

const STATUS_LABELS: Record<OrderStatus, string> = {
  placed: "Placed",
  confirmed: "Confirmed",
  preparing: "Preparing",
  "out-for-delivery": "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  placed: "confirmed",
  confirmed: "preparing",
};

const NEXT_STATUS_LABEL: Partial<Record<OrderStatus, string>> = {
  placed: "Confirm Order",
  confirmed: "Start Preparing",
};

export default function AdminOrdersScreen() {
  const router = useRouter();

  const { orderId } = useLocalSearchParams<{
    orderId?: string;
  }>();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [errorText, setErrorText] = useState("");
  const [assignForOrder, setAssignForOrder] = useState<Order | null>(null);
  const [riders, setRiders] = useState<DeliveryBoy[]>([]);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    let active = true;

    const unsubscribe = onAuthStateChanged(
      auth,
      async (user) => {
        if (!active) return;

        setAuthReady(false);

        if (!user) {
          router.replace({
            pathname: "/admin/login",
            params: orderId ? { orderId } : {},
          } as never);
          return;
        }

        try {
          const adminSnapshot = await getDoc(
            doc(db, "admins", user.uid),
          );

          if (!active) return;

          const adminData = adminSnapshot.exists()
            ? adminSnapshot.data()
            : null;

          const isAuthorizedAdmin =
            adminData?.role === "admin" &&
            adminData?.active === true;

          if (!isAuthorizedAdmin) {
            router.replace({
              pathname: "/admin/login",
              params: orderId ? { orderId } : {},
            } as never);
            return;
          }

          setAuthReady(true);
        } catch (error) {
          console.error(
            "Admin authorization check failed:",
            error,
          );

          if (!active) return;

          router.replace({
            pathname: "/admin/login",
            params: orderId ? { orderId } : {},
          } as never);
        }
      },
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [router, orderId]);

  useEffect(() => {
    if (!authReady) return;

    const unsubscribe = subscribeToAllOrders(
      (items) => {
        setOrders(items);
        setLoading(false);
        setRefreshing(false);
        setErrorText("");
      },
      (error) => {
        console.error("Admin orders subscription failed:", error);
        setLoading(false);
        setRefreshing(false);
        setErrorText("Unable to load live orders. Please check Firebase access.");
      },
    );

    return unsubscribe;
  }, [authReady]);

  useEffect(() => {
    if (!authReady) return;

    // Rider directory →  - used to enrich orders with vehicle numbers.
    const unsubscribe = subscribeToDeliveryBoys(
      (items) => setRiders(items),
      () => {
        /* non-fatal →  - vehicle info simply stays hidden */
      },
    );
    return unsubscribe;
  }, [authReady]);

  useEffect(() => {
    if (
      !orderId ||
      orders.length === 0
    ) {
      return;
    }

    const targetOrder = orders.find(
      (order) => order.id === orderId,
    );

    if (!targetOrder) {
      return;
    }

    setFilter("all");
    setSearch(orderId);
    setExpandedId(orderId);
  }, [orderId, orders]);

  const riderVehicleById = useMemo(() => {
    const map = new Map<string, string>();
    for (const rider of riders) {
      if (rider.vehicleNumber) {
        map.set(rider.id, rider.vehicleNumber);
        if (rider.firebaseUid) {
          map.set(rider.firebaseUid, rider.vehicleNumber);
        }
      }
    }
    return map;
  }, [riders]);

  const stats = useMemo(() => {
    const count = (status: OrderStatus) =>
      orders.filter((order) => order.status === status).length;

    return {
      total: orders.length,
      new: count("placed"),
      active:
        count("confirmed") +
        count("preparing") +
        count("out-for-delivery"),
      delivered: count("delivered"),
    };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();

    return orders.filter((order) => {
      if (filter !== "all" && order.status !== filter) {
        return false;
      }

      if (!q) {
        return true;
      }

      const customerName = order.address.fullName?.toLowerCase() ?? "";
      const mobile = order.address.mobile?.toLowerCase() ?? "";
      const id = order.id.toLowerCase();
      const productNames = order.items
        .map((item) => item.name.toLowerCase())
        .join(" ");

      return (
        id.includes(q) ||
        customerName.includes(q) ||
        mobile.includes(q) ||
        productNames.includes(q)
      );
    });
  }, [orders, filter, search]);

  const handleRefresh = () => {
    setRefreshing(true);
    // Realtime listener refreshes automatically.
    setTimeout(() => setRefreshing(false), 500);
  };

  const updateStatus = async (
    order: Order,
    nextStatus: OrderStatus,
  ) => {
    if (updatingId) return;

    try {
      setUpdatingId(order.id);
      await adminUpdateFirebaseOrderStatus(order.id, nextStatus);
    } catch (error) {
      console.error("Order status update failed:", error);
      setErrorText("Unable to update order status.");
    } finally {
      setUpdatingId(null);
    }
  };

  const formatDateTime = (timestamp: number) => {
    try {
      return new Date(timestamp).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "→  -";
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingTitle}>Loading live orders →  ...</Text>
          <Text style={styles.loadingText}>
            Connecting to Firestore order stream.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons
            name="arrow-back"
            size={22}
            color={COLORS.textPrimary}
          />
        </TouchableOpacity>

        <View style={styles.headerTextWrap}>
          <Text style={styles.title}>Live Orders</Text>
          <Text style={styles.subtitle}>
            Manage customer orders in real time
          </Text>
        </View>

        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      </View>

      <FlatList
        data={filteredOrders}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={true}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.primary}
          />
        }
        ListHeaderComponent={
          <View>
            <View style={styles.statsGrid}>
              <StatCard
                label="Total"
                value={stats.total}
                icon="receipt-outline"
              />
              <StatCard
                label="New"
                value={stats.new}
                icon="notifications-outline"
              />
              <StatCard
                label="Active"
                value={stats.active}
                icon="bicycle-outline"
              />
              <StatCard
                label="Delivered"
                value={stats.delivered}
                icon="checkmark-done-outline"
              />
            </View>

            {errorText ? (
              <View style={styles.errorBanner}>
                <Ionicons
                  name="warning-outline"
                  size={18}
                  color={COLORS.danger}
                />
                <Text style={styles.errorText}>{errorText}</Text>
              </View>
            ) : null}

            <View style={styles.searchBox}>
              <Ionicons
                name="search-outline"
                size={19}
                color={COLORS.textMuted}
              />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search order, customer, mobile →  ..."
                placeholderTextColor={COLORS.textMuted}
                style={styles.searchInput}
              />
              {search ? (
                <TouchableOpacity
                  onPress={() => setSearch("")}
                  hitSlop={8}
                >
                  <Ionicons
                    name="close-circle"
                    size={19}
                    color={COLORS.textMuted}
                  />
                </TouchableOpacity>
              ) : null}
            </View>

            <FlatList
              horizontal
              data={FILTERS}
              keyExtractor={(item) => item.key}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterRow}
              renderItem={({ item }) => {
                const active = filter === item.key;

                return (
                  <TouchableOpacity
                    style={[
                      styles.filterChip,
                      active && styles.filterChipActive,
                    ]}
                    onPress={() => setFilter(item.key)}
                  >
                    <Text
                      style={[
                        styles.filterText,
                        active && styles.filterTextActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />

            <View style={styles.resultsHeader}>
              <Text style={styles.resultsTitle}>
                {filteredOrders.length} order
                {filteredOrders.length === 1 ? "" : "s"}
              </Text>
              <Text style={styles.resultsHint}>
                Tap an order to expand
              </Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="receipt-outline"
                size={36}
                color={COLORS.primary}
              />
            </View>
            <Text style={styles.emptyTitle}>No orders found</Text>
            <Text style={styles.emptyText}>
              New Firestore orders will appear here automatically.
            </Text>
          </View>
        }
        ItemSeparatorComponent={() => (
          <View style={{ height: SPACING.md }} />
        )}
        renderItem={({ item }) => {
          const expanded = expandedId === item.id;
          const nextStatus = NEXT_STATUS[item.status];
          const nextLabel = NEXT_STATUS_LABEL[item.status];
          const isUpdating = updatingId === item.id;

          return (
            <View style={styles.orderCard}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() =>
                  setExpandedId(expanded ? null : item.id)
                }
              >
                <View style={styles.orderTopRow}>
                  <View>
                    <Text style={styles.orderId}>{item.id}</Text>
                    <Text style={styles.orderTime}>
                      {formatDateTime(item.createdAt)}
                    </Text>
                  </View>

                  <StatusBadge status={item.status} />
                </View>

                <View style={styles.customerRow}>
                  <View style={styles.customerIcon}>
                    <Ionicons
                      name="person-outline"
                      size={18}
                      color={COLORS.primary}
                    />
                  </View>

                  <View style={styles.customerContent}>
                    <Text style={styles.customerName}>
                      {item.address.fullName || "Customer"}
                    </Text>
                    <Text style={styles.customerMeta}>
                      {item.address.mobile || "No mobile"}
                    </Text>
                  </View>

                  <View style={styles.totalWrap}>
                    <Text style={styles.totalLabel}>Total</Text>
                    <Text style={styles.totalValue}>
                      {formatCurrency(item.total)}
                    </Text>
                  </View>
                </View>

                <View style={styles.summaryRow}>
                  <View style={styles.summaryPill}>
                    <Ionicons
                      name="bag-handle-outline"
                      size={15}
                      color={COLORS.textSecondary}
                    />
                    <Text style={styles.summaryText}>
                      {item.items.reduce(
                        (sum, product) => sum + product.quantity,
                        0,
                      )}{" "}
                      items
                    </Text>
                  </View>

                  <View style={styles.summaryPill}>
                    <Ionicons
                      name={
                        item.paymentMethod === "cod"
                          ? "cash-outline"
                          : "card-outline"
                      }
                      size={15}
                      color={COLORS.textSecondary}
                    />
                    <Text style={styles.summaryText}>
                      {item.paymentMethod === "cod"
                        ? "Cash on Delivery"
                        : "Online"}
                    </Text>
                  </View>

                  <Ionicons
                    name={expanded ? "chevron-up" : "chevron-down"}
                    size={20}
                    color={COLORS.textMuted}
                    style={{ marginLeft: "auto" }}
                  />
                </View>

                {item.deliveryBoyName ? (
                  <View
                    style={[
                      styles.riderStrip,
                      item.status === "out-for-delivery" &&
                        styles.riderStripActive,
                    ]}
                    testID={`rider-strip-${item.id}`}
                  >
                    <Ionicons
                      name={
                        item.status === "delivered"
                          ? "checkmark-done-circle"
                          : "bicycle"
                      }
                      size={15}
                      color={
                        item.status === "delivered"
                          ? "#15803D"
                          : COLORS.primary
                      }
                    />
                    <Text
                      style={[
                        styles.riderStripText,
                        item.status === "delivered" &&
                          styles.riderStripDelivered,
                      ]}
                      numberOfLines={1}
                    >
                      {item.status === "delivered"
                        ? `Delivered by ${item.deliveryBoyName}`
                        : item.status === "out-for-delivery"
                          ? `Out for delivery →  · ${item.deliveryBoyName}`
                          : `Assigned to ${item.deliveryBoyName}`}
                    </Text>
                  </View>
                ) : null}
              </TouchableOpacity>

              {expanded ? (
                <View style={styles.expandedContent}>
                  <View style={styles.divider} />

                  <Text style={styles.detailSectionTitle}>
                    Delivery Address
                  </Text>

                  <View style={styles.addressBox}>
                    <Ionicons
                      name="location-outline"
                      size={19}
                      color={COLORS.primary}
                    />
                    <Text style={styles.addressText}>
                      {[
                        item.address.house,
                        item.address.landmark,
                        item.address.area,
                        item.address.pincode,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </Text>
                  </View>

                  {item.address.instructions ? (
                    <View style={styles.instructionsBox}>
                      <Ionicons
                        name="chatbubble-ellipses-outline"
                        size={17}
                        color={COLORS.textSecondary}
                      />
                      <Text style={styles.instructionsText}>
                        {item.address.instructions}
                      </Text>
                    </View>
                  ) : null}

                  <Text style={styles.detailSectionTitle}>
                    Ordered Items
                  </Text>

                  <View style={styles.itemsBox}>
                    {item.items.map((product, index) => (
                      <View
                        key={`${product.productId}-${index}`}
                        style={[
                          styles.itemRow,
                          index > 0 && styles.itemRowBorder,
                        ]}
                      >
                        <View style={styles.itemQuantity}>
                          <Text style={styles.itemQuantityText}>
                            {product.quantity}→  ×
                          </Text>
                        </View>

                        <View style={styles.itemContent}>
                          <Text style={styles.itemName}>
                            {product.name}
                          </Text>
                          <Text style={styles.itemSize}>
                            {product.size}
                          </Text>
                        </View>

                        <Text style={styles.itemPrice}>
                          {formatCurrency(
                            product.price * product.quantity,
                          )}
                        </Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.billBox}>
                    <BillRow
                      label="Subtotal"
                      value={formatCurrency(item.subtotal)}
                    />
                    {(() => {
                      const discount =
                        item.couponDiscount ??
                        Math.max(0, item.subtotal + item.deliveryFee - item.total);
                      if (discount <= 0) return null;
                      return (
                        <BillRow
                          label={
                            item.couponCode
                              ? `Discount (${item.couponCode})`
                              : "Discount"
                          }
                          value={`-${formatCurrency(discount)}`}
                        />
                      );
                    })()}
                    <BillRow
                      label="Delivery Fee"
                      value={
                        item.deliveryFee === 0
                          ? "FREE"
                          : formatCurrency(item.deliveryFee)
                      }
                    />
                    <View style={styles.billDivider} />
                    <BillRow
                      label="Order Total"
                      value={formatCurrency(item.total)}
                      strong
                    />
                  </View>

                  {item.deliveryBoyName ? (
                    <View
                      style={styles.riderInfoBox}
                      testID={`rider-info-${item.id}`}
                    >
                      <View style={styles.riderInfoIcon}>
                        <Ionicons
                          name={
                            item.status === "delivered"
                              ? "checkmark-done"
                              : "bicycle"
                          }
                          size={18}
                          color={COLORS.primary}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.riderInfoLabel}>
                          {item.status === "delivered"
                            ? "Delivered by"
                            : "Assigned to"}
                        </Text>
                        <Text style={styles.riderInfoName}>
                          {item.deliveryBoyName}
                        </Text>
                        {item.deliveryBoyMobile ? (
                          <Text style={styles.riderInfoMeta}>
                            Mobile: +91 {item.deliveryBoyMobile}
                          </Text>
                        ) : null}
                        {(() => {
                          const vehicle =
                            (item.deliveryBoyId &&
                              riderVehicleById.get(item.deliveryBoyId)) ||
                            (item.deliveryBoyUid &&
                              riderVehicleById.get(item.deliveryBoyUid));
                          return vehicle ? (
                            <Text style={styles.riderInfoMeta}>
                              Vehicle: {vehicle}
                            </Text>
                          ) : null;
                        })()}
                        {item.assignedAt ? (
                          <Text style={styles.riderInfoMeta}>
                            Assigned at: {formatDateTime(item.assignedAt)}
                          </Text>
                        ) : null}
                        {item.status === "delivered" && item.deliveredAt ? (
                          <Text style={styles.riderInfoDelivered}>
                            Delivered at: {formatDateTime(item.deliveredAt)}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  ) : null}

                  <View style={styles.actionRow}>
                    {isOrderEligibleForAssignment(item) ? (
                      <TouchableOpacity
                        style={styles.assignAction}
                        disabled={isUpdating}
                        onPress={() => setAssignForOrder(item)}
                        testID={`assign-rider-btn-${item.id}`}
                      >
                        <Ionicons
                          name={
                            item.deliveryBoyId
                              ? "swap-horizontal-outline"
                              : "bicycle-outline"
                          }
                          size={17}
                          color={COLORS.primary}
                        />
                        <Text style={styles.assignActionText}>
                          {item.deliveryBoyId
                            ? "Change delivery boy"
                            : "Assign rider"}
                        </Text>
                      </TouchableOpacity>
                    ) : null}

                    {nextStatus && nextLabel ? (
                      <TouchableOpacity
                        style={[
                          styles.primaryAction,
                          isUpdating && styles.actionDisabled,
                        ]}
                        disabled={isUpdating}
                        onPress={() =>
                          void updateStatus(item, nextStatus)
                        }
                      >
                        {isUpdating ? (
                          <ActivityIndicator
                            size="small"
                            color={COLORS.textOnPrimary}
                          />
                        ) : (
                          <Ionicons
                            name="checkmark-circle-outline"
                            size={18}
                            color={COLORS.textOnPrimary}
                          />
                        )}
                        <Text style={styles.primaryActionText}>
                          {nextLabel}
                        </Text>
                      </TouchableOpacity>
                    ) : null}

                    {item.status !== "delivered" &&
                    item.status !== "cancelled" ? (
                      <TouchableOpacity
                        style={[
                          styles.cancelAction,
                          isUpdating && styles.actionDisabled,
                        ]}
                        disabled={isUpdating}
                        onPress={() =>
                          void updateStatus(item, "cancelled")
                        }
                      >
                        <Ionicons
                          name="close-circle-outline"
                          size={18}
                          color={COLORS.danger}
                        />
                        <Text style={styles.cancelActionText}>
                          Cancel
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              ) : null}
            </View>
          );
        }}
      />

      <AssignRiderSheet
        order={assignForOrder}
        visible={!!assignForOrder}
        onClose={() => setAssignForOrder(null)}
      />
    </SafeAreaView>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statIcon}>
        <Ionicons name={icon} size={20} color={COLORS.primary} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function StatusBadge({
  status,
}: {
  status: OrderStatus;
}) {
  const statusStyle = getStatusStyle(status);

  return (
    <View
      style={[
        styles.statusBadge,
        { backgroundColor: statusStyle.background },
      ]}
    >
      <View
        style={[
          styles.statusDot,
          { backgroundColor: statusStyle.foreground },
        ]}
      />
      <Text
        style={[
          styles.statusText,
          { color: statusStyle.foreground },
        ]}
      >
        {STATUS_LABELS[status]}
      </Text>
    </View>
  );
}

function BillRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <View style={styles.billRow}>
      <Text
        style={[
          styles.billLabel,
          strong && styles.billStrong,
        ]}
      >
        {label}
      </Text>
      <Text
        style={[
          styles.billValue,
          strong && styles.billStrong,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

function getStatusStyle(status: OrderStatus) {
  switch (status) {
    case "placed":
      return {
        background: "#FFF7E6",
        foreground: "#B7791F",
      };
    case "confirmed":
      return {
        background: "#E8F4FF",
        foreground: "#2563EB",
      };
    case "preparing":
      return {
        background: "#F3E8FF",
        foreground: "#7C3AED",
      };
    case "out-for-delivery":
      return {
        background: "#E0F2FE",
        foreground: "#0369A1",
      };
    case "delivered":
      return {
        background: "#DCFCE7",
        foreground: "#15803D",
      };
    case "cancelled":
      return {
        background: "#FEE2E2",
        foreground: "#B91C1C",
      };
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F7FB",
  },

  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.xl,
    backgroundColor: "#F4F7FB",
  },

  loadingTitle: {
    marginTop: SPACING.md,
    fontSize: 18,
    fontWeight: "900",
    color: "#0F172A",
  },

  loadingText: {
    marginTop: 6,
    fontSize: 12,
    color: "#64748B",
  },

  /* ---------- HEADER ---------- */

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
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

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  headerTextWrap: {
    flex: 1,
    marginLeft: 12,
  },

  title: {
    fontSize: 22,
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

  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#E7F8F1",
    borderWidth: 1,
    borderColor: "#CDEDE1",
  },

  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#0F9F75",
  },

  liveText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#087A5A",
    letterSpacing: 0.3,
  },

  /* ---------- MAIN CONTENT ---------- */

  listContent: {
    padding: 20,
    paddingBottom: 60,
  },

  /* ---------- KPI CARDS ---------- */

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },

  statCard: {
    flexGrow: 1,
    flexBasis: 190,
    minWidth: 170,
    minHeight: 105,
    padding: 15,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    shadowColor: "#0F172A",
    shadowOpacity: 0.055,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },

  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E8F7F3",
  },

  statValue: {
    marginTop: 9,
    fontSize: 23,
    fontWeight: "900",
    color: "#102A43",
    letterSpacing: -0.5,
  },

  statLabel: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: "700",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },

  /* ---------- ERROR ---------- */

  errorBanner: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#FECDD3",
    backgroundColor: "#FFF1F2",
  },

  errorText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: "#BE123C",
  },

  /* ---------- SEARCH ---------- */

  searchBox: {
    marginTop: 16,
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
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
    fontSize: 14,
    fontWeight: "500",
    color: "#0F172A",
  },

  /* ---------- FILTERS ---------- */

  filterRow: {
    gap: 8,
    paddingVertical: 14,
  },

  filterChip: {
    minHeight: 38,
    justifyContent: "center",
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#DDE5EF",
    backgroundColor: "#FFFFFF",
  },

  filterChipActive: {
    backgroundColor: "#102A43",
    borderColor: "#102A43",
    shadowColor: "#102A43",
    shadowOpacity: 0.12,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },

  filterText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
  },

  filterTextActive: {
    color: "#FFFFFF",
  },

  /* ---------- RESULT HEADER ---------- */

  resultsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 2,
    marginBottom: 12,
    paddingHorizontal: 2,
  },

  resultsTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#0F172A",
  },

  resultsHint: {
    fontSize: 10,
    fontWeight: "600",
    color: "#94A3B8",
  },

  /* ---------- EMPTY ---------- */

  emptyState: {
    alignItems: "center",
    paddingVertical: 70,
  },

  emptyIcon: {
    width: 76,
    height: 76,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E8F7F3",
    borderWidth: 1,
    borderColor: "#CBE9E1",
  },

  emptyTitle: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: "900",
    color: "#0F172A",
  },

  emptyText: {
    marginTop: 6,
    maxWidth: 300,
    textAlign: "center",
    fontSize: 12,
    lineHeight: 19,
    color: "#64748B",
  },

  /* ---------- ORDER CARD ---------- */

  orderCard: {
    padding: 17,
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

  orderTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },

  orderId: {
    fontSize: 15,
    fontWeight: "900",
    color: "#102A43",
    letterSpacing: -0.2,
  },

  orderTime: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: "500",
    color: "#94A3B8",
  },

  /* ---------- STATUS ---------- */

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 30,
    paddingHorizontal: 11,
    borderRadius: 10,
  },

  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },

  statusText: {
    fontSize: 10,
    fontWeight: "900",
  },

  /* ---------- CUSTOMER ---------- */

  customerRow: {
    marginTop: 15,
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#EEF2F6",
  },

  customerIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E8F7F3",
    borderWidth: 1,
    borderColor: "#D4EEE7",
  },

  customerContent: {
    flex: 1,
    marginLeft: 11,
  },

  customerName: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },

  customerMeta: {
    marginTop: 3,
    fontSize: 10,
    color: "#64748B",
  },

  totalWrap: {
    alignItems: "flex-end",
    paddingLeft: 12,
  },

  totalLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  totalValue: {
    marginTop: 3,
    fontSize: 17,
    fontWeight: "900",
    color: "#102A43",
  },

  /* ---------- SUMMARY ---------- */

  summaryRow: {
    marginTop: 13,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 7,
  },

  summaryPill: {
    minHeight: 30,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
  },

  summaryText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#475569",
  },

  /* ---------- EXPANDED ORDER ---------- */

  expandedContent: {
    marginTop: 12,
  },

  divider: {
    height: 1,
    backgroundColor: "#E8EDF3",
    marginVertical: 16,
  },

  detailSectionTitle: {
    marginBottom: 10,
    fontSize: 12,
    fontWeight: "900",
    color: "#102A43",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },

  /* ---------- ADDRESS ---------- */

  addressBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
  },

  addressText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 19,
    color: "#475569",
  },

  instructionsBox: {
    marginTop: 9,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#FFF7DF",
    borderWidth: 1,
    borderColor: "#F4D98B",
  },

  instructionsText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 17,
    color: "#7C5A0A",
  },

  /* ---------- ITEMS ---------- */

  itemsBox: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
  },

  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    backgroundColor: "#FFFFFF",
  },

  itemRowBorder: {
    borderTopWidth: 1,
    borderTopColor: "#EEF2F6",
  },

  itemQuantity: {
    minWidth: 40,
  },

  itemQuantityText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#0F766E",
  },

  itemContent: {
    flex: 1,
  },

  itemName: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0F172A",
  },

  itemSize: {
    marginTop: 3,
    fontSize: 10,
    color: "#94A3B8",
  },

  itemPrice: {
    fontSize: 12,
    fontWeight: "900",
    color: "#102A43",
  },

  /* ---------- BILL ---------- */

  billBox: {
    marginTop: 14,
    padding: 15,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#DDE5EF",
    backgroundColor: "#F8FAFC",
  },

  billRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 5,
  },

  billLabel: {
    fontSize: 12,
    color: "#64748B",
  },

  billValue: {
    fontSize: 12,
    fontWeight: "600",
    color: "#334155",
  },

  billStrong: {
    fontWeight: "900",
    color: "#102A43",
  },

  billDivider: {
    height: 1,
    backgroundColor: "#DDE5EF",
    marginVertical: 10,
  },

  /* ---------- ACTIONS ---------- */

  actionRow: {
    marginTop: 16,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
  },

  primaryAction: {
    flex: 1,
    minWidth: 150,
    minHeight: 47,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "#102A43",
    shadowColor: "#102A43",
    shadowOpacity: 0.15,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },

  primaryActionText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  cancelAction: {
    minHeight: 47,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F1B8B8",
    backgroundColor: "#FDECEC",
  },

  cancelActionText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#C53030",
  },

  actionDisabled: {
    opacity: 0.48,
  },

  assignAction: {
    minHeight: 47,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#CDE7E2",
    backgroundColor: "#E7F8F1",
  },

  assignActionText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#087A5A",
  },

  /* ---------- RIDER ---------- */

  riderInfoBox: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#EEF6FF",
    borderWidth: 1,
    borderColor: "#D4E6F8",
  },

  riderInfoIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DDE8F3",
  },

  riderInfoLabel: {
    fontSize: 9,
    fontWeight: "900",
    color: "#64748B",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },

  riderInfoName: {
    marginTop: 3,
    fontSize: 13,
    fontWeight: "900",
    color: "#102A43",
  },

  riderInfoMeta: {
    marginTop: 3,
    fontSize: 10,
    color: "#64748B",
  },

  riderInfoDelivered: {
    marginTop: 3,
    fontSize: 10,
    fontWeight: "800",
    color: "#15803D",
  },

  riderStrip: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 11,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
  },

  riderStripActive: {
    backgroundColor: "#E0F2FE",
    borderColor: "#BAE6FD",
  },

  riderStripText: {
    flex: 1,
    fontSize: 10,
    fontWeight: "700",
    color: "#64748B",
  },

  riderStripDelivered: {
    color: "#15803D",
  },
});
