const nodemailer = require('nodemailer');

// In-memory capture of sent emails for automated testing and simulation
const recentSentEmails = [];

let transporterInstance = null;

/**
 * Initializes or returns the cached Nodemailer transporter
 */
function getTransporter() {
  if (transporterInstance) {
    return transporterInstance;
  }

  const host = process.env.EMAIL_HOST;
  const port = parseInt(process.env.EMAIL_PORT, 10) || 2525;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASSWORD;

  // If credentials are fully provided, construct SMTP transport
  if (host && user && pass) {
    transporterInstance = nodemailer.createTransport({
      host,
      port,
      auth: {
        user,
        pass,
      },
    });
  }

  return transporterInstance;
}

/**
 * Core email delivery dispatcher
 */
async function sendEmail({ to, subject, html, text }) {
  const fromAddress = process.env.EMAIL_FROM || 'P2G Fresh Foods <no-reply@p2g.com>';
  const transporter = getTransporter();

  const mailOptions = {
    from: fromAddress,
    to,
    subject,
    text,
    html,
  };

  // Always record in sent emails cache for inspection/testing
  recentSentEmails.push({
    to,
    subject,
    sentAt: new Date(),
    text,
  });

  if (transporter) {
    try {
      const info = await transporter.sendMail(mailOptions);
      return {
        success: true,
        messageId: info.messageId,
        simulated: false,
      };
    } catch (error) {
      console.warn('Mail delivery encountered an error:', error.message);
      return {
        success: false,
        error: error.message,
        simulated: false,
      };
    }
  }

  // Graceful simulated delivery (Mailtrap credentials not configured or testing)
  return {
    success: true,
    messageId: `sim_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    simulated: true,
  };
}

/**
 * Dispatches a password reset email with secure one-time link
 */
async function sendPasswordResetEmail({ to, name, resetToken, resetUrl }) {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:8081';
  const finalResetUrl = resetUrl || `${clientUrl}/(auth)/reset-password?token=${resetToken}`;

  const subject = 'Password Reset Request - P2G Grocery';

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; margin: 0; padding: 24px; color: #1E293B; }
          .card { max-width: 540px; margin: 0 auto; background: #FFFFFF; border-radius: 16px; border: 1px solid #E2E8F0; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
          .logo { display: inline-block; background: #2563EB; color: #FFFFFF; font-weight: 800; font-size: 20px; padding: 8px 16px; border-radius: 8px; margin-bottom: 20px; }
          .title { font-size: 22px; font-weight: 700; color: #0F172A; margin: 0 0 12px 0; }
          .body-text { font-size: 15px; line-height: 24px; color: #475569; margin: 0 0 24px 0; }
          .btn-container { text-align: center; margin: 30px 0; }
          .btn { display: inline-block; background-color: #2563EB; color: #FFFFFF !important; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-size: 16px; font-weight: 700; }
          .notice { font-size: 13px; color: #64748B; line-height: 20px; background: #F1F5F9; border-radius: 8px; padding: 14px; margin-top: 24px; }
          .footer { margin-top: 28px; text-align: center; font-size: 12px; color: #94A3B8; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="logo">P2G</div>
          <h1 class="title">Reset Your Password</h1>
          <p class="body-text">
            Hello ${name || 'Valued Customer'},<br><br>
            We received a request to reset the password for your P2G account. Click the button below to choose a new, secure password.
          </p>
          <div class="btn-container">
            <a href="${finalResetUrl}" class="btn">Reset Password</a>
          </div>
          <div class="notice">
            <strong>Important Security Notice:</strong><br>
            • This link will expire in <strong>15 minutes</strong>.<br>
            • If you did not make this request, you can safely ignore this email. Your current password remains unchanged and secure.
          </div>
          <div class="footer">
            © ${new Date().getFullYear()} P2G Fresh Foods & Groceries. All rights reserved.
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
Hello ${name || 'Valued Customer'},

We received a request to reset your password for P2G.
Please visit the following link to reset your password:

${finalResetUrl}

This link will expire in 15 minutes.
If you did not request this, please ignore this email.
`;

  return sendEmail({ to, subject, html, text });
}

/**
 * Dispatches an order or payment transactional notification email
 */
async function sendOrderNotificationEmail({ to, name, order, type, title, message }) {
  const subject = `${title} - Order #${order.paymentReference || order._id.toString().slice(-6).toUpperCase()}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; margin: 0; padding: 24px; color: #1E293B; }
          .card { max-width: 540px; margin: 0 auto; background: #FFFFFF; border-radius: 16px; border: 1px solid #E2E8F0; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
          .logo { display: inline-block; background: #2563EB; color: #FFFFFF; font-weight: 800; font-size: 20px; padding: 8px 16px; border-radius: 8px; margin-bottom: 20px; }
          .title { font-size: 22px; font-weight: 700; color: #0F172A; margin: 0 0 12px 0; }
          .body-text { font-size: 15px; line-height: 24px; color: #475569; margin: 0 0 20px 0; }
          .order-box { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 16px; margin-bottom: 24px; }
          .order-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
          .order-label { color: #64748B; font-weight: 500; }
          .order-value { color: #0F172A; font-weight: 700; }
          .footer { margin-top: 28px; text-align: center; font-size: 12px; color: #94A3B8; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="logo">P2G</div>
          <h1 class="title">${title}</h1>
          <p class="body-text">${message}</p>
          <div class="order-box">
            <div class="order-row">
              <span class="order-label">Order Ref:</span>
              <span class="order-value">${order.paymentReference || order._id}</span>
            </div>
            <div class="order-row">
              <span class="order-label">Total Amount:</span>
              <span class="order-value">₦${Number(order.totalAmount || 0).toLocaleString()}</span>
            </div>
            <div class="order-row">
              <span class="order-label">Delivery Address:</span>
              <span class="order-value">${order.deliveryInformation?.address || 'As specified'}</span>
            </div>
          </div>
          <div class="footer">
            © ${new Date().getFullYear()} P2G Fresh Foods & Groceries. All rights reserved.
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
${title}

${message}

Order Reference: ${order.paymentReference || order._id}
Total Amount: ₦${Number(order.totalAmount || 0).toLocaleString()}
Delivery Address: ${order.deliveryInformation?.address || 'As specified'}
`;

  return sendEmail({ to, subject, html, text });
}

function getSentEmails() {
  return [...recentSentEmails];
}

function clearSentEmails() {
  recentSentEmails.length = 0;
}

module.exports = {
  sendEmail,
  sendPasswordResetEmail,
  sendOrderNotificationEmail,
  getSentEmails,
  clearSentEmails,
};
