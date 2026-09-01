// backend/middleware/activityLogger.js
// Captures successful mutations with before/after snapshots for the audit log.

import pool from '../db/pool.js';

const SNAPSHOT_TABLES = Object.freeze({
  items: 'items',
  allocations: 'allocations',
  distributions: 'distributions',
  suppliers: 'suppliers',
  categories: 'categories',
  classifications: 'classifications',
  combinations: 'combinations',
  inspection_requests: 'inspection_requests',
  users: 'users',
});

const PRIVATE_KEYS = new Set([
  'password', 'password_hash', 'token', 'access_token', 'refresh_token',
  'authorization', 'apikey', 'api_key', 'jwt_secret', 'integration_key',
]);
const NOISY_FIELDS = new Set(['created_at', 'updated_at']);

function sanitize(value) {
  if (Array.isArray(value)) return value.map(sanitize);
  if (value instanceof Date) return value.toISOString();
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !PRIVATE_KEYS.has(key.toLowerCase()))
      .map(([key, nested]) => [key, sanitize(nested)])
  );
}

function comparable(value) {
  if (value instanceof Date) return value.toISOString();
  if (value && typeof value === 'object') return JSON.stringify(value);
  return value ?? null;
}

function displayValue(value) {
  if (value === null || value === undefined || value === '') return 'none';
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  const rendered = typeof value === 'object' ? JSON.stringify(value) : String(value);
  return rendered.length > 80 ? `${rendered.slice(0, 77)}...` : rendered;
}

function changeSummary(oldData, newData) {
  if (!oldData || !newData || typeof oldData !== 'object' || typeof newData !== 'object') return '';
  const changes = [];
  const keys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);
  for (const key of keys) {
    if (NOISY_FIELDS.has(key) || comparable(oldData[key]) === comparable(newData[key])) continue;
    changes.push(`${key.replaceAll('_', ' ')}: ${displayValue(oldData[key])} -> ${displayValue(newData[key])}`);
  }
  if (!changes.length) return '';
  const visible = changes.slice(0, 5).join('; ');
  return changes.length > 5 ? `${visible}; +${changes.length - 5} more` : visible;
}

function recordIdFrom(req, data) {
  const candidate = req.params?.id ?? data?.id ?? data?.data?.id ?? null;
  if (candidate === null || candidate === undefined || candidate === '') return null;
  const numeric = Number(candidate);
  return Number.isSafeInteger(numeric) && numeric > 0 ? numeric : null;
}

async function loadSnapshot(module, recordId) {
  const table = SNAPSHOT_TABLES[module];
  if (!table || !recordId) return null;
  const result = await pool.query(`SELECT * FROM ${table} WHERE id = $1`, [recordId]);
  const row = result.rows[0];
  if (!row) return null;

  if (module === 'combinations') {
    const items = await pool.query(
      `SELECT ci.item_id, i.name AS item_name, ci.quantity_required
       FROM combination_items ci
       LEFT JOIN items i ON i.id = ci.item_id
       WHERE ci.combination_id = $1
       ORDER BY ci.id`,
      [recordId]
    );
    row.items = items.rows;
  }
  return sanitize(row);
}

export function logActivity({ action, module, getDescription, getRecordId, getOldData, getNewData }) {
  return async (req, res, next) => {
    const initialRecordId = getRecordId ? getRecordId(req, null) : recordIdFrom(req, null);
    let capturedOldData = null;
    if (action === 'UPDATE' || action === 'DELETE' || action === 'RETURN' || getOldData) {
      try {
        capturedOldData = sanitize(
          getOldData ? await getOldData(req) : await loadSnapshot(module, initialRecordId)
        );
      } catch (error) {
        console.error('Activity pre-change snapshot error:', error.message);
      }
    }

    const originalJson = res.json.bind(res);
    res.json = async (data) => {
      const successful = res.statusCode >= 200 && res.statusCode < 300
        && data?.status !== 'error' && data?.success !== false;
      if (successful) {
        try {
          const user = req.user;
          const recordId = getRecordId ? getRecordId(req, data) : recordIdFrom(req, data);
          let newData = getNewData
            ? await getNewData(req, data)
            : await loadSnapshot(module, recordId);

          if (!newData && action !== 'DELETE') {
            newData = Object.keys(req.body || {}).length ? req.body : (data?.data || data || null);
          }
          const oldData = sanitize(capturedOldData);
          newData = sanitize(newData);

          const baseDescription = getDescription
            ? await getDescription(req, data)
            : `${action} on ${module}`;
          const changes = changeSummary(oldData, newData);
          const description = changes ? `${baseDescription}. Changes: ${changes}` : baseDescription;
          const forwardedFor = req.headers?.['x-forwarded-for'];
          const ip = (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor?.split(',')[0]?.trim())
            || req.socket?.remoteAddress || null;

          await pool.query(
            `INSERT INTO activity_logs
              (user_id, username, action, module, record_id, description, old_data, new_data, ip_address)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
              user?.id || null,
              user?.username || 'system',
              action,
              module,
              recordId,
              description,
              oldData ? JSON.stringify(oldData) : null,
              newData ? JSON.stringify(newData) : null,
              ip,
            ]
          );
        } catch (err) {
          // Audit logging must never prevent the completed business operation.
          console.error('Activity log error:', err.message);
        }
      }
      return originalJson(data);
    };

    return next();
  };
}

export const logCreate = (module, getDescription, getRecordId, getNewData) =>
  logActivity({ action: 'CREATE', module, getDescription, getRecordId, getNewData });

export const logUpdate = (module, getDescription, getRecordId, getOldData, getNewData) =>
  logActivity({ action: 'UPDATE', module, getDescription, getRecordId, getOldData, getNewData });

export const logDelete = (module, getDescription, getRecordId, getOldData, getNewData) =>
  logActivity({ action: 'DELETE', module, getDescription, getRecordId, getOldData, getNewData });

export const logReturn = (module, getDescription, getRecordId, getOldData, getNewData) =>
  logActivity({ action: 'RETURN', module, getDescription, getRecordId, getOldData, getNewData });
