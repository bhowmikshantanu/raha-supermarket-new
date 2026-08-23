import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { COLORS, FONT, SPACING } from "@/src/config/theme";

interface Props {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
  children?: React.ReactNode;
}

export const EmptyState: React.FC<Props> = ({ icon = "cart-outline", title, description, children }) => (
  <View style={styles.container} testID="empty-state">
    <View style={styles.iconWrap}>
      <Ionicons name={icon} size={48} color={COLORS.primary} />
    </View>
    <Text style={styles.title}>{title}</Text>
    {description && <Text style={styles.desc}>{description}</Text>}
    {children}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: SPACING.xxl,
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.md,
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  title: {
    fontSize: FONT.size.xl,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
    textAlign: "center",
  },
  desc: {
    fontSize: FONT.size.md,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
});
