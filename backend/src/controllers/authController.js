const authService = require('../services/authService');

/**
 * @route   POST /api/auth/register
 * @desc    Register a new customer or admin user
 * @access  Public
 */
async function register(req, res, next) {
  try {
    const { user, token } = await authService.registerUser(req.body);

    res.status(201).json({
      success: true,
      message: 'Account registered successfully.',
      data: {
        user,
        token,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate credentials and return JWT
 * @access  Public
 */
async function login(req, res, next) {
  try {
    const { user, token } = await authService.loginUser(req.body);

    res.status(200).json({
      success: true,
      message: 'Authentication successful.',
      data: {
        user,
        token,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   GET /api/auth/me
 * @desc    Get currently authenticated user profile
 * @access  Protected (Requires Bearer token)
 */
async function getMe(req, res, next) {
  try {
    const user = await authService.getUserProfile(req.user._id);

    res.status(200).json({
      success: true,
      data: {
        user,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   PUT /api/auth/profile
 * @desc    Update current user profile
 * @access  Protected
 */
async function updateProfile(req, res, next) {
  try {
    const user = await authService.updateProfile(req.user._id, req.body);

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      data: {
        user,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   PUT /api/auth/change-password
 * @desc    Change current user password
 * @access  Protected
 */
async function changePassword(req, res, next) {
  try {
    const result = await authService.changePassword(req.user._id, req.body);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Request password reset email
 * @access  Public
 */
async function forgotPassword(req, res, next) {
  try {
    const result = await authService.forgotPassword(req.body.email);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password with one-time token
 * @access  Public
 */
async function resetPassword(req, res, next) {
  try {
    const result = await authService.resetPassword(req.body);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
};
