/**
 * Email Service
 * Sends transactional emails using Nodemailer (SMTP/Gmail).
 * Swap EMAIL_PROVIDER=sendgrid and add SENDGRID_API_KEY for production.
 */

const nodemailer = require('nodemailer');

// ---------------------------------------------------------------------------
// Transporter setup
// ---------------------------------------------------------------------------

function createTransporter() {
  const service = process.env.EMAIL_SERVICE || 'gmail';
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASSWORD;

  if (!user || !pass) {
    console.warn('[emailService] EMAIL_USER or EMAIL_PASSWORD not set — emails will not be sent.');
    return null;
  }

  return nodemailer.createTransport({
    service,
    auth: { user, pass }
  });
}

const transporter = createTransporter();

// ---------------------------------------------------------------------------
// Internal helper
// ---------------------------------------------------------------------------

async function sendMail({ to, subject, html }) {
  if (!transporter) {
    console.warn(`[emailService] Skipping email to ${to} — transporter not configured.`);
    return { skipped: true };
  }

  const from = `"${process.env.EMAIL_FROM_NAME || '3D Print Store'}" <${process.env.EMAIL_USER}>`;

  try {
    const info = await transporter.sendMail({ from, to, subject, html });
    console.log(`[emailService] Sent "${subject}" to ${to} — messageId: ${info.messageId}`);
    return info;
  } catch (err) {
    console.error(`[emailService] Failed to send "${subject}" to ${to}:`, err.message);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Templates (inline HTML — swap for .hbs/.ejs files in Phase 3 polish)
// ---------------------------------------------------------------------------

function orderConfirmationHtml(order, items) {
  const itemRows = items
    .map(
      (i) =>
        `<tr>
          <td style="padding:6px 12px">${i.product_name || i.name || i.product_id}</td>
          <td style="padding:6px 12px;text-align:center">${i.quantity}</td>
          <td style="padding:6px 12px;text-align:right">₹${Number(i.price_at_purchase).toFixed(2)}</td>
        </tr>`
    )
    .join('');

  return `
    <div style="font-family:sans-serif;max-width:600px;margin:auto">
      <h2 style="color:#2c3e50">Order Confirmed 🎉</h2>
      <p>Thank you for your order! Here's a summary:</p>
      <p><strong>Order ID:</strong> ${order.id}</p>
      <p><strong>Date:</strong> ${new Date(order.created_at).toLocaleDateString()}</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <thead>
          <tr style="background:#f4f4f4">
            <th style="padding:8px 12px;text-align:left">Product</th>
            <th style="padding:8px 12px">Qty</th>
            <th style="padding:8px 12px;text-align:right">Price</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>
      <p style="font-size:18px"><strong>Total: ₹${Number(order.total_price).toFixed(2)}</strong></p>
      <p>We'll notify you when your order ships.</p>
      <p style="color:#888;font-size:12px">If you have questions, reply to this email.</p>
    </div>
  `;
}

function orderStatusUpdateHtml(order, status) {
  const messages = {
    shipped: {
      headline: 'Your order has been shipped! 🚚',
      body: `Your order <strong>#${order.id.substring(0, 8)}</strong> is on its way. You'll receive it soon.`
    },
    delivered: {
      headline: 'Your order has been delivered! 📦',
      body: `Your order <strong>#${order.id.substring(0, 8)}</strong> has been delivered. We hope you love it! Please consider leaving a review.`
    },
    paid: {
      headline: 'Payment received ✅',
      body: `We've confirmed payment for order <strong>#${order.id.substring(0, 8)}</strong>. We're preparing your items.`
    }
  };

  const msg = messages[status] || {
    headline: `Order status updated: ${status}`,
    body: `Your order <strong>#${order.id.substring(0, 8)}</strong> status is now <strong>${status}</strong>.`
  };

  return `
    <div style="font-family:sans-serif;max-width:600px;margin:auto">
      <h2 style="color:#2c3e50">${msg.headline}</h2>
      <p>${msg.body}</p>
      <p><strong>Order ID:</strong> ${order.id}</p>
      <p><strong>Total:</strong> ₹${Number(order.total_price).toFixed(2)}</p>
      <p style="color:#888;font-size:12px">If you have questions, reply to this email.</p>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Send order confirmation email after payment is captured.
 * @param {object} order  - Order row from DB
 * @param {Array}  items  - Array of order_item rows (with name or product_id)
 * @param {string} userEmail
 */
async function sendOrderConfirmation(order, items, userEmail) {
  return sendMail({
    to: userEmail,
    subject: `Order Confirmation — Order #${order.id.substring(0, 8)}`,
    html: orderConfirmationHtml(order, items)
  });
}

/**
 * Send order status update email (paid, shipped, delivered).
 * @param {object} order
 * @param {string} status  - new status
 * @param {string} userEmail
 */
async function sendOrderStatusUpdate(order, status, userEmail) {
  const subjectMap = {
    paid: 'Payment Received',
    shipped: 'Your Order Has Been Shipped',
    delivered: 'Your Order Has Been Delivered'
  };
  const subject = `${subjectMap[status] || `Order ${status}`} — Order #${order.id.substring(0, 8)}`;

  return sendMail({
    to: userEmail,
    subject,
    html: orderStatusUpdateHtml(order, status)
  });
}

module.exports = {
  sendOrderConfirmation,
  sendOrderStatusUpdate
};
