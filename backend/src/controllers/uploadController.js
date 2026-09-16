const cloudinaryService = require('../services/cloudinaryService');

/**
 * @route   POST /api/upload/category
 * @desc    Upload a single category image to Cloudinary
 * @access  Private/Admin
 */
async function uploadCategoryImage(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided in "image" field',
      });
    }

    const result = await cloudinaryService.uploadCategoryImage(req.file);

    res.status(200).json({
      success: true,
      message: 'Category image uploaded successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   POST /api/upload/product
 * @desc    Upload a single product image to Cloudinary
 * @access  Private/Admin
 */
async function uploadProductImage(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided in "image" field',
      });
    }

    const result = await cloudinaryService.uploadProductImage(req.file);

    res.status(200).json({
      success: true,
      message: 'Product image uploaded successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   POST /api/upload/products
 * @desc    Upload multiple product gallery images to Cloudinary (up to 5)
 * @access  Private/Admin
 */
async function uploadMultipleProductImages(req, res, next) {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No image files provided in "images" field',
      });
    }

    const results = await cloudinaryService.uploadMultipleProductImages(req.files);

    res.status(200).json({
      success: true,
      count: results.length,
      message: 'Product images uploaded successfully',
      data: results,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   DELETE /api/upload/:publicId
 * @desc    Delete an image from Cloudinary by public ID
 * @access  Private/Admin
 */
async function deleteImage(req, res, next) {
  try {
    const publicId = req.params.publicId || req.body.publicId;
    if (!publicId) {
      return res.status(400).json({
        success: false,
        message: 'Public ID is required for image deletion',
      });
    }

    const result = await cloudinaryService.deleteImage(publicId);

    res.status(200).json({
      success: true,
      message: 'Image deleted successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  uploadCategoryImage,
  uploadProductImage,
  uploadMultipleProductImages,
  deleteImage,
};
