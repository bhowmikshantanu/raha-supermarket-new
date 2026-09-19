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

    // Rider directory â€” used to enrich orders with vehicle numbers.
    const unsubscribe = subscribeToDeliveryBoys(
      (items) => setRiders(items),
      () => {
        /* non-fatal â€” vehicle info simply stays hidden */
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
      return "â€”";
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingTitle}>Loading live ordersâ€¦</Text>
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
                placeholder="Search order, customer, mobileâ€¦"
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
                          ? `Out for delivery Â· ${item.deliveryBoyName}`
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
                            {product.quantity}Ã—
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
    backgroundColor: COLORS.background,
  },

  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.xl,
  },

  loadingTitle: {
    marginTop: SPACING.md,
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },

  loadingText: {
    marginTop: 5,
    fontSize: FONT.size.sm,
    color: COLORS.textSecondary,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    backgroundColor: COLORS.background,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surface,
  },

  headerTextWrap: {
    flex: 1,
    marginLeft: SPACING.sm,
  },

  title: {
    fontSize: FONT.size.xl,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },

  subtitle: {
    marginTop: 2,
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
  },

  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.primaryLight,
  },

  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },

  liveText: {
    fontSize: 10,
    fontWeight: FONT.weight.bold,
    color: COLORS.primary,
  },

  listContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxxl,
  },

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
  },

  statCard: {
    width: "48.5%",
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    backgroundColor: COLORS.background,
    ...SHADOW.card,
  },

  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primaryLight,
  },

  statValue: {
    marginTop: 8,
    fontSize: FONT.size.xl,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },

  statLabel: {
    marginTop: 2,
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
  },

  errorBanner: {
    marginTop: SPACING.md,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: "#FEF2F2",
  },

  errorText: {
    flex: 1,
    fontSize: FONT.size.sm,
    color: COLORS.danger,
  },

  searchBox: {
    marginTop: SPACING.md,
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    backgroundColor: COLORS.background,
  },

  searchInput: {
    flex: 1,
    fontSize: FONT.size.sm,
    color: COLORS.textPrimary,
  },

  filterRow: {
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
  },

  filterChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 9,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    backgroundColor: COLORS.background,
  },

  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },

  filterText: {
    fontSize: FONT.size.xs,
    fontWeight: FONT.weight.semibold,
    color: COLORS.textSecondary,
  },

  filterTextActive: {
    color: COLORS.textOnPrimary,
  },

  resultsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.md,
  },

  resultsTitle: {
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },

  resultsHint: {
    fontSize: FONT.size.xs,
    color: COLORS.textMuted,
  },

  emptyState: {
    alignItems: "center",
    paddingVertical: SPACING.xxxl,
  },

  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primaryLight,
  },

  emptyTitle: {
    marginTop: SPACING.md,
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },

  emptyText: {
    marginTop: 5,
    maxWidth: 280,
    textAlign: "center",
    fontSize: FONT.size.sm,
    lineHeight: 20,
    color: COLORS.textSecondary,
  },

  orderCard: {
    padding: SPACING.md,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    backgroundColor: COLORS.background,
    ...SHADOW.card,
  },

  orderTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: SPACING.sm,
  },

  orderId: {
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },

  orderTime: {
    marginTop: 3,
    fontSize: FONT.size.xs,
    color: COLORS.textMuted,
  },

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
  },

  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },

  statusText: {
    fontSize: 10,
    fontWeight: FONT.weight.bold,
  },

  customerRow: {
    marginTop: SPACING.md,
    flexDirection: "row",
    alignItems: "center",
  },

  customerIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primaryLight,
  },

  customerContent: {
    flex: 1,
    marginLeft: SPACING.sm,
  },

  customerName: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.semibold,
    color: COLORS.textPrimary,
  },

  customerMeta: {
    marginTop: 2,
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
  },

  totalWrap: {
    alignItems: "flex-end",
  },

  totalLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
  },

  totalValue: {
    marginTop: 2,
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },

  summaryRow: {
    marginTop: SPACING.md,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },

  summaryPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surface,
  },

  summaryText: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },

  expandedContent: {
    marginTop: SPACING.sm,
  },

  divider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginVertical: SPACING.md,
  },

  detailSectionTitle: {
    marginBottom: SPACING.sm,
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
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
    flex: 1,
    fontSize: FONT.size.sm,
    lineHeight: 20,
    color: COLORS.textSecondary,
  },

  instructionsBox: {
    marginTop: SPACING.sm,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: SPACING.sm,
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
  },

  instructionsText: {
    flex: 1,
    fontSize: FONT.size.xs,
    lineHeight: 18,
    color: COLORS.textSecondary,
  },

  itemsBox: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    overflow: "hidden",
  },

  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.md,
    backgroundColor: COLORS.background,
  },

  itemRowBorder: {
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },

  itemQuantity: {
    minWidth: 34,
  },

  itemQuantityText: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.bold,
    color: COLORS.primary,
  },

  itemContent: {
    flex: 1,
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
    marginTop: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
  },

  billRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 4,
  },

  billLabel: {
    fontSize: FONT.size.sm,
    color: COLORS.textSecondary,
  },

  billValue: {
    fontSize: FONT.size.sm,
    color: COLORS.textPrimary,
  },

  billStrong: {
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },

  billDivider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginVertical: SPACING.sm,
  },

  actionRow: {
    marginTop: SPACING.md,
    flexDirection: "row",
    gap: SPACING.sm,
  },

  primaryAction: {
    flex: 1,
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
  },

  primaryActionText: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.bold,
    color: COLORS.textOnPrimary,
  },

  cancelAction: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.danger,
    backgroundColor: COLORS.background,
  },

  cancelActionText: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.bold,
    color: COLORS.danger,
  },

  actionDisabled: {
    opacity: 0.6,
  },

  assignAction: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  assignActionText: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.bold,
    color: COLORS.primary,
  },

  riderInfoBox: {
    marginTop: SPACING.md,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
  },
  riderInfoIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.background,
  },
  riderInfoLabel: {
    fontSize: 10,
    fontWeight: FONT.weight.bold,
    color: COLORS.textMuted,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  riderInfoName: {
    marginTop: 2,
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },
  riderInfoMeta: {
    marginTop: 2,
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
  },
  riderInfoDelivered: {
    marginTop: 2,
    fontSize: FONT.size.xs,
    fontWeight: FONT.weight.semibold,
    color: "#15803D",
  },

  riderStrip: {
    marginTop: SPACING.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 7,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
  },
  riderStripActive: {
    backgroundColor: "#E0F2FE",
  },
  riderStripText: {
    flex: 1,
    fontSize: FONT.size.xs,
    fontWeight: FONT.weight.semibold,
    color: COLORS.textSecondary,
  },
  riderStripDelivered: {
    color: "#15803D",
  },
});

