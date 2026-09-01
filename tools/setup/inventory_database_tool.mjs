import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const backendPath = process.env.CCWD_INVENTORY_BACKEND;
const mode = process.argv[2] ?? 'test';

const respond = (payload) => console.log(JSON.stringify(payload));

try {
  if (!backendPath) {
    throw new Error('CCWD_INVENTORY_BACKEND is not configured.');
  }

  const dotenvPath = path.join(backendPath, 'node_modules', 'dotenv', 'lib', 'main.js');
  const pgPath = path.join(backendPath, 'node_modules', 'pg', 'lib', 'index.js');
  const dotenv = (await import(pathToFileURL(dotenvPath).href)).default;
  const pg = (await import(pathToFileURL(pgPath).href)).default;
  const environment = dotenv.config({ path: path.join(backendPath, '.env') });
  if (environment.error) throw environment.error;

  const pool = new pg.Pool({
    connectionString: environment.parsed?.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    if (mode === 'test') {
      const result = await pool.query(
        "select current_database() as database, to_regclass('public.inspection_requests') is not null as migration_installed",
      );
      respond({ ok: true, ...result.rows[0] });
    } else if (mode === 'migrate') {
      const migrationPath = process.env.CCWD_INVENTORY_MIGRATION;
      if (!migrationPath || !fs.existsSync(migrationPath)) {
        throw new Error('The Inventory migration file was not found.');
      }
      await pool.query(fs.readFileSync(migrationPath, 'utf8'));
      respond({ ok: true });
    } else if (mode === 'api-test') {
      const jwtPath = path.join(backendPath, 'node_modules', 'jsonwebtoken', 'index.js');
      const jwt = (await import(pathToFileURL(jwtPath).href)).default;
      const token = jwt.sign(
        { id: 0, username: 'local-health-check', role: 'master_admin' },
        environment.parsed?.JWT_SECRET,
        { expiresIn: '1m' },
      );
      const response = await fetch('http://127.0.0.1:5000/api/inspection-requests?limit=100', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await response.json().catch(() => ({}));
      respond({
        ok: response.ok,
        status: response.status,
        total: Number(body.total ?? 0),
        message: body.message ?? null,
      });
    } else if (mode === 'inspection-report-test') {
      const reportFormat = process.argv[3] === 'pdf' ? 'pdf' : 'excel';
      const jwtPath = path.join(backendPath, 'node_modules', 'jsonwebtoken', 'index.js');
      const jwt = (await import(pathToFileURL(jwtPath).href)).default;
      const token = jwt.sign(
        { id: 0, username: 'local-health-check', role: 'master_admin' },
        environment.parsed?.JWT_SECRET,
        { expiresIn: '1m' },
      );
      const response = await fetch('http://127.0.0.1:5000/api/reports/inspections', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ format: reportFormat, timeframe: 'year', status: 'all' }),
      });
      const bytes = new Uint8Array(await response.arrayBuffer());
      respond({
        ok: response.ok,
        status: response.status,
        contentType: response.headers.get('content-type'),
        bytes: bytes.length,
        message: response.ok ? null : new TextDecoder().decode(bytes).slice(0, 500),
      });
    } else if (mode === 'deactivated-items') {
      const result = await pool.query(
        'select id, name, quantity from items where is_active = false order by updated_at desc, id desc limit 20',
      );
      respond({ ok: true, total: result.rowCount, items: result.rows });
    } else if (mode === 'restore-route-test') {
      const jwtPath = path.join(backendPath, 'node_modules', 'jsonwebtoken', 'index.js');
      const jwt = (await import(pathToFileURL(jwtPath).href)).default;
      const token = jwt.sign(
        { id: 0, username: 'local-health-check', role: 'master_admin' },
        environment.parsed?.JWT_SECRET,
        { expiresIn: '1m' },
      );
      const response = await fetch('http://127.0.0.1:5000/api/items/0/restore', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await response.json().catch(() => ({}));
      respond({ ok: response.status === 404, status: response.status, message: body.message ?? null });
    } else if (mode === 'release-audit') {
      const result = await pool.query(`
        select
          (select count(*)::integer from inspection_requests where status = 'released') as released_requests,
          (select count(*)::integer from distributions where inspection_request_id is not null) as linked_distributions,
          (select count(*)::integer from items where quantity < 0) as negative_stock_rows,
          (select count(*)::integer
             from inspection_requests r
            where r.status = 'released'
              and not exists (select 1 from distributions d where d.inspection_request_id = r.id)
          ) as released_without_distribution
      `);
      respond({ ok: true, ...result.rows[0] });
    } else {
      throw new Error(`Unknown database tool mode: ${mode}`);
    }
  } catch (error) {
    respond({ ok: false, code: error.code ?? null, message: error.message });
  } finally {
    await pool.end();
  }
} catch (error) {
  respond({ ok: false, code: error.code ?? null, message: error.message });
}
