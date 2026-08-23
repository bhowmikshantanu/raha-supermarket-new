import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback } from "react";
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/src/components/Button";
import { EmptyState } from "@/src/components/EmptyState";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { COLORS, FONT, RADIUS, SPACING } from "@/src/config/theme";
import { useApp } from "@/src/context/AppContext";
import type { Address } from "@/src/types";

export default function Addresses() {
  const router = useRouter();

  const {
    addresses,
    removeAddress,
    setDefaultAddress,
  } = useApp();

  const openAddAddress = useCallback(() => {
    router.push("/add-address");
  }, [router]);

  const openEditAddress = useCallback(
    (addressId: string) => {
      router.push({
        pathname: "/add-address",
        params: { id: addressId },
      });
    },
    [router],
  );

  const handleSetDefault = useCallback(
    (address: Address) => {
      if (address.isDefault) {
        Alert.alert(
          "Default Address",
          "This is already your default delivery address.",
        );
        return;
      }

      Alert.alert(
        "Set as Default?",
        `Use ${address.fullName}'s address as your default delivery address?`,
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Set Default",
            onPress: () => {
              setDefaultAddress(address.id);
            },
          },
        ],
      );
    },
    [setDefaultAddress],
  );

  const handleRemoveAddress = useCallback(
    (address: Address) => {
      Alert.alert(
        "Delete Address?",
        `Are you sure you want to delete the saved address for ${address.fullName}?`,
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => {
              removeAddress(address.id);
            },
          },
        ],
      );
    },
    [removeAddress],
  );

  const renderAddress = useCallback(
    ({ item }: { item: Address }) => {
      const completeAddress = [
        item.house,
        item.area,
        item.landmark ? `Near ${item.landmark}` : "",
        item.pincode,
      ]
        .filter(Boolean)
        .join(", ");

      return (
        <View
          style={[
            styles.card,
            item.isDefault && styles.defaultCard,
          ]}
          testID={`address-${item.id}`}
        >
          <View style={styles.cardTopRow}>
            <View
              style={[
                styles.iconWrap,
                item.isDefault && styles.defaultIconWrap,
              ]}
            >
              <Ionicons
                name={item.isDefault ? "home" : "home-outline"}
                size={21}
                color={COLORS.primary}
              />
            </View>

            <View style={styles.addressContent}>
              <View style={styles.nameRow}>
                <Text
                  style={styles.name}
                  numberOfLines={1}
                >
                  {item.fullName}
                </Text>

                {item.isDefault ? (
                  <View style={styles.defaultPill}>
                    <Ionicons
                      name="checkmark-circle"
                      size={12}
                      color={COLORS.primaryDark}
                    />

                    <Text style={styles.defaultText}>
                      DEFAULT
                    </Text>
                  </View>
                ) : null}
              </View>

              <Text style={styles.addressText}>
                {completeAddress}
              </Text>

              <View style={styles.mobileRow}>
                <Ionicons
                  name="call-outline"
                  size={15}
                  color={COLORS.textSecondary}
                />

                <Text style={styles.mobile}>
                  +91 {item.mobile}
                </Text>
              </View>

              {item.instructions ? (
                <View style={styles.instructionsBox}>
                  <Ionicons
                    name="information-circle-outline"
                    size={16}
                    color={COLORS.textSecondary}
                  />

                  <Text style={styles.instructionsText}>
                    {item.instructions}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.actionsRow}>
            {!item.isDefault ? (
              <TouchableOpacity
                activeOpacity={0.75}
                style={styles.defaultButton}
                onPress={() => handleSetDefault(item)}
                testID={`address-default-${item.id}`}
              >
                <Ionicons
                  name="checkmark-circle-outline"
                  size={17}
                  color={COLORS.primary}
                />

                <Text style={styles.defaultButtonText}>
                  Set Default
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.currentDefaultLabel}>
                <Ionicons
                  name="location"
                  size={16}
                  color={COLORS.primary}
                />

                <Text style={styles.currentDefaultText}>
                  Selected for delivery
                </Text>
              </View>
            )}

            <View style={styles.rightActions}>
              <TouchableOpacity
                activeOpacity={0.75}
                style={styles.actionButton}
                onPress={() => openEditAddress(item.id)}
                testID={`address-edit-${item.id}`}
                hitSlop={8}
              >
                <Ionicons
                  name="create-outline"
                  size={18}
                  color={COLORS.primary}
                />

                <Text style={styles.editText}>
                  Edit
                </Text>
              </TouchableOpacity>

              <View style={styles.actionSeparator} />

              <TouchableOpacity
                activeOpacity={0.75}
                style={styles.actionButton}
                onPress={() => handleRemoveAddress(item)}
                testID={`address-remove-${item.id}`}
                hitSlop={8}
              >
                <Ionicons
                  name="trash-outline"
                  size={18}
                  color={COLORS.danger}
                />

                <Text style={styles.deleteText}>
                  Delete
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      );
    },
    [
      handleRemoveAddress,
      handleSetDefault,
      openEditAddress,
    ],
  );

  return (
    <SafeAreaView
      style={styles.container}
      edges={["bottom"]}
    >
      <ScreenHeader title="Saved Addresses" />

      {addresses.length === 0 ? (
        <View style={styles.emptyContainer}>
          <EmptyState
            icon="location-outline"
            title="No saved addresses"
            description="Add a delivery address to make checkout faster and easier."
          >
            <Button
              label="Add New Address"
              onPress={openAddAddress}
            />
          </EmptyState>
        </View>
      ) : (
        <>
          <FlatList
            data={addresses}
            keyExtractor={(item) => item.id}
            renderItem={renderAddress}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.list}
            ItemSeparatorComponent={() => (
              <View style={styles.itemSeparator} />
            )}
            ListHeaderComponent={
              <View style={styles.listHeader}>
                <View style={styles.headerInfo}>
                  <View style={styles.headerInfoIcon}>
                    <Ionicons
                      name="location-outline"
                      size={20}
                      color={COLORS.primary}
                    />
                  </View>

                  <View style={styles.headerInfoText}>
                    <Text style={styles.headerInfoTitle}>
                      Your Delivery Addresses
                    </Text>

                    <Text style={styles.headerInfoDescription}>
                      Choose a default address or add a new delivery location.
                    </Text>
                  </View>
                </View>
              </View>
            }
            ListFooterComponent={
              <View style={styles.listFooter}>
                <Text style={styles.addressCountText}>
                  {addresses.length} saved{" "}
                  {addresses.length === 1
                    ? "address"
                    : "addresses"}
                </Text>
              </View>
            }
          />

          <View style={styles.bottomBar}>
            <Button
              label="Add New Address"
              onPress={openAddAddress}
            />
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  emptyContainer: {
    flex: 1,
  },

  list: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: 120,
  },

  listHeader: {
    marginBottom: SPACING.md,
  },

  headerInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primaryLight,
  },

  headerInfoIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.background,
  },

  headerInfoText: {
    flex: 1,
  },

  headerInfoTitle: {
    color: COLORS.textPrimary,
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.bold,
  },

  headerInfoDescription: {
    marginTop: 3,
    color: COLORS.textSecondary,
    fontSize: FONT.size.sm,
    lineHeight: 19,
  },

  itemSeparator: {
    height: SPACING.md,
  },

  card: {
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.background,
  },

  defaultCard: {
    borderColor: COLORS.primary,
  },

  cardTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: SPACING.md,
  },

  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primaryLight,
  },

  defaultIconWrap: {
    borderWidth: 1,
    borderColor: COLORS.primary,
  },

  addressContent: {
    flex: 1,
  },

  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 7,
  },

  name: {
    maxWidth: "70%",
    color: COLORS.textPrimary,
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.bold,
  },

  defaultPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primaryLight,
  },

  defaultText: {
    color: COLORS.primaryDark,
    fontSize: 9,
    fontWeight: FONT.weight.bold,
    letterSpacing: 0.5,
  },

  addressText: {
    marginTop: 6,
    color: COLORS.textSecondary,
    fontSize: FONT.size.sm,
    lineHeight: 20,
  },

  mobileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 7,
  },

  mobile: {
    color: COLORS.textPrimary,
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.semibold,
  },

  instructionsBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginTop: SPACING.sm,
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primaryLight,
  },

  instructionsText: {
    flex: 1,
    color: COLORS.textSecondary,
    fontSize: FONT.size.xs,
    lineHeight: 17,
  },

  divider: {
    height: 1,
    marginVertical: SPACING.md,
    backgroundColor: COLORS.borderLight,
  },

  actionsRow: {
    minHeight: 32,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING.sm,
  },

  defaultButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 5,
  },

  defaultButtonText: {
    color: COLORS.primary,
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.semibold,
  },

  currentDefaultLabel: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  currentDefaultText: {
    color: COLORS.primary,
    fontSize: FONT.size.xs,
    fontWeight: FONT.weight.semibold,
  },

  rightActions: {
    flexDirection: "row",
    alignItems: "center",
  },

  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },

  actionSeparator: {
    width: 1,
    height: 18,
    backgroundColor: COLORS.borderLight,
  },

  editText: {
    color: COLORS.primary,
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.semibold,
  },

  deleteText: {
    color: COLORS.danger,
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.semibold,
  },

  listFooter: {
    alignItems: "center",
    paddingTop: SPACING.lg,
  },

  addressCountText: {
    color: COLORS.textSecondary,
    fontSize: FONT.size.xs,
  },

  bottomBar: {
    position: "absolute",
    right: 0,
    bottom: 0,
    left: 0,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    backgroundColor: COLORS.background,
  },
});