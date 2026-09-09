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

## COD Release Validation (Iteration 4, fork)
- E2E UI lifecycle re-verified on live Firebase by testing agent: RH88275952 placed(COD)->confirmed->assigned(Pradeep)->reassigned->out-for-delivery->delivered; rider saw only assigned orders; admin shows "Delivered by Pradeep" history.
- Firestore rules probed with anon/rider/admin tokens (23 least-privilege checks PASS). Railway backend auth guards + Firebase Admin verified live.
- Fixed: customer-orders listener now torn down when a staff (admin/rider) session signs in on the same client (AppContext) — no more "Missing or insufficient permissions" on staff dashboards.
- Fixed: ESLint 0 errors (HomeHeader quotes). TS 0 errors. Expo Doctor 18/18.
- Replaced Emergent template icon/adaptive-icon/favicon/splash with branded green "R" assets (app.json splash -> splash-icon.png).
- Open decision before first Play upload: android.package is still `com.emergent.localgroceryapp.g49uwf` (permanent once published; google-services.json must match if changed). Railway `/api/status` still old deploy (503) — app does not use it.

## Iteration 5 — Final Completion + Audit Pass (fork, June 2026)
- Product images migrated Cloudinary → Firebase Storage (single-product form + NEW bulk per-row uploads). Old http/Cloudinary URLs still render; no mass migration.
- Admin Bulk Import: per-row image attach — Web=local file, Android=Gallery/Camera → Firebase Storage → row.image → Firestore on import. Import blocked while any row uploading.
- Bulk template download made Android-safe (base64 + expo-file-system/legacy + expo-sharing); web keeps browser download.
- Razorpay TEST-mode online payment added: backend /api/payments/razorpay/create-order + /verify (HMAC SHA-256, secret backend-only, amount in paise authoritative, idempotent, paymentOrders/{id} in Firestore). Client payments.ts + razorpayCheckout.ts (web checkout.js + native react-native-razorpay). Checkout online path finalizes order only after server verify; cancel/fail keeps cart.
- Order gained optional paymentStatus/razorpayOrderId/razorpayPaymentId/paidAt (backward-compatible).
- Android bottom tab bar resized to compact-but-readable (h52/icon22/label11, insets.bottom padding).
- Deps: expo-image-picker, expo-file-system, react-native-razorpay. app.json camera/photo permissions + expo-image-picker plugin.
- PENDING USER MANUAL CONFIG (runtime-blocking): (1) deploy /app/backend/storage.rules to Firebase Storage; (2) set RAZORPAY_KEY_ID + RAZORPAY_KEY_SECRET on Railway backend and redeploy. Native Razorpay needs a dev/prod build (not Expo Go). EXPO_PUBLIC_RAZORPAY_KEY_ID is optional (client gets key_id from create-order response).
- Static: tsc 0 errors, ESLint 0 on changed files, web+android bundles compile. Frontend regression (testing agent, iteration_5): COD lifecycle intact (RH74738807), checkout UI, bulk per-row image buttons, tab bar — ALL PASS.
