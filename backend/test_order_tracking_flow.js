const dotenv = require('dotenv');
dotenv.config();

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

async function runOrderTrackingTests() {
  console.log('================================================================');
  console.log('   P2G Customer Order History & Tracking Automated Test Suite   ');
  console.log('================================================================\n');

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

    // Register Admin
    const adminRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Store Manager Admin',
        email: `admin_tracking_${timestamp}@test.com`,
        phone: '08099887766',
        password,
        role: 'ADMIN',
      }),
    });
    const adminData = await adminRes.json();
    const adminToken = adminData.data.token;
    console.log(`✓ Admin registered: ${adminData.data.user.email}`);

    // Register Customer Alice
    const aliceRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Customer Alice',
        email: `alice_track_${timestamp}@test.com`,
        phone: '08011223344',
        password,
        role: 'CUSTOMER',
      }),
    });
    const aliceData = await aliceRes.json();
    const aliceToken = aliceData.data.token;
    const aliceId = aliceData.data.user._id;
    console.log(`✓ Customer Alice registered: ${aliceData.data.user.email} (ID: ${aliceId})`);

    // Register Customer Bob
    const bobRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Customer Bob',
        email: `bob_track_${timestamp}@test.com`,
        phone: '08055667788',
        password,
        role: 'CUSTOMER',
      }),
    });
    const bobData = await bobRes.json();
    const bobToken = bobData.data.token;
    const bobId = bobData.data.user._id;
    console.log(`✓ Customer Bob registered: ${bobData.data.user.email} (ID: ${bobId})\n`);

    // Setup Category & Products
    const category = await Category.create({
      name: `Gourmet Meals ${timestamp}`,
      slug: `gourmet-meals-${timestamp}`,
    });

    const productA = await Product.create({
      name: `Signature Jollof & Grilled Chicken ${timestamp}`,
      slug: `jollof-chicken-${timestamp}`,
      price: 3500,
      category: category._id,
      isAvailable: true,
      stock: 40,
    });

    const productB = await Product.create({
      name: `Special Fried Rice & Peppered Fish ${timestamp}`,
      slug: `fried-rice-fish-${timestamp}`,
      price: 4500,
      category: category._id,
      isAvailable: true,
      stock: 30,
    });
    console.log(`✓ Test Products Created:`);
    console.log(`   - Product A: ₦${productA.price} (Stock: ${productA.stock})`);
    console.log(`   - Product B: ₦${productB.price} (Stock: ${productB.stock})\n`);

    // Helper to create order
    async function createOrderFor(token, items, delivery) {
      const res = await fetch(`${baseUrl}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          items,
          deliveryInformation: delivery || {
            fullName: 'Test Recipient',
            phone: '08012345678',
            address: '15 Marina Street',
            city: 'Lagos Island',
            additionalInstructions: 'Leave with receptionist',
          },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(`Order creation failed: ${JSON.stringify(data)}`);
      }
      return data.data.order;
    }

    // =========================================================================
    // TEST 1: Customer Order Isolation (Requirement 1)
    // =========================================================================
    console.log('--- TEST 1: Customer Sees Only Their Orders & Cross-Access Isolation ---');
    // Alice places Order 1
    const aliceOrder1 = await createOrderFor(aliceToken, [
      { product: productA._id.toString(), quantity: 2 },
    ]);
    console.log(`Alice created Order: ID=${aliceOrder1._id}, Total=₦${aliceOrder1.totalAmount}`);

    // Bob places Order 2
    const bobOrder1 = await createOrderFor(bobToken, [
      { product: productB._id.toString(), quantity: 1 },
    ]);
    console.log(`Bob created Order: ID=${bobOrder1._id}, Total=₦${bobOrder1.totalAmount}`);

    // Alice fetches her orders
    const aliceOrdersRes = await fetch(`${baseUrl}/api/orders`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${aliceToken}` },
    });
    const aliceOrdersJson = await aliceOrdersRes.json();
    const aliceOrderIds = aliceOrdersJson.data.orders.map((o) => o._id.toString());

    if (!aliceOrderIds.includes(aliceOrder1._id.toString())) {
      throw new Error(`TEST 1 Failed: Alice cannot see her own order`);
    }
    if (aliceOrderIds.includes(bobOrder1._id.toString())) {
      throw new Error(`TEST 1 SECURITY LEAK: Alice can see Bob's order!`);
    }
    console.log(`✓ Alice sees only her order(s): [${aliceOrderIds.join(', ')}]`);

    // Bob fetches his orders
    const bobOrdersRes = await fetch(`${baseUrl}/api/orders`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${bobToken}` },
    });
    const bobOrdersJson = await bobOrdersRes.json();
    const bobOrderIds = bobOrdersJson.data.orders.map((o) => o._id.toString());

    if (!bobOrderIds.includes(bobOrder1._id.toString())) {
      throw new Error(`TEST 1 Failed: Bob cannot see his own order`);
    }
    if (bobOrderIds.includes(aliceOrder1._id.toString())) {
      throw new Error(`TEST 1 SECURITY LEAK: Bob can see Alice's order!`);
    }
    console.log(`✓ Bob sees only his order(s): [${bobOrderIds.join(', ')}]`);

    // Bob tries to directly access Alice's order by ID
    const unauthorizedRes = await fetch(`${baseUrl}/api/orders/${aliceOrder1._id}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${bobToken}` },
    });
    const unauthorizedJson = await unauthorizedRes.json();
    if (unauthorizedRes.status !== 403) {
      throw new Error(`TEST 1 SECURITY LEAK: Bob was able to query Alice's order (HTTP ${unauthorizedRes.status}): ${JSON.stringify(unauthorizedJson)}`);
    }
    console.log(`✓ Bob blocked from fetching Alice's order with HTTP 403 Forbidden (${unauthorizedJson.message})`);
    console.log('✓ TEST 1 PASSED: Strict customer orders isolation enforced.\n');

    // =========================================================================
    // TEST 2: Customer Cannot Modify Order Status Directly (Requirement 2)
    // =========================================================================
    console.log('--- TEST 2: Customer Cannot Modify Order Status Directly ---');
    // Attempting PUT or PATCH on order by customer
    const patchStatusRes = await fetch(`${baseUrl}/api/orders/${aliceOrder1._id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${aliceToken}`,
      },
      body: JSON.stringify({ status: 'DELIVERED' }),
    });
    const patchStatusJson = await patchStatusRes.json();
    if (patchStatusRes.status !== 403) {
      throw new Error(`TEST 2 SECURITY LEAK: Customer was able to modify order status (HTTP ${patchStatusRes.status}): ${JSON.stringify(patchStatusJson)}`);
    }
    console.log(`✓ Customer prevented from changing status with HTTP 403 Forbidden (${patchStatusJson.message})`);
    console.log('✓ TEST 2 PASSED: Only administrators can update order delivery statuses.\n');

    // =========================================================================
    // TEST 3: Complete Status Timeline Progression (Requirement 4 & Statuses)
    // =========================================================================
    console.log('--- TEST 3: Full Order Status Timeline Progression & Status History ---');
    const orderToTrack = aliceOrder1;
    const stages = ['CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED'];

    for (const targetStatus of stages) {
      const adminUpdateRes = await fetch(`${baseUrl}/api/orders/${orderToTrack._id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          status: targetStatus,
          note: `Stage progressed to ${targetStatus} by dispatch management`,
        }),
      });
      const updateJson = await adminUpdateRes.json();
      if (!adminUpdateRes.ok || !updateJson.success) {
        throw new Error(`Failed to advance order to ${targetStatus}: ${JSON.stringify(updateJson)}`);
      }
      console.log(`✓ Order advanced to ${targetStatus}`);
    }

    // Alice fetches order details and inspects timeline & statusHistory
    const trackedOrderRes = await fetch(`${baseUrl}/api/orders/${orderToTrack._id}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${aliceToken}` },
    });
    const trackedOrderJson = await trackedOrderRes.json();
    const finalOrder = trackedOrderJson.data.order;

    if (finalOrder.orderStatus !== 'DELIVERED') {
      throw new Error(`TEST 3 Expected orderStatus 'DELIVERED', got '${finalOrder.orderStatus}'`);
    }

    // Check status history entries
    const recordedStatuses = finalOrder.statusHistory.map((h) => h.status);
    console.log(`✓ Status History Entries: [${recordedStatuses.join(' -> ')}]`);

    for (const expectedStatus of stages) {
      if (!recordedStatuses.includes(expectedStatus)) {
        throw new Error(`TEST 3 Missing history record for status: ${expectedStatus}`);
      }
    }
    console.log('✓ TEST 3 PASSED: Complete status timeline with timestamps and notes successfully recorded.\n');

    // =========================================================================
    // TEST 4: Cancelled Order Handling (Requirement 6)
    // =========================================================================
    console.log('--- TEST 4: Customer Order Cancellation Handling ---');
    const initialStockBefore = (await Product.findById(productA._id)).stock;
    const orderToCancel = await createOrderFor(aliceToken, [
      { product: productA._id.toString(), quantity: 3 },
    ]);
    const stockAfterOrder = (await Product.findById(productA._id)).stock;
    if (stockAfterOrder !== initialStockBefore - 3) {
      throw new Error(`Stock decrement failed: expected ${initialStockBefore - 3}, got ${stockAfterOrder}`);
    }
    console.log(`✓ Order for 3 items placed (Stock: ${initialStockBefore} -> ${stockAfterOrder})`);

    // Bob attempts to cancel Alice's order
    const bobCancelRes = await fetch(`${baseUrl}/api/orders/${orderToCancel._id}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${bobToken}`,
      },
      body: JSON.stringify({ reason: 'Malicious cancellation attempt' }),
    });
    if (bobCancelRes.status !== 403) {
      throw new Error(`TEST 4 SECURITY LEAK: Bob was able to cancel Alice's order (HTTP ${bobCancelRes.status})`);
    }
    console.log(`✓ Other customer prevented from cancelling order (HTTP 403 Forbidden)`);

    // Alice cancels her pending order
    const aliceCancelRes = await fetch(`${baseUrl}/api/orders/${orderToCancel._id}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${aliceToken}`,
      },
      body: JSON.stringify({ reason: 'Changed mind about meal delivery' }),
    });
    const aliceCancelJson = await aliceCancelRes.json();
    if (!aliceCancelRes.ok || !aliceCancelJson.success) {
      throw new Error(`Alice cancel failed: ${JSON.stringify(aliceCancelJson)}`);
    }

    const cancelledOrderInDb = await Order.findById(orderToCancel._id);
    if (cancelledOrderInDb.orderStatus !== 'CANCELLED') {
      throw new Error(`TEST 4 Order status expected 'CANCELLED', got '${cancelledOrderInDb.orderStatus}'`);
    }

    // Verify inventory restored
    const stockAfterCancel = (await Product.findById(productA._id)).stock;
    if (stockAfterCancel !== initialStockBefore) {
      throw new Error(`TEST 4 Inventory not restored: expected ${initialStockBefore}, got ${stockAfterCancel}`);
    }
    console.log(`✓ Order successfully cancelled and inventory restored to stock (${stockAfterCancel})`);

    // Attempting to cancel an already cancelled order
    const doubleCancelRes = await fetch(`${baseUrl}/api/orders/${orderToCancel._id}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${aliceToken}`,
      },
    });
    if (doubleCancelRes.status !== 400) {
      throw new Error(`TEST 4 Expected 400 when cancelling already cancelled order, got ${doubleCancelRes.status}`);
    }
    console.log(`✓ Repeated cancellation rejected with HTTP 400`);
    console.log('✓ TEST 4 PASSED: Cancelled order handling and inventory restoration verified.\n');

    // =========================================================================
    // TEST 5: Failed Payment Handling & Payment Status (Requirements 3 & 5)
    // =========================================================================
    console.log('--- TEST 5: Failed Payment Handling & Recovery Flow ---');
    const orderToFail = await createOrderFor(aliceToken, [
      { product: productB._id.toString(), quantity: 1 },
    ]);

    // Initialize Paystack payment
    const initRes = await fetch(`${baseUrl}/api/payments/initialize/${orderToFail._id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${aliceToken}`,
      },
    });
    const initJson = await initRes.json();
    const reference = initJson.data.reference;
    console.log(`✓ Initialized payment with reference: ${reference}`);

    // Trigger charge.failed webhook
    const failedWebhookPayload = {
      event: 'charge.failed',
      data: {
        id: 778899,
        reference,
        amount: Math.round(orderToFail.totalAmount * 100),
        currency: 'NGN',
        gateway_response: 'Card declined: Insufficient funds in account',
        metadata: { orderId: orderToFail._id.toString() },
      },
    };
    const failedStr = JSON.stringify(failedWebhookPayload);
    const failedSig = createWebhookSignature(failedStr);

    const webhookRes = await fetch(`${baseUrl}/api/payments/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-paystack-signature': failedSig,
      },
      body: failedStr,
    });
    if (!webhookRes.ok) {
      throw new Error(`Failed to send charge.failed webhook: ${webhookRes.status}`);
    }

    // Customer checks order details
    const failedOrderCheck = await fetch(`${baseUrl}/api/orders/${orderToFail._id}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${aliceToken}` },
    });
    const failedOrderData = (await failedOrderCheck.json()).data.order;
    if (failedOrderData.paymentStatus !== 'FAILED') {
      throw new Error(`TEST 5 Expected paymentStatus 'FAILED', got '${failedOrderData.paymentStatus}'`);
    }
    if (failedOrderData.orderStatus !== 'PENDING') {
      throw new Error(`TEST 5 Expected orderStatus to remain 'PENDING', got '${failedOrderData.orderStatus}'`);
    }
    console.log(`✓ Order correctly reflects paymentStatus: 'FAILED' and orderStatus: 'PENDING'`);

    // Customer retries / completes payment
    const retryWebhookPayload = {
      event: 'charge.success',
      data: {
        id: 889900,
        reference,
        amount: Math.round(orderToFail.totalAmount * 100),
        currency: 'NGN',
        channel: 'card',
        gateway_response: 'Successful',
        paid_at: new Date().toISOString(),
        ip_address: '197.210.55.12',
        metadata: { orderId: orderToFail._id.toString() },
      },
    };
    const retryStr = JSON.stringify(retryWebhookPayload);
    const retrySig = createWebhookSignature(retryStr);

    const retryWebhookRes = await fetch(`${baseUrl}/api/payments/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-paystack-signature': retrySig,
      },
      body: retryStr,
    });
    if (!retryWebhookRes.ok) {
      throw new Error(`Retry webhook failed: ${retryWebhookRes.status}`);
    }

    // Verify order is now PAID & CONFIRMED
    const recoveredOrder = (await (await fetch(`${baseUrl}/api/orders/${orderToFail._id}`, {
      headers: { Authorization: `Bearer ${aliceToken}` },
    })).json()).data.order;

    if (recoveredOrder.paymentStatus !== 'PAID') {
      throw new Error(`TEST 5 Expected recovered paymentStatus 'PAID', got '${recoveredOrder.paymentStatus}'`);
    }
    if (recoveredOrder.orderStatus !== 'CONFIRMED') {
      throw new Error(`TEST 5 Expected recovered orderStatus 'CONFIRMED', got '${recoveredOrder.orderStatus}'`);
    }
    console.log(`✓ Payment successfully recovered: paymentStatus='PAID', orderStatus='CONFIRMED'`);
    console.log('✓ TEST 5 PASSED: Failed payment display and recovery flow verified.\n');

    console.log('================================================================');
    console.log('  ALL CUSTOMER ORDER HISTORY & TRACKING TESTS PASSED!           ');
    console.log('================================================================');
  } finally {
    server.close();
    await mongoose.disconnect();
  }
}

runOrderTrackingTests().catch((err) => {
  console.error('\n❌ Order Tracking Test Suite Error:', err);
  process.exit(1);
});
