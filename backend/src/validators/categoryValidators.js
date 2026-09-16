const { z } = require('zod');
const { validateBody } = require('./authValidators');

const createCategorySchema = z.object({
  name: z
    .string({ required_error: 'Category name is required' })
    .trim()
    .min(2, 'Category name must be at least 2 characters long')
    .max(100, 'Category name cannot exceed 100 characters'),
  slug: z.string().trim().toLowerCase().optional(),
  description: z.string().trim().max(500, 'Description cannot exceed 500 characters').optional(),
  image: z.string().trim().optional(),
  imagePublicId: z.string().trim().optional(),
  isActive: z
    .preprocess((val) => {
      if (typeof val === 'string') {
        if (val.toLowerCase() === 'true') return true;
        if (val.toLowerCase() === 'false') return false;
      }
      return val;
    }, z.boolean())
    .optional(),
  sortOrder: z.coerce.number().int().optional(),
});

const updateCategorySchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  slug: z.string().trim().toLowerCase().optional(),
  description: z.string().trim().max(500).optional(),
  image: z.string().trim().optional(),
  imagePublicId: z.string().trim().optional(),
  isActive: z
    .preprocess((val) => {
      if (typeof val === 'string') {
        if (val.toLowerCase() === 'true') return true;
        if (val.toLowerCase() === 'false') return false;
      }
      return val;
    }, z.boolean())
    .optional(),
  sortOrder: z.coerce.number().int().optional(),
});

module.exports = {
  createCategorySchema,
  updateCategorySchema,
  validateCategory: validateBody(createCategorySchema),
  validateCategoryUpdate: validateBody(updateCategorySchema),
};
