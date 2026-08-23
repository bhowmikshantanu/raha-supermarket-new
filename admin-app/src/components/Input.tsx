import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View, TextInputProps } from "react-native";

import { COLORS, FONT, RADIUS, SPACING } from "@/src/config/theme";

interface Props extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIconAction?: { icon: keyof typeof Ionicons.glyphMap; onPress: () => void; testID?: string };
  containerTestID?: string;
}

export const Input: React.FC<Props> = ({
  label,
  error,
  leftIcon,
  rightIconAction,
  containerTestID,
  style,
  ...rest
}) => (
  <View testID={containerTestID}>
    {label && <Text style={styles.label}>{label}</Text>}
    <View style={[styles.wrap, error && styles.wrapError]}>
      {leftIcon && <Ionicons name={leftIcon} size={18} color={COLORS.textSecondary} />}
      <TextInput
        placeholderTextColor={COLORS.textMuted}
        style={[styles.input, style]}
        {...rest}
      />
      {rightIconAction && (
        <TouchableOpacity onPress={rightIconAction.onPress} testID={rightIconAction.testID}>
          <Ionicons name={rightIconAction.icon} size={18} color={COLORS.textSecondary} />
        </TouchableOpacity>
      )}
    </View>
    {error && <Text style={styles.error}>{error}</Text>}
  </View>
);

const styles = StyleSheet.create({
  label: {
    fontSize: FONT.size.sm,
    color: COLORS.textSecondary,
    marginBottom: 6,
    fontWeight: FONT.weight.medium,
  },
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  wrapError: { borderColor: COLORS.danger, backgroundColor: COLORS.dangerLight },
  input: {
    flex: 1,
    fontSize: FONT.size.base,
    color: COLORS.textPrimary,
    padding: 0,
  },
  error: {
    marginTop: 4,
    fontSize: FONT.size.xs,
    color: COLORS.danger,
    fontWeight: FONT.weight.medium,
  },
});
