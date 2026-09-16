const User = require('../models/User');
const Order = require('../models/Order');
const { escapeRegex } = require('../middleware/sanitizeMiddleware');

/**
 * @route   GET /api/customers
 * @desc    Get paginated customers list with order statistics (Admin only)
 * @access  Private (Admin)
 */
async function getCustomers(req, res, next) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;
    const search = req.query.search ? req.query.search.trim() : '';

    const matchStage = { role: 'CUSTOMER' };
    if (search) {
      const safeSearch = escapeRegex(search);
      matchStage.$or = [
        { name: { $regex: safeSearch, $options: 'i' } },
        { email: { $regex: safeSearch, $options: 'i' } },
        { phone: { $regex: safeSearch, $options: 'i' } },
      ];
    }

    const [customersAgg, totalCount] = await Promise.all([
      User.aggregate([
        { $match: matchStage },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
        {
          $lookup: {
            from: 'orders',
            localField: '_id',
            foreignField: 'customer',
            as: 'orders',
          },
        },
        {
          $project: {
            _id: 1,
            name: 1,
            email: 1,
            phone: 1,
            role: 1,
            isActive: 1,
            createdAt: 1,
            totalOrders: { $size: '$orders' },
            totalSpent: {
              $reduce: {
                input: {
                  $filter: {
                    input: '$orders',
                    as: 'o',
                    cond: { $eq: ['$$o.paymentStatus', 'PAID'] },
                  },
                },
                initialValue: 0,
                in: { $add: ['$$value', '$$this.totalAmount'] },
              },
            },
          },
        },
      ]),
      User.countDocuments(matchStage),
    ]);

    const pages = Math.ceil(totalCount / limit);

    res.status(200).json({
      success: true,
      data: {
        customers: customersAgg,
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
 * @route   GET /api/customers/:id
 * @desc    Get detailed customer profile with complete order history (Admin only)
 * @access  Private (Admin)
 */
async function getCustomerById(req, res, next) {
  try {
    const { id } = req.params;

    const customer = await User.findOne({ _id: id, role: 'CUSTOMER' });
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found.',
      });
    }

    const orders = await Order.find({ customer: id }).sort({ createdAt: -1 });

    const totalSpent = orders
      .filter((o) => o.paymentStatus === 'PAID')
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    res.status(200).json({
      success: true,
      data: {
        customer,
        orders,
        stats: {
          totalOrders: orders.length,
          totalSpent,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getCustomers,
  getCustomerById,
};
