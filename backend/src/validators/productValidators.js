const { z } = require('zod');
const { validateBody } = require('./authValidators');

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const createProductSchema = z.object({
  name: z
    .string({ required_error: 'Product name is required' })
    .trim()
    .min(2, 'Product name must be at least 2 characters long')
    .max(150, 'Product name cannot exceed 150 characters'),
  slug: z.string().trim().toLowerCase().optional(),
  description: z.string().trim().max(2000, 'Description cannot exceed 2000 characters').optional(),
  price: z.coerce
    .number({ required_error: 'Price is required' })
    .min(0, 'Price must be greater than or equal to 0'),
  image: z.string().trim().optional(),
  imagePublicId: z.string().trim().optional(),
  images: z
    .preprocess((val) => {
      if (typeof val === 'string') {
        try {
          return JSON.parse(val);
        } catch {
          return val;
        }
      }
      return val;
    }, z.array(
      z.object({
        url: z.string({ required_error: 'Image URL is required' }).trim(),
        publicId: z.string().trim().optional().default(''),
      })
    ))
    .optional(),
  category: z
    .string({ required_error: 'Category ID is required' })
    .regex(objectIdRegex, 'Invalid category ID format'),
  isAvailable: z
    .preprocess((val) => {
      if (typeof val === 'string') {
        if (val.toLowerCase() === 'true') return true;
        if (val.toLowerCase() === 'false') return false;
      }
      return val;
    }, z.boolean())
    .optional(),
  stock: z.coerce.number().int('Stock must be an integer').min(0, 'Stock cannot be negative').optional(),
  sortOrder: z.coerce.number().int().optional(),
});

const updateProductSchema = z.object({
  name: z.string().trim().min(2).max(150).optional(),
  slug: z.string().trim().toLowerCase().optional(),
  description: z.string().trim().max(2000).optional(),
  price: z.coerce.number().min(0, 'Price must be greater than or equal to 0').optional(),
  image: z.string().trim().optional(),
  imagePublicId: z.string().trim().optional(),
  images: z
    .preprocess((val) => {
      if (typeof val === 'string') {
        try {
          return JSON.parse(val);
        } catch {
          return val;
        }
      }
      return val;
    }, z.array(
      z.object({
        url: z.string().trim(),
        publicId: z.string().trim().optional(),
      })
    ))
    .optional(),
  category: z.string().regex(objectIdRegex, 'Invalid category ID format').optional(),
  isAvailable: z
    .preprocess((val) => {
      if (typeof val === 'string') {
        if (val.toLowerCase() === 'true') return true;
        if (val.toLowerCase() === 'false') return false;
      }
      return val;
    }, z.boolean())
    .optional(),
  stock: z.coerce.number().int().min(0).optional(),
  sortOrder: z.coerce.number().int().optional(),
});

module.exports = {
  createProductSchema,
  updateProductSchema,
  validateProduct: validateBody(createProductSchema),
  validateProductUpdate: validateBody(updateProductSchema),
};
