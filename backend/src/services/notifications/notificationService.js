const Notification = require('../../models/Notification');
const User = require('../../models/User');
const { eventBus, DOMAIN_EVENTS } = require('../../events/eventBus');
const {
  EmailNotificationProvider,
  ExpoPushNotificationProvider,
} = require('./notificationProviders');

class NotificationService {
  constructor() {
    this.emailProvider = new EmailNotificationProvider();
    this.pushProvider = new ExpoPushNotificationProvider();
    this.isInitialized = false;
  }

  /**
   * Initializes event listeners on the domain event bus
   */
  init() {
    if (this.isInitialized) return;

    eventBus.on(DOMAIN_EVENTS.ORDER_STATUS_CHANGED, this.handleOrderStatusChanged.bind(this));
    eventBus.on(DOMAIN_EVENTS.PAYMENT_PROCESSED, this.handlePaymentProcessed.bind(this));

    this.isInitialized = true;
  }

  /**
   * Translates an order status into customer-friendly notification text
   */
  getOrderNotificationContent(status, reference) {
    const refText = reference ? `#${reference}` : '';

    switch (status) {
      case 'CONFIRMED':
        return {
          type: 'ORDER_CONFIRMED',
          title: 'Order Confirmed 🎉',
          message: `Your order ${refText} has been confirmed and queued for preparation.`,
        };
      case 'PREPARING':
        return {
          type: 'ORDER_PREPARING',
          title: 'Preparing Your Groceries 🧺',
          message: `Your order ${refText} is now being carefully picked and packed.`,
        };
      case 'READY':
        return {
          type: 'ORDER_READY',
          title: 'Order Ready for Dispatch 📦',
          message: `Your order ${refText} is ready and waiting for courier collection.`,
        };
      case 'OUT_FOR_DELIVERY':
        return {
          type: 'ORDER_OUT_FOR_DELIVERY',
          title: 'Out for Delivery 🚚',
          message: `Your order ${refText} is on the road and heading to your delivery address.`,
        };
      case 'DELIVERED':
        return {
          type: 'ORDER_DELIVERED',
          title: 'Order Delivered ✅',
          message: `Your order ${refText} has been delivered. Thank you for shopping with P2G!`,
        };
      default:
        return null;
    }
  }

  /**
   * Handles ORDER_STATUS_CHANGED domain event
   */
  async handleOrderStatusChanged({ order, previousStatus, newStatus }) {
    try {
      const content = this.getOrderNotificationContent(newStatus, order.paymentReference);
      if (!content) return; // Status without customer notification (e.g. initial PENDING)

      await this.dispatchNotification({
        customerId: order.customer?._id || order.customer,
        type: content.type,
        title: content.title,
        message: content.message,
        order,
        category: 'ORDER',
      });
    } catch (err) {
      console.warn('Error handling order status notification:', err.message);
    }
  }

  /**
   * Handles PAYMENT_PROCESSED domain event
   */
  async handlePaymentProcessed({ order, paymentStatus, reference, amount }) {
    try {
      let content;
      if (paymentStatus === 'PAID') {
        content = {
          type: 'PAYMENT_SUCCESSFUL',
          title: 'Payment Successful 💳',
          message: `Payment of ₦${Number(amount || order.totalAmount || 0).toLocaleString()} for order #${reference || order._id} was successful.`,
        };
      } else if (paymentStatus === 'FAILED') {
        content = {
          type: 'PAYMENT_FAILED',
          title: 'Payment Failed ❌',
          message: `Payment for order #${reference || order._id} could not be processed. Please retry checkout.`,
        };
      } else {
        return;
      }

      await this.dispatchNotification({
        customerId: order.customer?._id || order.customer,
        type: content.type,
        title: content.title,
        message: content.message,
        order,
        category: 'PAYMENT',
      });
    } catch (err) {
      console.warn('Error handling payment notification:', err.message);
    }
  }

  /**
   * Core notification dispatcher that checks customer preferences and dispatches across enabled channels
   */
  async dispatchNotification({ customerId, type, title, message, order, category }) {
    const customer = await User.findById(customerId);
    if (!customer) return null;

    const prefs = customer.notificationPreferences || {
      email: true,
      push: true,
      orderUpdates: true,
      paymentUpdates: true,
    };

    // 1. Check category-level preferences
    if (category === 'ORDER' && prefs.orderUpdates === false) {
      return null;
    }
    if (category === 'PAYMENT' && prefs.paymentUpdates === false) {
      return null;
    }

    // 2. Strict masking: Ensure NO sensitive payment info is exposed (Requirement 8)
    const safeData = {
      orderId: order?._id,
      orderReference: order?.paymentReference || String(order?._id || ''),
      totalAmount: order?.totalAmount ? Number(order.totalAmount) : undefined,
      deliveryAddress: order?.deliveryInformation?.address || undefined,
    };

    const channelRecords = [];

    // Channel 1: In-App notification (always saved to database)
    channelRecords.push({
      channel: 'IN_APP',
      status: 'SENT',
      dispatchedAt: new Date(),
    });

    // Channel 2: Email notification
    if (prefs.email !== false) {
      const orderObj = typeof order?.toObject === 'function' ? order.toObject() : (order || {});
      const emailResult = await this.emailProvider.send({
        customer,
        title,
        message,
        order: {
          ...orderObj,
          deliveryInformation: { address: safeData.deliveryAddress },
        },
        type,
      });

      channelRecords.push({
        channel: 'EMAIL',
        status: emailResult.success ? 'SENT' : 'FAILED',
        error: emailResult.error || undefined,
        dispatchedAt: new Date(),
      });
    } else {
      channelRecords.push({
        channel: 'EMAIL',
        status: 'SKIPPED',
        error: 'Disabled in customer preferences',
        dispatchedAt: new Date(),
      });
    }

    // Channel 3: Push notification (Expo)
    if (prefs.push !== false) {
      const pushResult = await this.pushProvider.send({
        customer,
        title,
        message,
        data: safeData,
      });

      channelRecords.push({
        channel: 'PUSH',
        status: pushResult.success ? 'SENT' : pushResult.skipped ? 'SKIPPED' : 'FAILED',
        error: pushResult.reason || pushResult.error || undefined,
        dispatchedAt: new Date(),
      });
    } else {
      channelRecords.push({
        channel: 'PUSH',
        status: 'SKIPPED',
        error: 'Disabled in customer preferences',
        dispatchedAt: new Date(),
      });
    }

    // 3. Persist notification in database for customer history
    const notification = await Notification.create({
      customer: customer._id,
      type,
      title,
      message,
      data: safeData,
      channels: channelRecords,
      isRead: false,
    });

    return notification;
  }

  /**
   * Retrieves paginated customer notification history with unread count
   */
  async getNotifications(customerId, query = {}) {
    const page = Math.max(parseInt(query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const filter = { customer: customerId };
    if (query.unreadOnly === 'true' || query.unreadOnly === true) {
      filter.isRead = false;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Notification.countDocuments(filter),
      Notification.countDocuments({ customer: customerId, isRead: false }),
    ]);

    return {
      notifications,
      unreadCount,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Marks a single notification as read
   */
  async markAsRead(notificationId, customerId) {
    const notification = await Notification.findOne({
      _id: notificationId,
      customer: customerId,
    });

    if (!notification) {
      const error = new Error('Notification not found.');
      error.statusCode = 404;
      throw error;
    }

    if (!notification.isRead) {
      notification.isRead = true;
      notification.readAt = new Date();
      await notification.save();
    }

    return notification;
  }

  /**
   * Marks all customer notifications as read
   */
  async markAllAsRead(customerId) {
    const result = await Notification.updateMany(
      { customer: customerId, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );

    return {
      success: true,
      modifiedCount: result.modifiedCount,
    };
  }

  /**
   * Retrieves customer notification preferences
   */
  async getPreferences(customerId) {
    const user = await User.findById(customerId);
    if (!user) {
      const error = new Error('Customer not found.');
      error.statusCode = 404;
      throw error;
    }

    return (
      user.notificationPreferences || {
        email: true,
        push: true,
        orderUpdates: true,
        paymentUpdates: true,
      }
    );
  }

  /**
   * Updates customer notification preferences
   */
  async updatePreferences(customerId, preferences) {
    const user = await User.findById(customerId);
    if (!user) {
      const error = new Error('Customer not found.');
      error.statusCode = 404;
      throw error;
    }

    if (!user.notificationPreferences) {
      user.notificationPreferences = {};
    }

    if (preferences.email !== undefined) user.notificationPreferences.email = Boolean(preferences.email);
    if (preferences.push !== undefined) user.notificationPreferences.push = Boolean(preferences.push);
    if (preferences.orderUpdates !== undefined) {
      user.notificationPreferences.orderUpdates = Boolean(preferences.orderUpdates);
    }
    if (preferences.paymentUpdates !== undefined) {
      user.notificationPreferences.paymentUpdates = Boolean(preferences.paymentUpdates);
    }

    await user.save();
    return user.notificationPreferences;
  }

  /**
   * Registers or updates an Expo push token for the customer
   */
  async registerPushToken(customerId, { token, deviceType = 'unknown' }) {
    if (!token || typeof token !== 'string' || token.trim().length === 0) {
      const error = new Error('A valid push token is required.');
      error.statusCode = 400;
      throw error;
    }

    const trimmedToken = token.trim();
    const user = await User.findById(customerId);
    if (!user) {
      const error = new Error('Customer not found.');
      error.statusCode = 404;
      throw error;
    }

    if (!user.pushTokens) {
      user.pushTokens = [];
    }

    // Check if token already exists
    const existingIndex = user.pushTokens.findIndex((t) => t.token === trimmedToken);
    if (existingIndex >= 0) {
      user.pushTokens[existingIndex].deviceType = deviceType;
      user.pushTokens[existingIndex].createdAt = new Date();
    } else {
      user.pushTokens.push({
        token: trimmedToken,
        deviceType,
        createdAt: new Date(),
      });
    }

    await user.save();
    return { success: true, message: 'Push token registered successfully.' };
  }

  /**
   * Unregisters a push token upon customer logout
   */
  async removePushToken(customerId, token) {
    if (!token) return { success: true };

    const user = await User.findById(customerId);
    if (!user || !user.pushTokens) return { success: true };

    user.pushTokens = user.pushTokens.filter((t) => t.token !== token.trim());
    await user.save();

    return { success: true, message: 'Push token removed successfully.' };
  }
}

// Export singleton instance
const notificationService = new NotificationService();

module.exports = notificationService;
