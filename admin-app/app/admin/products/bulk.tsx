import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
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
  pickAndUploadProductImage,
  pickGalleryAndUploadProductImage,
  takeAndUploadProductImage,
  uploadProductImageFromAsset,
  type UploadedProductImage,
} from "@/src/services/firebaseProductImages";
import {
  bulkImportProducts,
  createProductFingerprint,
  getProductDuplicateIndex,
  updateProductImage,
  type BulkImportMode,
  type BulkProductInput,
} from "@/src/services/firebaseProducts";

import type { Product } from "@/src/types";

type PreviewRow = {
  rowNumber: number;
  product: BulkProductInput | null;
  imageFile: string;
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
  "imageFile",
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
  const imageFile = text(value(raw, "imageFile"));

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
      imageFile,
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
    imageFile,
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
  const [productsImported, setProductsImported] = useState(false);
  const [mode, setMode] = useState<BulkImportMode>("skip-existing");
  const [uploadingRows, setUploadingRows] = useState<
    Record<number, boolean>
  >({});

  const anyRowUploading = useMemo(
    () => Object.values(uploadingRows).some(Boolean),
    [uploadingRows],
  );

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

  const downloadTemplate = async () => {
    try {
      const sample = [
        {
          id: "amul-butter-100g",
          name: "Amul Butter",
          category: "dairy",
          size: "100 g",
          mrp: 60,
          price: 58,
          stock: 25,
          imageFile: "",
          image: "",
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

      const templateFileName = "raha-products-import-template.xlsx";

      if (Platform.OS === "web") {
        // Browser download.
        XLSX.writeFile(workbook, templateFileName);
        return;
      }

      // Native (Android/iOS): XLSX.writeFile relies on the browser DOM and
      // crashes on native. Write a base64 file with expo-file-system, then
      // open the native share/save sheet.
      const base64 = XLSX.write(workbook, {
        type: "base64",
        bookType: "xlsx",
      });

      const FileSystem = await import("expo-file-system/legacy");
      const Sharing = await import("expo-sharing");

      const fileUri = `${FileSystem.cacheDirectory}${templateFileName}`;

      await FileSystem.writeAsStringAsync(fileUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          dialogTitle: "Save products import template",
          UTI: "org.openxmlformats.spreadsheetml.sheet",
        });
      } else {
        showMessage(
          "Template saved",
          `The template was created at:\n${fileUri}`,
        );
      }
    } catch (error) {
      console.error("Template download failed:", error);
      showMessage(
        "Unable to create template",
        error instanceof Error
          ? error.message
          : "Please try again.",
      );
    }
  };

  const applyUploadedImageToRow = (
    rowNumber: number,
    uploaded: UploadedProductImage,
  ) => {
    setRows((previous) =>
      previous.map((row) =>
        row.rowNumber === rowNumber && row.product
          ? {
              ...row,
              product: { ...row.product, image: uploaded.url },
            }
          : row,
      ),
    );
  };

  const uploadForRow = async (
    row: PreviewRow,
    picker: (
      productKey: string,
    ) => Promise<UploadedProductImage | null>,
  ) => {
    if (!row.product) return;

    const productKey = row.product.id || row.product.name;

    setUploadingRows((previous) => ({
      ...previous,
      [row.rowNumber]: true,
    }));

    try {
      const uploaded = await picker(productKey);
      if (!uploaded) return;

      applyUploadedImageToRow(row.rowNumber, uploaded);

      if (productsImported) {
        await updateProductImage(row.product.id, uploaded.url);
      }

      showToast(
        productsImported
          ? "Image uploaded and saved."
          : "Image uploaded. It will be saved with product import.",
        "success",
      );
    } catch (error) {
      console.error("Row image upload failed:", error);
      showMessage(
        "Image upload failed",
        error instanceof Error
          ? error.message
          : "Unable to upload the image.",
      );
    } finally {
      setUploadingRows((previous) => {
        const next = { ...previous };
        delete next[row.rowNumber];
        return next;
      });
    }
  };

  const handleAttachImage = (row: PreviewRow) => {
    if (!row.product || uploadingRows[row.rowNumber]) return;

    if (Platform.OS === "web") {
      // Web/laptop: choose a local image file from the computer.
      void uploadForRow(row, pickAndUploadProductImage);
      return;
    }

    // Android/iOS: offer Gallery or Camera.
    Alert.alert(
      "Add product image",
      "Choose an image source",
      [
        {
          text: "Choose from Gallery",
          onPress: () =>
            void uploadForRow(row, pickGalleryAndUploadProductImage),
        },
        {
          text: "Take Photo",
          onPress: () =>
            void uploadForRow(row, takeAndUploadProductImage),
        },
        { text: "Cancel", style: "cancel" },
      ],
      { cancelable: true },
    );
  };

  const normalizeImageFileName = (fileNameToNormalize: string) =>
    fileNameToNormalize
      .replace(/\\/g, "/")
      .split("/")
      .pop()
      ?.trim()
      .toLowerCase() || "";

  const stripExtension = (value: string) =>
    value.replace(/\.[^.]+$/, "");

  const normalizeSmartText = (value: string) =>
    String(value ?? "")
      .normalize("NFKC")
      .toLowerCase()
      .replace(/\bkilograms?\b/g, "kg")
      .replace(/\bkgs?\b/g, "kg")
      .replace(/\bgrams?\b/g, "g")
      .replace(/\bgms?\b/g, "g")
      .replace(/\bmillilit(?:er|re)s?\b/g, "ml")
      .replace(/\blit(?:er|re)s?\b/g, "l")
      .replace(/[^\p{L}\p{N}]+/gu, "");

  const normalizedSizeVariants = (size: string) => {
    const compact = String(size ?? "")
      .normalize("NFKC")
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/kilograms?/g, "kg")
      .replace(/kgs?/g, "kg")
      .replace(/grams?/g, "g")
      .replace(/gms?/g, "g")
      .replace(/millilit(?:er|re)s?/g, "ml")
      .replace(/lit(?:er|re)s?/g, "l");

    const match = compact.match(/(\d+(?:\.\d+)?)(kg|g|ml|l)/);

    if (!match) {
      const fallback = normalizeSmartText(size);
      return fallback ? [fallback] : [];
    }

    const amount = Number(match[1]);
    const unit = match[2];
    const variants = new Set<string>();

    variants.add(normalizeSmartText(`${amount}${unit}`));

    if (unit === "kg") {
      variants.add(normalizeSmartText(`${amount * 1000}g`));
    } else if (unit === "l") {
      variants.add(normalizeSmartText(`${amount * 1000}ml`));
    } else if (unit === "g" && amount >= 1000) {
      variants.add(normalizeSmartText(`${amount / 1000}kg`));
    } else if (unit === "ml" && amount >= 1000) {
      variants.add(normalizeSmartText(`${amount / 1000}l`));
    }

    return [...variants].filter(Boolean);
  };

  const diceSimilarity = (leftValue: string, rightValue: string) => {
    const left = normalizeSmartText(leftValue);
    const right = normalizeSmartText(rightValue);

    if (!left || !right) return 0;
    if (left === right) return 1;

    if (left.includes(right) || right.includes(left)) {
      return Math.min(left.length, right.length) /
        Math.max(left.length, right.length);
    }

    if (left.length < 2 || right.length < 2) return 0;

    const pairs = (value: string) => {
      const map = new Map<string, number>();

      for (let index = 0; index < value.length - 1; index += 1) {
        const pair = value.slice(index, index + 2);
        map.set(pair, (map.get(pair) || 0) + 1);
      }

      return map;
    };

    const leftPairs = pairs(left);
    const rightPairs = pairs(right);

    let intersection = 0;
    let leftCount = 0;
    let rightCount = 0;

    for (const count of leftPairs.values()) leftCount += count;
    for (const count of rightPairs.values()) rightCount += count;

    for (const [pair, count] of leftPairs) {
      intersection += Math.min(
        count,
        rightPairs.get(pair) || 0,
      );
    }

    return (2 * intersection) / (leftCount + rightCount);
  };

  const scorePhotoAgainstProduct = (
    searchText: string,
    row: PreviewRow,
  ) => {
    if (!row.product) return 0;

    const product = row.product;
    const normalizedSearch = normalizeSmartText(searchText);
    const nameKey = normalizeSmartText(product.name);
    const idKey = normalizeSmartText(product.id || "");
    const explicitFileKey = normalizeSmartText(
      stripExtension(normalizeImageFileName(row.imageFile)),
    );

    let score = 0;

    if (explicitFileKey && normalizedSearch === explicitFileKey) {
      return 1;
    }

    if (idKey && normalizedSearch === idKey) {
      return 0.99;
    }

    const nameSimilarity = diceSimilarity(
      normalizedSearch,
      nameKey,
    );

    score = nameSimilarity * 0.82;

    if (
      nameKey.length >= 4 &&
      normalizedSearch.includes(nameKey)
    ) {
      score = Math.max(score, 0.84);
    }

    const sizeVariants = normalizedSizeVariants(
      product.size || "",
    );

    if (
      sizeVariants.length > 0 &&
      sizeVariants.some((size) =>
        normalizedSearch.includes(size),
      )
    ) {
      score += 0.16;
    }

    return Math.min(score, 1);
  };

  const getBestUniqueMatch = (
    searchText: string,
    candidateRows: PreviewRow[],
    minimumScore: number,
  ) => {
    const scored = candidateRows
      .filter(
        (row) =>
          row.product &&
          row.errors.length === 0,
      )
      .map((row) => ({
        row,
        score: scorePhotoAgainstProduct(searchText, row),
      }))
      .sort((a, b) => b.score - a.score);

    const best = scored[0];
    const second = scored[1];

    if (!best || best.score < minimumScore) {
      return null;
    }

    // Never guess if two products are too close.
    if (
      second &&
      best.score - second.score < 0.10
    ) {
      return null;
    }

    return best;
  };

  const recognizePhotoText = async (uri: string) => {
    if (Platform.OS === "web") {
      return "";
    }

    try {
      const { recognizeText } = await import("expo-ocr-kit");
      const result = await recognizeText(uri);
      return result.text || "";
    } catch (error) {
      console.warn("OCR failed:", error);
      return "";
    }
  };

  const selectAndMatchProductImages = async () => {
    if (!productsImported) {
      showMessage(
        "Import products first",
        "Please complete product import first. Then upload all product photos together.",
      );
      return;
    }

    const validRows = rows.filter(
      (row) =>
        row.product &&
        row.errors.length === 0,
    );

    if (validRows.length === 0) {
      showMessage(
        "No valid products",
        "There are no valid product rows available for image matching.",
      );
      return;
    }

    try {
      const DocumentPicker = await import("expo-document-picker");

      const result = await DocumentPicker.getDocumentAsync({
        type: "image/*",
        copyToCacheDirectory: true,
        multiple: true,
      });

      if (result.canceled) return;

      const usedRows = new Set<number>();

      const matches: Array<{
        row: PreviewRow;
        asset: (typeof result.assets)[number];
        fileName: string;
        method: "filename" | "ocr";
      }> = [];

      const unresolved: Array<{
        asset: (typeof result.assets)[number];
        fileName: string;
      }> = [];

      // PASS 1: filename / product-name / ID / size matching.
      for (const asset of result.assets) {
        const browserName =
          Platform.OS === "web" &&
          asset.file instanceof File
            ? asset.file.name
            : "";

        const fileName =
          browserName ||
          asset.name ||
          asset.uri;

        const searchName = stripExtension(
          normalizeImageFileName(fileName),
        );

        const availableRows = validRows.filter(
          (row) => !usedRows.has(row.rowNumber),
        );

        const best = getBestUniqueMatch(
          searchName,
          availableRows,
          0.68,
        );

        if (best) {
          usedRows.add(best.row.rowNumber);
          matches.push({
            row: best.row,
            asset,
            fileName,
            method: "filename",
          });
        } else {
          unresolved.push({
            asset,
            fileName,
          });
        }
      }

      // PASS 2: native OCR fallback.
      // Reads product label/packet when filename was wrong or meaningless.
      for (const unresolvedPhoto of unresolved) {
        const availableRows = validRows.filter(
          (row) => !usedRows.has(row.rowNumber),
        );

        if (availableRows.length === 0) break;

        const detectedText = await recognizePhotoText(
          unresolvedPhoto.asset.uri,
        );

        if (!detectedText) continue;

        const best = getBestUniqueMatch(
          detectedText,
          availableRows,
          0.72,
        );

        if (!best) continue;

        usedRows.add(best.row.rowNumber);

        matches.push({
          row: best.row,
          asset: unresolvedPhoto.asset,
          fileName: unresolvedPhoto.fileName,
          method: "ocr",
        });
      }

      if (matches.length === 0) {
        showMessage(
          "No confident matches",
          Platform.OS === "web"
            ? "No safe filename/product-name matches were found. Products remain unchanged."
            : "No safe filename or OCR matches were found. Products remain unchanged.",
        );
        return;
      }

      setUploadingRows((previous) => {
        const next = { ...previous };

        for (const match of matches) {
          next[match.row.rowNumber] = true;
        }

        return next;
      });

      let uploadedCount = 0;
      let filenameCount = 0;
      let ocrCount = 0;
      const failedFiles: string[] = [];

      for (const match of matches) {
        if (!match.row.product) continue;

        try {
          const uploaded =
            await uploadProductImageFromAsset(
              match.row.product.id ||
                match.row.product.name,
              match.asset,
            );

          // Save the Storage URL directly against this product.
          await updateProductImage(
            match.row.product.id,
            uploaded.url,
          );

          applyUploadedImageToRow(
            match.row.rowNumber,
            uploaded,
          );

          uploadedCount += 1;

          if (match.method === "ocr") {
            ocrCount += 1;
          } else {
            filenameCount += 1;
          }
        } catch (error) {
          console.error(
            `Image upload/save failed for ${match.fileName}:`,
            error,
          );

          failedFiles.push(match.fileName);
        } finally {
          setUploadingRows((previous) => {
            const next = { ...previous };
            delete next[match.row.rowNumber];
            return next;
          });
        }
      }

      const productsWithoutPhoto =
        validRows.filter(
          (row) => !row.product?.image,
        ).length -
        uploadedCount;

      const unusedSelectedPhotos =
        result.assets.length -
        matches.length;

      showMessage(
        "Smart image matching complete",
        [
          `Uploaded & saved: ${uploadedCount}`,
          `Matched from filename/name/size: ${filenameCount}`,
          `Matched from photo text OCR: ${ocrCount}`,
          `Selected photos not confidently matched: ${Math.max(unusedSelectedPhotos, 0)}`,
          `Products left without photo: ${Math.max(productsWithoutPhoto, 0)}`,
          `Failed uploads: ${failedFiles.length}`,
          Platform.OS === "web"
            ? "OCR fallback runs in the Android app; browser uses smart filename/name/size matching."
            : "",
        ]
          .filter(Boolean)
          .join("\n"),
      );
    } catch (error) {
      console.error(
        "Smart bulk image matching failed:",
        error,
      );

      showMessage(
        "Unable to process product images",
        error instanceof Error
          ? error.message
          : "Please try again.",
      );
    }
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

      setProductsImported(false);
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
    if (anyRowUploading) {
      showMessage(
        "Please wait",
        "An image is still uploading. Please wait for it to finish.",
      );
      return;
    }

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
      if (stats.valid > 0 && mode === "skip-existing") {
        setProductsImported(true);

        showMessage(
          "No new products to add",
          "All valid rows already exist. Existing products were left unchanged. You can continue to Step 4 and upload product photos.",
        );
        return;
      }

      showMessage(
        "Nothing to import",
        "There are no valid product rows.",
      );
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

      setProductsImported(true);

      showMessage(
        "Bulk import complete",
        `Created: ${result.created}\nUpdated: ${result.updated}\nSkipped: ${result.skipped}\n\nProducts are ready. Continue to Step 4 to upload photos.`,
      );
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
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.replace("/admin/products")}
        >
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
                Optional: Product ID, MRP, Size, imageFile, Image URL,
                Description and flags. imageFile is optional; normally photos
                are matched automatically using product name and size. If MRP is blank,
                Selling Price is used as MRP. Duplicate products
                are blocked using Product ID and Name + Size + Category.
              </Text>

              <TouchableOpacity style={styles.secondaryButton} onPress={() => void downloadTemplate()}>
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
                    disabled={
                      importing ||
                      anyRowUploading ||
                      stats.valid === 0 ||
                      productsImported
                    }
                  >
                    <Ionicons name="cloud-upload-outline" size={21} color={COLORS.textOnPrimary} />
                    <Text style={styles.primaryButtonText}>
                      {importing
                        ? "Importing..."
                        : productsImported
                          ? "Products Imported"
                          : mode === "skip-existing" && stats.newItems === 0
                            ? "Continue With Existing Products"
                            : `Import ${
                                mode === "skip-existing"
                                  ? stats.newItems
                                  : stats.valid
                              } Products`}
                    </Text>
                  </TouchableOpacity>
                  {anyRowUploading ? (
                    <Text style={styles.helpText}>
                      Waiting for image upload to finish…
                    </Text>
                  ) : null}
                </View>

                {productsImported ? (
                  <View style={styles.actionCard}>
                    <Text style={styles.sectionTitle}>
                      4. Upload Product Photos
                    </Text>

                    <Text style={styles.helpText}>
                      Select all product photos together. The system first
                      matches Product ID, Product Name and Size from filenames.
                      On Android, photos that still cannot be identified are
                      checked using OCR text printed on the product pack.
                      Missing photos are allowed and stay blank without error.
                    </Text>

                    <TouchableOpacity
                      style={[
                        styles.secondaryButton,
                        anyRowUploading && styles.disabled,
                      ]}
                      onPress={() =>
                        void selectAndMatchProductImages()
                      }
                      disabled={anyRowUploading}
                    >
                      <Ionicons
                        name="images-outline"
                        size={19}
                        color={COLORS.primary}
                      />
                      <Text style={styles.secondaryButtonText}>
                        {anyRowUploading
                          ? "Processing Product Photos..."
                          : "Select All Product Photos"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : null}

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

            {item.product && item.errors.length === 0 ? (
              <View style={styles.imageRow}>
                {item.product.image ? (
                  <Image
                    source={{ uri: item.product.image }}
                    style={styles.imageThumb}
                    contentFit="cover"
                    transition={150}
                  />
                ) : (
                  <View style={[styles.imageThumb, styles.imagePlaceholder]}>
                    <Ionicons
                      name="image-outline"
                      size={22}
                      color={COLORS.textMuted}
                    />
                  </View>
                )}

                <TouchableOpacity
                  style={styles.imageButton}
                  onPress={() => handleAttachImage(item)}
                  disabled={Boolean(uploadingRows[item.rowNumber])}
                >
                  {uploadingRows[item.rowNumber] ? (
                    <ActivityIndicator size="small" color={COLORS.primary} />
                  ) : (
                    <>
                      <Ionicons
                        name={
                          item.product.image
                            ? "sync-outline"
                            : "camera-outline"
                        }
                        size={17}
                        color={COLORS.primary}
                      />
                      <Text style={styles.imageButtonText}>
                        {item.product.image ? "Change Image" : "Add Image"}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
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
  imageRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
  },
  imageThumb: {
    width: 54,
    height: 54,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  imagePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  imageButton: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  imageButtonText: { color: COLORS.primary, fontWeight: "800" },
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
