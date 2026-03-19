// backend/middleware/activityLogger.js
// Automatically logs every CREATE, UPDATE, DELETE action
// Attached to routes as middleware

import pool from '../db/pool.js';

export function logActivity({ action, module, getDescription, getRecordId, getOldData, getNewData }) {
  return async (req, res, next) => {
    // Store original json method to intercept response
    const originalJson = res.json.bind(res);

    res.json = async (data) => {
      // Only log successful responses (2xx)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          const user     = req.user;
          const recordId = getRecordId ? getRecordId(req, data) : (req.params.id || data?.id || null);
          const desc     = getDescription ? getDescription(req, data) : `${action} on ${module}`;
          const oldData  = getOldData ? await getOldData(req) : null;
          const newData  = getNewData ? getNewData(req, data) : null;
          const ip       = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;

          await pool.query(
            `INSERT INTO activity_logs 
              (user_id, username, action, module, record_id, description, old_data, new_data, ip_address)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
              user?.id   || null,
              user?.username || 'system',
              action,
              module,
              recordId,
              desc,
              oldData  ? JSON.stringify(oldData)  : null,
              newData  ? JSON.stringify(newData)  : null,
              ip,
            ]
          );
        } catch (err) {
          // Never block the response if logging fails
          console.error('Activity log error:', err.message);
        }
      }
      return originalJson(data);
    };

    next();
  };
}

// Shorthand factories
export const logCreate = (module, getDescription, getRecordId) =>
  logActivity({ action: 'CREATE', module, getDescription, getRecordId });

export const logUpdate = (module, getDescription, getRecordId, getOldData) =>
  logActivity({ action: 'UPDATE', module, getDescription, getRecordId, getOldData });

export const logDelete = (module, getDescription, getRecordId, getOldData) =>
  logActivity({ action: 'DELETE', module, getDescription, getRecordId, getOldData });