import { Ionicons } from "@expo/vector-icons";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/src/components/Button";
import { useToast } from "@/src/components/Toast";
import { auth, db } from "@/src/config/firebase";
import { COLORS, FONT, RADIUS, SHADOW, SPACING } from "@/src/config/theme";
import {
  subscribeToFirebaseCategories,
  type FirebaseCategory,
} from "@/src/services/firebaseCategories";
import { pickAndUploadProductImage } from "@/src/services/firebaseProductImages";
import { checkProductDuplicate } from "@/src/services/firebaseProducts";
import type { Product } from "@/src/types";

type ProductFormProps = {
  mode: "create" | "edit";
  product?: Product;
};

type FormState = {
  name: string;
  category: string;
  size: string;
  mrp: string;
  price: string;
  stock: string;
  image: string;
  description: string;
  isFeatured: boolean;
  isPopular: boolean;
  isBestOffer: boolean;
};

function getInitialState(product?: Product): FormState {
  return {
    name: product?.name ?? "",
    category: product?.category ?? "",
    size: product?.size ?? "",
    mrp: product?.mrp !== undefined ? String(product.mrp) : "",
    price: product?.price !== undefined ? String(product.price) : "",
    stock: product?.stock !== undefined ? String(product.stock) : "",
    image: product?.image ?? "",
    description: product?.description ?? "",
    isFeatured: product?.isFeatured ?? false,
    isPopular: product?.isPopular ?? false,
    isBestOffer: product?.isBestOffer ?? false,
  };
}

function createProductId(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 42);

  return `${slug || "product"}-${Date.now().toString(36).slice(-6)}`;
}

function parseNumber(value: string): number | null {
  const normalized = value.trim().replace(/,/g, "");
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function AdminProductForm({ mode, product }: ProductFormProps) {
  const router = useRouter();
  const { showToast } = useToast();

  const [form, setForm] = useState<FormState>(() => getInitialState(product));
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [categories, setCategories] = useState<FirebaseCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  useEffect(() => {
    setForm(getInitialState(product));
    setImageFailed(false);
  }, [product]);

  useEffect(() => {
    const unsubscribe = subscribeToFirebaseCategories(
      (items) => {
        setCategories(items);
        setCategoriesLoading(false);
      },
      (error) => {
        console.error("Unable to load categories:", error);
        setCategoriesLoading(false);
        showToast("Unable to load live categories.", "error");
      },
    );

    return unsubscribe;
  }, [showToast]);

  const isEditing = mode === "edit";

  const activeCategories = useMemo(
    () => categories.filter((category) => category.active),
    [categories],
  );

  const selectableCategories = useMemo(() => {
    if (
      form.category &&
      !activeCategories.some((category) => category.id === form.category)
    ) {
      const current = categories.find((category) => category.id === form.category);
      return current ? [current, ...activeCategories] : activeCategories;
    }

    return activeCategories;
  }, [activeCategories, categories, form.category]);

  const selectedCategoryName = useMemo(
    () =>
      categories.find((category) => category.id === form.category)?.name ??
      "Select category",
    [categories, form.category],
  );

  const updateField = <K extends keyof FormState>(
    key: K,
    value: FormState[K],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const validate = (): string | null => {
    const mrp = parseNumber(form.mrp);
    const price = parseNumber(form.price);
    const stock = parseNumber(form.stock);

    if (!form.name.trim()) return "Please enter the product name.";
    if (!form.category) return "Please select a category.";
    if (!form.size.trim()) return "Please enter product size or quantity.";
    if (mrp === null || mrp <= 0) return "MRP must be greater than zero.";
    if (price === null || price < 0) return "Selling price must be zero or greater.";
    if (price > mrp) return "Selling price cannot be greater than MRP.";
    if (stock === null || stock < 0 || !Number.isInteger(stock)) {
      return "Stock must be a whole number of zero or greater.";
    }

    return null;
  };

  const handleImageUpload = async () => {
    if (uploadingImage) return;

    try {
      setUploadingImage(true);

      const productKey =
        product?.id ||
        form.name.trim() ||
        `new-product-${Date.now().toString(36)}`;

      const uploaded = await pickAndUploadProductImage(productKey);
      if (!uploaded) return;

      updateField("image", uploaded.url);
      setImageFailed(false);
      showToast("Product image uploaded successfully.", "success");
    } catch (error) {
      console.error("Product image upload failed:", error);
      showToast(
        error instanceof Error
          ? error.message
          : "Unable to upload product image.",
        "error",
      );
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async () => {
    if (saving || uploadingImage || checkingDuplicate) return;

    const validationMessage = validate();
    if (validationMessage) {
      showToast(validationMessage, "error");
      return;
    }

    const identityChanged =
      !isEditing ||
      form.name.trim().toLowerCase() !==
        String(product?.name ?? "").trim().toLowerCase() ||
      form.size.trim().toLowerCase() !==
        String(product?.size ?? "").trim().toLowerCase();

    if (identityChanged) {
      try {
        setCheckingDuplicate(true);

        const duplicateCheck = await checkProductDuplicate(
          form.name.trim(),
          form.size.trim(),
          form.category,
          product?.id,
        );

        if (duplicateCheck.duplicate) {
          showToast(
            "This product already exists with the same name and size.",
            "error",
          );
          return;
        }
      } catch (error) {
        console.error("Duplicate product check failed:", error);
        showToast(
          "Unable to verify duplicate product. Please try again.",
          "error",
        );
        return;
      } finally {
        setCheckingDuplicate(false);
      }
    }

    const user = auth.currentUser;
    if (!user) {
      showToast("Admin session expired. Please login again.", "error");
      router.replace("/admin/login");
      return;
    }

    const productId = product?.id ?? createProductId(form.name);
    setSaving(true);

    try {
      await setDoc(
        doc(db, "products", productId),
        {
          id: productId,
          name: form.name.trim(),
          category: form.category,
          size: form.size.trim(),
          mrp: parseNumber(form.mrp)!,
          price: parseNumber(form.price)!,
          stock: parseNumber(form.stock)!,
          image: form.image.trim(),
          description: form.description.trim(),
          isFeatured: form.isFeatured,
          isPopular: form.isPopular,
          isBestOffer: form.isBestOffer,
          isActive: true,
          updatedAt: serverTimestamp(),
          updatedBy: user.uid,
          ...(isEditing
            ? {}
            : {
                createdAt: serverTimestamp(),
                createdBy: user.uid,
              }),
        },
        { merge: isEditing },
      );

      showToast(
        isEditing
          ? "Product updated successfully."
          : "Product added successfully.",
        "success",
      );
      router.replace("/admin/products");
    } catch (error) {
      console.error("Product save failed:", error);
      showToast(
        "Unable to save product. Check admin login and Firestore rules.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>

          <View style={styles.headerContent}>
            <Text style={styles.title}>{isEditing ? "Edit Product" : "Add Product"}</Text>
            <Text style={styles.subtitle}>
              {isEditing ? "Update live product details" : "Create a new store product"}
            </Text>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={true}
        >
          <Section title="Basic Information" icon="cube-outline">
            <FormField
              label="Product Name"
              value={form.name}
              placeholder="Example: Amul Butter"
              onChangeText={(value) => updateField("name", value)}
            />

            <FormField
              label="Size / Quantity"
              value={form.size}
              placeholder="Example: 500 g, 1 L"
              onChangeText={(value) => updateField("size", value)}
            />

            <Text style={styles.fieldLabel}>Category</Text>
            <View style={styles.categorySummary}>
              <Ionicons name="grid-outline" size={18} color={COLORS.primary} />
              <Text style={styles.categorySummaryText}>{selectedCategoryName}</Text>
            </View>

            {categoriesLoading ? (
              <Text style={styles.helperText}>Loading live categories...</Text>
            ) : selectableCategories.length === 0 ? (
              <Text style={styles.helperText}>
                No active categories available. Create or activate a category first.
              </Text>
            ) : (
              <View style={styles.categoryGrid}>
                {selectableCategories.map((category) => {
                  const active = form.category === category.id;

                  return (
                    <TouchableOpacity
                      key={category.id}
                      style={[styles.categoryChip, active && styles.categoryChipActive]}
                      onPress={() => updateField("category", category.id)}
                    >
                      <Text
                        style={[
                          styles.categoryChipText,
                          active && styles.categoryChipTextActive,
                        ]}
                      >
                        {category.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            <FormField
              label="Description (optional)"
              value={form.description}
              placeholder="Describe the product"
              onChangeText={(value) => updateField("description", value)}
              multiline
            />
          </Section>

          <Section title="Price & Inventory" icon="cash-outline">
            <View style={styles.twoColumnRow}>
              <View style={styles.column}>
                <FormField
                  label="MRP (₹)"
                  value={form.mrp}
                  placeholder="0"
                  keyboardType="decimal-pad"
                  onChangeText={(value) => updateField("mrp", value)}
                />
              </View>

              <View style={styles.column}>
                <FormField
                  label="Selling Price (₹)"
                  value={form.price}
                  placeholder="0"
                  keyboardType="decimal-pad"
                  onChangeText={(value) => updateField("price", value)}
                />
              </View>
            </View>

            <FormField
              label="Available Stock"
              value={form.stock}
              placeholder="0"
              keyboardType="number-pad"
              onChangeText={(value) => updateField("stock", value)}
            />

            <Text style={styles.helperText}>
              Set stock to 0 to show this product as out of stock.
            </Text>
          </Section>

          <Section title="Product Image" icon="image-outline">
            <TouchableOpacity
              style={[styles.uploadButton, uploadingImage && styles.uploadButtonDisabled]}
              onPress={() => void handleImageUpload()}
              disabled={uploadingImage}
              activeOpacity={0.85}
            >
              <Ionicons
                name={uploadingImage ? "hourglass-outline" : "cloud-upload-outline"}
                size={20}
                color={COLORS.textOnPrimary}
              />
              <Text style={styles.uploadButtonText}>
                {uploadingImage
                  ? "Uploading Image..."
                  : form.image.trim()
                    ? "Change Product Image"
                    : "Upload Product Image"}
              </Text>
            </TouchableOpacity>

            <Text style={styles.helperText}>
              Choose an image from this computer/phone. Maximum size: 5 MB.
            </Text>

            <FormField
              label="Image URL (optional alternative)"
              value={form.image}
              placeholder="https://example.com/product.jpg"
              keyboardType="url"
              autoCapitalize="none"
              onChangeText={(value) => {
                updateField("image", value);
                setImageFailed(false);
              }}
            />

            {form.image.trim() ? (
              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={() => {
                  updateField("image", "");
                  setImageFailed(false);
                }}
              >
                <Ionicons name="trash-outline" size={17} color="#DC2626" />
                <Text style={styles.removeImageText}>Remove image from product</Text>
              </TouchableOpacity>
            ) : null}

            <View style={styles.previewCard}>
              {form.image.trim() && !imageFailed ? (
                <Image
                  source={{ uri: form.image.trim() }}
                  style={styles.previewImage}
                  resizeMode="contain"
                  onError={() => setImageFailed(true)}
                />
              ) : (
                <View style={styles.previewFallback}>
                  <Ionicons name="image-outline" size={40} color={COLORS.textMuted} />
                  <Text style={styles.previewFallbackText}>
                    {imageFailed ? "Unable to preview image" : "Image preview"}
                  </Text>
                </View>
              )}
            </View>
          </Section>

          <Section title="Product Visibility" icon="options-outline">
            <ToggleRow
              title="Featured Product"
              description="Show prominently on the home screen"
              value={form.isFeatured}
              onValueChange={(value) => updateField("isFeatured", value)}
            />
            <View style={styles.toggleDivider} />
            <ToggleRow
              title="Popular Product"
              description="Include in popular product sections"
              value={form.isPopular}
              onValueChange={(value) => updateField("isPopular", value)}
            />
            <View style={styles.toggleDivider} />
            <ToggleRow
              title="Best Offer"
              description="Highlight this product as a special offer"
              value={form.isBestOffer}
              onValueChange={(value) => updateField("isBestOffer", value)}
            />
          </Section>

          <Button
            label={checkingDuplicate ? "Checking Duplicate…" : saving ? "Saving Product…" : isEditing ? "Save Changes" : "Add Product"}
            onPress={handleSubmit}
            loading={saving || checkingDuplicate}
            disabled={saving || uploadingImage || checkingDuplicate}
            size="lg"
            fullWidth
            leftIcon={
              !saving ? (
                <Ionicons
                  name={isEditing ? "save-outline" : "add-circle-outline"}
                  size={20}
                  color={COLORS.textOnPrimary}
                />
              ) : undefined
            }
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIcon}>
          <Ionicons name={icon} size={19} color={COLORS.primary} />
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );
}

function FormField({
  label,
  multiline,
  ...inputProps
}: React.ComponentProps<typeof TextInput> & {
  label: string;
  multiline?: boolean;
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        {...inputProps}
        multiline={multiline}
        placeholderTextColor={COLORS.textMuted}
        style={[styles.input, multiline && styles.textArea, inputProps.style]}
      />
    </View>
  );
}

function ToggleRow({
  title,
  description,
  value,
  onValueChange,
}: {
  title: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleContent}>
        <Text style={styles.toggleTitle}>{title}</Text>
        <Text style={styles.toggleDescription}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: COLORS.borderLight, true: COLORS.primaryLight }}
        thumbColor={value ? COLORS.primary : COLORS.textMuted}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollView: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  headerButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surface,
  },
  headerContent: { flex: 1 },
  title: {
    fontSize: FONT.size.lg,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },
  subtitle: {
    marginTop: 2,
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: 60,
    gap: SPACING.lg,
  },
  section: {
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.background,
    ...SHADOW.card,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primaryLight,
  },
  sectionTitle: {
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },
  sectionContent: { padding: SPACING.md, gap: SPACING.md },
  fieldGroup: { gap: SPACING.sm },
  fieldLabel: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.semibold,
    color: COLORS.textPrimary,
  },
  input: {
    minHeight: 50,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    fontSize: FONT.size.base,
    color: COLORS.textPrimary,
  },
  textArea: {
    minHeight: 112,
    paddingTop: SPACING.md,
    textAlignVertical: "top",
  },
  twoColumnRow: { flexDirection: "row", gap: SPACING.md },
  column: { flex: 1 },
  helperText: {
    marginTop: -4,
    fontSize: FONT.size.xs,
    lineHeight: 18,
    color: COLORS.textSecondary,
  },
  categorySummary: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primaryLight,
  },
  categorySummaryText: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.bold,
    color: COLORS.primary,
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
  },
  categoryChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 9,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    backgroundColor: COLORS.surface,
  },
  categoryChipActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  categoryChipText: {
    fontSize: FONT.size.xs,
    fontWeight: FONT.weight.semibold,
    color: COLORS.textPrimary,
  },
  categoryChipTextActive: { color: COLORS.textOnPrimary },
  uploadButton: {
    minHeight: 52,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
  },
  uploadButtonDisabled: { opacity: 0.6 },
  uploadButtonText: {
    color: COLORS.textOnPrimary,
    fontWeight: FONT.weight.bold,
    fontSize: FONT.size.sm,
  },
  removeImageButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingVertical: 8,
  },
  removeImageText: {
    color: "#DC2626",
    fontWeight: FONT.weight.semibold,
    fontSize: FONT.size.xs,
  },
  previewCard: {
    height: 190,
    overflow: "hidden",
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    backgroundColor: COLORS.surface,
  },
  previewImage: { width: "100%", height: "100%" },
  previewFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  previewFallbackText: {
    marginTop: SPACING.sm,
    fontSize: FONT.size.xs,
    color: COLORS.textMuted,
  },
  toggleRow: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
  },
  toggleContent: { flex: 1 },
  toggleTitle: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },
  toggleDescription: {
    marginTop: 3,
    fontSize: FONT.size.xs,
    lineHeight: 17,
    color: COLORS.textSecondary,
  },
  toggleDivider: { height: 1, backgroundColor: COLORS.borderLight },
});