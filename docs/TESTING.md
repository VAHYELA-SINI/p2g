# P2G Application Testing Report

## Overview
This document records the end-to-end verification and regression testing performed across the **Backend API**, **Mobile Application**, and **Admin Dashboard** of the P2G platform.

---

## 1. Backend Automated Test Suite

Executed via `node backend/test_comprehensive_audit.js` and dedicated test scripts (`test_error_sanitization.js`, `test_password_reset_and_notifications.js`, `test_order_tracking_flow.js`, `test_admin_dashboard.js`).

| Test | Result | Fix Implemented | Known Limitation |
| :--- | :---: | :--- | :--- |
| **Health** | **PASS** | Evaluated API status `ok` and MongoDB connection state `connected`. | None. |
| **Registration** | **PASS** | Validated customer registration with name, email, phone, and hashed password. | Requires internet connectivity for MongoDB Atlas. |
| **Privilege Escalation Prevention** | **PASS** | Prevented arbitrary public callers from supplying `role: 'ADMIN'`; requires `ADMIN_REGISTRATION_KEY`. | Legitimate administrative setup must supply `ADMIN_REGISTRATION_KEY`. |
| **Duplicate registration** | **PASS** | Returns HTTP 409 Conflict when attempting to register with an existing normalized email. | None. |
| **Login** | **PASS** | Returns signed HS256 JWT and sanitized user profile upon valid credentials. | None. |
| **Invalid login** | **PASS** | Added constant-time dummy bcrypt comparison to eliminate timing leakage / user enumeration. | None. |
| **Authentication** | **PASS** | Protected routes verify Bearer token and retrieve authenticated user profile (`GET /api/auth/me`). | Session expiration requires re-authentication. |
| **Invalid JWT** | **PASS** | Malformed or improperly signed tokens are rejected with HTTP 401 Unauthorized. | None. |
| **Authorization** | **PASS** | Customer accounts attempting to call Admin endpoints are rejected with HTTP 403 Forbidden. | None. |
| **Admin authorization** | **PASS** | Verified administrators with role `ADMIN` can access administrative directories and KPI endpoints. | Role is verified on backend, never trusted from frontend claims. |
| **Product CRUD** | **PASS** | Admin creates, reads, updates, and deletes products with pricing, category, and inventory stock. | Image upload requires Cloudinary credentials in production. |
| **Category CRUD** | **PASS** | Admin manages categories, slugs, descriptions, and activation/deactivation status. | None. |
| **Search** | **PASS** | Applied `escapeRegex()` in `productService.js` to prevent ReDoS and regex special character crashes. | Full-text search uses MongoDB indexed regex queries. |
| **Filtering** | **PASS** | Filter products by category, price ranges (`minPrice`, `maxPrice`), and availability. | Pagination capped at 100 items per page. |
| **Cloudinary upload** | **PASS** | In-memory buffer upload via Multer (max 5MB, strict image MIME types). | In local development without credentials, falls back to simulated URLs. |
| **Cloudinary Scoped Deletion** | **PASS** | Restricted `deleteImage` to `p2g/` prefix; external asset IDs return HTTP 400 Bad Request. | None. |
| **Order creation** | **PASS** | Server-authoritative calculations for subtotal, delivery fee (₦1,000), and inventory deduction. | None. |
| **Invalid order** | **PASS** | Orders requesting quantities greater than available stock are rejected with HTTP 400 Bad Request. | None. |
| **Price manipulation** | **PASS** | Client-supplied prices and subtotals are stripped by Zod and ignored in favor of database prices. | None. |
| **Order ownership** | **PASS** | Blocked Customer B from retrieving Customer A's order details with HTTP 403 Forbidden. | None. |
| **Cancellation** | **PASS** | Cancelled orders restore product stock to inventory and update status timeline history. | Prepared and dispatched orders cannot be cancelled. |
| **Admin order updates** | **PASS** | Added `updateOrderStatusSchema` Zod validation; status transitions to PREPARING, READY, etc. | None. |
| **Paystack initialization** | **PASS** | Generates unique reference (`P2G_ORD_...`) and returns authorization URL. | In test mode without live Paystack key, generates test authorization URL. |
| **Paystack verification** | **PASS** | Authoritatively verifies payment status and transitions order to PAID & CONFIRMED. | None. |
| **Payment Verification IDOR** | **PASS** | Enforced that only the order owner or store ADMIN can call `GET /api/payments/verify/:reference`. | None. |
| **Webhook validation** | **PASS** | Verifies HMAC-SHA512 signature using `crypto.timingSafeEqual` and `req.rawBody`. | Paystack IP whitelisting can be added at reverse proxy level. |
| **Duplicate webhook** | **PASS** | Webhooks on already-paid orders return `alreadyPaid: true` without double-mutating records. | None. |
| **Amount mismatch** | **PASS** | Rejects webhooks with amount mismatch (e.g. underpaid transactions) with HTTP 400 Bad Request. | None. |
| **Reference mismatch** | **PASS** | Rejects webhooks where transaction reference is bound to an order differing from metadata. | None. |
| **Password reset** | **PASS** | Mailtrap password reset flow with 32-byte cryptographically secure token hashed in database. | Token expires after 15 minutes and is single-use. |
| **NoSQL injection** | **PASS** | Mounted `mongoSanitize` middleware to recursively strip `$ne`, `$gt`, and `.` keys from requests. | None. |

---

## 2. Mobile Automated Test Suite

Executed via `node mobile/test_mobile_audit.mjs` and `mobile/test_cart.mjs`.

| Test | Result | Fix Implemented | Known Limitation |
| :--- | :---: | :--- | :--- |
| **Launch** | **PASS** | Initializes monochrome design tokens, typography, and sets up API interceptors. | None. |
| **Register** | **PASS** | Registers customer account, stores JWT token in SecureStore, updates Zustand state. | None. |
| **Login** | **PASS** | Authenticates credentials, stores token in hardware SecureStore, updates user context. | None. |
| **Logout** | **PASS** | Clears user state, removes token from SecureStore, and purges `cartStore` items. | None. |
| **Session restoration** | **PASS** | Restores authenticated session from SecureStore on startup via `apiClient.get('/auth/me')`. | If JWT has expired, user is smoothly transitioned to login screen. |
| **Products** | **PASS** | Renders product catalog with monochrome cards, stock badges, and formatted currency. | None. |
| **Categories** | **PASS** | Loads category filter pills and navigates to categorized product listings. | None. |
| **Search** | **PASS** | Debounced search bar filters catalog by name and description without regex errors. | None. |
| **Product details** | **PASS** | Displays product imagery, price, stock availability, and quantity stepper. | None. |
| **Cart** | **PASS** | Manages line items, calculates subtotal and delivery fee, supports item additions/removals. | None. |
| **Checkout** | **PASS** | Generates authoritative checkout payload with customer delivery information. | Requires at least 1 item in cart. |
| **Payment** | **PASS** | Opens Paystack WebView modal, handles 3DS authentication, and listens for redirect callbacks. | Requires WebView component in native environments. |
| **Orders** | **PASS** | Renders customer order history with monochrome status badges and timestamps. | None. |
| **Order details** | **PASS** | Displays items purchased, quantities, pricing breakdown, and visual status timeline. | None. |
| **Profile** | **PASS** | Displays profile data and allows customer to update name and phone number. | Email update is restricted to prevent account hijacking. |
| **Password change** | **PASS** | Requires current password, enforces minimum length 8, and updates user password. | None. |
| **Errors** | **PASS** | Formats error banners cleanly without displaying raw stack traces or database errors. | None. |
| **Network failure** | **PASS** | Axios interceptor detects offline/timeout errors and displays user-friendly retry message. | None. |

---

## 3. Admin Dashboard Automated Test Suite

Executed via `node admin/test_admin_audit.mjs` and verified with `npm.cmd run build` in `admin/`.

| Test | Result | Fix Implemented | Known Limitation |
| :--- | :---: | :--- | :--- |
| **Login** | **PASS** | Admin authentication validates `ADMIN` role and persists token in browser `localStorage`. | Non-admin users rejected with clear error banner. |
| **Dashboard** | **PASS** | KPI cards display total orders, pending orders, completed orders, and total sales. | None. |
| **Products** | **PASS** | Full catalog CRUD: list, search, create, edit prices/stock, delete, and toggle availability. | Cloudinary credentials needed for live image upload. |
| **Categories** | **PASS** | Manage product categories, slugs, descriptions, and activation/deactivation states. | None. |
| **Orders** | **PASS** | Lists all customer orders, filters by status, and updates delivery lifecycle stages. | Status cannot be reverted backwards once delivered. |
| **Customers** | **PASS** | Customer directory with total orders count and aggregated lifetime spend metrics. | Customer accounts cannot be deleted directly if order history exists. |
| **Payments** | **PASS** | Log of payment references, amounts, channels, and verified transaction statuses. | None. |
| **Profile** | **PASS** | Admin profile editing (name, phone) and administrative password change. | Requires current password. |
| **Unauthorized access** | **PASS** | Protected routes redirect unauthorized or logged-out users to `/login` with 403 enforcement. | None. |

---

## 4. Known Limitations & Dependencies

1. **Mobile Build Indirect Dependencies**:
   - `npm audit` on `mobile/` flags 13 moderate vulnerabilities in indirect devDependencies (`@expo/cli` -> `uuid` and `expo-router` -> `query-string` -> `decode-uri-component`).
   - Running `npm audit fix --force` would downgrade Expo to legacy v46 which is incompatible with React 19 and Expo Router 57.
   - These warnings exist exclusively in the development toolchain CLI and do not impact runtime client security or backend server security.
2. **Mailtrap SMTP Credentials**:
   - In production, real SMTP credentials (`EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASSWORD`) must be supplied in `.env`. When unset, password reset tokens are safely logged to console in development mode.
3. **Paystack Mock Simulation**:
   - In local development or automated test runners without live secret keys, `USE_PAYSTACK_MOCK=true` simulates Paystack webhook callbacks and transaction verifications authoritatively.
