import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import pg from 'pg';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: new URL('../.env', import.meta.url) });

const required = (name) => {
  const value = String(process.env[name] || '').trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
};

const authEmail = (username) => {
  const slug = username.trim().toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^[-.]+|[-.]+$/g, '');
  return `${slug || 'inventory-user'}@inventory.ccwd.invalid`;
};

const databaseUrl = required('DATABASE_URL');
const supabaseUrl = required('INVENTORY_SUPABASE_URL');
const secretKey = required('INVENTORY_SUPABASE_SECRET_KEY');
const masterUsername = required('INVENTORY_MASTER_USERNAME');
const masterPassword = required('INVENTORY_MASTER_PASSWORD');
const integrationPassword = required('INVENTORY_INTEGRATION_PASSWORD');

const pool = new pg.Pool({
  connectionString: databaseUrl,
  ssl: databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1')
    ? false
    : { rejectUnauthorized: false },
  max: 1,
});
const supabaseAdmin = createClient(supabaseUrl, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function createOrUpdateAuthUser(row, password) {
  const email = authEmail(row.username);
  let authUserId = row.auth_user_id;
  if (authUserId) {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(authUserId, {
      email,
      password,
      email_confirm: true,
      user_metadata: { inventory_username: row.username },
    });
    if (error) throw error;
  } else {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { inventory_username: row.username },
    });
    if (error) throw error;
    authUserId = data.user.id;
  }
  await pool.query(
    'UPDATE users SET auth_user_id = $1, auth_email = $2, password = $3 WHERE id = $4',
    [authUserId, email, await bcrypt.hash(password, 10), row.id]
  );
  return { id: row.id, username: row.username, email };
}

try {
  const masterResult = await pool.query(
    'SELECT id, username, password, role, auth_user_id FROM users WHERE lower(username) = lower($1) LIMIT 1',
    [masterUsername]
  );
  const master = masterResult.rows[0];
  if (!master) throw new Error(`Inventory user "${masterUsername}" was not found.`);
  if (master.role !== 'master_admin') throw new Error(`Inventory user "${masterUsername}" is not a master_admin.`);
  if (!(await bcrypt.compare(masterPassword, master.password))) {
    throw new Error('The existing master administrator password is incorrect. No account was changed.');
  }
  const linkedMaster = await createOrUpdateAuthUser(master, masterPassword);

  const integrationUsername = 'tcms-integration';
  let integration = (await pool.query(
    'SELECT id, username, auth_user_id FROM users WHERE username = $1 LIMIT 1',
    [integrationUsername]
  )).rows[0];
  if (!integration) {
    integration = (await pool.query(
      `INSERT INTO users (username, password, role)
       VALUES ($1,$2,'integration') RETURNING id, username, auth_user_id`,
      [integrationUsername, await bcrypt.hash(integrationPassword, 10)]
    )).rows[0];
  } else {
    await pool.query('UPDATE users SET role = $1 WHERE id = $2', ['integration', integration.id]);
  }
  const linkedIntegration = await createOrUpdateAuthUser(integration, integrationPassword);

  console.log(`Master account linked: ${linkedMaster.username}`);
  console.log(`TCMS integration account linked: ${linkedIntegration.email}`);
  console.log('Cloud authentication bootstrap completed successfully.');
} finally {
  await pool.end();
}

