const orderService = require('../services/orderService');

/**
 * @route   POST /api/orders
 * @desc    Create a new order (Authenticated customer)
 * @access  Private
 */
async function createOrder(req, res, next) {
  try {
    const order = await orderService.createOrder(req.user._id, req.body);

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: {
        order,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   GET /api/orders
 * @desc    Get order history (Customers see own; Admins see all)
 * @access  Private
 */
async function getOrders(req, res, next) {
  try {
    const result = await orderService.getOrders(req.user, req.query);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   GET /api/orders/:id
 * @desc    Get single order details
 * @access  Private
 */
async function getOrderById(req, res, next) {
  try {
    const order = await orderService.getOrderById(req.params.id, req.user);

    res.status(200).json({
      success: true,
      data: {
        order,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   POST /api/orders/:id/cancel
 * @desc    Cancel an order (Customer owns or Admin)
 * @access  Private
 */
async function cancelOrder(req, res, next) {
  try {
    const order = await orderService.cancelOrder(req.params.id, req.user, req.body.reason);

    res.status(200).json({
      success: true,
      message: 'Order cancelled successfully',
      data: {
        order,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   PATCH /api/orders/:id/status
 * @desc    Update order status (Admin only)
 * @access  Private (Admin)
 */
async function updateOrderStatus(req, res, next) {
  try {
    const order = await orderService.updateOrderStatus(req.params.id, req.user, req.body);

    res.status(200).json({
      success: true,
      message: 'Order status updated successfully',
      data: {
        order,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   GET /api/orders/stats
 * @desc    Get dashboard metrics and sales statistics (Admin only)
 * @access  Private (Admin)
 */
async function getOrderStats(req, res, next) {
  try {
    const stats = await orderService.getOrderStats(req.user);

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createOrder,
  getOrders,
  getOrderById,
  cancelOrder,
  updateOrderStatus,
  getOrderStats,
};
