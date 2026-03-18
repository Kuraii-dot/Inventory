// backend/db/pool.js
// Converted from: includes/db.php
// PHP used PDO with pgsql driver — Node.js equivalent is the `pg` Pool

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  host:     process.env.DB_HOST,
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASS,
  port:     Number(process.env.DB_PORT) || 5432,
});

// Test connection on startup (mirrors the try/catch in db.php)
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
  }
  console.log('✅ Database connected successfully!');
  release();
});

export default pool;