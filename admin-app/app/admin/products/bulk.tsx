import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as XLSX from "xlsx";

import { useToast } from "@/src/components/Toast";
import {
  COLORS,
  FONT,
  RADIUS,
  SHADOW,
  SPACING,
} from "@/src/config/theme";
import {
  bulkImportProducts,
  createProductFingerprint,
  getProductDuplicateIndex,
  type BulkImportMode,
  type BulkProductInput,
} from "@/src/services/firebaseProducts";

import type { Product } from "@/src/types";

type PreviewRow = {
  rowNumber: number;
  product: BulkProductInput | null;
  errors: string[];
  existing: boolean;
  duplicate: boolean;
  duplicateReason?: string;
};

const TEMPLATE_HEADERS = [
  "id",
  "name",
  "category",
  "size",
  "mrp",
  "price",
  "stock",
  "image",
  "description",
  "isFeatured",
  "isPopular",
  "isBestOffer",
  "isActive",
];

function value(row: Record<string, unknown>, key: string): unknown {
  const foundKey = Object.keys(row).find(
    (item) => item.trim().toLowerCase() === key.toLowerCase(),
  );
  return foundKey ? row[foundKey] : undefined;
}

function text(valueToRead: unknown): string {
  return valueToRead == null ? "" : String(valueToRead).trim();
}

function numberValue(valueToRead: unknown): number | null {
  const cleaned = text(valueToRead).replace(/,/g, "");
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function booleanValue(valueToRead: unknown, fallback = false): boolean {
  if (typeof valueToRead === "boolean") return valueToRead;
  const normalized = text(valueToRead).toLowerCase();

  if (["true", "yes", "y", "1"].includes(normalized)) return true;
  if (["false", "no", "n", "0"].includes(normalized)) return false;

  return fallback;
}

function createId(name: string, size: string): string {
  const raw = `${name}-${size}`
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);

  return raw || `product-${Date.now().toString(36)}`;
}

function parseRow(
  raw: Record<string, unknown>,
  rowNumber: number,
  existingIds: Set<string>,
  existingFingerprints: Set<string>,
  uploadIds: Set<string>,
  uploadFingerprints: Set<string>,
): PreviewRow {
  const errors: string[] = [];

  const name = text(value(raw, "name"));
  const category = text(value(raw, "category"));
  const size = text(value(raw, "size"));
  const rawMrp = numberValue(value(raw, "mrp"));
  const price = numberValue(value(raw, "price"));
  const stock = numberValue(value(raw, "stock"));

  if (!name) errors.push("Product name is required");
  if (!category) errors.push("Category ID is required");
  if (price === null || price < 0) errors.push("Selling price is required and must be a valid number");
  if (stock === null || stock < 0) errors.push("Stock is required and must be a valid number");

  const mrp = rawMrp === null ? price : rawMrp;

  if (rawMrp !== null && rawMrp < 0) {
    errors.push("MRP must be a valid number when provided");
  }

  if (mrp !== null && price !== null && price > mrp) {
    errors.push("Selling price cannot be greater than MRP");
  }

  const suppliedId = text(value(raw, "id"));
  const id = suppliedId || createId(name, size);
  const fingerprint = createProductFingerprint(name, size, category);

  if (!id) errors.push("Unable to create product ID");

  const existingById = existingIds.has(id);
  const existingByFingerprint = existingFingerprints.has(fingerprint);
  const duplicateInsideFile =
    uploadIds.has(id) || uploadFingerprints.has(fingerprint);

  const existing = existingById || existingByFingerprint;
  const duplicate = existing || duplicateInsideFile;

  let duplicateReason = "";

  if (duplicateInsideFile) {
    duplicateReason = "Duplicate row inside uploaded file";
  } else if (existingById && existingByFingerprint) {
    duplicateReason = "Product already exists";
  } else if (existingById) {
    duplicateReason = "Product ID already exists";
  } else if (existingByFingerprint) {
    duplicateReason = "Same product already exists (name + size + category)";
  }

  if (errors.length > 0 || price === null || stock === null || mrp === null) {
    return {
      rowNumber,
      product: null,
      errors,
      existing,
      duplicate,
      duplicateReason,
    };
  }

  uploadIds.add(id);
  uploadFingerprints.add(fingerprint);

  return {
    rowNumber,
    existing,
    duplicate,
    duplicateReason,
    errors: [],
    product: {
      id,
      name,
      category: category as Product["category"],
      size,
      mrp,
      price,
      stock: Math.floor(stock),
      image: text(value(raw, "image")),
      description: text(value(raw, "description")),
      isFeatured: booleanValue(value(raw, "isFeatured")),
      isPopular: booleanValue(value(raw, "isPopular")),
      isBestOffer: booleanValue(value(raw, "isBestOffer")),
      isActive: booleanValue(value(raw, "isActive"), true),
    },
  };
}

function showMessage(title: string, message: string) {
  if (Platform.OS === "web") {
    window.alert(`${title}\n\n${message}`);
    return;
  }
  Alert.alert(title, message);
}

export default function BulkProductImportScreen() {
  const router = useRouter();
  const { showToast } = useToast();

  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [reading, setReading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [mode, setMode] = useState<BulkImportMode>("skip-existing");

  const stats = useMemo(() => {
    const structurallyValid = rows.filter(
      (item) => item.product && item.errors.length === 0,
    );
    const invalid = rows.filter((item) => item.errors.length > 0);
    const duplicates = structurallyValid.filter((item) => item.duplicate);
    const newItems = structurallyValid.filter((item) => !item.duplicate);

    return {
      total: rows.length,
      valid: structurallyValid.length,
      invalid: invalid.length,
      duplicates: duplicates.length,
      existing: duplicates.filter((item) => item.existing).length,
      newItems: newItems.length,
    };
  }, [rows]);

  const downloadTemplate = () => {
    const sample = [
      {
        id: "amul-butter-100g",
        name: "Amul Butter",
        category: "dairy",
        size: "100 g",
        mrp: 60,
        price: 58,
        stock: 25,
        image: "https://example.com/amul-butter.jpg",
        description: "Creamy salted butter",
        isFeatured: true,
        isPopular: true,
        isBestOffer: false,
        isActive: true,
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sample, {
      header: TEMPLATE_HEADERS,
    });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Products");
    XLSX.writeFile(workbook, "raha-products-import-template.xlsx");
  };

  const chooseFile = async () => {
    try {
      setReading(true);

      const DocumentPicker = await import("expo-document-picker");

      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "text/csv",
          "application/vnd.ms-excel",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled) return;

      const asset = result.assets[0];
      setFileName(asset.name);

      let arrayBuffer: ArrayBuffer;

      if (Platform.OS === "web" && asset.file) {
        arrayBuffer = await asset.file.arrayBuffer();
      } else {
        const response = await fetch(asset.uri);
        arrayBuffer = await response.arrayBuffer();
      }

      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];

      if (!firstSheetName) {
        throw new Error("No worksheet found in this file.");
      }

      const sheet = workbook.Sheets[firstSheetName];
      const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        defval: "",
      });

      if (rawRows.length === 0) {
        throw new Error("The selected file has no product rows.");
      }

      const duplicateIndex = await getProductDuplicateIndex();
      const uploadIds = new Set<string>();
      const uploadFingerprints = new Set<string>();

      const parsed = rawRows.map((row, index) =>
        parseRow(
          row,
          index + 2,
          duplicateIndex.ids,
          duplicateIndex.fingerprints,
          uploadIds,
          uploadFingerprints,
        ),
      );

      setRows(parsed);
      showToast(`${parsed.length} rows loaded for preview.`, "success");
    } catch (error) {
      console.error("Bulk file read failed:", error);
      showMessage(
        "Unable to read file",
        error instanceof Error ? error.message : "Please check the Excel/CSV file.",
      );
    } finally {
      setReading(false);
    }
  };

  const runImport = async () => {
    const importableRows = rows.filter((item) => {
      if (!item.product || item.errors.length > 0) return false;

      if (mode === "skip-existing") {
        return !item.duplicate;
      }

      // Upsert may update an existing product, but never import a duplicate
      // row from the same uploaded file.
      return item.duplicateReason !== "Duplicate row inside uploaded file";
    });

    const validProducts = importableRows.map(
      (item) => item.product as BulkProductInput,
    );

    if (validProducts.length === 0) {
      showMessage("Nothing to import", "There are no valid product rows.");
      return;
    }

    const confirmed =
      Platform.OS === "web"
        ? window.confirm(
            `Import ${validProducts.length} valid products?\n\nMode: ${
              mode === "upsert" ? "Add new + update existing" : "Skip existing"
            }`,
          )
        : true;

    if (!confirmed) return;

    try {
      setImporting(true);
      const result = await bulkImportProducts(validProducts, mode);

      showMessage(
        "Bulk import complete",
        `Created: ${result.created}\nUpdated: ${result.updated}\nSkipped: ${result.skipped}`,
      );

      router.replace("/admin/products");
    } catch (error) {
      console.error("Bulk import failed:", error);
      showMessage(
        "Import failed",
        error instanceof Error ? error.message : "Unable to import products.",
      );
    } finally {
      setImporting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerText}>
          <Text style={styles.title}>Bulk Product Import</Text>
          <Text style={styles.subtitle}>Excel / CSV → preview → Firestore</Text>
        </View>
      </View>

      <FlatList
        data={rows}
        keyExtractor={(item) => String(item.rowNumber)}
        showsVerticalScrollIndicator={true}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <>
            <View style={styles.actionCard}>
              <Text style={styles.sectionTitle}>1. Download Template</Text>
              <Text style={styles.helpText}>
                Mandatory: Product Name, Category, Selling Price and Stock.
                Optional: Product ID, MRP, Size, Image, Description and flags.
                If MRP is blank, Selling Price is used as MRP. Duplicate products
                are blocked using Product ID and Name + Size + Category.
              </Text>

              <TouchableOpacity style={styles.secondaryButton} onPress={downloadTemplate}>
                <Ionicons name="download-outline" size={19} color={COLORS.primary} />
                <Text style={styles.secondaryButtonText}>Download Excel Template</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.actionCard}>
              <Text style={styles.sectionTitle}>2. Select Excel / CSV</Text>

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => void chooseFile()}
                disabled={reading}
              >
                <Ionicons name="document-attach-outline" size={20} color={COLORS.textOnPrimary} />
                <Text style={styles.primaryButtonText}>
                  {reading ? "Reading file..." : "Choose Excel / CSV File"}
                </Text>
              </TouchableOpacity>

              {fileName ? <Text style={styles.fileName}>Selected: {fileName}</Text> : null}
            </View>

            {rows.length > 0 ? (
              <>
                <View style={styles.statsRow}>
                  <Stat label="Rows" value={stats.total} />
                  <Stat label="Valid" value={stats.valid} />
                  <Stat label="Errors" value={stats.invalid} danger={stats.invalid > 0} />
                  <Stat label="Duplicates" value={stats.duplicates} danger={stats.duplicates > 0} />
                  <Stat label="Existing" value={stats.existing} />
                </View>

                <View style={styles.actionCard}>
                  <Text style={styles.sectionTitle}>3. Existing Product Behaviour</Text>

                  <View style={styles.modeRow}>
                    <ModeButton
                      active={mode === "upsert"}
                      label="Add + Update Existing"
                      onPress={() => setMode("upsert")}
                    />
                    <ModeButton
                      active={mode === "skip-existing"}
                      label="Skip Existing"
                      onPress={() => setMode("skip-existing")}
                    />
                  </View>

                  <Text style={styles.helpText}>
                    New: {stats.newItems} • Existing: {stats.existing}
                  </Text>

                  <TouchableOpacity
                    style={[styles.importButton, importing && styles.disabled]}
                    onPress={() => void runImport()}
                    disabled={importing || (mode === "skip-existing" ? stats.newItems === 0 : stats.valid === 0)}
                  >
                    <Ionicons name="cloud-upload-outline" size={21} color={COLORS.textOnPrimary} />
                    <Text style={styles.primaryButtonText}>
                      {importing ? "Importing..." : `Import ${mode === "skip-existing" ? stats.newItems : stats.valid} Products`}
                    </Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.previewTitle}>Preview</Text>
              </>
            ) : null}
          </>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="grid-outline" size={42} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>No file loaded yet</Text>
            <Text style={styles.helpText}>Choose an Excel or CSV file to preview products.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.rowCard, item.errors.length > 0 && styles.errorCard]}>
            <View style={styles.rowTop}>
              <Text style={styles.rowTitle}>
                Row {item.rowNumber}: {item.product?.name || "Invalid row"}
              </Text>
              {item.duplicate ? (
                <Text style={styles.existingBadge}>
                  {item.existing ? "DUPLICATE" : "DUPLICATE"}
                </Text>
              ) : (
                <Text style={styles.validBadge}>VALID</Text>
              )}
            </View>

            {item.product ? (
              <Text style={styles.rowMeta}>
                {item.product.id} • {item.product.category} • ₹{item.product.price} • Stock {item.product.stock}
              </Text>
            ) : null}

            {item.duplicateReason && item.errors.length === 0 ? (
              <Text style={styles.duplicateText}>• {item.duplicateReason}</Text>
            ) : null}

            {item.errors.map((error) => (
              <Text key={error} style={styles.errorText}>• {error}</Text>
            ))}
          </View>
        )}
      />
    </SafeAreaView>
  );
}

function Stat({
  label,
  value,
  danger = false,
}: {
  label: string;
  value: number;
  danger?: boolean;
}) {
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, danger && styles.dangerText]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ModeButton({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.modeButton, active && styles.modeButtonActive]}
      onPress={onPress}
    >
      <Text style={[styles.modeText, active && styles.modeTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    minHeight: 76,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surface,
  },
  headerText: { flex: 1 },
  title: { fontSize: FONT.size.xl, fontWeight: "900", color: COLORS.textPrimary },
  subtitle: { marginTop: 3, color: COLORS.textSecondary },
  content: { padding: SPACING.md, paddingBottom: 70 },
  actionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOW.card,
  },
  sectionTitle: { fontSize: FONT.size.md, fontWeight: "900", color: COLORS.textPrimary },
  helpText: { marginTop: 7, color: COLORS.textSecondary, lineHeight: 20 },
  primaryButton: {
    marginTop: SPACING.md,
    minHeight: 50,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  importButton: {
    marginTop: SPACING.md,
    minHeight: 52,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  disabled: { opacity: 0.55 },
  primaryButtonText: { color: COLORS.textOnPrimary, fontWeight: "900" },
  secondaryButton: {
    marginTop: SPACING.md,
    minHeight: 48,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: RADIUS.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  secondaryButtonText: { color: COLORS.primary, fontWeight: "900" },
  fileName: { marginTop: 10, color: COLORS.textPrimary, fontWeight: "700" },
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  statCard: {
    minWidth: 100,
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    alignItems: "center",
    ...SHADOW.card,
  },
  statValue: { fontSize: FONT.size.lg, fontWeight: "900", color: COLORS.primary },
  statLabel: { marginTop: 4, color: COLORS.textSecondary },
  dangerText: { color: "#DC2626" },
  modeRow: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm, marginTop: SPACING.md },
  modeButton: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 22,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  modeButtonActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  modeText: { color: COLORS.textPrimary, fontWeight: "800" },
  modeTextActive: { color: COLORS.textOnPrimary },
  previewTitle: {
    marginBottom: SPACING.sm,
    fontSize: FONT.size.md,
    fontWeight: "900",
    color: COLORS.textPrimary,
  },
  rowCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  errorCard: { borderColor: "#DC2626" },
  rowTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  rowTitle: { flex: 1, fontWeight: "900", color: COLORS.textPrimary },
  rowMeta: { marginTop: 6, color: COLORS.textSecondary },
  existingBadge: {
    color: "#B45309",
    fontSize: 11,
    fontWeight: "900",
  },
  validBadge: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: "900",
  },
  duplicateText: {
    marginTop: 5,
    color: "#B45309",
    fontWeight: "700",
  },
  errorText: { marginTop: 5, color: "#DC2626", fontWeight: "700" },
  empty: { minHeight: 220, alignItems: "center", justifyContent: "center" },
  emptyTitle: { marginTop: 10, fontWeight: "900", color: COLORS.textPrimary },
});
