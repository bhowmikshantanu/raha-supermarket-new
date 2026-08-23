import { Ionicons } from "@expo/vector-icons";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
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

import { COLORS, FONT, RADIUS, SHADOW, SPACING } from "@/src/config/theme";
import { auth, db } from "@/src/config/firebase";
import { useProducts } from "@/src/context/ProductContext";
import { subscribeToAllOrders } from "@/src/services/firebaseOrders";
import type { Order } from "@/src/types";
import { formatCurrency } from "@/src/utils/format";

type AdminCard = {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
};

const ADMIN_CARDS: AdminCard[] = [
  { id: "products", title: "Products", subtitle: "Add, edit, stock and prices", icon: "cube-outline", route: "/admin/products" },
  { id: "orders", title: "Orders", subtitle: "Manage customer orders", icon: "receipt-outline", route: "/admin/orders" },
  { id: "categories", title: "Categories", subtitle: "Manage store categories", icon: "grid-outline", route: "/admin/categories" },
  { id: "delivery-boys", title: "Delivery Boys", subtitle: "Manage riders and assignments", icon: "bicycle-outline", route: "/admin/delivery-boys" },
  { id: "coupons", title: "Coupons", subtitle: "Create offers and discounts", icon: "pricetag-outline", route: "/admin/coupons" },
  { id: "notifications", title: "Notifications", subtitle: "Send customer updates", icon: "notifications-outline", route: "/admin/notifications" },
  { id: "reports", title: "Reports", subtitle: "Sales and inventory insights", icon: "bar-chart-outline", route: "/admin/reports" },
];

export default function AdminDashboard() {
  const router = useRouter();
  const { products, loading: productsLoading } = useProducts();

  const [adminUser, setAdminUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setChecking(false);
        router.replace("/admin/login");
        return;
      }

      try {
        const adminSnapshot = await getDoc(doc(db, "admins", user.uid));
        const adminData = adminSnapshot.data();
        const authorized =
          adminSnapshot.exists() &&
          adminData?.role === "admin" &&
          adminData?.active === true;

        if (!authorized) {
          await signOut(auth);
          router.replace("/admin/login");
          return;
        }

        setAdminUser(user);
      } catch (error) {
        console.error("Admin verification failed:", error);
        await signOut(auth);
        router.replace("/admin/login");
      } finally {
        setChecking(false);
      }
    });

    return unsubscribe;
  }, [router]);

  useEffect(() => {
    const unsubscribe = subscribeToAllOrders(
      (items) => {
        setOrders(items);
        setOrdersLoading(false);
      },
      (error) => {
        console.error("Dashboard orders subscription failed:", error);
        setOrdersLoading(false);
      },
    );

    return unsubscribe;
  }, []);

  const stats = useMemo(() => {
    const outOfStock = products.filter((p) => p.stock <= 0).length;
    const lowStock = products.filter((p) => p.stock > 0 && p.stock <= 5).length;
    const offers = products.filter((p) => p.isBestOffer || p.price < p.mrp).length;
    const newOrders = orders.filter((o) => o.status === "placed").length;
    const activeOrders = orders.filter((o) =>
      o.status === "placed" ||
      o.status === "confirmed" ||
      o.status === "preparing" ||
      o.status === "out-for-delivery"
    ).length;
    const deliveredSales = orders
      .filter((o) => o.status === "delivered")
      .reduce((sum, o) => sum + Number(o.total || 0), 0);

    return {
      totalProducts: products.length,
      outOfStock,
      lowStock,
      offers,
      newOrders,
      activeOrders,
      deliveredSales,
    };
  }, [orders, products]);

  const handleLogout = async () => {
    await signOut(auth);
    router.replace("/admin/login");
  };

  if (checking || productsLoading || ordersLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading Raha Supermarket Control...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!adminUser) return null;

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <ScrollView
  style={styles.scrollView}
  contentContainerStyle={styles.scrollContent}
  showsVerticalScrollIndicator={true}>
  keyboardShouldPersistTaps="handled"
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.heading}>Admin Dashboard</Text>
            <Text style={styles.email}>{adminUser.email}</Text>
          </View>

          <View style={styles.adminBadge}>
            <Ionicons name="shield-checkmark" size={18} color={COLORS.primary} />
            <Text style={styles.adminBadgeText}>Admin</Text>
          </View>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Ionicons name="storefront" size={26} color="#FFFFFF" />
          </View>

          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>Raha Supermarket Control</Text>
            <Text style={styles.heroSubtitle}>
              Manage products, orders, offers and customer operations.
            </Text>
          </View>

          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Store Overview</Text>
          <TouchableOpacity onPress={() => router.push("/admin/reports" as never)}>
            <Text style={styles.viewReportsText}>View reports</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsGrid}>
          <StatCard icon="cube-outline" value={String(stats.totalProducts)} label="Products" />
          <StatCard icon="alert-circle-outline" value={String(stats.lowStock)} label="Low Stock" />
          <StatCard icon="close-circle-outline" value={String(stats.outOfStock)} label="Out of Stock" />
          <StatCard icon="pricetag-outline" value={String(stats.offers)} label="Offers" />
          <StatCard icon="notifications-outline" value={String(stats.newOrders)} label="New Orders" />
          <StatCard icon="bicycle-outline" value={String(stats.activeOrders)} label="Active Orders" />
        </View>

        <View style={styles.salesCard}>
          <View style={styles.salesIcon}>
            <Ionicons name="cash-outline" size={24} color={COLORS.primary} />
          </View>

          <View style={styles.salesContent}>
            <Text style={styles.salesLabel}>Delivered Sales</Text>
            <Text style={styles.salesValue}>{formatCurrency(stats.deliveredSales)}</Text>
            <Text style={styles.salesHint}>Revenue from delivered orders only</Text>
          </View>

          <TouchableOpacity
            style={styles.salesArrow}
            onPress={() => router.push("/admin/reports" as never)}
          >
            <Ionicons name="arrow-forward" size={20} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        <Text style={[styles.sectionTitle, styles.managementTitle]}>Management</Text>

        <View style={styles.managementGrid}>
          {ADMIN_CARDS.map((card) => (
            <TouchableOpacity
              key={card.id}
              style={styles.managementCard}
              activeOpacity={0.8}
              onPress={() => router.push(card.route as never)}
            >
              <View style={styles.cardIcon}>
                <Ionicons name={card.icon} size={24} color={COLORS.primary} />
              </View>

              <Text style={styles.cardTitle}>{card.title}</Text>
              <Text style={styles.cardSubtitle}>{card.subtitle}</Text>

              <View style={styles.cardArrow}>
                <Ionicons name="arrow-forward" size={17} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={() => void handleLogout()}>
          <Ionicons name="log-out-outline" size={20} color={COLORS.primary} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({
  icon,
  value,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollView: {
  flex: 1,
},
  scrollContent: { padding: SPACING.md, paddingBottom: 60 },
  header: { minHeight: 58, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerContent: { flex: 1 },
  heading: { fontSize: FONT.xl, fontWeight: "900", color: COLORS.textPrimary },
  email: { marginTop: 4, color: COLORS.textSecondary },
  adminBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    minHeight: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primarySoft,
  },
  adminBadgeText: { fontWeight: "800", color: COLORS.primary },
  heroCard: {
    marginTop: SPACING.md,
    minHeight: 92,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    ...SHADOW.card,
  },
  heroIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  heroContent: { flex: 1 },
  heroTitle: { color: "#FFFFFF", fontWeight: "900", fontSize: FONT.md },
  heroSubtitle: { marginTop: 5, color: "rgba(255,255,255,0.9)", lineHeight: 18 },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    minHeight: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#FFFFFF" },
  liveText: { color: "#FFFFFF", fontSize: 11, fontWeight: "900" },
  sectionHeader: {
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: { fontSize: FONT.md, fontWeight: "900", color: COLORS.textPrimary },
  viewReportsText: { color: COLORS.primary, fontWeight: "800" },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm },
  statCard: {
    width: "31.8%",
    minHeight: 112,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    ...SHADOW.card,
  },
  statIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primarySoft,
  },
  statValue: { marginTop: 12, fontSize: FONT.lg, fontWeight: "900", color: COLORS.textPrimary },
  statLabel: { marginTop: 3, fontSize: 12, color: COLORS.textSecondary },
  salesCard: {
    marginTop: SPACING.sm,
    minHeight: 94,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    padding: SPACING.md,
    ...SHADOW.card,
  },
  salesIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primarySoft,
  },
  salesContent: { flex: 1 },
  salesLabel: { color: COLORS.textSecondary, fontWeight: "700" },
  salesValue: { marginTop: 3, fontSize: FONT.xl, fontWeight: "900", color: COLORS.textPrimary },
  salesHint: { marginTop: 3, fontSize: 11, color: COLORS.textMuted },
  salesArrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primarySoft,
  },
  managementTitle: { marginTop: SPACING.lg, marginBottom: SPACING.sm },
  managementGrid: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm },
  managementCard: {
    width: "49%",
    minHeight: 170,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    position: "relative",
    ...SHADOW.card,
  },
  cardIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primarySoft,
  },
  cardTitle: { marginTop: SPACING.md, fontWeight: "900", color: COLORS.textPrimary, fontSize: FONT.md },
  cardSubtitle: { marginTop: 7, maxWidth: "84%", lineHeight: 18, color: COLORS.textSecondary },
  cardArrow: {
    position: "absolute",
    right: 16,
    bottom: 16,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
  },
  logoutButton: {
    marginTop: SPACING.lg,
    minHeight: 54,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
    backgroundColor: COLORS.surface,
  },
  logoutText: { color: COLORS.primary, fontWeight: "900", fontSize: FONT.md },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: SPACING.lg },
  loadingText: { marginTop: SPACING.md, color: COLORS.textSecondary },
});