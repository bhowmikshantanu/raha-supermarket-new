import { Ionicons } from "@expo/vector-icons";
import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
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
  const [existingProducts, setExistingProducts] = useState<any[]>([]);
  const [showLinkProducts, setShowLinkProducts] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [linkingProductId, setLinkingProductId] = useState<string | null>(null);
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
  useEffect(() => {
    const loadExistingProducts = async () => {
      try {
        const snapshot = await getDocs(collection(db, "products"));

        const items = snapshot.docs.map((productDoc) => ({
          id: productDoc.id,
          ...productDoc.data(),
        }));

        items.sort((a: any, b: any) =>
          String(a.name || "").localeCompare(String(b.name || ""))
        );

        setExistingProducts(items);
      } catch (error) {
        console.error("Existing products load failed:", error);
      }
    };

    void loadExistingProducts();
  }, []);
  const activeCategories = useMemo(
    () => categories.filter((item) => item.active),
    [categories],
  );

  const filteredExistingProducts = useMemo(() => {
    const search = productSearch.trim().toLowerCase();

    return existingProducts
      .filter((item) => {
        if (!search) return true;

        return (
          String(item.name || "").toLowerCase().includes(search) ||
          String(item.brand || "").toLowerCase().includes(search) ||
          String(item.size || "").toLowerCase().includes(search)
        );
      })
      .slice(0, 30);
  }, [existingProducts, productSearch]);

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

      const user = auth.currentUser;

      if (!user) {
        router.replace("/admin/login");
        return;
      }

      const idToken = await user.getIdToken(true);

      const backendUrl = (
        process.env.EXPO_PUBLIC_BACKEND_URL || ""
      ).replace(/\/+$/, "");

      if (!backendUrl) {
        throw new Error("BACKEND_URL_NOT_CONFIGURED");
      }

      const response = await fetch(
        `${backendUrl}/api/admin/products/barcode/${encodeURIComponent(code)}`,
        {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${idToken}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error("LOOKUP_FAILED");
      }

      const data = await response.json();
      if (!data?.found || !data?.product) {
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

      setProduct({
        barcode: code,
        name: String(item.name || "").trim(),
        brand: String(item.brand || "").trim(),
        size: String(item.size || "").trim(),
        image: String(item.image || "").trim(),
        description: String(item.description || "").trim(),
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
  const linkBarcodeToExistingProduct = async (productId: string) => {
    const code = barcode.trim();

    if (!code) {
      showToast("Scan or enter a barcode first.", "error");
      return;
    }

    const user = auth.currentUser;

    if (!user) {
      router.replace("/admin/login");
      return;
    }

    setLinkingProductId(productId);

    try {
      await updateDoc(doc(db, "products", productId), {
        barcode: code,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
      });

      showToast("Barcode linked to existing product successfully.", "success");

      setShowLinkProducts(false);
      setProductSearch("");

      router.replace({
        pathname: "/admin/products/[id]",
        params: { id: productId },
      });
    } catch (error) {
      console.error("Barcode linking failed:", error);
      showToast("Unable to link barcode to this product.", "error");
    } finally {
      setLinkingProductId(null);
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
              autoFocus
              returnKeyType="search"
              onSubmitEditing={() => void lookupBarcode(barcode)}
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
              <View style={styles.linkHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionTitle}>Already in Raha?</Text>
                  <Text style={styles.linkHint}>
                    Link this barcode to an existing product instead of creating a duplicate.
                  </Text>
                </View>
                <View style={styles.linkIcon}>
                  <Ionicons name="link-outline" size={22} color="#0F766E" />
                </View>
              </View>

              <TouchableOpacity
                style={styles.linkProductButton}
                onPress={() => setShowLinkProducts((current) => !current)}
              >
                <Ionicons name="search-outline" size={19} color="#FFFFFF" />
                <Text style={styles.linkProductButtonText}>
                  {showLinkProducts ? "Hide Existing Products" : "Link to Existing Product"}
                </Text>
              </TouchableOpacity>

              {showLinkProducts ? (
                <View style={styles.linkPanel}>
                  <TextInput
                    value={productSearch}
                    onChangeText={setProductSearch}
                    placeholder="Search product by name, brand or size..."
                    placeholderTextColor="#94A3B8"
                    style={styles.input}
                  />

                  <View style={styles.productList}>
                    {filteredExistingProducts.length > 0 ? (
                      filteredExistingProducts.map((item) => (
                        <View key={item.id} style={styles.existingProductRow}>
                          {item.image ? (
                            <Image
                              source={{ uri: String(item.image) }}
                              style={styles.existingProductImage}
                              resizeMode="contain"
                            />
                          ) : (
                            <View style={styles.existingProductPlaceholder}>
                              <Ionicons name="cube-outline" size={22} color="#64748B" />
                            </View>
                          )}

                          <View style={styles.existingProductInfo}>
                            <Text style={styles.existingProductName} numberOfLines={1}>
                              {item.name || "Unnamed Product"}
                            </Text>
                            <Text style={styles.existingProductMeta} numberOfLines={1}>
                              {[item.brand, item.size].filter(Boolean).join(" • ") ||
                                "Existing Raha product"}
                            </Text>
                            {item.barcode ? (
                              <Text style={styles.existingBarcode} numberOfLines={1}>
                                Barcode: {String(item.barcode)}
                              </Text>
                            ) : null}
                          </View>

                          <TouchableOpacity
                            activeOpacity={0.85}
                            disabled={linkingProductId !== null}
                            style={[
                              styles.linkNowButton,
                              linkingProductId !== null && styles.linkNowButtonDisabled,
                            ]}
                            onPress={() => void linkBarcodeToExistingProduct(item.id)}
                          >
                            <Ionicons name="link-outline" size={16} color="#FFFFFF" />
                            <Text style={styles.linkNowButtonText}>
                              {linkingProductId === item.id ? "Linking..." : "Link Barcode"}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      ))
                    ) : (
                      <View style={styles.emptyProductsBox}>
                        <Ionicons name="search-outline" size={24} color="#94A3B8" />
                        <Text style={styles.emptyProductsText}>
                          {productSearch.trim()
                            ? `No existing product matches "${productSearch.trim()}".`
                            : "No existing products found."}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              ) : null}
            </View>

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

  linkHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  linkHint: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: "#64748B",
  },
  linkIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E7F8F1",
  },
  linkProductButton: {
    minHeight: 48,
    borderRadius: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#0F766E",
  },
  linkProductButtonText: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  linkPanel: {
    gap: 10,
  },
  productList: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
  },
  existingProductRow: {
    minHeight: 78,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  existingProductImage: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
  },
  existingProductPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
  },
  existingProductInfo: {
    flex: 1,
    minWidth: 0,
  },
  existingProductName: {
    fontSize: 13,
    fontWeight: "900",
    color: "#0F172A",
  },
  existingProductMeta: {
    marginTop: 4,
    fontSize: 11,
    color: "#64748B",
  },
  existingBarcode: {
    marginTop: 3,
    fontSize: 10,
    color: "#94A3B8",
  },
  linkNowButton: {
    minHeight: 38,
    paddingHorizontal: 12,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#0F766E",
  },
  linkNowButtonDisabled: {
    opacity: 0.55,
  },
  linkNowButtonText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  emptyProductsBox: {
    padding: 22,
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  emptyProductsText: {
    textAlign: "center",
    fontSize: 12,
    color: "#64748B",
  },
});
