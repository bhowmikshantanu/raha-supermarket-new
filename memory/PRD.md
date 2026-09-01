# Raha Supermarket — Product Requirements (Phase 1)

## Vision
Rebrandable production-quality Android grocery commerce app for Raha Supermarket
(Ward No. 8, Gularbhoj Road, WhatsApp 8130011378). Same codebase can be rebranded
for other local supermarkets by editing `src/config/brand.ts`, `src/config/theme.ts`,
and `src/data/products.ts` / `categories.ts`.

## Tech
- React Native (Expo SDK 54) + TypeScript
- expo-router file-based routing
- Local mock data (Phase 1), backend/API layer scaffolded via `AppContext` for future swap
- Persistence via `@/src/utils/storage` (AsyncStorage on native)

## Phase 1 Screens Implemented
- Splash / bootstrap (`app/index.tsx`)
- Onboarding (`app/onboarding.tsx`) — 3 slides, Skip/Continue
- Login (`app/login.tsx`) + OTP (`app/otp.tsx`, mock code `1234`) + Guest browsing
- Bottom tabs: Home, Categories, Cart, Orders, Profile (`app/(tabs)/`)
- Product listing (`app/products.tsx`) — grid/list, sort, in-stock filter, category chips
- Product details (`app/product/[id].tsx`) — Add to Cart, Buy Now, similar products
- Search (`app/search.tsx`) — recent searches, suggestions, empty state
- Checkout (`app/checkout.tsx`) — validated address form, COD, online (Coming Soon)
- Order confirmation (`app/order-confirmation.tsx`) — order ID, ETA, address
- Order details (`app/order/[id].tsx`) — timeline status
- Saved addresses (`app/addresses.tsx`)
- Legal (`app/legal/privacy.tsx`, `app/legal/terms.tsx`)

## Business Logic
- Delivery: ₹50 below ₹500, FREE at ₹500+ (shown as progress bar)
- Stock enforcement (blocks add/increment beyond `product.stock`)
- Store open/closed derived from `BRAND.storeHours` (10 AM–8 PM)
- Currency: INR with `en-IN` grouping; phone: +91 5-5 grouping
- Cart empty state blocks checkout; guest can browse

## Data Model (`src/types/index.ts`)
`Category`, `Product`, `CartItem`, `Address`, `Order` (with `OrderStatus` enum),
`OrderItem`, `User`. Role-ready via `UserRole` (`customer` | `admin` | `delivery`).

## Excluded (Phase 1 by design)
- Live payment gateway (Online = Coming Soon)
- Live GPS tracking
- Push notifications
- Full admin panel (data models are prepared; TODO comments left)
- Full backend (LocalStorage only)

## Key Files for Rebranding
- `src/config/brand.ts` — name, phone, address, hours, delivery rules
- `src/config/theme.ts` — palette + spacing
- `src/data/products.ts` + `categories.ts` — catalog

## Final Stabilization Pass (Sept 2026 session)
- Admin Orders: full rider visibility (Assigned to / Delivered by + mobile, vehicle, assigned/delivered timestamps); "Change delivery boy" on assigned orders; no assign button after delivery.
- Fixed auth-clobbering race: anonymous sign-in now waits for persisted admin/rider session restore (firebaseOrders.ts, pushNotifications.ts).
- Root route (app/index.tsx) restored to customer splash/bootstrap (was redirecting to /admin/login). Staff Login row added to customer Profile; "Open Admin Panel" button removed from customer home.
- Customer live-order sync gated to anonymous (customer) sessions only — no more Firestore permission errors under staff logins.
- Firebase native auth persistence restored TS-safely (AsyncStorage on native, indexedDB on web).
- expo-notifications fully guarded on web; cancellation confirm works on web via window.confirm.
- Backend GET /api/status is now a Mongo-independent health check (needs Railway redeploy to go live).
- Expo Doctor 18/18 (removed stale package-lock.json, pinned expo-constants 18.0.14, moved android/ -> android-native-backup for CNG builds). TypeScript 0 errors.
- E2E verified: RH86393684 placed(COD)->confirmed->assigned(Pradeep)->out-for-delivery->delivered; RH86870665 placed->cancelled by customer. Delivered sales ₹1,510 / 2 orders.
- Firestore rules reviewed (deployed ruleset): role-scoped, least-privilege, field-whitelisted rider transitions — no changes needed.
