/**
 * Email OTP Controller
 *
 * Two endpoints:
 *   POST /api/auth/email/request-otp  — send OTP to a new email address
 *   POST /api/auth/email/verify-otp   — verify OTP and save the email
 *
 * Flow:
 *   1. User submits new email → backend generates 6-digit OTP, hashes it,
 *      stores in email_otp, sends plain OTP to the new address.
 *   2. User submits OTP → backend checks hash, expiry, attempts.
 *      On success: email saved as verified, email_otp row deleted.
 *      On failure: attempts incremented; deleted after 5 wrong guesses.
 */

const crypto = require('crypto');
const { query } = require('../config/database');
const { User } = require('../models');
const emailService = require('../services/emailService');

const OTP_EXPIRY_MINUTES = 5;
const MAX_VERIFY_ATTEMPTS = 5;   // wrong guesses before OTP is invalidated
const MAX_RESEND_COUNT    = 4;   // total resends allowed per verification session
const RESEND_COOLDOWN_SEC = 60;  // seconds user must wait before requesting resend

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateOtp() {
  // Cryptographically random 6-digit number (000000–999999)
  return String(crypto.randomInt(0, 1000000)).padStart(6, '0');
}

function hashOtp(otp) {
  return crypto.createHash('sha256').update(otp).digest('hex');
}

// ---------------------------------------------------------------------------
// POST /api/auth/email/request-otp
// Body: { email }
// ---------------------------------------------------------------------------

async function requestOtp(req, res) {
  try {
    const userId = req.user.userId;
    const { email } = req.body;

    if (!email) return res.status(400).json({ error: 'Email is required' });

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return res.status(400).json({ error: 'Invalid email format' });

    // Check the email isn't already taken by another account
    const existing = await User.findByEmail(email);
    if (existing && existing.id !== userId) {
      return res.status(409).json({ error: 'That email address is already in use' });
    }

    // Check for an existing OTP row for this user
    const existingOtp = await query(
      'SELECT * FROM email_otp WHERE user_id = $1',
      [userId]
    );
    const row = existingOtp.rows[0];

    if (row) {
      // Enforce per-user resend cooldown (server-side — can't be bypassed by changing IP)
      const secondsSinceLastSend = (Date.now() - new Date(row.last_sent_at).getTime()) / 1000;
      if (secondsSinceLastSend < RESEND_COOLDOWN_SEC) {
        const waitSeconds = Math.ceil(RESEND_COOLDOWN_SEC - secondsSinceLastSend);
        return res.status(429).json({
          error: `Please wait ${waitSeconds} second${waitSeconds === 1 ? '' : 's'} before requesting a new code.`,
          wait_seconds: waitSeconds
        });
      }

      // Enforce max resend limit — after 4 resends, block and tell user to try later
      if (row.resend_count >= MAX_RESEND_COUNT) {
        // Clean up the exhausted OTP row
        await query('DELETE FROM email_otp WHERE user_id = $1', [userId]);
        await query('UPDATE users SET email_pending = NULL WHERE id = $1', [userId]);
        return res.status(429).json({
          error: 'We\'re having trouble delivering the verification code. Please try again in a few minutes.',
          exhausted: true
        });
      }
    }

    // Generate new OTP
    const otp = generateOtp();
    const otpHash = hashOtp(otp);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    if (row) {
      // Update existing row — increment resend_count, reset OTP and expiry
      await query(
        `UPDATE email_otp
         SET email        = $2,
             otp_hash     = $3,
             expires_at   = $4,
             attempts     = 0,
             resend_count = resend_count + 1,
             last_sent_at = NOW()
         WHERE user_id = $1`,
        [userId, email, otpHash, expiresAt]
      );
    } else {
      // First request — insert fresh row
      await query(
        `INSERT INTO email_otp (user_id, email, otp_hash, expires_at, resend_count, last_sent_at)
         VALUES ($1, $2, $3, $4, 0, NOW())`,
        [userId, email, otpHash, expiresAt]
      );
    }

    // Store pending email on user row
    await query('UPDATE users SET email_pending = $1 WHERE id = $2', [email, userId]);

    // Send OTP email
    await emailService.sendEmailVerificationOtp(email, otp, OTP_EXPIRY_MINUTES);

    const remainingResends = MAX_RESEND_COUNT - (row ? row.resend_count + 1 : 0);

    return res.status(200).json({
      message: `Verification code sent to ${email}. It expires in ${OTP_EXPIRY_MINUTES} minutes.`,
      resends_remaining: remainingResends
    });
  } catch (err) {
    console.error('[emailOtp] requestOtp error:', err);
    return res.status(500).json({ error: 'Failed to send verification code' });
  }
}

// ---------------------------------------------------------------------------
// POST /api/auth/email/verify-otp
// Body: { otp }
// ---------------------------------------------------------------------------

async function verifyOtp(req, res) {
  try {
    const userId = req.user.userId;
    const { otp } = req.body;

    if (!otp || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({ error: 'OTP must be a 6-digit number' });
    }

    // Fetch the pending OTP row
    const result = await query(
      'SELECT * FROM email_otp WHERE user_id = $1',
      [userId]
    );
    const row = result.rows[0];

    if (!row) {
      return res.status(404).json({ error: 'No verification in progress. Please request a new code.' });
    }

    // Check expiry — delete and reject if expired
    if (new Date() > new Date(row.expires_at)) {
      await query('DELETE FROM email_otp WHERE user_id = $1', [userId]);
      await query('UPDATE users SET email_pending = NULL WHERE id = $1', [userId]);
      return res.status(410).json({ error: 'Verification code has expired. Please request a new one.' });
    }

    // Check max attempts — delete and reject if exceeded
    if (row.attempts >= MAX_VERIFY_ATTEMPTS) {
      await query('DELETE FROM email_otp WHERE user_id = $1', [userId]);
      await query('UPDATE users SET email_pending = NULL WHERE id = $1', [userId]);
      return res.status(429).json({ error: 'Too many incorrect attempts. Please request a new code.' });
    }

    // Verify OTP hash
    const submittedHash = hashOtp(otp);
    if (submittedHash !== row.otp_hash) {
      await query('UPDATE email_otp SET attempts = attempts + 1 WHERE user_id = $1', [userId]);
      const remaining = MAX_VERIFY_ATTEMPTS - (row.attempts + 1);
      return res.status(400).json({
        error: `Incorrect code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
      });
    }

    // ✓ OTP correct — save email as verified and clean up
    await query(
      `UPDATE users
       SET email = $2, email_verified = TRUE, email_pending = NULL, updated_at = NOW()
       WHERE id = $1`,
      [userId, row.email]
    );

    // Delete this user's OTP row AND any other expired rows across all users.
    // This is a cheap opportunistic cleanup — no separate cron job needed.
    // The table stays small: at most one row per user, and only while a
    // verification is in progress.
    await query(
      `DELETE FROM email_otp
       WHERE user_id = $1
          OR expires_at < NOW()`,
      [userId]
    );

    // Fetch updated user to return
    const user = await User.findById(userId);

    return res.status(200).json({
      message: 'Email verified successfully.',
      user: {
        id: user.id,
        email: user.email,
        email_verified: user.email_verified,
        name: user.name,
        phone: user.phone
      }
    });
  } catch (err) {
    console.error('[emailOtp] verifyOtp error:', err);
    return res.status(500).json({ error: 'Failed to verify code' });
  }
}

module.exports = { requestOtp, verifyOtp };
