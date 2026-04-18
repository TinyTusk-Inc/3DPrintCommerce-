-- =========================================================
-- Migration: 004-user-addresses.sql
-- Description: Replace single users.address JSONB with a
--              proper user_addresses table supporting multiple
--              saved addresses per user.
-- Created: 2026-04-19
-- =========================================================

CREATE TABLE user_addresses (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Display label chosen by user
  label        VARCHAR(50) NOT NULL DEFAULT 'Home',  -- e.g. Home, Work, Other

  -- Recipient details (may differ from account holder)
  name         VARCHAR(255) NOT NULL,
  -- Phone for this address (delivery person calls this number)
  -- NULL means "use account phone"
  phone        VARCHAR(20),
  use_account_phone BOOLEAN NOT NULL DEFAULT TRUE,

  -- Address fields
  street       TEXT NOT NULL,
  city         VARCHAR(100) NOT NULL,
  state        VARCHAR(100) NOT NULL,
  pincode      VARCHAR(10) NOT NULL,
  country      VARCHAR(100) NOT NULL DEFAULT 'India',

  is_default   BOOLEAN NOT NULL DEFAULT FALSE,

  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_addresses_user_id   ON user_addresses(user_id);
CREATE INDEX idx_user_addresses_is_default ON user_addresses(user_id, is_default);

-- Only one default address per user
CREATE UNIQUE INDEX idx_user_addresses_one_default
  ON user_addresses(user_id)
  WHERE is_default = TRUE;

CREATE TRIGGER update_user_addresses_updated_at
  BEFORE UPDATE ON user_addresses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =========================================================
-- NOTE: users.address (JSONB) is kept for backward compat
-- but new code should use user_addresses exclusively.
-- =========================================================
