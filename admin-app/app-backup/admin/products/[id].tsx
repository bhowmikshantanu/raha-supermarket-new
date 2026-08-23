import { useLocalSearchParams } from "expo-router";
import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AdminProductForm } from "@/src/components/AdminProductForm";
import { COLORS, FONT, SPACING } from "@/src/config/theme";
import { useProducts } from "@/src/context/ProductContext";

export default function EditAdminProductScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { loading, getProductById } = useProducts();
  const product = id ? getProductById(id) : undefined;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.text}>Loading product…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!product) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.title}>Product not found</Text>
          <Text style={styles.text}>This product may have been deleted.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return <AdminProductForm mode="edit" product={product} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.xl,
  },
  title: {
    fontSize: FONT.size.lg,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },
  text: {
    marginTop: SPACING.sm,
    textAlign: "center",
    fontSize: FONT.size.sm,
    color: COLORS.textSecondary,
  },
});