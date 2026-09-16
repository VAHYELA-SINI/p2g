const { z } = require('zod');
const { validateBody } = require('./authValidators');

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const orderItemInputSchema = z.object({
  product: z
    .string({ required_error: 'Product ID is required' })
    .regex(objectIdRegex, 'Invalid product ID format'),
  quantity: z.coerce
    .number({ required_error: 'Quantity is required' })
    .int('Quantity must be an integer')
    .min(1, 'Quantity must be at least 1'),
});

const deliveryInformationInputSchema = z.object({
  fullName: z
    .string({ required_error: 'Full name is required' })
    .trim()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name cannot exceed 100 characters'),
  phone: z
    .string({ required_error: 'Phone number is required' })
    .trim()
    .min(7, 'Phone number must be at least 7 characters')
    .max(20, 'Phone number cannot exceed 20 characters'),
  address: z
    .string({ required_error: 'Delivery address is required' })
    .trim()
    .min(5, 'Delivery address must be at least 5 characters')
    .max(250, 'Delivery address cannot exceed 250 characters'),
  city: z
    .string({ required_error: 'City is required' })
    .trim()
    .min(2, 'City must be at least 2 characters')
    .max(50, 'City cannot exceed 50 characters'),
  additionalInstructions: z
    .string()
    .trim()
    .max(500, 'Instructions cannot exceed 500 characters')
    .optional()
    .default(''),
});

const createOrderSchema = z.object({
  items: z
    .array(orderItemInputSchema, {
      required_error: 'Order items array is required',
    })
    .min(1, 'Order must contain at least one item'),
  deliveryInformation: deliveryInformationInputSchema,
});

const cancelOrderSchema = z.object({
  reason: z.string().trim().max(300, 'Reason cannot exceed 300 characters').optional(),
});

const updateOrderStatusSchema = z.object({
  status: z.enum([
    'PENDING',
    'CONFIRMED',
    'PREPARING',
    'READY',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
    'CANCELLED',
  ], {
    required_error: 'Order status is required',
    invalid_type_error: 'Invalid order status value',
  }),
  note: z.string().trim().max(500, 'Note cannot exceed 500 characters').optional().default(''),
});

module.exports = {
  createOrderSchema,
  cancelOrderSchema,
  updateOrderStatusSchema,
  validateCreateOrder: validateBody(createOrderSchema),
  validateCancelOrder: validateBody(cancelOrderSchema),
  validateUpdateOrderStatus: validateBody(updateOrderStatusSchema),
};
