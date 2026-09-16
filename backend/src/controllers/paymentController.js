const Order = require('../models/Order');
const paystackService = require('../services/paystackService');
const { escapeRegex } = require('../middleware/sanitizeMiddleware');

/**
 * @route   POST /api/payments/initialize/:orderId
 * @desc    Initialize a Paystack transaction for an existing pending order
 * @access  Private
 */
async function initializePayment(req, res, next) {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found.',
      });
    }

    // Ownership check
    if (req.user.role !== 'ADMIN' && order.customer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to pay for this order.',
      });
    }

    const transaction = await paystackService.initializeTransaction(order, req.user.email);

    res.status(200).json({
      success: true,
      message: 'Payment initialized successfully.',
      data: transaction,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   GET /api/payments/verify/:reference
 * @desc    Verifies transaction with Paystack and updates order status (Server-authoritative)
 * @access  Private
 */
async function verifyPayment(req, res, next) {
  try {
    const { reference } = req.params;

    // 1. Verify directly with Paystack REST API
    const transactionData = await paystackService.verifyTransaction(reference);

    if (transactionData.status !== 'success') {
      return res.status(400).json({
        success: false,
        message: `Transaction verification returned status: ${transactionData.status}`,
        data: transactionData,
      });
    }

    // 2. Authoritatively process payment success
    const result = await paystackService.processPaymentSuccess(transactionData);

    // IDOR Protection: ensure only order owner or ADMIN can retrieve confirmed order details
    const orderCustomerId = result.order.customer?._id || result.order.customer;
    if (req.user.role !== 'ADMIN' && orderCustomerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to view this transaction confirmation.',
      });
    }

    res.status(200).json({
      success: true,
      message: result.alreadyPaid
        ? 'Payment already verified.'
        : 'Payment verified and order confirmed successfully.',
      data: {
        order: result.order,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   POST /api/payments/webhook
 * @desc    Paystack Webhook Endpoint (HMAC-SHA512 verified)
 * @access  Public (Signature-guarded)
 */
async function handleWebhook(req, res, next) {
  try {
    const signature = req.headers['x-paystack-signature'];

    // Requirement 8: Validate webhook authenticity
    const isValid = paystackService.verifyWebhookSignature(req.rawBody, signature);
    if (!isValid) {
      console.warn('[Paystack Webhook] Invalid webhook signature detected.');
      return res.status(401).json({
        success: false,
        message: 'Invalid webhook signature.',
      });
    }

    const { event, data } = req.body || {};

    if (!event || !data) {
      return res.status(400).json({
        success: false,
        message: 'Malformed webhook payload.',
      });
    }

    // Handle charge.success
    if (event === 'charge.success') {
      await paystackService.processPaymentSuccess(data);
      return res.status(200).json({ status: 'success' });
    }

    // Handle charge.failed
    if (event === 'charge.failed') {
      await paystackService.processPaymentFailure(data);
      return res.status(200).json({ status: 'success' });
    }

    // Acknowledge any other events
    res.status(200).json({ status: 'ignored' });
  } catch (error) {
    console.error('[Paystack Webhook Error]:', error.message);
    // Return appropriate HTTP status
    res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || 'Webhook processing failed',
    });
  }
}

/**
 * @route   GET /api/payments
 * @desc    Get paginated payment records for admin dashboard
 * @access  Private (Admin)
 */
async function getPayments(req, res, next) {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Only store administrators can view payment records.',
      });
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;
    const status = req.query.status ? req.query.status.trim().toUpperCase() : null;
    const search = req.query.search ? req.query.search.trim() : null;

    const query = {
      $or: [
        { paymentReference: { $ne: null } },
        { paymentStatus: { $in: ['PAID', 'FAILED', 'REFUNDED'] } },
      ],
    };

    if (status && ['PENDING', 'PAID', 'FAILED', 'REFUNDED'].includes(status)) {
      query.paymentStatus = status;
    }

    if (search) {
      const safeSearch = escapeRegex(search);
      query.$or = [
        { paymentReference: { $regex: safeSearch, $options: 'i' } },
        { 'deliveryInformation.fullName': { $regex: safeSearch, $options: 'i' } },
        { 'deliveryInformation.phone': { $regex: safeSearch, $options: 'i' } },
      ];
    }

    const [orders, totalCount] = await Promise.all([
      Order.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('customer', 'name email phone')
        .select('paymentReference paymentStatus paymentDetails totalAmount orderStatus customer createdAt'),
      Order.countDocuments(query),
    ]);

    const payments = orders.map((o) => ({
      _id: o._id,
      orderId: o._id,
      paymentReference: o.paymentReference || 'N/A',
      amount: o.totalAmount,
      currency: o.paymentDetails?.currency || 'NGN',
      channel: o.paymentDetails?.channel || 'card',
      status: o.paymentStatus,
      orderStatus: o.orderStatus,
      customer: o.customer,
      paidAt: o.paymentDetails?.paidAt || null,
      createdAt: o.createdAt,
    }));

    const pages = Math.ceil(totalCount / limit);

    res.status(200).json({
      success: true,
      data: {
        payments,
        pagination: {
          page,
          limit,
          total: totalCount,
          pages,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  initializePayment,
  verifyPayment,
  handleWebhook,
  getPayments,
};
