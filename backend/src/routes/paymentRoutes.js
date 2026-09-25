const express = require('express');
const rateLimit = require('express-rate-limit');
const paymentController = require('../controllers/paymentController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// Dedicated rate limiter for payment initialization
const paymentInitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: {
    success: false,
    message: 'Too many payment initialization requests. Please try again after 15 minutes.',
  },
});

// Webhook endpoint (Public, guarded by HMAC SHA-512 signature in controller)
router.post('/webhook', paymentController.handleWebhook);

// Public payment callback redirect from Paystack checkout (handles /callback and /verify redirects)
router.get('/callback', paymentController.handleCallback);
router.get('/verify', paymentController.handleCallback);

// Protected endpoints
router.get('/', protect, authorize('ADMIN'), paymentController.getPayments);
router.post('/initialize/:orderId', protect, paymentInitLimiter, paymentController.initializePayment);
router.get('/verify/:reference', protect, paymentController.verifyPayment);

module.exports = router;
