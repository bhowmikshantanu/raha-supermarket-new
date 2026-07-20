import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { COLORS, FONT, RADIUS, SPACING } from "@/src/config/theme";

interface Props {
  image: string;
  title: string;
  subtitle: string;
  cta: string;
  onPress: () => void;
}

export const BannerCard: React.FC<Props> = ({ image, title, subtitle, cta, onPress }) => {
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      style={styles.container}
      testID="banner-card"
    >
      <Image source={{ uri: image }} style={styles.image} contentFit="cover" />
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.7)"]}
        style={styles.overlay}
      />
      <View style={styles.content}>
        <Text style={styles.subtitle}>{subtitle}</Text>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.ctaPill}>
          <Text style={styles.ctaText}>{cta}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 160,
    borderRadius: RADIUS.xl,
    overflow: "hidden",
    position: "relative",
    backgroundColor: COLORS.surface,
  },
  image: { ...StyleSheet.absoluteFillObject },
  overlay: { ...StyleSheet.absoluteFillObject },
  content: {
    position: "absolute",
    bottom: SPACING.lg,
    left: SPACING.lg,
    right: SPACING.lg,
  },
  subtitle: {
    color: "rgba(255,255,255,0.85)",
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.medium,
    marginBottom: 2,
  },
  title: {
    color: "#FFFFFF",
    fontSize: FONT.size.xl,
    fontWeight: FONT.weight.bold,
    marginBottom: SPACING.sm,
  },
  ctaPill: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
  },
  ctaText: {
    color: COLORS.textOnPrimary,
    fontWeight: FONT.weight.bold,
    fontSize: FONT.size.sm,
  },
});
