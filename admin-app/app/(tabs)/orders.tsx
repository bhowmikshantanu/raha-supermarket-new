import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
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
import { StatusPill } from "@/src/components/StatusPill";
import {
  COLORS,
  FONT,
  RADIUS,
  SHADOW,
  SPACING,
} from "@/src/config/theme";
import { useApp } from "@/src/context/AppContext";
import type { Order, OrderStatus } from "@/src/types";
import {
  formatCurrency,
  formatDateTime,
} from "@/src/utils/format";

type OrdersTab = "active" | "past";

const ACTIVE_STATUSES: OrderStatus[] = [
  "placed",
  "confirmed",
  "preparing",
  "out-for-delivery",
];

const STATUS_LABEL: Record<OrderStatus, string> = {
  placed: "Order Placed",
  confirmed: "Confirmed",
  preparing: "Preparing",
  "out-for-delivery": "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
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

const STATUS_ICON: Record<
  OrderStatus,
  React.ComponentProps<typeof Ionicons>["name"]
> = {
  placed: "receipt-outline",
  confirmed: "checkmark-circle-outline",
  preparing: "basket-outline",
  "out-for-delivery": "bicycle-outline",
  delivered: "shield-checkmark-outline",
  cancelled: "close-circle-outline",
};

const STATUS_MESSAGE: Record<OrderStatus, string> = {
  placed: "Your order has been placed successfully.",
  confirmed: "The store has confirmed your order.",
  preparing: "Your items are being packed.",
  "out-for-delivery": "Your order is on the way.",
  delivered: "Your order has been delivered.",
  cancelled: "This order was cancelled.",
};

const ACTIVE_STEPS: OrderStatus[] = [
  "placed",
  "confirmed",
  "preparing",
  "out-for-delivery",
];

export default function OrdersScreen() {
  const router = useRouter();
  const { orders } = useApp();

  const [tab, setTab] = useState<OrdersTab>("active");

  const activeOrders = useMemo(
    () =>
      orders
        .filter((order) =>
          ACTIVE_STATUSES.includes(order.status)
        )
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() -
            new Date(a.createdAt).getTime()
        ),
    [orders]
  );

  const pastOrders = useMemo(
    () =>
      orders
        .filter(
          (order) =>
            !ACTIVE_STATUSES.includes(order.status)
        )
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() -
            new Date(a.createdAt).getTime()
        ),
    [orders]
  );

  const filteredOrders =
    tab === "active" ? activeOrders : pastOrders;

  const openOrder = (orderId: string) => {
    router.push({
      pathname: "/order/[id]",
      params: { id: orderId },
    });
  };

  const startShopping = () => {
    router.push("/(tabs)");
  };

  return (
    <SafeAreaView
      style={styles.container}
      edges={["top"]}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>
            RAHA SUPERMARKET
          </Text>

          <Text style={styles.title}>My Orders</Text>

          <Text style={styles.subtitle}>
            Track, review and manage your purchases
          </Text>
        </View>

        <View style={styles.headerIcon}>
          <Ionicons
            name="cube-outline"
            size={24}
            color={COLORS.primary}
          />
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <View style={styles.statIcon}>
            <Ionicons
              name="bicycle-outline"
              size={18}
              color={COLORS.primary}
            />
          </View>

          <View>
            <Text style={styles.statValue}>
              {activeOrders.length}
            </Text>
            <Text style={styles.statLabel}>
              Active
            </Text>
          </View>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statIcon}>
            <Ionicons
              name="checkmark-done-outline"
              size={18}
              color={COLORS.primary}
            />
          </View>

          <View>
            <Text style={styles.statValue}>
              {pastOrders.length}
            </Text>
            <Text style={styles.statLabel}>
              Previous
            </Text>
          </View>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statIcon}>
            <Ionicons
              name="receipt-outline"
              size={18}
              color={COLORS.primary}
            />
          </View>

          <View>
            <Text style={styles.statValue}>
              {orders.length}
            </Text>
            <Text style={styles.statLabel}>
              Total
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.tabs}>
        <TabButton
          label="Active Orders"
          count={activeOrders.length}
          active={tab === "active"}
          onPress={() => setTab("active")}
          testID="orders-tab-active"
        />

        <TabButton
          label="Past Orders"
          count={pastOrders.length}
          active={tab === "past"}
          onPress={() => setTab("past")}
          testID="orders-tab-past"
        />
      </View>

      {filteredOrders.length === 0 ? (
        <View style={styles.emptyWrapper}>
          <EmptyState
            icon={
              tab === "active"
                ? "bag-check-outline"
                : "receipt-outline"
            }
            title={
              tab === "active"
                ? "No active orders"
                : "No past orders yet"
            }
            description={
              tab === "active"
                ? "Your newly placed and ongoing orders will appear here."
                : "Delivered and cancelled orders will appear here."
            }
          >
            <Button
              label="Start Shopping"
              onPress={startShopping}
              testID="orders-shop-btn"
            />
          </EmptyState>
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(order) => order.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => (
            <View style={styles.listSeparator} />
          )}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <Text style={styles.listTitle}>
                {tab === "active"
                  ? "Ongoing orders"
                  : "Order history"}
              </Text>

              <Text style={styles.listCount}>
                {filteredOrders.length} order
                {filteredOrders.length !== 1 ? "s" : ""}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <OrderCard
              order={item}
              onPress={() => openOrder(item.id)}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

interface TabButtonProps {
  label: string;
  count: number;
  active: boolean;
  onPress: () => void;
  testID: string;
}

function TabButton({
  label,
  count,
  active,
  onPress,
  testID,
}: TabButtonProps) {
  return (
    <TouchableOpacity
      style={[
        styles.tab,
        active && styles.tabActive,
      ]}
      onPress={onPress}
      activeOpacity={0.85}
      testID={testID}
    >
      <Text
        style={[
          styles.tabText,
          active && styles.tabTextActive,
        ]}
      >
        {label}
      </Text>

      <View
        style={[
          styles.tabBadge,
          active && styles.tabBadgeActive,
        ]}
      >
        <Text
          style={[
            styles.tabBadgeText,
            active && styles.tabBadgeTextActive,
          ]}
        >
          {count}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

interface OrderCardProps {
  order: Order;
  onPress: () => void;
}

function OrderCard({
  order,
  onPress,
}: OrderCardProps) {
  const firstItem = order.items[0];
  const remainingItems = order.items.length - 1;
  const isActive = ACTIVE_STATUSES.includes(
    order.status
  );

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.88}
      style={styles.card}
      testID={`order-card-${order.id}`}
    >
      <View style={styles.cardAccent} />

      <View style={styles.cardContent}>
        <View style={styles.cardTop}>
          <View style={styles.orderIdentity}>
            <View style={styles.orderIcon}>
              <Ionicons
                name={STATUS_ICON[order.status]}
                size={21}
                color={COLORS.primary}
              />
            </View>

            <View style={styles.orderIdentityText}>
              <Text
                style={styles.orderId}
                numberOfLines={1}
              >
                Order #{shortOrderId(order.id)}
              </Text>

              <Text style={styles.orderDate}>
                {formatDateTime(order.createdAt)}
              </Text>
            </View>
          </View>

          <StatusPill
            label={STATUS_LABEL[order.status]}
            tone={STATUS_TONE[order.status]}
          />
        </View>

        <View style={styles.statusMessageRow}>
          <Ionicons
            name="information-circle-outline"
            size={16}
            color={COLORS.textSecondary}
          />

          <Text style={styles.statusMessage}>
            {STATUS_MESSAGE[order.status]}
          </Text>
        </View>

        {isActive && (
          <OrderProgress status={order.status} />
        )}

        <View style={styles.divider} />

        <View style={styles.productsSection}>
          <View style={styles.productIllustration}>
            <Ionicons
              name="basket-outline"
              size={24}
              color={COLORS.primary}
            />
          </View>

          <View style={styles.productInfo}>
            <Text
              style={styles.itemsText}
              numberOfLines={2}
            >
              {firstItem?.name ?? "Order items"}
              {remainingItems > 0
                ? ` + ${remainingItems} more item${
                    remainingItems > 1 ? "s" : ""
                  }`
                : ""}
            </Text>

            <Text style={styles.itemCount}>
              {order.items.length} item
              {order.items.length !== 1 ? "s" : ""} in
              this order
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.cardBottom}>
          <View>
            <Text style={styles.totalLabel}>
              Order Total
            </Text>

            <Text style={styles.total}>
              {formatCurrency(order.total)}
            </Text>
          </View>

          <View style={styles.viewButton}>
            <Text style={styles.viewText}>
              View Details
            </Text>

            <Ionicons
              name="arrow-forward"
              size={16}
              color={COLORS.textOnPrimary}
            />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function OrderProgress({
  status,
}: {
  status: OrderStatus;
}) {
  const currentIndex = ACTIVE_STEPS.indexOf(status);

  if (currentIndex < 0) {
    return null;
  }

  return (
    <View style={styles.progressContainer}>
      <View style={styles.progressTrack}>
        {ACTIVE_STEPS.map((step, index) => {
          const completed = index <= currentIndex;
          const isLast =
            index === ACTIVE_STEPS.length - 1;

          return (
            <React.Fragment key={step}>
              <View
                style={[
                  styles.progressDot,
                  completed &&
                    styles.progressDotCompleted,
                ]}
              >
                {completed && (
                  <Ionicons
                    name="checkmark"
                    size={11}
                    color={COLORS.textOnPrimary}
                  />
                )}
              </View>

              {!isLast && (
                <View
                  style={[
                    styles.progressLine,
                    index < currentIndex &&
                      styles.progressLineCompleted,
                  ]}
                />
              )}
            </React.Fragment>
          );
        })}
      </View>

      <View style={styles.progressLabels}>
        <Text style={styles.progressLabel}>
          Placed
        </Text>
        <Text style={styles.progressLabel}>
          Confirmed
        </Text>
        <Text style={styles.progressLabel}>
          Packing
        </Text>
        <Text style={styles.progressLabel}>
          On Way
        </Text>
      </View>
    </View>
  );
}

function shortOrderId(orderId: string) {
  if (orderId.length <= 12) {
    return orderId;
  }

  return orderId.slice(-10).toUpperCase();
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
  },

  eyebrow: {
    marginBottom: 3,
    fontSize: 10,
    fontWeight: FONT.weight.bold,
    letterSpacing: 1.3,
    color: COLORS.primary,
  },

  title: {
    fontSize: FONT.size.xxl,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },

  subtitle: {
    marginTop: 4,
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
  },

  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surface,
  },

  statsRow: {
    flexDirection: "row",
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },

  statCard: {
    flex: 1,
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },

  statIcon: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.background,
  },

  statValue: {
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },

  statLabel: {
    marginTop: 1,
    fontSize: 10,
    color: COLORS.textSecondary,
  },

  tabs: {
    flexDirection: "row",
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    padding: 4,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.pill,
  },

  tab: {
    flex: 1,
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderRadius: RADIUS.pill,
  },

  tabActive: {
    backgroundColor: COLORS.background,
    ...SHADOW.card,
  },

  tabText: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.semibold,
    color: COLORS.textSecondary,
  },

  tabTextActive: {
    color: COLORS.textPrimary,
  },

  tabBadge: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: RADIUS.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.background,
  },

  tabBadgeActive: {
    backgroundColor: COLORS.primary,
  },

  tabBadgeText: {
    fontSize: 10,
    fontWeight: FONT.weight.bold,
    color: COLORS.textSecondary,
  },

  tabBadgeTextActive: {
    color: COLORS.textOnPrimary,
  },

  emptyWrapper: {
    flex: 1,
    paddingHorizontal: SPACING.md,
  },

  list: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xxxl,
  },

  listSeparator: {
    height: SPACING.md,
  },

  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: SPACING.md,
  },

  listTitle: {
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },

  listCount: {
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
  },

  card: {
    position: "relative",
    overflow: "hidden",
    flexDirection: "row",
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.xl ?? RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOW.card,
  },

  cardAccent: {
    width: 5,
    backgroundColor: COLORS.primary,
  },

  cardContent: {
    flex: 1,
    padding: SPACING.md,
  },

  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: SPACING.sm,
  },

  orderIdentity: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },

  orderIcon: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surface,
  },

  orderIdentityText: {
    flex: 1,
  },

  orderId: {
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },

  orderDate: {
    marginTop: 3,
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
  },

  statusMessageRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
  },

  statusMessage: {
    flex: 1,
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
  },

  progressContainer: {
    marginTop: SPACING.md,
  },

  progressTrack: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 5,
  },

  progressDot: {
    width: 20,
    height: 20,
    borderRadius: RADIUS.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.borderLight,
  },

  progressDotCompleted: {
    backgroundColor: COLORS.primary,
  },

  progressLine: {
    flex: 1,
    height: 3,
    backgroundColor: COLORS.borderLight,
  },

  progressLineCompleted: {
    backgroundColor: COLORS.primary,
  },

  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },

  progressLabel: {
    width: "24%",
    fontSize: 9,
    textAlign: "center",
    color: COLORS.textSecondary,
  },

  divider: {
    height: 1,
    marginVertical: SPACING.md,
    backgroundColor: COLORS.borderLight,
  },

  productsSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },

  productIllustration: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surface,
  },

  productInfo: {
    flex: 1,
  },

  itemsText: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.semibold,
    lineHeight: 19,
    color: COLORS.textPrimary,
  },

  itemCount: {
    marginTop: 4,
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
  },

  cardBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  totalLabel: {
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
  },

  total: {
    marginTop: 2,
    fontSize: FONT.size.lg,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },

  viewButton: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.primary,
  },

  viewText: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.semibold,
    color: COLORS.textOnPrimary,
  },
});