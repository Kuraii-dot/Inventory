// backend/controllers/distributionsController.js
// Converted from:
//   actions/add_distributions.php     → addDistribution()   (FIFO multi-item)
//   actions/edit_distribution.php     → updateDistribution() (restore+rededuct)
//   actions/delete_distributions.php  → deleteDistribution() (restore stock)
//   actions/return_distribution.php   → returnDistribution() (partial/full)
//   pages/forms/fetch_distributions.php → getDistributions()

import pool from '../db/pool.js';

// ─────────────────────────────────────────────────────────────
// GET /api/distributions
// Converted from: pages/forms/fetch_distributions.php
// PHP: filter, timeframe, search + pagination
// ─────────────────────────────────────────────────────────────
export async function getDistributions(req, res) {
  const { search = '', timeframe = 'all', start_date, end_date, page = 1, limit = 15 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let where = 'WHERE 1=1';
  const params = [];
  let idx = 1;

  if (search) {
    where += ` AND (i.name ILIKE $${idx} OR d.department ILIKE $${idx} OR d.recipient ILIKE $${idx})`;
    params.push(`%${search}%`);
    idx++;
  }

  if (timeframe === 'today') {
    where += ` AND DATE(d.distributed_at) = CURRENT_DATE`;
  } else if (timeframe === 'week') {
    where += ` AND d.distributed_at >= NOW() - INTERVAL '7 days'`;
  } else if (timeframe === 'month') {
    where += ` AND EXTRACT(MONTH FROM d.distributed_at) = EXTRACT(MONTH FROM NOW())
               AND EXTRACT(YEAR  FROM d.distributed_at) = EXTRACT(YEAR  FROM NOW())`;
  } else if (timeframe === 'year') {
    where += ` AND EXTRACT(YEAR FROM d.distributed_at) = EXTRACT(YEAR FROM NOW())`;
  } else if (timeframe === 'custom' && start_date && end_date) {
    where += ` AND d.distributed_at BETWEEN $${idx} AND $${idx + 1}`;
    params.push(start_date + ' 00:00:00', end_date + ' 23:59:59');
    idx += 2;
  }

  const baseSelect = `
    SELECT
      d.id, d.quantity, d.department, d.recipient, d.purpose,
      d.approved_by, d.debit_to, d.total_value,
      d.distributed_at, d.item_id, d.category_id,
      i.name  AS item_name,
      c.name  AS category_name
    FROM distributions d
    JOIN items      i ON d.item_id     = i.id
    JOIN categories c ON d.category_id = c.id
    ${where}
    ORDER BY d.distributed_at DESC
  `;

  try {
    const countRes = await pool.query(
      `SELECT COUNT(*) FROM distributions d JOIN items i ON d.item_id = i.id JOIN categories c ON d.category_id = c.id ${where}`,
      params
    );
    const total_records = parseInt(countRes.rows[0].count);
    const total_pages   = Math.ceil(total_records / parseInt(limit));

    const dataRes = await pool.query(`${baseSelect} LIMIT $${idx} OFFSET $${idx + 1}`, [...params, limit, offset]);

    res.json({
      data:         dataRes.rows,
      count:        dataRes.rows.length,
      total_records,
      total_pages,
      page:         parseInt(page),
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
}

// ─────────────────────────────────────────────────────────────
// GET /api/distributions/:id
// ─────────────────────────────────────────────────────────────
export async function getDistributionById(req, res) {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT d.*, i.name AS item_name, c.name AS category_name
       FROM distributions d
       JOIN items i ON d.item_id = i.id
       JOIN categories c ON d.category_id = c.id
       WHERE d.id = $1`,
      [id]
    );
    if (!result.rows[0]) return res.status(404).json({ status: 'error', message: 'Distribution not found.' });
    res.json({ status: 'success', data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
}

// ─────────────────────────────────────────────────────────────
// POST /api/distributions
// Converted from: actions/add_distributions.php
// Key logic: FIFO multi-item with total_value tracking
// PHP: foreach → fetch batches ORDER BY date_procured ASC → deduct → INSERT
// ─────────────────────────────────────────────────────────────
export async function addDistribution(req, res) {
  const { recipient, department, approved_by, purpose, debit_to = null, date, time, items } = req.body;

  if (!recipient || !department || !approved_by || !purpose || !items?.length) {
    return res.status(400).json({ status: 'error', message: 'Missing required fields or no items.' });
  }

  // mirrors: respect user-selected date/time, fallback to now
  const dist_date = date || new Date().toISOString().split('T')[0];
  const dist_time = time || new Date().toTimeString().split(' ')[0];
  const distributed_at = `${dist_date} ${dist_time}`;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let total_distributed_value = 0;
    const all_logs = [];
    let items_distributed = 0;

    for (const itemData of items) {
      const { item_id, quantity: qty } = itemData;
      const quantity_requested = parseInt(qty);

      if (quantity_requested <= 0) {
        await client.query('ROLLBACK');
        return res.json({ status: 'error', message: 'Invalid quantity for one of the items.' });
      }

      // Resolve the logical material selected by the user. FIFO may consume a
      // different physical inventory row, so the real batch id must be stored
      // on each distribution record (not merely the id selected in the form).
      const itemRes = await client.query(
        `SELECT id, name, category_id, classification_id, unit
         FROM items WHERE id = $1 AND is_active = true`,
        [item_id]
      );
      const selectedItem = itemRes.rows[0];
      if (!selectedItem) {
        await client.query('ROLLBACK');
        return res.json({ status: 'error', message: `Item ID ${item_id} not found.` });
      }
      const itemName = selectedItem.name;

      // FIFO pool is limited to the same material identity. Matching only by
      // name can mix unrelated categories/classifications that share a label.
      const batchRes = await client.query(
        `SELECT id, category_id, quantity, unit_price, date_procured
         FROM items
         WHERE name = $1
           AND category_id = $2
           AND classification_id IS NOT DISTINCT FROM $3
           AND unit = $4
           AND is_active = true
           AND quantity > 0
         ORDER BY date_procured ASC, id ASC
         FOR UPDATE`,
        [itemName, selectedItem.category_id, selectedItem.classification_id, selectedItem.unit]
      );

      let remaining   = quantity_requested;
      let item_value  = 0;
      const batch_log = [];

      for (const batch of batchRes.rows) {
        if (remaining <= 0) break;
        const deduct = Math.min(remaining, batch.quantity);
        remaining   -= deduct;
        item_value  += deduct * parseFloat(batch.unit_price);

        await client.query('UPDATE items SET quantity = quantity - $1 WHERE id = $2', [deduct, batch.id]);
        await client.query(
          `INSERT INTO distributions
             (item_id, category_id, recipient, department, debit_to, approved_by, quantity,
              purpose, date, time, total_value, distributed_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
          [batch.id, batch.category_id, recipient, department, debit_to || null, approved_by,
           deduct, purpose, dist_date, dist_time, deduct * parseFloat(batch.unit_price), distributed_at]
        );
        batch_log.push({ batch_id: batch.id, deducted: deduct, date_procured: batch.date_procured });
      }

      if (remaining > 0) {
        await client.query('ROLLBACK');
        return res.json({ status: 'error', message: `Not enough stock available for ${itemName}.` });
      }

      total_distributed_value += item_value;
      all_logs.push({ item: itemName, quantity: quantity_requested, value: item_value, batches: batch_log });
      items_distributed++;
    }

    await client.query('COMMIT');
    res.json({
      status:      'success',
      message:     `${items_distributed} item(s) distributed successfully (FIFO applied).`,
      total_value: total_distributed_value,
      items_count: items_distributed,
      log:         all_logs,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ status: 'error', message: err.message });
  } finally {
    client.release();
  }
}

// ─────────────────────────────────────────────────────────────
// PUT /api/distributions/:id
// Converted from: actions/edit_distribution.php
// PHP: restore old stock → check new stock → deduct new → update record
// ─────────────────────────────────────────────────────────────
export async function updateDistribution(req, res) {
  const { id } = req.params;
  const { recipient, department, approved_by, debit_to = '', purpose, quantity, item_id } = req.body;

  const distributionId = Number(id);
  const requestedItemId = Number(item_id);
  const requestedQuantity = Number(quantity);

  if (!recipient || !department || !approved_by || !purpose
      || !Number.isSafeInteger(distributionId) || distributionId <= 0
      || !Number.isSafeInteger(requestedItemId) || requestedItemId <= 0
      || !Number.isSafeInteger(requestedQuantity) || requestedQuantity <= 0) {
    return res.status(400).json({ status: 'error', message: 'Missing required fields.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get old distribution
    const oldRes = await client.query(
      `SELECT d.item_id, d.category_id, d.quantity, d.total_value
       FROM distributions d
       WHERE d.id = $1
       FOR UPDATE`,
      [distributionId]
    );
    const old = oldRes.rows[0];
    if (!old) {
      await client.query('ROLLBACK');
      return res.json({ status: 'error', message: 'Distribution not found.' });
    }

    const oldQuantity = Number(old.quantity);

    // A distribution row now represents one exact FIFO inventory batch. Restore
    // that row first, then re-deduct only from the exact item id being edited.
    // This prevents duplicate names from silently moving stock between item ids.
    await client.query(
      'UPDATE items SET quantity = quantity + $1, updated_at = NOW() WHERE id = $2',
      [oldQuantity, old.item_id]
    );

    const selectedItem = await client.query(
      `SELECT id, category_id, quantity, unit_price, is_active
       FROM items
       WHERE id = $1
       FOR UPDATE`,
      [requestedItemId]
    );
    const selected = selectedItem.rows[0];
    if (!selected || (!selected.is_active && requestedItemId !== Number(old.item_id))) {
      await client.query('ROLLBACK');
      return res.status(400).json({ status: 'error', message: 'The selected item is unavailable.' });
    }
    if (Number(selected.quantity) < requestedQuantity) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        status: 'error',
        message: `Not enough stock in Item #${requestedItemId}. Available: ${selected.quantity}.`,
      });
    }

    await client.query(
      'UPDATE items SET quantity = quantity - $1, updated_at = NOW() WHERE id = $2',
      [requestedQuantity, requestedItemId]
    );
    const newCategoryId = Number(selected.category_id);
    const newTotalValue = requestedQuantity * Number(selected.unit_price || 0);

    // Update distribution record
    await client.query(
      `UPDATE distributions SET recipient=$1, department=$2, approved_by=$3, debit_to=$4,
       purpose=$5, quantity=$6, item_id=$7, category_id=$8, total_value=$9, updated_at=NOW()
       WHERE id=$10`,
      [recipient, department, approved_by, debit_to || null, purpose, requestedQuantity,
       requestedItemId, newCategoryId, newTotalValue, distributionId]
    );

    await client.query('COMMIT');
    res.json({ status: 'success', message: 'Distribution updated successfully.' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ status: 'error', message: err.message });
  } finally {
    client.release();
  }
}

// ─────────────────────────────────────────────────────────────
// DELETE /api/distributions/:id
// Converted from: actions/delete_distributions.php
// PHP: lock row → restore stock → DELETE record
// ─────────────────────────────────────────────────────────────
export async function deleteDistribution(req, res) {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const distRes = await client.query(
      'SELECT id, item_id, quantity, total_value FROM distributions WHERE id = $1 FOR UPDATE',
      [id]
    );
    const dist = distRes.rows[0];
    if (!dist) {
      await client.query('ROLLBACK');
      return res.status(404).json({ status: 'error', message: 'Distribution not found.' });
    }

    // Restore stock
    await client.query('UPDATE items SET quantity = quantity + $1 WHERE id = $2', [dist.quantity, dist.item_id]);

    // Hard delete (unlike allocations which soft-delete)
    await client.query('DELETE FROM distributions WHERE id = $1', [id]);

    await client.query('COMMIT');
    res.json({ status: 'success', message: 'Distribution deleted and stock restored.' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ status: 'error', message: err.message });
  } finally {
    client.release();
  }
}

// ─────────────────────────────────────────────────────────────
// POST /api/distributions/:id/return
// Converted from: actions/return_distribution.php
// PHP: partial → update qty, full → DELETE record
// ─────────────────────────────────────────────────────────────
export async function returnDistribution(req, res) {
  const { id } = req.params;
  const { return_quantity } = req.body;
  const returnQty = parseInt(return_quantity);

  if (!returnQty || returnQty <= 0) {
    return res.status(400).json({ status: 'error', message: 'Invalid return quantity.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const distRes = await client.query(
      'SELECT id, item_id, quantity, total_value FROM distributions WHERE id = $1 FOR UPDATE',
      [id]
    );
    const dist = distRes.rows[0];
    if (!dist) {
      await client.query('ROLLBACK');
      return res.json({ status: 'error', message: 'Distribution not found.' });
    }

    const currentQty = parseInt(dist.quantity);
    if (returnQty > currentQty) {
      await client.query('ROLLBACK');
      return res.json({ status: 'error', message: 'Return quantity exceeds distributed amount.' });
    }

    // Restore stock
    await client.query('UPDATE items SET quantity = quantity + $1 WHERE id = $2', [returnQty, dist.item_id]);

    const newQty = currentQty - returnQty;
    if (newQty > 0) {
      // Partial return — update quantity
      const unitValue = currentQty > 0 ? Number(dist.total_value || 0) / currentQty : 0;
      await client.query(
        'UPDATE distributions SET quantity = $1, total_value = $2, updated_at = NOW() WHERE id = $3',
        [newQty, unitValue * newQty, id]
      );
    } else {
      // Full return — delete record (mirrors PHP: DELETE)
      await client.query('DELETE FROM distributions WHERE id = $1', [id]);
    }

    await client.query('COMMIT');
    res.json({ status: 'success', message: 'Return processed successfully.' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ status: 'error', message: err.message });
  } finally {
    client.release();
  }
}
