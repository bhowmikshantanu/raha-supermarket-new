import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { BRAND } from "@/src/config/brand";
import { PRODUCTS, getProductById } from "@/src/data/products";
import type { Address, CartItem, Order, OrderItem, User } from "@/src/types";
import { storage } from "@/src/utils/storage";

// Storage keys (single source of truth)
const K_USER = "raha.user.v1";
const K_CART = "raha.cart.v1";
const K_ORDERS = "raha.orders.v1";
const K_ADDRESSES = "raha.addresses.v1";
const K_RECENT_SEARCHES = "raha.recentSearches.v1";
const K_ONBOARDED = "raha.onboarded.v1";

interface AppState {
  // hydration
  hydrated: boolean;

  // user
  user: User | null;
  isAuthenticated: boolean;
  hasSeenOnboarding: boolean;
  setOnboarded: () => Promise<void>;
  loginWithMobile: (mobile: string, name?: string) => Promise<void>;
  loginAsGuest: () => Promise<void>;
  logout: () => Promise<void>;

  // cart
  cart: CartItem[];
  cartCount: number;
  cartSubtotal: number;
  deliveryFee: number;
  cartTotal: number;
  addToCart: (productId: string, qty?: number) => { ok: boolean; message?: string };
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, qty: number) => { ok: boolean; message?: string };
  clearCart: () => void;
  getQuantity: (productId: string) => number;

  // orders
  orders: Order[];
  placeOrder: (address: Address, paymentMethod: "cod" | "online") => Order | null;
  getOrderById: (id: string) => Order | undefined;

  // addresses
  addresses: Address[];
  addAddress: (a: Omit<Address, "id">) => Address;
  removeAddress: (id: string) => void;
  defaultAddress: Address | null;

  // recent searches
  recentSearches: string[];
  addRecentSearch: (q: string) => void;
  clearRecentSearches: () => void;
}

const AppContext = createContext<AppState | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hydrated, setHydrated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);

  // Hydrate from storage on mount
  useEffect(() => {
    (async () => {
      const [u, c, o, a, r, onb] = await Promise.all([
        storage.getItem<string>(K_USER, ""),
        storage.getItem<string>(K_CART, ""),
        storage.getItem<string>(K_ORDERS, ""),
        storage.getItem<string>(K_ADDRESSES, ""),
        storage.getItem<string>(K_RECENT_SEARCHES, ""),
        storage.getItem<boolean>(K_ONBOARDED, false),
      ]);
      try { if (u) setUser(JSON.parse(u)); } catch { /* ignore */ }
      try { if (c) setCart(JSON.parse(c)); } catch { /* ignore */ }
      try { if (o) setOrders(JSON.parse(o)); } catch { /* ignore */ }
      try { if (a) setAddresses(JSON.parse(a)); } catch { /* ignore */ }
      try { if (r) setRecentSearches(JSON.parse(r)); } catch { /* ignore */ }
      setHasSeenOnboarding(Boolean(onb));
      setHydrated(true);
    })();
  }, []);

  // Persist on change (after hydration)
  useEffect(() => { if (hydrated) storage.setItem(K_USER, JSON.stringify(user)); }, [user, hydrated]);
  useEffect(() => { if (hydrated) storage.setItem(K_CART, JSON.stringify(cart)); }, [cart, hydrated]);
  useEffect(() => { if (hydrated) storage.setItem(K_ORDERS, JSON.stringify(orders)); }, [orders, hydrated]);
  useEffect(() => { if (hydrated) storage.setItem(K_ADDRESSES, JSON.stringify(addresses)); }, [addresses, hydrated]);
  useEffect(() => { if (hydrated) storage.setItem(K_RECENT_SEARCHES, JSON.stringify(recentSearches)); }, [recentSearches, hydrated]);

  // ── User actions ──────────────────────────────────────
  const setOnboarded = useCallback(async () => {
    setHasSeenOnboarding(true);
    await storage.setItem(K_ONBOARDED, true);
  }, []);

  const loginWithMobile = useCallback(async (mobile: string, name?: string) => {
    setUser({ mobile, name, isGuest: false });
  }, []);

  const loginAsGuest = useCallback(async () => {
    setUser({ mobile: "", isGuest: true });
  }, []);

  const logout = useCallback(async () => {
    setUser(null);
    setCart([]);
  }, []);

  // ── Cart actions ──────────────────────────────────────
  const getQuantity = useCallback(
    (productId: string) => cart.find((i) => i.productId === productId)?.quantity ?? 0,
    [cart],
  );

  const addToCart = useCallback(
    (productId: string, qty = 1) => {
      const product = getProductById(productId);
      if (!product) return { ok: false, message: "Product not found" };
      if (product.stock <= 0) return { ok: false, message: "Out of stock" };

      const existing = cart.find((i) => i.productId === productId);
      const nextQty = (existing?.quantity ?? 0) + qty;
      if (nextQty > product.stock)
        return { ok: false, message: `Only ${product.stock} in stock` };

      setCart((prev) => {
        const found = prev.find((i) => i.productId === productId);
        if (found) return prev.map((i) => (i.productId === productId ? { ...i, quantity: nextQty } : i));
        return [...prev, { productId, quantity: qty }];
      });
      return { ok: true };
    },
    [cart],
  );

  const removeFromCart = useCallback((productId: string) => {
    setCart((prev) => prev.filter((i) => i.productId !== productId));
  }, []);

  const updateQuantity = useCallback(
    (productId: string, qty: number) => {
      const product = getProductById(productId);
      if (!product) return { ok: false, message: "Product not found" };
      if (qty <= 0) {
        setCart((prev) => prev.filter((i) => i.productId !== productId));
        return { ok: true };
      }
      if (qty > product.stock) return { ok: false, message: `Only ${product.stock} in stock` };
      setCart((prev) => prev.map((i) => (i.productId === productId ? { ...i, quantity: qty } : i)));
      return { ok: true };
    },
    [],
  );

  const clearCart = useCallback(() => setCart([]), []);

  const cartCount = useMemo(() => cart.reduce((s, i) => s + i.quantity, 0), [cart]);
  const cartSubtotal = useMemo(
    () => cart.reduce((s, i) => {
      const p = getProductById(i.productId);
      return s + (p ? p.price * i.quantity : 0);
    }, 0),
    [cart],
  );
  const deliveryFee = useMemo(() => {
    if (cart.length === 0) return 0;
    return cartSubtotal >= BRAND.delivery.freeThreshold ? 0 : BRAND.delivery.fee;
  }, [cart.length, cartSubtotal]);
  const cartTotal = cartSubtotal + deliveryFee;

  // ── Orders ────────────────────────────────────────────
  const placeOrder = useCallback(
    (address: Address, paymentMethod: "cod" | "online"): Order | null => {
      if (cart.length === 0) return null;
      const items: OrderItem[] = cart.map((i) => {
        const p = getProductById(i.productId)!;
        return {
          productId: p.id,
          name: p.name,
          size: p.size,
          image: p.image,
          price: p.price,
          mrp: p.mrp,
          quantity: i.quantity,
        };
      });
      const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
      const fee = subtotal >= BRAND.delivery.freeThreshold ? 0 : BRAND.delivery.fee;
      const order: Order = {
        id: `RH${Date.now().toString().slice(-8)}`,
        items,
        subtotal,
        deliveryFee: fee,
        total: subtotal + fee,
        status: "placed",
        createdAt: Date.now(),
        address,
        paymentMethod,
        estimatedDeliveryMinutes: BRAND.delivery.estimatedMinutes,
      };
      setOrders((prev) => [order, ...prev]);
      setCart([]);
      return order;
    },
    [cart],
  );

  const getOrderById = useCallback((id: string) => orders.find((o) => o.id === id), [orders]);

  // ── Addresses ─────────────────────────────────────────
  const addAddress = useCallback((a: Omit<Address, "id">): Address => {
    const addr: Address = { ...a, id: `A${Date.now()}` };
    setAddresses((prev) => {
      const shouldBeDefault = prev.length === 0 || a.isDefault;
      const next = prev.map((x) => (shouldBeDefault ? { ...x, isDefault: false } : x));
      return [...next, { ...addr, isDefault: Boolean(shouldBeDefault) }];
    });
    return addr;
  }, []);

  const removeAddress = useCallback((id: string) => {
    setAddresses((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const defaultAddress = useMemo(
    () => addresses.find((a) => a.isDefault) ?? addresses[0] ?? null,
    [addresses],
  );

  // ── Recent searches ───────────────────────────────────
  const addRecentSearch = useCallback((q: string) => {
    const term = q.trim();
    if (!term) return;
    setRecentSearches((prev) => [term, ...prev.filter((t) => t.toLowerCase() !== term.toLowerCase())].slice(0, 8));
  }, []);
  const clearRecentSearches = useCallback(() => setRecentSearches([]), []);

  // TODO: Sync cart/orders/user with backend when API layer is added.
  // Reference PRODUCTS to prevent "unused import" if backend replaces local data.
  void PRODUCTS;

  const value: AppState = {
    hydrated,
    user,
    isAuthenticated: !!user && !user.isGuest,
    hasSeenOnboarding,
    setOnboarded,
    loginWithMobile,
    loginAsGuest,
    logout,
    cart,
    cartCount,
    cartSubtotal,
    deliveryFee,
    cartTotal,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getQuantity,
    orders,
    placeOrder,
    getOrderById,
    addresses,
    addAddress,
    removeAddress,
    defaultAddress,
    recentSearches,
    addRecentSearch,
    clearRecentSearches,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = (): AppState => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
};
