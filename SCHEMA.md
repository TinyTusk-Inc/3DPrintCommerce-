# Database Schema Overview

## Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         CORE ENTITIES                            │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐
│    USERS     │ (Customers, Sellers, Admin)
├──────────────┤
│ id (PK)      │
│ email        │ ◄─────── UNIQUE constraint
│ password     │
│ name         │
│ phone        │
│ address      │ (JSONB)
│ is_seller    │
│ is_admin     │
│ created_at   │
│ updated_at   │
└──────────────┘
       ▲
       │ sells
       │
       └──────────┬─────────────┬────────────────┐
                  │             │                │
                  ▼             ▼                ▼
            ┌──────────┐   ┌──────────┐   ┌──────────────┐
            │ PRODUCTS │   │  ORDERS  │   │CUSTOM_ORDERS │
            ├──────────┤   ├──────────┤   ├──────────────┤
            │ id (PK)  │   │ id (PK)  │   │ id (PK)      │
            │ seller_id│─┐ │ user_id  │───│ user_id      │
            │ name     │ │ │ seller_id│─┐ │ seller_id    │
            │ price    │ │ │ status   │ │ │ status       │
            │ quantity │ │ │ total    │ │ │ title        │
            │ category─┼─┤ │ razorpay │ │ │ description  │
            │ image    │ │ │ created  │ │ │ price_est    │
            │ created  │ │ │ updated  │ │ │ price_final  │
            └──────────┘ │ └──────────┘ │ │ order_id─────┼───┐
                         │      ▲       │ │ created      │   │
            ┌────────────┘      │       │ │ updated      │   │
            │                   │       │ └──────────────┘   │
            │          ┌────────┘       │        requires    │
            │          │                │                    │
            ▼          ▼                ▼                    │
      ┌──────────────────┐      ┌─────────────────┐         │
      │   ORDER_ITEMS    │      │ CUSTOM_ORDER_   │         │
      ├──────────────────┤      │ FILES (Phase 5) │         │
      │ id (PK)          │      ├─────────────────┤         │
      │ order_id (FK)────┼──────│ id (PK)         │         │
      │ product_id (FK)  │      │ custom_order_id │◄────────┘
      │ quantity         │      │ file_name       │
      │ price_snapshot   │      │ file_type       │
      │ created_at       │      │ file_size       │
      └──────────────────┘      │ file_url        │
                                │ virus_scan      │
            ┌───────────────────│ scan_result     │
            │                   │ created_at      │
            │                   └─────────────────┘
            │
            ▼
      ┌──────────────────┐
      │    REVIEWS       │ (Comments on Products)
      ├──────────────────┤
      │ id (PK)          │
      │ product_id (FK)  │
      │ user_id (FK)     │
      │ rating (1-5)     │
      │ text             │
      │ created_at       │
      │ updated_at       │
      └──────────────────┘

            ┌─────────────────────────────────────────┐
            │      SUPPORTING ENTITIES                │
            └─────────────────────────────────────────┘

      ┌──────────────────┐
      │  CATEGORIES      │ (Product Categories)
      ├──────────────────┤
      │ id (PK)          │
      │ name (UNIQUE)    │
      │ description      │
      │ created_at       │
      │ updated_at       │
      └──────────────────┘
            ▲
            │ categorizes
            │
      ┌──────────┐
      │ PRODUCTS │
      └──────────┘

      ┌──────────────────────┐
      │  INVENTORY_LOGS      │ (Stock Tracking)
      ├──────────────────────┤
      │ id (PK)              │
      │ product_id (FK)      │
      │ action (add/remove)  │
      │ quantity_delta       │
      │ reason               │
      │ created_at           │
      └──────────────────────┘

      ┌──────────────────────┐
      │   EMAIL_QUEUE        │ (Async Email Processing)
      ├──────────────────────┤
      │ id (PK)              │
      │ recipient_email      │
      │ subject              │
      │ body                 │
      │ email_type           │
      │ related_entity_id    │
      │ status (pending...)  │
      │ attempts             │
      │ created_at/sent_at   │
      └──────────────────────┘
```

## Table Relationships

### Foreign Keys

| From Table | Column | References | Notes |
|-----------|--------|-----------|-------|
| products | seller_id | users.id | ON DELETE CASCADE |
| products | category_id | categories.id | ON DELETE SET NULL |
| orders | user_id | users.id | Buyer |
| orders | seller_id | users.id | Seller/Admin |
| order_items | order_id | orders.id | ON DELETE CASCADE |
| order_items | product_id | products.id | ON DELETE RESTRICT |
| reviews | product_id | products.id | ON DELETE CASCADE |
| reviews | user_id | users.id | ON DELETE CASCADE |
| inventory_logs | product_id | products.id | ON DELETE CASCADE |
| custom_orders | user_id | users.id | Submitter |
| custom_orders | seller_id | users.id | Admin |
| custom_orders | order_id | orders.id | Linked order (Phase 5) |
| custom_order_files | custom_order_id | custom_orders.id | ON DELETE CASCADE |

### Unique Constraints

| Table | Column | Purpose |
|-------|--------|---------|
| users | email | One account per email |
| orders | razorpay_order_id | Payment tracking |
| orders | razorpay_payment_id | Payment verification |
| categories | name | Unique categories |

### Indexes

Optimized for common queries:

| Table | Column(s) | Purpose |
|-------|-----------|---------|
| users | email | Login queries |
| users | is_seller, is_admin | User filtering |
| products | seller_id, category_id, name | Product browsing/search |
| orders | user_id, seller_id, status | Order filtering |
| orders | razorpay_order_id | Payment webhook matching |
| orders | created_at | Date range queries |
| reviews | product_id, user_id | Review lookup |
| inventory_logs | product_id, created_at | Stock history |
| custom_orders | user_id, seller_id, status | Custom order management |
| email_queue | status, recipient_email | Email processing |

## Data Types

### Special Types

- **UUID**: Used for all primary keys (uuid_generate_v4())
- **JSONB**: Used for flexible data (address, image_urls)
- **ENUM**: Used for status fields:
  - `order_status`: pending, paid, shipped, delivered, cancelled
  - `inventory_action`: add, remove, sold
  - `custom_order_status`: submitted, reviewing, quoted, approved, in_progress, completed, rejected

### Constraints

- **NOT NULL**: All required fields
- **CHECK**: Rating must be 1-5
- **UNIQUE**: Email, category names, order IDs
- **DEFAULT**: Timestamps, booleans

## Triggers

### Automatic Updated At

All tables with `updated_at` column have a trigger that automatically updates the timestamp on any UPDATE operation.

Function: `update_updated_at_column()`

## Query Patterns

### User Lookups
```sql
-- Find user by email
SELECT * FROM users WHERE email = 'user@example.com';

-- Find all sellers
SELECT * FROM users WHERE is_seller = TRUE;
```

### Product Queries
```sql
-- Get products by category
SELECT * FROM products 
WHERE category_id = $1 
ORDER BY created_at DESC;

-- Search products by name
SELECT * FROM products 
WHERE name ILIKE '%search%' 
ORDER BY name;

-- Get inventory status
SELECT p.id, p.name, p.quantity_in_stock 
FROM products p 
WHERE p.quantity_in_stock < 10;
```

### Orders
```sql
-- Get user's orders
SELECT * FROM orders 
WHERE user_id = $1 
ORDER BY created_at DESC;

-- Get pending payments
SELECT * FROM orders 
WHERE status = 'pending' 
AND created_at > NOW() - INTERVAL '24 hours';

-- Find order by Razorpay ID
SELECT * FROM orders 
WHERE razorpay_order_id = $1;
```

### Reviews
```sql
-- Get product reviews with ratings
SELECT 
  r.id, r.text, r.rating, u.name, r.created_at
FROM reviews r
JOIN users u ON r.user_id = u.id
WHERE r.product_id = $1
ORDER BY r.created_at DESC;

-- Calculate average rating
SELECT 
  product_id,
  AVG(rating)::DECIMAL(3,2) as avg_rating,
  COUNT(*) as review_count
FROM reviews
GROUP BY product_id;
```

## Migration Strategy

New migrations should follow the naming convention:
```
NNN-description.sql
```

Example: `002-add-notifications-table.sql`, `003-add-seller-ratings.sql`

Each migration should be **idempotent** (safe to run multiple times) by using:
- `CREATE TABLE IF NOT EXISTS`
- `CREATE INDEX IF NOT EXISTS`
- `DROP TABLE IF EXISTS` (before CREATE)

## Notes

1. **Soft Deletes**: Not implemented initially. Consider adding `deleted_at` column if needed.
2. **Partitioning**: For high-volume applications, consider partitioning large tables like `orders` and `email_queue` by date.
3. **Archiving**: Implement an archival strategy for old orders and email queue records.
4. **Backup**: Regular database backups are essential for production.
