// backend/controllers/combinationsController.js
// Updated to match actual DB schema:
//   combinations:      id, name, description, is_active, created_by, created_at, updated_at
//   combination_items: id, combination_id, item_id, quantity_required, quantity

import pool from '../db/pool.js';

function normalizeCombinationItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('At least one item is required.');
  }

  const normalized = items.map((item, index) => {
    const itemId = Number(item?.item_id);
    const quantity = Number(item?.quantity_required ?? item?.quantity);
    if (!Number.isSafeInteger(itemId) || itemId <= 0) {
      throw new Error(`Select a valid inventory item on row ${index + 1}.`);
    }
    if (!Number.isSafeInteger(quantity) || quantity <= 0) {
      throw new Error(`Enter a valid quantity on row ${index + 1}.`);
    }
    return { item_id: itemId, quantity_required: quantity };
  });

  if (new Set(normalized.map(item => item.item_id)).size !== normalized.length) {
    throw new Error('The same inventory item cannot be added to a combination twice.');
  }
  return normalized;
}

// ─────────────────────────────────────────────────────────────
// GET /api/combinations
// ─────────────────────────────────────────────────────────────
export async function getCombinations(req, res) {
  try {
    const combos = await pool.query(
      `SELECT id, name, description, is_active, created_by, created_at
       FROM combinations
       WHERE is_active = true OR is_active IS NULL
       ORDER BY name ASC`
    );

    const result = await Promise.all(
      combos.rows.map(async (combo) => {
        const items = await pool.query(
          `SELECT ci.id, ci.item_id, ci.quantity_required, ci.quantity,
                  i.name  AS item_name,
                  c.name  AS category_name,
                  i.quantity AS stock_available
           FROM combination_items ci
           JOIN items i ON ci.item_id = i.id
           JOIN categories c ON i.category_id = c.id
           WHERE ci.combination_id = $1
           ORDER BY ci.id ASC`,
          [combo.id]
        );
        return { ...combo, items: items.rows, item_count: items.rows.length };
      })
    );

    res.json({ status: 'success', data: result });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
}

// ─────────────────────────────────────────────────────────────
// GET /api/combinations/:id
// ─────────────────────────────────────────────────────────────
export async function getCombinationById(req, res) {
  const { id } = req.params;
  try {
    const combo = await pool.query(
      'SELECT id, name, description, created_by FROM combinations WHERE id = $1',
      [id]
    );
    if (!combo.rows[0]) return res.status(404).json({ status: 'error', message: 'Combination not found.' });

    const items = await pool.query(
      `SELECT ci.id, ci.item_id, ci.quantity_required, ci.quantity,
              i.name AS item_name, c.name AS category_name,
              i.category_id, i.quantity AS stock_available
       FROM combination_items ci
       JOIN items i ON ci.item_id = i.id
       JOIN categories c ON i.category_id = c.id
       WHERE ci.combination_id = $1
       ORDER BY ci.id ASC`,
      [id]
    );

    res.json({ status: 'success', data: { ...combo.rows[0], items: items.rows } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
}

// ─────────────────────────────────────────────────────────────
// POST /api/combinations
// Body: { combination_name, description, created_by, items: [{ item_id, quantity_required }] }
// ─────────────────────────────────────────────────────────────
export async function createCombination(req, res) {
  const { combination_name, description = '', items } = req.body;

  if (!combination_name?.trim()) {
    return res.status(400).json({ status: 'error', message: 'Combination name is required.' });
  }
  let normalizedItems;
  try { normalizedItems = normalizeCombinationItems(items); }
  catch (error) { return res.status(400).json({ status: 'error', message: error.message }); }

  const authenticatedUserId = Number(req.user?.id);
  const createdBy = Number.isSafeInteger(authenticatedUserId) && authenticatedUserId > 0
    ? authenticatedUserId
    : null;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const comboRes = await client.query(
      `INSERT INTO combinations (name, description, is_active, created_by, created_at, updated_at)
       VALUES ($1, $2, true, $3, NOW(), NOW()) RETURNING id`,
      [combination_name.trim(), description, createdBy]
    );
    const comboId = comboRes.rows[0].id;

    for (const item of normalizedItems) {
      await client.query(
        `INSERT INTO combination_items (combination_id, item_id, quantity_required, quantity)
         VALUES ($1, $2, $3, $3)`,
        [comboId, item.item_id, item.quantity_required || item.quantity || 1]
      );
    }

    await client.query('COMMIT');
    res.json({ status: 'success', message: `"${combination_name}" saved successfully!`, id: comboId });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ status: 'error', message: err.message });
  } finally {
    client.release();
  }
}

// ─────────────────────────────────────────────────────────────
// PUT /api/combinations/:id
// ─────────────────────────────────────────────────────────────
export async function updateCombination(req, res) {
  const { id } = req.params;
  const { combination_name, description = '', items } = req.body;

  if (!combination_name?.trim()) {
    return res.status(400).json({ status: 'error', message: 'Combination name is required.' });
  }
  let normalizedItems;
  try { normalizedItems = normalizeCombinationItems(items); }
  catch (error) { return res.status(400).json({ status: 'error', message: error.message }); }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `UPDATE combinations SET name = $1, description = $2, updated_at = NOW() WHERE id = $3`,
      [combination_name.trim(), description, id]
    );

    // Delete old items and re-insert
    await client.query('DELETE FROM combination_items WHERE combination_id = $1', [id]);

    for (const item of normalizedItems) {
      await client.query(
        `INSERT INTO combination_items (combination_id, item_id, quantity_required, quantity)
         VALUES ($1, $2, $3, $3)`,
        [id, item.item_id, item.quantity_required || item.quantity || 1]
      );
    }

    await client.query('COMMIT');
    res.json({ status: 'success', message: `"${combination_name}" updated successfully!` });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ status: 'error', message: err.message });
  } finally {
    client.release();
  }
}

// ─────────────────────────────────────────────────────────────
// DELETE /api/combinations/:id
// Soft delete — sets is_active = false
// ─────────────────────────────────────────────────────────────
export async function deleteCombination(req, res) {
  const { id } = req.params;
  try {
    await pool.query(
      'UPDATE combinations SET is_active = false, updated_at = NOW() WHERE id = $1',
      [id]
    );
    res.json({ status: 'success', message: 'Combination deleted.' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
}
