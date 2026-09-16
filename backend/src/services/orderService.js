const Order = require('../models/Order');
const Product = require('../models/Product');
const { eventBus, DOMAIN_EVENTS } = require('../events/eventBus');

const DEFAULT_DELIVERY_FEE = parseInt(process.env.DELIVERY_FEE, 10) || 1000;

/**
 * Creates a new order with server-authoritative calculations
 */
async function createOrder(customerId, orderData) {
  const { items, deliveryInformation } = orderData;

  if (!items || !Array.isArray(items) || items.length === 0) {
    const error = new Error('Order must contain at least one item');
    error.statusCode = 400;
    throw error;
  }

  // 1. Consolidate duplicate line items to enforce aggregate stock verification
  const consolidatedMap = new Map();
  for (const item of items) {
    const pId = item.product.toString();
    const qty = parseInt(item.quantity, 10);
    consolidatedMap.set(pId, (consolidatedMap.get(pId) || 0) + qty);
  }

  const uniqueProductIds = Array.from(consolidatedMap.keys());
  const dbProducts = await Product.find({ _id: { $in: uniqueProductIds } });
  const productMap = new Map(dbProducts.map((p) => [p._id.toString(), p]));

  // 2. Validate availability, aggregate stock, and build authoritative snapshot items
  const snapshotItems = [];
  let calculatedSubtotal = 0;

  for (const [pId, aggregateQuantity] of consolidatedMap.entries()) {
    const product = productMap.get(pId);

    // Check product exists
    if (!product) {
      const error = new Error(`Product with ID '${pId}' not found.`);
      error.statusCode = 400;
      throw error;
    }

    // Check product availability
    if (product.isAvailable === false) {
      const error = new Error(`Product '${product.name}' is currently unavailable.`);
      error.statusCode = 400;
      throw error;
    }

    // Check stock against aggregate requested quantity
    if (product.stock !== undefined && product.stock !== null) {
      if (product.stock < aggregateQuantity) {
        const error = new Error(
          `Insufficient stock for '${product.name}'. Available: ${product.stock}, requested: ${aggregateQuantity}.`
        );
        error.statusCode = 400;
        throw error;
      }
    }

    // Authoritative pricing strictly from database
    const unitPrice = Number(product.price);
    const lineSubtotal = unitPrice * aggregateQuantity;

    calculatedSubtotal += lineSubtotal;

    snapshotItems.push({
      product: product._id,
      name: product.name,
      price: unitPrice,
      quantity: aggregateQuantity,
      image: product.image || '',
      subtotal: lineSubtotal,
    });
  }

  // 3. Server-authoritative totals
  const deliveryFee = DEFAULT_DELIVERY_FEE;
  const totalAmount = calculatedSubtotal + deliveryFee;

  // 4. Decrement inventory stock
  for (const item of snapshotItems) {
    await Product.findByIdAndUpdate(item.product, {
      $inc: { stock: -item.quantity },
    });
  }

  // 5. Create pending order in database
  const order = await Order.create({
    customer: customerId,
    items: snapshotItems,
    deliveryInformation,
    subtotal: calculatedSubtotal,
    deliveryFee,
    totalAmount,
    paymentStatus: 'PENDING',
    orderStatus: 'PENDING',
    statusHistory: [
      {
        status: 'PENDING',
        changedAt: new Date(),
        changedBy: customerId,
        note: 'Order placed by customer awaiting payment confirmation',
      },
    ],
  });

  return order.populate('customer', 'name email phone');
}

/**
 * Retrieves orders:
 * - Customers only access their own orders
 * - Admins can access all orders
 */
async function getOrders(user, queryParams = {}) {
  const { page = 1, limit = 20, status, paymentStatus } = queryParams;

  const filter = {};

  // Customer isolation
  if (user.role !== 'ADMIN') {
    filter.customer = user._id;
  } else if (queryParams.customer) {
    filter.customer = queryParams.customer;
  }

  if (status) {
    filter.orderStatus = status;
  }

  if (paymentStatus) {
    filter.paymentStatus = paymentStatus;
  }

  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (parsedPage - 1) * parsedLimit;

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .populate('customer', 'name email phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parsedLimit),
    Order.countDocuments(filter),
  ]);

  const pages = Math.ceil(total / parsedLimit);

  return {
    orders,
    pagination: {
      page: parsedPage,
      limit: parsedLimit,
      total,
      pages,
    },
  };
}

/**
 * Retrieves a single order with ownership validation
 */
async function getOrderById(orderId, user) {
  const order = await Order.findById(orderId).populate('customer', 'name email phone');

  if (!order) {
    const error = new Error('Order not found');
    error.statusCode = 404;
    throw error;
  }

  // Customers can only view their own order
  if (user.role !== 'ADMIN' && order.customer._id.toString() !== user._id.toString()) {
    const error = new Error('You are not authorized to view this order.');
    error.statusCode = 403;
    throw error;
  }

  return order;
}

/**
 * Cancels an order and restores product stock
 */
async function cancelOrder(orderId, user, reason = '') {
  const order = await Order.findById(orderId);

  if (!order) {
    const error = new Error('Order not found');
    error.statusCode = 404;
    throw error;
  }

  // Authorization check
  if (user.role !== 'ADMIN' && order.customer.toString() !== user._id.toString()) {
    const error = new Error('You are not authorized to cancel this order.');
    error.statusCode = 403;
    throw error;
  }

  // Check state machine
  if (order.orderStatus === 'CANCELLED') {
    const error = new Error('Order is already cancelled.');
    error.statusCode = 400;
    throw error;
  }

  if (order.orderStatus !== 'PENDING' && order.orderStatus !== 'CONFIRMED') {
    const error = new Error(
      `Cannot cancel order in '${order.orderStatus}' status. Orders currently being prepared or out for delivery cannot be cancelled.`
    );
    error.statusCode = 400;
    throw error;
  }

  // Restore inventory stock
  for (const item of order.items) {
    await Product.findByIdAndUpdate(item.product, {
      $inc: { stock: item.quantity },
    });
  }

  order.orderStatus = 'CANCELLED';
  order.statusHistory.push({
    status: 'CANCELLED',
    changedAt: new Date(),
    changedBy: user._id,
    note: reason || (user.role === 'ADMIN' ? 'Cancelled by store admin' : 'Cancelled by customer'),
  });

  await order.save();
  return order.populate('customer', 'name email phone');
}

/**
 * Updates an order status (Admin only)
 */
async function updateOrderStatus(orderId, user, { status, note = '' }) {
  if (user.role !== 'ADMIN') {
    const error = new Error('Only store administrators can update order status.');
    error.statusCode = 403;
    throw error;
  }

  const validStatuses = [
    'PENDING',
    'CONFIRMED',
    'PREPARING',
    'READY',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
    'CANCELLED',
  ];

  if (!status || !validStatuses.includes(status)) {
    const error = new Error(`Invalid status '${status}'. Must be one of: ${validStatuses.join(', ')}`);
    error.statusCode = 400;
    throw error;
  }

  const order = await Order.findById(orderId);
  if (!order) {
    const error = new Error('Order not found');
    error.statusCode = 404;
    throw error;
  }

  const previousStatus = order.orderStatus;
  order.orderStatus = status;
  order.statusHistory.push({
    status,
    changedAt: new Date(),
    changedBy: user._id,
    note: note || `Order status updated to ${status} by admin`,
  });

  await order.save();

  // Decoupled domain event emission (Requirement 9)
  eventBus.emit(DOMAIN_EVENTS.ORDER_STATUS_CHANGED, {
    order,
    previousStatus,
    newStatus: status,
  });

  return order.populate('customer', 'name email phone');
}

/**
 * Retrieves aggregate store analytics and dashboard metrics (Admin only)
 */
async function getOrderStats(user) {
  if (user.role !== 'ADMIN') {
    const error = new Error('Only store administrators can view store statistics.');
    error.statusCode = 403;
    throw error;
  }

  const [
    totalOrders,
    pendingOrders,
    completedOrders,
    cancelledOrders,
    paidOrders,
    totalSalesAgg,
    recentOrders,
  ] = await Promise.all([
    Order.countDocuments(),
    Order.countDocuments({
      orderStatus: { $in: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'] },
    }),
    Order.countDocuments({ orderStatus: 'DELIVERED' }),
    Order.countDocuments({ orderStatus: 'CANCELLED' }),
    Order.countDocuments({ paymentStatus: 'PAID' }),
    Order.aggregate([
      { $match: { paymentStatus: 'PAID' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]),
    Order.find()
      .sort({ createdAt: -1 })
      .limit(8)
      .populate('customer', 'name email phone'),
  ]);

  const totalSales = totalSalesAgg[0]?.total || 0;

  // Recent 7 days sales aggregation
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const dailySalesAgg = await Order.aggregate([
    { $match: { paymentStatus: 'PAID', createdAt: { $gte: sevenDaysAgo } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        sales: { $sum: '$totalAmount' },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return {
    totalOrders,
    pendingOrders,
    completedOrders,
    cancelledOrders,
    paidOrders,
    totalSales,
    recentOrders,
    dailySales: dailySalesAgg,
  };
}

module.exports = {
  createOrder,
  getOrders,
  getOrderById,
  cancelOrder,
  updateOrderStatus,
  getOrderStats,
};
