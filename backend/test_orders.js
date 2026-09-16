const dotenv = require('dotenv');
dotenv.config();

const mongoose = require('mongoose');
const app = require('./src/app');
const User = require('./src/models/User');
const Category = require('./src/models/Category');
const Product = require('./src/models/Product');
const Order = require('./src/models/Order');

async function runOrderTests() {
  console.log('=== Starting Backend Order System Automated Tests ===\n');

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

    // Setup Admin
    const adminRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Order Admin',
        email: `admin_order_${timestamp}@test.com`,
        phone: '08099887766',
        password,
        role: 'ADMIN',
      }),
    });
    const adminData = await adminRes.json();
    const adminToken = adminData.data.token;
    console.log(`✓ Admin created and authenticated`);

    // Setup Customer A
    const custARes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Customer Alice',
        email: `alice_${timestamp}@test.com`,
        phone: '08011223344',
        password,
        role: 'CUSTOMER',
      }),
    });
    const custAData = await custARes.json();
    const custAToken = custAData.data.token;
    const custAId = custAData.data.user._id;
    console.log(`✓ Customer A (Alice) authenticated: ${custAData.data.user.email}`);

    // Setup Customer B
    const custBRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Customer Bob',
        email: `bob_${timestamp}@test.com`,
        phone: '08055667788',
        password,
        role: 'CUSTOMER',
      }),
    });
    const custBData = await custBRes.json();
    const custBToken = custBData.data.token;
    console.log(`✓ Customer B (Bob) authenticated: ${custBData.data.user.email}\n`);

    // Setup Category & Products
    const category = await Category.create({
      name: `Catering Meals ${timestamp}`,
      slug: `catering-meals-${timestamp}`,
      description: 'Hot meals & platters',
    });

    const validProduct = await Product.create({
      name: `Special Fried Rice & Turkey ${timestamp}`,
      slug: `special-fried-rice-${timestamp}`,
      price: 3500,
      category: category._id,
      isAvailable: true,
      stock: 10,
    });

    const unavailableProduct = await Product.create({
      name: `Sold Out Dish ${timestamp}`,
      slug: `sold-out-${timestamp}`,
      price: 2500,
      category: category._id,
      isAvailable: false,
      stock: 0,
    });

    const deliveryInfo = {
      fullName: 'Alice Johnson',
      phone: '08011223344',
      address: '14 Victoria Island Expressway',
      city: 'Lagos',
      additionalInstructions: 'Call at the blue gate',
    };

    // --- TEST 1: Valid Order Creation ---
    console.log('--- Test 1: Valid Order Creation ---');
    const validOrderRes = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${custAToken}`,
      },
      body: JSON.stringify({
        items: [{ product: validProduct._id.toString(), quantity: 2 }],
        deliveryInformation: deliveryInfo,
      }),
    });
    const validOrderData = await validOrderRes.json();
    console.log(`Status: ${validOrderRes.status} (Expected: 201)`);
    if (validOrderRes.status !== 201) {
      throw new Error(`Valid order failed: ${JSON.stringify(validOrderData)}`);
    }

    const createdOrder = validOrderData.data.order;
    console.log(`✓ Order ID: ${createdOrder._id}`);
    console.log(`✓ Subtotal: ₦${createdOrder.subtotal} (Expected: ₦7,000)`);
    console.log(`✓ Delivery Fee: ₦${createdOrder.deliveryFee} (Expected: ₦1,000)`);
    console.log(`✓ Total Amount: ₦${createdOrder.totalAmount} (Expected: ₦8,000)`);
    console.log(`✓ Order Status: ${createdOrder.orderStatus} (Expected: PENDING)`);
    console.log(`✓ Payment Status: ${createdOrder.paymentStatus} (Expected: PENDING)`);

    if (
      createdOrder.subtotal !== 7000 ||
      createdOrder.deliveryFee !== 1000 ||
      createdOrder.totalAmount !== 8000 ||
      createdOrder.orderStatus !== 'PENDING'
    ) {
      throw new Error('Order totals or status do not match server calculations!');
    }

    // Verify stock decremented
    const productAfterOrder = await Product.findById(validProduct._id);
    console.log(`✓ Product Stock: ${productAfterOrder.stock} (Initial: 10, Expected: 8)`);
    if (productAfterOrder.stock !== 8) {
      throw new Error(`Stock decrement failed: expected 8 but got ${productAfterOrder.stock}`);
    }
    console.log('✓ Test 1 Passed: Valid order created and stock decremented.\n');

    // --- TEST 2: Invalid Product Rejection ---
    console.log('--- Test 2: Invalid / Non-Existent Product Rejection ---');
    const fakeObjectId = new mongoose.Types.ObjectId().toString();
    const invalidProdRes = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${custAToken}`,
      },
      body: JSON.stringify({
        items: [{ product: fakeObjectId, quantity: 1 }],
        deliveryInformation: deliveryInfo,
      }),
    });
    const invalidProdData = await invalidProdRes.json();
    console.log(`Status: ${invalidProdRes.status} (Expected: 400)`);
    console.log(`Message: "${invalidProdData.message}"`);
    if (invalidProdRes.status !== 400) {
      throw new Error(`Expected 400 for non-existent product, got ${invalidProdRes.status}`);
    }
    console.log('✓ Test 2 Passed: Non-existent product rejected.\n');

    // --- TEST 3: Unavailable Product Rejection ---
    console.log('--- Test 3: Unavailable Product Rejection ---');
    const unavailRes = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${custAToken}`,
      },
      body: JSON.stringify({
        items: [{ product: unavailableProduct._id.toString(), quantity: 1 }],
        deliveryInformation: deliveryInfo,
      }),
    });
    const unavailData = await unavailRes.json();
    console.log(`Status: ${unavailRes.status} (Expected: 400)`);
    console.log(`Message: "${unavailData.message}"`);
    if (unavailRes.status !== 400) {
      throw new Error(`Expected 400 for unavailable product, got ${unavailRes.status}`);
    }
    console.log('✓ Test 3 Passed: Unavailable product rejected.\n');

    // --- TEST 4: Invalid Quantity (Exceeding Stock or < 1) ---
    console.log('--- Test 4: Invalid Quantity Rejection ---');
    const excessQtyRes = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${custAToken}`,
      },
      body: JSON.stringify({
        items: [{ product: validProduct._id.toString(), quantity: 50 }], // Stock is 8
        deliveryInformation: deliveryInfo,
      }),
    });
    const excessQtyData = await excessQtyRes.json();
    console.log(`Status: ${excessQtyRes.status} (Expected: 400)`);
    console.log(`Message: "${excessQtyData.message}"`);
    if (excessQtyRes.status !== 400) {
      throw new Error(`Expected 400 for excessive quantity, got ${excessQtyRes.status}`);
    }

    const zeroQtyRes = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${custAToken}`,
      },
      body: JSON.stringify({
        items: [{ product: validProduct._id.toString(), quantity: 0 }],
        deliveryInformation: deliveryInfo,
      }),
    });
    console.log(`Zero quantity status: ${zeroQtyRes.status} (Expected: 400)`);
    if (zeroQtyRes.status !== 400) {
      throw new Error(`Expected 400 for 0 quantity, got ${zeroQtyRes.status}`);
    }
    console.log('✓ Test 4 Passed: Invalid and excessive quantities rejected.\n');

    // --- TEST 5: Price Manipulation Attempt ---
    console.log('--- Test 5: Price Manipulation Attempt ---');
    const tamperedRes = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${custAToken}`,
      },
      body: JSON.stringify({
        items: [
          {
            product: validProduct._id.toString(),
            quantity: 1,
            price: 5, // Client attempts to buy ₦3,500 meal for ₦5!
            subtotal: 5,
          },
        ],
        subtotal: 5,
        deliveryFee: 0,
        totalAmount: 5,
        paymentStatus: 'PAID', // Client tries to spoof paid status
        orderStatus: 'DELIVERED', // Client tries to spoof delivered status
        deliveryInformation: deliveryInfo,
      }),
    });
    const tamperedData = await tamperedRes.json();
    const tamperedOrder = tamperedData.data.order;
    console.log(`✓ Returned Subtotal: ₦${tamperedOrder.subtotal} (Expected: ₦3,500)`);
    console.log(`✓ Returned Delivery Fee: ₦${tamperedOrder.deliveryFee} (Expected: ₦1,000)`);
    console.log(`✓ Returned Total: ₦${tamperedOrder.totalAmount} (Expected: ₦4,500)`);
    console.log(`✓ Payment Status: ${tamperedOrder.paymentStatus} (Expected: PENDING)`);
    console.log(`✓ Order Status: ${tamperedOrder.orderStatus} (Expected: PENDING)`);

    if (
      tamperedOrder.subtotal !== 3500 ||
      tamperedOrder.deliveryFee !== 1000 ||
      tamperedOrder.totalAmount !== 4500 ||
      tamperedOrder.paymentStatus !== 'PENDING' ||
      tamperedOrder.orderStatus !== 'PENDING'
    ) {
      throw new Error('Server allowed client-manipulated price or status!');
    }
    console.log('✓ Test 5 Passed: Client price tampering strictly overridden by server.\n');

    // --- TEST 6: Unauthorized Order Access ---
    console.log('--- Test 6: Unauthorized Order Access & Isolation ---');
    // Bob tries to access Alice's order
    const unauthorizedGetRes = await fetch(`${baseUrl}/api/orders/${createdOrder._id}`, {
      headers: { Authorization: `Bearer ${custBToken}` },
    });
    console.log(`Bob accessing Alice order status: ${unauthorizedGetRes.status} (Expected: 403)`);
    if (unauthorizedGetRes.status !== 403) {
      throw new Error(`Expected 403 for unauthorized access, got ${unauthorizedGetRes.status}`);
    }

    // Alice accesses her own order
    const aliceGetRes = await fetch(`${baseUrl}/api/orders/${createdOrder._id}`, {
      headers: { Authorization: `Bearer ${custAToken}` },
    });
    console.log(`Alice accessing own order status: ${aliceGetRes.status} (Expected: 200)`);
    if (aliceGetRes.status !== 200) {
      throw new Error(`Expected 200 for owner access, got ${aliceGetRes.status}`);
    }

    // Admin accesses Alice's order
    const adminGetRes = await fetch(`${baseUrl}/api/orders/${createdOrder._id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    console.log(`Admin accessing Alice order status: ${adminGetRes.status} (Expected: 200)`);
    if (adminGetRes.status !== 200) {
      throw new Error(`Expected 200 for admin access, got ${adminGetRes.status}`);
    }
    console.log('✓ Test 6 Passed: Customer isolation and Admin access verified.\n');

    // --- TEST 7: Order Cancellation & Inventory Restoration ---
    console.log('--- Test 7: Order Cancellation & Stock Restoration ---');
    // Check stock before cancellation (was 8, then 1 bought in test 5 = 7)
    const stockBeforeCancel = (await Product.findById(validProduct._id)).stock;
    console.log(`Current stock before cancellation: ${stockBeforeCancel}`);

    const cancelRes = await fetch(`${baseUrl}/api/orders/${createdOrder._id}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${custAToken}`,
      },
      body: JSON.stringify({ reason: 'Changed mind before payment' }),
    });
    const cancelData = await cancelRes.json();
    console.log(`Cancel status: ${cancelRes.status} (Expected: 200)`);
    console.log(`Order new status: ${cancelData.data?.order?.orderStatus}`);

    if (cancelRes.status !== 200 || cancelData.data?.order?.orderStatus !== 'CANCELLED') {
      throw new Error('Order cancellation failed!');
    }

    // Verify stock restored (+2 from createdOrder)
    const stockAfterCancel = (await Product.findById(validProduct._id)).stock;
    console.log(`Stock after cancellation: ${stockAfterCancel} (Expected: ${stockBeforeCancel + 2})`);
    if (stockAfterCancel !== stockBeforeCancel + 2) {
      throw new Error(`Stock restoration failed: expected ${stockBeforeCancel + 2}, got ${stockAfterCancel}`);
    }

    // Try to cancel again -> expect 400
    const cancelAgainRes = await fetch(`${baseUrl}/api/orders/${createdOrder._id}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${custAToken}`,
      },
    });
    console.log(`Cancelling again status: ${cancelAgainRes.status} (Expected: 400)`);
    if (cancelAgainRes.status !== 400) {
      throw new Error(`Expected 400 when cancelling already cancelled order, got ${cancelAgainRes.status}`);
    }
    console.log('✓ Test 7 Passed: Order cancelled, inventory restored, duplicate cancellation prevented.\n');

    console.log('====================================================');
    console.log('🎉 ALL 7 BACKEND ORDER TESTS PASSED PERFECTLY!');
    console.log('====================================================');
  } finally {
    server.close();
    await mongoose.connection.close();
    console.log('✓ Test server closed and database disconnected.');
  }
}

runOrderTests().catch((err) => {
  console.error('\n❌ Backend order tests failed:', err);
  process.exit(1);
});
