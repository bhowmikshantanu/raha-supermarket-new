import { Ionicons } from "@expo/vector-icons";
import { collection, doc, getDocs, query, serverTimestamp, setDoc, where } from "firebase/firestore";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useToast } from "@/src/components/Toast";
import { auth, db } from "@/src/config/firebase";
import {
  subscribeToFirebaseCategories,
  type FirebaseCategory,
} from "@/src/services/firebaseCategories";

type LookupProduct = {
  barcode: string;
  name: string;
  brand: string;
  size: string;
  image: string;
  description: string;
};

export default function ScanProductScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const videoRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [barcode, setBarcode] = useState("");
  const [scanning, setScanning] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [saving, setSaving] = useState(false);
  const [product, setProduct] = useState<LookupProduct | null>(null);
  const [categories, setCategories] = useState<FirebaseCategory[]>([]);
  const [category, setCategory] = useState("");
  const [mrp, setMrp] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");

  useEffect(() => {
    const unsubscribe = subscribeToFirebaseCategories(setCategories, (error) => {
      console.error(error);
      showToast("Unable to load categories.", "error");
    });
    return () => {
      unsubscribe();
      stopCamera();
    };
  }, [showToast]);

  const activeCategories = useMemo(
    () => categories.filter((item) => item.active),
    [categories],
  );

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setScanning(false);
  };

  const lookupBarcode = async (rawCode: string) => {
    const code = rawCode.trim();
    if (!code) {
      showToast("Enter or scan a barcode first.", "error");
      return;
    }

    setLookingUp(true);
    setProduct(null);

    try {
      const existingQuery = query(
        collection(db, "products"),
        where("barcode", "==", code),
      );
      const existing = await getDocs(existingQuery);

      if (!existing.empty) {
        stopCamera();
        const existingId = existing.docs[0].id;
        showToast("Product already exists. Opening it now.", "success");
        router.replace({
          pathname: "/admin/products/[id]",
          params: { id: existingId },
        });
        return;
      }

      const response = await fetch(
        `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json`,
      );

      if (!response.ok) {
        throw new Error("LOOKUP_FAILED");
      }

      const data = await response.json();
      if (data?.status !== 1 || !data?.product) {
        setProduct({
          barcode: code,
          name: "",
          brand: "",
          size: "",
          image: "",
          description: "",
        });
        showToast("Barcode not found. You can still add it manually.", "error");
        stopCamera();
        return;
      }

      const item = data.product;
      const name =
        item.product_name_en ||
        item.product_name ||
        item.generic_name_en ||
        item.generic_name ||
        "";

      setProduct({
        barcode: code,
        name: String(name).trim(),
        brand: String(item.brands || "").trim(),
        size: String(item.quantity || "").trim(),
        image: String(item.image_front_url || item.image_url || "").trim(),
        description: String(item.generic_name_en || item.generic_name || "").trim(),
      });

      stopCamera();
      showToast("Product details found. Verify price and stock.", "success");
    } catch (error) {
      console.error("Barcode lookup failed:", error);
      showToast("Unable to look up this barcode right now.", "error");
    } finally {
      setLookingUp(false);
    }
  };

  const startCamera = async () => {
    if (Platform.OS !== "web") {
      showToast("Camera scanner will be added to the next Android build.", "error");
      return;
    }

    const BarcodeDetectorClass = (globalThis as any).BarcodeDetector;
    if (!BarcodeDetectorClass || !navigator?.mediaDevices?.getUserMedia) {
      showToast("This browser cannot scan directly. Enter the barcode below.", "error");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      setScanning(true);

      setTimeout(async () => {
        if (!videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        const detector = new BarcodeDetectorClass({
          formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"],
        });

        const scanLoop = async () => {
          if (!streamRef.current || !videoRef.current) return;
          try {
            const results = await detector.detect(videoRef.current);
            const found = results?.[0]?.rawValue;
            if (found) {
              setBarcode(found);
              await lookupBarcode(found);
              return;
            }
          } catch {}
          if (streamRef.current) requestAnimationFrame(scanLoop);
        };

        requestAnimationFrame(scanLoop);
      }, 100);
    } catch (error) {
      console.error("Camera start failed:", error);
      showToast("Camera permission was not available.", "error");
      stopCamera();
    }
  };

  const saveProduct = async () => {
    if (!product) return;

    const cleanName = product.name.trim();
    const cleanSize = product.size.trim();
    const parsedMrp = Number(mrp);
    const parsedPrice = Number(price);
    const parsedStock = Number(stock);

    if (!cleanName) return showToast("Product name is required.", "error");
    if (!cleanSize) return showToast("Size / quantity is required.", "error");
    if (!category) return showToast("Select a category.", "error");
    if (!Number.isFinite(parsedMrp) || parsedMrp <= 0)
      return showToast("Enter a valid MRP.", "error");
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0 || parsedPrice > parsedMrp)
      return showToast("Enter a valid selling price.", "error");
    if (!Number.isInteger(parsedStock) || parsedStock < 0)
      return showToast("Enter valid stock.", "error");

    const user = auth.currentUser;
    if (!user) {
      router.replace("/admin/login");
      return;
    }

    setSaving(true);
    try {
      const id = `barcode-${product.barcode}`;
      await setDoc(
        doc(db, "products", id),
        {
          id,
          barcode: product.barcode,
          name: cleanName,
          brand: product.brand.trim(),
          category,
          size: cleanSize,
          mrp: parsedMrp,
          price: parsedPrice,
          stock: parsedStock,
          image: product.image.trim(),
          description: product.description.trim(),
          isFeatured: false,
          isPopular: false,
          isBestOffer: false,
          isActive: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          createdBy: user.uid,
          updatedBy: user.uid,
        },
        { merge: true },
      );

      showToast("Scanned product added successfully.", "success");
      router.replace("/admin/products");
    } catch (error) {
      console.error("Scanned product save failed:", error);
      showToast("Unable to save product.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.back} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Scan Product Barcode</Text>
          <Text style={styles.subtitle}>Scan, verify details, then add to the store</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <View style={styles.scanIcon}>
            <Ionicons name="barcode-outline" size={34} color="#D69E2E" />
          </View>
          <Text style={styles.heroTitle}>Fast Product Entry</Text>
          <Text style={styles.heroText}>
            Existing Add Product and Bulk Import remain unchanged.
          </Text>
          <TouchableOpacity style={styles.scanButton} onPress={startCamera}>
            <Ionicons name="camera-outline" size={20} color="#FFFFFF" />
            <Text style={styles.scanButtonText}>Scan with Camera</Text>
          </TouchableOpacity>
        </View>

        {scanning && Platform.OS === "web" ? (
          <View style={styles.cameraCard}>
            {React.createElement("video", {
              ref: videoRef,
              style: { width: "100%", maxHeight: 320, borderRadius: 14 },
              playsInline: true,
              muted: true,
            })}
            <TouchableOpacity style={styles.stopButton} onPress={stopCamera}>
              <Text style={styles.stopButtonText}>Stop Camera</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.label}>Barcode / EAN / UPC</Text>
          <View style={styles.lookupRow}>
            <TextInput
              value={barcode}
              onChangeText={setBarcode}
              placeholder="Example: 8901234567890"
              keyboardType="number-pad"
              style={styles.input}
            />
            <TouchableOpacity
              style={styles.lookupButton}
              disabled={lookingUp}
              onPress={() => void lookupBarcode(barcode)}
            >
              <Text style={styles.lookupText}>{lookingUp ? "Checking..." : "Lookup"}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {product ? (
          <>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Product Details</Text>
              {product.image ? (
                <Image source={{ uri: product.image }} style={styles.image} resizeMode="contain" />
              ) : null}

              <Field label="Product Name" value={product.name}
                onChangeText={(value) => setProduct({ ...product, name: value })} />
              <Field label="Brand" value={product.brand}
                onChangeText={(value) => setProduct({ ...product, brand: value })} />
              <Field label="Size / Quantity" value={product.size}
                onChangeText={(value) => setProduct({ ...product, size: value })} />
              <Field label="Description" value={product.description}
                onChangeText={(value) => setProduct({ ...product, description: value })} />

              <Text style={styles.label}>Category</Text>
              <View style={styles.chips}>
                {activeCategories.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.chip, category === item.id && styles.chipActive]}
                    onPress={() => setCategory(item.id)}
                  >
                    <Text style={[styles.chipText, category === item.id && styles.chipTextActive]}>
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Price & Stock</Text>
              <Field label="MRP (₹)" value={mrp} onChangeText={setMrp} keyboardType="decimal-pad" />
              <Field label="Selling Price (₹)" value={price} onChangeText={setPrice} keyboardType="decimal-pad" />
              <Field label="Stock" value={stock} onChangeText={setStock} keyboardType="number-pad" />

              <TouchableOpacity style={styles.saveButton} disabled={saving} onPress={() => void saveProduct()}>
                <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
                <Text style={styles.saveText}>{saving ? "Saving..." : "Add Scanned Product"}</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function Field(props: React.ComponentProps<typeof TextInput> & { label: string }) {
  const { label, ...rest } = props;
  return (
    <View style={{ gap: 7 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput {...rest} style={styles.input} placeholderTextColor="#94A3B8" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F7FB" },
  header: {
    flexDirection: "row", alignItems: "center", gap: 12, padding: 16,
    backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: "#E2E8F0",
  },
  back: {
    width: 44, height: 44, borderRadius: 14, alignItems: "center",
    justifyContent: "center", backgroundColor: "#F1F5F9",
  },
  title: { fontSize: 21, fontWeight: "900", color: "#0F172A" },
  subtitle: { marginTop: 3, fontSize: 12, color: "#64748B" },
  content: { padding: 16, gap: 14, paddingBottom: 60 },
  hero: {
    padding: 20, borderRadius: 18, backgroundColor: "#102A43",
    alignItems: "center",
  },
  scanIcon: {
    width: 64, height: 64, borderRadius: 20, alignItems: "center",
    justifyContent: "center", backgroundColor: "#FFF7DF",
  },
  heroTitle: { marginTop: 12, fontSize: 19, fontWeight: "900", color: "#FFFFFF" },
  heroText: { marginTop: 5, textAlign: "center", fontSize: 12, color: "#CBD5E1" },
  scanButton: {
    marginTop: 16, minHeight: 46, paddingHorizontal: 18, borderRadius: 13,
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, backgroundColor: "#D69E2E",
  },
  scanButtonText: { color: "#FFFFFF", fontWeight: "900" },
  cameraCard: { padding: 12, borderRadius: 18, backgroundColor: "#FFFFFF" },
  stopButton: {
    marginTop: 10, minHeight: 42, borderRadius: 12, alignItems: "center",
    justifyContent: "center", backgroundColor: "#FDECEC",
  },
  stopButtonText: { color: "#C53030", fontWeight: "800" },
  card: {
    padding: 16, gap: 14, borderRadius: 18, borderWidth: 1,
    borderColor: "#E2E8F0", backgroundColor: "#FFFFFF",
  },
  sectionTitle: { fontSize: 16, fontWeight: "900", color: "#0F172A" },
  label: { fontSize: 12, fontWeight: "800", color: "#334155" },
  lookupRow: { flexDirection: "row", gap: 10 },
  input: {
    flex: 1, minHeight: 48, paddingHorizontal: 14, borderWidth: 1,
    borderColor: "#DDE5EF", borderRadius: 12, backgroundColor: "#F8FAFC",
    color: "#0F172A",
  },
  lookupButton: {
    minWidth: 96, minHeight: 48, borderRadius: 12, alignItems: "center",
    justifyContent: "center", backgroundColor: "#0F766E",
  },
  lookupText: { color: "#FFFFFF", fontWeight: "900" },
  image: { width: "100%", height: 180 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 13, paddingVertical: 9, borderRadius: 11,
    borderWidth: 1, borderColor: "#E2E8F0", backgroundColor: "#F8FAFC",
  },
  chipActive: { borderColor: "#D69E2E", backgroundColor: "#FFF7DF" },
  chipText: { fontSize: 11, fontWeight: "700", color: "#64748B" },
  chipTextActive: { color: "#9A6700", fontWeight: "900" },
  saveButton: {
    minHeight: 50, borderRadius: 13, flexDirection: "row", alignItems: "center",
    justifyContent: "center", gap: 8, backgroundColor: "#102A43",
  },
  saveText: { color: "#FFFFFF", fontWeight: "900" },
});
