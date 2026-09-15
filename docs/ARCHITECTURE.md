# P2G Architecture

## 1. System architecture

P2G is a single-vendor platform with three deployable applications:

```text
Customer mobile app ─┐
                     ├── HTTPS REST API ── MongoDB Atlas
Admin web dashboard ─┘        │
                              ├── Paystack
                              └── Cloudinary
```

The mobile app is the customer interface. The web dashboard is restricted to the business administrator. The Express API is the sole authority for business rules, authorization, pricing, order status, payment verification, and access to external services.

## 2. Mobile architecture

The customer app will use React Native with Expo and Expo Router. File-based routes will separate public authentication screens from authenticated customer routes. UI components will call an Axios API client rather than access backend endpoints directly. Zustand will own client-side state such as the cart; Expo SecureStore will hold the JWT.

Planned layout:

```text
mobile/
├── app/
│   ├── _layout.jsx
│   ├── (auth)/
│   └── (app)/
└── src/
    ├── api/
    ├── components/
    ├── hooks/
    ├── store/
    ├── context/
    └── utils/
```

Expo Router provides the navigation container; no additional root `NavigationContainer` will be introduced. The public API base URL and Paystack public key will be supplied through Expo public environment configuration. No server secret may enter the mobile app.

## 3. Backend architecture

The backend will be a Node.js and Express REST API with a modular, layered structure:

```text
backend/
└── src/
    ├── config/       # Database and third-party configuration
    ├── controllers/  # HTTP request and response handling
    ├── middleware/   # Authentication, authorization, errors, limits
    ├── models/       # Mongoose schemas
    ├── routes/       # Endpoint declarations only
    ├── services/     # Business rules and external integrations
    ├── utils/        # Shared helpers
    ├── validators/   # Zod request validation
    ├── app.js
    └── server.js
```

Routes remain thin: controllers coordinate requests and services contain business logic. Central middleware will handle validation failures, expected application errors, unknown errors, 404 responses, security headers, CORS, logging, and rate limits.

## 4. Admin architecture

The admin dashboard will be a React and Vite single-page application using React Router. It will use the same API through an Axios client and present protected routes only to authenticated `ADMIN` users.

Planned layout:

```text
admin/
└── src/
    ├── api/
    ├── components/
    ├── pages/
    ├── routes/
    ├── features/
    └── utils/
```

The dashboard manages categories, products, orders, customers, and payment information. It never connects directly to MongoDB, Paystack, or Cloudinary.

## 5. Database architecture

MongoDB Atlas, accessed through Mongoose, will store the application data. Planned core entities are:

| Entity | Responsibility |
| --- | --- |
| User | Customer or administrator identity and account state |
| Category | Product grouping, visibility, order, and image metadata |
| Product | Sellable item, price, availability, stock, category, and image metadata |
| Order | Customer purchase snapshot, delivery details, calculated totals, payment reference, and lifecycle state |

Products reference categories. Orders reference customers and store immutable item snapshots so historical orders remain accurate after a product changes. There is no vendor collection and no `vendorId` field.

## 6. Authentication architecture

The backend will hash passwords with bcrypt and issue signed JWTs after successful registration or login. JWT secrets and expiry values will be server-only environment values. Middleware will validate bearer tokens, attach the authenticated user, and reject inactive accounts.

The mobile app will store its token with Expo SecureStore. The admin dashboard will use a deliberately chosen secure token/session strategy during its implementation phase; it must not expose credentials in URLs or logs. API responses must omit password hashes and other sensitive fields.

## 7. Authorization architecture

Two roles are planned: `CUSTOMER` and `ADMIN`.

- Customers may manage their own account and view only their own orders.
- Administrators may manage products, categories, customers, and all orders.
- Public users may read only active categories and available products.

Backend authorization is mandatory for all protected operations; hiding an admin control in either client is never treated as authorization.

## 8. Payment architecture

The backend will initialize Paystack transactions using the server-side secret key. The client receives only the data necessary to continue the hosted payment flow. Paystack webhooks and/or server-to-server verification will determine the final payment result.

Order totals, prices, availability, payment status, and payment references are validated or calculated by the backend. A client-side "success" result never marks an order paid.

## 9. Image upload architecture

Product and category media will be processed by the backend and stored in Cloudinary. The backend will validate file type and size, retain secure delivery URLs and Cloudinary public IDs, and remove superseded assets where appropriate. Cloudinary credentials remain server-only.

## 10. Order lifecycle

```text
Cart → checkout details → server-priced PENDING order
     → Paystack initialization → verified payment
     → PAID / CONFIRMED → PREPARING → READY
     → OUT_FOR_DELIVERY → DELIVERED
```

An order can become `CANCELLED` under validated business rules. Payment status is separate from fulfillment status and will support `PENDING`, `PAID`, `FAILED`, and `REFUNDED`.

## 11. API architecture

All endpoints will be namespaced under `/api`. Initial domains are:

```text
/api/health
/api/auth
/api/categories
/api/products
/api/orders
/api/payments
/api/uploads
```

The API will use JSON, appropriate status codes, pagination for collections, Zod validation for incoming data, and a consistent error response shape. Separate public read endpoints and protected administrative mutation endpoints prevent administrative fields from leaking to customers.

## 12. Security architecture

- Store secrets only in ignored server-side environment files.
- Keep `.env.example` files secret-free and safe to commit.
- Use Helmet, CORS allowlists, request logging without credentials, and rate limiting.
- Hash passwords; never log, return, or store plaintext passwords.
- Verify JWTs and enforce roles on the backend.
- Validate and sanitize incoming data.
- Recalculate all prices and totals on the server.
- Verify Paystack payments server-side.
- Validate uploads and keep Cloudinary credentials private.

## 13. Environment-variable strategy

Each deployable application will have an `.env.example` listing only the variable names it needs. Real `.env` files will be ignored by Git.

The backend owns MongoDB credentials, JWT signing values, Paystack secret keys, Cloudinary credentials, email credentials, and allowed client URLs. The mobile app may contain only `EXPO_PUBLIC_API_URL` and the Paystack public key. The admin app may contain only `VITE_API_URL`.

## 14. Development phases

1. Architecture and documentation
2. Git and environment configuration
3. Backend foundation and health check
4. MongoDB connection foundation
5. Backend authentication
6. Mobile foundation and authentication
7. Product and category backend
8. Cloudinary image management
9. Mobile product experience
10. Cart
11. Order system
12. Mobile checkout
13. Payment integration and verification
14. Customer order history and detail
15. Admin dashboard foundation
16. Admin catalog management
17. Admin order management
18. Customer/profile management
19. Notifications and operational refinements
20. Testing, security review, deployment, and release hardening

The detailed supplied plan contains additional sub-phases; they should continue in the same dependency order. Each phase must be tested and accepted before the next begins.

## 15. Testing strategy

Backend work will use unit tests for services and validators, integration tests for routes, and isolated test data for database-dependent cases. Client work will be checked through component/interaction tests where practical and manual Expo device or emulator testing for routing, authentication recovery, cart behavior, checkout, and payment redirects.

Critical end-to-end paths are registration, login, browsing products, cart updates, order creation, payment verification, order status changes, and admin authorization. Security-sensitive negative cases must be tested alongside happy paths.

## 16. Deployment architecture

- **Backend:** Render or Railway, with environment values configured in the hosting provider.
- **Database:** MongoDB Atlas with restricted network access and backups.
- **Admin:** Vercel or Netlify, configured with the public API URL.
- **Mobile:** Expo/EAS builds, configured only with public mobile settings.

Production CORS origins, webhook URLs, callback URLs, runtime logs, health checks, and deployment-specific environment values will be configured per environment. No production secrets are committed to source control.
