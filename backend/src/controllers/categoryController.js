const categoryService = require('../services/categoryService');

/**
 * @route   GET /api/categories
 * @desc    Get all categories (Public / Customer)
 * @access  Public
 */
async function getAllCategories(req, res, next) {
  try {
    const { isActive, search, sort } = req.query;
    const categories = await categoryService.getCategories({ isActive, search, sort });

    res.status(200).json({
      success: true,
      count: categories.length,
      data: {
        categories,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   GET /api/categories/:id
 * @desc    Get single category by ID or slug
 * @access  Public
 */
async function getCategoryById(req, res, next) {
  try {
    const category = await categoryService.getCategoryById(req.params.id);

    res.status(200).json({
      success: true,
      data: {
        category,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   POST /api/categories
 * @desc    Create a category
 * @access  Private/Admin
 */
async function createCategory(req, res, next) {
  try {
    const category = await categoryService.createCategory(req.body, req.file);

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: {
        category,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   PUT /api/categories/:id
 * @desc    Update a category
 * @access  Private/Admin
 */
async function updateCategory(req, res, next) {
  try {
    const category = await categoryService.updateCategory(req.params.id, req.body, req.file);

    res.status(200).json({
      success: true,
      message: 'Category updated successfully',
      data: {
        category,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   DELETE /api/categories/:id
 * @desc    Delete a category
 * @access  Private/Admin
 */
async function deleteCategory(req, res, next) {
  try {
    const result = await categoryService.deleteCategory(req.params.id);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
};
