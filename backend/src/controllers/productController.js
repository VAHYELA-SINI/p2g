const productService = require('../services/productService');

/**
 * @route   GET /api/products
 * @desc    Get paginated, filtered products (Public / Customer)
 * @access  Public
 */
async function getAllProducts(req, res, next) {
  try {
    const { page, limit, search, category, isAvailable, minPrice, maxPrice, sort } = req.query;

    const { products, pagination } = await productService.getProducts({
      page,
      limit,
      search,
      category,
      isAvailable,
      minPrice,
      maxPrice,
      sort,
    });

    res.status(200).json({
      success: true,
      data: {
        products,
      },
      pagination,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   GET /api/products/:id
 * @desc    Get single product by ID or slug
 * @access  Public
 */
async function getProductById(req, res, next) {
  try {
    const product = await productService.getProductById(req.params.id);

    res.status(200).json({
      success: true,
      data: {
        product,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   POST /api/products
 * @desc    Create a product
 * @access  Private/Admin
 */
async function createProduct(req, res, next) {
  try {
    const product = await productService.createProduct(req.body, req.file, req.files);

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: {
        product,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   PUT /api/products/:id
 * @desc    Update a product
 * @access  Private/Admin
 */
async function updateProduct(req, res, next) {
  try {
    const product = await productService.updateProduct(req.params.id, req.body, req.file, req.files);

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: {
        product,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   DELETE /api/products/:id
 * @desc    Delete a product
 * @access  Private/Admin
 */
async function deleteProduct(req, res, next) {
  try {
    const result = await productService.deleteProduct(req.params.id);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};
