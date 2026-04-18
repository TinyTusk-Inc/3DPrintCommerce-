-- =============================================================
-- Seed: 001-initial-seed.sql
-- Development seed data for 3D Print Commerce Platform.
-- Run after 001-schema.sql:
--   psql -d ecommerce_3d_db -f backend/seeds/001-initial-seed.sql
--
-- Admin password hash below = bcrypt("Admin@123456", rounds=10)
-- Change via: node scripts/create-admin.js
-- =============================================================

-- =============================================================
-- ADMIN USER
-- is_admin = TRUE, is_seller = TRUE
-- Login: admin@3dprint.com / Admin@123456
-- =============================================================

INSERT INTO users (email, password_hash, name, phone, is_admin, is_seller)
VALUES (
  'admin@3dprint.com',
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- "password" (bcrypt)
  'Store Owner',
  '+91-9999999999',
  TRUE,
  TRUE
)
ON CONFLICT (email) DO NOTHING;

-- =============================================================
-- CATEGORIES
-- =============================================================

INSERT INTO categories (name, description) VALUES
  ('Miniatures & Models',  'Small-scale models and miniatures for gaming and collecting'),
  ('Functional Parts',     'Useful items like organizers, holders, and replacement parts'),
  ('Decorative Items',     'Home decor and display pieces'),
  ('Toys & Games',         'Toys, game pieces, and gaming accessories'),
  ('Tools & Hardware',     'Workshop tools and hardware solutions'),
  ('Educational',          'Learning models and STEM projects')
ON CONFLICT (name) DO NOTHING;

-- =============================================================
-- PRODUCTS
-- =============================================================

INSERT INTO products (seller_id, name, description, price, quantity_in_stock, category_id)
SELECT
  u.id,
  'Dragon Figurine',
  'Detailed 3D printed dragon figurine with intricate scales and wings. Available in multiple colors.',
  24.99,
  50,
  c.id
FROM users u, categories c
WHERE u.email = 'admin@3dprint.com' AND c.name = 'Miniatures & Models'
ON CONFLICT DO NOTHING;

INSERT INTO products (seller_id, name, description, price, quantity_in_stock, category_id)
SELECT
  u.id,
  'Cable Organizer',
  'Desktop cable organizer with multiple slots for different cable types.',
  12.99,
  100,
  c.id
FROM users u, categories c
WHERE u.email = 'admin@3dprint.com' AND c.name = 'Functional Parts'
ON CONFLICT DO NOTHING;

INSERT INTO products (seller_id, name, description, price, quantity_in_stock, category_id)
SELECT
  u.id,
  'Hexagonal Plant Pot',
  'Modern hexagonal plant pot with integrated drainage system.',
  18.50,
  75,
  c.id
FROM users u, categories c
WHERE u.email = 'admin@3dprint.com' AND c.name = 'Decorative Items'
ON CONFLICT DO NOTHING;

INSERT INTO products (seller_id, name, description, price, quantity_in_stock, category_id)
SELECT
  u.id,
  'Chess Set — Modern Design',
  'Contemporary 3D printed chess set with sleek geometric pieces.',
  49.99,
  30,
  c.id
FROM users u, categories c
WHERE u.email = 'admin@3dprint.com' AND c.name = 'Toys & Games'
ON CONFLICT DO NOTHING;

INSERT INTO products (seller_id, name, description, price, quantity_in_stock, category_id)
SELECT
  u.id,
  'Wrench Organizer Rack',
  'Wall-mounted tool organizer for wrenches and tools.',
  15.99,
  60,
  c.id
FROM users u, categories c
WHERE u.email = 'admin@3dprint.com' AND c.name = 'Tools & Hardware'
ON CONFLICT DO NOTHING;

INSERT INTO products (seller_id, name, description, price, quantity_in_stock, category_id)
SELECT
  u.id,
  'Anatomical Heart Model',
  'Detailed anatomical heart model for educational purposes.',
  35.00,
  20,
  c.id
FROM users u, categories c
WHERE u.email = 'admin@3dprint.com' AND c.name = 'Educational'
ON CONFLICT DO NOTHING;

-- =============================================================
-- PRODUCT VARIANTS (Dragon Figurine — 3 colors)
-- =============================================================

INSERT INTO product_variants (product_id, color_name, color_hex, price_delta, stock, is_default, sort_order)
SELECT p.id, 'Obsidian Black', '#1a1a1a', 0.00,    20, TRUE,  0 FROM products p WHERE p.name = 'Dragon Figurine'
UNION ALL
SELECT p.id, 'Dragon Red',     '#c0392b', 2.00,    15, FALSE, 1 FROM products p WHERE p.name = 'Dragon Figurine'
UNION ALL
SELECT p.id, 'Ice White',      '#ecf0f1', 0.00,    15, FALSE, 2 FROM products p WHERE p.name = 'Dragon Figurine';

-- =============================================================
-- INVENTORY LOGS (initial stock entries)
-- =============================================================

INSERT INTO inventory_logs (product_id, action, quantity_delta, reason)
SELECT id, 'add', quantity_in_stock, 'initial_stock'
FROM products;

-- =============================================================
-- NOTES
-- =============================================================
-- 1. Admin password above is a well-known bcrypt hash of "password".
--    Change it immediately via: node scripts/create-admin.js
-- 2. Add real product images via the admin UI (/admin/products)
--    after the app is running.
-- 3. Add a test customer account manually or via POST /api/auth/register
-- =============================================================
