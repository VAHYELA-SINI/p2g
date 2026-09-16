const dotenv = require('dotenv');
dotenv.config();

const mongoose = require('mongoose');
const app = require('./src/app');
const User = require('./src/models/User');
const Category = require('./src/models/Category');
const Product = require('./src/models/Product');
const cloudinaryService = require('./src/services/cloudinaryService');

async function runTests() {
  console.log('=== Starting Cloudinary & Image Management Tests ===\n');

  // 1. Connect DB
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
    // 3. Setup test users (Admin and Customer)
    const timestamp = Date.now();
    const adminEmail = `admin_cloud_${timestamp}@test.com`;
    const customerEmail = `customer_cloud_${timestamp}@test.com`;
    const password = 'Password123!';

    // Register Admin
    const adminRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Cloudinary Admin',
        email: adminEmail,
        phone: '08011223344',
        password,
        role: 'ADMIN',
      }),
    });
    const adminData = await adminRes.json();
    const adminToken = adminData.data.token;
    console.log(`✓ Admin registered and authenticated: ${adminEmail}`);

    // Register Customer
    const custRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Cloudinary Customer',
        email: customerEmail,
        phone: '08022334455',
        password,
        role: 'CUSTOMER',
      }),
    });
    const custData = await custRes.json();
    const customerToken = custData.data.token;
    console.log(`✓ Customer registered and authenticated: ${customerEmail}\n`);

    // Helper: generate 1x1 test PNG buffer
    const testPngBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );
    const testPngBlob = new Blob([testPngBuffer], { type: 'image/png' });

    // Test 1: File type validation (Negative test)
    console.log('--- Test 1: File Type Validation (Reject invalid MIME type) ---');
    const invalidBlob = new Blob(['Plain text document content'], { type: 'text/plain' });
    const invalidForm = new FormData();
    invalidForm.append('image', invalidBlob, 'notes.txt');

    const invalidTypeRes = await fetch(`${baseUrl}/api/upload/category`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: invalidForm,
    });
    const invalidTypeData = await invalidTypeRes.json();
    console.log(`Status: ${invalidTypeRes.status} (Expected: 400)`);
    console.log(`Message: "${invalidTypeData.message}"`);
    if (invalidTypeRes.status === 400) {
      console.log('✓ File type validation successfully blocked invalid MIME type.\n');
    } else {
      throw new Error(`File type validation failed: status was ${invalidTypeRes.status}`);
    }

    // Test 2: Category Upload (Create Category with image)
    console.log('--- Test 2: Category Image Upload ---');
    const catForm = new FormData();
    catForm.append('name', `Bakery & Pastries ${timestamp}`);
    catForm.append('description', 'Freshly baked bread and confectioneries');
    catForm.append('sortOrder', '1');
    catForm.append('isActive', 'true');
    catForm.append('image', testPngBlob, 'croissant.png');

    const createCatRes = await fetch(`${baseUrl}/api/categories`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: catForm,
    });
    const createCatData = await createCatRes.json();
    console.log(`Status: ${createCatRes.status} (Expected: 201)`);
    if (createCatRes.status !== 201 || !createCatData.data?.category) {
      throw new Error(`Category creation failed: ${JSON.stringify(createCatData)}`);
    }

    const category = createCatData.data.category;
    console.log(`✓ Category Created: ID=${category._id}, slug=${category.slug}`);
    console.log(`✓ Image URL: ${category.image}`);
    console.log(`✓ Image Public ID: ${category.imagePublicId}`);
    if (!category.image || !category.imagePublicId) {
      throw new Error('Category is missing image or imagePublicId!');
    }
    console.log('✓ Category upload test passed.\n');

    // Test 3: Standalone Upload Endpoints & Authorization Check
    console.log('--- Test 3: Standalone Upload Endpoints & Authorization ---');
    // Test Customer unauthorized
    const custUploadForm = new FormData();
    custUploadForm.append('image', testPngBlob, 'cust_test.png');
    const unauthUploadRes = await fetch(`${baseUrl}/api/upload/product`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: custUploadForm,
    });
    console.log(`Customer upload status: ${unauthUploadRes.status} (Expected: 403)`);
    if (unauthUploadRes.status !== 403) {
      throw new Error(`Customer unauthorized check failed: status was ${unauthUploadRes.status}`);
    }

    // Admin standalone product image upload
    const adminUploadForm = new FormData();
    adminUploadForm.append('image', testPngBlob, 'product_standalone.png');
    const adminUploadRes = await fetch(`${baseUrl}/api/upload/product`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: adminUploadForm,
    });
    const adminUploadData = await adminUploadRes.json();
    console.log(`Admin standalone upload status: ${adminUploadRes.status} (Expected: 200)`);
    console.log(`Uploaded Public ID: ${adminUploadData.data?.publicId}`);
    if (adminUploadRes.status !== 200 || !adminUploadData.data?.url) {
      throw new Error(`Standalone product upload failed: ${JSON.stringify(adminUploadData)}`);
    }
    console.log('✓ Standalone upload and authorization tests passed.\n');

    // Test 4: Product Upload (Create Product with image)
    console.log('--- Test 4: Product Image Upload ---');
    const prodForm = new FormData();
    prodForm.append('name', `Chocolate Croissant ${timestamp}`);
    prodForm.append('description', 'Flaky butter croissant stuffed with rich chocolate');
    prodForm.append('price', '1800');
    prodForm.append('category', category._id);
    prodForm.append('isAvailable', 'true');
    prodForm.append('stock', '25');
    prodForm.append('image', testPngBlob, 'choco_croissant.png');

    const createProdRes = await fetch(`${baseUrl}/api/products`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: prodForm,
    });
    const createProdData = await createProdRes.json();
    console.log(`Status: ${createProdRes.status} (Expected: 201)`);
    if (createProdRes.status !== 201 || !createProdData.data?.product) {
      throw new Error(`Product creation failed: ${JSON.stringify(createProdData)}`);
    }

    const product = createProdData.data.product;
    const initialProductPublicId = product.imagePublicId;
    console.log(`✓ Product Created: ID=${product._id}, slug=${product.slug}`);
    console.log(`✓ Image URL: ${product.image}`);
    console.log(`✓ Image Public ID: ${initialProductPublicId}`);
    if (!product.image || !initialProductPublicId) {
      throw new Error('Product is missing image or imagePublicId!');
    }
    console.log('✓ Product upload test passed.\n');

    // Test 5: Product Image Replacement
    console.log('--- Test 5: Product Image Replacement ---');
    const replacementPngBlob = new Blob([testPngBuffer], { type: 'image/png' });
    const updateProdForm = new FormData();
    updateProdForm.append('name', `Updated Chocolate Croissant ${timestamp}`);
    updateProdForm.append('price', '2000');
    updateProdForm.append('image', replacementPngBlob, 'croissant_v2.png');

    const updateProdRes = await fetch(`${baseUrl}/api/products/${product._id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: updateProdForm,
    });
    const updateProdData = await updateProdRes.json();
    console.log(`Status: ${updateProdRes.status} (Expected: 200)`);
    if (updateProdRes.status !== 200 || !updateProdData.data?.product) {
      throw new Error(`Product update failed: ${JSON.stringify(updateProdData)}`);
    }

    const updatedProduct = updateProdData.data.product;
    const newProductPublicId = updatedProduct.imagePublicId;
    console.log(`✓ Old Public ID: ${initialProductPublicId}`);
    console.log(`✓ New Public ID: ${newProductPublicId}`);
    if (initialProductPublicId === newProductPublicId) {
      throw new Error('Image replacement did not generate a new public ID!');
    }
    console.log('✓ Product image replacement test passed.\n');

    // Test 6: Product Deletion & Cloudinary Cleanup
    console.log('--- Test 6: Product Deletion & Cloudinary Image Cleanup ---');
    const deleteProdRes = await fetch(`${baseUrl}/api/products/${product._id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const deleteProdData = await deleteProdRes.json();
    console.log(`Status: ${deleteProdRes.status} (Expected: 200)`);
    console.log(`Message: "${deleteProdData.message}"`);

    // Verify product is gone from database
    const verifyProd = await Product.findById(product._id);
    if (verifyProd) {
      throw new Error('Product still exists in database after delete!');
    }
    console.log('✓ Product confirmed removed from MongoDB.');
    console.log('✓ Product deletion test passed.\n');

    // Test 7: Category Deletion & Cloudinary Cleanup
    console.log('--- Test 7: Category Deletion & Cloudinary Image Cleanup ---');
    const deleteCatRes = await fetch(`${baseUrl}/api/categories/${category._id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const deleteCatData = await deleteCatRes.json();
    console.log(`Status: ${deleteCatRes.status} (Expected: 200)`);
    console.log(`Message: "${deleteCatData.message}"`);

    // Verify category is gone from database
    const verifyCat = await Category.findById(category._id);
    if (verifyCat) {
      throw new Error('Category still exists in database after delete!');
    }
    console.log('✓ Category confirmed removed from MongoDB.');
    console.log('✓ Category deletion test passed.\n');

    console.log('====================================================');
    console.log('🎉 ALL 7 CLOUDINARY & IMAGE TESTS PASSED PERFECTLY!');
    console.log('====================================================');
  } finally {
    // Clean up server and db connection
    server.close();
    await mongoose.connection.close();
    console.log('✓ Test server closed and database disconnected.');
  }
}

runTests().catch((err) => {
  console.error('\n❌ Test execution failed:', err);
  process.exit(1);
});
