const assert = require('assert');
const { errorHandler, scrubSensitiveStrings } = require('./src/middleware/errorMiddleware');

console.log('--- Starting Error Sanitization & Security Audit Tests ---');

// 1. Test scrubSensitiveStrings utility directly
function testScrubSensitiveStrings() {
  console.log('Test 1: Sensitive String Scrubbing');

  const mongoString = 'Failed to connect to mongodb+srv://admin_user:super_secret_password_123@cluster0.mongodb.net/p2g_db';
  const scrubbedMongo = scrubSensitiveStrings(mongoString);
  assert(!scrubbedMongo.includes('super_secret_password_123'), 'Mongo password must be redacted');
  assert(scrubbedMongo.includes('[REDACTED_DATABASE_CREDENTIALS]'), 'Redaction tag must be present');

  const paystackSecret = 'Error in Paystack API call: key sk_live_839219482910482019482 rejected';
  const scrubbedPaystack = scrubSensitiveStrings(paystackSecret);
  assert(!scrubbedPaystack.includes('sk_live_839219482910482019482'), 'Paystack secret must be redacted');
  assert(scrubbedPaystack.includes('[REDACTED_PAYSTACK_SECRET_KEY]'), 'Paystack redaction tag must be present');

  const jwtToken = 'Invalid bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY3ODkifQ.signature_data in header';
  const scrubbedJwt = scrubSensitiveStrings(jwtToken);
  assert(!scrubbedJwt.includes('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'), 'JWT must be redacted');
  assert(scrubbedJwt.includes('[REDACTED_JWT_TOKEN]'), 'JWT redaction tag must be present');

  console.log('✓ Test 1 Passed: Sensitive strings properly scrubbed.');
}

// 2. Test errorHandler mock responses (Ensure NO stack trace in response)
function testErrorHandlerStackSuppression() {
  console.log('Test 2: Zero Stack Trace Exposure in Response Body');

  const mockReq = { method: 'POST', originalUrl: '/api/orders' };

  let capturedStatus = null;
  let capturedBody = null;

  const mockRes = {
    status(code) {
      capturedStatus = code;
      return this;
    },
    json(body) {
      capturedBody = body;
      return this;
    },
  };

  const next = () => {};

  // Simulate 500 error with stack trace and sensitive message
  const severeError = new Error('Database connection crashed: mongodb+srv://db_user:my_secret_pass@cluster.mongodb.net/prod');
  severeError.stack = 'Error: Database connection crashed\n    at Object.<anonymous> (/var/app/server.js:42:15)';

  errorHandler(severeError, mockReq, mockRes, next);

  assert.strictEqual(capturedStatus, 500);
  assert.strictEqual(capturedBody.success, false);
  assert.strictEqual(capturedBody.stack, undefined, 'CRITICAL: response.stack must NOT exist');
  assert(!JSON.stringify(capturedBody).includes('my_secret_pass'), 'CRITICAL: No passwords in response');

  console.log('✓ Test 2 Passed: Stack trace strictly suppressed in errorHandler output.');
}

// 3. Test Database CastError formatting
function testCastErrorHandling() {
  console.log('Test 3: Database CastError (Invalid ObjectId) Formatting');

  const castError = new Error('Cast to ObjectId failed for value "12345"');
  castError.name = 'CastError';
  castError.value = '12345';

  let capturedStatus = null;
  let capturedBody = null;
  const mockRes = {
    status(code) {
      capturedStatus = code;
      return this;
    },
    json(body) {
      capturedBody = body;
      return this;
    },
  };

  errorHandler(castError, {}, mockRes, () => {});

  assert.strictEqual(capturedStatus, 400);
  assert.strictEqual(capturedBody.success, false);
  assert.strictEqual(capturedBody.message, 'Invalid format for resource identifier.');
  assert.strictEqual(capturedBody.stack, undefined);

  console.log('✓ Test 3 Passed: CastError handled with clean status 400.');
}

// 4. Test Duplicate Key Mongo Error (11000)
function testDuplicateKeyErrorHandling() {
  console.log('Test 4: Duplicate Key Error (11000) Formatting');

  const dupError = new Error('E11000 duplicate key error');
  dupError.code = 11000;
  dupError.keyValue = { email: 'test@example.com' };

  let capturedStatus = null;
  let capturedBody = null;
  const mockRes = {
    status(code) {
      capturedStatus = code;
      return this;
    },
    json(body) {
      capturedBody = body;
      return this;
    },
  };

  errorHandler(dupError, {}, mockRes, () => {});

  assert.strictEqual(capturedStatus, 409);
  assert.strictEqual(capturedBody.success, false);
  assert.strictEqual(capturedBody.message, 'Duplicate value entered for email.');
  assert.strictEqual(capturedBody.stack, undefined);

  console.log('✓ Test 4 Passed: Duplicate key handled with status 409.');
}

// Run tests
try {
  testScrubSensitiveStrings();
  testErrorHandlerStackSuppression();
  testCastErrorHandling();
  testDuplicateKeyErrorHandling();

  console.log('\n=============================================');
  console.log('ALL ERROR SANITIZATION TESTS PASSED (4/4)');
  console.log('=============================================');
} catch (err) {
  console.error('Test Failed:', err);
  process.exit(1);
}
