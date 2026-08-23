import React from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ScreenHeader } from "@/src/components/ScreenHeader";
import { BRAND } from "@/src/config/brand";
import { COLORS, FONT, SPACING } from "@/src/config/theme";

export default function Terms() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }} edges={["bottom"]}>
      <ScreenHeader title="Terms & Conditions" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.heading}>Welcome to {BRAND.name}</Text>
        <Text style={styles.body}>
          By using this app you agree to shop only from {BRAND.name}, follow all applicable local laws, and
          treat our staff and delivery partners with kindness. Prices, availability, and offers are subject
          to change without notice.
        </Text>
        <Text style={styles.heading}>Delivery</Text>
        <Text style={styles.body}>
          We deliver within a {BRAND.delivery.radiusKm} km radius from our store. Delivery fee is
          ₹{BRAND.delivery.fee} for orders below ₹{BRAND.delivery.freeThreshold}; free above it.
          Delivery time may vary based on weather, traffic and order volume.
        </Text>
        <Text style={styles.heading}>Returns</Text>
        <Text style={styles.body}>
          Perishable items are non-returnable. For any issue with your order, reach out on WhatsApp
          {" "}{BRAND.whatsappDisplay} within 2 hours of delivery and we&apos;ll make it right.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: SPACING.lg, gap: SPACING.md },
  heading: { fontSize: FONT.size.lg, fontWeight: FONT.weight.bold, color: COLORS.textPrimary, marginTop: SPACING.md },
  body: { fontSize: FONT.size.md, color: COLORS.textSecondary, lineHeight: 22 },
});
