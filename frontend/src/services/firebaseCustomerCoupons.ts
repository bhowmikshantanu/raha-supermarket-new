import {
  collection,
  onSnapshot,
  orderBy,
  query,
  type DocumentData,
  type Unsubscribe,
} from "firebase/firestore";

import { db } from "@/src/config/firebase";

export type CustomerCouponType =
  | "flat"
  | "percent"
  | "free-delivery";

export type CustomerCoupon = {
  id: string;
  code: string;
  title: string;
  description: string;
  type: CustomerCouponType;
  value: number;
  minOrder: number;
  maxDiscount?: number;
  active: boolean;
  expiry: string;
  sortOrder: number;
};

export type CouponValidationResult =
  | {
      ok: true;
      coupon: CustomerCoupon;
      discount: number;
      deliveryDiscount: number;
      message: string;
    }
  | {
      ok: false;
      coupon?: undefined;
      discount: 0;
      deliveryDiscount: 0;
      message: string;
    };

function safeNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeCode(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "");
}

function mapCoupon(
  id: string,
  data: DocumentData,
): CustomerCoupon {
  const type: CustomerCouponType =
    data.type === "percent" ||
    data.type === "free-delivery"
      ? data.type
      : "flat";

  const maxDiscount =
    typeof data.maxDiscount === "number"
      ? Math.max(0, data.maxDiscount)
      : undefined;

  return {
    id,
    code: normalizeCode(String(data.code ?? id)),
    title: String(data.title ?? ""),
    description: String(data.description ?? ""),
    type,
    value: Math.max(0, safeNumber(data.value)),
    minOrder: Math.max(0, safeNumber(data.minOrder)),
    maxDiscount,
    active: data.active !== false,
    expiry: String(data.expiry ?? ""),
    sortOrder: Math.max(
      0,
      Math.floor(safeNumber(data.sortOrder)),
    ),
  };
}

export function isCustomerCouponExpired(
  coupon: Pick<CustomerCoupon, "expiry">,
): boolean {
  const expiryTime = new Date(
    `${coupon.expiry}T23:59:59`,
  ).getTime();

  return Number.isNaN(expiryTime)
    ? true
    : Date.now() > expiryTime;
}

export function subscribeToCustomerCoupons(
  onCoupons: (coupons: CustomerCoupon[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const couponsQuery = query(
    collection(db, "coupons"),
    orderBy("sortOrder", "asc"),
  );

  return onSnapshot(
    couponsQuery,
    (snapshot) => {
      const coupons = snapshot.docs
        .map((item) =>
          mapCoupon(item.id, item.data()),
        )
        .sort(
          (first, second) =>
            first.sortOrder - second.sortOrder ||
            first.code.localeCompare(second.code),
        );

      onCoupons(coupons);
    },
    (error) => {
      console.error(
        "[Customer Coupons] Firestore listener failed:",
        error,
      );

      onError?.(
        error instanceof Error
          ? error
          : new Error("Unable to load coupons."),
      );
    },
  );
}

export function getAvailableCustomerCoupons(
  coupons: CustomerCoupon[],
  cartSubtotal: number,
): CustomerCoupon[] {
  return coupons.filter(
    (coupon) =>
      coupon.active &&
      !isCustomerCouponExpired(coupon) &&
      cartSubtotal >= coupon.minOrder,
  );
}

export function validateCustomerCoupon(
  coupons: CustomerCoupon[],
  code: string,
  cartSubtotal: number,
  deliveryFee: number,
): CouponValidationResult {
  const normalizedCode = normalizeCode(code);

  if (!normalizedCode) {
    return {
      ok: false,
      discount: 0,
      deliveryDiscount: 0,
      message: "Please enter a coupon code.",
    };
  }

  const coupon = coupons.find(
    (item) => item.code === normalizedCode,
  );

  if (!coupon) {
    return {
      ok: false,
      discount: 0,
      deliveryDiscount: 0,
      message: "Invalid coupon code.",
    };
  }

  if (!coupon.active) {
    return {
      ok: false,
      discount: 0,
      deliveryDiscount: 0,
      message: "This coupon is currently inactive.",
    };
  }

  if (isCustomerCouponExpired(coupon)) {
    return {
      ok: false,
      discount: 0,
      deliveryDiscount: 0,
      message: "This coupon has expired.",
    };
  }

  if (cartSubtotal < coupon.minOrder) {
    return {
      ok: false,
      discount: 0,
      deliveryDiscount: 0,
      message: `Add ₹${Math.ceil(
        coupon.minOrder - cartSubtotal,
      )} more to use ${coupon.code}.`,
    };
  }

  if (coupon.type === "free-delivery") {
    const deliveryDiscount = Math.max(
      0,
      deliveryFee,
    );

    return {
      ok: true,
      coupon,
      discount: 0,
      deliveryDiscount,
      message:
        deliveryDiscount > 0
          ? `${coupon.code} applied. Delivery is now free.`
          : `${coupon.code} applied. Delivery is already free.`,
    };
  }

  let discount = 0;

  if (coupon.type === "flat") {
    discount = Math.min(
      cartSubtotal,
      coupon.value,
    );
  } else {
    discount =
      (cartSubtotal * coupon.value) / 100;

    if (
      coupon.maxDiscount !== undefined &&
      coupon.maxDiscount > 0
    ) {
      discount = Math.min(
        discount,
        coupon.maxDiscount,
      );
    }

    discount = Math.min(
      discount,
      cartSubtotal,
    );
  }

  discount =
    Math.round(discount * 100) / 100;

  return {
    ok: true,
    coupon,
    discount,
    deliveryDiscount: 0,
    message: `${coupon.code} applied successfully.`,
  };
}