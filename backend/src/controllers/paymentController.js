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

/**
 * Renders a clean, responsive monochrome HTML confirmation page for browser redirects from Paystack
 */
function renderPaymentHtml({ success, title, message, orderId, orderRef, reference, amount }) {
  const deepLink = orderId ? `p2g://order/${orderId}` : 'p2g://orders';
  const webReturn = process.env.CLIENT_URL ? `${process.env.CLIENT_URL}/(app)/order/${orderId}` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - P2G</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    body { background-color: #F8F9FA; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; color: #111827; }
    .card { background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 20px; max-width: 440px; width: 100%; padding: 36px 28px; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.05); }
    .icon { width: 68px; height: 68px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; font-size: 32px; font-weight: bold; }
    .icon.success { background: #111827; color: #FFFFFF; }
    .icon.failure { background: #F3F4F6; color: #111827; border: 2px solid #E5E7EB; }
    h1 { font-size: 22px; font-weight: 800; margin-bottom: 10px; color: #111827; }
    p { font-size: 14px; color: #6B7280; line-height: 1.5; margin-bottom: 24px; }
    .details { background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 12px; padding: 16px; margin-bottom: 24px; text-align: left; }
    .row { display: flex; justify-content: space-between; font-size: 13px; padding: 6px 0; border-bottom: 1px solid #F3F4F6; }
    .row:last-child { border-bottom: none; font-weight: 700; color: #111827; }
    .btn { display: block; background: #111827; color: #FFFFFF; text-decoration: none; padding: 14px 20px; border-radius: 12px; font-weight: 700; font-size: 15px; margin-bottom: 12px; transition: background 0.2s; }
    .btn:hover { background: #374151; }
    .btn-secondary { background: #F3F4F6; color: #111827; border: 1px solid #E5E7EB; }
    .note { font-size: 12px; color: #9CA3AF; margin-top: 14px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon ${success ? 'success' : 'failure'}">${success ? '✓' : '✕'}</div>
    <h1>${title}</h1>
    <p>${message}</p>
    ${reference ? `
      <div class="details">
        ${orderRef ? `<div class="row"><span>Order Reference</span><span>#${orderRef}</span></div>` : ''}
        ${amount ? `<div class="row"><span>Total Paid</span><span>${amount}</span></div>` : ''}
        <div class="row"><span>Paystack Reference</span><span style="font-family: monospace; font-size: 11px;">${reference.slice(-14)}</span></div>
      </div>
    ` : ''}
    <a href="${deepLink}" class="btn">Return to P2G App</a>
    ${webReturn ? `<a href="${webReturn}" class="btn btn-secondary">Open in Web Browser</a>` : ''}
    <p class="note">You can safely close this browser window.</p>
  </div>
  ${success ? `
  <script>
    // Automatic deep link back into mobile application
    setTimeout(function() {
      try {
        window.location.href = "${deepLink}";
      } catch (e) {}
    }, 1500);
  </script>
  ` : ''}
</body>
</html>`;
}

/**
 * @route   GET /api/payments/callback and GET /api/payments/verify
 * @desc    Public callback endpoint when user is redirected back from Paystack checkout
 * @access  Public
 */
async function handleCallback(req, res, next) {
  try {
    const reference = req.query.reference || req.query.trxref;
    const wantsJson = req.query.format === 'json' || (req.headers.accept && req.headers.accept.includes('application/json'));

    if (!reference) {
      if (wantsJson) {
        return res.status(400).json({
          success: false,
          message: 'No transaction reference was provided in the callback.',
        });
      }
      return res.status(400).send(renderPaymentHtml({
        success: false,
        title: 'Payment Reference Missing',
        message: 'No transaction reference was received from the payment provider.',
      }));
    }

    // 1. Verify directly with Paystack REST API
    const transactionData = await paystackService.verifyTransaction(reference);

    if (transactionData.status === 'success') {
      // 2. Authoritatively process payment success
      const result = await paystackService.processPaymentSuccess(transactionData);
      const order = result.order;
      const orderId = order?._id ? order._id.toString() : '';
      const orderRef = orderId.slice(-8).toUpperCase();
      const amount = order?.totalAmount ? `₦${Number(order.totalAmount).toLocaleString()}` : '';

      if (wantsJson) {
        return res.status(200).json({
          success: true,
          message: 'Payment verified and order confirmed.',
          data: { order },
        });
      }

      return res.status(200).send(renderPaymentHtml({
        success: true,
        title: 'Payment Confirmed!',
        orderId,
        orderRef,
        reference,
        amount,
        message: 'Your payment was successfully verified and your order has been confirmed.',
      }));
    } else {
      if (wantsJson) {
        return res.status(400).json({
          success: false,
          message: `Payment verification returned status: ${transactionData.status}`,
          data: transactionData,
        });
      }

      return res.status(400).send(renderPaymentHtml({
        success: false,
        title: 'Payment Incomplete',
        reference,
        message: `Transaction status is '${transactionData.status || 'declined'}'. Payment was not completed.`,
      }));
    }
  } catch (error) {
    console.error('[Payment Callback Error]:', error.message);
    const wantsJson = req.query.format === 'json' || (req.headers.accept && req.headers.accept.includes('application/json'));
    if (wantsJson) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Payment verification failed.',
      });
    }

    return res.status(error.statusCode || 500).send(renderPaymentHtml({
      success: false,
      title: 'Payment Verification Error',
      message: error.message || 'Could not verify payment with Paystack.',
    }));
  }
}

module.exports = {
  initializePayment,
  verifyPayment,
  handleCallback,
  handleWebhook,
  getPayments,
};
