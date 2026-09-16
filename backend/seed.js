/**
 * Database Seed Script
 * Resets or creates default Admin and Customer accounts with known passwords.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mongoose = require('mongoose');
const User = require('./src/models/User');

async function seed() {
  console.log('--- Connecting to MongoDB Atlas ---');
  await mongoose.connect(process.env.MONGODB_URI);

  // 1. Admin Account
  let admin = await User.findOne({ email: 'admin@p2g.com' });
  if (admin) {
    admin.name = 'P2G Store Administrator';
    admin.password = 'AdminPassword123!';
    admin.role = 'ADMIN';
    admin.isActive = true;
    await admin.save();
    console.log('✓ Admin account updated: admin@p2g.com / AdminPassword123!');
  } else {
    admin = await User.create({
      name: 'P2G Store Administrator',
      email: 'admin@p2g.com',
      phone: '+2348012345678',
      password: 'AdminPassword123!',
      role: 'ADMIN',
      isActive: true,
    });
    console.log('✓ Admin account created: admin@p2g.com / AdminPassword123!');
  }

  // 2. Customer Account
  let customer = await User.findOne({ email: 'customer@p2g.com' });
  if (customer) {
    customer.name = 'Chidi Okafor';
    customer.password = 'CustomerPassword123!';
    customer.role = 'CUSTOMER';
    customer.isActive = true;
    await customer.save();
    console.log('✓ Customer account updated: customer@p2g.com / CustomerPassword123!');
  } else {
    customer = await User.create({
      name: 'Chidi Okafor',
      email: 'customer@p2g.com',
      phone: '+2348098765432',
      password: 'CustomerPassword123!',
      role: 'CUSTOMER',
      isActive: true,
    });
    console.log('✓ Customer account created: customer@p2g.com / CustomerPassword123!');
  }

  console.log('\n--- Default Seed Completed Successfully ---');
  await mongoose.connection.close();
}

seed().catch((err) => {
  console.error('Seeding error:', err);
  process.exit(1);
});
