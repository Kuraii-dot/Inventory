// backend/db/pool.js
import pg from 'pg';

// Note: no dotenv.config() needed — Vercel injects env vars directly
// dotenv.config() is only needed locally, and it's called in server.js already

const { Pool } = pg;

const pool = new Pool({
  host:     process.env.DB_HOST,
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASS,
  port:     parseInt(process.env.DB_PORT || '5432'),
  ssl:      { rejectUnauthorized: false },
});

pool.on('connect', () => console.log('✅ Database connected'));
pool.on('error',   (err) => console.error('❌ Database error:', err));

export default pool;