import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { COLORS, FONT, RADIUS, SHADOW, SPACING } from "@/src/config/theme";

interface Props {
  image: string;
  title: string;
  subtitle: string;
  cta: string;
  onPress: () => void;
}

export const BannerCard: React.FC<Props> = ({
  image,
  title,
  subtitle,
  cta,
  onPress,
}) => (
  <TouchableOpacity
    activeOpacity={0.9}
    onPress={onPress}
    style={styles.container}
    accessibilityRole="button"
    accessibilityLabel={`${title}. ${subtitle}. ${cta}`}
    testID="banner-card"
  >
    <Image
      source={{ uri: image }}
      style={styles.image}
      contentFit="cover"
      transition={250}
    />
    <LinearGradient
      colors={["rgba(63,8,30,0.92)", "rgba(89,13,39,0.68)", "rgba(40,13,24,0.06)"]}
      start={{ x: 0, y: 0.5 }}
      end={{ x: 1, y: 0.5 }}
      style={styles.overlay}
    />
    <View style={styles.content}>
      <View style={styles.offerLabel}>
        <Ionicons name="sparkles" size={12} color="#FFDE76" />
        <Text style={styles.offerLabelText}>RAHA SPECIAL</Text>
      </View>
      <Text style={styles.title} numberOfLines={2}>{title}</Text>
      <Text style={styles.subtitle} numberOfLines={2}>{subtitle}</Text>
      <View style={styles.ctaPill}>
        <Text style={styles.ctaText}>{cta}</Text>
        <Ionicons name="arrow-forward" size={14} color={COLORS.maroonDark} />
      </View>
    </View>
    <View style={styles.cornerGlow} />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    height: 194,
    borderRadius: RADIUS.xl,
    overflow: "hidden",
    position: "relative",
    backgroundColor: COLORS.maroonDark,
    ...SHADOW.card,
  },
  image: { ...StyleSheet.absoluteFillObject },
  overlay: { ...StyleSheet.absoluteFillObject },
  content: {
    position: "absolute",
    top: SPACING.lg,
    bottom: SPACING.lg,
    left: SPACING.lg,
    width: "68%",
    justifyContent: "center",
    alignItems: "flex-start",
  },
  offerLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.pill,
    marginBottom: 9,
  },
  offerLabelText: {
    color: "#FFE6A4",
    fontSize: 10,
    fontWeight: FONT.weight.heavy,
    letterSpacing: 0.9,
  },
  title: {
    color: "#FFFFFF",
    fontSize: FONT.size.xxl,
    lineHeight: 27,
    fontWeight: FONT.weight.heavy,
  },
  subtitle: {
    color: "rgba(255,255,255,0.93)",
    fontSize: FONT.size.sm,
    lineHeight: 17,
    fontWeight: FONT.weight.medium,
    marginTop: 5,
    marginBottom: 11,
  },
  ctaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFD44A",
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
  },
  ctaText: {
    color: COLORS.maroonDark,
    fontWeight: FONT.weight.heavy,
    fontSize: FONT.size.sm,
  },
  cornerGlow: {
    position: "absolute",
    right: -28,
    top: -34,
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: "rgba(255,213,74,0.13)",
  },
});
