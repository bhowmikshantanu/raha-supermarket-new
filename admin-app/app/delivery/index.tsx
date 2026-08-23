import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  onAuthStateChanged,
  signOut,
  type User,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { COLORS, FONT, RADIUS, SHADOW, SPACING } from "@/src/config/theme";
import { auth, db } from "@/src/config/firebase";
import { subscribeToDeliveryBoyOrders } from "@/src/services/firebaseDeliveryOrders";
import type { DeliveryBoy, Order, OrderStatus } from "@/src/types";
import { formatCurrency } from "@/src/utils/format";

type Tab = "active" | "history";

const ACTIVE_STATUSES: OrderStatus[] = [
  "confirmed",
  "preparing",
  "out-for-delivery",
];

const STATUS_STYLE: Record<
  OrderStatus,
  { bg: string; fg: string; label: string }
> = {
  placed: { bg: "#FFF7E6", fg: "#B7791F", label: "Placed" },
  confirmed: { bg: "#E8F4FF", fg: "#2563EB", label: "Confirmed" },
  preparing: { bg: "#F3E8FF", fg: "#7C3AED", label: "Ready to pickup" },
  "out-for-delivery": { bg: "#E0F2FE", fg: "#0369A1", label: "Out for delivery" },
  delivered: { bg: "#DCFCE7", fg: "#15803D", label: "Delivered" },
  cancelled: { bg: "#FEE2E2", fg: "#B91C1C", label: "Cancelled" },
};

export default function DeliveryDashboard() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [rider, setRider] = useState<DeliveryBoy | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<Tab>("active");
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setChecking(false);
        router.replace("/delivery/login");
        return;
      }
      try {
        const riderSnapshot = await getDoc(doc(db, "deliveryBoys", user.uid));
        if (!riderSnapshot.exists()) {
          await signOut(auth);
          router.replace("/delivery/login");
          return;
        }
        const data = riderSnapshot.data();
        if (data.active === false) {
          await signOut(auth);
          router.replace("/delivery/login");
          return;
        }
        setFirebaseUser(user);
        setRider({
          id: riderSnapshot.id,
          name: String(data.name ?? "").trim(),
          mobile: String(data.mobile ?? "").trim(),
          email: String(data.email ?? "").trim(),
          active: data.active !== false,
          vehicleNumber:
            typeof data.vehicleNumber === "string"
              ? data.vehicleNumber
              : undefined,
          firebaseUid:
            typeof data.firebaseUid === "string"
              ? data.firebaseUid
              : user.uid,
          createdAt:
            typeof data.createdAtMs === "number"
              ? data.createdAtMs
              : Date.now(),
        });
      } catch (err) {
        console.error("Delivery gate failed:", err);
        await signOut(auth).catch(() => undefined);
        router.replace("/delivery/login");
      } finally {
        setChecking(false);
      }
    });
    return unsubscribe;
  }, [router]);

  useEffect(() => {
    if (!firebaseUser) return;
    const unsubscribe = subscribeToDeliveryBoyOrders(
      firebaseUser.uid,
      (items) => {
        setOrders(items);
        setLoading(false);
        setRefreshing(false);
        setError("");
      },
      (err) => {
        console.error("Rider orders subscription failed:", err);
        setLoading(false);
        setRefreshing(false);
        setError("Unable to load your orders.");
      },
    );
    return unsubscribe;
  }, [firebaseUser]);

  const filtered = useMemo(() => {
    if (tab === "active") {
      return orders.filter((o) => ACTIVE_STATUSES.includes(o.status));
    }
    return orders.filter((o) => !ACTIVE_STATUSES.includes(o.status));
  }, [orders, tab]);

  const stats = useMemo(() => {
    return {
      active: orders.filter((o) => ACTIVE_STATUSES.includes(o.status)).length,
      delivered: orders.filter((o) => o.status === "delivered").length,
      total: orders.length,
    };
  }, [orders]);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 400);
  };

  if (checking) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading your dashboard…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!rider) return null;

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Ionicons name="bicycle" size={22} color={COLORS.textOnPrimary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>Hi, {rider.name}</Text>
          <Text style={styles.greetingSub}>
            {rider.vehicleNumber ?? "Ready to deliver"}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.profileBtn}
          onPress={() => router.push("/delivery/profile")}
          testID="delivery-profile-btn"
        >
          <Ionicons name="person-circle-outline" size={30} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        <StatCell label="Active" value={stats.active} icon="flash-outline" />
        <View style={styles.statDivider} />
        <StatCell label="Delivered" value={stats.delivered} icon="checkmark-done-outline" />
        <View style={styles.statDivider} />
        <StatCell label="Total" value={stats.total} icon="receipt-outline" />
      </View>

      <View style={styles.tabs}>
        {(["active", "history"] as Tab[]).map((k) => (
          <TouchableOpacity
            key={k}
            style={[styles.tab, tab === k && styles.tabActive]}
            onPress={() => setTab(k)}
            testID={`delivery-tab-${k}`}
          >
            <Text style={[styles.tabText, tab === k && styles.tabTextActive]}>
              {k === "active" ? "Active" : "History"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading orders…</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(o) => o.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: SPACING.md }} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={COLORS.primary}
            />
          }
          ListHeaderComponent={
            error ? (
              <View style={styles.errorBanner}>
                <Ionicons name="warning-outline" size={18} color={COLORS.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons
                  name={tab === "active" ? "flash-outline" : "checkmark-done-outline"}
                  size={30}
                  color={COLORS.primary}
                />
              </View>
              <Text style={styles.emptyTitle}>
                {tab === "active"
                  ? "No active orders"
                  : "No completed orders yet"}
              </Text>
              <Text style={styles.emptyText}>
                {tab === "active"
                  ? "When the admin assigns an order to you, it'll appear here."
                  : "Your delivered and cancelled orders will be listed here."}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const style = STATUS_STYLE[item.status];
            const itemCount = item.items.reduce(
              (sum, it) => sum + it.quantity,
              0,
            );
            return (
              <TouchableOpacity
                style={styles.card}
                activeOpacity={0.85}
                onPress={() =>
                  router.push({
                    pathname: "/delivery/order/[id]",
                    params: { id: item.id },
                  })
                }
                testID={`delivery-order-${item.id}`}
              >
                <View style={styles.cardTop}>
                  <Text style={styles.orderId}>#{item.id}</Text>
                  <View
                    style={[
                      styles.statusPill,
                      { backgroundColor: style.bg },
                    ]}
                  >
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: style.fg },
                      ]}
                    />
                    <Text style={[styles.statusText, { color: style.fg }]}>
                      {style.label}
                    </Text>
                  </View>
                </View>
                <Text style={styles.customerName}>
                  {item.address.fullName || "Customer"}
                </Text>
                <View style={styles.addressRow}>
                  <Ionicons
                    name="location-outline"
                    size={15}
                    color={COLORS.textSecondary}
                  />
                  <Text style={styles.addressText} numberOfLines={2}>
                    {[item.address.house, item.address.landmark, item.address.area, item.address.pincode]
                      .filter(Boolean)
                      .join(", ")}
                  </Text>
                </View>
                <View style={styles.cardFooter}>
                  <View style={styles.footerCell}>
                    <Ionicons
                      name="bag-handle-outline"
                      size={14}
                      color={COLORS.textSecondary}
                    />
                    <Text style={styles.footerText}>
                      {itemCount} items
                    </Text>
                  </View>
                  <View style={styles.footerCell}>
                    <Ionicons
                      name={item.paymentMethod === "cod" ? "cash-outline" : "card-outline"}
                      size={14}
                      color={COLORS.textSecondary}
                    />
                    <Text style={styles.footerText}>
                      {item.paymentMethod === "cod" ? "COD" : "Paid"}
                    </Text>
                  </View>
                  <Text style={styles.footerTotal}>
                    {formatCurrency(item.total)}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

function StatCell({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={styles.statCell}>
      <Ionicons name={icon} size={20} color={COLORS.primary} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.xl,
    gap: SPACING.sm,
  },
  loadingText: { color: COLORS.textSecondary, fontSize: FONT.size.sm },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
  },
  greeting: {
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },
  greetingSub: {
    marginTop: 2,
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
  },
  profileBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  statsRow: {
    margin: SPACING.md,
    flexDirection: "row",
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
    ...SHADOW.header,
  },
  statCell: { flex: 1, alignItems: "center", gap: 4 },
  statDivider: { width: 1, backgroundColor: COLORS.borderLight },
  statValue: {
    fontSize: FONT.size.lg,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },
  statLabel: {
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
  },
  tabs: {
    flexDirection: "row",
    marginHorizontal: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.pill,
    padding: 4,
    marginBottom: SPACING.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: RADIUS.pill,
  },
  tabActive: { backgroundColor: COLORS.background, ...SHADOW.card },
  tabText: {
    color: COLORS.textSecondary,
    fontWeight: FONT.weight.semibold,
    fontSize: FONT.size.sm,
  },
  tabTextActive: { color: COLORS.textPrimary },
  list: { padding: SPACING.md, paddingBottom: SPACING.xxxl },
  errorBanner: {
    marginBottom: SPACING.md,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.dangerLight,
  },
  errorText: { flex: 1, color: COLORS.danger, fontSize: FONT.size.sm },
  empty: {
    alignItems: "center",
    paddingTop: SPACING.xxxl,
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
  },
  emptyIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primaryLight,
  },
  emptyTitle: {
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },
  emptyText: {
    textAlign: "center",
    color: COLORS.textSecondary,
    fontSize: FONT.size.sm,
    maxWidth: 280,
    lineHeight: 20,
  },
  card: {
    padding: SPACING.md,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    backgroundColor: COLORS.background,
    ...SHADOW.card,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  orderId: {
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: RADIUS.pill,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 10, fontWeight: FONT.weight.bold },
  customerName: {
    marginTop: SPACING.sm,
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },
  addressRow: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },
  addressText: {
    flex: 1,
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  cardFooter: {
    marginTop: SPACING.md,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
  },
  footerCell: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  footerText: {
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
    fontWeight: FONT.weight.semibold,
  },
  footerTotal: {
    marginLeft: "auto",
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },
});
