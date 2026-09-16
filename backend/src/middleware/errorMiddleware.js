/**
 * Centralized Error & 404 Handling Middleware
 * Ensures zero leakage of stack traces, database credentials, JWT secrets, Paystack keys,
 * Cloudinary secrets, or passwords.
 */

// Utility function to scrub sensitive tokens and credentials from strings
function scrubSensitiveStrings(text) {
  if (typeof text !== 'string') return text;

  return text
    // Redact MongoDB connection URIs with credentials
    .replace(/mongodb(\+srv)?:\/\/[^:]+:[^@]+@[^\s"']+/gi, 'mongodb://[REDACTED_DATABASE_CREDENTIALS]')
    // Redact Cloudinary connection strings
    .replace(/cloudinary:\/\/[^:]+:[^@]+@[^\s"']+/gi, 'cloudinary://[REDACTED_CLOUDINARY_CREDENTIALS]')
    // Redact Paystack secret keys
    .replace(/sk_(live|test)_[a-zA-Z0-9]+/g, '[REDACTED_PAYSTACK_SECRET_KEY]')
    // Redact Paystack public keys
    .replace(/pk_(live|test)_[a-zA-Z0-9]+/g, '[REDACTED_PAYSTACK_PUBLIC_KEY]')
    // Redact JSON Web Tokens (JWTs)
    .replace(/eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/g, '[REDACTED_JWT_TOKEN]')
    // Redact plain password patterns (e.g., password="...", password: "...")
    .replace(/(password["']?\s*[:=]\s*["']?)[^"',\s}]+/gi, '$1[REDACTED_PASSWORD]');
}

function notFoundHandler(req, res, next) {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
}

function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error.';
  let errors = err.errors || undefined;

  // Handle CORS rejection (Requirement: authorization)
  if (err.message === 'This origin is not allowed by CORS.') {
    statusCode = 403;
    message = 'Access denied: origin not allowed by CORS policy.';
  }

  // Handle Mongoose validation errors (Requirement: validation)
  if (err.name === 'ValidationError' && err.errors) {
    statusCode = 400;
    message = 'Validation failed.';
    errors = Object.values(err.errors).map((val) => ({
      field: val.path,
      message: scrubSensitiveStrings(val.message),
    }));
  }

  // Handle Zod validation errors (Requirement: validation)
  if (err.name === 'ZodError' && (err.issues || err.errors)) {
    statusCode = 400;
    message = 'Validation failed.';
    const issues = err.issues || err.errors || [];
    errors = issues.map((val) => ({
      field: val.path.join('.') || 'field',
      message: scrubSensitiveStrings(val.message),
    }));
  }

  // Handle Mongoose invalid ObjectId (Requirement: database)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid format for resource identifier.';
  }

  // Handle MongoDB duplicate key error (Requirement: database)
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `Duplicate value entered for ${field}.`;
  }

  // Handle MongoDB connection / server selection errors (Requirement: database)
  if (err.name === 'MongoNetworkError' || err.name === 'MongooseServerSelectionError') {
    statusCode = 503;
    message = 'Database service is temporarily unavailable. Please try again shortly.';
  }

  // Handle JWT errors (Requirement: authentication)
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Authentication token has expired. Please log in again.';
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid authentication token.';
  }

  // Handle Multer upload errors (Requirement: uploads)
  if (err.name === 'MulterError') {
    statusCode = 400;
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'File size limit exceeded. Maximum allowed file size is 5MB.';
    } else {
      message = err.message || 'File upload failed.';
    }
  }

  // Handle Paystack payment errors (Requirement: payments)
  if (err.message && (err.message.includes('Paystack') || err.message.includes('payment'))) {
    message = scrubSensitiveStrings(err.message);
  }

  // Log internal errors on server console for diagnostics without sending to client
  if (statusCode >= 500) {
    console.error(`[Server Error] ${scrubSensitiveStrings(err.message)}`);
  }

  // Clean outgoing message
  const sanitizedMessage = scrubSensitiveStrings(message);

  // In production, mask generic 500 errors
  const isProduction = process.env.NODE_ENV === 'production';
  const finalMessage = statusCode >= 500 && isProduction ? 'Internal server error.' : sanitizedMessage;

  // CRITICAL REQUIREMENT: Do NOT expose stack traces under any circumstance
  res.status(statusCode).json({
    success: false,
    message: finalMessage,
    ...(errors ? { errors } : {}),
  });
}

module.exports = {
  errorHandler,
  notFoundHandler,
  scrubSensitiveStrings,
};
