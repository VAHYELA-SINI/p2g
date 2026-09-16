const Product = require('../models/Product');
const Category = require('../models/Category');
const cloudinaryService = require('./cloudinaryService');
const { slugify } = require('../utils/slugify');
const { escapeRegex } = require('../middleware/sanitizeMiddleware');

/**
 * Generates a unique slug for a Product
 */
async function generateUniqueProductSlug(name, existingId = null) {
  const baseSlug = slugify(name);
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const existing = await Product.findOne({ slug });
    if (!existing || (existingId && existing._id.toString() === existingId.toString())) {
      return slug;
    }
    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }
}

/**
 * Retrieves paginated, filtered, and searched products
 */
async function getProducts({
  page = 1,
  limit = 20,
  search,
  category,
  isAvailable,
  minPrice,
  maxPrice,
  sort = 'sortOrder -createdAt',
}) {
  const query = {};

  // Availability filter (e.g. isAvailable=true)
  if (isAvailable !== undefined) {
    query.isAvailable = isAvailable === 'true' || isAvailable === true;
  }

  // Category filter: Accepts MongoDB ObjectId or category slug
  if (category) {
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(category);
    if (isObjectId) {
      query.category = category;
    } else {
      const foundCategory = await Category.findOne({ slug: category });
      if (foundCategory) {
        query.category = foundCategory._id;
      } else {
        return {
          products: [],
          pagination: { page: Number(page), limit: Number(limit), total: 0, pages: 0 },
        };
      }
    }
  }

  // Search filter across name and description
  if (search && search.trim()) {
    const safeSearch = escapeRegex(search.trim());
    query.$or = [
      { name: { $regex: safeSearch, $options: 'i' } },
      { description: { $regex: safeSearch, $options: 'i' } },
    ];
  }

  // Price range filters
  if (minPrice !== undefined || maxPrice !== undefined) {
    query.price = {};
    if (minPrice !== undefined) query.price.$gte = Number(minPrice);
    if (maxPrice !== undefined) query.price.$lte = Number(maxPrice);
  }

  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (parsedPage - 1) * parsedLimit;

  const [products, total] = await Promise.all([
    Product.find(query)
      .populate('category', 'name slug')
      .sort(sort)
      .skip(skip)
      .limit(parsedLimit)
      .lean(),
    Product.countDocuments(query),
  ]);

  const pages = Math.ceil(total / parsedLimit);

  return {
    products,
    pagination: {
      page: parsedPage,
      limit: parsedLimit,
      total,
      pages,
    },
  };
}

/**
 * Retrieves a single product by MongoDB ID or slug
 */
async function getProductById(idOrSlug) {
  const isObjectId = /^[0-9a-fA-F]{24}$/.test(idOrSlug);
  const query = isObjectId ? { _id: idOrSlug } : { slug: idOrSlug };

  const product = await Product.findOne(query).populate('category', 'name slug');
  if (!product) {
    const error = new Error('Product not found');
    error.statusCode = 404;
    throw error;
  }

  return product;
}

/**
 * Creates a new product (Admin)
 * Supports optional single image or gallery uploads via Cloudinary
 */
async function createProduct(data, file = null, files = null) {
  // Category reference validation
  const category = await Category.findById(data.category);
  if (!category) {
    const error = new Error('Referenced category does not exist');
    error.statusCode = 400;
    throw error;
  }

  // Handle single main image upload
  if (file) {
    const uploadResult = await cloudinaryService.uploadProductImage(file);
    data.image = uploadResult.url;
    data.imagePublicId = uploadResult.publicId;
  }

  // Handle multiple gallery images upload
  if (files && Array.isArray(files) && files.length > 0) {
    const uploadedList = await cloudinaryService.uploadMultipleProductImages(files);
    const galleryItems = uploadedList.map((item) => ({
      url: item.url,
      publicId: item.publicId,
    }));
    data.images = (data.images || []).concat(galleryItems);
  }

  const slug = data.slug ? slugify(data.slug) : await generateUniqueProductSlug(data.name);

  // Check unique slug
  const existing = await Product.findOne({ slug });
  if (existing) {
    // Clean up uploaded image if slug conflict occurs
    if (data.imagePublicId) {
      await cloudinaryService.deleteImage(data.imagePublicId);
    }
    const error = new Error(`Product with slug '${slug}' already exists`);
    error.statusCode = 409;
    throw error;
  }

  const product = await Product.create({
    ...data,
    slug,
  });

  return product.populate('category', 'name slug');
}

/**
 * Updates an existing product (Admin)
 * Handles image replacement, deletion of previous image, and gallery updates
 */
async function updateProduct(id, data = {}, file = null, files = null) {
  const product = await Product.findById(id);
  if (!product) {
    const error = new Error('Product not found');
    error.statusCode = 404;
    throw error;
  }

  // If category changed, validate existence
  if (data.category && data.category !== product.category.toString()) {
    const category = await Category.findById(data.category);
    if (!category) {
      const error = new Error('Referenced category does not exist');
      error.statusCode = 400;
      throw error;
    }
  }

  // Handle new main image replacement
  if (file) {
    const uploadResult = await cloudinaryService.uploadProductImage(file);
    if (product.imagePublicId) {
      await cloudinaryService.deleteImage(product.imagePublicId);
    }
    data.image = uploadResult.url;
    data.imagePublicId = uploadResult.publicId;
  } else if (data.imagePublicId && data.imagePublicId !== product.imagePublicId) {
    if (product.imagePublicId) {
      await cloudinaryService.deleteImage(product.imagePublicId);
    }
  }

  // Handle gallery images addition
  if (files && Array.isArray(files) && files.length > 0) {
    const uploadedList = await cloudinaryService.uploadMultipleProductImages(files);
    const galleryItems = uploadedList.map((item) => ({
      url: item.url,
      publicId: item.publicId,
    }));
    data.images = (product.images || []).concat(galleryItems);
  }

  // Handle slug change
  if (data.slug) {
    data.slug = slugify(data.slug);
  } else if (data.name && data.name !== product.name) {
    data.slug = await generateUniqueProductSlug(data.name, product._id);
  }

  Object.assign(product, data);
  await product.save();

  return product.populate('category', 'name slug');
}

/**
 * Deletes a product (Admin)
 * Deletes associated main image and gallery images from Cloudinary
 */
async function deleteProduct(id) {
  const product = await Product.findById(id);
  if (!product) {
    const error = new Error('Product not found');
    error.statusCode = 404;
    throw error;
  }

  // Delete main image from Cloudinary
  if (product.imagePublicId) {
    await cloudinaryService.deleteImage(product.imagePublicId);
  }

  // Delete any gallery images from Cloudinary
  if (product.images && product.images.length > 0) {
    const publicIds = product.images.map((img) => img.publicId).filter(Boolean);
    if (publicIds.length > 0) {
      await cloudinaryService.deleteMultipleImages(publicIds);
    }
  }

  await Product.findByIdAndDelete(id);
  return { message: 'Product deleted successfully' };
}

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};
