const express = require('express');
const customerController = require('../controllers/customerController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// Strict Admin authorization enforced by backend
router.use(protect);
router.use(authorize('ADMIN'));

router.get('/', customerController.getCustomers);
router.get('/:id', customerController.getCustomerById);

module.exports = router;
