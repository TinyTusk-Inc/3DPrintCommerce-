/**
 * Database Connection Test Script
 * Usage: node backend/scripts/test-connection.js
 * 
 * Tests the PostgreSQL connection and displays database info
 */

const { Pool } = require('pg');
require('dotenv').config();

async function testConnection() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'ecommerce_3d_db',
  });

  try {
    console.log('\n' + '='.repeat(50));
    console.log('Testing Database Connection');
    console.log('='.repeat(50));

    // Test basic connection
    const client = await pool.connect();
    console.log('✓ Connected to database');

    // Get database version
    const versionRes = await client.query('SELECT version()');
    console.log('✓ PostgreSQL version:', versionRes.rows[0].version.split(',')[0]);

    // Get current database
    const currentDb = await client.query('SELECT current_database()');
    console.log('✓ Current database:', currentDb.rows[0].current_database);

    // List all tables
    const tablesRes = await client.query(`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename
    `);
    
    console.log('\n📋 Tables:');
    if (tablesRes.rows.length > 0) {
      tablesRes.rows.forEach(row => {
        console.log('  -', row.tablename);
      });
    } else {
      console.log('  (no tables found)');
    }

    // Count records in each table
    console.log('\n📊 Record counts:');
    for (const { tablename } of tablesRes.rows) {
      const countRes = await client.query(`SELECT COUNT(*) as count FROM ${tablename}`);
      console.log(`  ${tablename}: ${countRes.rows[0].count}`);
    }

    client.release();

    console.log('\n' + '='.repeat(50));
    console.log('✓ All tests passed!');
    console.log('='.repeat(50) + '\n');

  } catch (error) {
    console.error('\n✗ Connection failed:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Check PostgreSQL is running');
    console.error('2. Verify .env file has correct DB_* variables');
    console.error('3. Run: npm run setup-db');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  testConnection();
}

module.exports = { testConnection };
