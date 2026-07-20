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
}

export interface User {
  mobile: string;
  name?: string;
  isGuest: boolean;
}

// TODO: Future admin/role support
export type UserRole = "customer" | "admin" | "delivery";
