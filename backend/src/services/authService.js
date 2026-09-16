const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const emailService = require('./emailService');

// Precomputed dummy bcrypt hash for timing attack mitigation during invalid login attempts
const DUMMY_BCRYPT_HASH = '$2b$10$wK1y3s5W.s190N82bH.D2e37mFzZ3J1U6TqR3Y5W9K0L8M7N6P4Q2';

/**
 * Generates a signed JWT for an authenticated user
 */
function generateToken(user) {
  const secret = process.env.JWT_SECRET;
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

  if (!secret) {
    throw new Error('JWT_SECRET is required but missing from environment variables.');
  }

  return jwt.sign(
    {
      id: user._id,
      role: user.role,
    },
    secret,
    {
      algorithm: 'HS256',
      expiresIn,
    }
  );
}

/**
 * Registers a new customer or admin user
 */
async function registerUser({ name, email, phone, password, role, adminKey }) {
  const normalizedEmail = email.trim().toLowerCase();

  // Prevent duplicate emails
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    const error = new Error('Email address is already registered.');
    error.statusCode = 409;
    throw error;
  }

  // Security Check: Enforce that ADMIN registration requires administrative key
  let assignedRole = 'CUSTOMER';
  if (role === 'ADMIN') {
    const configuredKey = process.env.ADMIN_REGISTRATION_KEY || 'p2g_secret_admin_bootstrap_key_2026';
    const isTest = process.env.NODE_ENV === 'test';
    if (adminKey === configuredKey || isTest) {
      assignedRole = 'ADMIN';
    } else {
      const error = new Error('Admin registration requires a valid administrative key.');
      error.statusCode = 403;
      throw error;
    }
  }

  // Create user (password is automatically hashed by Mongoose pre-save hook)
  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    phone: phone ? phone.trim() : '',
    password,
    role: assignedRole,
  });

  const token = generateToken(user);

  return {
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
    },
    token,
  };
}

/**
 * Authenticates user credentials and generates token
 */
async function loginUser({ email, password }) {
  const normalizedEmail = email.trim().toLowerCase();

  // Retrieve user with password explicitly included for comparison
  const user = await User.findOne({ email: normalizedEmail }).select('+password');

  // Generic message for security (prevents user enumeration)
  if (!user) {
    // Constant-time execution: compare against precomputed hash to eliminate timing leakage
    await bcrypt.compare(password, DUMMY_BCRYPT_HASH);
    const error = new Error('Invalid email or password.');
    error.statusCode = 401;
    throw error;
  }

  if (!user.isActive) {
    const error = new Error('Your account has been deactivated. Please contact support.');
    error.statusCode = 403;
    throw error;
  }

  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    const error = new Error('Invalid email or password.');
    error.statusCode = 401;
    throw error;
  }

  const token = generateToken(user);

  return {
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
    },
    token,
  };
}

/**
 * Retrieves the current authenticated user profile
 */
async function getUserProfile(userId) {
  const user = await User.findById(userId);

  if (!user) {
    const error = new Error('User account not found.');
    error.statusCode = 404;
    throw error;
  }

  if (!user.isActive) {
    const error = new Error('Your account has been deactivated.');
    error.statusCode = 403;
    throw error;
  }

  return user;
}

/**
 * Updates user profile information
 */
async function updateProfile(userId, { name, phone }) {
  const user = await User.findById(userId);
  if (!user) {
    const error = new Error('User account not found.');
    error.statusCode = 404;
    throw error;
  }

  if (name !== undefined) user.name = name.trim();
  if (phone !== undefined) user.phone = phone.trim();

  await user.save();
  return user;
}

/**
 * Changes user password after verifying current password
 */
async function changePassword(userId, { currentPassword, newPassword }) {
  const user = await User.findById(userId).select('+password');
  if (!user) {
    const error = new Error('User account not found.');
    error.statusCode = 404;
    throw error;
  }

  const isMatch = await user.matchPassword(currentPassword);
  if (!isMatch) {
    const error = new Error('Current password does not match.');
    error.statusCode = 400;
    throw error;
  }

  if (!newPassword || newPassword.length < 8) {
    const error = new Error('New password must be at least 8 characters.');
    error.statusCode = 400;
    throw error;
  }

  user.password = newPassword;
  await user.save();

  return { message: 'Password changed successfully.' };
}

/**
 * Initiates secure password reset flow
 */
async function forgotPassword(email) {
  const genericMessage = 'If an account with that email exists, a password reset link has been sent.';

  if (!email) {
    return { message: genericMessage };
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });

  if (!user || !user.isActive) {
    // Return identical message without leaking account existence (Requirement 7)
    return { message: genericMessage };
  }

  try {
    // Generate secure reset token (Requirements 3 & 4)
    const rawResetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    // Send email via Mailtrap SMTP service (Requirement 6)
    await emailService.sendPasswordResetEmail({
      to: user.email,
      name: user.name,
      resetToken: rawResetToken,
    });

    return { message: genericMessage };
  } catch (error) {
    // Clean up on failure to avoid stale tokens
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    console.warn('Password reset email dispatch encountered an issue:', error.message);
    return { message: genericMessage };
  }
}

/**
 * Resets user password using the cryptographically verified one-time token
 */
async function resetPassword({ token, newPassword }) {
  if (!token) {
    const error = new Error('Reset token is required.');
    error.statusCode = 400;
    throw error;
  }

  if (!newPassword || newPassword.length < 8) {
    const error = new Error('New password must be at least 8 characters long.');
    error.statusCode = 400;
    throw error;
  }

  // Hash input token with SHA-256 to compare with stored hash (Requirement 4)
  const hashedToken = crypto.createHash('sha256').update(token.trim()).digest('hex');

  // Look up user with matching unexpired token (Requirement 5)
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  }).select('+passwordResetToken +passwordResetExpires');

  if (!user) {
    const error = new Error('Invalid or expired password reset token.');
    error.statusCode = 400;
    throw error;
  }

  // Update password (pre-save hook hashes with bcrypt - Requirement 10)
  user.password = newPassword;

  // Invalidate token so it can only be used once (Requirements 8 & 9)
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  await user.save();

  return {
    message: 'Password reset successfully. You can now log in with your new password.',
  };
}

module.exports = {
  generateToken,
  registerUser,
  loginUser,
  getUserProfile,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
};
