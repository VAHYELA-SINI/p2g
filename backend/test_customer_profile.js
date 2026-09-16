const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = require('./src/app');
const User = require('./src/models/User');

async function runTests() {
  console.log('====================================================');
  console.log('🚀 RUNNING CUSTOMER PROFILE MANAGEMENT TEST SUITE');
  console.log('====================================================\n');

  let server;
  try {
    // 1. Connect to Database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB Atlas');

    // 2. Start temporary Express test server
    server = app.listen(0);
    const port = server.address().port;
    const API_BASE = `http://127.0.0.1:${port}/api`;
    console.log(`✅ Started test server on ephemeral port ${port}\n`);

    // Helper request wrapper
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

    const testTimestamp = Date.now();
    const userAEmail = `cust_a_${testTimestamp}@example.com`;
    const userBEmail = `cust_b_${testTimestamp}@example.com`;
    const originalPassword = 'InitialSecurePassword123!';
    const updatedPassword = 'BrandNewSecurePassword456!';

    console.log('--- SETUP: Registering User A and User B ---');
    const resRegA = await request('POST', '/auth/register', {
      name: 'Customer Alpha',
      email: userAEmail,
      phone: '+2348000000001',
      password: originalPassword,
      role: 'CUSTOMER',
    });
    if (resRegA.status !== 201) throw new Error(`Registration failed: ${JSON.stringify(resRegA.data)}`);
    const tokenA = resRegA.data.data.token;
    const userA = resRegA.data.data.user;
    console.log(`✅ Registered User A: ${userA.email} (ID: ${userA._id})`);

    const resRegB = await request('POST', '/auth/register', {
      name: 'Customer Beta',
      email: userBEmail,
      phone: '+2348000000002',
      password: originalPassword,
      role: 'CUSTOMER',
    });
    if (resRegB.status !== 201) throw new Error(`Registration failed: ${JSON.stringify(resRegB.data)}`);
    const tokenB = resRegB.data.data.token;
    const userB = resRegB.data.data.user;
    console.log(`✅ Registered User B: ${userB.email} (ID: ${userB._id})\n`);

    // TEST 1: Protected Endpoints
    console.log('--- TEST 1: Protected Endpoints ---');
    const unauthProfile = await request('PUT', '/auth/profile', { name: 'Unauthenticated' });
    if (unauthProfile.status === 401) {
      console.log('✅ Correctly rejected PUT /auth/profile without token (401)');
    } else {
      throw new Error(`Expected 401, got ${unauthProfile.status}`);
    }

    const unauthChangePwd = await request('PUT', '/auth/change-password', {
      currentPassword: originalPassword,
      newPassword: updatedPassword,
    });
    if (unauthChangePwd.status === 401) {
      console.log('✅ Correctly rejected PUT /auth/change-password without token (401)');
    } else {
      throw new Error(`Expected 401, got ${unauthChangePwd.status}`);
    }

    const unauthMe = await request('GET', '/auth/me');
    if (unauthMe.status === 401) {
      console.log('✅ Correctly rejected GET /auth/me without token (401)\n');
    } else {
      throw new Error(`Expected 401, got ${unauthMe.status}`);
    }

    // TEST 2: Input Validation
    console.log('--- TEST 2: Input Validation ---');
    const invalidName = await request('PUT', '/auth/profile', { name: 'X' }, tokenA);
    if (invalidName.status === 400) {
      console.log(`✅ Rejected invalid profile name: "${invalidName.data.message}" (400)`);
    } else {
      throw new Error(`Expected 400 for short name, got ${invalidName.status}`);
    }

    const shortPwd = await request(
      'PUT',
      '/auth/change-password',
      { currentPassword: originalPassword, newPassword: 'short' },
      tokenA
    );
    if (shortPwd.status === 400) {
      console.log(`✅ Rejected password under 8 chars: "${shortPwd.data.message}" (400)`);
    } else {
      throw new Error(`Expected 400 for short password, got ${shortPwd.status}`);
    }

    const missingCurrentPwd = await request(
      'PUT',
      '/auth/change-password',
      { newPassword: 'ValidNewPassword123!' },
      tokenA
    );
    if (missingCurrentPwd.status === 400) {
      console.log(`✅ Rejected missing currentPassword: "${missingCurrentPwd.data.message}" (400)\n`);
    } else {
      throw new Error(`Expected 400 for missing currentPassword, got ${missingCurrentPwd.status}`);
    }

    // TEST 3: Require Current Password for Password Change
    console.log('--- TEST 3: Require Current Password for Password Change ---');
    const wrongCurrentPwd = await request(
      'PUT',
      '/auth/change-password',
      { currentPassword: 'WrongPassword999!', newPassword: updatedPassword },
      tokenA
    );
    if (wrongCurrentPwd.status === 400) {
      console.log(`✅ Rejected mismatched current password: "${wrongCurrentPwd.data.message}" (400)\n`);
    } else {
      throw new Error(`Expected 400 for wrong current password, got ${wrongCurrentPwd.status}`);
    }

    // TEST 4: Hash New Password with Bcrypt
    console.log('--- TEST 4: Hash New Password with Bcrypt & Verify Login ---');
    const resChange = await request(
      'PUT',
      '/auth/change-password',
      { currentPassword: originalPassword, newPassword: updatedPassword },
      tokenA
    );
    if (resChange.status === 200) {
      console.log(`✅ Password changed successfully: "${resChange.data.message}"`);
    } else {
      throw new Error(`Expected 200 for change-password, got ${resChange.status}: ${JSON.stringify(resChange.data)}`);
    }

    // Verify database record has bcrypt hash
    const dbUserA = await User.findById(userA._id).select('+password');
    if (!dbUserA.password.startsWith('$2b$') && !dbUserA.password.startsWith('$2a$')) {
      throw new Error('Stored password is NOT a valid bcrypt hash!');
    }
    console.log(`✅ Confirmed password stored as bcrypt hash: ${dbUserA.password.substring(0, 15)}...`);

    // Verify old password fails login
    const oldLogin = await request('POST', '/auth/login', {
      email: userAEmail,
      password: originalPassword,
    });
    if (oldLogin.status === 401) {
      console.log('✅ Old password correctly rejected on login (401)');
    } else {
      throw new Error(`Old password succeeded login! Status: ${oldLogin.status}`);
    }

    // Verify new password succeeds login
    const newLogin = await request('POST', '/auth/login', {
      email: userAEmail,
      password: updatedPassword,
    });
    if (newLogin.status === 200) {
      console.log(`✅ New password successfully authenticated for ${newLogin.data.data.user.email}\n`);
    } else {
      throw new Error(`New password failed login! Status: ${newLogin.status}`);
    }
    const freshTokenA = newLogin.data.data.token;

    // TEST 5: Never Return Password Hash
    console.log('--- TEST 5: Never Return Password Hash ---');
    const endpointsToCheck = [
      { name: 'Register', data: resRegA.data },
      { name: 'Login', data: newLogin.data },
      { name: 'Change Password', data: resChange.data },
    ];
    for (const ep of endpointsToCheck) {
      const bodyStr = JSON.stringify(ep.data);
      if (bodyStr.includes('$2b$') || bodyStr.includes('$2a$') || (ep.data.data?.user && ep.data.data.user.password)) {
        throw new Error(`Security violation: Password hash leaked in ${ep.name} response!`);
      }
      console.log(`✅ Password hash omitted from ${ep.name} response`);
    }

    const resMe = await request('GET', '/auth/me', null, freshTokenA);
    if (resMe.data?.data?.user?.password) {
      throw new Error('Security violation: Password returned in GET /auth/me!');
    }
    console.log('✅ Password hash omitted from GET /auth/me response\n');

    // TEST 6: Refresh User State After Update
    console.log('--- TEST 6: Refresh User State After Update ---');
    const updatedName = 'Alpha Updated Profile';
    const updatedPhone = '+2348099887766';
    const resUpdate = await request(
      'PUT',
      '/auth/profile',
      { name: updatedName, phone: updatedPhone },
      freshTokenA
    );
    if (resUpdate.status !== 200) {
      throw new Error(`Update profile failed with status ${resUpdate.status}: ${JSON.stringify(resUpdate.data)}`);
    }
    console.log(`✅ Profile updated: "${resUpdate.data.message}"`);
    console.log(`   Returned user name: ${resUpdate.data.data.user.name}`);
    console.log(`   Returned user phone: ${resUpdate.data.data.user.phone}`);

    if (resUpdate.data.data.user.name !== updatedName || resUpdate.data.data.user.phone !== updatedPhone) {
      throw new Error('Update response does not match sent profile values');
    }

    // Check GET /auth/me to confirm persistence
    const resMeRefreshed = await request('GET', '/auth/me', null, freshTokenA);
    if (
      resMeRefreshed.data.data.user.name !== updatedName ||
      resMeRefreshed.data.data.user.phone !== updatedPhone
    ) {
      throw new Error('Persisted profile in database does not reflect updated values');
    }
    console.log('✅ GET /auth/me confirmed profile persistence in MongoDB\n');

    // TEST 7: Handle Expired JWT
    console.log('--- TEST 7: Handle Expired JWT ---');
    const expiredToken = jwt.sign(
      { id: userA._id, role: 'CUSTOMER' },
      process.env.JWT_SECRET,
      { expiresIn: '-1s' }
    );

    const expiredMe = await request('GET', '/auth/me', null, expiredToken);
    if (expiredMe.status === 401) {
      console.log(`✅ Expired JWT caught: "${expiredMe.data.message}" (401)`);
    } else {
      throw new Error(`Expected 401 for expired token, got ${expiredMe.status}`);
    }

    const expiredProfile = await request(
      'PUT',
      '/auth/profile',
      { name: 'Expired Attempt' },
      expiredToken
    );
    if (expiredProfile.status === 401) {
      console.log(`✅ Expired JWT blocked on profile update: "${expiredProfile.data.message}" (401)\n`);
    } else {
      throw new Error(`Expected 401 on update with expired token, got ${expiredProfile.status}`);
    }

    // TEST 8: Prevent Editing Another User (User Isolation)
    console.log('--- TEST 8: Prevent Editing Another User (User Isolation) ---');
    // User A passes User B's _id in request body attempting to tamper User B
    const tamperRes = await request(
      'PUT',
      '/auth/profile',
      { userId: userB._id, _id: userB._id, name: 'Malicious Overwrite Attempt' },
      freshTokenA
    );
    if (tamperRes.status !== 200) {
      throw new Error(`Expected 200 for user modifying own profile, got ${tamperRes.status}`);
    }

    // Verify User B in database was completely untouched
    const dbUserB = await User.findById(userB._id);
    if (dbUserB.name !== 'Customer Beta') {
      throw new Error(`CRITICAL SECURITY FAILURE: User A modified User B's profile!`);
    }
    console.log(`✅ User B's name is untouched: "${dbUserB.name}"`);

    // Verify User A's profile was the one updated
    const dbUserAAfter = await User.findById(userA._id);
    if (dbUserAAfter.name !== 'Malicious Overwrite Attempt') {
      throw new Error(`User A's profile was expected to receive its own update`);
    }
    console.log(`✅ Authenticated User A modified only their own record: "${dbUserAAfter.name}"\n`);

    // CLEANUP
    console.log('--- CLEANUP: Removing test users ---');
    await User.deleteMany({ _id: { $in: [userA._id, userB._id] } });
    console.log('✅ Cleaned up temporary test users');

    console.log('\n====================================================');
    console.log('🎉 ALL 8 BACKEND REQUIREMENTS SUCCESSFULLY VERIFIED!');
    console.log('====================================================');
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
