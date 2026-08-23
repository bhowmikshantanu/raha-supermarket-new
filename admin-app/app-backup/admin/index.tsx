import { Ionicons } from "@expo/vector-icons";
import {
  onAuthStateChanged,
  signOut,
  type User,
} from "firebase/auth";
import {
  doc,
  getDoc,
} from "firebase/firestore";
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
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/src/components/Button";
import {
  COLORS,
  FONT,
  RADIUS,
  SHADOW,
  SPACING,
} from "@/src/config/theme";
import {
  auth,
  db,
} from "@/src/config/firebase";
import { useProducts } from "@/src/context/ProductContext";

type AdminCard = {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  route?: string;
  disabled?: boolean;
};

const ADMIN_CARDS: AdminCard[] = [
  {
    id: "products",
    title: "Products",
    subtitle: "Add, edit, stock and prices",
    icon: "cube-outline",
    route: "/admin/products",
  },
  {
    id: "orders",
  title: "Orders",
  subtitle: "Manage customer orders",
  icon: "receipt-outline",
  route: "/admin/orders",
  },
  {
    id: "categories",
    title: "Categories",
    subtitle: "Manage store categories",
    icon: "grid-outline",
    disabled: true,
  },
  {
    id: "coupons",
    title: "Coupons",
    subtitle: "Create offers and discounts",
    icon: "pricetag-outline",
    disabled: true,
  },
  {
    id: "notifications",
    title: "Notifications",
    subtitle: "Send customer updates",
    icon: "notifications-outline",
    disabled: true,
  },
  {
    id: "reports",
    title: "Reports",
    subtitle: "Sales and inventory insights",
    icon: "bar-chart-outline",
    disabled: true,
  },
];

export default function AdminDashboard() {
  const router = useRouter();

  const {
    products,
    loading: productsLoading,
  } = useProducts();

  const [adminUser, setAdminUser] =
    useState<User | null>(null);

  const [checking, setChecking] =
    useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (user) => {
        if (!user) {
          setChecking(false);
          router.replace("/admin/login");
          return;
        }

        try {
          const adminSnapshot = await getDoc(
            doc(db, "admins", user.uid),
          );

          const adminData =
            adminSnapshot.data();

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
          console.error(
            "Admin verification failed:",
            error,
          );

          await signOut(auth);
          router.replace("/admin/login");
        } finally {
          setChecking(false);
        }
      },
    );

    return unsubscribe;
  }, [router]);

  const stats = useMemo(() => {
    const outOfStock = products.filter(
      (product) => product.stock <= 0,
    ).length;

    const lowStock = products.filter(
      (product) =>
        product.stock > 0 &&
        product.stock <= 5,
    ).length;

    const offers = products.filter(
      (product) =>
        product.isBestOffer ||
        product.price < product.mrp,
    ).length;

    return {
      total: products.length,
      outOfStock,
      lowStock,
      offers,
    };
  }, [products]);

  const handleLogout = async () => {
    await signOut(auth);
    router.replace("/admin/login");
  };

  if (checking) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator
            size="large"
            color={COLORS.primary}
          />

          <Text style={styles.loadingText}>
            Verifying administrator…
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!adminUser) {
    return null;
  }

  return (
    <SafeAreaView
      style={styles.container}
      edges={["top", "bottom"]}
    >
      <ScrollView
        contentContainerStyle={
          styles.scrollContent
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.heading}>
              Admin Dashboard
            </Text>

            <Text style={styles.email}>
              {adminUser.email}
            </Text>
          </View>

          <View style={styles.adminBadge}>
            <Ionicons
              name="shield-checkmark"
              size={18}
              color={COLORS.primary}
            />

            <Text
              style={styles.adminBadgeText}
            >
              Admin
            </Text>
          </View>
        </View>

        <View style={styles.welcomeCard}>
          <View style={styles.welcomeIcon}>
            <Ionicons
              name="storefront"
              size={32}
              color={COLORS.textOnPrimary}
            />
          </View>

          <View style={styles.welcomeContent}>
            <Text style={styles.welcomeTitle}>
              Raha Supermarket Control
            </Text>

            <Text style={styles.welcomeText}>
              Manage live products, prices,
              stock and customer operations.
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>
          Store Overview
        </Text>

        <View style={styles.statsGrid}>
          <StatCard
            label="Products"
            value={
              productsLoading
                ? "—"
                : String(stats.total)
            }
            icon="cube-outline"
          />

          <StatCard
            label="Low Stock"
            value={
              productsLoading
                ? "—"
                : String(stats.lowStock)
            }
            icon="alert-circle-outline"
          />

          <StatCard
            label="Out of Stock"
            value={
              productsLoading
                ? "—"
                : String(stats.outOfStock)
            }
            icon="close-circle-outline"
          />

          <StatCard
            label="Offers"
            value={
              productsLoading
                ? "—"
                : String(stats.offers)
            }
            icon="pricetag-outline"
          />
        </View>

        <Text style={styles.sectionTitle}>
          Management
        </Text>

        <View style={styles.cardGrid}>
          {ADMIN_CARDS.map((card) => (
            <TouchableOpacity
              key={card.id}
              activeOpacity={0.82}
              disabled={card.disabled}
              style={[
                styles.managementCard,
                card.disabled &&
                  styles.managementCardDisabled,
              ]}
              onPress={() => {
                if (card.route) {
                  router.push(card.route as never);
                }
              }}
            >
              <View style={styles.cardIcon}>
                <Ionicons
                  name={card.icon}
                  size={25}
                  color={
                    card.disabled
                      ? COLORS.textMuted
                      : COLORS.primary
                  }
                />
              </View>

              <Text
                style={[
                  styles.cardTitle,
                  card.disabled &&
                    styles.cardTextDisabled,
                ]}
              >
                {card.title}
              </Text>

              <Text
                style={[
                  styles.cardSubtitle,
                  card.disabled &&
                    styles.cardTextDisabled,
                ]}
              >
                {card.subtitle}
              </Text>

              {card.disabled ? (
                <View style={styles.comingSoon}>
                  <Text
                    style={
                      styles.comingSoonText
                    }
                  >
                    Coming soon
                  </Text>
                </View>
              ) : (
                <Ionicons
                  name="arrow-forward-circle"
                  size={23}
                  color={COLORS.primary}
                  style={styles.cardArrow}
                />
              )}
            </TouchableOpacity>
          ))}
        </View>

        <Button
          label="Logout"
          variant="outline"
          size="lg"
          fullWidth
          onPress={handleLogout}
          leftIcon={
            <Ionicons
              name="log-out-outline"
              size={20}
              color={COLORS.primary}
            />
          }
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statIcon}>
        <Ionicons
          name={icon}
          size={20}
          color={COLORS.primary}
        />
      </View>

      <Text style={styles.statValue}>
        {value}
      </Text>

      <Text style={styles.statLabel}>
        {label}
      </Text>
    </View>
  );
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
    gap: SPACING.md,
  },

  loadingText: {
    fontSize: FONT.size.sm,
    color: COLORS.textSecondary,
  },

  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxxl,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: SPACING.lg,
  },

  headerContent: {
    flex: 1,
  },

  heading: {
    fontSize: FONT.size.xl,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },

  email: {
    marginTop: 3,
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
  },

  adminBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 7,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.primaryLight,
  },

  adminBadgeText: {
    fontSize: FONT.size.xs,
    fontWeight: FONT.weight.bold,
    color: COLORS.primary,
  },

  welcomeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    padding: SPACING.lg,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.primary,
    ...SHADOW.card,
  },

  welcomeIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor:
      "rgba(255,255,255,0.18)",
  },

  welcomeContent: {
    flex: 1,
  },

  welcomeTitle: {
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.bold,
    color: COLORS.textOnPrimary,
  },

  welcomeText: {
    marginTop: 4,
    fontSize: FONT.size.xs,
    lineHeight: 18,
    color: COLORS.textOnPrimary,
    opacity: 0.9,
  },

  sectionTitle: {
    marginTop: SPACING.xl,
    marginBottom: SPACING.md,
    fontSize: FONT.size.lg,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.md,
  },

  statCard: {
    width: "47.5%",
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    backgroundColor: COLORS.background,
    ...SHADOW.card,
  },

  statIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primaryLight,
  },

  statValue: {
    marginTop: SPACING.sm,
    fontSize: FONT.size.xl,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },

  statLabel: {
    marginTop: 2,
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
  },

  cardGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },

  managementCard: {
    width: "47.5%",
    minHeight: 174,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    backgroundColor: COLORS.background,
    ...SHADOW.card,
  },

  managementCardDisabled: {
    opacity: 0.62,
  },

  cardIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surface,
  },

  cardTitle: {
    marginTop: SPACING.md,
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },

  cardSubtitle: {
    marginTop: 5,
    fontSize: FONT.size.xs,
    lineHeight: 17,
    color: COLORS.textSecondary,
  },

  cardTextDisabled: {
    color: COLORS.textMuted,
  },

  cardArrow: {
    marginTop: "auto",
    alignSelf: "flex-end",
  },

  comingSoon: {
    marginTop: "auto",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surface,
  },

  comingSoonText: {
    fontSize: 9,
    fontWeight: FONT.weight.semibold,
    color: COLORS.textMuted,
  },
});