import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { COLORS, FONT, RADIUS, SPACING } from "@/src/config/theme";

type Tone = "primary" | "success" | "warning" | "danger" | "info" | "muted";

interface Props {
  label: string;
  tone?: Tone;
}

const TONE: Record<Tone, { bg: string; fg: string }> = {
  primary: { bg: COLORS.primaryLight, fg: COLORS.primaryDark },
  success: { bg: COLORS.primaryLight, fg: COLORS.primaryDark },
  warning: { bg: COLORS.warningLight, fg: "#B45309" },
  danger: { bg: COLORS.dangerLight, fg: "#B91C1C" },
  info: { bg: COLORS.infoLight, fg: "#1D4ED8" },
  muted: { bg: COLORS.surfaceAlt, fg: COLORS.textSecondary },
};

export const StatusPill: React.FC<Props> = ({ label, tone = "primary" }) => {
  const c = TONE[tone];
  return (
    <View style={[styles.pill, { backgroundColor: c.bg }]}>
      <Text style={[styles.text, { color: c.fg }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  pill: {
    alignSelf: "flex-start",
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
  },
  text: {
    fontSize: FONT.size.xs,
    fontWeight: FONT.weight.semibold,
  },
});
