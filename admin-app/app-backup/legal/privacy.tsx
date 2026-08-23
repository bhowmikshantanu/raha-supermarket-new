import React from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ScreenHeader } from "@/src/components/ScreenHeader";
import { BRAND } from "@/src/config/brand";
import { COLORS, FONT, SPACING } from "@/src/config/theme";

export default function Privacy() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }} edges={["bottom"]}>
      <ScreenHeader title="Privacy Policy" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.heading}>How we use your information</Text>
        <Text style={styles.body}>
          {BRAND.name} respects your privacy. We collect your mobile number and delivery address purely to
          process your orders and provide customer support. Your personal information is never sold to third
          parties and is kept confidential.
        </Text>
        <Text style={styles.heading}>What we collect</Text>
        <Text style={styles.body}>
          • Mobile number for order and delivery communication{"\n"}
          • Delivery address for order fulfilment{"\n"}
          • Order history to help you reorder easily
        </Text>
        <Text style={styles.heading}>Contact us</Text>
        <Text style={styles.body}>
          If you have questions, reach out on WhatsApp {BRAND.whatsappDisplay} or visit us at {BRAND.address}.
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
