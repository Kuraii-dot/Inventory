import fs from 'node:fs/promises';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config({ path: new URL('../.env', import.meta.url) });
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is missing from backend/.env.');

const migrationUrls = [
  new URL('../../supabase/migrations/202608250001_supabase_auth_edge_api.sql', import.meta.url),
  new URL('../../supabase/migrations/202608260001_inventory_performance_indexes.sql', import.meta.url),
];
const pool = new pg.Pool({
  connectionString,
  ssl: connectionString.includes('localhost') || connectionString.includes('127.0.0.1')
    ? false
    : { rejectUnauthorized: false },
  max: 1,
});

try {
  for (const migrationUrl of migrationUrls) {
    const sql = await fs.readFile(migrationUrl, 'utf8');
    await pool.query(sql);
    console.log(`Applied ${migrationUrl.pathname.split('/').pop()}.`);
  }
  console.log('Inventory cloud migrations applied successfully.');
} finally {
  await pool.end();
}
