# P2G Single-Vendor Commerce & Food-Ordering Application

P2G is a dedicated single-vendor commerce and food-ordering platform. The system empowers a single business merchant to showcase products, receive orders, accept payments via Paystack, and manage end-to-end fulfillment through a web administration dashboard, while customers interact seamlessly via a cross-platform mobile app.

---

## Target Architecture

```text
P2G/
├── mobile/       # Customer mobile application (React Native + Expo + Expo Router)
├── backend/      # Express.js REST API (Node.js >= 20, MongoDB, Paystack, Cloudinary)
├── admin/        # Merchant admin web dashboard (React + Vite + Tailwind CSS)
├── docs/         # System architecture and technical specifications
├── .gitignore    # Project-wide Git ignore rules
└── README.md     # Project overview and developer guide
```

```text
Customer Mobile App (React Native + Expo + Expo Router)
        │
        │ HTTPS REST API
        ▼
Express.js Backend (Node.js >= 20)
        ├── MongoDB Atlas (Persistence)
        ├── Paystack (Payments & Webhooks)
        └── Cloudinary (Media & Image Storage)
        ▲
        │ HTTPS REST API
        │
Admin Web Dashboard (React + Vite + Tailwind CSS)
```

---

## Strict Single-Vendor Scope

This application is strictly **single-vendor**:
- Built for a **single store / merchant operator**.
- **No multi-vendor architecture**: No `vendorId`, no vendor switching, no multiple stores, no vendor onboarding, and no marketplace commission logic.
- All catalog items, customer orders, inventory records, and settings belong to the single store.

---

## Technology Stack

| Tier | Technologies |
|---|---|
| **Mobile App** | React Native, Expo, Expo Router (file-based navigation), Axios, Zustand, Expo SecureStore |
| **Backend API** | Node.js (>= 20), Express.js (v5), Mongoose ODM, MongoDB Atlas, JWT, bcryptjs, Zod |
| **Admin Dashboard** | React (v18/19), Vite, React Router DOM, Axios, Tailwind CSS |
| **Third-Party Services** | **Paystack** for payments & webhooks; **Cloudinary** for product/category image hosting |

---

## Backend Layered Directory Layout

The Express REST API follows a strict layered separation of concerns:

```text
backend/src/
├── config/       # Database, Paystack, and Cloudinary configurations
├── controllers/  # HTTP request/response handlers
├── middleware/   # Authentication (protect), authorization (authorize), error & rate limiters
├── models/       # Mongoose schemas (User, Category, Product, Order)
├── routes/       # Express route declarations
├── services/     # Pure business logic, calculations, and 3rd-party integrations
├── validators/   # Zod request validation schemas
├── utils/        # Shared helper functions and token generators
├── app.js        # Express app initialization, security headers, CORS, error handling
└── server.js     # Server entry point, database connection, graceful shutdown
```

---

## Current Project Status

- [x] **Phase 1: Architecture & Repository Layout** — Comprehensive system design and directory structure established.
- [x] **Backend Foundation** — Express 5 server scaffold, Mongoose connection module, security middleware (Helmet, CORS, Rate Limit, Morgan), central error handling, and `GET /api/health` implemented.
- [ ] **Backend Core Features** — User model, JWT auth & RBAC, Category/Product catalog, Cloudinary media upload, Order engine, Paystack payments.
- [ ] **Customer Mobile App** — Expo Router scaffolding, auth screens, product catalog, persistent cart, Paystack checkout.
- [ ] **Admin Dashboard** — Vite + React setup, Tailwind styling, catalog management, order fulfillment state machine.

---

## Getting Started

### Prerequisites
- **Node.js** >= 20.0.0
- **MongoDB Atlas** database connection URI
- **Paystack** account keys (Public Key & Secret Key)
- **Cloudinary** account credentials

### Environment Configuration

Copy each `.env.example` file to `.env`:

```bash
# Backend
cp backend/.env.example backend/.env

# Mobile
cp mobile/.env.example mobile/.env

# Admin
cp admin/.env.example admin/.env
```

### Running Backend in Development

```bash
cd backend
npm install
npm run dev
```

The server will connect to MongoDB Atlas and listen on port `5000` (or specified `PORT`).  
Verify the health endpoint: `GET http://localhost:5000/api/health`.

---

## Detailed Specifications

For complete technical specifications across all 16 domains (including database schemas, Paystack sequence flow, Cloudinary upload lifecycle, and order state transitions), see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
