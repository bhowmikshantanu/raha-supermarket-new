import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import type { Product } from "@/src/types";

import {
  getLocalProductsFallback,
  subscribeToFirebaseProducts,
} from "@/src/services/firebaseProducts";

interface ProductContextValue {
  products: Product[];
  loading: boolean;
  firebaseReady: boolean;

  getProductById(
    id: string,
  ): Product | undefined;

  getProductsByCategory(
    category: string,
  ): Product[];

  searchProducts(
    query: string,
  ): Product[];
}

const ProductContext =
  createContext<ProductContextValue | null>(
    null,
  );

export function ProductProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [products, setProducts] =
    useState<Product[]>(
      getLocalProductsFallback(),
    );

  const [loading, setLoading] =
    useState(true);

  const [firebaseReady, setFirebaseReady] =
    useState(false);

  useEffect(() => {
    const unsubscribe =
      subscribeToFirebaseProducts(
        (items) => {
          // Firestore is now the source of truth.
          // IMPORTANT:
          // Even if Firestore returns an empty array,
          // we must update products to [].
          setProducts(items);

          setFirebaseReady(true);
          setLoading(false);
        },

        (error) => {
          console.error(
            "Firebase products subscription failed:",
            error,
          );

          // Firebase could not be reached.
          // Keep local fallback only in this case.
          setFirebaseReady(false);
          setLoading(false);
        },
      );

    return unsubscribe;
  }, []);

  const getProductById = useMemo(
    () =>
      (
        id: string,
      ): Product | undefined =>
        products.find(
          (product) =>
            product.id === id,
        ),
    [products],
  );

  const getProductsByCategory =
    useMemo(
      () =>
        (
          category: string,
        ): Product[] =>
          products.filter(
            (product) =>
              product.category ===
              category,
          ),
      [products],
    );

  const searchProducts = useMemo(
    () =>
      (
        query: string,
      ): Product[] => {
        const q = query
          .trim()
          .toLowerCase();

        if (!q) {
          return [];
        }

        return products.filter(
          (product) => {
            const name =
              product.name
                ?.toLowerCase() ?? "";

            const description =
              product.description
                ?.toLowerCase() ?? "";

            const category =
              product.category
                ?.toLowerCase() ?? "";

            const size =
              product.size
                ?.toLowerCase() ?? "";

            return (
              name.includes(q) ||
              description.includes(q) ||
              category.includes(q) ||
              size.includes(q)
            );
          },
        );
      },
    [products],
  );

  const value =
    useMemo<ProductContextValue>(
      () => ({
        products,
        loading,
        firebaseReady,
        getProductById,
        getProductsByCategory,
        searchProducts,
      }),
      [
        products,
        loading,
        firebaseReady,
        getProductById,
        getProductsByCategory,
        searchProducts,
      ],
    );

  return (
    <ProductContext.Provider
      value={value}
    >
      {children}
    </ProductContext.Provider>
  );
}

export function useProducts() {
  const context =
    useContext(ProductContext);

  if (!context) {
    throw new Error(
      "useProducts must be used inside ProductProvider",
    );
  }

  return context;
}