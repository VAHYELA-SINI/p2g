const express = require('express');
const uploadController = require('../controllers/uploadController');
const { protect } = require('../middleware/authMiddleware');
const { adminOnly } = require('../middleware/roleMiddleware');
const { uploadSingle, uploadMultiple } = require('../middleware/uploadMiddleware');

const router = express.Router();

// Admin-only upload and deletion routes
router.post('/category', protect, adminOnly, uploadSingle, uploadController.uploadCategoryImage);
router.post('/product', protect, adminOnly, uploadSingle, uploadController.uploadProductImage);
router.post('/products', protect, adminOnly, uploadMultiple, uploadController.uploadMultipleProductImages);
router.delete('/:publicId', protect, adminOnly, uploadController.deleteImage);
router.delete('/', protect, adminOnly, uploadController.deleteImage);

module.exports = router;
