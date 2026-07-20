import { Image } from "expo-image";
import React from "react";
import { StyleSheet, Text, TouchableOpacity } from "react-native";

import { COLORS, FONT, RADIUS, SPACING } from "@/src/config/theme";
import type { Category } from "@/src/types";

interface Props {
  category: Category;
  onPress: () => void;
  size?: "sm" | "md";
}

export const CategoryTile: React.FC<Props> = ({ category, onPress, size = "md" }) => {
  const tileWidth = size === "sm" ? 76 : undefined;
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.tile, { backgroundColor: category.color }, tileWidth && { width: tileWidth }]}
      testID={`category-${category.id}`}
    >
      <Image source={{ uri: category.image }} style={styles.image} contentFit="cover" />
      <Text style={styles.name} numberOfLines={2}>
        {category.name}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  tile: {
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    alignItems: "center",
    justifyContent: "flex-start",
    gap: SPACING.sm,
    paddingBottom: SPACING.md,
  },
  image: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.background,
  },
  name: {
    fontSize: FONT.size.xs,
    color: COLORS.textPrimary,
    fontWeight: FONT.weight.semibold,
    textAlign: "center",
  },
});
