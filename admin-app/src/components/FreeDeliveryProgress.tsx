import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { BRAND } from "@/src/config/brand";
import { COLORS, FONT, RADIUS, SPACING } from "@/src/config/theme";
import { formatCurrency } from "@/src/utils/format";

interface Props {
  subtotal: number;
  compact?: boolean;
}

export const FreeDeliveryProgress: React.FC<Props> = ({ subtotal, compact }) => {
  const threshold = BRAND.delivery.freeThreshold;
  const eligible = subtotal >= threshold;
  const remaining = Math.max(0, threshold - subtotal);
  const percent = Math.min(100, Math.round((subtotal / threshold) * 100));

  return (
    <View style={[styles.container, compact && styles.compact]} testID="free-delivery-progress">
      <Text style={styles.text}>
        {eligible
          ? "🎉 You unlocked FREE delivery!"
          : `Add ${formatCurrency(remaining)} more for FREE delivery`}
      </Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${percent}%` }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.primarySoft,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
  },
  compact: { padding: SPACING.sm, gap: 6 },
  text: {
    fontSize: FONT.size.sm,
    color: COLORS.primaryDark,
    fontWeight: FONT.weight.semibold,
  },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(22,163,74,0.15)",
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
});
