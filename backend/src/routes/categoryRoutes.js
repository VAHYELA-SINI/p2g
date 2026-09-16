const express = require('express');
const categoryController = require('../controllers/categoryController');
const { protect } = require('../middleware/authMiddleware');
const { adminOnly } = require('../middleware/roleMiddleware');
const { uploadSingle } = require('../middleware/uploadMiddleware');
const { validateCategory, validateCategoryUpdate } = require('../validators/categoryValidators');

const router = express.Router();

// Public / Customer routes
router.get('/', categoryController.getAllCategories);
router.get('/:id', categoryController.getCategoryById);

// Admin-only mutation routes (supports JSON or multipart/form-data with image upload)
router.post('/', protect, adminOnly, uploadSingle, validateCategory, categoryController.createCategory);
router.put('/:id', protect, adminOnly, uploadSingle, validateCategoryUpdate, categoryController.updateCategory);
router.delete('/:id', protect, adminOnly, categoryController.deleteCategory);

module.exports = router;

