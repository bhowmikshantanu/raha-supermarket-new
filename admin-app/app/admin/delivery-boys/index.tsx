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
  container: {
    flex: 1,
    backgroundColor: "#F4F7FB",
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

  headerText: {
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

  addButton: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#D69E2E",
    shadowColor: "#D69E2E",
    shadowOpacity: 0.25,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },

  /* ---------- SEARCH ---------- */
  searchBox: {
    marginHorizontal: 20,
    marginTop: 18,
    marginBottom: 16,
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

  /* ---------- LOADING ---------- */
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
  },

  loadingText: {
    marginTop: 10,
    color: "#64748B",
    fontSize: 12,
    fontWeight: "600",
  },

  /* ---------- LIST ---------- */
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 60,
  },

  /* ---------- ERROR ---------- */
  errorBanner: {
    marginBottom: 14,
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

  /* ---------- EMPTY STATE ---------- */
  emptyState: {
    alignItems: "center",
    paddingTop: 70,
    paddingHorizontal: 24,
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
    textAlign: "center",
    fontSize: 12,
    color: "#64748B",
    maxWidth: 300,
    lineHeight: 19,
  },

  emptyCta: {
    marginTop: 20,
    minHeight: 46,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#102A43",
    shadowColor: "#102A43",
    shadowOpacity: 0.15,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },

  emptyCtaText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 12,
  },

  /* ---------- RIDER CARD ---------- */
  riderCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
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

  avatar: {
    width: 50,
    height: 50,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E8F7F3",
    borderWidth: 1,
    borderColor: "#CBE9E1",
  },

  riderContent: {
    flex: 1,
  },

  riderTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  riderName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "900",
    color: "#0F172A",
  },

  /* ---------- STATUS ---------- */
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    minHeight: 28,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 9,
  },

  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },

  statusText: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.2,
  },

  riderMeta: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
  },

  riderMetaMuted: {
    marginTop: 3,
    fontSize: 10,
    color: "#94A3B8",
  },

  /* ---------- ACTIVE / INACTIVE BUTTON ---------- */
  toggleButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  toggleButtonOff: {
    borderColor: "#F1B8B8",
    backgroundColor: "#FDECEC",
  },

  toggleButtonOn: {
    borderColor: "#CDE7E2",
    backgroundColor: "#E7F8F1",
  },
});
