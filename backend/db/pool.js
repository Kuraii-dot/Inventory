import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

// Supabase Edge Functions provide SUPABASE_DB_URL automatically. The local
// Express fallback continues to use DATABASE_URL, so both deployments share
// the same controller and transaction code.
const connectionString = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
const isLocal = connectionString?.includes('localhost') || connectionString?.includes('127.0.0.1');
const isEdgeRuntime = typeof globalThis.Deno !== 'undefined';

if (!connectionString) {
  throw new Error('DATABASE_URL or SUPABASE_DB_URL must be configured.');
}

const pool = new Pool({
  connectionString,
  ssl: isLocal ? false : { rejectUnauthorized: false },
  max: isEdgeRuntime ? 3 : 10,
  idleTimeoutMillis: isEdgeRuntime ? 10_000 : 30_000,
  connectionTimeoutMillis: 15_000,
});

// Avoid an extra connection during every serverless cold start.
if (!isEdgeRuntime && process.env.NODE_ENV !== 'test') {
  pool.connect((err, client, release) => {
    if (err) {
      console.error('❌ Database connection failed:', err.message);
      return;
    }
    console.log('✅ Database connected successfully!');
    release();
  });
}

export default pool;
