// backend/db/pool.js
import pg from 'pg';

const { Pool } = pg;

// Use DATABASE_URL if available, otherwise fall back to individual vars
const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    })
  : new Pool({
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