const emailService = require('../emailService');

// Capture dispatched push notifications for testing/debugging
const sentPushNotifications = [];

/**
 * Base Notification Provider abstraction
 */
class BaseNotificationProvider {
  constructor(name) {
    this.name = name;
  }

  async send(payload) {
    throw new Error(`send() method must be implemented by ${this.constructor.name}`);
  }
}

/**
 * Email Notification Provider using Mailtrap/nodemailer emailService
 */
class EmailNotificationProvider extends BaseNotificationProvider {
  constructor() {
    super('EMAIL');
  }

  async send({ customer, title, message, order, type }) {
    if (!customer?.email) {
      return { success: false, error: 'Customer has no email address configured.' };
    }

    try {
      const result = await emailService.sendOrderNotificationEmail({
        to: customer.email,
        name: customer.name,
        order,
        type,
        title,
        message,
      });

      return {
        success: result.success,
        error: result.error,
        messageId: result.messageId,
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

/**
 * Expo Push Notification Provider
 * Implements standard Expo push notification dispatch architecture
 */
class ExpoPushNotificationProvider extends BaseNotificationProvider {
  constructor() {
    super('PUSH');
    this.expoApiUrl = 'https://exp.host/--/api/v2/push/send';
  }

  /**
   * Validates if a token matches the standard Expo push token format
   */
  isExpoPushToken(token) {
    return (
      typeof token === 'string' &&
      (token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken['))
    );
  }

  async send({ customer, title, message, data = {} }) {
    const pushTokens = customer?.pushTokens || [];

    if (!pushTokens || pushTokens.length === 0) {
      return { success: false, skipped: true, reason: 'No push tokens registered for customer.' };
    }

    const validTokens = pushTokens
      .map((t) => t.token)
      .filter((token) => token && typeof token === 'string');

    if (validTokens.length === 0) {
      return { success: false, skipped: true, reason: 'No valid push tokens.' };
    }

    const messages = validTokens.map((to) => ({
      to,
      sound: 'default',
      title,
      body: message,
      data: {
        orderId: data.orderId ? String(data.orderId) : undefined,
        orderReference: data.orderReference,
      },
      priority: 'high',
      channelId: 'orders',
    }));

    // Record in memory for verification & inspection
    sentPushNotifications.push({
      customerId: customer._id,
      tokens: validTokens,
      title,
      message,
      data,
      dispatchedAt: new Date(),
    });

    // If running in development / test without external network, return simulated success
    if (process.env.NODE_ENV === 'test' || process.env.MOCK_EXPO_PUSH === 'true') {
      return {
        success: true,
        dispatchedCount: messages.length,
        simulated: true,
      };
    }

    // Live Expo Push API dispatch
    try {
      const response = await fetch(this.expoApiUrl, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      });

      const resData = await response.json();
      return {
        success: response.ok,
        data: resData,
        dispatchedCount: messages.length,
      };
    } catch (error) {
      console.warn('Expo push dispatch encountered error:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

function getSentPushNotifications() {
  return [...sentPushNotifications];
}

function clearSentPushNotifications() {
  sentPushNotifications.length = 0;
}

module.exports = {
  BaseNotificationProvider,
  EmailNotificationProvider,
  ExpoPushNotificationProvider,
  getSentPushNotifications,
  clearSentPushNotifications,
};
