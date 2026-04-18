-- =========================================================
-- Migration: 002-add-social-auth.sql
-- Description: Add social authentication columns to users table
-- Created: 2026-04-18
-- =========================================================

-- Add social auth columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS facebook_id VARCHAR(255) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Make password_hash nullable (social-only users don't have passwords)
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- Make email nullable (some social providers may not share email)
-- Note: Keep unique constraint — NULL values don't conflict in PostgreSQL
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;

-- Add indexes for social ID lookups
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_users_facebook_id ON users(facebook_id);

-- Add constraint: user must have at least one auth method
-- (password_hash OR google_id OR facebook_id must be non-null)
ALTER TABLE users ADD CONSTRAINT check_auth_method 
  CHECK (
    password_hash IS NOT NULL OR 
    google_id IS NOT NULL OR 
    facebook_id IS NOT NULL
  );

COMMENT ON COLUMN users.google_id IS 'Google OAuth user ID — set when user links Google account';
COMMENT ON COLUMN users.facebook_id IS 'Facebook OAuth user ID — set when user links Facebook account';
COMMENT ON COLUMN users.avatar_url IS 'Profile picture URL from social provider';
