import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/src/components/Button";
import { EmptyState } from "@/src/components/EmptyState";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { COLORS, FONT, RADIUS, SPACING } from "@/src/config/theme";
import { useApp } from "@/src/context/AppContext";

export default function Addresses() {
  const router = useRouter();
  const { addresses, removeAddress } = useApp();

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScreenHeader title="Saved Addresses" />
      {addresses.length === 0 ? (
        <EmptyState icon="location-outline" title="No saved addresses" description="Your delivery addresses will show up here after your first order.">
          <Button label="Continue Shopping" onPress={() => router.push("/(tabs)")} />
        </EmptyState>
      ) : (
        <FlatList
          data={addresses}
          keyExtractor={(a) => a.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: SPACING.md }} />}
          renderItem={({ item }) => (
            <View style={styles.card} testID={`address-${item.id}`}>
              <View style={styles.iconWrap}>
                <Ionicons name="home" size={20} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={styles.name}>{item.fullName}</Text>
                  {item.isDefault && (
                    <View style={styles.defaultPill}>
                      <Text style={styles.defaultText}>DEFAULT</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.addr}>
                  {item.house}, {item.area}
                  {item.landmark ? `, near ${item.landmark}` : ""} - {item.pincode}
                </Text>
                <Text style={styles.mobile}>+91 {item.mobile}</Text>
              </View>
              <TouchableOpacity onPress={() => removeAddress(item.id)} testID={`address-remove-${item.id}`} hitSlop={10}>
                <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  list: { padding: SPACING.md },
  card: {
    flexDirection: "row", gap: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.background,
    borderWidth: 1, borderColor: COLORS.borderLight,
    borderRadius: RADIUS.lg,
    alignItems: "flex-start",
  },
  iconWrap: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.primaryLight,
    justifyContent: "center", alignItems: "center",
  },
  name: { fontSize: FONT.size.md, fontWeight: FONT.weight.bold, color: COLORS.textPrimary },
  defaultPill: {
    paddingHorizontal: 6, paddingVertical: 2,
    backgroundColor: COLORS.primaryLight, borderRadius: RADIUS.sm,
  },
  defaultText: { fontSize: 9, fontWeight: FONT.weight.bold, color: COLORS.primaryDark, letterSpacing: 0.5 },
  addr: { fontSize: FONT.size.sm, color: COLORS.textSecondary, marginTop: 4, lineHeight: 20 },
  mobile: { fontSize: FONT.size.sm, color: COLORS.textPrimary, marginTop: 4, fontWeight: FONT.weight.semibold },
});
