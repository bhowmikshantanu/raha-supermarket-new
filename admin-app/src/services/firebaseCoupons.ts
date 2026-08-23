import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";

import { db } from "@/src/config/firebase";

export type CouponType =
  | "flat"
  | "percent"
  | "free-delivery";

export type FirebaseCoupon = {
  id: string;
  code: string;
  title: string;
  description: string;
  type: CouponType;
  value: number;
  minOrder: number;
  maxDiscount?: number;
  active: boolean;
  expiry: string;
  sortOrder: number;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type CouponInput = {
  code: string;
  title: string;
  description: string;
  type: CouponType;
  value?: number;
  minOrder?: number;
  maxDiscount?: number;
  active?: boolean;
  expiry: string;
  sortOrder?: number;
};

const COUPONS_COLLECTION = "coupons";

const couponsRef = collection(
  db,
  COUPONS_COLLECTION,
);

function normalizeCode(
  value: string,
): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "");
}

function normalizeMoney(
  value: unknown,
): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.max(
    0,
    Math.round(parsed * 100) / 100,
  );
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

function isValidDateString(
  value: string,
): boolean {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      value,
    )
  ) {
    return false;
  }

  const timestamp = new Date(
    `${value}T23:59:59`,
  ).getTime();

  return !Number.isNaN(
    timestamp,
  );
}

function mapCoupon(
  id: string,
  data: Record<string, any>,
): FirebaseCoupon {
  const type: CouponType =
    data.type === "percent" ||
    data.type === "free-delivery"
      ? data.type
      : "flat";

  const maxDiscount =
    typeof data.maxDiscount ===
      "number"
      ? data.maxDiscount
      : undefined;

  return {
    id,
    code: String(
      data.code ?? id,
    ).toUpperCase(),
    title: String(
      data.title ?? "",
    ),
    description: String(
      data.description ?? "",
    ),
    type,
    value: normalizeMoney(
      data.value,
    ),
    minOrder: normalizeMoney(
      data.minOrder,
    ),
    maxDiscount,
    active:
      data.active !== false,
    expiry: String(
      data.expiry ?? "",
    ),
    sortOrder:
      normalizeSortOrder(
        data.sortOrder,
      ),
    createdAt:
      data.createdAt,
    updatedAt:
      data.updatedAt,
  };
}

function validateCouponInput(
  input: CouponInput,
): {
  code: string;
  title: string;
  description: string;
  type: CouponType;
  value: number;
  minOrder: number;
  maxDiscount?: number;
  active: boolean;
  expiry: string;
  sortOrder: number;
} {
  const code =
    normalizeCode(
      input.code,
    );

  if (!code) {
    throw new Error(
      "Coupon code is required.",
    );
  }

  const title =
    input.title.trim();

  if (!title) {
    throw new Error(
      "Coupon title is required.",
    );
  }

  const description =
    input.description.trim();

  if (!description) {
    throw new Error(
      "Coupon description is required.",
    );
  }

  const expiry =
    input.expiry.trim();

  if (
    !isValidDateString(
      expiry,
    )
  ) {
    throw new Error(
      "Expiry must be in YYYY-MM-DD format.",
    );
  }

  const value =
    normalizeMoney(
      input.value,
    );

  const minOrder =
    normalizeMoney(
      input.minOrder,
    );

  const maxDiscount =
    input.maxDiscount ===
      undefined
      ? undefined
      : normalizeMoney(
          input.maxDiscount,
        );

  if (
    input.type === "percent" &&
    (value <= 0 ||
      value > 100)
  ) {
    throw new Error(
      "Percentage discount must be between 1 and 100.",
    );
  }

  if (
    input.type === "flat" &&
    value <= 0
  ) {
    throw new Error(
      "Flat discount amount must be greater than 0.",
    );
  }

  return {
    code,
    title,
    description,
    type:
      input.type,
    value:
      input.type ===
      "free-delivery"
        ? 0
        : value,
    minOrder,
    maxDiscount:
      input.type ===
      "percent"
        ? maxDiscount
        : undefined,
    active:
      input.active ??
      true,
    expiry,
    sortOrder:
      normalizeSortOrder(
        input.sortOrder,
      ),
  };
}

export function isFirebaseCouponExpired(
  coupon: Pick<
    FirebaseCoupon,
    "expiry"
  >,
): boolean {
  const expiryTime =
    new Date(
      `${coupon.expiry}T23:59:59`,
    ).getTime();

  return Number.isNaN(
    expiryTime,
  )
    ? true
    : Date.now() >
        expiryTime;
}

export async function getFirebaseCoupons(): Promise<
  FirebaseCoupon[]
> {
  const couponsQuery =
    query(
      couponsRef,
      orderBy(
        "sortOrder",
        "asc",
      ),
    );

  const snapshot =
    await getDocs(
      couponsQuery,
    );

  return snapshot.docs.map(
    (item) =>
      mapCoupon(
        item.id,
        item.data(),
      ),
  );
}

export function subscribeToFirebaseCoupons(
  callback: (
    coupons: FirebaseCoupon[],
  ) => void,
  onError?: (
    error: Error,
  ) => void,
): () => void {
  const couponsQuery =
    query(
      couponsRef,
      orderBy(
        "sortOrder",
        "asc",
      ),
    );

  return onSnapshot(
    couponsQuery,
    (snapshot) => {
      callback(
        snapshot.docs.map(
          (item) =>
            mapCoupon(
              item.id,
              item.data(),
            ),
        ),
      );
    },
    (error) => {
      console.error(
        "[Coupons] Firestore listener failed:",
        error,
      );

      onError?.(
        error instanceof Error
          ? error
          : new Error(
              "Unable to load coupons.",
            ),
      );
    },
  );
}

export async function createFirebaseCoupon(
  input: CouponInput,
): Promise<string> {
  const normalized =
    validateCouponInput(
      input,
    );

  const couponReference =
    doc(
      db,
      COUPONS_COLLECTION,
      normalized.code,
    );

  await setDoc(
    couponReference,
    {
      ...normalized,
      maxDiscount:
        normalized.maxDiscount ??
        null,
      createdAt:
        serverTimestamp(),
      updatedAt:
        serverTimestamp(),
    },
    {
      merge: false,
    },
  );

  return normalized.code;
}

export async function updateFirebaseCoupon(
  couponId: string,
  input: CouponInput,
): Promise<void> {
  const normalizedId =
    normalizeCode(
      couponId,
    );

  if (!normalizedId) {
    throw new Error(
      "Coupon ID is required.",
    );
  }

  const normalized =
    validateCouponInput({
      ...input,
      code:
        normalizedId,
    });

  await updateDoc(
    doc(
      db,
      COUPONS_COLLECTION,
      normalizedId,
    ),
    {
      ...normalized,
      code:
        normalizedId,
      maxDiscount:
        normalized.maxDiscount ??
        null,
      updatedAt:
        serverTimestamp(),
    },
  );
}

export async function setFirebaseCouponActive(
  couponId: string,
  active: boolean,
): Promise<void> {
  const normalizedId =
    normalizeCode(
      couponId,
    );

  if (!normalizedId) {
    throw new Error(
      "Coupon ID is required.",
    );
  }

  await updateDoc(
    doc(
      db,
      COUPONS_COLLECTION,
      normalizedId,
    ),
    {
      active,
      updatedAt:
        serverTimestamp(),
    },
  );
}

export async function deleteFirebaseCoupon(
  couponId: string,
): Promise<void> {
  const normalizedId =
    normalizeCode(
      couponId,
    );

  if (!normalizedId) {
    throw new Error(
      "Coupon ID is required.",
    );
  }

  await deleteDoc(
    doc(
      db,
      COUPONS_COLLECTION,
      normalizedId,
    ),
  );
}

export async function initializeDefaultCoupons(): Promise<void> {
  const defaults: CouponInput[] = [
    {
      code: "WELCOME50",
      title: "Welcome Offer",
      description:
        "Get ₹50 off on orders above ₹299.",
      type: "flat",
      value: 50,
      minOrder: 299,
      active: true,
      expiry: "2028-12-31",
      sortOrder: 1,
    },
    {
      code: "SAVE100",
      title: "Super Saver",
      description:
        "Get ₹100 off on orders above ₹799.",
      type: "flat",
      value: 100,
      minOrder: 799,
      active: true,
      expiry: "2028-12-31",
      sortOrder: 2,
    },
    {
      code: "SUPER10",
      title: "10% Discount",
      description:
        "Get 10% off up to ₹150 on orders above ₹500.",
      type: "percent",
      value: 10,
      maxDiscount: 150,
      minOrder: 500,
      active: true,
      expiry: "2028-12-31",
      sortOrder: 3,
    },
    {
      code: "FREEDEL",
      title: "Free Delivery",
      description:
        "Get free delivery on orders above ₹300.",
      type:
        "free-delivery",
      value: 0,
      minOrder: 300,
      active: true,
      expiry: "2028-12-31",
      sortOrder: 4,
    },
  ];

  for (
    const coupon of
    defaults
  ) {
    await createFirebaseCoupon(
      coupon,
    );
  }
}