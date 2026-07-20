import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/src/components/Button";
import { EmptyState } from "@/src/components/EmptyState";
import { StatusPill } from "@/src/components/StatusPill";
import { COLORS, FONT, RADIUS, SHADOW, SPACING } from "@/src/config/theme";
import { useApp } from "@/src/context/AppContext";
import type { Order, OrderStatus } from "@/src/types";
import { formatCurrency, formatDateTime } from "@/src/utils/format";

const ACTIVE: OrderStatus[] = ["placed", "confirmed", "preparing", "out-for-delivery"];

const STATUS_LABEL: Record<OrderStatus, string> = {
  placed: "Order Placed",
  confirmed: "Confirmed",
  preparing: "Preparing",
  "out-for-delivery": "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const STATUS_TONE: Record<OrderStatus, "primary" | "warning" | "info" | "success" | "danger"> = {
  placed: "info",
  confirmed: "info",
  preparing: "warning",
  "out-for-delivery": "warning",
  delivered: "success",
  cancelled: "danger",
};

export default function OrdersScreen() {
  const router = useRouter();
  const { orders } = useApp();
  const [tab, setTab] = useState<"active" | "past">("active");

  const filtered = orders.filter((o) =>
    tab === "active" ? ACTIVE.includes(o.status) : !ACTIVE.includes(o.status),
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>My Orders</Text>
      </View>
      <View style={styles.tabs}>
        {(["active", "past"] as const).map((k) => (
          <TouchableOpacity
            key={k}
            style={[styles.tab, tab === k && styles.tabActive]}
            onPress={() => setTab(k)}
            testID={`orders-tab-${k}`}
          >
            <Text style={[styles.tabText, tab === k && styles.tabTextActive]}>
              {k === "active" ? "Active" : "Past Orders"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {filtered.length === 0 ? (
        <EmptyState
          icon="receipt-outline"
          title={tab === "active" ? "No active orders" : "No past orders yet"}
          description={
            tab === "active"
              ? "When you place an order, it'll show up here."
              : "Your delivered and cancelled orders will appear here."
          }
        >
          <Button label="Start Shopping" onPress={() => router.push("/(tabs)")} testID="orders-shop-btn" />
        </EmptyState>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(o) => o.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: SPACING.md }} />}
          renderItem={({ item }) => <OrderCard order={item} onPress={() => router.push({ pathname: "/order/[id]", params: { id: item.id } })} />}
        />
      )}
    </SafeAreaView>
  );
}

const OrderCard: React.FC<{ order: Order; onPress: () => void }> = ({ order, onPress }) => {
  const first = order.items[0];
  const more = order.items.length - 1;
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={styles.card} testID={`order-card-${order.id}`}>
      <View style={styles.cardTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.orderId}>#{order.id}</Text>
          <Text style={styles.orderDate}>{formatDateTime(order.createdAt)}</Text>
        </View>
        <StatusPill label={STATUS_LABEL[order.status]} tone={STATUS_TONE[order.status]} />
      </View>
      <View style={styles.divider} />
      <Text style={styles.itemsText} numberOfLines={2}>
        {first?.name}{more > 0 ? ` + ${more} more item${more > 1 ? "s" : ""}` : ""}
      </Text>
      <View style={styles.cardBottom}>
        <Text style={styles.total}>{formatCurrency(order.total)}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Text style={styles.viewText}>View details</Text>
          <Ionicons name="chevron-forward" size={14} color={COLORS.primary} />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { padding: SPACING.lg, paddingBottom: SPACING.sm },
  title: { fontSize: FONT.size.xxl, fontWeight: FONT.weight.bold, color: COLORS.textPrimary },
  tabs: {
    flexDirection: "row",
    marginHorizontal: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.pill,
    padding: 4,
    marginBottom: SPACING.md,
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: RADIUS.pill },
  tabActive: { backgroundColor: COLORS.background, ...SHADOW.card },
  tabText: { color: COLORS.textSecondary, fontWeight: FONT.weight.semibold, fontSize: FONT.size.sm },
  tabTextActive: { color: COLORS.textPrimary },
  list: { padding: SPACING.md, paddingBottom: SPACING.xxxl },
  card: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    padding: SPACING.md,
    ...SHADOW.card,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  orderId: { fontSize: FONT.size.md, fontWeight: FONT.weight.bold, color: COLORS.textPrimary },
  orderDate: { fontSize: FONT.size.xs, color: COLORS.textSecondary, marginTop: 2 },
  divider: { height: 1, backgroundColor: COLORS.borderLight, marginVertical: SPACING.sm },
  itemsText: { fontSize: FONT.size.sm, color: COLORS.textSecondary, marginBottom: SPACING.sm },
  cardBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  total: { fontSize: FONT.size.lg, fontWeight: FONT.weight.bold, color: COLORS.textPrimary },
  viewText: { color: COLORS.primary, fontWeight: FONT.weight.semibold, fontSize: FONT.size.sm },
});
