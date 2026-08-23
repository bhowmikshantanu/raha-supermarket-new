export type CouponType =
  | "flat"
  | "percent"
  | "free-delivery";

export interface Coupon {
  code: string;
  title: string;
  description: string;
  type: CouponType;
  value: number;
  minOrder: number;
  maxDiscount?: number;
  active: boolean;
  expiry: string;
}

export interface CouponResult {
  ok: boolean;
  message: string;
  coupon?: Coupon;
  discount: number;
  deliveryDiscount: number;
}

export const COUPONS: Coupon[] = [
  {
    code: "WELCOME50",
    title: "Welcome Offer",
    description: "Get ₹50 off on orders above ₹299.",
    type: "flat",
    value: 50,
    minOrder: 299,
    active: true,
    expiry: "2028-12-31",
  },
  {
    code: "SAVE100",
    title: "Super Saver",
    description: "Get ₹100 off on orders above ₹799.",
    type: "flat",
    value: 100,
    minOrder: 799,
    active: true,
    expiry: "2028-12-31",
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
  },
  {
    code: "FREEDEL",
    title: "Free Delivery",
    description:
      "Get free delivery on orders above ₹300.",
    type: "free-delivery",
    value: 0,
    minOrder: 300,
    active: true,
    expiry: "2028-12-31",
  },
  {
    code: "EXPIRED",
    title: "Expired Coupon",
    description: "This coupon is no longer available.",
    type: "flat",
    value: 100,
    minOrder: 500,
    active: false,
    expiry: "2022-01-01",
  },
];

export function normalizeCouponCode(
  value: string,
): string {
  return value.trim().toUpperCase();
}

export function getCouponByCode(
  code: string,
): Coupon | undefined {
  const normalizedCode = normalizeCouponCode(code);

  return COUPONS.find(
    (coupon) => coupon.code === normalizedCode,
  );
}

export function isCouponExpired(
  coupon: Coupon,
): boolean {
  const expiryTime = new Date(
    `${coupon.expiry}T23:59:59`,
  ).getTime();

  return Number.isNaN(expiryTime)
    ? true
    : Date.now() > expiryTime;
}

export function calculateCouponDiscount(
  coupon: Coupon,
  subtotal: number,
  deliveryFee: number,
): CouponResult {
  if (!coupon.active || isCouponExpired(coupon)) {
    return {
      ok: false,
      message: "This coupon has expired.",
      discount: 0,
      deliveryDiscount: 0,
    };
  }

  if (subtotal < coupon.minOrder) {
    const remainingAmount =
      coupon.minOrder - subtotal;

    return {
      ok: false,
      message: `Add ₹${remainingAmount} more to use ${coupon.code}.`,
      discount: 0,
      deliveryDiscount: 0,
    };
  }

  if (coupon.type === "free-delivery") {
    if (deliveryFee <= 0) {
      return {
        ok: false,
        message:
          "Delivery is already free for this order.",
        discount: 0,
        deliveryDiscount: 0,
      };
    }

    return {
      ok: true,
      message: `${coupon.code} applied. Delivery is now free.`,
      coupon,
      discount: 0,
      deliveryDiscount: deliveryFee,
    };
  }

  if (coupon.type === "flat") {
    const discount = Math.min(
      coupon.value,
      subtotal,
    );

    return {
      ok: true,
      message: `${coupon.code} applied. You saved ₹${discount}.`,
      coupon,
      discount,
      deliveryDiscount: 0,
    };
  }

  const percentageDiscount =
    (subtotal * coupon.value) / 100;

  const discount = Math.min(
    percentageDiscount,
    coupon.maxDiscount ??
      percentageDiscount,
    subtotal,
  );

  const roundedDiscount = Math.round(discount);

  return {
    ok: true,
    message: `${coupon.code} applied. You saved ₹${roundedDiscount}.`,
    coupon,
    discount: roundedDiscount,
    deliveryDiscount: 0,
  };
}

export function validateCoupon(
  code: string,
  subtotal: number,
  deliveryFee: number,
): CouponResult {
  const normalizedCode = normalizeCouponCode(code);

  if (!normalizedCode) {
    return {
      ok: false,
      message: "Please enter a coupon code.",
      discount: 0,
      deliveryDiscount: 0,
    };
  }

  const coupon = getCouponByCode(normalizedCode);

  if (!coupon) {
    return {
      ok: false,
      message: "Invalid coupon code.",
      discount: 0,
      deliveryDiscount: 0,
    };
  }

  return calculateCouponDiscount(
    coupon,
    subtotal,
    deliveryFee,
  );
}

export function getAvailableCoupons(
  subtotal: number,
): Coupon[] {
  return COUPONS.filter(
    (coupon) =>
      coupon.active &&
      !isCouponExpired(coupon) &&
      subtotal >= coupon.minOrder,
  );
}