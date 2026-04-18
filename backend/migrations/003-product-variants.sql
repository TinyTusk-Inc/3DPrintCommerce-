-- =========================================================
-- Migration: 003-product-variants.sql
-- Description: Add product variants (colors) and multi-image support
-- Created: 2026-04-19
-- =========================================================

-- =========================================================
-- PRODUCT VARIANTS TABLE
-- One row per color option for a product.
-- Products with no colors simply have no rows here.
-- =========================================================

CREATE TABLE product_variants (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id    UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  color_name    VARCHAR(100) NOT NULL,          -- e.g. "Midnight Black"
  color_hex     VARCHAR(7),                     -- e.g. "#1a1a1a" (optional, for swatch)
  price_delta   DECIMAL(10, 2) NOT NULL DEFAULT 0, -- extra cost vs base price (can be negative)
  stock         INTEGER NOT NULL DEFAULT 0,     -- per-variant stock
  is_default    BOOLEAN NOT NULL DEFAULT FALSE, -- which color is pre-selected on page load
  sort_order    INTEGER NOT NULL DEFAULT 0,     -- display order
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_product_variants_product_id ON product_variants(product_id);
CREATE INDEX idx_product_variants_is_default ON product_variants(is_default);

-- Ensure only one default variant per product
CREATE UNIQUE INDEX idx_product_variants_one_default
  ON product_variants(product_id)
  WHERE is_default = TRUE;

-- =========================================================
-- PRODUCT IMAGES TABLE
-- One row per photo.
-- variant_id NULL  → shared image shown for all colors
-- variant_id SET   → shown only when that variant is selected
-- =========================================================

CREATE TABLE product_images (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id  UUID REFERENCES product_variants(id) ON DELETE CASCADE,  -- NULL = shared
  url         TEXT NOT NULL,
  alt_text    VARCHAR(255),
  sort_order  INTEGER NOT NULL DEFAULT 0,   -- lower = shown first; 0 = primary/hero image
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_product_images_product_id ON product_images(product_id);
CREATE INDEX idx_product_images_variant_id ON product_images(variant_id);
CREATE INDEX idx_product_images_sort_order ON product_images(sort_order);

-- =========================================================
-- TRIGGERS
-- =========================================================

CREATE TRIGGER update_product_variants_updated_at
  BEFORE UPDATE ON product_variants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =========================================================
-- NOTES
-- =========================================================
-- The existing products.image_urls JSONB column is kept for
-- backward compatibility but new code should use product_images.
-- Run a one-time data migration to move existing image_urls
-- into product_images rows if needed.
-- =========================================================
