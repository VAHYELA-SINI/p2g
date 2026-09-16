const dotenv = require('dotenv');
dotenv.config();

// Ensure test simulation is active for test runner
process.env.USE_PAYSTACK_MOCK = 'true';
process.env.PAYSTACK_WEBHOOK_SECRET = process.env.PAYSTACK_WEBHOOK_SECRET || 'whsec_p2g_test_webhook_secret_key';

const crypto = require('crypto');
const mongoose = require('mongoose');
const app = require('./src/app');
const User = require('./src/models/User');
const Category = require('./src/models/Category');
const Product = require('./src/models/Product');
const Order = require('./src/models/Order');

function createWebhookSignature(payloadString, secret = process.env.PAYSTACK_WEBHOOK_SECRET) {
  return crypto.createHmac('sha512', secret).update(payloadString).digest('hex');
}

async function runPaystackTests() {
  console.log('====================================================');
  console.log('   P2G Paystack Payment Integration Test Suite      ');
  console.log('====================================================\n');

  // 1. Connect MongoDB
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✓ Connected to MongoDB');

  // 2. Start HTTP server on dynamic port
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;
  console.log(`✓ Test server running on ${baseUrl}\n`);

  try {
    const timestamp = Date.now();
    const password = 'Password123!';

    // Setup Customer
    const customerRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Paystack Tester',
        email: `paystack_user_${timestamp}@test.com`,
        phone: '08012345678',
        password,
        role: 'CUSTOMER',
      }),
    });
    const customerData = await customerRes.json();
    const customerToken = customerData.data.token;
    const customerId = customerData.data.user._id;
    console.log(`✓ Authenticated Customer: ${customerData.data.user.email} (ID: ${customerId})`);

    // Setup Product & Category
    const category = await Category.create({
      name: `Payment Category ${timestamp}`,
      slug: `payment-cat-${timestamp}`,
    });

    const testProduct = await Product.create({
      name: `Gourmet Dish ${timestamp}`,
      slug: `gourmet-dish-${timestamp}`,
      price: 4000,
      category: category._id,
      isAvailable: true,
      stock: 50,
    });
    console.log(`✓ Created Test Product: ₦${testProduct.price} (Stock: ${testProduct.stock})\n`);

    // Helper to create order
    async function createTestOrder(qty = 2) {
      const orderRes = await fetch(`${baseUrl}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({
          items: [{ product: testProduct._id.toString(), quantity: qty }],
          deliveryInformation: {
            fullName: 'Paystack Tester',
            phone: '08012345678',
            address: '12 Admiralty Way, Lekki Phase 1, Lagos',
            city: 'Lagos',
            additionalInstructions: 'Call at security gate',
          },
        }),
      });
      const orderJson = await orderRes.json();
      if (!orderRes.ok || !orderJson.success) {
        throw new Error(`Failed to create test order (${orderRes.status}): ${JSON.stringify(orderJson)}`);
      }
      return orderJson.data.order;
    }

    // =========================================================================
    // TEST 1: Successful Payment Initialization & Webhook Fulfillment
    // =========================================================================
    console.log('--- TEST 1: Successful Payment Initialization & Verification ---');
    const order1 = await createTestOrder(2);
    // Subtotal: 8000, Delivery Fee: 1500, Total: 9500
    console.log(`Order 1 created: ID=${order1._id}, Total=₦${order1.totalAmount}, Status=${order1.orderStatus}, Payment=${order1.paymentStatus}`);

    // Initialize transaction
    const initRes = await fetch(`${baseUrl}/api/payments/initialize/${order1._id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
    });
    const initData = await initRes.json();
    if (!initRes.ok || !initData.success) {
      throw new Error(`TEST 1 Failed to initialize payment: ${JSON.stringify(initData)}`);
    }

    const { authorization_url, reference } = initData.data;
    if (!authorization_url || !reference || !reference.startsWith('P2G_ORD_')) {
      throw new Error(`TEST 1 Invalid init response: ${JSON.stringify(initData.data)}`);
    }
    console.log(`✓ Initialized payment: Reference=${reference}`);
    console.log(`✓ Authorization URL generated: ${authorization_url}`);

    // Verify order in DB now holds the reference
    const order1InDb = await Order.findById(order1._id);
    if (order1InDb.paymentReference !== reference) {
      throw new Error(`TEST 1 Order in DB missing paymentReference: got ${order1InDb.paymentReference}`);
    }
    console.log(`✓ Order in DB correctly updated with paymentReference`);

    // Simulate Paystack charge.success webhook
    const expectedKobo = Math.round(order1.totalAmount * 100);
    const webhookPayload1 = {
      event: 'charge.success',
      data: {
        id: 11223344,
        reference,
        amount: expectedKobo,
        currency: 'NGN',
        channel: 'card',
        gateway_response: 'Successful',
        paid_at: new Date().toISOString(),
        ip_address: '102.89.23.4',
        metadata: {
          orderId: order1._id.toString(),
          customerId: customerId.toString(),
        },
      },
    };

    const payloadString1 = JSON.stringify(webhookPayload1);
    const signature1 = createWebhookSignature(payloadString1);

    const webhookRes1 = await fetch(`${baseUrl}/api/payments/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-paystack-signature': signature1,
      },
      body: payloadString1,
    });
    const webhookData1 = await webhookRes1.json();
    if (!webhookRes1.ok || webhookData1.status !== 'success') {
      throw new Error(`TEST 1 Webhook failed: ${JSON.stringify(webhookData1)}`);
    }

    // Verify DB state of order1
    const verifiedOrder1 = await Order.findById(order1._id);
    if (verifiedOrder1.paymentStatus !== 'PAID') {
      throw new Error(`TEST 1 Expected paymentStatus 'PAID', got '${verifiedOrder1.paymentStatus}'`);
    }
    if (verifiedOrder1.orderStatus !== 'CONFIRMED') {
      throw new Error(`TEST 1 Expected orderStatus 'CONFIRMED', got '${verifiedOrder1.orderStatus}'`);
    }
    if (!verifiedOrder1.paymentDetails || verifiedOrder1.paymentDetails.channel !== 'card') {
      throw new Error(`TEST 1 Expected paymentDetails to be populated, got: ${JSON.stringify(verifiedOrder1.paymentDetails)}`);
    }
    console.log(`✓ TEST 1 PASSED: Order successfully transitioned to PAID & CONFIRMED with paymentDetails stored\n`);

    // =========================================================================
    // TEST 2: Failed Payment Handling
    // =========================================================================
    console.log('--- TEST 2: Failed Payment Handling ---');
    const order2 = await createTestOrder(1);
    const initRes2 = await fetch(`${baseUrl}/api/payments/initialize/${order2._id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
    });
    const initData2 = await initRes2.json();
    const reference2 = initData2.data.reference;

    // Send charge.failed webhook
    const failedPayload = {
      event: 'charge.failed',
      data: {
        id: 22334455,
        reference: reference2,
        amount: Math.round(order2.totalAmount * 100),
        currency: 'NGN',
        gateway_response: 'Declined: Insufficient funds',
        metadata: {
          orderId: order2._id.toString(),
        },
      },
    };
    const failedString = JSON.stringify(failedPayload);
    const failedSig = createWebhookSignature(failedString);

    const failedWebhookRes = await fetch(`${baseUrl}/api/payments/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-paystack-signature': failedSig,
      },
      body: failedString,
    });
    const failedWebhookJson = await failedWebhookRes.json();
    if (!failedWebhookRes.ok || failedWebhookJson.status !== 'success') {
      throw new Error(`TEST 2 Failed webhook call failed: ${JSON.stringify(failedWebhookJson)}`);
    }

    const order2InDb = await Order.findById(order2._id);
    if (order2InDb.paymentStatus !== 'FAILED') {
      throw new Error(`TEST 2 Expected paymentStatus 'FAILED', got '${order2InDb.paymentStatus}'`);
    }
    console.log(`✓ TEST 2 PASSED: charge.failed appropriately set paymentStatus to 'FAILED'\n`);

    // =========================================================================
    // TEST 3: Duplicate Webhook (Idempotency)
    // =========================================================================
    console.log('--- TEST 3: Duplicate Webhook Idempotency ---');
    // Resend exact same webhook for Order 1 which is already PAID
    const dupWebhookRes = await fetch(`${baseUrl}/api/payments/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-paystack-signature': signature1,
      },
      body: payloadString1,
    });
    const dupWebhookJson = await dupWebhookRes.json();
    if (!dupWebhookRes.ok || dupWebhookJson.status !== 'success') {
      throw new Error(`TEST 3 Duplicate webhook failed: ${JSON.stringify(dupWebhookJson)}`);
    }

    const order1AfterDup = await Order.findById(order1._id);
    if (order1AfterDup.paymentStatus !== 'PAID') {
      throw new Error(`TEST 3 Order status altered on duplicate webhook: ${order1AfterDup.paymentStatus}`);
    }
    console.log(`✓ TEST 3 PASSED: Duplicate webhook processed idempotently with HTTP 200 without state duplication\n`);

    // =========================================================================
    // TEST 4: Invalid Reference Handling
    // =========================================================================
    console.log('--- TEST 4: Invalid Reference Handling ---');
    const invalidRefRes = await fetch(`${baseUrl}/api/payments/verify/P2G_NON_EXISTENT_REF_99999`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${customerToken}`,
      },
    });
    const invalidRefJson = await invalidRefRes.json();
    if (invalidRefRes.status !== 404 && invalidRefRes.status !== 400) {
      throw new Error(`TEST 4 Expected 404 or 400 for invalid reference, got ${invalidRefRes.status}: ${JSON.stringify(invalidRefJson)}`);
    }
    console.log(`✓ TEST 4 PASSED: Invalid reference correctly rejected with HTTP ${invalidRefRes.status} (${invalidRefJson.message})\n`);

    // =========================================================================
    // TEST 5: Incorrect Amount Detection
    // =========================================================================
    console.log('--- TEST 5: Incorrect Amount Detection ---');
    const order3 = await createTestOrder(1);
    const initRes3 = await fetch(`${baseUrl}/api/payments/initialize/${order3._id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
    });
    const initData3 = await initRes3.json();
    const reference3 = initData3.data.reference;

    // Send webhook with underpaid amount (e.g. 5000 kobo instead of expected 550000 kobo)
    const tamperedAmountPayload = {
      event: 'charge.success',
      data: {
        id: 33445566,
        reference: reference3,
        amount: 5000, // Underpaid!
        currency: 'NGN',
        metadata: {
          orderId: order3._id.toString(),
        },
      },
    };
    const tamperedAmountStr = JSON.stringify(tamperedAmountPayload);
    const tamperedAmountSig = createWebhookSignature(tamperedAmountStr);

    const tamperedRes = await fetch(`${baseUrl}/api/payments/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-paystack-signature': tamperedAmountSig,
      },
      body: tamperedAmountStr,
    });
    const tamperedJson = await tamperedRes.json();
    if (tamperedRes.status !== 400) {
      throw new Error(`TEST 5 Expected 400 for incorrect amount, got ${tamperedRes.status}: ${JSON.stringify(tamperedJson)}`);
    }

    const order3InDb = await Order.findById(order3._id);
    if (order3InDb.paymentStatus !== 'PENDING') {
      throw new Error(`TEST 5 Order status was modified despite incorrect amount: ${order3InDb.paymentStatus}`);
    }
    console.log(`✓ TEST 5 PASSED: Underpaid/tampered amount rejected with HTTP 400 (${tamperedJson.message})\n`);

    // =========================================================================
    // TEST 6: Incorrect Currency Rejection
    // =========================================================================
    console.log('--- TEST 6: Incorrect Currency Rejection ---');
    const order4 = await createTestOrder(1);
    const initRes4 = await fetch(`${baseUrl}/api/payments/initialize/${order4._id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
    });
    const initData4 = await initRes4.json();
    const reference4 = initData4.data.reference;

    // Send webhook with currency USD instead of NGN
    const foreignCurrencyPayload = {
      event: 'charge.success',
      data: {
        id: 44556677,
        reference: reference4,
        amount: Math.round(order4.totalAmount * 100),
        currency: 'USD', // Invalid currency!
        metadata: {
          orderId: order4._id.toString(),
        },
      },
    };
    const foreignCurrStr = JSON.stringify(foreignCurrencyPayload);
    const foreignCurrSig = createWebhookSignature(foreignCurrStr);

    const foreignCurrRes = await fetch(`${baseUrl}/api/payments/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-paystack-signature': foreignCurrSig,
      },
      body: foreignCurrStr,
    });
    const foreignCurrJson = await foreignCurrRes.json();
    if (foreignCurrRes.status !== 400) {
      throw new Error(`TEST 6 Expected 400 for incorrect currency, got ${foreignCurrRes.status}: ${JSON.stringify(foreignCurrJson)}`);
    }

    const order4InDb = await Order.findById(order4._id);
    if (order4InDb.paymentStatus !== 'PENDING') {
      throw new Error(`TEST 6 Order status was modified despite incorrect currency: ${order4InDb.paymentStatus}`);
    }
    console.log(`✓ TEST 6 PASSED: Non-NGN currency rejected with HTTP 400 (${foreignCurrJson.message})\n`);

    // =========================================================================
    // TEST 7: Invalid Webhook Signature Rejection
    // =========================================================================
    console.log('--- TEST 7: Invalid Webhook Signature Rejection ---');
    const tamperedSignature = 'deadbeefcafebabe1234567890abcdefdeadbeefcafebabe1234567890abcdefdeadbeefcafebabe1234567890abcdefdeadbeefcafebabe1234567890abcdef';
    const invalidSigRes = await fetch(`${baseUrl}/api/payments/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-paystack-signature': tamperedSignature,
      },
      body: payloadString1,
    });
    const invalidSigJson = await invalidSigRes.json();
    if (invalidSigRes.status !== 401) {
      throw new Error(`TEST 7 Expected 401 for invalid signature, got ${invalidSigRes.status}: ${JSON.stringify(invalidSigJson)}`);
    }
    console.log(`✓ TEST 7 PASSED: Fraudulent webhook rejected with HTTP 401 (${invalidSigJson.message})\n`);

    // =========================================================================
    // TEST 8: Repeated Verification (Idempotent GET /api/payments/verify/:reference)
    // =========================================================================
    console.log('--- TEST 8: Repeated Verification (GET /api/payments/verify/:reference) ---');
    const order5 = await createTestOrder(1);
    const initRes5 = await fetch(`${baseUrl}/api/payments/initialize/${order5._id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
    });
    const initData5 = await initRes5.json();
    const reference5 = initData5.data.reference;

    // Call verify endpoint 1st time
    const verifyRes1 = await fetch(`${baseUrl}/api/payments/verify/${reference5}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${customerToken}`,
      },
    });
    const verifyJson1 = await verifyRes1.json();
    if (!verifyRes1.ok || !verifyJson1.success) {
      throw new Error(`TEST 8 Initial verification failed: ${JSON.stringify(verifyJson1)}`);
    }
    console.log(`✓ 1st verification call successful: ${verifyJson1.message}`);

    const order5AfterFirst = await Order.findById(order5._id);
    if (order5AfterFirst.paymentStatus !== 'PAID') {
      throw new Error(`TEST 8 Order not marked PAID after 1st verify: ${order5AfterFirst.paymentStatus}`);
    }

    // Call verify endpoint 2nd time immediately
    const verifyRes2 = await fetch(`${baseUrl}/api/payments/verify/${reference5}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${customerToken}`,
      },
    });
    const verifyJson2 = await verifyRes2.json();
    if (!verifyRes2.ok || !verifyJson2.success) {
      throw new Error(`TEST 8 Repeated verification failed: ${JSON.stringify(verifyJson2)}`);
    }
    if (verifyJson2.message !== 'Payment already verified.') {
      throw new Error(`TEST 8 Expected idempotent message 'Payment already verified.', got: ${verifyJson2.message}`);
    }
    console.log(`✓ 2nd verification call returned idempotent success: ${verifyJson2.message}`);
    console.log(`✓ TEST 8 PASSED: Repeated verification handled idempotently\n`);

    console.log('====================================================');
    console.log('  ALL 8 PAYSTACK INTEGRATION TESTS PASSED!          ');
    console.log('====================================================');
  } finally {
    // Cleanup
    server.close();
    await mongoose.disconnect();
  }
}

runPaystackTests().catch((err) => {
  console.error('\n❌ Paystack Test Suite Error:', err);
  process.exit(1);
});
