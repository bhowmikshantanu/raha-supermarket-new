import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/src/components/Button";
import {
  COLORS,
  FONT,
  RADIUS,
  SPACING,
} from "@/src/config/theme";
import {
  getFirebaseProducts,
  seedProductsToFirestore,
} from "@/src/services/firebaseProducts";

export default function FirebaseSetupScreen() {
  const [message, setMessage] = useState(
    "Firebase products are not uploaded yet.",
  );

  const [loading, setLoading] =
    useState(false);

  const handleUpload = async () => {
    if (loading) {
      return;
    }

    setLoading(true);

    try {
      const result =
        await seedProductsToFirestore();

      if (result.skipped) {
        setMessage(
          "Products collection already contains data. Upload skipped.",
        );
      } else {
        setMessage(
          `${result.uploaded} products uploaded successfully.`,
        );
      }
    } catch (error) {
      console.error(
        "Product upload error:",
        error,
      );

      setMessage(
        "Upload failed. Check Firestore rules and internet connection.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCheck = async () => {
    setLoading(true);

    try {
      const products =
        await getFirebaseProducts();

      setMessage(
        `${products.length} products found in Firestore.`,
      );
    } catch (error) {
      console.error(
        "Product check error:",
        error,
      );

      setMessage(
        "Unable to read products from Firestore.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <View style={styles.iconWrap}>
          <Ionicons
            name="cloud-upload-outline"
            size={36}
            color={COLORS.primary}
          />
        </View>

        <Text style={styles.title}>
          Firebase Product Setup
        </Text>

        <Text style={styles.message}>
          {message}
        </Text>

        <Button
          label={
            loading
              ? "Please wait…"
              : "Upload Products"
          }
          onPress={handleUpload}
          disabled={loading}
          loading={loading}
          fullWidth
        />

        <Button
          label="Check Firestore Products"
          onPress={handleCheck}
          disabled={loading}
          variant="outline"
          fullWidth
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: SPACING.lg,
    backgroundColor: COLORS.background,
    justifyContent: "center",
  },

  card: {
    padding: SPACING.xl,
    gap: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
  },

  iconWrap: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primaryLight,
  },

  title: {
    textAlign: "center",
    fontSize: FONT.size.xl,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },

  message: {
    textAlign: "center",
    fontSize: FONT.size.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
});