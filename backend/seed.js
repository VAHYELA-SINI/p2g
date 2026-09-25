/**
 * P2G Comprehensive Database Seed Script
 * Seeds:
 * 1. Admin & Customer Users with known passwords
 * 2. 8 Core Grocery Categories with image assets
 * 3. 24 Commercial Grocery Products with realistic prices, descriptions, and stock
 * 4. Sample Orders across multiple statuses (DELIVERED, CONFIRMED, OUT_FOR_DELIVERY, PENDING)
 * 5. Customer Notifications history
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mongoose = require('mongoose');

const User = require('./src/models/User');
const Category = require('./src/models/Category');
const Product = require('./src/models/Product');
const Order = require('./src/models/Order');
const Notification = require('./src/models/Notification');

async function seedDatabase() {
  console.log('====================================================');
  console.log('       SEEDING P2G GROCERY PLATFORM DATABASE        ');
  console.log('====================================================\n');

  console.log('Connecting to MongoDB Atlas at:', process.env.MONGODB_URI.replace(/:([^@]+)@/, ':****@'));
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✓ Connected successfully to database:', mongoose.connection.name);

  // 1. SEED USERS
  console.log('\n--- 1. Seeding Users ---');
  
  // Clean up any existing duplicate test users if needed or upsert
  await User.deleteMany({
    email: {
      $in: [
        'admin@p2g.com',
        'customer@p2g.com',
        'chioma@example.com',
        'tunde@example.com',
      ],
    },
  });

  const admin = await User.create({
    name: 'P2G Store Administrator',
    email: 'admin@p2g.com',
    phone: '+2348012345678',
    password: 'AdminPassword123!',
    role: 'ADMIN',
    isActive: true,
  });
  console.log(`✓ Admin created: ${admin.email} (Password: AdminPassword123!)`);

  const customer1 = await User.create({
    name: 'Chidi Okafor',
    email: 'customer@p2g.com',
    phone: '+2348098765432',
    password: 'CustomerPassword123!',
    role: 'CUSTOMER',
    isActive: true,
  });
  console.log(`✓ Customer created: ${customer1.email} (Password: CustomerPassword123!)`);

  const customer2 = await User.create({
    name: 'Chioma Adeleke',
    email: 'chioma@example.com',
    phone: '+2348055551122',
    password: 'CustomerPassword123!',
    role: 'CUSTOMER',
    isActive: true,
  });

  const customer3 = await User.create({
    name: 'Tunde Bakare',
    email: 'tunde@example.com',
    phone: '+2348077773344',
    password: 'CustomerPassword123!',
    role: 'CUSTOMER',
    isActive: true,
  });
  console.log('✓ Additional customers created for directory & stats');

  // 2. SEED CATEGORIES
  console.log('\n--- 2. Seeding Categories ---');
  await Category.deleteMany({});

  const categoriesData = [
    {
      name: 'Fresh Fruits',
      slug: 'fresh-fruits',
      description: 'Crisp, juicy seasonal and imported fresh fruits handpicked for peak ripeness.',
      image: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&w=800&q=80',
      sortOrder: 1,
    },
    {
      name: 'Vegetables & Greens',
      slug: 'vegetables-greens',
      description: 'Farm-fresh garden vegetables, vibrant greens, root crops, and herbs.',
      image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80',
      sortOrder: 2,
    },
    {
      name: 'Dairy & Eggs',
      slug: 'dairy-eggs',
      description: 'Fresh cow milk, creamy artisan cheeses, organic butter, yogurts, and farm-fresh eggs.',
      image: 'https://images.unsplash.com/photo-1528750997573-59b89d56f4f7?auto=format&fit=crop&w=800&q=80',
      sortOrder: 3,
    },
    {
      name: 'Meat & Seafood',
      slug: 'meat-seafood',
      description: 'Premium cuts of beef, tender chicken breasts, ocean-caught salmon, and seafood.',
      image: 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&w=800&q=80',
      sortOrder: 4,
    },
    {
      name: 'Bakery & Bread',
      slug: 'bakery-bread',
      description: 'Freshly baked artisan sourdough loaves, golden croissants, rolls, and pastries.',
      image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80',
      sortOrder: 5,
    },
    {
      name: 'Pantry & Grains',
      slug: 'pantry-grains',
      description: 'Premium rice varieties, pasta, cold-pressed oils, flours, spices, and essentials.',
      image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=800&q=80',
      sortOrder: 6,
    },
    {
      name: 'Beverages & Drinks',
      slug: 'beverages-drinks',
      description: 'Pure fruit juices, herbal teas, roasted coffee beans, and refreshing drinks.',
      image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=800&q=80',
      sortOrder: 7,
    },
    {
      name: 'Snacks & Treats',
      slug: 'snacks-treats',
      description: 'Gourmet dried fruits, roasted nuts, artisan dark chocolates, and organic crackers.',
      image: 'https://images.unsplash.com/photo-1599599810769-bcde5a160d32?auto=format&fit=crop&w=800&q=80',
      sortOrder: 8,
    },
  ];

  const createdCategories = await Category.insertMany(categoriesData);
  const catMap = new Map(createdCategories.map((c) => [c.slug, c._id]));
  console.log(`✓ Seeded ${createdCategories.length} categories.`);

  // 3. SEED PRODUCTS
  console.log('\n--- 3. Seeding Products ---');
  await Product.deleteMany({});

  const productsData = [
    // Fresh Fruits
    {
      name: 'Honeycrisp Apples (1kg)',
      slug: 'honeycrisp-apples-1kg',
      category: catMap.get('fresh-fruits'),
      price: 3500,
      stock: 45,
      description: 'Crisp, sweet, and wonderfully juicy Honeycrisp apples, ideal for snacking and baking.',
      image: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=800&q=80',
      isAvailable: true,
      sortOrder: 1,
    },
    {
      name: 'Cavendish Bananas (Bunch)',
      slug: 'cavendish-bananas-bunch',
      category: catMap.get('fresh-fruits'),
      price: 1800,
      stock: 60,
      description: 'Naturally sweet and potassium-rich yellow Cavendish bananas at perfect ripeness.',
      image: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=800&q=80',
      isAvailable: true,
      sortOrder: 2,
    },
    {
      name: 'Fresh Organic Strawberries (400g)',
      slug: 'fresh-organic-strawberries-400g',
      category: catMap.get('fresh-fruits'),
      price: 4500,
      stock: 25,
      description: 'Plump, fragrant organic red strawberries picked fresh from the farm.',
      image: 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?auto=format&fit=crop&w=800&q=80',
      isAvailable: true,
      sortOrder: 3,
    },
    {
      name: 'Hass Avocados (Pack of 3)',
      slug: 'hass-avocados-pack-of-3',
      category: catMap.get('fresh-fruits'),
      price: 2800,
      stock: 35,
      description: 'Creamy Hass avocados with rich nutty flavor, perfect for salads and homemade guacamole.',
      image: 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?auto=format&fit=crop&w=800&q=80',
      isAvailable: true,
      sortOrder: 4,
    },

    // Vegetables & Greens
    {
      name: 'Fresh Baby Spinach (250g)',
      slug: 'fresh-baby-spinach-250g',
      category: catMap.get('vegetables-greens'),
      price: 1200,
      stock: 40,
      description: 'Tender baby spinach leaves pre-washed and ready to toss into healthy bowls and smoothies.',
      image: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&w=800&q=80',
      isAvailable: true,
      sortOrder: 5,
    },
    {
      name: 'Vine-Ripened Roma Tomatoes (1kg)',
      slug: 'vine-ripened-roma-tomatoes-1kg',
      category: catMap.get('vegetables-greens'),
      price: 2200,
      stock: 55,
      description: 'Deep red, firm Roma tomatoes bursting with rich natural sweetness and acidity.',
      image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=800&q=80',
      isAvailable: true,
      sortOrder: 6,
    },
    {
      name: 'Assorted Bell Peppers (Pack of 3)',
      slug: 'assorted-bell-peppers-pack-of-3',
      category: catMap.get('vegetables-greens'),
      price: 2500,
      stock: 30,
      description: 'Crisp red, yellow, and green bell peppers packed with vitamins and crunch.',
      image: 'https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?auto=format&fit=crop&w=800&q=80',
      isAvailable: true,
      sortOrder: 7,
    },
    {
      name: 'Sweet Red Onions (2kg Bag)',
      slug: 'sweet-red-onions-2kg-bag',
      category: catMap.get('vegetables-greens'),
      price: 3000,
      stock: 50,
      description: 'Flavorsome red onions essential for stews, sauces, and cooking bases.',
      image: 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?auto=format&fit=crop&w=800&q=80',
      isAvailable: true,
      sortOrder: 8,
    },

    // Dairy & Eggs
    {
      name: 'Fresh Whole Milk (1L)',
      slug: 'fresh-whole-milk-1l',
      category: catMap.get('dairy-eggs'),
      price: 1600,
      stock: 70,
      description: 'Pasteurized whole milk rich in calcium and vitamin D with full creamy goodness.',
      image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=800&q=80',
      isAvailable: true,
      sortOrder: 9,
    },
    {
      name: 'Farm Fresh Brown Eggs (Crate of 30)',
      slug: 'farm-fresh-brown-eggs-crate-30',
      category: catMap.get('dairy-eggs'),
      price: 4200,
      stock: 35,
      description: 'High-protein, free-range fresh farm eggs with vibrant golden yolks.',
      image: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?auto=format&fit=crop&w=800&q=80',
      isAvailable: true,
      sortOrder: 10,
    },
    {
      name: 'Aged Cheddar Cheese (250g)',
      slug: 'aged-cheddar-cheese-250g',
      category: catMap.get('dairy-eggs'),
      price: 3800,
      stock: 20,
      description: 'Sharp, crumbly aged cheddar cheese with a rich, nutty flavor profile.',
      image: 'https://images.unsplash.com/photo-1618160702438-9b02ab6515c9?auto=format&fit=crop&w=800&q=80',
      isAvailable: true,
      sortOrder: 11,
    },
    {
      name: 'Plain Greek Yogurt (500g)',
      slug: 'plain-greek-yogurt-500g',
      category: catMap.get('dairy-eggs'),
      price: 2900,
      stock: 28,
      description: 'Thick, creamy Greek yogurt high in protein and gut-friendly probiotics.',
      image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=800&q=80',
      isAvailable: true,
      sortOrder: 12,
    },

    // Meat & Seafood
    {
      name: 'Boneless Chicken Breast (1kg)',
      slug: 'boneless-chicken-breast-1kg',
      category: catMap.get('meat-seafood'),
      price: 5500,
      stock: 30,
      description: 'Skinless, tender fresh chicken breast fillets ready for grilling, roasting, or stir-fry.',
      image: 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&w=800&q=80',
      isAvailable: true,
      sortOrder: 13,
    },
    {
      name: 'Atlantic Salmon Fillets (500g)',
      slug: 'atlantic-salmon-fillets-500g',
      category: catMap.get('meat-seafood'),
      price: 9500,
      stock: 18,
      description: 'Fresh Norwegian salmon fillets loaded with heart-healthy Omega-3 fatty acids.',
      image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=800&q=80',
      isAvailable: true,
      sortOrder: 14,
    },
    {
      name: 'Lean Ground Beef (1kg)',
      slug: 'lean-ground-beef-1kg',
      category: catMap.get('meat-seafood'),
      price: 6000,
      stock: 25,
      description: 'Freshly minced 90% lean beef for burgers, meatballs, and bolognese.',
      image: 'https://images.unsplash.com/photo-1588168333986-5078d3ae3976?auto=format&fit=crop&w=800&q=80',
      isAvailable: true,
      sortOrder: 15,
    },

    // Bakery & Bread
    {
      name: 'Artisan Sourdough Loaf',
      slug: 'artisan-sourdough-loaf',
      category: catMap.get('bakery-bread'),
      price: 2400,
      stock: 25,
      description: 'Naturally fermented rustic sourdough bread with a crispy crust and soft, airy crumb.',
      image: 'https://images.unsplash.com/photo-1589367920969-ab8e050bbb04?auto=format&fit=crop&w=800&q=80',
      isAvailable: true,
      sortOrder: 16,
    },
    {
      name: 'Butter Croissants (Pack of 4)',
      slug: 'butter-croissants-pack-of-4',
      category: catMap.get('bakery-bread'),
      price: 3200,
      stock: 20,
      description: 'Flaky, buttery French-style croissants baked fresh every morning.',
      image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=800&q=80',
      isAvailable: true,
      sortOrder: 17,
    },

    // Pantry & Grains
    {
      name: 'Royal Basmati Rice (5kg Bag)',
      slug: 'royal-basmati-rice-5kg-bag',
      category: catMap.get('pantry-grains'),
      price: 14500,
      stock: 40,
      description: 'Aromatic, long-grain basmati rice with exquisite fragrance and slender grains.',
      image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=800&q=80',
      isAvailable: true,
      sortOrder: 18,
    },
    {
      name: 'Extra Virgin Olive Oil (750ml)',
      slug: 'extra-virgin-olive-oil-750ml',
      category: catMap.get('pantry-grains'),
      price: 8500,
      stock: 35,
      description: 'First cold-pressed extra virgin olive oil with fruity notes and peppery finish.',
      image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=800&q=80',
      isAvailable: true,
      sortOrder: 19,
    },
    {
      name: 'Organic Whole Oats (1kg)',
      slug: 'organic-whole-oats-1kg',
      category: catMap.get('pantry-grains'),
      price: 2200,
      stock: 45,
      description: 'Rolled whole grain oats perfect for warm morning porridge or granola.',
      image: 'https://images.unsplash.com/photo-1586444248902-2f64eddc13df?auto=format&fit=crop&w=800&q=80',
      isAvailable: true,
      sortOrder: 20,
    },

    // Beverages
    {
      name: 'Pure Squeezed Orange Juice (1L)',
      slug: 'pure-squeezed-orange-juice-1l',
      category: catMap.get('beverages-drinks'),
      price: 2800,
      stock: 35,
      description: '100% pure cold-pressed orange juice with no added sugar or preservatives.',
      image: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=800&q=80',
      isAvailable: true,
      sortOrder: 21,
    },
    {
      name: 'Single-Origin Roasted Coffee Beans (500g)',
      slug: 'single-origin-roasted-coffee-beans-500g',
      category: catMap.get('beverages-drinks'),
      price: 6800,
      stock: 22,
      description: 'Medium roast Arabica whole coffee beans with notes of dark cocoa and caramel.',
      image: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&w=800&q=80',
      isAvailable: true,
      sortOrder: 22,
    },

    // Snacks
    {
      name: 'Artisan 70% Dark Chocolate (100g)',
      slug: 'artisan-70-dark-chocolate-100g',
      category: catMap.get('snacks-treats'),
      price: 2100,
      stock: 50,
      description: 'Rich, smooth bean-to-bar dark chocolate made with single-origin cocoa beans.',
      image: 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?auto=format&fit=crop&w=800&q=80',
      isAvailable: true,
      sortOrder: 23,
    },
    {
      name: 'Roasted & Salted Mixed Nuts (300g)',
      slug: 'roasted-salted-mixed-nuts-300g',
      category: catMap.get('snacks-treats'),
      price: 4200,
      stock: 30,
      description: 'Crunchy blend of premium almonds, cashews, walnuts, and pecans with sea salt.',
      image: 'https://images.unsplash.com/photo-1536591375315-1988d689622d?auto=format&fit=crop&w=800&q=80',
      isAvailable: true,
      sortOrder: 24,
    },
  ];

  const createdProducts = await Product.insertMany(productsData);
  console.log(`✓ Seeded ${createdProducts.length} commercial products with images and prices.`);

  // 4. SEED SAMPLE ORDERS
  console.log('\n--- 4. Seeding Sample Orders ---');
  await Order.deleteMany({});

  const p1 = createdProducts[0]; // Honeycrisp Apples (₦3500)
  const p2 = createdProducts[8]; // Milk (₦1600)
  const p3 = createdProducts[9]; // Eggs (₦4200)
  const p4 = createdProducts[15]; // Sourdough (₦2400)
  const p5 = createdProducts[12]; // Chicken Breast (₦5500)

  // Order 1: Delivered Order for Chidi
  const order1Items = [
    { product: p1._id, name: p1.name, price: p1.price, quantity: 2, subtotal: 7000, image: p1.image },
    { product: p2._id, name: p2.name, price: p2.price, quantity: 1, subtotal: 1600, image: p2.image },
  ];
  const order1Sub = 8600;
  const order1Total = 9600;

  const order1 = await Order.create({
    customer: customer1._id,
    items: order1Items,
    deliveryInformation: {
      fullName: 'Chidi Okafor',
      phone: '+2348098765432',
      address: '14 Admiralty Way, Lekki Phase 1',
      city: 'Lagos',
      additionalInstructions: 'Leave with estate security if not home.',
    },
    subtotal: order1Sub,
    deliveryFee: 1000,
    totalAmount: order1Total,
    paymentStatus: 'PAID',
    paymentReference: `P2G_ORD_${Date.now()}_DELIV1`,
    paymentDetails: {
      channel: 'card',
      currency: 'NGN',
      paidAt: new Date(Date.now() - 48 * 3600 * 1000),
      gatewayResponse: 'Successful',
    },
    orderStatus: 'DELIVERED',
    statusHistory: [
      { status: 'PENDING', changedAt: new Date(Date.now() - 48 * 3600 * 1000), note: 'Order placed by customer' },
      { status: 'PAID', changedAt: new Date(Date.now() - 48 * 3600 * 1000), note: 'Payment verified via Paystack' },
      { status: 'CONFIRMED', changedAt: new Date(Date.now() - 47 * 3600 * 1000), note: 'Store confirmed order' },
      { status: 'PREPARING', changedAt: new Date(Date.now() - 46 * 3600 * 1000), note: 'Packing groceries' },
      { status: 'READY', changedAt: new Date(Date.now() - 45 * 3600 * 1000), note: 'Bagged and ready for dispatch' },
      { status: 'OUT_FOR_DELIVERY', changedAt: new Date(Date.now() - 44 * 3600 * 1000), note: 'Driver on route' },
      { status: 'DELIVERED', changedAt: new Date(Date.now() - 43 * 3600 * 1000), note: 'Delivered to customer' },
    ],
  });

  // Order 2: Confirmed & Preparing Order for Chidi
  const order2Items = [
    { product: p3._id, name: p3.name, price: p3.price, quantity: 1, subtotal: 4200, image: p3.image },
    { product: p4._id, name: p4.name, price: p4.price, quantity: 1, subtotal: 2400, image: p4.image },
  ];
  const order2 = await Order.create({
    customer: customer1._id,
    items: order2Items,
    deliveryInformation: {
      fullName: 'Chidi Okafor',
      phone: '+2348098765432',
      address: '14 Admiralty Way, Lekki Phase 1',
      city: 'Lagos',
    },
    subtotal: 6600,
    deliveryFee: 1000,
    totalAmount: 7600,
    paymentStatus: 'PAID',
    paymentReference: `P2G_ORD_${Date.now()}_PREP2`,
    paymentDetails: {
      channel: 'card',
      currency: 'NGN',
      paidAt: new Date(Date.now() - 2 * 3600 * 1000),
      gatewayResponse: 'Successful',
    },
    orderStatus: 'PREPARING',
    statusHistory: [
      { status: 'PENDING', changedAt: new Date(Date.now() - 2 * 3600 * 1000), note: 'Order created' },
      { status: 'PAID', changedAt: new Date(Date.now() - 2 * 3600 * 1000), note: 'Payment verified' },
      { status: 'CONFIRMED', changedAt: new Date(Date.now() - 90 * 60 * 1000), note: 'Confirmed by store' },
      { status: 'PREPARING', changedAt: new Date(Date.now() - 45 * 60 * 1000), note: 'Sorting items in warehouse' },
    ],
  });

  // Order 3: Active Order for Chioma
  const order3Items = [
    { product: p5._id, name: p5.name, price: p5.price, quantity: 2, subtotal: 11000, image: p5.image },
  ];
  const order3 = await Order.create({
    customer: customer2._id,
    items: order3Items,
    deliveryInformation: {
      fullName: 'Chioma Adeleke',
      phone: '+2348055551122',
      address: '7 Victoria Island Crescent',
      city: 'Lagos',
    },
    subtotal: 11000,
    deliveryFee: 1000,
    totalAmount: 12000,
    paymentStatus: 'PAID',
    paymentReference: `P2G_ORD_${Date.now()}_CONF3`,
    paymentDetails: {
      channel: 'card',
      currency: 'NGN',
      paidAt: new Date(),
      gatewayResponse: 'Successful',
    },
    orderStatus: 'CONFIRMED',
    statusHistory: [
      { status: 'PENDING', changedAt: new Date(), note: 'Order received' },
      { status: 'PAID', changedAt: new Date(), note: 'Payment confirmed' },
      { status: 'CONFIRMED', changedAt: new Date(), note: 'Order confirmed and queued' },
    ],
  });

  console.log('✓ Seeded 3 realistic sample orders with full status histories.');

  // 5. SEED NOTIFICATIONS
  console.log('\n--- 5. Seeding Notifications ---');
  await Notification.deleteMany({});

  const notificationsData = [
    {
      customer: customer1._id,
      type: 'ORDER_PREPARING',
      title: 'Preparing Your Groceries 🧺',
      message: `Your order #${order2._id.toString().substring(0, 8)} is now being carefully packed by our team.`,
      isRead: false,
      data: { orderId: order2._id },
    },
    {
      customer: customer1._id,
      type: 'PAYMENT_SUCCESSFUL',
      title: 'Payment Successful 💳',
      message: `Payment of ₦7,600 for order #${order2._id.toString().substring(0, 8)} was successful.`,
      isRead: false,
      data: { orderId: order2._id },
    },
    {
      customer: customer1._id,
      type: 'ORDER_DELIVERED',
      title: 'Order Delivered ✅',
      message: `Your grocery order #${order1._id.toString().substring(0, 8)} has been delivered. Enjoy fresh produce!`,
      isRead: true,
      readAt: new Date(Date.now() - 42 * 3600 * 1000),
      data: { orderId: order1._id },
    },
  ];

  await Notification.insertMany(notificationsData);
  console.log('✓ Seeded customer notification activity stream.');

  console.log('\n====================================================');
  console.log('       🎉 DATABASE SEEDING COMPLETED (100%)         ');
  console.log('====================================================');
  console.log('Admin Login:    admin@p2g.com    | AdminPassword123!');
  console.log('Customer Login: customer@p2g.com | CustomerPassword123!');
  console.log('====================================================\n');

  await mongoose.connection.close();
}

seedDatabase().catch((err) => {
  console.error('Fatal Seeding Error:', err);
  process.exit(1);
});
