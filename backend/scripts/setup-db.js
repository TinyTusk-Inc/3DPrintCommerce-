#!/usr/bin/env node

/**
 * Database Setup Script
 * Usage: node backend/scripts/setup-db.js
 * 
 * This script:
 * 1. Creates the database if it doesn't exist
 * 2. Applies all migrations from migrations/ folder
 * 3. (Optional) Seeds initial data from seeds/ folder
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const MIGRATIONS_DIR = path.join(__dirname, '../migrations');
const SEEDS_DIR = path.join(__dirname, '../seeds');

// Connection config (without database name for initial setup)
const adminPool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  database: 'postgres', // Connect to default postgres DB initially
});

// Connection config (with database name for migrations)
const appPool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'ecommerce_3d_db',
});

/**
 * 1. Create database if it doesn't exist
 */
async function createDatabase() {
  const dbName = process.env.DB_NAME || 'ecommerce_3d_db';
  console.log(`\n📦 Creating database: ${dbName}...`);
  
  try {
    const result = await adminPool.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [dbName]
    );
    
    if (result.rows.length > 0) {
      console.log(`✓ Database "${dbName}" already exists`);
    } else {
      await adminPool.query(`CREATE DATABASE ${dbName}`);
      console.log(`✓ Database "${dbName}" created`);
    }
  } catch (error) {
    console.error(`✗ Failed to create database:`, error.message);
    throw error;
  }
}

/**
 * 2. Apply migrations
 */
async function runMigrations() {
  console.log(`\n🔧 Running migrations...`);
  
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.log('ℹ No migration files found');
    return;
  }

  for (const file of files) {
    console.log(`\n  → Applying: ${file}`);
    try {
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf-8');
      await appPool.query(sql);
      console.log(`  ✓ ${file} applied successfully`);
    } catch (error) {
      console.error(`  ✗ Failed to apply ${file}:`, error.message);
      throw error;
    }
  }
}

/**
 * 3. Seed initial data (optional)
 */
async function seedDatabase(shouldSeed = true) {
  if (!shouldSeed) {
    console.log(`\n⏭ Skipping seed data (use --seed flag to enable)`);
    return;
  }

  console.log(`\n🌱 Seeding initial data...`);
  
  const files = fs.readdirSync(SEEDS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.log('ℹ No seed files found');
    return;
  }

  for (const file of files) {
    console.log(`\n  → Seeding: ${file}`);
    try {
      const sql = fs.readFileSync(path.join(SEEDS_DIR, file), 'utf-8');
      await appPool.query(sql);
      console.log(`  ✓ ${file} seeded successfully`);
    } catch (error) {
      console.error(`  ✗ Failed to seed ${file}:`, error.message);
      // Don't throw, continue with other seed files
    }
  }
}

/**
 * Main function
 */
async function main() {
  const shouldSeed = process.argv.includes('--seed');
  
  try {
    console.log('\n' + '='.repeat(50));
    console.log('Database Setup - 3D Ecommerce Platform');
    console.log('='.repeat(50));

    await createDatabase();
    
    // Close admin pool, use app pool for migrations
    await adminPool.end();
    
    await runMigrations();
    await seedDatabase(shouldSeed);

    console.log('\n' + '='.repeat(50));
    console.log('✓ Setup complete!');
    console.log('='.repeat(50));
    console.log('\nNext steps:');
    console.log('1. Update your .env file with correct database credentials');
    console.log('2. Start the backend server: npm run dev');
    console.log('3. Test the health endpoint: GET /health');
    console.log('\n');

  } catch (error) {
    console.error('\n✗ Setup failed:', error.message);
    process.exit(1);
  } finally {
    await appPool.end();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { createDatabase, runMigrations, seedDatabase };
