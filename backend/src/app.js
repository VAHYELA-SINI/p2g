const cors = require('cors');
const dotenv = require('dotenv');
const express = require('express');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const morgan = require('morgan');

const healthRoutes = require('./routes/healthRoutes');
const authRoutes = require('./routes/authRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const productRoutes = require('./routes/productRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const orderRoutes = require('./routes/orderRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const customerRoutes = require('./routes/customerRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const notificationService = require('./services/notifications/notificationService');
const { errorHandler, notFoundHandler } = require('./middleware/errorMiddleware');
const { mongoSanitize } = require('./middleware/sanitizeMiddleware');

dotenv.config();

// Initialize notification domain event listeners
notificationService.init();

const app = express();

// Allowed origins from environment (web clients)
const isDevelopment = process.env.NODE_ENV !== 'production';
const configuredOrigins = [
  process.env.CLIENT_URL,
  process.env.ADMIN_URL,
  ...(isDevelopment ? ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:8081', 'http://127.0.0.1:5173', 'http://127.0.0.1:8081'] : []),
].filter(Boolean);

// Security HTTP headers
app.disable('x-powered-by');
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS configuration
app.use(cors({
  origin(origin, callback) {
    // Allow non-browser requests (e.g. mobile native, curl, postman) where origin is not set
    if (!origin) {
      return callback(null, true);
    }

    if (configuredOrigins.includes(origin)) {
      return callback(null, true);
    }

    // In local development fallback only if no origins configured
    if (isDevelopment && configuredOrigins.length === 0) {
      return callback(null, true);
    }

    const error = new Error('This origin is not allowed by CORS.');
    error.statusCode = 403;
    return callback(error);
  },
  credentials: true,
}));

// Body parsing middleware
app.use(express.json({
  limit: '1mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  },
}));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

// NoSQL Injection sanitization (Recursively strips '$' and '.' operators from inputs)
app.use(mongoSanitize);

// Request logging
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Global rate limiting
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please try again later.',
  },
}));

// API Routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/notifications', notificationRoutes);

// Centralized 404 and Error handling
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
