import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  writeBatch,
  type DocumentData,
  type Unsubscribe,
} from "firebase/firestore";

import { db } from "@/src/config/firebase";
import { PRODUCTS } from "@/src/data/products";
import type { Product } from "@/src/types";

const PRODUCTS_COLLECTION = "products";

function safeNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function sanitizeProduct(product: Product): Product {
  return {
    id: String(product.id),
    name: String(product.name ?? "").trim(),
    category: product.category,
    size: String(product.size ?? "").trim(),
    mrp: Math.max(0, safeNumber(product.mrp)),
    price: Math.max(0, safeNumber(product.price)),
    stock: Math.max(0, Math.floor(safeNumber(product.stock))),
    image: typeof product.image === "string" ? product.image.trim() : "",
    description:
      typeof product.description === "string" ? product.description.trim() : "",
    isFeatured: Boolean(product.isFeatured),
    isBestOffer: Boolean(product.isBestOffer),
    isPopular: Boolean(product.isPopular),
  };
}

function documentToProduct(
  documentId: string,
  data: DocumentData,
): Product | null {
  if (
    !data ||
    typeof data.name !== "string" ||
    typeof data.category !== "string"
  ) {
    return null;
  }

  return sanitizeProduct({
    id: documentId,
    name: data.name,
    category: data.category as Product["category"],
    size: typeof data.size === "string" ? data.size : "",
    mrp: safeNumber(data.mrp),
    price: safeNumber(data.price),
    stock: safeNumber(data.stock),
    image: typeof data.image === "string" ? data.image : "",
    description: typeof data.description === "string" ? data.description : "",
    isFeatured: Boolean(data.isFeatured),
    isBestOffer: Boolean(data.isBestOffer),
    isPopular: Boolean(data.isPopular),
  });
}

function sortProducts(products: Product[]): Product[] {
  return [...products].sort((first, second) => {
    const firstPriority =
      Number(first.isFeatured) * 3 +
      Number(first.isPopular) * 2 +
      Number(first.isBestOffer);

    const secondPriority =
      Number(second.isFeatured) * 3 +
      Number(second.isPopular) * 2 +
      Number(second.isBestOffer);

    return secondPriority - firstPriority || first.name.localeCompare(second.name);
  });
}

export async function getFirebaseProducts(): Promise<Product[]> {
  const snapshot = await getDocs(collection(db, PRODUCTS_COLLECTION));

  const products = snapshot.docs
    .map((snapshotDocument) => {
      const data = snapshotDocument.data();

      if (data.isActive === false) {
        return null;
      }

      return documentToProduct(snapshotDocument.id, data);
    })
    .filter((product): product is Product => Boolean(product));

  return sortProducts(products);
}

export function subscribeToFirebaseProducts(
  onProducts: (products: Product[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    collection(db, PRODUCTS_COLLECTION),
    (snapshot) => {
      const products = snapshot.docs
        .map((snapshotDocument) => {
          const data = snapshotDocument.data();

          if (data.isActive === false) {
            return null;
          }

          return documentToProduct(snapshotDocument.id, data);
        })
        .filter((product): product is Product => Boolean(product));

      onProducts(sortProducts(products));
    },
    (error) => {
      console.error("Products subscription error:", error);
      onError?.(error);
    },
  );
}

export async function seedProductsToFirestore(): Promise<{
  uploaded: number;
  skipped: boolean;
}> {
  const productsCollection = collection(db, PRODUCTS_COLLECTION);
  const existingSnapshot = await getDocs(productsCollection);

  if (!existingSnapshot.empty) {
    return { uploaded: 0, skipped: true };
  }

  const batch = writeBatch(db);

  for (const product of PRODUCTS) {
    const sanitized = sanitizeProduct(product);
    const productReference = doc(productsCollection, sanitized.id);

    batch.set(productReference, {
      ...sanitized,
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  await batch.commit();

  return {
    uploaded: PRODUCTS.length,
    skipped: false,
  };
}

export function getLocalProductsFallback(): Product[] {
  return PRODUCTS.map((product) => ({ ...product }));
}

/* ---------- BULK IMPORT ---------- */

export type BulkProductInput = Product & {
  isActive?: boolean;
};

export type BulkImportMode = "upsert" | "skip-existing";

export type BulkImportResult = {
  totalRows: number;
  created: number;
  updated: number;
  skipped: number;
};


export type ProductDuplicateIndex = {
  ids: Set<string>;
  fingerprints: Set<string>;
};

function normalizeDuplicateText(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function createProductFingerprint(
  name: string,
  size: string,
  _category?: string,
): string {
  return [
    normalizeDuplicateText(name),
    normalizeDuplicateText(size),
  ].join("||");
}

export async function getProductDuplicateIndex(): Promise<ProductDuplicateIndex> {
  const snapshot = await getDocs(collection(db, PRODUCTS_COLLECTION));
  const ids = new Set<string>();
  const fingerprints = new Set<string>();

  snapshot.docs.forEach((item) => {
    ids.add(item.id);
    const data = item.data();
    fingerprints.add(
      createProductFingerprint(
        typeof data.name === "string" ? data.name : "",
        typeof data.size === "string" ? data.size : "",
        typeof data.category === "string" ? data.category : "",
      ),
    );
  });

  return { ids, fingerprints };
}


export type ProductDuplicateCheckResult = {
  duplicate: boolean;
  matchedProductId?: string;
  reason?: "same-product";
};

export async function checkProductDuplicate(
  name: string,
  size: string,
  category: string,
  excludeProductId?: string,
): Promise<ProductDuplicateCheckResult> {
  const targetFingerprint = createProductFingerprint(name, size, category);
  const snapshot = await getDocs(collection(db, PRODUCTS_COLLECTION));

  for (const item of snapshot.docs) {
    if (excludeProductId && item.id === excludeProductId) {
      continue;
    }

    const data = item.data();
    const fingerprint = createProductFingerprint(
      typeof data.name === "string" ? data.name : "",
      typeof data.size === "string" ? data.size : "",
      typeof data.category === "string" ? data.category : "",
    );

    if (fingerprint === targetFingerprint) {
      return {
        duplicate: true,
        matchedProductId: item.id,
        reason: "same-product",
      };
    }
  }

  return { duplicate: false };
}


export const ACTIVE_ORDER_STATUSES = [
  "placed",
  "confirmed",
  "preparing",
  "out-for-delivery",
] as const;

export type ProductRemovalSafetyResult =
  | { ok: true }
  | { ok: false; reason: "stock"; stock: number }
  | {
      ok: false;
      reason: "active-order";
      orderId: string;
      status: string;
    }
  | { ok: false; reason: "missing" };

export async function checkProductRemovalSafety(
  productId: string,
): Promise<ProductRemovalSafetyResult> {
  const productReference = doc(db, PRODUCTS_COLLECTION, productId);
  const productSnapshot = await getDoc(productReference);

  if (!productSnapshot.exists()) {
    return { ok: false, reason: "missing" };
  }

  const productData = productSnapshot.data();
  const currentStock = Math.max(
    0,
    Math.floor(safeNumber(productData.stock)),
  );

  const ordersSnapshot = await getDocs(collection(db, "orders"));

  for (const orderDocument of ordersSnapshot.docs) {
    const orderData = orderDocument.data();
    const status = String(orderData.status ?? "placed");

    if (
      !ACTIVE_ORDER_STATUSES.includes(
        status as (typeof ACTIVE_ORDER_STATUSES)[number],
      )
    ) {
      continue;
    }

    const items = Array.isArray(orderData.items)
      ? orderData.items
      : [];

    const containsProduct = items.some((item: unknown) => {
      if (!item || typeof item !== "object") {
        return false;
      }

      const row = item as Record<string, unknown>;
      return String(row.productId ?? "") === productId;
    });

    if (containsProduct) {
      return {
        ok: false,
        reason: "active-order",
        orderId: orderDocument.id,
        status,
      };
    }
  }

  if (currentStock > 0) {
    return {
      ok: false,
      reason: "stock",
      stock: currentStock,
    };
  }

  return { ok: true };
}

export async function deactivateProductSafely(
  productId: string,
): Promise<void> {
  const safety = await checkProductRemovalSafety(productId);

  if (!safety.ok) {
    if (safety.reason === "active-order") {
      throw new Error(
        `ACTIVE_ORDER:${safety.orderId}:${safety.status}`,
      );
    }

    if (safety.reason === "stock") {
      throw new Error(`STOCK:${safety.stock}`);
    }

    throw new Error("PRODUCT_NOT_FOUND");
  }

  await updateDoc(
    doc(db, PRODUCTS_COLLECTION, productId),
    {
      isActive: false,
      deactivatedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
  );
}

export async function getExistingProductIds(): Promise<Set<string>> {
  const snapshot = await getDocs(collection(db, PRODUCTS_COLLECTION));
  return new Set(snapshot.docs.map((item) => item.id));
}

export async function updateProductImage(
  productId: string,
  imageUrl: string,
): Promise<void> {
  const cleanProductId = String(productId ?? "").trim();
  const cleanImageUrl = String(imageUrl ?? "").trim();

  if (!cleanProductId) {
    throw new Error("Product ID is required to update an image.");
  }

  if (!cleanImageUrl) {
    throw new Error("Image URL is required.");
  }

  await updateDoc(
    doc(db, PRODUCTS_COLLECTION, cleanProductId),
    {
      image: cleanImageUrl,
      updatedAt: serverTimestamp(),
    },
  );
}

export async function bulkImportProducts(
  products: BulkProductInput[],
  mode: BulkImportMode = "upsert",
): Promise<BulkImportResult> {
  const existingIds = await getExistingProductIds();

  let created = 0;
  let updated = 0;
  let skipped = 0;

  // Keep safely below Firestore's 500-write batch limit.
  const chunkSize = 400;

  for (let start = 0; start < products.length; start += chunkSize) {
    const chunk = products.slice(start, start + chunkSize);
    const batch = writeBatch(db);
    let writesInBatch = 0;

    for (const product of chunk) {
      const sanitized = sanitizeProduct(product);
      const exists = existingIds.has(sanitized.id);

      if (exists && mode === "skip-existing") {
        skipped += 1;
        continue;
      }

      const reference = doc(db, PRODUCTS_COLLECTION, sanitized.id);

      const productData: DocumentData = {
        ...sanitized,
        isActive: product.isActive !== false,
        ...(exists ? {} : { createdAt: serverTimestamp() }),
        updatedAt: serverTimestamp(),
      };

      // Never erase an existing product image just because the Excel
      // image/imageFile cells are blank. Images are handled separately.
      if (exists && !sanitized.image) {
        delete productData.image;
      }

      batch.set(
        reference,
        productData,
        { merge: true },
      );

      writesInBatch += 1;

      if (exists) {
        updated += 1;
      } else {
        created += 1;
        existingIds.add(sanitized.id);
      }
    }

    if (writesInBatch > 0) {
      await batch.commit();
    }
  }

  return {
    totalRows: products.length,
    created,
    updated,
    skipped,
  };
}