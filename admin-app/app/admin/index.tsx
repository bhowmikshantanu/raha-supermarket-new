import { Ionicons } from "@expo/vector-icons";
import {
  onAuthStateChanged,
  signOut,
  type User,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "expo-router";
import React, {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { auth, db } from "@/src/config/firebase";
import { useProducts } from "@/src/context/ProductContext";
import { subscribeToAllOrders } from "@/src/services/firebaseOrders";
import type { Order, OrderStatus } from "@/src/types";
import { formatCurrency } from "@/src/utils/format";

const NAVY = "#082F5B";
const NAVY_DARK = "#052445";
const NAVY_SOFT = "#EAF2FB";
const GOLD = "#F3B53F";
const GOLD_SOFT = "#FFF4D8";
const BG = "#F6F8FC";
const WHITE = "#FFFFFF";
const BORDER = "#E5EAF1";
const TEXT = "#102A43";
const MUTED = "#718096";
const GREEN = "#159A6A";
const TEAL = "#18B7AE";
const PURPLE = "#7257D5";
const ORANGE = "#E89526";
const RED = "#E05252";
const BLUE = "#2979E2";

type NavItem = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
};

const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    icon: "home-outline",
    route: "/admin",
  },
  {
    label: "Orders",
    icon: "receipt-outline",
    route: "/admin/orders",
  },
  {
    label: "Products",
    icon: "cube-outline",
    route: "/admin/products",
  },
  {
    label: "Categories",
    icon: "grid-outline",
    route: "/admin/categories",
  },
  {
    label: "Delivery Boys",
    icon: "bicycle-outline",
    route: "/admin/delivery-boys",
  },
  {
    label: "Coupons",
    icon: "pricetag-outline",
    route: "/admin/coupons",
  },
  {
    label: "Notifications",
    icon: "notifications-outline",
    route: "/admin/notifications",
  },
  {
    label: "Order Alerts",
    icon: "megaphone-outline",
    route: "/admin/order-alerts",
  },
  {
    label: "Reports",
    icon: "bar-chart-outline",
    route: "/admin/reports",
  },
];

const STATUS_LABEL: Record<OrderStatus, string> = {
  placed: "Placed",
  confirmed: "Confirmed",
  preparing: "Preparing",
  "out-for-delivery": "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export default function AdminDashboard() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const desktop = width >= 900;

  const {
    products,
    loading: productsLoading,
  } = useProducts();

  const [adminUser, setAdminUser] =
    useState<User | null>(null);

  const [checking, setChecking] =
    useState(true);

  const [adminReady, setAdminReady] =
    useState(false);

  const [orders, setOrders] =
    useState<Order[]>([]);

  const [ordersLoading, setOrdersLoading] =
    useState(true);

  useEffect(() => {
    let active = true;

    const unsubscribe = onAuthStateChanged(
      auth,
      async (user) => {
        if (!active) return;

        setAdminReady(false);

        if (!user) {
          setAdminUser(null);
          setChecking(false);
          router.replace("/admin/login");
          return;
        }

        try {
          const adminSnapshot = await getDoc(
            doc(db, "admins", user.uid),
          );

          if (!active) return;

          const adminData =
            adminSnapshot.exists()
              ? adminSnapshot.data()
              : null;

          const authorized =
            adminData?.role === "admin" &&
            adminData?.active === true;

          if (!authorized) {
            await signOut(auth);
            router.replace("/admin/login");
            return;
          }

          setAdminUser(user);
          setAdminReady(true);
        } catch (error) {
          console.error(
            "Admin verification failed:",
            error,
          );

          await signOut(auth);
          router.replace("/admin/login");
        } finally {
          if (active) {
            setChecking(false);
          }
        }
      },
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [router]);

  useEffect(() => {
    if (!adminReady) return;

    setOrdersLoading(true);

    const unsubscribe =
      subscribeToAllOrders(
        (items) => {
          setOrders(items);
          setOrdersLoading(false);
        },
        (error) => {
          console.error(
            "Dashboard orders subscription failed:",
            error,
          );
          setOrdersLoading(false);
        },
      );

    return unsubscribe;
  }, [adminReady]);

  const stats = useMemo(() => {
    const deliveredOrders = orders.filter(
      (order) => order.status === "delivered",
    );

    const totalSales = deliveredOrders.reduce(
      (sum, order) =>
        sum + Number(order.total || 0),
      0,
    );

    const activeOrders = orders.filter(
      (order) =>
        order.status === "placed" ||
        order.status === "confirmed" ||
        order.status === "preparing" ||
        order.status === "out-for-delivery",
    ).length;

    return {
      totalOrders: orders.length,
      totalSales,
      totalProducts: products.length,
      activeOrders,
      placed: orders.filter(
        (order) => order.status === "placed",
      ).length,
      confirmed: orders.filter(
        (order) => order.status === "confirmed",
      ).length,
      preparing: orders.filter(
        (order) => order.status === "preparing",
      ).length,
      outForDelivery: orders.filter(
        (order) =>
          order.status === "out-for-delivery",
      ).length,
      delivered: deliveredOrders.length,
      cancelled: orders.filter(
        (order) => order.status === "cancelled",
      ).length,
    };
  }, [orders, products]);

  const recentOrders = useMemo(
    () =>
      [...orders]
        .sort(
          (a, b) =>
            Number(b.createdAt || 0) -
            Number(a.createdAt || 0),
        )
        .slice(0, 5),
    [orders],
  );

  const salesDays = useMemo(() => {
  const now = new Date();

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now);

    date.setHours(0, 0, 0, 0);
    date.setDate(now.getDate() - (6 - index));

    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);

    const dayOrders = orders.filter((order) => {
      if (order.status !== "delivered") {
        return false;
      }

      const timestamp = Number(
        order.deliveredAt ||
          order.updatedAt ||
          order.createdAt ||
          0,
      );

      return (
        timestamp >= date.getTime() &&
        timestamp < nextDate.getTime()
      );
    });

    const total = dayOrders.reduce(
      (sum, order) =>
        sum + Number(order.total || 0),
      0,
    );

    return {
      label: date.toLocaleDateString("en-IN", {
        weekday: "short",
      }),
      dateLabel: date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
      }),
      total,
      orders: dayOrders.length,
    };
  });
}, [orders]);
  const maxSales = Math.max(
    1,
    ...salesDays.map(
      (day) => day.total,
    ),
  );

  const handleLogout = async () => {
    await signOut(auth);
    router.replace("/admin/login");
  };

  if (
    checking ||
    productsLoading ||
    (adminReady && ordersLoading)
  ) {
    return (
      <SafeAreaView style={styles.loadingPage}>
        <ActivityIndicator
          size="large"
          color={NAVY}
        />

        <Text style={styles.loadingText}>
          Loading Raha Supermarket Control...
        </Text>
      </SafeAreaView>
    );
  }

  if (!adminUser) return null;

  return (
    <SafeAreaView
      style={styles.page}
      edges={["top", "bottom"]}
    >
      <View style={styles.shell}>
        {desktop ? (
          <View style={styles.sidebar}>
            <View style={styles.brand}>
              <View style={styles.brandIcon}>
                <Ionicons
                  name="cart"
                  size={28}
                  color={GOLD}
                />
              </View>

              <View>
                <Text style={styles.brandName}>
                  RAHA
                </Text>
                <Text style={styles.brandSub}>
                  SUPERMARKET
                </Text>
              </View>
            </View>

            <View style={styles.goldLine} />

            <ScrollView
              style={styles.sideNav}
              contentContainerStyle={styles.sideNavContent}
              showsVerticalScrollIndicator={true}
              persistentScrollbar={true}
            >
              {NAV_ITEMS.map((item) => {
                const selected =
                  item.route === "/admin";

                return (
                  <TouchableOpacity
                    key={item.route}
                    style={[
                      styles.navItem,
                      selected &&
                        styles.navItemActive,
                    ]}
                    activeOpacity={0.8}
                    onPress={() =>
                      router.push(
                        item.route as never,
                      )
                    }
                  >
                    <Ionicons
                      name={item.icon}
                      size={21}
                      color={
                        selected
                          ? NAVY_DARK
                          : "#FFFFFF"
                      }
                    />

                    <Text
                      style={[
                        styles.navText,
                        selected &&
                          styles.navTextActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.sideFooter}>
              <View style={styles.sideQuoteIcon}>
                <Ionicons
                  name="leaf-outline"
                  size={26}
                  color={GOLD}
                />
              </View>

              <Text style={styles.sideQuote}>
                Fresh Choices
              </Text>

              <Text style={styles.sideQuoteStrong}>
                Brighter Lives
              </Text>

              <TouchableOpacity
                style={styles.logoutButton}
                onPress={() =>
                  void handleLogout()
                }
              >
                <Ionicons
                  name="log-out-outline"
                  size={19}
                  color="#FFFFFF"
                />
                <Text
                  style={styles.logoutText}
                >
                  Logout
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        <ScrollView
          style={styles.main}
          contentContainerStyle={
            styles.mainContent
          }
          showsVerticalScrollIndicator
        >
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.welcome}>
                Welcome Back, Admin!
              </Text>

              <Text style={styles.subtitle}>
                Here's what's happening at
                Raha Supermarket today.
              </Text>
            </View>

            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>
                Live
              </Text>
            </View>

            <TouchableOpacity
              style={styles.adminAvatar}
              activeOpacity={0.8}
              onPress={() => router.push("/admin/account" as never)}
            >
              <Text style={styles.adminAvatarText}>
                {(adminUser.displayName || adminUser.email || "A").charAt(0).toUpperCase()}
              </Text>
            </TouchableOpacity>

            {!desktop ? (
              <TouchableOpacity
                style={styles.mobileLogout}
                onPress={() =>
                  void handleLogout()
                }
              >
                <Ionicons
                  name="log-out-outline"
                  size={21}
                  color={NAVY}
                />
              </TouchableOpacity>
            ) : null}
          </View>

          {!desktop ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={
                false
              }
              contentContainerStyle={
                styles.mobileNav
              }
            >
              {NAV_ITEMS.slice(1).map(
                (item) => (
                  <TouchableOpacity
                    key={item.route}
                    style={styles.mobileNavItem}
                    onPress={() =>
                      router.push(
                        item.route as never,
                      )
                    }
                  >
                    <Ionicons
                      name={item.icon}
                      size={18}
                      color={NAVY}
                    />
                    <Text
                      style={styles.mobileNavText}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ),
              )}
            </ScrollView>
          ) : null}

          <View style={styles.kpiGrid}>
            <KpiCard
              icon="cart-outline"
              label="Total Orders"
              value={String(
                stats.totalOrders,
              )}
              note={`${stats.activeOrders} currently active`}
              background="#FFF0F3"
              iconBackground="#FFDDE6"
              iconColor="#C42D69"
            />

            <KpiCard
              icon="wallet-outline"
              label="Total Sales"
              value={formatCurrency(
                stats.totalSales,
              )}
              note="Delivered orders"
              background="#EAFBF5"
              iconBackground="#CBF4E5"
              iconColor={GREEN}
            />

            <KpiCard
              icon="cube-outline"
              label="Total Products"
              value={String(
                stats.totalProducts,
              )}
              note="Store catalogue"
              background="#F2EEFF"
              iconBackground="#E3D9FF"
              iconColor={PURPLE}
            />

            <KpiCard
              icon="pulse-outline"
              label="Active Orders"
              value={String(
                stats.activeOrders,
              )}
              note="Currently in progress"
              background="#FFF7E7"
              iconBackground="#FFE9B8"
              iconColor={ORANGE}
            />
          </View>

          <View
            style={[
              styles.dashboardRow,
              !desktop &&
                styles.dashboardRowMobile,
            ]}
          >
            <View style={styles.salesCard}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.cardTitle}>
                    Sales Overview
                  </Text>

                  <Text
                    style={styles.cardSubtitle}
                  >
                    Delivered sales · last 7 days
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() =>
                    router.push(
                      "/admin/reports" as never,
                    )
                  }
                >
                  <Text
                    style={styles.linkText}
                  >
                    View Reports
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.chart}>
  {salesDays.map((day) => {
    const height =
      day.total > 0
        ? Math.max(
            28,
            (day.total / maxSales) * 150,
          )
        : 6;

    return (
      <View
        key={`${day.label}-${day.dateLabel}`}
        style={styles.barColumn}
      >
        <View style={styles.barValueArea}>
          {day.total > 0 ? (
            <Text style={styles.barValue}>
              {formatCurrency(day.total)}
            </Text>
          ) : (
            <Text style={styles.zeroValue}>
              ₹0
            </Text>
          )}

          <View
            style={[
              styles.bar,
              { height },
              day.total === 0 &&
                styles.zeroBar,
            ]}
          />
        </View>

        <Text style={styles.barDay}>
          {day.label}
        </Text>

        <Text style={styles.barDate}>
          {day.dateLabel}
        </Text>
      </View>
    );
  })}
</View>
            </View>

            <View style={styles.statusCard}>
              <Text style={styles.cardTitle}>
                Order Status
              </Text>

              <Text style={styles.cardSubtitle}>
                Live order distribution
              </Text>

              <View style={styles.orderCircle}>
                <Text
                  style={styles.orderCircleValue}
                >
                  {stats.totalOrders}
                </Text>

                <Text
                  style={styles.orderCircleLabel}
                >
                  Orders
                </Text>
              </View>

              <StatusRow
                label="Placed"
                value={stats.placed}
                color={BLUE}
              />

              <StatusRow
                label="Confirmed"
                value={stats.confirmed}
                color={PURPLE}
              />

              <StatusRow
                label="Preparing"
                value={stats.preparing}
                color={GOLD}
              />

              <StatusRow
                label="Out for delivery"
                value={stats.outForDelivery}
                color={TEAL}
              />

              <StatusRow
                label="Delivered"
                value={stats.delivered}
                color={GREEN}
              />

              <StatusRow
                label="Cancelled"
                value={stats.cancelled}
                color={RED}
              />
            </View>

            <View style={styles.quickCard}>
              <View style={styles.quickHeading}>
                <Ionicons
                  name="flash"
                  size={21}
                  color={GOLD}
                />
                <Text style={styles.cardTitle}>
                  Quick Actions
                </Text>
              </View>

              <QuickAction
                label="Add Product"
                icon="add"
                background="#DDF8ED"
                color={GREEN}
                onPress={() =>
                  router.push(
                    "/admin/products" as never,
                  )
                }
              />

              <QuickAction
                label="Add Category"
                icon="add"
                background="#E7E7FF"
                color={PURPLE}
                onPress={() =>
                  router.push({
                    pathname:
                      "/admin/categories",
                    params: {
                      action: "add",
                    },
                  } as never)
                }
              />

              <QuickAction
                label="Send Notification"
                icon="paper-plane-outline"
                background="#E6F2FF"
                color={BLUE}
                onPress={() =>
                  router.push(
                    "/admin/notifications" as never,
                  )
                }
              />

              <QuickAction
                label="View Reports"
                icon="bar-chart-outline"
                background="#FFF0E6"
                color={ORANGE}
                onPress={() =>
                  router.push(
                    "/admin/reports" as never,
                  )
                }
              />
            </View>
          </View>

          <View style={styles.recentCard}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.cardTitle}>
                  Recent Orders
                </Text>

                <Text style={styles.cardSubtitle}>
                  Latest customer orders
                </Text>
              </View>

              <TouchableOpacity
                onPress={() =>
                  router.push(
                    "/admin/orders" as never,
                  )
                }
              >
                <Text style={styles.linkText}>
                  View All Orders →
                </Text>
              </TouchableOpacity>
            </View>

            {recentOrders.length === 0 ? (
              <View style={styles.emptyOrders}>
                <Ionicons
                  name="receipt-outline"
                  size={36}
                  color="#AAB4C0"
                />
                <Text
                  style={styles.emptyOrdersText}
                >
                  No orders yet
                </Text>
              </View>
            ) : (
              recentOrders.map(
                (order, index) => (
                  <TouchableOpacity
                    key={order.id}
                    style={[
                      styles.orderRow,
                      index ===
                        recentOrders.length -
                          1 &&
                        styles.lastOrderRow,
                    ]}
                    onPress={() =>
                      router.push({
                        pathname:
                          "/admin/orders",
                        params: {
                          orderId: order.id,
                        },
                      } as never)
                    }
                  >
                    <View
                      style={styles.orderNumber}
                    >
                      <Text
                        numberOfLines={1}
                        style={styles.orderId}
                      >
                        #{order.id}
                      </Text>

                      <Text
                        style={styles.orderTime}
                      >
                        {formatOrderDate(
                          order.createdAt,
                        )}
                      </Text>
                    </View>

                    <Text style={styles.itemCount}>
                      {order.items.length}{" "}
                      {order.items.length === 1
                        ? "item"
                        : "items"}
                    </Text>

                    <Text
                      style={styles.paymentText}
                    >
                      {order.paymentMethod ===
                      "online"
                        ? "Online"
                        : "COD"}
                    </Text>

                    <Text
                      style={styles.totalText}
                    >
                      {formatCurrency(
                        Number(
                          order.total || 0,
                        ),
                      )}
                    </Text>

                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor:
                            statusBackground(
                              order.status,
                            ),
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          {
                            color:
                              statusColor(
                                order.status,
                              ),
                          },
                        ]}
                      >
                        {
                          STATUS_LABEL[
                            order.status
                          ]
                        }
                      </Text>
                    </View>

                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color="#A1ACB8"
                    />
                  </TouchableOpacity>
                ),
              )
            )}
          </View>

          <View style={styles.footerMessage}>
            <Ionicons
              name="leaf-outline"
              size={22}
              color={GOLD}
            />

            <Text style={styles.footerText}>
              Fresh Products · Happy Customers ·
              Raha Supermarket
            </Text>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function KpiCard({
  icon,
  label,
  value,
  note,
  background,
  iconBackground,
  iconColor,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  note: string;
  background: string;
  iconBackground: string;
  iconColor: string;
}) {
  return (
    <View
      style={[
        styles.kpiCard,
        { backgroundColor: background },
      ]}
    >
      <View
        style={[
          styles.kpiIcon,
          {
            backgroundColor:
              iconBackground,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={25}
          color={iconColor}
        />
      </View>

      <Text style={styles.kpiLabel}>
        {label}
      </Text>

      <Text
        numberOfLines={1}
        style={styles.kpiValue}
      >
        {value}
      </Text>

      <Text style={styles.kpiNote}>
        {note}
      </Text>
    </View>
  );
}

function QuickAction({
  label,
  icon,
  background,
  color,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  background: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.quickAction,
        { backgroundColor: background },
      ]}
      activeOpacity={0.78}
      onPress={onPress}
    >
      <Ionicons
        name={icon}
        size={21}
        color={color}
      />

      <Text
        style={[
          styles.quickActionText,
          { color },
        ]}
      >
        {label}
      </Text>

      <Ionicons
        name="chevron-forward"
        size={17}
        color={color}
      />
    </TouchableOpacity>
  );
}

function StatusRow({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <View style={styles.statusRow}>
      <View
        style={[
          styles.statusDot,
          { backgroundColor: color },
        ]}
      />

      <Text style={styles.statusLabel}>
        {label}
      </Text>

      <Text style={styles.statusValue}>
        {value}
      </Text>
    </View>
  );
}

function statusColor(
  status: OrderStatus,
) {
  switch (status) {
    case "delivered":
      return GREEN;
    case "cancelled":
      return RED;
    case "preparing":
      return "#B46A00";
    case "confirmed":
      return PURPLE;
    case "out-for-delivery":
      return BLUE;
    default:
      return NAVY;
  }
}

function statusBackground(
  status: OrderStatus,
) {
  switch (status) {
    case "delivered":
      return "#DDF7EA";
    case "cancelled":
      return "#FFE6E6";
    case "preparing":
      return "#FFF0CC";
    case "confirmed":
      return "#ECE7FF";
    case "out-for-delivery":
      return "#E1EEFF";
    default:
      return "#EAF1F8";
  }
}

function formatOrderDate(
  timestamp: number,
) {
  if (!timestamp) {
    return "Date unavailable";
  }

  return new Date(
    timestamp,
  ).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#FFF9EE",
  },

  shell: {
    flex: 1,
    flexDirection: "row",
  },

  sidebar: {
    width: 250,
    backgroundColor: "#063765",
    paddingHorizontal: 14,
    paddingTop: 22,
    overflow: "hidden",
    borderRightWidth: 1,
    borderRightColor: "rgba(243,181,63,0.18)",
  },

  brand: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 12,
  },

  brandIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor:
      "rgba(255,255,255,0.08)",
  },

  brandName: {
    color: "#FFFFFF",
    fontSize: 25,
    fontWeight: "900",
    letterSpacing: 5,
  },

  brandSub: {
    marginTop: 1,
    color: GOLD,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 2.2,
  },

  goldLine: {
    height: 2,
    width: 72,
    backgroundColor: GOLD,
    marginLeft: 14,
    marginTop: 20,
    marginBottom: 20,
    borderRadius: 2,
  },

  sideNav: {
    flex: 1,
    minHeight: 0,
  },

  sideNavContent: {
    paddingBottom: 14,
  },

  navItem: {
    minHeight: 50,
    borderRadius: 13,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    marginBottom: 5,
    gap: 13,
  },

  navItemActive: {
    backgroundColor: GOLD,
  },

  navText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },

  navTextActive: {
    color: NAVY_DARK,
    fontWeight: "900",
  },

  sideFooter: {
    flexShrink: 0,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(243,181,63,0.35)",
    backgroundColor: "rgba(3,37,70,0.72)",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },

  sideQuoteIcon: {
    marginBottom: 6,
  },

  sideQuote: {
    color: "#FFFFFF",
    fontSize: 12,
    letterSpacing: 1.2,
  },

  sideQuoteStrong: {
    marginTop: 2,
    color: GOLD,
    fontSize: 15,
    fontWeight: "900",
  },

  logoutButton: {
    marginTop: 15,
    minHeight: 42,
    borderWidth: 1,
    borderColor:
      "rgba(255,255,255,0.24)",
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  logoutText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },

  main: {
    flex: 1,
    backgroundColor: "#FFF9EE",
  },

  mainContent: {
    padding: 26,
    backgroundColor: "rgba(246,248,252,0.78)",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 24,
  },

  welcome: {
    color: NAVY_DARK,
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -0.6,
  },

  subtitle: {
    marginTop: 5,
    color: MUTED,
    fontSize: 13,
  },

  liveBadge: {
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: 17,
    backgroundColor: "#E4F8EF",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: GREEN,
  },

  liveText: {
    color: GREEN,
    fontSize: 11,
    fontWeight: "900",
  },

  adminAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: NAVY,
  },

  adminAvatarText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "900",
  },

  mobileLogout: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: NAVY_SOFT,
    alignItems: "center",
    justifyContent: "center",
  },

  mobileNav: {
    gap: 8,
    paddingBottom: 18,
  },

  mobileNavItem: {
    minHeight: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: WHITE,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 13,
  },

  mobileNavText: {
    color: NAVY,
    fontSize: 12,
    fontWeight: "800",
  },

  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },

  kpiCard: {
    flexGrow: 1,
    flexBasis: 190,
    minWidth: 170,
    minHeight: 150,
    borderRadius: 16,
    padding: 17,
    borderWidth: 1,
    borderColor:
      "rgba(8,47,91,0.05)",
  },

  kpiIcon: {
    width: 47,
    height: 47,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },

  kpiLabel: {
    marginTop: 12,
    color: NAVY,
    fontSize: 12,
    fontWeight: "800",
  },

  kpiValue: {
    marginTop: 4,
    color: NAVY_DARK,
    fontSize: 25,
    fontWeight: "900",
  },

  kpiNote: {
    marginTop: 6,
    color: MUTED,
    fontSize: 11,
  },

  dashboardRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 14,
    marginTop: 16,
  },

  dashboardRowMobile: {
    flexDirection: "column",
  },

  salesCard: {
    flex: 1.55,
    minHeight: 330,
    borderRadius: 16,
    padding: 18,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },

  statusCard: {
    flex: 0.95,
    minHeight: 330,
    borderRadius: 16,
    padding: 18,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },

  quickCard: {
    flex: 0.9,
    minHeight: 330,
    borderRadius: 16,
    padding: 16,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },

  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },

  cardTitle: {
    color: NAVY_DARK,
    fontSize: 16,
    fontWeight: "900",
  },

  cardSubtitle: {
    marginTop: 4,
    color: MUTED,
    fontSize: 11,
  },

  linkText: {
    color: BLUE,
    fontSize: 11,
    fontWeight: "900",
  },

  chart: {
    flex: 1,
    minHeight: 230,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-around",
    paddingTop: 32,
  },

    barColumn: {
    flex: 1,
    minWidth: 52,
    alignItems: "center",
    justifyContent: "flex-end",
  },

  barValueArea: {
    height: 190,
    width: "100%",
    alignItems: "center",
    justifyContent: "flex-end",
  },

  barValue: {
    marginBottom: 7,
    color: NAVY_DARK,
    fontSize: 10,
    fontWeight: "900",
  },

  zeroValue: {
    marginBottom: 7,
    color: "#A0AEC0",
    fontSize: 9,
    fontWeight: "700",
  },

  bar: {
    width: "52%",
    maxWidth: 38,
    minWidth: 16,
    borderTopLeftRadius: 9,
    borderTopRightRadius: 9,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    backgroundColor: TEAL,
    shadowColor: TEAL,
    shadowOpacity: 0.18,
    shadowRadius: 5,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    elevation: 2,
  },

  zeroBar: {
    height: 6,
    backgroundColor: "#DCE5ED",
    shadowOpacity: 0,
    elevation: 0,
  },

  barDay: {
    marginTop: 9,
    color: NAVY_DARK,
    fontSize: 10,
    fontWeight: "900",
  },

  barDate: {
    marginTop: 3,
    color: MUTED,
    fontSize: 8,
    fontWeight: "600",
  },
  orderCircle: {
    width: 105,
    height: 105,
    borderRadius: 53,
    alignSelf: "center",
    marginVertical: 14,
    borderWidth: 12,
    borderColor: "#DCEBFA",
    alignItems: "center",
    justifyContent: "center",
  },

  orderCircleValue: {
    color: NAVY,
    fontSize: 24,
    fontWeight: "900",
  },

  orderCircleLabel: {
    color: MUTED,
    fontSize: 10,
    fontWeight: "700",
  },

  statusRow: {
    minHeight: 26,
    flexDirection: "row",
    alignItems: "center",
  },

  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },

  statusLabel: {
    flex: 1,
    color: MUTED,
    fontSize: 11,
  },

  statusValue: {
    color: NAVY_DARK,
    fontSize: 11,
    fontWeight: "900",
  },

  quickHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 14,
  },

  quickAction: {
    minHeight: 53,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 13,
    marginBottom: 10,
  },

  quickActionText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "900",
  },

  recentCard: {
    marginTop: 16,
    borderRadius: 16,
    padding: 18,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },

  emptyOrders: {
    minHeight: 140,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyOrdersText: {
    marginTop: 8,
    color: MUTED,
    fontWeight: "700",
  },

  orderRow: {
    minHeight: 70,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },

  lastOrderRow: {
    borderBottomWidth: 0,
  },

  orderNumber: {
    flex: 1.4,
    minWidth: 0,
  },

  orderId: {
    color: NAVY_DARK,
    fontSize: 12,
    fontWeight: "900",
  },

  orderTime: {
    marginTop: 4,
    color: MUTED,
    fontSize: 10,
  },

  itemCount: {
    flex: 0.7,
    color: TEXT,
    fontSize: 11,
  },

  paymentText: {
    flex: 0.7,
    color: TEXT,
    fontSize: 11,
  },

  totalText: {
    flex: 0.8,
    color: NAVY_DARK,
    fontSize: 12,
    fontWeight: "900",
  },

  statusBadge: {
    minWidth: 92,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 14,
    alignItems: "center",
  },

  statusBadgeText: {
    fontSize: 9,
    fontWeight: "900",
  },

  footerMessage: {
    minHeight: 65,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  footerText: {
    color: NAVY,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.3,
  },

  loadingPage: {
    flex: 1,
    backgroundColor: BG,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    marginTop: 13,
    color: MUTED,
    fontWeight: "700",
  },
});
