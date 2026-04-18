-- =============================================================
-- Migration: 001-schema.sql
-- Description: Complete database schema for 3D Print Commerce Platform
-- Consolidates all previous migrations into one clean baseline.
-- Run once on a fresh database:
--   psql -d ecommerce_3d_db -f backend/migrations/001-schema.sql
-- =============================================================

-- =============================================================
-- EXTENSIONS
-- =============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================
-- SHARED TRIGGER FUNCTION (updated_at auto-maintenance)
-- =============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================
-- ENUM TYPES
-- =============================================================

CREATE TYPE order_status AS ENUM (
  'pending', 'paid', 'shipped', 'delivered', 'cancelled'
);

CREATE TYPE inventory_action AS ENUM (
  'add', 'remove', 'sold'
);

CREATE TYPE custom_order_status AS ENUM (
  'submitted', 'reviewing', 'quoted', 'approved',
  'in_progress', 'completed', 'rejected'
);

-- =============================================================
-- USERS
-- Supports email/password login AND social login (Google, Facebook).
-- Social-only users have password_hash = NULL.
-- Admin/owner has is_admin = TRUE (set via seed script, never via API).
-- email_verified: TRUE once user has confirmed via OTP.
-- email_pending: holds a new unverified email while OTP is in flight.
--   On successful OTP → email = email_pending, email_pending = NULL.
-- =============================================================

CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Auth: at least one of these must be non-null (enforced by constraint below)
  email         VARCHAR(255) UNIQUE,          -- nullable: some social providers withhold email
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  email_pending  VARCHAR(255),                -- unverified new email waiting for OTP
  password_hash VARCHAR(255),                 -- nullable: social-only users have no password

  -- Social auth
  google_id     VARCHAR(255) UNIQUE,
  facebook_id   VARCHAR(255) UNIQUE,
  avatar_url    TEXT,

  -- Profile
  name          VARCHAR(255) NOT NULL,
  phone         VARCHAR(20),

  -- Roles
  is_seller     BOOLEAN NOT NULL DEFAULT FALSE,  -- TRUE = store owner / admin
  is_admin      BOOLEAN NOT NULL DEFAULT FALSE,  -- TRUE = admin UI access

  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Must have at least one login method
  CONSTRAINT check_auth_method CHECK (
    password_hash IS NOT NULL OR
    google_id     IS NOT NULL OR
    facebook_id   IS NOT NULL
  )
);

CREATE INDEX idx_users_email       ON users(email);
CREATE INDEX idx_users_google_id   ON users(google_id);
CREATE INDEX idx_users_facebook_id ON users(facebook_id);
CREATE INDEX idx_users_is_admin    ON users(is_admin);
CREATE INDEX idx_users_is_seller   ON users(is_seller);

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================
-- USER ADDRESSES
-- Multiple saved addresses per user.
-- Delivery phone may differ from account phone (ordering on behalf of someone).
-- =============================================================

CREATE TABLE user_addresses (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  label             VARCHAR(50)  NOT NULL DEFAULT 'Home',  -- Home | Work | Other
  name              VARCHAR(255) NOT NULL,                 -- recipient name
  phone             VARCHAR(20),                           -- NULL = use account phone
  use_account_phone BOOLEAN      NOT NULL DEFAULT TRUE,

  street            TEXT         NOT NULL,
  city              VARCHAR(100) NOT NULL,
  state             VARCHAR(100) NOT NULL,
  pincode           VARCHAR(10)  NOT NULL,
  country           VARCHAR(100) NOT NULL DEFAULT 'India',

  is_default        BOOLEAN      NOT NULL DEFAULT FALSE,

  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_addresses_user_id ON user_addresses(user_id);

-- Exactly one default address per user
CREATE UNIQUE INDEX idx_user_addresses_one_default
  ON user_addresses(user_id)
  WHERE is_default = TRUE;

CREATE TRIGGER trg_user_addresses_updated_at
  BEFORE UPDATE ON user_addresses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================
-- CATEGORIES
-- =============================================================

CREATE TABLE categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_categories_name ON categories(name);

CREATE TRIGGER trg_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================
-- PRODUCTS
-- Base product record. Color variants and images are in separate tables.
-- quantity_in_stock = total across all variants (or base stock if no variants).
-- =============================================================

CREATE TABLE products (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id      UUID REFERENCES categories(id) ON DELETE SET NULL,

  name             VARCHAR(255)   NOT NULL,
  description      TEXT,
  price            DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
  quantity_in_stock INTEGER        NOT NULL DEFAULT 0 CHECK (quantity_in_stock >= 0),

  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_products_seller_id   ON products(seller_id);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_name        ON products(name);

CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================
-- PRODUCT VARIANTS (color options)
-- A product with no rows here has a single appearance.
-- Each variant has its own stock and optional price delta.
-- =============================================================

CREATE TABLE product_variants (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,

  color_name  VARCHAR(100)   NOT NULL,
  color_hex   VARCHAR(7),                          -- e.g. "#1a1a1a" for swatch
  price_delta DECIMAL(10, 2) NOT NULL DEFAULT 0,   -- added to base price (can be negative)
  stock       INTEGER        NOT NULL DEFAULT 0 CHECK (stock >= 0),
  is_default  BOOLEAN        NOT NULL DEFAULT FALSE,
  sort_order  INTEGER        NOT NULL DEFAULT 0,

  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_product_variants_product_id ON product_variants(product_id);

-- Exactly one default variant per product
CREATE UNIQUE INDEX idx_product_variants_one_default
  ON product_variants(product_id)
  WHERE is_default = TRUE;

CREATE TRIGGER trg_product_variants_updated_at
  BEFORE UPDATE ON product_variants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================
-- PRODUCT IMAGES
-- variant_id NULL  → shared image, shown for all color selections
-- variant_id SET   → shown only when that variant is selected
-- sort_order = 0   → hero / primary image
-- =============================================================

CREATE TABLE product_images (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id  UUID REFERENCES product_variants(id) ON DELETE CASCADE,

  url         TEXT         NOT NULL,
  alt_text    VARCHAR(255),
  sort_order  INTEGER      NOT NULL DEFAULT 0,

  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_product_images_product_id ON product_images(product_id);
CREATE INDEX idx_product_images_variant_id ON product_images(variant_id);
CREATE INDEX idx_product_images_sort_order ON product_images(sort_order);

-- =============================================================
-- ORDERS
-- =============================================================

CREATE TABLE orders (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seller_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  status              order_status   NOT NULL DEFAULT 'pending',
  total_price         DECIMAL(12, 2) NOT NULL CHECK (total_price >= 0),

  -- Razorpay
  razorpay_order_id   VARCHAR(255) UNIQUE,
  razorpay_payment_id VARCHAR(255) UNIQUE,

  -- Snapshot of the address used at time of order
  shipping_address    JSONB,

  created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_orders_user_id           ON orders(user_id);
CREATE INDEX idx_orders_seller_id         ON orders(seller_id);
CREATE INDEX idx_orders_status            ON orders(status);
CREATE INDEX idx_orders_razorpay_order_id ON orders(razorpay_order_id);
CREATE INDEX idx_orders_created_at        ON orders(created_at);

CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================
-- ORDER ITEMS
-- =============================================================

CREATE TABLE order_items (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id          UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id        UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  variant_id        UUID REFERENCES product_variants(id) ON DELETE SET NULL,

  quantity          INTEGER        NOT NULL CHECK (quantity > 0),
  price_at_purchase DECIMAL(10, 2) NOT NULL CHECK (price_at_purchase >= 0),

  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_order_items_order_id   ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);

-- =============================================================
-- REVIEWS
-- One review per user per product (enforced by unique index).
-- =============================================================

CREATE TABLE reviews (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id)    ON DELETE CASCADE,

  rating     INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  text       TEXT,

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_reviews_one_per_user ON reviews(product_id, user_id);
CREATE INDEX idx_reviews_product_id ON reviews(product_id);
CREATE INDEX idx_reviews_user_id    ON reviews(user_id);

CREATE TRIGGER trg_reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================
-- INVENTORY LOGS
-- Immutable audit trail of all stock changes.
-- =============================================================

CREATE TABLE inventory_logs (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id     UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,

  action         inventory_action NOT NULL,
  quantity_delta INTEGER          NOT NULL,  -- positive = added, negative = removed/sold
  reason         VARCHAR(255),

  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  -- No updated_at — immutable record
);

CREATE INDEX idx_inventory_logs_product_id ON inventory_logs(product_id);
CREATE INDEX idx_inventory_logs_action     ON inventory_logs(action);
CREATE INDEX idx_inventory_logs_created_at ON inventory_logs(created_at);

-- =============================================================
-- CUSTOM ORDERS (Phase 5 — 3D printing requests)
-- =============================================================

CREATE TABLE custom_orders (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seller_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  status              custom_order_status NOT NULL DEFAULT 'submitted',
  title               VARCHAR(255)        NOT NULL,
  description         TEXT,

  estimated_price     DECIMAL(12, 2),
  final_price         DECIMAL(12, 2),
  delivery_date_estimate TIMESTAMP,

  -- Linked to a standard order once user pays the quote
  order_id            UUID REFERENCES orders(id) ON DELETE SET NULL,
  notes_from_admin    TEXT,

  created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_custom_orders_user_id   ON custom_orders(user_id);
CREATE INDEX idx_custom_orders_seller_id ON custom_orders(seller_id);
CREATE INDEX idx_custom_orders_status    ON custom_orders(status);

CREATE TRIGGER trg_custom_orders_updated_at
  BEFORE UPDATE ON custom_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================
-- CUSTOM ORDER FILES (Phase 5)
-- =============================================================

CREATE TABLE custom_order_files (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  custom_order_id     UUID NOT NULL REFERENCES custom_orders(id) ON DELETE CASCADE,

  original_filename   VARCHAR(255) NOT NULL,
  file_format         VARCHAR(10)  NOT NULL CHECK (file_format IN ('stl', '3dm', 'obj')),
  file_size_bytes     BIGINT       NOT NULL,
  file_url            TEXT         NOT NULL,

  validation_status   VARCHAR(20)  NOT NULL DEFAULT 'pending'
                        CHECK (validation_status IN ('pending', 'validated', 'error')),
  validation_errors   JSONB,

  virus_scan_status   VARCHAR(20)  NOT NULL DEFAULT 'pending'
                        CHECK (virus_scan_status IN ('pending', 'clean', 'infected')),
  virus_scan_result   JSONB,

  created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_custom_order_files_custom_order_id ON custom_order_files(custom_order_id);
CREATE INDEX idx_custom_order_files_validation      ON custom_order_files(validation_status);
CREATE INDEX idx_custom_order_files_virus_scan      ON custom_order_files(virus_scan_status);

-- =============================================================
-- EMAIL OTP
-- Temporary table — rows exist only while a verification is in progress.
-- Deleted immediately on successful verify, failed (max attempts), or expiry check.
-- OTP is stored as a SHA-256 hash — never plain text.
-- Expiry: 5 minutes from creation.
-- Max attempts: 5 wrong guesses invalidates the OTP.
-- =============================================================

CREATE TABLE email_otp (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email        VARCHAR(255) NOT NULL,   -- the address being verified
  otp_hash     VARCHAR(64)  NOT NULL,   -- SHA-256 hex of the 6-digit OTP
  expires_at   TIMESTAMP    NOT NULL,   -- created_at + 5 minutes
  attempts     INTEGER      NOT NULL DEFAULT 0,  -- wrong guess counter (max 5)
  resend_count INTEGER      NOT NULL DEFAULT 0,  -- how many times OTP was resent (max 4)
  last_sent_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,  -- cooldown enforcement
  created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- One active OTP per user at a time
CREATE UNIQUE INDEX idx_email_otp_user_id ON email_otp(user_id);

-- =============================================================
-- EMAIL QUEUE (async email processing via Bull + Redis)
-- =============================================================

CREATE TABLE email_queue (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  email_type          VARCHAR(100) NOT NULL,  -- order_confirmation, order_status_update, etc.
  recipient_email     VARCHAR(255) NOT NULL,
  subject             VARCHAR(255) NOT NULL,
  body                TEXT         NOT NULL,

  -- Optional reference to the related entity
  related_entity_id   UUID,
  related_entity_type VARCHAR(100),

  status              VARCHAR(20)  NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'sent', 'failed', 'bounced')),
  attempts            INTEGER      NOT NULL DEFAULT 0,
  max_attempts        INTEGER      NOT NULL DEFAULT 3,
  error_message       TEXT,

  created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sent_at             TIMESTAMP,
  updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_email_queue_status         ON email_queue(status);
CREATE INDEX idx_email_queue_recipient      ON email_queue(recipient_email);
CREATE INDEX idx_email_queue_created_at     ON email_queue(created_at);

CREATE TRIGGER trg_email_queue_updated_at
  BEFORE UPDATE ON email_queue
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================
-- SCHEMA COMPLETE
-- Tables: users, user_addresses, categories, products,
--         product_variants, product_images, orders, order_items,
--         reviews, inventory_logs, custom_orders,
--         custom_order_files, email_otp, email_queue
-- =============================================================
