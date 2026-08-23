import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

import { db } from "@/src/config/firebase";

export type FirebaseCategory = {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  image?: string;
  active: boolean;
  sortOrder: number;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type CategoryInput = {
  name: string;
  slug?: string;
  icon?: string;
  image?: string;
  active?: boolean;
  sortOrder?: number;
};

const CATEGORIES_COLLECTION = "categories";
const PRODUCTS_COLLECTION = "products";

const categoriesRef = collection(
  db,
  CATEGORIES_COLLECTION,
);

function createSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function mapCategory(
  id: string,
  data: Record<string, any>,
): FirebaseCategory {
  return {
    id,
    name: String(data.name ?? ""),
    slug: String(data.slug ?? id),
    icon:
      typeof data.icon === "string" &&
      data.icon.trim()
        ? data.icon
        : undefined,
    image:
      typeof data.image === "string" &&
      data.image.trim()
        ? data.image
        : undefined,
    active: data.active !== false,
    sortOrder:
      typeof data.sortOrder === "number"
        ? data.sortOrder
        : 0,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

function normalizeSortOrder(
  value: unknown,
): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.max(
    0,
    Math.floor(parsed),
  );
}

export async function getFirebaseCategories(): Promise<
  FirebaseCategory[]
> {
  const categoriesQuery = query(
    categoriesRef,
    orderBy("sortOrder", "asc"),
  );

  const snapshot =
    await getDocs(categoriesQuery);

  return snapshot.docs.map((item) =>
    mapCategory(
      item.id,
      item.data(),
    ),
  );
}

export function subscribeToFirebaseCategories(
  callback: (
    categories: FirebaseCategory[],
  ) => void,
  onError?: (error: Error) => void,
): () => void {
  const categoriesQuery = query(
    categoriesRef,
    orderBy("sortOrder", "asc"),
  );

  return onSnapshot(
    categoriesQuery,
    (snapshot) => {
      const categories =
        snapshot.docs.map((item) =>
          mapCategory(
            item.id,
            item.data(),
          ),
        );

      callback(categories);
    },
    (error) => {
      console.error(
        "[Categories] Firestore listener failed:",
        error,
      );

      onError?.(
        error instanceof Error
          ? error
          : new Error(
              "Unable to load categories.",
            ),
      );
    },
  );
}

export async function createFirebaseCategory(
  input: CategoryInput,
): Promise<string> {
  const name = input.name.trim();

  if (!name) {
    throw new Error(
      "Category name is required.",
    );
  }

  const slug = createSlug(
    input.slug?.trim() || name,
  );

  if (!slug) {
    throw new Error(
      "Unable to create category ID.",
    );
  }

  const categoryReference = doc(
    db,
    CATEGORIES_COLLECTION,
    slug,
  );

  await setDoc(
    categoryReference,
    {
      name,
      slug,
      icon: input.icon?.trim() || null,
      image: input.image?.trim() || null,
      active: input.active ?? true,
      sortOrder: normalizeSortOrder(
        input.sortOrder,
      ),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    {
      merge: false,
    },
  );

  console.log(
    "[Categories] Category created:",
    slug,
  );

  return slug;
}

export async function updateFirebaseCategory(
  categoryId: string,
  input: Partial<CategoryInput>,
): Promise<void> {
  const normalizedId =
    categoryId.trim();

  if (!normalizedId) {
    throw new Error(
      "Category ID is required.",
    );
  }

  const updateData:
    Record<string, unknown> = {
      updatedAt: serverTimestamp(),
    };

  if (input.name !== undefined) {
    const name = input.name.trim();

    if (!name) {
      throw new Error(
        "Category name cannot be empty.",
      );
    }

    updateData.name = name;
  }

  if (input.slug !== undefined) {
    const slug =
      createSlug(input.slug);

    if (!slug) {
      throw new Error(
        "Category slug cannot be empty.",
      );
    }

    updateData.slug = slug;
  }

  if (input.icon !== undefined) {
    updateData.icon =
      input.icon.trim() || null;
  }

  if (input.image !== undefined) {
    updateData.image =
      input.image.trim() || null;
  }

  if (input.active !== undefined) {
    updateData.active =
      Boolean(input.active);
  }

  if (input.sortOrder !== undefined) {
    updateData.sortOrder =
      normalizeSortOrder(
        input.sortOrder,
      );
  }

  await updateDoc(
    doc(
      db,
      CATEGORIES_COLLECTION,
      normalizedId,
    ),
    updateData,
  );

  console.log(
    "[Categories] Category updated:",
    normalizedId,
  );
}

export async function setFirebaseCategoryActive(
  categoryId: string,
  active: boolean,
): Promise<void> {
  const normalizedId =
    categoryId.trim();

  if (!normalizedId) {
    throw new Error(
      "Category ID is required.",
    );
  }

  await updateDoc(
    doc(
      db,
      CATEGORIES_COLLECTION,
      normalizedId,
    ),
    {
      active,
      updatedAt: serverTimestamp(),
    },
  );

  console.log(
    "[Categories] Active status updated:",
    normalizedId,
    active,
  );
}

export async function categoryHasProducts(
  categoryId: string,
): Promise<boolean> {
  const normalizedId =
    categoryId.trim();

  if (!normalizedId) {
    throw new Error(
      "Category ID is required.",
    );
  }

  const productsQuery = query(
    collection(
      db,
      PRODUCTS_COLLECTION,
    ),
    where(
      "category",
      "==",
      normalizedId,
    ),
    limit(1),
  );

  const snapshot =
    await getDocs(productsQuery);

  return !snapshot.empty;
}

export async function deleteFirebaseCategory(
  categoryId: string,
): Promise<void> {
  const normalizedId =
    categoryId.trim();

  if (!normalizedId) {
    throw new Error(
      "Category ID is required.",
    );
  }

  const hasProducts =
    await categoryHasProducts(
      normalizedId,
    );

  if (hasProducts) {
    throw new Error(
      "This category cannot be deleted because products are assigned to it. Move those products to another category first.",
    );
  }

  await deleteDoc(
    doc(
      db,
      CATEGORIES_COLLECTION,
      normalizedId,
    ),
  );

  console.log(
    "[Categories] Category deleted:",
    normalizedId,
  );
}

export async function initializeDefaultCategories(): Promise<void> {
  const defaultCategories: CategoryInput[] = [
    {
      name: "Grocery & Staples",
      slug: "grocery-staples",
      icon: "basket-outline",
      image: "",
      active: true,
      sortOrder: 1,
    },
    {
      name: "Dairy Products",
      slug: "dairy",
      icon: "water-outline",
      image: "",
      active: true,
      sortOrder: 2,
    },
    {
      name: "Snacks & Biscuits",
      slug: "snacks-biscuits",
      icon: "fast-food-outline",
      image: "",
      active: true,
      sortOrder: 3,
    },
    {
      name: "Beverages",
      slug: "beverages",
      icon: "cafe-outline",
      image: "",
      active: true,
      sortOrder: 4,
    },
    {
      name: "Household Essentials",
      slug: "household",
      icon: "home-outline",
      image: "",
      active: true,
      sortOrder: 5,
    },
    {
      name: "Personal Care",
      slug: "personal-care",
      icon: "heart-outline",
      image: "",
      active: true,
      sortOrder: 6,
    },
  ];

  for (const category of defaultCategories) {
    await createFirebaseCategory(
      category,
    );
  }

  console.log(
    "[Categories] Default Raha Supermarket categories initialized.",
  );
}