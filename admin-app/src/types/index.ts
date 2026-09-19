// Central type definitions for the app.

export type CategoryId =
  | "grocery-staples"
  | "dairy"
  | "snacks-biscuits"
  | "beverages"
  | "household"
  | "personal-care";

export interface Category {
  id: CategoryId;
  name: string;
  image: string;
  color: string; // Soft background color for tile
  icon: string; // Ionicons name
}

export interface Product {
  id: string;
  name: string;
  category: CategoryId;
  size: string;
  mrp: number;
  price: number;
  stock: number;
  image: string;
  description: string;
  isFeatured?: boolean;
  isPopular?: boolean;
  isBestOffer?: boolean;
}

export interface CartItem {
  productId: string;
  quantity: number;
}

export interface Address {
  id: string;
  fullName: string;
  mobile: string;
  house: string;
  landmark: string;
  area: string;
  pincode: string;
  instructions?: string;
  isDefault?: boolean;
}

export type OrderStatus =
  | "placed"
  | "confirmed"
  | "preparing"
  | "out-for-delivery"
  | "delivered"
  | "cancelled";

export interface OrderItem {
  productId: string;
  name: string;
  size: string;
  image: string;
  price: number;
  mrp: number;
  quantity: number;
}

export interface Order {
  id: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  status: OrderStatus;
  createdAt: number; // epoch ms
  address: Address;
  paymentMethod: "cod" | "online";
  estimatedDeliveryMinutes: number;

  // Customer identity captured with the order.
  // Optional so older orders remain compatible.
  customerUid?: string;
  customerName?: string;
  customerMobile?: string;

  // Coupon applied at checkout (optional â€” older orders have none).
  couponCode?: string;
  couponDiscount?: number;

  // Online payment metadata (optional â€” COD/older orders have none).
  paymentStatus?: "paid" | "pending";
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  paidAt?: number; // epoch ms

  // Delivery rider assignment (all optional â€” older orders remain valid).
  deliveryBoyId?: string;
  deliveryBoyUid?: string;
  deliveryBoyName?: string;
  deliveryBoyMobile?: string;
  assignedAt?: number; // epoch ms
  pickedUpAt?: number; // epoch ms
  deliveredAt?: number; // epoch ms
}

export interface User {
  mobile: string;
  name?: string;
  isGuest: boolean;
}

// TODO: Future admin/role support
export type UserRole = "customer" | "admin" | "delivery";

/**
 * Delivery rider ("Delivery Boy") â€” persisted in the `deliveryBoys`
 * Firestore collection. Backward-compatible: no existing document
 * requires this shape, and every optional field can be missing.
 */
export interface DeliveryBoy {
  id: string;
  name: string;
  mobile: string;
  email: string;
  active: boolean;
  vehicleNumber?: string;
  firebaseUid?: string;
  createdAt: number; // epoch ms
  updatedAt?: number; // epoch ms
}


export type NotificationType =
  | "order"
  | "offer"
  | "payment"
  | "wishlist"
  | "system";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  body?: string;
  description?: string;
  createdAt: number;
  isRead: boolean;
  actionRoute?: string;
  orderId?: string;
  productId?: string;
}

