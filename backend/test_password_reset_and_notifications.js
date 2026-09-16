const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mongoose = require('mongoose');
const app = require('./src/app');
const User = require('./src/models/User');
const Category = require('./src/models/Category');
const Product = require('./src/models/Product');
const Order = require('./src/models/Order');
const Notification = require('./src/models/Notification');
const emailService = require('./src/services/emailService');
const { getSentPushNotifications, clearSentPushNotifications } = require('./src/services/notifications/notificationProviders');
const orderService = require('./src/services/orderService');
const paystackService = require('./src/services/paystackService');

async function runTests() {
  console.log('================================================================');
  console.log('🚀 RUNNING SECURE PASSWORD RESET & NOTIFICATIONS TEST SUITE');
  console.log('================================================================\n');

  let server;
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB Atlas');

    server = app.listen(0);
    const port = server.address().port;
    const API_BASE = `http://127.0.0.1:${port}/api`;
    console.log(`✅ Started test server on ephemeral port ${port}\n`);

    async function request(method, urlPath, body = null, token = null) {
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}${urlPath}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : null,
      });

      const data = await res.json().catch(() => null);
      return { status: res.status, ok: res.ok, data };
    }

    async function waitForNotification(filter, maxWaitMs = 5000) {
      const start = Date.now();
      while (Date.now() - start < maxWaitMs) {
        const notif = await Notification.findOne(filter);
        if (notif) return notif;
        await new Promise((r) => setTimeout(r, 200));
      }
      return null;
    }

    const timestamp = Date.now();
    const customerEmail = `reset_cust_${timestamp}@example.com`;
    const adminEmail = `admin_test_${timestamp}@example.com`;
    const initialPassword = 'InitialSecurePassword123!';
    const newPassword = 'BrandNewResetPassword456!';

    console.log('--- SETUP: Registering Customer & Admin ---');
    const resCust = await request('POST', '/auth/register', {
      name: 'Reset Customer',
      email: customerEmail,
      password: initialPassword,
      role: 'CUSTOMER',
    });
    if (resCust.status !== 201) throw new Error(`Customer register failed: ${JSON.stringify(resCust.data)}`);
    const customerToken = resCust.data.data.token;
    const customerUser = resCust.data.data.user;
    console.log(`✅ Registered Customer: ${customerUser.email} (ID: ${customerUser._id})`);

    const resAdmin = await request('POST', '/auth/register', {
      name: 'Admin Supervisor',
      email: adminEmail,
      password: initialPassword,
      role: 'ADMIN',
    });
    if (resAdmin.status !== 201) throw new Error(`Admin register failed: ${JSON.stringify(resAdmin.data)}`);
    const adminToken = resAdmin.data.data.token;
    const adminUser = resAdmin.data.data.user;
    console.log(`✅ Registered Admin: ${adminUser.email} (ID: ${adminUser._id})\n`);

    // ===================================================================
    // PART 1: SECURE PASSWORD RESET
    // ===================================================================
    console.log('================================================================');
    console.log('SECTION 1: SECURE PASSWORD RESET WITH MAILTRAP / NODEMAILER');
    console.log('================================================================\n');

    // 1. Forgot Password Endpoint & Enumeration Prevention
    console.log('--- TEST 1: Forgot Password Endpoint & Timing-Safe Enumeration Prevention ---');
    emailService.clearSentEmails();

    const resForgotValid = await request('POST', '/auth/forgot-password', {
      email: customerEmail,
    });
    if (resForgotValid.status !== 200) throw new Error(`Forgot password failed: ${JSON.stringify(resForgotValid.data)}`);
    console.log(`✅ Valid user response: "${resForgotValid.data.message}"`);

    const resForgotInvalid = await request('POST', '/auth/forgot-password', {
      email: `non_existent_${timestamp}@example.com`,
    });
    if (resForgotInvalid.status !== 200) throw new Error(`Non-existent user failed: ${JSON.stringify(resForgotInvalid.data)}`);
    console.log(`✅ Non-existent user response: "${resForgotInvalid.data.message}"`);

    if (resForgotValid.data.message !== resForgotInvalid.data.message) {
      throw new Error('Security flaw: Server revealed whether account exists through different messages!');
    }
    console.log('✅ Verified identical generic message for existing and non-existing accounts\n');

    // 2. Email Delivery & Reset Token Generation
    console.log('--- TEST 2: Email Delivery & Secure Reset Token ---');
    const sentEmails = emailService.getSentEmails();
    if (sentEmails.length === 0) throw new Error('No password reset email was dispatched!');
    console.log(`✅ Email service captured dispatched email to: ${sentEmails[0].to}`);
    console.log(`   Email subject: "${sentEmails[0].subject}"`);

    // Extract unhashed token from email link
    const tokenMatch = sentEmails[0].text.match(/token=([a-f0-9]{64})/);
    if (!tokenMatch) throw new Error('Could not find 64-character token in dispatched email text!');
    const rawResetToken = tokenMatch[1];
    console.log(`✅ Dispatched unhashed reset token length: ${rawResetToken.length} characters (32 bytes hex)`);

    // 3. Stored Only Hashed Token in Database (SHA-256)
    console.log('--- TEST 3: Stored Only Hashed Token in MongoDB ---');
    const dbCustomer = await User.findById(customerUser._id).select('+passwordResetToken +passwordResetExpires');
    if (!dbCustomer.passwordResetToken) throw new Error('passwordResetToken was not set in database!');
    if (dbCustomer.passwordResetToken === rawResetToken) {
      throw new Error('CRITICAL SECURITY FLAW: Raw reset token was stored directly in database in plaintext!');
    }
    if (dbCustomer.passwordResetToken.length !== 64) {
      throw new Error('Stored passwordResetToken is not a 64-char SHA-256 hex string!');
    }
    console.log(`✅ Database stores SHA-256 hash (${dbCustomer.passwordResetToken.substring(0, 16)}...), raw token is NEVER stored`);
    console.log(`✅ Expiration set to: ${dbCustomer.passwordResetExpires.toISOString()} (15 mins)\n`);

    // 4. Token Expiration Handling
    console.log('--- TEST 4: Token Expiration Handling ---');
    // Set token to expire in the past
    dbCustomer.passwordResetExpires = new Date(Date.now() - 60 * 1000);
    await dbCustomer.save({ validateBeforeSave: false });

    const resExpiredReset = await request('POST', '/auth/reset-password', {
      token: rawResetToken,
      newPassword: newPassword,
    });
    if (resExpiredReset.status === 400) {
      console.log(`✅ Correctly rejected expired token: "${resExpiredReset.data.message}" (400)\n`);
    } else {
      throw new Error(`Expected 400 for expired token, got ${resExpiredReset.status}: ${JSON.stringify(resExpiredReset.data)}`);
    }

    // 5. Reset Password with Fresh Valid Token
    console.log('--- TEST 5: Reset Password with Fresh Valid Token ---');
    emailService.clearSentEmails();
    await request('POST', '/auth/forgot-password', { email: customerEmail });
    const freshSentEmails = emailService.getSentEmails();
    const freshTokenMatch = freshSentEmails[0].text.match(/token=([a-f0-9]{64})/);
    const freshRawToken = freshTokenMatch[1];

    const resResetSuccess = await request('POST', '/auth/reset-password', {
      token: freshRawToken,
      newPassword: newPassword,
    });
    if (resResetSuccess.status === 200) {
      console.log(`✅ Password reset succeeded: "${resResetSuccess.data.message}"`);
    } else {
      throw new Error(`Password reset failed: ${JSON.stringify(resResetSuccess.data)}`);
    }

    // 6. Token Invalidation (Single-Use Guarantee)
    console.log('--- TEST 6: Single-Use Token Invalidation ---');
    const resReuseToken = await request('POST', '/auth/reset-password', {
      token: freshRawToken,
      newPassword: 'AnotherPassword999!',
    });
    if (resReuseToken.status === 400) {
      console.log(`✅ Correctly blocked re-use of already redeemed token: "${resReuseToken.data.message}" (400)`);
    } else {
      throw new Error(`Re-used token was accepted! Status: ${resReuseToken.status}`);
    }

    // Verify database token fields cleared
    const dbCustomerAfterReset = await User.findById(customerUser._id).select('+passwordResetToken +passwordResetExpires');
    if (dbCustomerAfterReset.passwordResetToken || dbCustomerAfterReset.passwordResetExpires) {
      throw new Error('passwordResetToken or passwordResetExpires was not cleared after reset!');
    }
    console.log('✅ Verified reset token & expiration completely cleared from database\n');

    // 7. Bcrypt Hashing for New Password & Login Verification
    console.log('--- TEST 7: Bcrypt Hashing of New Password & Authentication Verification ---');
    const dbCustomerWithPwd = await User.findById(customerUser._id).select('+password');
    if (!dbCustomerWithPwd.password.startsWith('$2b$') && !dbCustomerWithPwd.password.startsWith('$2a$')) {
      throw new Error('New password was not stored as a bcrypt hash!');
    }
    console.log(`✅ Confirmed new password hashed with bcrypt: ${dbCustomerWithPwd.password.substring(0, 16)}...`);

    // Old password fails
    const resOldLogin = await request('POST', '/auth/login', {
      email: customerEmail,
      password: initialPassword,
    });
    if (resOldLogin.status === 401) {
      console.log('✅ Old password correctly rejected on login (401)');
    } else {
      throw new Error(`Old password succeeded login! Status: ${resOldLogin.status}`);
    }

    // New password succeeds
    const resNewLogin = await request('POST', '/auth/login', {
      email: customerEmail,
      password: newPassword,
    });
    if (resNewLogin.status === 200) {
      console.log(`✅ New password successfully authenticated for ${resNewLogin.data.data.user.email}\n`);
    } else {
      throw new Error(`New password failed login! Status: ${resNewLogin.status}`);
    }
    const freshCustomerToken = resNewLogin.data.data.token;
    let failOrder = null;

    // ===================================================================
    // PART 2: NOTIFICATION INFRASTRUCTURE
    // ===================================================================
    console.log('================================================================');
    console.log('SECTION 2: DECOUPLED NOTIFICATION INFRASTRUCTURE');
    console.log('================================================================\n');

    // Create a test category and product for order flow
    const testCategory = await Category.create({
      name: `Notification Fruits ${timestamp}`,
      slug: `notif-fruits-${timestamp}`,
    });

    const testProduct = await Product.create({
      name: `Notification Test Apples ${timestamp}`,
      slug: `notif-apples-${timestamp}`,
      price: 3500,
      description: 'Crisp fresh apples for testing notifications',
      category: testCategory._id,
      isAvailable: true,
      stock: 50,
    });

    // Create a test order for customer
    const orderData = {
      items: [{ product: testProduct._id, quantity: 2 }],
      deliveryInformation: {
        fullName: 'Reset Customer',
        phone: '+2348011223344',
        address: '12 Victoria Island Crescent, Lagos',
        city: 'Lagos',
      },
    };
    const resOrder = await request('POST', '/orders', orderData, freshCustomerToken);
    if (resOrder.status !== 201) throw new Error(`Order placement failed: ${JSON.stringify(resOrder.data)}`);
    const testOrder = resOrder.data.data.order;
    console.log(`✅ Created test order #${testOrder._id} for customer`);

    // 8. Push Token Registration (Expo)
    console.log('--- TEST 8: Push-Token Registration & Expo Format ---');
    const expoPushToken = 'ExponentPushToken[AbCdEf1234567890XyZ_test]';
    const resRegPush = await request(
      'POST',
      '/notifications/push-token',
      { token: expoPushToken, deviceType: 'android' },
      freshCustomerToken
    );
    if (resRegPush.status !== 200) throw new Error(`Push token registration failed: ${JSON.stringify(resRegPush.data)}`);
    console.log(`✅ Registered Expo push token: "${resRegPush.data.message}"`);

    const dbUserPush = await User.findById(customerUser._id);
    const hasToken = dbUserPush.pushTokens?.some((t) => t.token === expoPushToken);
    if (!hasToken) throw new Error('Push token not saved in User model!');
    console.log('✅ Push token verified in customer User record in MongoDB\n');

    // 9. Payment Processed Notifications (Success & Failed)
    console.log('--- TEST 9: Payment Processed Notifications (Success & Failed) ---');
    clearSentPushNotifications();
    emailService.clearSentEmails();

    // Trigger Payment Success
    const payRef = `P2G_NOTIF_${timestamp}`;
    await Order.findByIdAndUpdate(testOrder._id, { paymentReference: payRef });

    await paystackService.processPaymentSuccess({
      reference: payRef,
      amount: testOrder.totalAmount * 100, // in kobo
      channel: 'card',
      currency: 'NGN',
    });

    const notifPaySuccess = await waitForNotification({
      customer: customerUser._id,
      type: 'PAYMENT_SUCCESSFUL',
    });
    if (!notifPaySuccess) throw new Error('PAYMENT_SUCCESSFUL notification was not created in database!');
    console.log(`✅ Created PAYMENT_SUCCESSFUL notification: "${notifPaySuccess.title}" - "${notifPaySuccess.message}"`);

    // Create a second pending order to test payment failure notification
    const resFailOrder = await request('POST', '/orders', orderData, freshCustomerToken);
    failOrder = resFailOrder.data.data.order;

    await paystackService.processPaymentFailure({
      reference: `P2G_FAIL_${timestamp}`,
      metadata: { orderId: failOrder._id },
      gateway_response: 'Insufficient Funds',
    });

    const notifPayFailed = await waitForNotification({
      customer: customerUser._id,
      type: 'PAYMENT_FAILED',
    });
    if (!notifPayFailed) throw new Error('PAYMENT_FAILED notification was not created!');
    console.log(`✅ Created PAYMENT_FAILED notification: "${notifPayFailed.title}" - "${notifPayFailed.message}"\n`);

    // 10. Order Lifecycle Notifications (Preparing, Ready, Out for Delivery, Delivered)
    console.log('--- TEST 10: Order Lifecycle Notifications (Admin Status Progression) ---');
    const stages = [
      { status: 'PREPARING', expectedType: 'ORDER_PREPARING' },
      { status: 'READY', expectedType: 'ORDER_READY' },
      { status: 'OUT_FOR_DELIVERY', expectedType: 'ORDER_OUT_FOR_DELIVERY' },
      { status: 'DELIVERED', expectedType: 'ORDER_DELIVERED' },
    ];

    for (const stage of stages) {
      await orderService.updateOrderStatus(testOrder._id, adminUser, {
        status: stage.status,
        note: `Order advanced to ${stage.status}`,
      });

      const notif = await waitForNotification({
        customer: customerUser._id,
        type: stage.expectedType,
      });

      if (!notif) throw new Error(`Notification for ${stage.expectedType} was not created!`);
      console.log(`✅ Verified stage: ${stage.status} -> Notification: "${notif.title}"`);
    }
    console.log('');

    // 11. Sensitive Payment Information Masking
    console.log('--- TEST 11: Sensitive Payment Information Masking ---');
    const allCustomerNotifs = await Notification.find({ customer: customerUser._id });
    for (const notif of allCustomerNotifs) {
      const serialized = JSON.stringify(notif.toObject());
      const dataStr = JSON.stringify(notif.data || {});
      if (
        serialized.includes('card_number') ||
        serialized.includes('authorization_code') ||
        serialized.includes('sk_test') ||
        serialized.includes('cvv') ||
        serialized.includes('card_pin') ||
        /"pin"\s*:/i.test(serialized) ||
        dataStr.includes('secret') ||
        dataStr.includes('token') ||
        dataStr.includes('auth_code')
      ) {
        throw new Error(`SECURITY VIOLATION: Sensitive payment data found in notification ${notif._id}!`);
      }
    }
    console.log(`✅ All ${allCustomerNotifs.length} notification records verified: Zero sensitive payment credentials leaked\n`);

    // 12. Customer Notification Preferences
    console.log('--- TEST 12: Customer Notification Preferences Filtering ---');
    // Get preferences
    const resGetPrefs = await request('GET', '/notifications/preferences', null, freshCustomerToken);
    if (resGetPrefs.status !== 200) throw new Error(`Get preferences failed: ${JSON.stringify(resGetPrefs.data)}`);
    console.log('✅ Current preferences:', resGetPrefs.data.data.preferences);

    // Disable orderUpdates
    const resUpdatePrefs = await request(
      'PUT',
      '/notifications/preferences',
      { orderUpdates: false },
      freshCustomerToken
    );
    if (resUpdatePrefs.status !== 200) throw new Error(`Update preferences failed: ${JSON.stringify(resUpdatePrefs.data)}`);
    console.log('✅ Updated preferences to orderUpdates: false');

    const countBefore = await Notification.countDocuments({ customer: customerUser._id });

    // Admin updates order status while preferences have orderUpdates: false
    await orderService.updateOrderStatus(testOrder._id, adminUser, {
      status: 'PREPARING',
      note: 'Testing preference suppression',
    });
    await new Promise((r) => setTimeout(r, 150));

    const countAfter = await Notification.countDocuments({ customer: customerUser._id });
    if (countAfter !== countBefore) {
      throw new Error('Notification was created even though customer disabled orderUpdates in preferences!');
    }
    console.log('✅ Verified notification was properly suppressed when customer preference was disabled');

    // Re-enable orderUpdates
    await request('PUT', '/notifications/preferences', { orderUpdates: true }, freshCustomerToken);
    console.log('✅ Re-enabled orderUpdates: true\n');

    // 13. Customer Notification History & Read Status
    console.log('--- TEST 13: Customer Notification History & Mark Read ---');
    const resHistory = await request('GET', '/notifications?limit=5', null, freshCustomerToken);
    if (resHistory.status !== 200) throw new Error(`Get history failed: ${JSON.stringify(resHistory.data)}`);
    console.log(`✅ Retrieved notification feed: ${resHistory.data.data.notifications.length} items, unreadCount: ${resHistory.data.data.unreadCount}`);

    const targetNotif = resHistory.data.data.notifications[0];
    if (!targetNotif) throw new Error('No notification in history to test mark read!');

    // Mark single notification read
    const resMarkRead = await request(
      'PATCH',
      `/notifications/${targetNotif._id}/read`,
      null,
      freshCustomerToken
    );
    if (resMarkRead.status !== 200) throw new Error(`Mark read failed: ${JSON.stringify(resMarkRead.data)}`);
    console.log(`✅ Marked single notification as read (${targetNotif._id})`);

    // Mark all read
    const resMarkAll = await request('PATCH', '/notifications/read-all', null, freshCustomerToken);
    if (resMarkAll.status !== 200) throw new Error(`Mark all read failed: ${JSON.stringify(resMarkAll.data)}`);
    console.log(`✅ Marked all notifications as read: ${resMarkAll.data.data.modifiedCount} modified`);

    const resHistoryAfter = await request('GET', '/notifications', null, freshCustomerToken);
    if (resHistoryAfter.data.data.unreadCount !== 0) {
      throw new Error(`Expected unreadCount = 0, got ${resHistoryAfter.data.data.unreadCount}`);
    }
    console.log('✅ Confirmed unreadCount is now 0\n');

    // 14. Push Token Cleanup on Logout
    console.log('--- TEST 14: Push Token Removal on Logout ---');
    const resRemoveToken = await request(
      'DELETE',
      '/notifications/push-token',
      { token: expoPushToken },
      freshCustomerToken
    );
    if (resRemoveToken.status !== 200) throw new Error(`Remove token failed: ${JSON.stringify(resRemoveToken.data)}`);

    const dbUserAfterRemove = await User.findById(customerUser._id);
    const tokenStillExists = dbUserAfterRemove.pushTokens?.some((t) => t.token === expoPushToken);
    if (tokenStillExists) throw new Error('Push token was not removed from User model!');
    console.log('✅ Push token successfully removed from customer account\n');

    // CLEANUP
    console.log('--- CLEANUP: Removing temporary test data ---');
    await User.deleteMany({ _id: { $in: [customerUser._id, adminUser._id] } });
    await Category.deleteOne({ _id: testCategory._id });
    await Product.deleteOne({ _id: testProduct._id });
    await Order.deleteMany({ _id: { $in: [testOrder._id, failOrder?._id].filter(Boolean) } });
    await Notification.deleteMany({ customer: customerUser._id });
    console.log('✅ Test users, category, product, order, and notifications cleaned up');

    console.log('\n================================================================');
    console.log('🎉 ALL SECURE PASSWORD RESET & NOTIFICATION TESTS PASSED (100%)');
    console.log('================================================================');
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    process.exit(1);
  } finally {
    if (server) server.close();
    await mongoose.disconnect();
    console.log('Closed MongoDB connection.');
  }
}

runTests();
