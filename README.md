# P2G Single-Vendor Commerce Application

P2G is a single-vendor commerce and food-ordering platform. Customers use a React Native mobile app to browse products, place orders, and pay. The business operates through a separate React web admin dashboard. Both clients use one Express REST API.

## Planned stack

- **Mobile:** React Native, Expo, Expo Router, Axios, Zustand, Expo SecureStore
- **Backend:** Node.js, Express, MongoDB Atlas, Mongoose, JWT, bcrypt, Zod
- **Admin:** React, Vite, React Router, Axios, Tailwind CSS
- **Services:** Paystack for payments and Cloudinary for images

## Repository layout

```text
P2G/
├── mobile/       # Customer mobile application (planned)
├── backend/      # Express REST API (planned)
├── admin/        # Vendor/admin web dashboard (planned)
├── docs/         # Architecture and project documentation
├── README.md
└── .gitignore    # Added in Phase 2
```

## Scope

This is a **single-vendor** application. It will not contain vendor onboarding, marketplace commissions, vendor selection, or `vendorId` ownership logic.

## Development status

Phase 1 establishes documentation and repository structure only. Application dependencies, environment templates, Git configuration, and functional code are intentionally deferred to later phases.

See [the architecture document](docs/ARCHITECTURE.md) for the planned system design and delivery sequence.
