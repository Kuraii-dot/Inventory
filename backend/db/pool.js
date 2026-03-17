// backend/db/pool.js
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

// Supports both individual vars (local) and DATABASE_URL (Supabase/production)
const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }, // required for Supabase
      }
    : {
        host:     process.env.DB_HOST,
        database: process.env.DB_NAME,
        user:     process.env.DB_USER,
        password: process.env.DB_PASS,
        port:     parseInt(process.env.DB_PORT || '5432'),
      }
);

pool.on('connect', () => console.log('✅ Database connected'));
pool.on('error',   (err) => console.error('❌ Database error:', err));

export default pool;