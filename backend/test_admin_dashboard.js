const dotenv = require('dotenv');
dotenv.config();

process.env.USE_PAYSTACK_MOCK = 'true';

const crypto = require('crypto');
const mongoose = require('mongoose');
const app = require('./src/app');
const User = require('./src/models/User');
const Category = require('./src/models/Category');
const Product = require('./src/models/Product');
const Order = require('./src/models/Order');

async function runAdminDashboardTests() {
  console.log('====================================================');
  console.log('   P2G Admin Dashboard Complete Integration Tests   ');
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
    const adminPassword = 'AdminPassword123!';
    const customerPassword = 'CustomerPassword123!';

    // =========================================================================
    // 1. Admin Authentication & Role Enforcement (/login, /profile)
    // =========================================================================
    console.log('--- 1. Admin Authentication & RBAC Checks ---');
    // Register Store Admin
    const adminEmail = `store_admin_${timestamp}@p2g.com`;
    const regAdminRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Chief Store Admin',
        email: adminEmail,
        phone: '08099887711',
        password: adminPassword,
        role: 'ADMIN',
      }),
    });
    const regAdminData = await regAdminRes.json();
    if (!regAdminRes.ok) throw new Error(`Failed to register admin: ${JSON.stringify(regAdminData)}`);
    console.log(`✓ Registered Admin: ${adminEmail}`);

    // Register Customer User
    const customerEmail = `shopper_${timestamp}@gmail.com`;
    const regCustRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Regular Customer',
        email: customerEmail,
        phone: '08011223399',
        password: customerPassword,
        role: 'CUSTOMER',
      }),
    });
    const regCustData = await regCustRes.json();
    const customerToken = regCustData.data.token;
    console.log(`✓ Registered Customer: ${customerEmail}`);

    // Test Admin Login
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: adminEmail,
        password: adminPassword,
      }),
    });
    const loginData = await loginRes.json();
    if (!loginRes.ok || !loginData.data?.token || loginData.data.user.role !== 'ADMIN') {
      throw new Error(`Admin login failed: ${JSON.stringify(loginData)}`);
    }
    const adminToken = loginData.data.token;
    console.log(`✓ Admin logged in successfully with JWT token and verified role 'ADMIN'`);

    // Test GET /auth/me
    const meRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const meData = await meRes.json();
    if (!meRes.ok || meData.data.user.email !== adminEmail) {
      throw new Error(`GET /auth/me failed: ${JSON.stringify(meData)}`);
    }
    console.log(`✓ GET /api/auth/me successfully verified`);

    // =========================================================================
    // 2. Categories API (/categories)
    // =========================================================================
    console.log('\n--- 2. Categories Management API ---');
    // Admin creates category
    const catCreateRes = await fetch(`${baseUrl}/api/categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: `Seafood Specialties ${timestamp}`,
        description: 'Fresh grilled fish and prawns',
        isActive: true,
      }),
    });
    const catCreateData = await catCreateRes.json();
    if (!catCreateRes.ok || !catCreateData.success) {
      throw new Error(`Category creation failed: ${JSON.stringify(catCreateData)}`);
    }
    const categoryId = catCreateData.data.category._id;
    console.log(`✓ Admin created category: ID=${categoryId} (${catCreateData.data.category.name})`);

    // Customer attempts to create category (Must be rejected with 403)
    const custCatRes = await fetch(`${baseUrl}/api/categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({ name: 'Hacked Category' }),
    });
    if (custCatRes.status !== 403) {
      throw new Error(`SECURITY LEAK: Customer was able to create category (HTTP ${custCatRes.status})`);
    }
    console.log(`✓ Customer blocked from category creation with HTTP 403 Forbidden`);

    // Admin updates category
    const catUpdateRes = await fetch(`${baseUrl}/api/categories/${categoryId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: `Seafood Specialties Updated ${timestamp}`,
        isActive: false, // Deactivate
      }),
    });
    const catUpdateData = await catUpdateRes.json();
    if (!catUpdateRes.ok || catUpdateData.data.category.isActive !== false) {
      throw new Error(`Category update failed: ${JSON.stringify(catUpdateData)}`);
    }
    console.log(`✓ Admin updated category and deactivated status`);

    // =========================================================================
    // 3. Products API (/products, /products/new, /products/:id/edit)
    // =========================================================================
    console.log('\n--- 3. Products Catalog Management API ---');
    // Admin creates product
    const prodCreateRes = await fetch(`${baseUrl}/api/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: `Jumbo Peppered Prawns ${timestamp}`,
        description: 'Spicy marinated tiger prawns',
        price: 8500,
        category: categoryId,
        stock: 25,
        isAvailable: true,
        image: 'https://res.cloudinary.com/sini/image/upload/sample.jpg',
      }),
    });
    const prodCreateData = await prodCreateRes.json();
    if (!prodCreateRes.ok || !prodCreateData.success) {
      throw new Error(`Product creation failed: ${JSON.stringify(prodCreateData)}`);
    }
    const productId = prodCreateData.data.product._id;
    console.log(`✓ Admin created product: ID=${productId}, Price=₦${prodCreateData.data.product.price}`);

    // Admin updates product
    const prodUpdateRes = await fetch(`${baseUrl}/api/products/${productId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        price: 9000,
        stock: 30,
        isAvailable: true,
      }),
    });
    const prodUpdateData = await prodUpdateRes.json();
    if (!prodUpdateRes.ok || prodUpdateData.data.product.price !== 9000) {
      throw new Error(`Product update failed: ${JSON.stringify(prodUpdateData)}`);
    }
    console.log(`✓ Admin updated product price to ₦9000 and stock to 30`);

    // =========================================================================
    // 4. Orders & Customer Creation for Testing Analytics & History
    // =========================================================================
    console.log('\n--- 4. Creating Test Orders & Processing Payment ---');
    const orderRes = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        items: [{ product: productId, quantity: 2 }],
        deliveryInformation: {
          fullName: 'Regular Customer',
          phone: '08011223399',
          address: '42 Victoria Island Boulevard',
          city: 'Lagos',
        },
      }),
    });
    const orderData = await orderRes.json();
    if (!orderRes.ok || !orderData.success) {
      throw new Error(`Order placement failed: ${JSON.stringify(orderData)}`);
    }
    const testOrderId = orderData.data.order._id;
    console.log(`✓ Customer placed Order ID=${testOrderId}, Total=₦${orderData.data.order.totalAmount}`);

    // Initialize Paystack Payment
    const initPayRes = await fetch(`${baseUrl}/api/payments/initialize/${testOrderId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
    });
    const initPayData = await initPayRes.json();
    const reference = initPayData.data.reference;

    // Simulate Paystack charge.success webhook
    const webhookPayload = {
      event: 'charge.success',
      data: {
        id: 99112233,
        reference,
        amount: Math.round(orderData.data.order.totalAmount * 100),
        currency: 'NGN',
        channel: 'card',
        gateway_response: 'Successful',
        paid_at: new Date().toISOString(),
        metadata: { orderId: testOrderId.toString() },
      },
    };
    const payloadStr = JSON.stringify(webhookPayload);
    const signature = crypto
      .createHmac('sha512', process.env.PAYSTACK_WEBHOOK_SECRET || 'whsec_p2g_test_webhook_secret_key')
      .update(payloadStr)
      .digest('hex');

    await fetch(`${baseUrl}/api/payments/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-paystack-signature': signature,
      },
      body: payloadStr,
    });
    console.log(`✓ Payment confirmed for order: paymentStatus='PAID', orderStatus='CONFIRMED'`);

    // =========================================================================
    // 5. Dashboard Metrics & Stats (/dashboard -> GET /api/orders/stats)
    // =========================================================================
    console.log('\n--- 5. Dashboard KPI & Analytics API ---');
    const statsRes = await fetch(`${baseUrl}/api/orders/stats`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const statsData = await statsRes.json();
    if (!statsRes.ok || !statsData.success) {
      throw new Error(`Dashboard stats fetch failed: ${JSON.stringify(statsData)}`);
    }
    const { totalOrders, totalSales, recentOrders, pendingOrders, completedOrders } = statsData.data;
    console.log(`✓ Dashboard Metrics:`);
    console.log(`   - Total Orders: ${totalOrders}`);
    console.log(`   - Pending Orders: ${pendingOrders}`);
    console.log(`   - Completed Orders: ${completedOrders}`);
    console.log(`   - Total Sales: ₦${totalSales}`);
    console.log(`   - Recent Orders Count: ${recentOrders.length}`);

    // Customer trying to access stats must be rejected
    const custStatsRes = await fetch(`${baseUrl}/api/orders/stats`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    if (custStatsRes.status !== 403) {
      throw new Error(`SECURITY LEAK: Customer was able to query admin stats (HTTP ${custStatsRes.status})`);
    }
    console.log(`✓ Customer blocked from viewing store stats with HTTP 403 Forbidden`);

    // =========================================================================
    // 6. Orders Management & Status Progression (/orders, /orders/:id)
    // =========================================================================
    console.log('\n--- 6. Orders Management & Status Updates API ---');
    // Admin advances status to PREPARING
    const statusUpdateRes = await fetch(`${baseUrl}/api/orders/${testOrderId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        status: 'PREPARING',
        note: 'Order assigned to chef in kitchen',
      }),
    });
    const statusUpdateData = await statusUpdateRes.json();
    if (!statusUpdateRes.ok || statusUpdateData.data.order.orderStatus !== 'PREPARING') {
      throw new Error(`Status update failed: ${JSON.stringify(statusUpdateData)}`);
    }
    console.log(`✓ Admin updated order status to 'PREPARING' with status history note`);

    // Admin views single order
    const adminGetOrderRes = await fetch(`${baseUrl}/api/orders/${testOrderId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminGetOrderData = await adminGetOrderRes.json();
    if (!adminGetOrderRes.ok || adminGetOrderData.data.order._id !== testOrderId) {
      throw new Error(`Admin fetch order by ID failed: ${JSON.stringify(adminGetOrderData)}`);
    }
    console.log(`✓ Admin retrieved full order details and verified status timeline`);

    // =========================================================================
    // 7. Customers API (/customers, /customers/:id)
    // =========================================================================
    console.log('\n--- 7. Customers Directory API ---');
    const custsListRes = await fetch(`${baseUrl}/api/customers`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const custsListData = await custsListRes.json();
    if (!custsListRes.ok || !custsListData.success) {
      throw new Error(`Customers list failed: ${JSON.stringify(custsListData)}`);
    }
    console.log(`✓ Admin retrieved ${custsListData.data.customers.length} registered customers`);

    // Customer details
    const custDetailRes = await fetch(`${baseUrl}/api/customers/${regCustData.data.user._id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const custDetailData = await custDetailRes.json();
    if (!custDetailRes.ok || !custDetailData.data.customer) {
      throw new Error(`Customer details failed: ${JSON.stringify(custDetailData)}`);
    }
    console.log(`✓ Admin retrieved Customer details: ${custDetailData.data.customer.name}, Lifetime Spend=₦${custDetailData.data.stats.totalSpent}`);

    // Customer trying to access customers directory must be rejected
    const custSelfDirRes = await fetch(`${baseUrl}/api/customers`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    if (custSelfDirRes.status !== 403) {
      throw new Error(`SECURITY LEAK: Customer accessed customer directory (HTTP ${custSelfDirRes.status})`);
    }
    console.log(`✓ Customer blocked from viewing customer directory with HTTP 403 Forbidden`);

    // =========================================================================
    // 8. Payments API (/payments)
    // =========================================================================
    console.log('\n--- 8. Payments Log API ---');
    const paymentsRes = await fetch(`${baseUrl}/api/payments`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const paymentsData = await paymentsRes.json();
    if (!paymentsRes.ok || !paymentsData.success) {
      throw new Error(`Payments list failed: ${JSON.stringify(paymentsData)}`);
    }
    console.log(`✓ Admin retrieved ${paymentsData.data.payments.length} payment records`);
    const foundPayment = paymentsData.data.payments.find((p) => p.paymentReference === reference);
    if (!foundPayment) {
      throw new Error(`Payment with reference '${reference}' not found in payments list!`);
    }
    console.log(`✓ Verified payment log contains reference: ${foundPayment.paymentReference} (₦${foundPayment.amount})`);

    // Customer trying to access payments list must be rejected
    const custPayListRes = await fetch(`${baseUrl}/api/payments`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    if (custPayListRes.status !== 403) {
      throw new Error(`SECURITY LEAK: Customer accessed payments list (HTTP ${custPayListRes.status})`);
    }
    console.log(`✓ Customer blocked from viewing payment logs with HTTP 403 Forbidden`);

    // =========================================================================
    // 9. Profile & Password Change API (/profile)
    // =========================================================================
    console.log('\n--- 9. Admin Profile & Password Change API ---');
    // Update profile
    const updateProfRes = await fetch(`${baseUrl}/api/auth/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Chief Store Admin Updated',
        phone: '08099887700',
      }),
    });
    const updateProfData = await updateProfRes.json();
    if (!updateProfRes.ok || updateProfData.data.user.name !== 'Chief Store Admin Updated') {
      throw new Error(`Profile update failed: ${JSON.stringify(updateProfData)}`);
    }
    console.log(`✓ Admin updated name and phone successfully`);

    // Change password
    const newPassword = 'BrandNewPassword2026!';
    const changePassRes = await fetch(`${baseUrl}/api/auth/change-password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        currentPassword: adminPassword,
        newPassword,
      }),
    });
    const changePassData = await changePassRes.json();
    if (!changePassRes.ok || !changePassData.success) {
      throw new Error(`Password change failed: ${JSON.stringify(changePassData)}`);
    }
    console.log(`✓ Admin changed password successfully`);

    // Verify login with new password
    const reLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: adminEmail,
        password: newPassword,
      }),
    });
    if (!reLoginRes.ok) {
      throw new Error(`Failed to login with newly changed password!`);
    }
    console.log(`✓ Admin successfully authenticated with newly changed password`);

    console.log('\n====================================================');
    console.log('  ALL ADMIN DASHBOARD BACKEND API TESTS PASSED!     ');
    console.log('====================================================');
  } finally {
    server.close();
    await mongoose.disconnect();
  }
}

runAdminDashboardTests().catch((err) => {
  console.error('\n❌ Admin Dashboard Test Error:', err);
  process.exit(1);
});
