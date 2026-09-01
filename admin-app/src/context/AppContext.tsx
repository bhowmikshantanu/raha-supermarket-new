import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  cancelFirebaseOrder,
  createFirebaseOrder,
  subscribeToCustomerOrders,
} from "@/src/services/firebaseOrders";
import { auth } from "@/src/config/firebase";
import { BRAND } from "@/src/config/brand";
import { useProducts } from "@/src/context/ProductContext";
import type {
  Address,
  CartItem,
  Order,
  OrderItem,
  User,
} from "@/src/types";
import { storage } from "@/src/utils/storage";

export type AppNotificationType =
  | "order"
  | "offer"
  | "wishlist"
  | "system";

export interface AppNotification {
  id: string;
  type: AppNotificationType;
  title: string;
  message: string;
  createdAt: number;
  isRead: boolean;
  orderId?: string;
  productId?: string;
  actionRoute?: string;
}

export interface CreateNotificationInput {
  type: AppNotificationType;
  title: string;
  message: string;
  orderId?: string;
  productId?: string;
  actionRoute?: string;
}

// Storage keys
const K_USER = "raha.user.v1";
const K_CART = "raha.cart.v1";
const K_ORDERS = "raha.orders.v1";
const K_ADDRESSES = "raha.addresses.v1";
const K_RECENT_SEARCHES = "raha.recentSearches.v1";
const K_ONBOARDED = "raha.onboarded.v1";
const K_WISHLIST = "raha.wishlist.v1";
const K_NOTIFICATIONS = "raha.notifications.v1";
const K_SAVED_FOR_LATER = "raha.savedForLater.v1";

interface AppState {
  hydrated: boolean;

  products: ReturnType<typeof useProducts>["products"];
  productsLoading: ReturnType<typeof useProducts>["loading"];
  getLiveProductById: ReturnType<
    typeof useProducts
  >["getProductById"];

  user: User | null;
  isAuthenticated: boolean;
  hasSeenOnboarding: boolean;
  setOnboarded: () => Promise<void>;
  loginWithMobile: (mobile: string, name?: string) => Promise<void>;
  loginAsGuest: () => Promise<void>;
  logout: () => Promise<void>;

  cart: CartItem[];
  cartCount: number;
  cartSubtotal: number;
  deliveryFee: number;
  cartTotal: number;
  addToCart: (
    productId: string,
    qty?: number,
  ) => {
    ok: boolean;
    message?: string;
  };
  removeFromCart: (productId: string) => void;
  updateQuantity: (
    productId: string,
    qty: number,
  ) => {
    ok: boolean;
    message?: string;
  };
  clearCart: () => void;
  getQuantity: (productId: string) => number;

  savedForLater: CartItem[];
  savedForLaterCount: number;
  isSavedForLater: (productId: string) => boolean;
  saveForLater: (
    productId: string,
  ) => {
    ok: boolean;
    message?: string;
  };
  moveSavedItemToCart: (
    productId: string,
  ) => {
    ok: boolean;
    message?: string;
  };
  removeSavedItem: (productId: string) => void;
  clearSavedForLater: () => void;

  orders: Order[];
  placeOrder: (
    address: Address,
    paymentMethod: "cod" | "online",
  ) => Order | null;
  getOrderById: (id: string) => Order | undefined;
  reorderOrder: (
    id: string,
  ) => {
    ok: boolean;
    message?: string;
    addedCount?: number;
  };
  cancelOrder: (
    id: string,
  ) => {
    ok: boolean;
    message?: string;
  };

  wishlist: string[];
  wishlistCount: number;
  isWishlisted: (productId: string) => boolean;
  toggleWishlist: (
    productId: string,
  ) => {
    added: boolean;
    message: string;
  };
  removeFromWishlist: (productId: string) => void;
  clearWishlist: () => void;

  notifications: AppNotification[];
  unreadNotificationCount: number;
  addNotification: (
    notification: CreateNotificationInput,
  ) => AppNotification;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  deleteNotification: (id: string) => void;
  clearNotifications: () => void;

  addresses: Address[];
  addAddress: (address: Omit<Address, "id">) => Address;
  updateAddress: (
    id: string,
    address: Omit<Address, "id">,
  ) => {
    ok: boolean;
    message?: string;
  };
  removeAddress: (id: string) => void;
  setDefaultAddress: (
    id: string,
  ) => {
    ok: boolean;
    message?: string;
  };
  defaultAddress: Address | null;

  recentSearches: string[];
  addRecentSearch: (query: string) => void;
  clearRecentSearches: () => void;
}

const AppContext = createContext<AppState | null>(null);

export const AppProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const {
    products,
    loading: productsLoading,
    getProductById,
  } = useProducts();

  const [hydrated, setHydrated] = useState(false);

  const [user, setUser] = useState<User | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [savedForLater, setSavedForLater] = useState<
    CartItem[]
  >([]);
  const [notifications, setNotifications] = useState<
    AppNotification[]
  >([]);

  useEffect(() => {
    const hydrateApp = async () => {
      const [u, c, o, a, r, onb, w, n, s] =
        await Promise.all([
          storage.getItem<string>(K_USER, ""),
          storage.getItem<string>(K_CART, ""),
          storage.getItem<string>(K_ORDERS, ""),
          storage.getItem<string>(K_ADDRESSES, ""),
          storage.getItem<string>(K_RECENT_SEARCHES, ""),
          storage.getItem<boolean>(K_ONBOARDED, false),
          storage.getItem<string>(K_WISHLIST, ""),
          storage.getItem<string>(K_NOTIFICATIONS, ""),
          storage.getItem<string>(K_SAVED_FOR_LATER, ""),
        ]);

      try {
        if (u) {
          const parsedUser = JSON.parse(u) as User | null;
          setUser(parsedUser);
        }
      } catch {}

      try {
        if (c) {
          const parsedCart = JSON.parse(c) as CartItem[];
          setCart(Array.isArray(parsedCart) ? parsedCart : []);
        }
      } catch {}

      try {
        if (o) {
          const parsedOrders = JSON.parse(o) as Order[];
          setOrders(Array.isArray(parsedOrders) ? parsedOrders : []);
        }
      } catch {}

      try {
        if (a) {
          const parsedAddresses = JSON.parse(a) as Address[];

          if (Array.isArray(parsedAddresses)) {
            const hasDefault = parsedAddresses.some(
              (address) => address.isDefault,
            );

            if (parsedAddresses.length > 0 && !hasDefault) {
              setAddresses(
                parsedAddresses.map((address, index) => ({
                  ...address,
                  isDefault: index === 0,
                })),
              );
            } else {
              setAddresses(parsedAddresses);
            }
          }
        }
      } catch {}

      try {
        if (r) {
          const parsedSearches = JSON.parse(r) as string[];
          setRecentSearches(
            Array.isArray(parsedSearches) ? parsedSearches : [],
          );
        }
      } catch {}

      try {
        if (w) {
          const parsedWishlist = JSON.parse(w) as string[];
          setWishlist(
            Array.isArray(parsedWishlist) ? parsedWishlist : [],
          );
        }
      } catch {}

      try {
        if (s) {
          const parsedSavedItems = JSON.parse(
            s,
          ) as CartItem[];

          if (Array.isArray(parsedSavedItems)) {
            setSavedForLater(
              parsedSavedItems.filter(
                (item) =>
                  item &&
                  typeof item.productId === "string" &&
                  typeof item.quantity === "number" &&
                  item.quantity > 0,
              ),
            );
          }
        }
      } catch {}

      try {
        if (n) {
          const parsedNotifications = JSON.parse(
            n,
          ) as AppNotification[];

          if (Array.isArray(parsedNotifications)) {
            setNotifications(
              parsedNotifications
                .filter(
                  (notification) =>
                    notification &&
                    typeof notification.id === "string" &&
                    typeof notification.title === "string" &&
                    typeof notification.message === "string",
                )
                .map((notification) => ({
                  ...notification,
                  createdAt:
                    typeof notification.createdAt === "number"
                      ? notification.createdAt
                      : Date.now(),
                  isRead: Boolean(notification.isRead),
                }))
                .sort((first, second) =>
                  second.createdAt - first.createdAt,
                ),
            );
          }
        }
      } catch {}

      setHasSeenOnboarding(Boolean(onb));
      setHydrated(true);
    };

    void hydrateApp();
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    /*
     * Customer live-order sync must run ONLY for customer sessions
     * (anonymous or no persisted user). Admin/delivery riders sign in
     * with email+password; running the customerUid query under a staff
     * session violates Firestore rules and floods the console with
     * "Missing or insufficient permissions".
     */
    let unsubscribeOrders: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (unsubscribeOrders) {
        return; // already subscribed once
      }

      if (firebaseUser && !firebaseUser.isAnonymous) {
        // Staff session (admin / delivery). Skip customer order sync.
        return;
      }

      unsubscribeOrders = subscribeToCustomerOrders(
        (firebaseOrders) => {
          setOrders(firebaseOrders);
        },
        (error) => {
          console.error(
            "Live orders sync failed:",
            error,
          );
        },
      );
    });

    return () => {
      unsubscribeAuth();
      unsubscribeOrders?.();
    };
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated) return;

    void storage.setItem(K_USER, JSON.stringify(user));
  }, [user, hydrated]);

  useEffect(() => {
    if (!hydrated) return;

    void storage.setItem(K_CART, JSON.stringify(cart));
  }, [cart, hydrated]);

  useEffect(() => {
    if (!hydrated) return;

    void storage.setItem(K_ORDERS, JSON.stringify(orders));
  }, [orders, hydrated]);

  useEffect(() => {
    if (!hydrated) return;

    void storage.setItem(K_ADDRESSES, JSON.stringify(addresses));
  }, [addresses, hydrated]);

  useEffect(() => {
    if (!hydrated) return;

    void storage.setItem(
      K_RECENT_SEARCHES,
      JSON.stringify(recentSearches),
    );
  }, [recentSearches, hydrated]);

  useEffect(() => {
    if (!hydrated) return;

    void storage.setItem(K_WISHLIST, JSON.stringify(wishlist));
  }, [wishlist, hydrated]);

  useEffect(() => {
    if (!hydrated) return;

    void storage.setItem(
      K_SAVED_FOR_LATER,
      JSON.stringify(savedForLater),
    );
  }, [savedForLater, hydrated]);

  useEffect(() => {
    if (!hydrated) return;

    void storage.setItem(
      K_NOTIFICATIONS,
      JSON.stringify(notifications),
    );
  }, [notifications, hydrated]);

  const setOnboarded = useCallback(async () => {
    setHasSeenOnboarding(true);
    await storage.setItem(K_ONBOARDED, true);
  }, []);

  const loginWithMobile = useCallback(
    async (mobile: string, name?: string) => {
      setUser({
        mobile,
        name,
        isGuest: false,
      });
    },
    [],
  );

  const loginAsGuest = useCallback(async () => {
    setUser({
      mobile: "",
      isGuest: true,
    });
  }, []);

  const logout = useCallback(async () => {
    setUser(null);
    setCart([]);
    setSavedForLater([]);
  }, []);

  const getQuantity = useCallback(
    (productId: string) =>
      cart.find((item) => item.productId === productId)?.quantity ??
      0,
    [cart],
  );

  const addToCart = useCallback(
    (
      productId: string,
      qty = 1,
    ): {
      ok: boolean;
      message?: string;
    } => {
      const product = getProductById(productId);

      if (!product) {
        return {
          ok: false,
          message: "Product not found.",
        };
      }

      if (product.stock <= 0) {
        return {
          ok: false,
          message: "This product is out of stock.",
        };
      }

      if (qty <= 0) {
        return {
          ok: false,
          message: "Quantity must be greater than zero.",
        };
      }

      const existing = cart.find(
        (item) => item.productId === productId,
      );

      const currentQuantity = existing?.quantity ?? 0;
      const nextQuantity = currentQuantity + qty;

      if (nextQuantity > product.stock) {
        return {
          ok: false,
          message: `Only ${product.stock} item(s) available in stock.`,
        };
      }

      setCart((previous) => {
        const found = previous.some(
          (item) => item.productId === productId,
        );

        if (found) {
          return previous.map((item) =>
            item.productId === productId
              ? {
                  ...item,
                  quantity: nextQuantity,
                }
              : item,
          );
        }

        return [
          ...previous,
          {
            productId,
            quantity: qty,
          },
        ];
      });

      return {
        ok: true,
        message: `${product.name} added to cart.`,
      };
    },
    [cart, getProductById],
  );

  const removeFromCart = useCallback((productId: string) => {
    setCart((previous) =>
      previous.filter((item) => item.productId !== productId),
    );
  }, []);

  const updateQuantity = useCallback(
    (
      productId: string,
      qty: number,
    ): {
      ok: boolean;
      message?: string;
    } => {
      const product = getProductById(productId);

      if (!product) {
        return {
          ok: false,
          message: "Product not found.",
        };
      }

      if (qty <= 0) {
        setCart((previous) =>
          previous.filter(
            (item) => item.productId !== productId,
          ),
        );

        return {
          ok: true,
        };
      }

      if (qty > product.stock) {
        return {
          ok: false,
          message: `Only ${product.stock} item(s) available in stock.`,
        };
      }

      setCart((previous) =>
        previous.map((item) =>
          item.productId === productId
            ? {
                ...item,
                quantity: qty,
              }
            : item,
        ),
      );

      return {
        ok: true,
      };
    },
    [getProductById],
  );

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const savedForLaterCount = useMemo(
    () => savedForLater.length,
    [savedForLater],
  );

  const isSavedForLater = useCallback(
    (productId: string) =>
      savedForLater.some(
        (item) => item.productId === productId,
      ),
    [savedForLater],
  );

  const saveForLater = useCallback(
    (
      productId: string,
    ): {
      ok: boolean;
      message?: string;
    } => {
      const product = getProductById(productId);

      if (!product) {
        return {
          ok: false,
          message: "Product not found.",
        };
      }

      const cartItem = cart.find(
        (item) => item.productId === productId,
      );

      if (!cartItem) {
        return {
          ok: false,
          message: "This product is not in your cart.",
        };
      }

      setSavedForLater((previous) => {
        const existing = previous.find(
          (item) => item.productId === productId,
        );

        if (existing) {
          return previous.map((item) =>
            item.productId === productId
              ? {
                  ...item,
                  quantity: Math.max(
                    item.quantity,
                    cartItem.quantity,
                  ),
                }
              : item,
          );
        }

        return [
          {
            productId,
            quantity: cartItem.quantity,
          },
          ...previous,
        ];
      });

      setCart((previous) =>
        previous.filter(
          (item) => item.productId !== productId,
        ),
      );

      return {
        ok: true,
        message: `${product.name} saved for later.`,
      };
    },
    [cart, getProductById],
  );

  const moveSavedItemToCart = useCallback(
    (
      productId: string,
    ): {
      ok: boolean;
      message?: string;
    } => {
      const product = getProductById(productId);

      if (!product) {
        return {
          ok: false,
          message: "Product not found.",
        };
      }

      const savedItem = savedForLater.find(
        (item) => item.productId === productId,
      );

      if (!savedItem) {
        return {
          ok: false,
          message: "Saved item not found.",
        };
      }

      if (product.stock <= 0) {
        return {
          ok: false,
          message: "This product is currently out of stock.",
        };
      }

      const existingCartItem = cart.find(
        (item) => item.productId === productId,
      );

      const existingQuantity =
        existingCartItem?.quantity ?? 0;

      const availableQuantity = Math.max(
        0,
        product.stock - existingQuantity,
      );

      const quantityToMove = Math.min(
        savedItem.quantity,
        availableQuantity,
      );

      if (quantityToMove <= 0) {
        return {
          ok: false,
          message: `Only ${product.stock} item(s) available in stock.`,
        };
      }

      setCart((previous) => {
        const existingIndex = previous.findIndex(
          (item) => item.productId === productId,
        );

        if (existingIndex >= 0) {
          return previous.map((item) =>
            item.productId === productId
              ? {
                  ...item,
                  quantity:
                    item.quantity + quantityToMove,
                }
              : item,
          );
        }

        return [
          ...previous,
          {
            productId,
            quantity: quantityToMove,
          },
        ];
      });

      setSavedForLater((previous) =>
        previous.filter(
          (item) => item.productId !== productId,
        ),
      );

      return {
        ok: true,
        message:
          quantityToMove < savedItem.quantity
            ? `${quantityToMove} item(s) moved to cart due to stock availability.`
            : `${product.name} moved to cart.`,
      };
    },
    [cart, savedForLater, getProductById],
  );

  const removeSavedItem = useCallback(
    (productId: string) => {
      setSavedForLater((previous) =>
        previous.filter(
          (item) => item.productId !== productId,
        ),
      );
    },
    [],
  );

  const clearSavedForLater = useCallback(() => {
    setSavedForLater([]);
  }, []);

  const cartCount = useMemo(
    () =>
      cart.reduce(
        (total, item) => total + item.quantity,
        0,
      ),
    [cart],
  );

  const cartSubtotal = useMemo(
    () =>
      cart.reduce((total, item) => {
        const product = getProductById(item.productId);

        if (!product) {
          return total;
        }

        return total + product.price * item.quantity;
      }, 0),
    [cart, getProductById],
  );

  const deliveryFee = useMemo(() => {
    if (cart.length === 0) {
      return 0;
    }

    return cartSubtotal >= BRAND.delivery.freeThreshold
      ? 0
      : BRAND.delivery.fee;
  }, [cart.length, cartSubtotal]);

  const cartTotal = cartSubtotal + deliveryFee;

  const placeOrder = useCallback(
    (
      address: Address,
      paymentMethod: "cod" | "online",
    ): Order | null => {
      if (cart.length === 0) {
        return null;
      }

      const items: OrderItem[] = [];

      for (const cartItem of cart) {
        const product = getProductById(
          cartItem.productId,
        );

        if (!product) {
          continue;
        }

        if (
          product.stock <= 0 ||
          cartItem.quantity > product.stock
        ) {
          return null;
        }

        items.push({
          productId: product.id,
          name: product.name,
          size: product.size,
          image: product.image,
          price: product.price,
          mrp: product.mrp,
          quantity: cartItem.quantity,
        });
      }

      if (items.length === 0) {
        return null;
      }

      const subtotal = items.reduce(
        (total, item) =>
          total + item.price * item.quantity,
        0,
      );

      const fee =
        subtotal >= BRAND.delivery.freeThreshold
          ? 0
          : BRAND.delivery.fee;

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
        estimatedDeliveryMinutes:
          BRAND.delivery.estimatedMinutes,
      };

      setOrders((previous) => [
        order,
        ...previous.filter(
          (existingOrder) =>
            existingOrder.id !== order.id,
        ),
      ]);

      setCart([]);

      void Promise.resolve().then(async () => {
        try {
          await createFirebaseOrder(order);
        } catch (error) {
          console.error(
            "Firebase order creation failed:",
            error,
          );
        }
      });

      return order;
    },
    [cart, getProductById],
  );

  const getOrderById = useCallback(
    (id: string) =>
      orders.find((order) => order.id === id),
    [orders],
  );

  const reorderOrder = useCallback(
    (
      id: string,
    ): {
      ok: boolean;
      message?: string;
      addedCount?: number;
    } => {
      const order = orders.find(
        (existingOrder) => existingOrder.id === id,
      );

      if (!order) {
        return {
          ok: false,
          message: "Order not found.",
          addedCount: 0,
        };
      }

      let addedCount = 0;
      let unavailableCount = 0;

      setCart((previous) => {
        const next = previous.map((item) => ({
          ...item,
        }));

        for (const orderItem of order.items) {
          const product = getProductById(
            orderItem.productId,
          );

          if (!product || product.stock <= 0) {
            unavailableCount += orderItem.quantity;
            continue;
          }

          const existingIndex = next.findIndex(
            (item) =>
              item.productId === orderItem.productId,
          );

          const existingQuantity =
            existingIndex >= 0
              ? next[existingIndex].quantity
              : 0;

          const availableQuantity = Math.max(
            0,
            product.stock - existingQuantity,
          );

          const quantityToAdd = Math.min(
            orderItem.quantity,
            availableQuantity,
          );

          if (quantityToAdd <= 0) {
            unavailableCount += orderItem.quantity;
            continue;
          }

          if (existingIndex >= 0) {
            next[existingIndex] = {
              ...next[existingIndex],
              quantity:
                existingQuantity + quantityToAdd,
            };
          } else {
            next.push({
              productId: orderItem.productId,
              quantity: quantityToAdd,
            });
          }

          addedCount += quantityToAdd;

          if (quantityToAdd < orderItem.quantity) {
            unavailableCount +=
              orderItem.quantity - quantityToAdd;
          }
        }

        return next;
      });

      if (addedCount === 0) {
        return {
          ok: false,
          message:
            "These products are unavailable or already at the maximum stock quantity.",
          addedCount: 0,
        };
      }

      return {
        ok: true,
        addedCount,
        message:
          unavailableCount > 0
            ? `${addedCount} item(s) added. ${unavailableCount} item(s) could not be added due to stock.`
            : `${addedCount} item(s) added to your cart.`,
      };
    },
    [orders, getProductById],
  );

  const cancelOrder = useCallback(
    (
      id: string,
    ): {
      ok: boolean;
      message?: string;
    } => {
      const order = orders.find(
        (existingOrder) =>
          existingOrder.id === id,
      );

      if (!order) {
        return {
          ok: false,
          message: "Order not found.",
        };
      }

      if (order.status === "cancelled") {
        return {
          ok: false,
          message:
            "This order has already been cancelled.",
        };
      }

      if (order.status !== "placed") {
        return {
          ok: false,
          message:
            "This order can no longer be cancelled after it has been confirmed by the store.",
        };
      }

      setOrders((previous) =>
        previous.map((existingOrder) =>
          existingOrder.id === id
            ? {
                ...existingOrder,
                status: "cancelled",
              }
            : existingOrder,
        ),
      );

      void cancelFirebaseOrder(id).catch(
        (error) => {
          console.error(
            "Firebase order cancellation failed:",
            error,
          );

          // Roll back the optimistic local cancellation
          // if Firestore rejects or fails the update.
          setOrders((previous) =>
            previous.map((existingOrder) =>
              existingOrder.id === id
                ? {
                    ...existingOrder,
                    status: order.status,
                  }
                : existingOrder,
            ),
          );
        },
      );

      return {
        ok: true,
        message:
          "Order cancelled successfully.",
      };
    },
    [orders],
  );

  const wishlistCount = wishlist.length;

  const isWishlisted = useCallback(
    (productId: string) =>
      wishlist.includes(productId),
    [wishlist],
  );

  const toggleWishlist = useCallback(
    (
      productId: string,
    ): {
      added: boolean;
      message: string;
    } => {
      const product = getProductById(productId);

      if (!product) {
        return {
          added: false,
          message: "Product not found.",
        };
      }

      const alreadyWishlisted =
        wishlist.includes(productId);

      setWishlist((previous) =>
        alreadyWishlisted
          ? previous.filter((id) => id !== productId)
          : [productId, ...previous],
      );

      return {
        added: !alreadyWishlisted,
        message: alreadyWishlisted
          ? `${product.name} removed from wishlist.`
          : `${product.name} added to wishlist.`,
      };
    },
    [wishlist, getProductById],
  );

  const removeFromWishlist = useCallback(
    (productId: string) => {
      setWishlist((previous) =>
        previous.filter((id) => id !== productId),
      );
    },
    [],
  );

  const clearWishlist = useCallback(() => {
    setWishlist([]);
  }, []);

  const addNotification = useCallback(
    (
      notification: CreateNotificationInput,
    ): AppNotification => {
      const createdNotification: AppNotification = {
        ...notification,
        id: `N${Date.now()}${Math.random()
          .toString(36)
          .slice(2, 7)}`,
        createdAt: Date.now(),
        isRead: false,
      };

      setNotifications((previous) =>
        [createdNotification, ...previous].slice(0, 100),
      );

      return createdNotification;
    },
    [],
  );

  const markNotificationRead = useCallback((id: string) => {
    setNotifications((previous) =>
      previous.map((notification) =>
        notification.id === id && !notification.isRead
          ? {
              ...notification,
              isRead: true,
            }
          : notification,
      ),
    );
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications((previous) =>
      previous.map((notification) =>
        notification.isRead
          ? notification
          : {
              ...notification,
              isRead: true,
            },
      ),
    );
  }, []);

  const deleteNotification = useCallback((id: string) => {
    setNotifications((previous) =>
      previous.filter(
        (notification) => notification.id !== id,
      ),
    );
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);
    const notificationTrackingReadyRef =
    React.useRef(false);

  const previousOrdersRef = React.useRef<Order[]>([]);
  const previousWishlistRef = React.useRef<string[]>([]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    if (!notificationTrackingReadyRef.current) {
      previousOrdersRef.current = orders;
      previousWishlistRef.current = wishlist;
      notificationTrackingReadyRef.current = true;
      return;
    }

    const previousOrders = previousOrdersRef.current;

    for (const order of orders) {
      const previousOrder = previousOrders.find(
        (item) => item.id === order.id,
      );

      if (!previousOrder) {
        addNotification({
          type: "order",
          title: "Order placed successfully",
          message: `Your order ${order.id} has been placed successfully. Order total: ₹${order.total}.`,
          orderId: order.id,
          actionRoute: `/orders/${order.id}`,
        });

        continue;
      }

      if (
        previousOrder.status !== order.status &&
        order.status === "cancelled"
      ) {
        addNotification({
          type: "order",
          title: "Order cancelled",
          message: `Your order ${order.id} has been cancelled successfully.`,
          orderId: order.id,
          actionRoute: `/orders/${order.id}`,
        });

        continue;
      }

      if (
        previousOrder.status !== order.status &&
        order.status === "confirmed"
      ) {
        addNotification({
          type: "order",
          title: "Order confirmed",
          message: `Your order ${order.id} has been confirmed by Raha Supermarket.`,
          orderId: order.id,
          actionRoute: `/orders/${order.id}`,
        });

        continue;
      }

      if (
        previousOrder.status !== order.status &&
        order.status === "delivered"
      ) {
        addNotification({
          type: "order",
          title: "Order delivered",
          message: `Your order ${order.id} has been delivered successfully. Thank you for shopping with Raha Supermarket.`,
          orderId: order.id,
          actionRoute: `/orders/${order.id}`,
        });
      }
    }

    previousOrdersRef.current = orders;
  }, [orders, hydrated, addNotification]);

  useEffect(() => {
    if (
      !hydrated ||
      !notificationTrackingReadyRef.current
    ) {
      return;
    }

    const previousWishlist =
      previousWishlistRef.current;

    const newlyAddedProductIds = wishlist.filter(
      (productId) =>
        !previousWishlist.includes(productId),
    );

    const removedProductIds =
      previousWishlist.filter(
        (productId) =>
          !wishlist.includes(productId),
      );

    for (const productId of newlyAddedProductIds) {
      const product = getProductById(productId);

      if (!product) {
        continue;
      }

      addNotification({
        type: "wishlist",
        title: "Added to wishlist",
        message: `${product.name} has been saved to your wishlist.`,
        productId: product.id,
        actionRoute: `/product/${product.id}`,
      });
    }

    for (const productId of removedProductIds) {
      const product = getProductById(productId);

      if (!product) {
        continue;
      }

      addNotification({
        type: "wishlist",
        title: "Removed from wishlist",
        message: `${product.name} has been removed from your wishlist.`,
        productId: product.id,
        actionRoute: "/wishlist",
      });
    }

    previousWishlistRef.current = wishlist;
  }, [
    wishlist,
    hydrated,
    addNotification,
    getProductById,
  ]);

  

  const unreadNotificationCount = useMemo(
    () =>
      notifications.reduce(
        (count, notification) =>
          count + (notification.isRead ? 0 : 1),
        0,
      ),
    [notifications],
  );

  const addAddress = useCallback(
    (addressData: Omit<Address, "id">): Address => {
      const id = `A${Date.now()}`;

      let createdAddress: Address = {
        ...addressData,
        id,
        isDefault: Boolean(addressData.isDefault),
      };

      setAddresses((previous) => {
        const shouldBeDefault =
          previous.length === 0 ||
          Boolean(addressData.isDefault);

        createdAddress = {
          ...addressData,
          id,
          isDefault: shouldBeDefault,
        };

        const updatedPrevious = shouldBeDefault
          ? previous.map((address) => ({
              ...address,
              isDefault: false,
            }))
          : previous;

        return [
          ...updatedPrevious,
          createdAddress,
        ];
      });

      return createdAddress;
    },
    [],
  );

  const updateAddress = useCallback(
    (
      id: string,
      addressData: Omit<Address, "id">,
    ): {
      ok: boolean;
      message?: string;
    } => {
      const addressExists = addresses.some(
        (address) => address.id === id,
      );

      if (!addressExists) {
        return {
          ok: false,
          message: "Address not found.",
        };
      }

      setAddresses((previous) => {
        const makeDefault = Boolean(
          addressData.isDefault,
        );

        const updated = previous.map((address) => {
          if (address.id === id) {
            return {
              ...addressData,
              id,
              isDefault: makeDefault
                ? true
                : Boolean(address.isDefault),
            };
          }

          if (makeDefault) {
            return {
              ...address,
              isDefault: false,
            };
          }

          return address;
        });

        const hasDefault = updated.some(
          (address) => address.isDefault,
        );

        if (!hasDefault && updated.length > 0) {
          return updated.map((address) =>
            address.id === id
              ? {
                  ...address,
                  isDefault: true,
                }
              : address,
          );
        }

        return updated;
      });

      return {
        ok: true,
        message: "Address updated successfully.",
      };
    },
    [addresses],
  );

  const removeAddress = useCallback((id: string) => {
    setAddresses((previous) => {
      const removedAddress = previous.find(
        (address) => address.id === id,
      );

      const filtered = previous.filter(
        (address) => address.id !== id,
      );

      if (filtered.length === 0) {
        return [];
      }

      const hasDefault = filtered.some(
        (address) => address.isDefault,
      );

      if (
        removedAddress?.isDefault ||
        !hasDefault
      ) {
        return filtered.map((address, index) => ({
          ...address,
          isDefault: index === 0,
        }));
      }

      return filtered;
    });
  }, []);

  const setDefaultAddress = useCallback(
    (
      id: string,
    ): {
      ok: boolean;
      message?: string;
    } => {
      const addressExists = addresses.some(
        (address) => address.id === id,
      );

      if (!addressExists) {
        return {
          ok: false,
          message: "Address not found.",
        };
      }

      setAddresses((previous) =>
        previous.map((address) => ({
          ...address,
          isDefault: address.id === id,
        })),
      );

      return {
        ok: true,
        message: "Default address updated.",
      };
    },
    [addresses],
  );

  const defaultAddress = useMemo(
    () =>
      addresses.find(
        (address) => address.isDefault,
      ) ??
      addresses[0] ??
      null,
    [addresses],
  );

  const addRecentSearch = useCallback(
    (query: string) => {
      const term = query.trim();

      if (!term) {
        return;
      }

      setRecentSearches((previous) =>
        [
          term,
          ...previous.filter(
            (item) =>
              item.toLowerCase() !==
              term.toLowerCase(),
          ),
        ].slice(0, 8),
      );
    },
    [],
  );

  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
  }, []);


  const value = useMemo<AppState>(
    () => ({
      hydrated,

      products,
      productsLoading,
      getLiveProductById: getProductById,

      user,
      isAuthenticated:
        Boolean(user) && !Boolean(user?.isGuest),
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

      savedForLater,
      savedForLaterCount,
      isSavedForLater,
      saveForLater,
      moveSavedItemToCart,
      removeSavedItem,
      clearSavedForLater,

      orders,
      placeOrder,
      getOrderById,
      reorderOrder,
      cancelOrder,

      wishlist,
      wishlistCount,
      isWishlisted,
      toggleWishlist,
      removeFromWishlist,
      clearWishlist,

      notifications,
      unreadNotificationCount,
      addNotification,
      markNotificationRead,
      markAllNotificationsRead,
      deleteNotification,
      clearNotifications,

      addresses,
      addAddress,
      updateAddress,
      removeAddress,
      setDefaultAddress,
      defaultAddress,

      recentSearches,
      addRecentSearch,
      clearRecentSearches,
    }),
    [
      hydrated,
      products,
      productsLoading,
      getProductById,
      user,
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
      savedForLater,
      savedForLaterCount,
      isSavedForLater,
      saveForLater,
      moveSavedItemToCart,
      removeSavedItem,
      clearSavedForLater,
      orders,
      placeOrder,
      getOrderById,
      reorderOrder,
      cancelOrder,
      wishlist,
      wishlistCount,
      isWishlisted,
      toggleWishlist,
      removeFromWishlist,
      clearWishlist,
      notifications,
      unreadNotificationCount,
      addNotification,
      markNotificationRead,
      markAllNotificationsRead,
      deleteNotification,
      clearNotifications,
      addresses,
      addAddress,
      updateAddress,
      removeAddress,
      setDefaultAddress,
      defaultAddress,
      recentSearches,
      addRecentSearch,
      clearRecentSearches,
    ],
  );

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppState => {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error(
      "useApp must be used within AppProvider",
    );
  }

  return context;
};