# Database Setup Guide

## Overview

This guide covers setting up the PostgreSQL database for the 3D Ecommerce Platform using Docker.

**Recommended Approach: Docker** (ensures identical environment across Windows/Mac/Linux and production)

## Prerequisites

### Option A: Docker (Recommended)
- Docker Desktop installed ([download](https://www.docker.com/products/docker-desktop))
- Docker Compose (included with Docker Desktop)
- Node.js 14+ installed

### Option B: Local PostgreSQL (Windows only)
- PostgreSQL 12+ installed and running locally
- Node.js 14+ installed
- Environment variables configured (.env file)

---

## Setup Method A: Docker (Recommended) ✅

### Why Docker?
- ✅ Identical environment on Windows, Mac, and Linux
- ✅ Same as production deployment environment
- ✅ No local PostgreSQL installation needed
- ✅ Easy cleanup (delete container, not cluttering system)
- ✅ Multiple versions of PostgreSQL without conflicts

### Step 1: Start PostgreSQL Container

```bash
# From project root
docker-compose up -d
```

This starts PostgreSQL in the background and exposes it on `localhost:5432`.

### Step 2: Configure Environment

```bash
# Copy Docker environment template
copy .env.docker backend\.env
```

Typically no changes needed (defaults are fine for development).

### Step 3: Initialize Database

```bash
cd backend
npm install
npm run setup-db:seed
```

### Step 4: Verify Setup

```bash
npm run test-connection
```

**Done!** PostgreSQL is running and migrations are applied.

### Stopping PostgreSQL

```bash
# Stop containers
docker-compose down

# Stop and remove data (clean slate)
docker-compose down -v
```

### More Docker Commands

See [DOCKER_SETUP.md](DOCKER_SETUP.md) for detailed Docker instructions, troubleshooting, and advanced usage.

---

## Setup Method B: Local PostgreSQL (Windows)

```bash
# Copy the example file
cp backend/.env.example backend/.env
```

Update `backend/.env` with your PostgreSQL credentials:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ecommerce_3d_db
DB_USER=postgres
DB_PASSWORD=your_password_here
```

## Step 2: Install Backend Dependencies

```bash
cd backend
npm install
```

## Step 3: Run Database Setup

The setup script creates the database, applies migrations, and optionally seeds sample data.

### Without Sample Data
```bash
npm run setup-db
```

### With Sample Data (Recommended for Development)
```bash
npm run setup-db -- --seed
```

## What the Setup Script Does

1. **Creates Database**: Creates the `ecommerce_3d_db` database if it doesn't exist
2. **Applies Migrations**: Runs all SQL migrations from `migrations/` folder
   - Creates all tables with proper constraints
   - Sets up UUID and ENUM types
   - Creates indexes for performance
   - Sets up automatic `updated_at` triggers
3. **Seeds Data** (optional): Populates initial data
   - Creates admin user
   - Adds product categories
   - Adds sample products
   - Adds sample reviews and inventory logs

## Database Schema

### Core Tables

#### users
- `id` (UUID, PK)
- `email` (unique)
- `password_hash`
- `name`
- `phone`
- `address` (JSONB)
- `is_seller`, `is_admin` (boolean)
- `created_at`, `updated_at`

#### products
- `id` (UUID, PK)
- `seller_id` (FK to users)
- `name`, `description`
- `price`, `quantity_in_stock`
- `category_id` (FK to categories)
- `image_urls` (JSONB array)

#### categories
- `id` (UUID, PK)
- `name`, `description`

#### orders
- `id` (UUID, PK)
- `user_id`, `seller_id` (FK)
- `status` (enum: pending, paid, shipped, delivered, cancelled)
- `total_price`
- `razorpay_order_id`, `razorpay_payment_id`
- `shipping_address` (JSONB)

#### order_items
- `id` (UUID, PK)
- `order_id`, `product_id` (FK)
- `quantity`, `price_at_purchase`

#### reviews
- `id` (UUID, PK)
- `product_id`, `user_id` (FK)
- `rating` (1-5), `text`

#### inventory_logs
- `id` (UUID, PK)
- `product_id` (FK)
- `action` (enum: add, remove, sold)
- `quantity_delta`, `reason`

#### custom_orders (Phase 5)
- `id` (UUID, PK)
- `user_id`, `seller_id` (FK)
- `status` (enum: submitted, reviewing, quoted, approved, in_progress, completed, rejected)
- `title`, `description`
- `estimated_price`, `final_price`
- `order_id` (FK to orders)

#### custom_order_files (Phase 5)
- `id` (UUID, PK)
- `custom_order_id` (FK)
- `file_name`, `file_type`, `file_size`
- `file_url`
- `virus_scan_status`, `virus_scan_result`

#### email_queue
- `id` (UUID, PK)
- `recipient_email`, `subject`, `body`
- `status` (pending, sent, failed)
- `attempts`, `max_attempts`

## Verify Setup

After running the setup script, verify your database:

### Using psql
```bash
# Connect to your database
psql -h localhost -U postgres -d ecommerce_3d_db

# List all tables
\dt

# Check sample data
SELECT * FROM users;
SELECT * FROM products;
SELECT * FROM categories;
```

### Using Node.js
```bash
# In backend directory
node -e "
  const db = require('./src/config/database');
  db.query('SELECT COUNT(*) as users FROM users')
    .then(res => console.log(res.rows[0]))
    .catch(err => console.error(err));
"
```

## Common Issues

### Connection Refused
**Error**: `connect ECONNREFUSED 127.0.0.1:5432`
- Ensure PostgreSQL is running
- Check DB_HOST and DB_PORT in .env
- Verify PostgreSQL service: `pg_isready -h localhost -p 5432`

### Database Already Exists
**Error**: `operator does not exist: uuid = character varying`
- Drop and recreate: `dropdb ecommerce_3d_db && npm run setup-db`

### Permission Denied
- Ensure DB_USER has createdb privileges
- For local development, use the default postgres user

### UUID Extension Not Available
- Run in psql: `CREATE EXTENSION "uuid-ossp";`
- Should be handled automatically by migration script

## Reset Database

To completely reset and recreate the database:

```bash
# Drop the database (careful in production!)
dropdb ecommerce_3d_db

# Run setup again
npm run setup-db -- --seed
```

## Adding New Migrations

1. Create a new SQL file in `backend/migrations/` with naming convention:
   ```
   002-add-new-feature.sql
   ```

2. Run setup script again to apply:
   ```bash
   npm run setup-db
   ```

## Environment Variables Reference

| Variable | Default | Description |
|----------|---------|-------------|
| DB_HOST | localhost | PostgreSQL host |
| DB_PORT | 5432 | PostgreSQL port |
| DB_NAME | ecommerce_3d_db | Database name |
| DB_USER | postgres | Database user |
| DB_PASSWORD | - | Database password |

## Next Steps

After database setup:

1. Install dependencies: `npm install`
2. Start backend server: `npm run dev`
3. Create User model to interact with users table
4. Create Product model to query products
5. Build authentication routes

## References

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [UUID Extension Docs](https://www.postgresql.org/docs/current/uuid-ossp.html)
- [pg (Node.js) Driver](https://node-postgres.com/)
