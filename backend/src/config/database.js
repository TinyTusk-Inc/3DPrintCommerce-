// Database configuration
// Handles PostgreSQL connection pool and basic queries

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'ecommerce_3d_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test the connection
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

pool.on('connect', () => {
  console.log('✓ Database connected successfully');
});

/**
 * Query helper function
 * @param {string} text SQL query text
 * @param {array} params Query parameters
 * @returns {Promise} Query result
 */
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('✓ Executed query', { rows: res.rowCount, duration });
    return res;
  } catch (error) {
    console.error('✗ Database query error', error);
    throw error;
  }
};

/**
 * Get a client from the pool for transactions
 * @returns {Promise} Client instance
 */
const getClient = async () => {
  const client = await pool.connect();
  return client;
};

module.exports = {
  pool,
  query,
  getClient,
};
