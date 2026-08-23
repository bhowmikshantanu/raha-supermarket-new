import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useToast } from "@/src/components/Toast";
import { COLORS, FONT, RADIUS, SHADOW, SPACING } from "@/src/config/theme";
import { subscribeToActiveDeliveryBoys } from "@/src/services/firebaseDeliveryBoys";
import { assignDeliveryBoyToOrder } from "@/src/services/firebaseDeliveryOrders";
import type { DeliveryBoy, Order } from "@/src/types";

interface Props {
  order: Order | null;
  visible: boolean;
  onClose: () => void;
  onAssigned?: (rider: DeliveryBoy) => void;
}

/**
 * Reusable bottom sheet the admin can use to assign or reassign a
 * delivery boy to an order.
 */
export function AssignRiderSheet({
  order,
  visible,
  onClose,
  onAssigned,
}: Props) {
  const { showToast } = useToast();
  const [riders, setRiders] = useState<DeliveryBoy[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigningId, setAssigningId] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    const unsubscribe = subscribeToActiveDeliveryBoys(
      (items) => {
        setRiders(items);
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsubscribe;
  }, [visible]);

  const currentlyAssignedId = order?.deliveryBoyId ?? null;

  const sorted = useMemo(() => {
    return [...riders].sort((a, b) => {
      if (a.id === currentlyAssignedId) return -1;
      if (b.id === currentlyAssignedId) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [riders, currentlyAssignedId]);

  const handleAssign = async (rider: DeliveryBoy) => {
    if (!order || assigningId) return;
    try {
      setAssigningId(rider.id);
      await assignDeliveryBoyToOrder(order.id, rider);
      showToast(
        currentlyAssignedId === rider.id
          ? `${rider.name} is already on this order`
          : `Assigned to ${rider.name}`,
        "success",
      );
      onAssigned?.(rider);
      onClose();
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Unable to assign",
        "error",
      );
    } finally {
      setAssigningId(null);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose} />
      <SafeAreaView style={styles.sheet} edges={["bottom"]}>
        <View style={styles.handle} />
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Assign Delivery Boy</Text>
            {order ? (
              <Text style={styles.subtitle}>
                Order #{order.id} · {order.address.fullName}
              </Text>
            ) : null}
          </View>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            testID="assign-sheet-close"
          >
            <Ionicons name="close" size={20} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading active riders…</Text>
          </View>
        ) : sorted.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="bicycle-outline"
                size={30}
                color={COLORS.primary}
              />
            </View>
            <Text style={styles.emptyTitle}>No active riders</Text>
            <Text style={styles.emptyText}>
              Add or activate a delivery boy first.
            </Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.list}>
            {sorted.map((rider) => {
              const isCurrent = currentlyAssignedId === rider.id;
              const isAssigning = assigningId === rider.id;
              return (
                <TouchableOpacity
                  key={rider.id}
                  style={[styles.row, isCurrent && styles.rowCurrent]}
                  onPress={() => void handleAssign(rider)}
                  disabled={isAssigning}
                  testID={`assign-rider-${rider.id}`}
                >
                  <View style={styles.avatar}>
                    <Ionicons
                      name="person"
                      size={18}
                      color={COLORS.primary}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowName}>
                      {rider.name}
                      {isCurrent ? "  · Currently assigned" : ""}
                    </Text>
                    <Text style={styles.rowMeta}>
                      +91 {rider.mobile}
                      {rider.vehicleNumber ? ` · ${rider.vehicleNumber}` : ""}
                    </Text>
                  </View>
                  {isAssigning ? (
                    <ActivityIndicator color={COLORS.primary} />
                  ) : (
                    <Ionicons
                      name={isCurrent ? "checkmark-circle" : "chevron-forward"}
                      size={20}
                      color={isCurrent ? COLORS.primary : COLORS.textMuted}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.overlay,
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: "80%",
    backgroundColor: COLORS.background,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    paddingTop: SPACING.sm,
    ...SHADOW.card,
  },
  handle: {
    alignSelf: "center",
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.borderLight,
    marginBottom: SPACING.sm,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  title: {
    fontSize: FONT.size.lg,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },
  subtitle: {
    marginTop: 2,
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surface,
  },
  loading: {
    alignItems: "center",
    padding: SPACING.xl,
    gap: SPACING.sm,
  },
  loadingText: { color: COLORS.textSecondary, fontSize: FONT.size.sm },
  empty: {
    alignItems: "center",
    padding: SPACING.xl,
    gap: SPACING.sm,
  },
  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primaryLight,
  },
  emptyTitle: {
    marginTop: SPACING.sm,
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },
  emptyText: {
    textAlign: "center",
    color: COLORS.textSecondary,
    fontSize: FONT.size.sm,
    maxWidth: 260,
  },
  list: { padding: SPACING.md, gap: SPACING.sm, paddingBottom: SPACING.xxxl },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    backgroundColor: COLORS.background,
  },
  rowCurrent: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primaryLight,
  },
  rowName: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },
  rowMeta: {
    marginTop: 2,
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
  },
});
