// backend/db/pool.js
import pg from 'pg';

const { Pool } = pg;

const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
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