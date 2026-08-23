import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  type DocumentData,
  type Unsubscribe,
} from "firebase/firestore";

import { db } from "@/src/config/firebase";
import { PRODUCTS } from "@/src/data/products";
import type { Product } from "@/src/types";

const PRODUCTS_COLLECTION = "products";

function safeNumber(
  value: unknown,
  fallback = 0,
): number {
  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : fallback;
}

function sanitizeProduct(
  product: Product,
): Product {
  return {
    id: String(product.id),
    name: String(product.name ?? "").trim(),
    category: String(
      product.category ?? "",
    ).trim(),
    size: String(product.size ?? "").trim(),

    mrp: Math.max(
      0,
      safeNumber(product.mrp),
    ),

    price: Math.max(
      0,
      safeNumber(product.price),
    ),

    stock: Math.max(
      0,
      Math.floor(
        safeNumber(product.stock),
      ),
    ),

    image:
      typeof product.image === "string"
        ? product.image.trim()
        : "",

    description:
      typeof product.description ===
      "string"
        ? product.description.trim()
        : "",

    isFeatured: Boolean(
      product.isFeatured,
    ),

    isBestOffer: Boolean(
      product.isBestOffer,
    ),

    isPopular: Boolean(
      product.isPopular,
    ),
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

    category: data.category,

    size:
      typeof data.size === "string"
        ? data.size
        : "",

    mrp: safeNumber(data.mrp),

    price: safeNumber(data.price),

    stock: safeNumber(data.stock),

    image:
      typeof data.image === "string"
        ? data.image
        : "",

    description:
      typeof data.description ===
      "string"
        ? data.description
        : "",

    isFeatured: Boolean(
      data.isFeatured,
    ),

    isBestOffer: Boolean(
      data.isBestOffer,
    ),

    isPopular: Boolean(
      data.isPopular,
    ),
  });
}

function sortProducts(
  products: Product[],
): Product[] {
  return [...products].sort(
    (first, second) => {
      const firstPriority =
        Number(first.isFeatured) * 3 +
        Number(first.isPopular) * 2 +
        Number(first.isBestOffer);

      const secondPriority =
        Number(second.isFeatured) * 3 +
        Number(second.isPopular) * 2 +
        Number(second.isBestOffer);

      return (
        secondPriority -
          firstPriority ||
        first.name.localeCompare(
          second.name,
        )
      );
    },
  );
}

export async function getFirebaseProducts(): Promise<
  Product[]
> {
  const snapshot = await getDocs(
    collection(
      db,
      PRODUCTS_COLLECTION,
    ),
  );

  const products = snapshot.docs
    .map((snapshotDocument) => {
      const data =
        snapshotDocument.data();

      if (data.isActive === false) {
        return null;
      }

      return documentToProduct(
        snapshotDocument.id,
        data,
      );
    })
    .filter(
      (
        product,
      ): product is Product =>
        Boolean(product),
    );

  return sortProducts(products);
}

export function subscribeToFirebaseProducts(
  onProducts: (
    products: Product[],
  ) => void,

  onError?: (
    error: Error,
  ) => void,
): Unsubscribe {
  return onSnapshot(
    collection(
      db,
      PRODUCTS_COLLECTION,
    ),

    (snapshot) => {
      const products = snapshot.docs
        .map((snapshotDocument) => {
          const data =
            snapshotDocument.data();

          if (data.isActive === false) {
            return null;
          }

          return documentToProduct(
            snapshotDocument.id,
            data,
          );
        })
        .filter(
          (
            product,
          ): product is Product =>
            Boolean(product),
        );

      onProducts(
        sortProducts(products),
      );
    },

    (error) => {
      console.error(
        "Products subscription error:",
        error,
      );

      onError?.(error);
    },
  );
}

export async function seedProductsToFirestore(): Promise<{
  uploaded: number;
  skipped: boolean;
}> {
  const productsCollection =
    collection(
      db,
      PRODUCTS_COLLECTION,
    );

  const existingSnapshot =
    await getDocs(
      productsCollection,
    );

  if (!existingSnapshot.empty) {
    return {
      uploaded: 0,
      skipped: true,
    };
  }

  const batch =
    writeBatch(db);

  for (const product of PRODUCTS) {
    const sanitized =
      sanitizeProduct(product);

    const productReference =
      doc(
        productsCollection,
        sanitized.id,
      );

    batch.set(
      productReference,
      {
        ...sanitized,

        isActive: true,

        createdAt:
          serverTimestamp(),

        updatedAt:
          serverTimestamp(),
      },
    );
  }

  await batch.commit();

  return {
    uploaded: PRODUCTS.length,
    skipped: false,
  };
}

export function getLocalProductsFallback(): Product[] {
  return PRODUCTS.map(
    (product) => ({
      ...product,
    }),
  );
}