-- =========================================================
-- Seed Data for 3D Ecommerce Platform (Development)
-- =========================================================

-- Insert Admin User
INSERT INTO users (email, password_hash, name, phone, is_admin, is_seller)
VALUES (
  'admin@3dprint.com',
  '$2b$10$dummyhashvalue123456789012345678901234567890', -- dummy hash (use bcrypt in production)
  'Admin User',
  '+1-555-0001',
  TRUE,
  TRUE
);

-- Insert Sample Categories
INSERT INTO categories (name, description)
VALUES
  ('Miniatures & Models', 'Small-scale models and miniatures for gaming and collecting'),
  ('Functional Parts', 'Useful items like organizers, holders, and replacement parts'),
  ('Decorative Items', 'Home decor and display pieces'),
  ('Toys & Games', 'Toys, game pieces, and gaming accessories'),
  ('Tools & Hardware', 'Workshop tools and hardware solutions'),
  ('Educational', 'Learning models and STEM projects');

-- Insert Sample Products
INSERT INTO products (seller_id, name, description, price, quantity_in_stock, category_id, image_urls)
SELECT 
  id,
  'Dragon Figurine',
  'Detailed 3D printed dragon figurine with intricate scales and wings',
  24.99,
  50,
  (SELECT id FROM categories WHERE name = 'Miniatures & Models'),
  '["https://example.com/dragon1.jpg", "https://example.com/dragon2.jpg"]'::jsonb
FROM users WHERE email = 'admin@3dprint.com'
UNION ALL
SELECT 
  id,
  'Cable Organizer',
  'Desktop cable organizer with multiple slots for different cable types',
  12.99,
  100,
  (SELECT id FROM categories WHERE name = 'Functional Parts'),
  '["https://example.com/cable-org.jpg"]'::jsonb
FROM users WHERE email = 'admin@3dprint.com'
UNION ALL
SELECT 
  id,
  'Plant Pot with Drainage',
  'Modern hexagonal plant pot with integrated drainage system',
  18.50,
  75,
  (SELECT id FROM categories WHERE name = 'Decorative Items'),
  '["https://example.com/pot1.jpg", "https://example.com/pot2.jpg"]'::jsonb
FROM users WHERE email = 'admin@3dprint.com'
UNION ALL
SELECT 
  id,
  'Chess Set - Modern Design',
  'Contemporary 3D printed chess set with sleek geometric pieces',
  49.99,
  30,
  (SELECT id FROM categories WHERE name = 'Toys & Games'),
  '["https://example.com/chess1.jpg", "https://example.com/chess2.jpg"]'::jsonb
FROM users WHERE email = 'admin@3dprint.com'
UNION ALL
SELECT 
  id,
  'Wrench Organizer Rack',
  'Wall-mounted tool organizer for wrenches and tools',
  15.99,
  60,
  (SELECT id FROM categories WHERE name = 'Tools & Hardware'),
  '["https://example.com/wrench-rack.jpg"]'::jsonb
FROM users WHERE email = 'admin@3dprint.com'
UNION ALL
SELECT 
  id,
  'Human Anatomy Model',
  'Detailed anatomical heart model for educational purposes',
  35.00,
  20,
  (SELECT id FROM categories WHERE name = 'Educational'),
  '["https://example.com/anatomy1.jpg", "https://example.com/anatomy2.jpg"]'::jsonb
FROM users WHERE email = 'admin@3dprint.com';

-- Insert Sample Reviews
INSERT INTO reviews (product_id, user_id, rating, text)
SELECT 
  p.id,
  u.id,
  5,
  'Excellent quality and detail! Arrived exactly as described.'
FROM products p
JOIN users u ON u.email = 'admin@3dprint.com'
WHERE p.name = 'Dragon Figurine'
LIMIT 1;

-- Insert Sample Inventory Logs
INSERT INTO inventory_logs (product_id, action, quantity_delta, reason)
SELECT 
  id,
  'add',
  50,
  'initial_stock'
FROM products WHERE name = 'Dragon Figurine';

-- =========================================================
-- NOTES FOR DEVELOPMENT
-- =========================================================
-- 1. Replace dummy password hashes with real bcrypt hashes in production
-- 2. Use real image URLs or upload images to S3/Cloudinary
-- 3. Add more sample products as needed for testing
-- 4. Add test user accounts for different scenarios (customer, admin, etc.)
