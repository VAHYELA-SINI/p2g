const express = require('express');
const rateLimit = require('express-rate-limit');

const authController = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  validateBody,
} = require('../validators/authValidators');

const router = express.Router();

// Dedicated rate limiter for authentication routes (prevents credential stuffing & brute-force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15-minute window
  limit: 20, // max 20 attempts per window per IP
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again after 15 minutes.',
  },
});

// Authentication endpoints
router.post('/register', authLimiter, validateBody(registerSchema), authController.register);
router.post('/login', authLimiter, validateBody(loginSchema), authController.login);
router.post('/forgot-password', authLimiter, validateBody(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', authLimiter, validateBody(resetPasswordSchema), authController.resetPassword);
router.get('/me', protect, authController.getMe);
router.put('/profile', protect, validateBody(updateProfileSchema), authController.updateProfile);
router.put('/change-password', protect, validateBody(changePasswordSchema), authController.changePassword);

module.exports = router;
