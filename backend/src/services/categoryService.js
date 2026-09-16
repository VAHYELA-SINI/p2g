const Category = require('../models/Category');
const Product = require('../models/Product');
const cloudinaryService = require('./cloudinaryService');
const { slugify } = require('../utils/slugify');

/**
 * Generates a unique slug for a Category
 */
async function generateUniqueCategorySlug(name, existingId = null) {
  const baseSlug = slugify(name);
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const existing = await Category.findOne({ slug });
    if (!existing || (existingId && existing._id.toString() === existingId.toString())) {
      return slug;
    }
    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }
}

/**
 * Retrieves all categories with optional active status filtering and sorting
 */
async function getCategories({ isActive, search, sort = 'sortOrder' }) {
  const query = {};

  if (isActive !== undefined) {
    query.isActive = isActive === 'true' || isActive === true;
  }

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
  }

  const categories = await Category.find(query).sort(sort);
  return categories;
}

/**
 * Retrieves a single category by MongoDB ID or slug
 */
async function getCategoryById(idOrSlug) {
  const isObjectId = /^[0-9a-fA-F]{24}$/.test(idOrSlug);
  const query = isObjectId ? { _id: idOrSlug } : { slug: idOrSlug };

  const category = await Category.findOne(query);
  if (!category) {
    const error = new Error('Category not found');
    error.statusCode = 404;
    throw error;
  }

  return category;
}

/**
 * Creates a new category (Admin)
 * Supports optional image upload via Cloudinary
 */
async function createCategory(data, file = null) {
  if (file) {
    const uploadResult = await cloudinaryService.uploadCategoryImage(file);
    data.image = uploadResult.url;
    data.imagePublicId = uploadResult.publicId;
  }

  const slug = data.slug ? slugify(data.slug) : await generateUniqueCategorySlug(data.name);

  // Ensure unique slug
  const existingCategory = await Category.findOne({ slug });
  if (existingCategory) {
    // Clean up uploaded image if slug conflict occurs
    if (data.imagePublicId) {
      await cloudinaryService.deleteImage(data.imagePublicId);
    }
    const error = new Error(`Category with slug '${slug}' already exists`);
    error.statusCode = 409;
    throw error;
  }

  const category = await Category.create({
    ...data,
    slug,
  });

  return category;
}

/**
 * Updates an existing category (Admin)
 * Handles image replacement and deletion of previous image
 */
async function updateCategory(id, data = {}, file = null) {
  const category = await Category.findById(id);
  if (!category) {
    const error = new Error('Category not found');
    error.statusCode = 404;
    throw error;
  }

  // If a new file is uploaded, upload to Cloudinary and replace previous image
  if (file) {
    const uploadResult = await cloudinaryService.uploadCategoryImage(file);
    if (category.imagePublicId) {
      await cloudinaryService.deleteImage(category.imagePublicId);
    }
    data.image = uploadResult.url;
    data.imagePublicId = uploadResult.publicId;
  } else if (data.imagePublicId && data.imagePublicId !== category.imagePublicId) {
    // If a different publicId is explicitly provided, delete the old image
    if (category.imagePublicId) {
      await cloudinaryService.deleteImage(category.imagePublicId);
    }
  }

  // Handle slug change if name or slug provided
  if (data.slug) {
    data.slug = slugify(data.slug);
  } else if (data.name && data.name !== category.name) {
    data.slug = await generateUniqueCategorySlug(data.name, category._id);
  }

  Object.assign(category, data);
  await category.save();

  return category;
}

/**
 * Deletes a category (Admin)
 * Verifies no products are assigned and removes associated Cloudinary image
 */
async function deleteCategory(id) {
  const category = await Category.findById(id);
  if (!category) {
    const error = new Error('Category not found');
    error.statusCode = 404;
    throw error;
  }

  // Check if any products reference this category
  const productCount = await Product.countDocuments({ category: id });
  if (productCount > 0) {
    const error = new Error(
      `Cannot delete category. There are ${productCount} product(s) assigned to this category. Please reassign or delete them first.`
    );
    error.statusCode = 400;
    throw error;
  }

  // Delete image from Cloudinary if stored
  if (category.imagePublicId) {
    await cloudinaryService.deleteImage(category.imagePublicId);
  }

  await Category.findByIdAndDelete(id);
  return { message: 'Category deleted successfully' };
}

module.exports = {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
};
