const dotenv = require('dotenv');
dotenv.config();

const mongoose = require('mongoose');
const app = require('./src/app');
const User = require('./src/models/User');
const Category = require('./src/models/Category');
const Product = require('./src/models/Product');
const Order = require('./src/models/Order');

async function testMobileCheckoutWithBackend() {
  console.log('=== Testing Mobile Checkout Integration with Backend API ===\n');

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✓ Connected to MongoDB');

  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;
  console.log(`✓ Test API running on ${baseUrl}\n`);

  try {
    const timestamp = Date.now();
    const customerEmail = `checkout_cust_${timestamp}@test.com`;
    const password = 'Password123!';

    // Register mobile customer
    const regRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Chioma Adeleke',
        email: customerEmail,
        phone: '08123456789',
        password,
        role: 'CUSTOMER',
      }),
    });
    const regData = await regRes.json();
    const customerToken = regData.data.token;
    console.log(`✓ Customer registered & authenticated: ${customerEmail}`);

    // Create store catalog items
    const category = await Category.create({
      name: `Breakfast & Drinks ${timestamp}`,
      slug: `breakfast-drinks-${timestamp}`,
    });

    const product = await Product.create({
      name: `Full English Breakfast Platter ${timestamp}`,
      slug: `english-breakfast-${timestamp}`,
      price: 4500,
      category: category._id,
      isAvailable: true,
      stock: 25,
      image: 'https://res.cloudinary.com/p2g-store/image/upload/v1/breakfast.webp',
    });
    console.log(`✓ Store product created: ID=${product._id}, price=₦${product.price}`);

    // Test 1: Empty cart rejection
    console.log('\n--- Test 1: Prevent Empty Cart Checkout ---');
    const emptyRes = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        items: [],
        deliveryInformation: {
          fullName: 'Chioma Adeleke',
          phone: '08123456789',
          address: '22 Marine Road, Apapa',
          city: 'Lagos',
        },
      }),
    });
    console.log(`Empty cart response status: ${emptyRes.status} (Expected: 400)`);
    if (emptyRes.status !== 400) {
      throw new Error('Backend failed to reject empty cart!');
    }
    console.log('✓ Test 1 Passed: Empty cart rejected.');

    // Test 2: Incomplete delivery information rejection
    console.log('\n--- Test 2: Validate Incomplete Delivery Information ---');
    const incompleteRes = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        items: [{ product: product._id.toString(), quantity: 1 }],
        deliveryInformation: {
          fullName: 'Ch', // too short
          phone: '',
          address: '',
          city: '',
        },
      }),
    });
    console.log(`Incomplete delivery details status: ${incompleteRes.status} (Expected: 400)`);
    if (incompleteRes.status !== 400) {
      throw new Error('Backend failed to validate delivery details!');
    }
    console.log('✓ Test 2 Passed: Incomplete delivery details rejected.');

    // Test 3: Successful Checkout matching mobile checkout payload
    console.log('\n--- Test 3: Complete Mobile Checkout Placement ---');
    const checkoutRes = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        items: [{ product: product._id.toString(), quantity: 2 }],
        deliveryInformation: {
          fullName: 'Chioma Adeleke',
          phone: '08123456789',
          address: '22 Marine Road, Apapa',
          city: 'Lagos',
          additionalInstructions: 'Call upon arrival at the security post',
        },
      }),
    });
    const checkoutData = await checkoutRes.json();
    console.log(`Checkout status: ${checkoutRes.status} (Expected: 201)`);
    if (checkoutRes.status !== 201) {
      throw new Error(`Checkout failed: ${JSON.stringify(checkoutData)}`);
    }

    const order = checkoutData.data.order;
    console.log(`✓ Order ID: ${order._id}`);
    console.log(`✓ Subtotal: ₦${order.subtotal} (Expected: ₦9,000 for 2 x ₦4,500)`);
    console.log(`✓ Delivery Fee: ₦${order.deliveryFee} (Expected: ₦1,000)`);
    console.log(`✓ Total Amount: ₦${order.totalAmount} (Expected: ₦10,000)`);
    console.log(`✓ Order Status: ${order.orderStatus} (Expected: PENDING)`);
    console.log(`✓ Payment Status: ${order.paymentStatus} (Expected: PENDING)`);

    if (
      order.subtotal !== 9000 ||
      order.deliveryFee !== 1000 ||
      order.totalAmount !== 10000 ||
      order.orderStatus !== 'PENDING' ||
      order.paymentStatus !== 'PENDING'
    ) {
      throw new Error('Server calculations did not match expected totals!');
    }
    console.log('✓ Test 3 Passed: Order placed with authoritative calculations.');

    // Test 4: Retrieve Order on Order Confirmation Screen
    console.log('\n--- Test 4: Fetch Order on Confirmation Screen ---');
    const confirmRes = await fetch(`${baseUrl}/api/orders/${order._id}`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    const confirmData = await confirmRes.json();
    console.log(`Confirmation fetch status: ${confirmRes.status} (Expected: 200)`);
    const fetchedOrder = confirmData.data.order;
    console.log(`✓ Fetched Recipient: ${fetchedOrder.deliveryInformation.fullName}`);
    console.log(`✓ Item snapshot title: ${fetchedOrder.items[0].name}`);
    console.log(`✓ Item snapshot price: ₦${fetchedOrder.items[0].price}`);
    if (fetchedOrder._id !== order._id || fetchedOrder.items[0].name !== product.name) {
      throw new Error('Confirmation order data mismatch!');
    }
    console.log('✓ Test 4 Passed: Confirmation screen data validated.');

    // Test 5: Customer Cancellation from Confirmation Screen
    console.log('\n--- Test 5: Customer Cancellation from Confirmation Screen ---');
    const cancelRes = await fetch(`${baseUrl}/api/orders/${order._id}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({ reason: 'Customer changed mind' }),
    });
    const cancelData = await cancelRes.json();
    console.log(`Cancellation status: ${cancelRes.status} (Expected: 200)`);
    console.log(`Order status after cancel: ${cancelData.data?.order?.orderStatus}`);
    if (cancelData.data?.order?.orderStatus !== 'CANCELLED') {
      throw new Error('Cancellation did not update order status to CANCELLED!');
    }
    console.log('✓ Test 5 Passed: Customer cancelled order successfully.');

    console.log('\n========================================================');
    console.log('🎉 ALL 5 MOBILE CHECKOUT INTEGRATION TESTS PASSED!');
    console.log('========================================================');
  } finally {
    server.close();
    await mongoose.connection.close();
    console.log('✓ Test server closed and database disconnected.');
  }
}

testMobileCheckoutWithBackend().catch((err) => {
  console.error('\n❌ Checkout flow test failed:', err);
  process.exit(1);
});
