import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useToast } from "@/src/components/Toast";
import { COLORS, FONT, RADIUS, SHADOW, SPACING } from "@/src/config/theme";
import {
  adminUpdateDeliveryBoy,
  subscribeToDeliveryBoys,
} from "@/src/services/firebaseDeliveryBoys";
import type { DeliveryBoy } from "@/src/types";

export default function AdminDeliveryBoysScreen() {
  const router = useRouter();
  const { showToast } = useToast();

  const [riders, setRiders] = useState<DeliveryBoy[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");
  const [search, setSearch] = useState("");
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToDeliveryBoys(
      (items) => {
        setRiders(items);
        setLoading(false);
        setErrorText("");
      },
      (error) => {
        console.error("[Admin] Delivery boys subscription failed:", error);
        setLoading(false);
        setErrorText("Unable to load delivery boys.");
      },
    );
    return unsubscribe;
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return riders;
    return riders.filter(
      (rider) =>
        rider.name.toLowerCase().includes(q) ||
        rider.mobile.toLowerCase().includes(q) ||
        rider.email.toLowerCase().includes(q) ||
        (rider.vehicleNumber ?? "").toLowerCase().includes(q),
    );
  }, [riders, search]);

  const stats = useMemo(() => {
    const active = riders.filter((r) => r.active).length;
    return { total: riders.length, active, inactive: riders.length - active };
  }, [riders]);

  const handleToggle = async (rider: DeliveryBoy) => {
    if (togglingId) return;
    try {
      setTogglingId(rider.id);
      await adminUpdateDeliveryBoy(rider.id, { active: !rider.active });
      showToast(
        !rider.active
          ? `${rider.name} activated`
          : `${rider.name} deactivated`,
        "success",
      );
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Unable to update rider",
        "error",
      );
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          testID="delivery-boys-back"
        >
          <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title}>Delivery Boys</Text>
          <Text style={styles.subtitle}>
            {stats.active} active · {stats.total} total
          </Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push("/admin/delivery-boys/new")}
          testID="delivery-boys-add"
        >
          <Ionicons name="add" size={22} color={COLORS.textOnPrimary} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={18} color={COLORS.textMuted} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search name, mobile, vehicle…"
          placeholderTextColor={COLORS.textMuted}
          style={styles.searchInput}
          testID="delivery-boys-search"
        />
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading delivery boys…</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(rider) => rider.id}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: SPACING.sm }} />}
          ListHeaderComponent={
            errorText ? (
              <View style={styles.errorBanner}>
                <Ionicons
                  name="warning-outline"
                  size={18}
                  color={COLORS.danger}
                />
                <Text style={styles.errorText}>{errorText}</Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons
                  name="bicycle-outline"
                  size={36}
                  color={COLORS.primary}
                />
              </View>
              <Text style={styles.emptyTitle}>No delivery boys yet</Text>
              <Text style={styles.emptyText}>
                Tap the + button to add your first rider.
              </Text>
              <TouchableOpacity
                style={styles.emptyCta}
                onPress={() => router.push("/admin/delivery-boys/new")}
              >
                <Text style={styles.emptyCtaText}>Add delivery boy</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => {
            const isToggling = togglingId === item.id;
            return (
              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.riderCard}
                onPress={() =>
                  router.push({
                    pathname: "/admin/delivery-boys/[id]",
                    params: { id: item.id },
                  })
                }
                testID={`rider-card-${item.id}`}
              >
                <View style={styles.avatar}>
                  <Ionicons
                    name="person"
                    size={22}
                    color={COLORS.primary}
                  />
                </View>
                <View style={styles.riderContent}>
                  <View style={styles.riderTopRow}>
                    <Text style={styles.riderName}>{item.name}</Text>
                    <View
                      style={[
                        styles.statusPill,
                        {
                          backgroundColor: item.active
                            ? COLORS.primaryLight
                            : COLORS.surfaceAlt,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.statusDot,
                          {
                            backgroundColor: item.active
                              ? COLORS.primary
                              : COLORS.textMuted,
                          },
                        ]}
                      />
                      <Text
                        style={[
                          styles.statusText,
                          {
                            color: item.active
                              ? COLORS.primaryDark
                              : COLORS.textSecondary,
                          },
                        ]}
                      >
                        {item.active ? "Active" : "Inactive"}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.riderMeta}>
                    +91 {item.mobile}
                    {item.vehicleNumber ? ` · ${item.vehicleNumber}` : ""}
                  </Text>
                  <Text style={styles.riderMetaMuted} numberOfLines={1}>
                    {item.email}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    item.active
                      ? styles.toggleButtonOff
                      : styles.toggleButtonOn,
                    isToggling && { opacity: 0.6 },
                  ]}
                  onPress={() => void handleToggle(item)}
                  disabled={isToggling}
                  testID={`rider-toggle-${item.id}`}
                >
                  {isToggling ? (
                    <ActivityIndicator
                      size="small"
                      color={item.active ? COLORS.danger : COLORS.primary}
                    />
                  ) : (
                    <Ionicons
                      name={item.active ? "pause" : "play"}
                      size={16}
                      color={item.active ? COLORS.danger : COLORS.primary}
                    />
                  )}
                </TouchableOpacity>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
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
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surface,
  },
  headerText: { flex: 1, marginLeft: SPACING.sm },
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
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    ...SHADOW.fab,
  },
  searchBox: {
    margin: SPACING.md,
    height: 46,
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
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.xl,
  },
  loadingText: {
    marginTop: SPACING.sm,
    color: COLORS.textSecondary,
    fontSize: FONT.size.sm,
  },
  listContent: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xxxl,
  },
  errorBanner: {
    marginBottom: SPACING.md,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.dangerLight,
  },
  errorText: { flex: 1, fontSize: FONT.size.sm, color: COLORS.danger },
  emptyState: {
    alignItems: "center",
    paddingTop: SPACING.xxxl,
    paddingHorizontal: SPACING.md,
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
    marginTop: 6,
    textAlign: "center",
    fontSize: FONT.size.sm,
    color: COLORS.textSecondary,
    maxWidth: 280,
    lineHeight: 20,
  },
  emptyCta: {
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
  },
  emptyCtaText: {
    color: COLORS.textOnPrimary,
    fontWeight: FONT.weight.bold,
    fontSize: FONT.size.sm,
  },
  riderCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    backgroundColor: COLORS.background,
    ...SHADOW.card,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primaryLight,
  },
  riderContent: { flex: 1 },
  riderTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING.sm,
  },
  riderName: {
    flex: 1,
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 10, fontWeight: FONT.weight.bold },
  riderMeta: {
    marginTop: 4,
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
  },
  riderMetaMuted: {
    marginTop: 2,
    fontSize: FONT.size.xs,
    color: COLORS.textMuted,
  },
  toggleButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleButtonOff: {
    borderColor: COLORS.danger,
    backgroundColor: COLORS.dangerLight,
  },
  toggleButtonOn: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
});
