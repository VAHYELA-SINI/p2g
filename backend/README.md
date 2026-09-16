# P2G Backend Express API

This directory contains the Express REST API for the P2G single-vendor application.

## Directory Layout

```text
backend/
├── src/
│   ├── config/       # Database & external service configurations
│   ├── controllers/  # Request & response handlers
│   ├── middleware/   # Centralized error, 404, rate limiting, and auth middleware
│   ├── models/       # Mongoose data models
│   ├── routes/       # Express route definitions
│   ├── services/     # Pure business logic and integrations
│   ├── validators/   # Zod request validation schemas
│   ├── utils/        # Reusable helper functions
│   ├── app.js        # Express application pipeline & security middleware
│   └── server.js     # Server entry point, database connection & graceful shutdown
├── .env              # Local environment variables (not committed)
├── .env.example      # Environment variable template
├── package.json
└── README.md
```

## Available Scripts

- `npm run dev`: Starts the development server with `nodemon` (auto-reload on changes).
- `npm start`: Starts the production server with `node src/server.js`.
- `npm run check`: Performs static syntax check on core server files.

## Environment Configuration

Create a `.env` file from `.env.example`:

```bash
cp .env.example .env
```

Set `PORT` (default 5000), `NODE_ENV`, and other variables. When `MONGODB_URI` is provided, the server automatically connects to MongoDB Atlas.

## Health Check

Once the server is running, verify with:

```bash
curl http://localhost:5000/api/health
```

Expected response:

```json
{
  "success": true,
  "status": "ok",
  "message": "P2G API is running.",
  "environment": "development",
  "uptime": 1,
  "timestamp": "..."
}
```
