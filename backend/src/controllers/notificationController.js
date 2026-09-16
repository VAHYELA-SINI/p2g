const notificationService = require('../services/notifications/notificationService');

/**
 * @route   GET /api/notifications
 * @desc    Get paginated notification history for current customer
 * @access  Protected (Customer)
 */
async function getNotifications(req, res, next) {
  try {
    const result = await notificationService.getNotifications(req.user._id, req.query);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   PATCH /api/notifications/:id/read
 * @desc    Mark a single notification as read
 * @access  Protected (Customer)
 */
async function markAsRead(req, res, next) {
  try {
    const notification = await notificationService.markAsRead(req.params.id, req.user._id);

    res.status(200).json({
      success: true,
      message: 'Notification marked as read.',
      data: { notification },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   PATCH /api/notifications/read-all
 * @desc    Mark all customer notifications as read
 * @access  Protected (Customer)
 */
async function markAllAsRead(req, res, next) {
  try {
    const result = await notificationService.markAllAsRead(req.user._id);

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   GET /api/notifications/preferences
 * @desc    Get customer notification preferences
 * @access  Protected (Customer)
 */
async function getPreferences(req, res, next) {
  try {
    const preferences = await notificationService.getPreferences(req.user._id);

    res.status(200).json({
      success: true,
      data: { preferences },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   PUT /api/notifications/preferences
 * @desc    Update customer notification preferences
 * @access  Protected (Customer)
 */
async function updatePreferences(req, res, next) {
  try {
    const preferences = await notificationService.updatePreferences(req.user._id, req.body);

    res.status(200).json({
      success: true,
      message: 'Notification preferences updated.',
      data: { preferences },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   POST /api/notifications/push-token
 * @desc    Register or update an Expo push token
 * @access  Protected (Customer)
 */
async function registerPushToken(req, res, next) {
  try {
    const result = await notificationService.registerPushToken(req.user._id, req.body);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   DELETE /api/notifications/push-token
 * @desc    Unregister an Expo push token on logout
 * @access  Protected (Customer)
 */
async function removePushToken(req, res, next) {
  try {
    const result = await notificationService.removePushToken(req.user._id, req.body.token);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  getPreferences,
  updatePreferences,
  registerPushToken,
  removePushToken,
};
