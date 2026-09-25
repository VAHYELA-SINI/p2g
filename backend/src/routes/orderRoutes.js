const express = require('express');
const rateLimit = require('express-rate-limit');
const orderController = require('../controllers/orderController');
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  validateCreateOrder,
  validateCancelOrder,
  validateUpdateOrderStatus,
} = require('../validators/orderValidators');

const router = express.Router();

// Dedicated rate limiter for order placement (prevents inventory hoarding and checkout spam)
const orderCreationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: {
    success: false,
    message: 'Too many orders placed in a short period. Please try again after 15 minutes.',
  },
});

// All order endpoints require authentication
router.use(protect);

// Customer & Admin order routes
router.post('/', orderCreationLimiter, validateCreateOrder, orderController.createOrder);
router.get('/', orderController.getOrders);
router.get('/my-orders', orderController.getOrders);
router.get('/stats', authorize('ADMIN'), orderController.getOrderStats);
router.get('/:id', orderController.getOrderById);
router.post('/:id/cancel', validateCancelOrder, orderController.cancelOrder);
router.patch('/:id/status', authorize('ADMIN'), validateUpdateOrderStatus, orderController.updateOrderStatus);

module.exports = router;
