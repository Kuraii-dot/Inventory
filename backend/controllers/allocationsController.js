// backend/controllers/allocationsController.js
// Converted from:
//   actions/add_allocation.php     → addAllocation()   (FIFO multi-item)
//   actions/allocate_item.php      → allocateItem()    (single item, row-lock)
//   actions/edit_allocation.php    → updateAllocation()
//   actions/delete_allocation.php  → deleteAllocation() (soft delete)
//   actions/return_allocation.php  → returnAllocation()
//   pages/forms/fetch_allocations.php → getAllocations()
//   pages/forms/fetch_single_allocation.php → getAllocationById()
//   pages/forms/get_allocation.php → getAllocationById() (same endpoint)

import pool from '../db/pool.js';

// ─────────────────────────────────────────────────────────────
// GET /api/allocations
// Converted from: pages/forms/fetch_allocations.php
// PHP: SELECT with search/timeframe/date filters + pagination
// ─────────────────────────────────────────────────────────────
export async function getAllocations(req, res) {
  const { search = '', timeframe = 'all', start_date, end_date, page = 1, limit = 50 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let where = `WHERE a.status != 'deleted'`;
  const params = [];
  let idx = 1;

  if (search) {
    where += ` AND (i.name ILIKE $${idx} OR a.department ILIKE $${idx} OR a.allocated_by ILIKE $${idx})`;
    params.push(`%${search}%`);
    idx++;
  }

  // mirrors: PHP timeframe switch
  if (timeframe === 'today') {
    where += ` AND DATE(a.allocated_at) = CURRENT_DATE`;
  } else if (timeframe === 'week') {
    where += ` AND a.allocated_at >= NOW() - INTERVAL '7 days'`;
  } else if (timeframe === 'month') {
    where += ` AND EXTRACT(MONTH FROM a.allocated_at) = EXTRACT(MONTH FROM NOW()) AND EXTRACT(YEAR FROM a.allocated_at) = EXTRACT(YEAR FROM NOW())`;
  } else if (timeframe === 'year') {
    where += ` AND EXTRACT(YEAR FROM a.allocated_at) = EXTRACT(YEAR FROM NOW())`;
  } else if (timeframe === 'custom' && start_date && end_date) {
    where += ` AND a.allocated_at BETWEEN $${idx} AND $${idx + 1}`;
    params.push(start_date + ' 00:00:00', end_date + ' 23:59:59');
    idx += 2;
  }

  const baseQuery = `
    SELECT
      a.id, a.quantity, a.department, a.allocated_by, a.purpose,
      a.remarks, a.status, a.allocated_at AS created_at,
      a.item_id, a.category_id,
      i.name  AS item_name,
      c.name  AS category_name,
      i.quantity AS current_stock
    FROM allocations a
    JOIN items      i ON a.item_id      = i.id
    JOIN categories c ON a.category_id  = c.id
    ${where}
    ORDER BY a.allocated_at DESC
  `;

  try {
    const countResult = await pool.query(`SELECT COUNT(*) FROM allocations a JOIN items i ON a.item_id = i.id JOIN categories c ON a.category_id = c.id ${where}`, params);
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(`${baseQuery} LIMIT $${idx} OFFSET $${idx + 1}`, [...params, limit, offset]);

    res.json({
      data:        result.rows,
      total,
      page:        parseInt(page),
      limit:       parseInt(limit),
      total_pages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
}

// ─────────────────────────────────────────────────────────────
// GET /api/allocations/:id
// Converted from: pages/forms/fetch_single_allocation.php + get_allocation.php
// ─────────────────────────────────────────────────────────────
export async function getAllocationById(req, res) {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT a.*, i.name AS item_name, c.name AS category_name
       FROM allocations a
       JOIN items i ON a.item_id = i.id
       JOIN categories c ON a.category_id = c.id
       WHERE a.id = $1`,
      [id]
    );
    if (!result.rows[0]) return res.status(404).json({ status: 'error', message: 'Allocation not found' });
    res.json({ status: 'success', data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
}

// ─────────────────────────────────────────────────────────────
// POST /api/allocations
// Converted from: actions/add_allocation.php
// Key logic: FIFO multi-item allocation with transaction
// PHP: foreach $items → SUM stock → fetch batches ORDER BY date_procured ASC → deduct → insert
// ─────────────────────────────────────────────────────────────
export async function addAllocation(req, res) {
  const { department, allocated_by, purpose, remarks = '', items } = req.body;

  if (!department || !allocated_by || !purpose || !items?.length) {
    return res.status(400).json({ status: 'error', message: 'Missing required fields or no items.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let total_quantity = 0;
    let items_allocated = 0;

    for (const itemData of items) {
      const { item_id, quantity: qty_requested } = itemData;
      const quantity_requested = parseInt(qty_requested);

      if (quantity_requested <= 0) {
        await client.query('ROLLBACK');
        return res.json({ status: 'error', message: 'Invalid quantity for one of the items.' });
      }

      // Fetch item name
      const itemRes = await client.query(
        `SELECT id, name, category_id, classification_id, unit
         FROM items WHERE id = $1 AND is_active = true`,
        [item_id]
      );
      const item = itemRes.rows[0];
      if (!item) {
        await client.query('ROLLBACK');
        return res.json({ status: 'error', message: `Item ID ${item_id} not found.` });
      }

      // Sum only true duplicate batches of the same logical material.
      const stockRes = await client.query(
        `SELECT SUM(quantity) AS total_stock
         FROM items
         WHERE name = $1
           AND category_id = $2
           AND classification_id IS NOT DISTINCT FROM $3
           AND unit = $4
           AND is_active = true
           AND quantity > 0`,
        [item.name, item.category_id, item.classification_id, item.unit]
      );
      const totalStock = parseInt(stockRes.rows[0].total_stock ?? 0);

      if (totalStock < quantity_requested) {
        await client.query('ROLLBACK');
        return res.json({ status: 'error', message: `Not enough stock for ${item.name}. Available: ${totalStock}` });
      }

      // FIFO: lock and consume the oldest exact inventory rows first.
      const batchRes = await client.query(
        `SELECT id, category_id, quantity
         FROM items
         WHERE name = $1
           AND category_id = $2
           AND classification_id IS NOT DISTINCT FROM $3
           AND unit = $4
           AND is_active = true
           AND quantity > 0
         ORDER BY date_procured ASC, id ASC
         FOR UPDATE`,
        [item.name, item.category_id, item.classification_id, item.unit]
      );

      let remaining = quantity_requested;
      for (const batch of batchRes.rows) {
        if (remaining <= 0) break;
        const deduct = Math.min(remaining, batch.quantity);
        remaining -= deduct;
        await client.query('UPDATE items SET quantity = quantity - $1 WHERE id = $2', [deduct, batch.id]);
        await client.query(
          `INSERT INTO allocations
             (item_id, category_id, department, allocated_by, quantity, purpose, remarks, allocated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
          [batch.id, batch.category_id, department, allocated_by, deduct, purpose, remarks]
        );
      }
      if (remaining > 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          status: 'error',
          message: `Stock changed while allocating ${item.name}. Please refresh and try again.`,
        });
      }

      total_quantity += quantity_requested;
      items_allocated++;
    }

    await client.query('COMMIT');
    res.json({
      status: 'success',
      message: `${items_allocated} item(s) allocated successfully (FIFO applied).`,
      total_quantity,
      items_count: items_allocated,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ status: 'error', message: err.message });
  } finally {
    client.release();
  }
}

// ─────────────────────────────────────────────────────────────
// PUT /api/allocations/:id
// Converted from: actions/edit_allocation.php
// PHP: handles item change (restore old, deduct new) OR same item qty change
// ─────────────────────────────────────────────────────────────
export async function updateAllocation(req, res) {
  const { id } = req.params;
  const { item_id, quantity, department, allocated_by, purpose, remarks = '' } = req.body;

  if (!item_id || !quantity || !department || !allocated_by || !purpose) {
    return res.status(400).json({ status: 'error', message: 'All required fields must be filled.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get current allocation
    const currentRes = await client.query(
      `SELECT item_id, quantity FROM allocations WHERE id = $1 AND status = 'active' FOR UPDATE`,
      [id]
    );
    const current = currentRes.rows[0];
    if (!current) {
      await client.query('ROLLBACK');
      return res.json({ status: 'error', message: 'Allocation not found or already processed.' });
    }

    const oldItemId  = parseInt(current.item_id);
    const oldQty     = parseInt(current.quantity);
    const newItemId  = parseInt(item_id);
    const newQty     = parseInt(quantity);

    if (!Number.isSafeInteger(newItemId) || newItemId <= 0
        || !Number.isSafeInteger(newQty) || newQty <= 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ status: 'error', message: 'Invalid item or quantity.' });
    }

    // Restore the exact FIFO batch recorded on the allocation, then deduct
    // only from the exact item id retained/selected by the edit form.
    await client.query(
      'UPDATE items SET quantity = quantity + $1, updated_at = NOW() WHERE id = $2',
      [oldQty, oldItemId]
    );
    const stockRes = await client.query(
      `SELECT id, category_id, quantity, is_active
       FROM items WHERE id = $1 FOR UPDATE`,
      [newItemId]
    );
    const selected = stockRes.rows[0];
    if (!selected || (!selected.is_active && newItemId !== oldItemId)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ status: 'error', message: 'Selected item is unavailable.' });
    }
    if (Number(selected.quantity) < newQty) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        status: 'error',
        message: `Insufficient stock in Item #${newItemId}. Available: ${selected.quantity}.`,
      });
    }
    await client.query(
      'UPDATE items SET quantity = quantity - $1, updated_at = NOW() WHERE id = $2',
      [newQty, newItemId]
    );

    await client.query(
      `UPDATE allocations SET item_id=$1, category_id=$2, quantity=$3, department=$4,
       allocated_by=$5, purpose=$6, remarks=$7, updated_at=NOW()
       WHERE id=$8`,
      [newItemId, selected.category_id, newQty, department, allocated_by, purpose, remarks, id]
    );

    await client.query('COMMIT');
    res.json({ status: 'success', message: 'Allocation updated successfully.' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ status: 'error', message: err.message });
  } finally {
    client.release();
  }
}

// ─────────────────────────────────────────────────────────────
// DELETE /api/allocations/:id
// Converted from: actions/delete_allocation.php
// PHP: soft delete (status = 'deleted'), restore stock if active
// ─────────────────────────────────────────────────────────────
export async function deleteAllocation(req, res) {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const allRes = await client.query('SELECT item_id, quantity, status FROM allocations WHERE id = $1 FOR UPDATE', [id]);
    const allocation = allRes.rows[0];
    if (!allocation) {
      await client.query('ROLLBACK');
      return res.status(404).json({ status: 'error', message: 'Allocation not found.' });
    }

    // Only restore stock if still active
    if (allocation.status === 'active') {
      await client.query('UPDATE items SET quantity = quantity + $1 WHERE id = $2', [allocation.quantity, allocation.item_id]);
    }

    // Soft delete — mirrors: UPDATE allocations SET status = 'deleted'
    await client.query(`UPDATE allocations SET status = 'deleted', updated_at = NOW() WHERE id = $1`, [id]);

    await client.query('COMMIT');
    res.json({ status: 'success', message: 'Allocation deleted successfully.', stock_restored: allocation.status === 'active' ? allocation.quantity : 0 });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ status: 'error', message: err.message });
  } finally {
    client.release();
  }
}

// ─────────────────────────────────────────────────────────────
// POST /api/allocations/:id/return
// Converted from: actions/return_allocation.php
// PHP: full or partial return — restore stock, update status/qty
// ─────────────────────────────────────────────────────────────
export async function returnAllocation(req, res) {
  const { id } = req.params;
  let { return_quantity, return_reason = '' } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const allRes = await client.query(
      `SELECT item_id, quantity FROM allocations WHERE id = $1 AND status = 'active' FOR UPDATE`,
      [id]
    );
    const allocation = allRes.rows[0];
    if (!allocation) {
      await client.query('ROLLBACK');
      return res.json({ status: 'error', message: 'Allocation not found or already returned.' });
    }

    const allocated_qty = parseInt(allocation.quantity);
    const parsedReturnQty = return_quantity === '' || return_quantity === null || return_quantity === undefined
      ? allocated_qty
      : Number(return_quantity);
    const return_qty = parsedReturnQty;

    if (!Number.isSafeInteger(return_qty) || return_qty <= 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ status: 'error', message: 'Return quantity must be a positive whole number.' });
    }
    if (return_qty > allocated_qty) {
      await client.query('ROLLBACK');
      return res.json({ status: 'error', message: 'Return quantity cannot exceed allocated quantity.' });
    }

    // Restore stock
    await client.query('UPDATE items SET quantity = quantity + $1 WHERE id = $2', [return_qty, allocation.item_id]);

    if (return_qty === allocated_qty) {
      // Full return
      await client.query(
        `UPDATE allocations SET status='returned', remarks=COALESCE(remarks,'')||E'\nReturned: '||$1, updated_at=NOW() WHERE id=$2`,
        [return_reason, id]
      );
    } else {
      // Partial return
      const remaining = allocated_qty - return_qty;
      await client.query(
        `UPDATE allocations SET quantity=$1, remarks=COALESCE(remarks,'')||E'\nPartial return ('||$2||'): '||$3, updated_at=NOW() WHERE id=$4`,
        [remaining, return_qty, return_reason, id]
      );
    }

    await client.query('COMMIT');
    res.json({
      status: 'success',
      message: `${return_qty === allocated_qty ? 'Full' : 'Partial'} return processed successfully.`,
      returned_quantity: return_qty,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ status: 'error', message: err.message });
  } finally {
    client.release();
  }
}
