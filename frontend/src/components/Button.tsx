import React from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from "react-native";

import { COLORS, FONT, RADIUS, SPACING } from "@/src/config/theme";

interface Props {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  testID?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<Props> = ({
  label,
  onPress,
  variant = "primary",
  size = "md",
  disabled,
  loading,
  fullWidth,
  style,
  testID,
  leftIcon,
  rightIcon,
}) => {
  const isDisabled = disabled || loading;
  const sz = SIZES[size];
  const vs = VARIANTS[variant];

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      disabled={isDisabled}
      onPress={onPress}
      testID={testID}
      style={[
        styles.base,
        { paddingVertical: sz.pv, paddingHorizontal: sz.ph, borderRadius: sz.radius },
        { backgroundColor: vs.bg, borderWidth: vs.borderWidth, borderColor: vs.border },
        fullWidth && { alignSelf: "stretch" },
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={vs.fg} />
      ) : (
        <View style={styles.row}>
          {leftIcon}
          <Text style={[styles.label, { color: vs.fg, fontSize: sz.font }]}>{label}</Text>
          {rightIcon}
        </View>
      )}
    </TouchableOpacity>
  );
};

const SIZES = {
  sm: { pv: 8, ph: 14, font: FONT.size.sm, radius: RADIUS.md },
  md: { pv: 12, ph: 18, font: FONT.size.base, radius: RADIUS.md },
  lg: { pv: 16, ph: 22, font: FONT.size.lg, radius: RADIUS.lg },
};

const VARIANTS = {
  primary: { bg: COLORS.primary, fg: COLORS.textOnPrimary, border: COLORS.primary, borderWidth: 0 },
  secondary: { bg: COLORS.primaryLight, fg: COLORS.primary, border: COLORS.primaryLight, borderWidth: 0 },
  outline: { bg: COLORS.background, fg: COLORS.primary, border: COLORS.primary, borderWidth: 1.5 },
  ghost: { bg: "transparent", fg: COLORS.primary, border: "transparent", borderWidth: 0 },
};

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
  },
  row: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
  label: { fontWeight: FONT.weight.bold, letterSpacing: 0.3 },
  disabled: { opacity: 0.5 },
});
