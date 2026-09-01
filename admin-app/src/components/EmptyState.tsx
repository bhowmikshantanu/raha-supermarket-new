import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { COLORS, FONT, SPACING } from "@/src/config/theme";

interface Props {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  children?: React.ReactNode;
}

export const EmptyState: React.FC<Props> = ({
  icon = "cart-outline",
  title,
  description,
  actionLabel,
  onAction,
  children,
}) => (
  <View style={styles.container} testID="empty-state">
    <View style={styles.iconWrap}>
      <Ionicons name={icon} size={48} color={COLORS.primary} />
    </View>
    <Text style={styles.title}>{title}</Text>
    {description && <Text style={styles.desc}>{description}</Text>}

    {actionLabel && onAction ? (
      <TouchableOpacity
        style={styles.actionButton}
        onPress={onAction}
        accessibilityRole="button"
      >
        <Text style={styles.actionText}>{actionLabel}</Text>
      </TouchableOpacity>
    ) : null}

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
  actionButton: {
    marginTop: SPACING.sm,
    minHeight: 44,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  actionText: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.bold,
    color: COLORS.textOnPrimary,
  },
});
