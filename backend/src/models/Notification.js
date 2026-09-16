const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Customer reference is required'],
      index: true,
    },
    type: {
      type: String,
      required: [true, 'Notification type is required'],
      enum: {
        values: [
          'ORDER_CONFIRMED',
          'ORDER_PREPARING',
          'ORDER_READY',
          'ORDER_OUT_FOR_DELIVERY',
          'ORDER_DELIVERED',
          'PAYMENT_SUCCESSFUL',
          'PAYMENT_FAILED',
        ],
        message: '{VALUE} is not a supported notification type',
      },
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Notification title is required'],
      trim: true,
    },
    message: {
      type: String,
      required: [true, 'Notification message is required'],
      trim: true,
    },
    data: {
      orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
      },
      orderReference: {
        type: String,
        trim: true,
      },
      totalAmount: {
        type: Number,
      },
      deliveryAddress: {
        type: String,
      },
    },
    channels: [
      {
        channel: {
          type: String,
          enum: ['IN_APP', 'EMAIL', 'PUSH'],
          required: true,
        },
        status: {
          type: String,
          enum: ['SENT', 'FAILED', 'SKIPPED'],
          default: 'SENT',
        },
        error: {
          type: String,
        },
        dispatchedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Index for performant customer notifications feed
notificationSchema.index({ customer: 1, createdAt: -1 });
notificationSchema.index({ customer: 1, isRead: 1 });

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
