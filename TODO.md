# Project TODO

## 🔐 OAuth / Social Login Setup

Before Google and Facebook login will work, complete these steps:

- [ ] Run the social auth migration
  ```bash
  psql -d ecommerce_3d_db -f backend/migrations/002-add-social-auth.sql
  ```

- [ ] Install new backend dependencies
  ```bash
  cd backend && npm install
  ```

- [ ] Create a Google OAuth 2.0 app
  - Go to https://console.cloud.google.com → APIs & Services → Credentials
  - Create an OAuth 2.0 Client ID (Web application)
  - Add authorized redirect URI: `http://localhost:3000/api/auth/google/callback`
  - For production add: `https://yourdomain.com/api/auth/google/callback`
  - Copy Client ID and Client Secret into `backend/.env`

- [ ] Create a Facebook OAuth app
  - Go to https://developers.facebook.com → My Apps → Create App
  - Add Facebook Login product, set OAuth redirect URI:
    `http://localhost:3000/api/auth/facebook/callback`
  - Copy App ID and App Secret into `backend/.env`

- [ ] Fill in real credentials in `backend/.env`
  ```
  GOOGLE_CLIENT_ID=...
  GOOGLE_CLIENT_SECRET=...
  FACEBOOK_APP_ID=...
  FACEBOOK_APP_SECRET=...
  ```

- [ ] Update callback URLs for production in `backend/.env`
  ```
  GOOGLE_CALLBACK_URL=https://yourdomain.com/api/auth/google/callback
  FACEBOOK_CALLBACK_URL=https://yourdomain.com/api/auth/facebook/callback
  FRONTEND_URL=https://yourdomain.com
  ```

---

## 🔑 Secrets & Sensitive Config

- [ ] Generate a strong JWT_SECRET and replace the placeholder
  ```bash
  node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
  ```

- [ ] Replace all `your_*_here` placeholder values in `backend/.env` with real credentials before deploying

- [ ] Set up a secrets manager for production (see **Secrets Management** section below)

---

## 📧 Email Service

- [ ] Configure Gmail App Password for development
  - Enable 2FA on your Gmail account
  - Generate an App Password at https://myaccount.google.com/apppasswords
  - Set `EMAIL_USER` and `EMAIL_PASSWORD` in `backend/.env`

- [ ] Migrate to SendGrid for production
  - Create account at https://sendgrid.com
  - Generate an API key and set `SENDGRID_API_KEY` in `backend/.env`

---

## 💳 Razorpay

- [ ] Create a Razorpay account at https://razorpay.com
- [ ] Get Key ID and Key Secret from Dashboard → Settings → API Keys
- [ ] Set up a webhook in Razorpay Dashboard → Webhooks
  - URL: `https://yourdomain.com/api/orders/webhook/razorpay`
  - Events: `payment.captured`, `payment.failed`
  - Copy the webhook secret into `RAZORPAY_WEBHOOK_SECRET`

---

## 🗄️ File Storage

- [ ] Choose between AWS S3 or Cloudinary for file uploads (custom order files)
- [ ] Create bucket / account and fill in credentials in `backend/.env`

---

## 🚀 Phase 6 — Phone OTP Login

- [ ] Add `phone` column uniqueness constraint to users table
- [ ] Integrate an OTP provider (Twilio / MSG91 / AWS SNS)
- [ ] Add `phone_verified` column to users table
- [ ] Implement OTP send + verify endpoints
- [ ] Link phone to existing account using same auto-linking pattern as social auth

---

## 🔒 Secrets Management — HashiCorp Vault (Self-Hosted)

See `VAULT_SETUP.md` for the full setup guide.

- [ ] Install and configure Vault server (see VAULT_SETUP.md)
- [ ] Store all production secrets in Vault
- [ ] Wire Vault client into backend startup (`backend/src/config/vault.js`)
- [ ] Replace `.env` secret values with Vault-fetched values in production
- [ ] When ready to move to cloud: point `VAULT_ADDR` at HCP Vault or swap to AWS Secrets Manager SDK (no app logic changes needed)
