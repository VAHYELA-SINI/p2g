const express = require('express');
const productController = require('../controllers/productController');
const { protect } = require('../middleware/authMiddleware');
const { adminOnly } = require('../middleware/roleMiddleware');
const { uploadSingle } = require('../middleware/uploadMiddleware');
const { validateProduct, validateProductUpdate } = require('../validators/productValidators');

const router = express.Router();

// Public / Customer routes
router.get('/', productController.getAllProducts);
router.get('/:id', productController.getProductById);

// Admin-only mutation routes (supports JSON or multipart/form-data with image upload)
router.post('/', protect, adminOnly, uploadSingle, validateProduct, productController.createProduct);
router.put('/:id', protect, adminOnly, uploadSingle, validateProductUpdate, productController.updateProduct);
router.delete('/:id', protect, adminOnly, productController.deleteProduct);

module.exports = router;

