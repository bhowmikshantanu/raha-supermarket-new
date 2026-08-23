import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/src/components/Button";
import { COLORS, FONT, RADIUS, SPACING } from "@/src/config/theme";
import { useApp } from "@/src/context/AppContext";

// width supplied via useWindowDimensions

const SLIDES = [
  {
    icon: "basket" as const,
    title: "Shop groceries easily",
    desc: "Browse thousands of daily essentials from your neighbourhood store.",
    color: COLORS.primary,
    bg: COLORS.primaryLight,
  },
  {
    icon: "flash" as const,
    title: "Fast local delivery",
    desc: "Get your order delivered within 30 minutes — right to your doorstep.",
    color: COLORS.warning,
    bg: COLORS.warningLight,
  },
  {
    icon: "shield-checkmark" as const,
    title: "Safe & secure payment",
    desc: "Pay cash on delivery or use online payment — safely and stress-free.",
    color: COLORS.info,
    bg: COLORS.infoLight,
  },
];

export default function Onboarding() {
  const router = useRouter();
  const { setOnboarded } = useApp();
  const [index, setIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const { width } = useWindowDimensions();

  const finish = async () => {
    await setOnboarded();
    router.replace("/login");
  };

  const next = () => {
    if (index === SLIDES.length - 1) return finish();
    const nextIdx = index + 1;
    scrollRef.current?.scrollTo({ x: nextIdx * width, animated: true });
    setIndex(nextIdx);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.skipRow}>
        <TouchableOpacity onPress={finish} testID="onboarding-skip" hitSlop={12}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
      >
        {SLIDES.map((item, i) => (
          <View key={i} style={[styles.slide, { width }]}>
            <View style={[styles.iconWrap, { backgroundColor: item.bg }]}>
              <Ionicons name={item.icon} size={72} color={item.color} />
            </View>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.desc}>{item.desc}</Text>
          </View>
        ))}
      </ScrollView>
      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>
      <View style={styles.footer}>
        <Button
          label={index === SLIDES.length - 1 ? "Get Started" : "Continue"}
          onPress={next}
          size="lg"
          fullWidth
          testID="onboarding-continue"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  skipRow: { alignItems: "flex-end", paddingHorizontal: SPACING.lg, paddingTop: SPACING.md },
  skipText: {
    color: COLORS.textSecondary,
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.semibold,
  },
  slide: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.xxl,
    gap: SPACING.lg,
  },
  iconWrap: {
    width: 200,
    height: 200,
    borderRadius: 100,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: FONT.size.xxl,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
    textAlign: "center",
  },
  desc: {
    fontSize: FONT.size.base,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: SPACING.md,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: SPACING.sm,
    marginVertical: SPACING.lg,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.border,
  },
  dotActive: {
    width: 24,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.pill,
  },
  footer: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
  },
});
