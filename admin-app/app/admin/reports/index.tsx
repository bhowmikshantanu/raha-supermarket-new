import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
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
import { useProducts } from "@/src/context/ProductContext";
import { subscribeToAllOrders } from "@/src/services/firebaseOrders";
import type { Order, OrderStatus } from "@/src/types";
import { formatCurrency } from "@/src/utils/format";

type StatusSummary = {
  status: OrderStatus;
  label: string;
  count: number;
};

type ProductSalesRow = {
  productId: string;
  name: string;
  quantity: number;
  revenue: number;
};

const STATUS_LABELS: Record<OrderStatus, string> = {
  placed: "New",
  confirmed: "Confirmed",
  preparing: "Preparing",
  "out-for-delivery": "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export default function AdminReportsScreen() {
  const router = useRouter();
  const { products, loading: productsLoading } = useProducts();
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    const unsubscribe = subscribeToAllOrders(
      (items) => {
        setOrders(items);
        setOrdersLoading(false);
        setErrorText("");
      },
      (error) => {
        console.error("Reports order subscription failed:", error);
        setOrdersLoading(false);
        setErrorText("Unable to load live order data from Firebase.");
      },
    );

    return unsubscribe;
  }, []);

  const report = useMemo(() => {
    const deliveredOrders = orders.filter((order) => order.status === "delivered");
    const cancelledOrders = orders.filter((order) => order.status === "cancelled");
    const activeOrders = orders.filter((order) =>
      order.status === "placed" ||
      order.status === "confirmed" ||
      order.status === "preparing" ||
      order.status === "out-for-delivery"
    );

    const sales = deliveredOrders.reduce(
      (sum, order) => sum + Number(order.total || 0),
      0,
    );

    const averageOrderValue = deliveredOrders.length > 0
      ? sales / deliveredOrders.length
      : 0;

    const totalItemsSold = deliveredOrders.reduce(
      (orderTotal, order) =>
        orderTotal + order.items.reduce(
          (itemTotal, item) => itemTotal + Number(item.quantity || 0),
          0,
        ),
      0,
    );

    const productSalesMap = new Map<string, ProductSalesRow>();

    for (const order of deliveredOrders) {
      for (const item of order.items) {
        const current = productSalesMap.get(item.productId) ?? {
          productId: item.productId,
          name: item.name,
          quantity: 0,
          revenue: 0,
        };

        current.quantity += Number(item.quantity || 0);
        current.revenue += Number(item.price || 0) * Number(item.quantity || 0);
        productSalesMap.set(item.productId, current);
      }
    }

    const topProducts = Array.from(productSalesMap.values())
      .sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue)
      .slice(0, 5);

    const statusSummary: StatusSummary[] = (
      Object.keys(STATUS_LABELS) as OrderStatus[]
    ).map((status) => ({
      status,
      label: STATUS_LABELS[status],
      count: orders.filter((order) => order.status === status).length,
    }));

    const lowStockProducts = products
      .filter((product) => product.stock > 0 && product.stock <= 5)
      .sort((a, b) => a.stock - b.stock);

    const outOfStockProducts = products.filter((product) => product.stock <= 0);

    const inventoryRetailValue = products.reduce(
      (sum, product) =>
        sum + Number(product.price || 0) * Number(product.stock || 0),
      0,
    );

    return {
      sales,
      averageOrderValue,
      totalItemsSold,
      deliveredCount: deliveredOrders.length,
      cancelledCount: cancelledOrders.length,
      activeCount: activeOrders.length,
      totalOrders: orders.length,
      topProducts,
      statusSummary,
      lowStockProducts,
      outOfStockProducts,
      inventoryRetailValue,
    };
  }, [orders, products]);

  if (productsLoading || ordersLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading live reports...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.heading}>Reports & Insights</Text>
          <Text style={styles.subheading}>Live sales, orders and inventory overview</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={true}>
        {errorText ? (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle-outline" size={20} color="#B91C1C" />
            <Text style={styles.errorText}>{errorText}</Text>
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>Sales Overview</Text>
        <View style={styles.metricGrid}>
          <MetricCard icon="cash-outline" label="Delivered Sales" value={formatCurrency(report.sales)} note="Revenue from delivered orders" />
          <MetricCard icon="receipt-outline" label="Total Orders" value={String(report.totalOrders)} note={`${report.deliveredCount} delivered`} />
          <MetricCard icon="calculator-outline" label="Average Order" value={formatCurrency(report.averageOrderValue)} note="Delivered orders only" />
          <MetricCard icon="cube-outline" label="Items Sold" value={String(report.totalItemsSold)} note="Delivered quantities" />
        </View>

        <Text style={styles.sectionTitle}>Order Status</Text>
        <View style={styles.card}>
          {report.statusSummary.map((item, index) => (
            <View key={item.status} style={[styles.statusRow, index < report.statusSummary.length - 1 && styles.rowDivider]}>
              <View style={styles.statusLeft}>
                <View style={[styles.statusDot, getStatusDotStyle(item.status)]} />
                <Text style={styles.statusLabel}>{item.label}</Text>
              </View>
              <Text style={styles.statusCount}>{item.count}</Text>
            </View>
          ))}
        </View>

        <View style={styles.secondaryMetricRow}>
          <SmallMetric label="Active Orders" value={report.activeCount} icon="time-outline" />
          <SmallMetric label="Cancelled" value={report.cancelledCount} icon="close-circle-outline" />
          <SmallMetric label="Delivered" value={report.deliveredCount} icon="checkmark-circle-outline" />
        </View>

        <Text style={styles.sectionTitle}>Top Selling Products</Text>
        <View style={styles.card}>
          {report.topProducts.length === 0 ? (
            <EmptyState icon="stats-chart-outline" title="No delivered sales yet" message="Top products will appear after delivered orders are available." />
          ) : (
            report.topProducts.map((item, index) => (
              <View key={item.productId} style={[styles.productRow, index < report.topProducts.length - 1 && styles.rowDivider]}>
                <View style={styles.rankCircle}><Text style={styles.rankText}>{index + 1}</Text></View>
                <View style={styles.productInfo}>
                  <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.productMeta}>{item.quantity} item(s) sold</Text>
                </View>
                <Text style={styles.productRevenue}>{formatCurrency(item.revenue)}</Text>
              </View>
            ))
          )}
        </View>

        <Text style={styles.sectionTitle}>Inventory Insights</Text>
        <View style={styles.metricGrid}>
          <MetricCard icon="storefront-outline" label="Products" value={String(products.length)} note="Current catalog" />
          <MetricCard icon="warning-outline" label="Low Stock" value={String(report.lowStockProducts.length)} note="Stock between 1 and 5" />
          <MetricCard icon="close-circle-outline" label="Out of Stock" value={String(report.outOfStockProducts.length)} note="Needs restocking" />
          <MetricCard icon="wallet-outline" label="Stock Value" value={formatCurrency(report.inventoryRetailValue)} note="At current selling prices" />
        </View>

        <Text style={styles.sectionTitle}>Restock Attention</Text>
        <View style={styles.card}>
          {report.outOfStockProducts.length === 0 && report.lowStockProducts.length === 0 ? (
            <EmptyState icon="checkmark-circle-outline" title="Inventory looks healthy" message="No low-stock or out-of-stock products right now." />
          ) : (
            <>
              {report.outOfStockProducts.map((product) => (
                <InventoryRow key={`out-${product.id}`} name={product.name} stock={product.stock} label="Out of stock" />
              ))}
              {report.lowStockProducts.map((product) => (
                <InventoryRow key={`low-${product.id}`} name={product.name} stock={product.stock} label="Low stock" />
              ))}
            </>
          )}
        </View>

        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={21} color={COLORS.primary} />
          <Text style={styles.infoText}>Sales figures use delivered orders only, so cancelled or unfinished orders do not inflate revenue.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function MetricCard({ icon, label, value, note }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; note: string; }) {
  return (
    <View style={styles.metricCard}>
      <View style={styles.metricIcon}><Ionicons name={icon} size={20} color={COLORS.primary} /></View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricNote}>{note}</Text>
    </View>
  );
}

function SmallMetric({ label, value, icon }: { label: string; value: number; icon: keyof typeof Ionicons.glyphMap; }) {
  return (
    <View style={styles.smallMetricCard}>
      <Ionicons name={icon} size={20} color={COLORS.primary} />
      <Text style={styles.smallMetricValue}>{value}</Text>
      <Text style={styles.smallMetricLabel}>{label}</Text>
    </View>
  );
}

function InventoryRow({ name, stock, label }: { name: string; stock: number; label: string; }) {
  return (
    <View style={[styles.productRow, styles.rowDivider]}>
      <View style={styles.inventoryIcon}>
        <Ionicons name={stock <= 0 ? "close-circle-outline" : "warning-outline"} size={19} color={stock <= 0 ? "#B91C1C" : "#B45309"} />
      </View>
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={1}>{name}</Text>
        <Text style={styles.productMeta}>{label}</Text>
      </View>
      <Text style={styles.stockText}>Stock: {stock}</Text>
    </View>
  );
}

function EmptyState({ icon, title, message }: { icon: keyof typeof Ionicons.glyphMap; title: string; message: string; }) {
  return (
    <View style={styles.emptyState}>
      <Ionicons name={icon} size={36} color={COLORS.textMuted} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyMessage}>{message}</Text>
    </View>
  );
}

function getStatusDotStyle(status: OrderStatus) {
  switch (status) {
    case "delivered": return { backgroundColor: "#16A34A" };
    case "cancelled": return { backgroundColor: "#DC2626" };
    case "out-for-delivery": return { backgroundColor: "#2563EB" };
    case "preparing": return { backgroundColor: "#D97706" };
    case "confirmed": return { backgroundColor: "#7C3AED" };
    default: return { backgroundColor: "#64748B" };
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { minHeight: 76, paddingHorizontal: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border, flexDirection: "row", alignItems: "center", gap: SPACING.sm, backgroundColor: COLORS.background },
  backButton: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.surface },
  headerText: { flex: 1 },
  heading: { fontSize: FONT.size.xl, fontWeight: "900", color: COLORS.textPrimary },
  subheading: { marginTop: 2, color: COLORS.textSecondary },
  content: { padding: SPACING.md, paddingBottom: 48 },
  sectionTitle: { marginTop: SPACING.lg, marginBottom: SPACING.sm, fontSize: FONT.size.md, fontWeight: "900", color: COLORS.textPrimary },
  metricGrid: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm },
  metricCard: { width: "48.5%", minHeight: 150, borderRadius: RADIUS.lg, backgroundColor: COLORS.surface, padding: SPACING.md, ...SHADOW.card },
  metricIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.primarySoft },
  metricValue: { marginTop: SPACING.md, fontSize: FONT.size.xl, fontWeight: "900", color: COLORS.textPrimary },
  metricLabel: { marginTop: 4, fontWeight: "800", color: COLORS.textPrimary },
  metricNote: { marginTop: 5, fontSize: 12, lineHeight: 17, color: COLORS.textMuted },
  card: { borderRadius: RADIUS.lg, backgroundColor: COLORS.surface, paddingHorizontal: SPACING.md, ...SHADOW.card },
  statusRow: { minHeight: 54, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  statusLeft: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusLabel: { fontWeight: "700", color: COLORS.textPrimary },
  statusCount: { fontWeight: "900", color: COLORS.primary },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  secondaryMetricRow: { flexDirection: "row", gap: SPACING.sm, marginTop: SPACING.sm },
  smallMetricCard: { flex: 1, minHeight: 98, borderRadius: RADIUS.lg, backgroundColor: COLORS.surface, alignItems: "center", justifyContent: "center", padding: SPACING.sm, ...SHADOW.card },
  smallMetricValue: { marginTop: 5, fontSize: FONT.size.lg, fontWeight: "900", color: COLORS.textPrimary },
  smallMetricLabel: { marginTop: 3, fontSize: 11, textAlign: "center", color: COLORS.textSecondary },
  productRow: { minHeight: 72, flexDirection: "row", alignItems: "center", gap: SPACING.sm },
  rankCircle: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.primarySoft },
  rankText: { fontWeight: "900", color: COLORS.primary },
  productInfo: { flex: 1 },
  productName: { fontWeight: "800", color: COLORS.textPrimary },
  productMeta: { marginTop: 4, fontSize: 12, color: COLORS.textSecondary },
  productRevenue: { fontWeight: "900", color: COLORS.primary },
  inventoryIcon: { width: 34, alignItems: "center" },
  stockText: { fontWeight: "800", color: COLORS.textPrimary },
  emptyState: { minHeight: 170, alignItems: "center", justifyContent: "center", padding: SPACING.lg },
  emptyTitle: { marginTop: SPACING.sm, fontWeight: "900", color: COLORS.textPrimary },
  emptyMessage: { marginTop: 5, maxWidth: 360, textAlign: "center", color: COLORS.textSecondary },
  infoCard: { marginTop: SPACING.lg, flexDirection: "row", alignItems: "flex-start", gap: SPACING.sm, borderRadius: RADIUS.lg, backgroundColor: COLORS.primarySoft, padding: SPACING.md },
  infoText: { flex: 1, lineHeight: 20, color: COLORS.textPrimary },
  errorCard: { flexDirection: "row", gap: SPACING.sm, borderRadius: RADIUS.md, backgroundColor: "#FEE2E2", padding: SPACING.md },
  errorText: { flex: 1, color: "#991B1B" },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingText: { marginTop: SPACING.md, color: COLORS.textSecondary },
});