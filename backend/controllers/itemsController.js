// backend/controllers/itemsController.js
// Converted from:
//   actions/fetch_items.php        → getItems(), getItemsByCategory(), getItemsByClassification()
//   actions/delete_items.php       → deleteItem()
//   actions/edit_item.php          → updateItem()
//   actions/validate_stock.php     → validateStock()
//   pages/items.php (POST add)     → addItem()

import pool from '../db/pool.js';

// ─────────────────────────────────────────────
// GET /api/items
// Converted from: items.php main SELECT query
// PHP: $_GET['search'], ['category_id'], ['classification_id'], ['filter_month'], ['filter_year']
// ─────────────────────────────────────────────
export async function getItems(req, res) {
  const { search, category_id, classification_id, filter_month, filter_year, date_from, date_to } = req.query;

  let query = `
    SELECT
      i.id,
      i.name,
      i.quantity,
      i.unit_price,
      i.date_ordered,
      i.date_procured,
      c.name  AS category,
      s.name  AS supplier,
      cls.classification_name
    FROM items i
    LEFT JOIN categories      c   ON i.category_id       = c.id
    LEFT JOIN suppliers       s   ON i.supplier_id        = s.id
    LEFT JOIN classifications cls ON i.classification_id  = cls.id
    WHERE 1=1
  `;

  const params = [];
  let idx = 1;

  // mirrors: AND i.name ILIKE :search
  if (search) {
    query += ` AND i.name ILIKE $${idx++}`;
    params.push(`%${search}%`);
  }

  // mirrors: AND i.category_id = :category_id
  if (category_id) {
    query += ` AND i.category_id = $${idx++}`;
    params.push(category_id);
  }

  // mirrors: AND i.classification_id = :classification_id
  if (classification_id) {
    query += ` AND i.classification_id = $${idx++}`;
    params.push(classification_id);
  }

  // mirrors: EXTRACT(MONTH FROM i.date_procured) = :filter_month
  if (filter_month) {
    query += ` AND EXTRACT(MONTH FROM i.date_procured) = $${idx++}`;
    params.push(filter_month);
  }

  // mirrors: EXTRACT(YEAR FROM i.date_procured) = :filter_year
  if (filter_year) {
    query += ` AND EXTRACT(YEAR FROM i.date_procured) = $${idx++}`;
    params.push(filter_year);
  }

  // Custom date range filter
  if (date_from) {
    query += ` AND i.date_procured >= $${idx++}`;
    params.push(date_from);
  }
  if (date_to) {
    query += ` AND i.date_procured <= $${idx++}`;
    params.push(date_to);
  }

  query += ' ORDER BY i.id DESC';

  try {
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching items: ' + err.message });
  }
}

// ─────────────────────────────────────────────
// GET /api/items/all-overview
// Converted from: allitems.php main aggregation query
// Groups items by name, calculates usage rate, distribution totals
// ─────────────────────────────────────────────
export async function getAllItemsOverview(req, res) {
  try {
    const result = await pool.query(`
      SELECT
        i.name                     AS item_name,
        COUNT(DISTINCT i.id)       AS variant_count,
        SUM(i.quantity)            AS total_stock,
        COALESCE(SUM(d.quantity), 0) AS total_distributed,
        MIN(c.name)                AS category_name,
        MIN(i.unit_price)          AS min_price,
        MAX(i.unit_price)          AS max_price,
        COUNT(DISTINCT c.id)       AS category_count
      FROM items i
      LEFT JOIN categories    c ON i.category_id = c.id
      LEFT JOIN distributions d ON i.id          = d.item_id
      GROUP BY i.name
      ORDER BY i.name ASC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// ─────────────────────────────────────────────
// GET /api/items/by-category?category_id=X
// Converted from: actions/fetch_items.php + pages/forms/fetch_items_by_category.php
// ─────────────────────────────────────────────
export async function getItemsByCategory(req, res) {
  const { category_id } = req.query;

  if (!category_id) return res.json([]);

  try {
    const result = await pool.query(
      `SELECT id, name, quantity
       FROM items
       WHERE category_id = $1 AND quantity > 0
       ORDER BY name ASC`,
      [category_id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// ─────────────────────────────────────────────
// GET /api/items/by-classification?classification_id=X
// Converted from: pages/forms/fetch_items_by_classification.php
// ─────────────────────────────────────────────
export async function getItemsByClassification(req, res) {
  const { classification_id } = req.query;

  if (!classification_id) return res.json([]);

  try {
    const result = await pool.query(
      `SELECT id, name, quantity
       FROM items
       WHERE classification_id = $1 AND quantity > 0
       ORDER BY date_procured DESC, name ASC`,
      [classification_id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// ─────────────────────────────────────────────
// POST /api/items
// Converted from: items.php POST add_item handler
// PHP: INSERT INTO items (...) VALUES (...)
// ─────────────────────────────────────────────
export async function addItem(req, res) {
  const {
    name, category_id, classification_id, supplier_id,
    quantity, unit_price, date_ordered, date_procured
  } = req.body;

  if (!name || !category_id || !supplier_id || !quantity || !unit_price || !date_ordered || !date_procured) {
    return res.status(400).json({ success: false, message: 'All fields are required.' });
  }

  try {
    await pool.query(
      `INSERT INTO items
         (name, category_id, classification_id, supplier_id, quantity, unit_price, date_ordered, date_procured)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        name,
        category_id,
        classification_id || null,
        supplier_id,
        quantity,
        unit_price,
        date_ordered,
        date_procured,
      ]
    );
    res.json({ success: true, message: 'Item added successfully!' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Database error: ' + err.message });
  }
}

// ─────────────────────────────────────────────
// GET /api/items/:id
// Fetch single item for edit modal
// Converted from: pages/forms/edit_item.php GET handler
// ─────────────────────────────────────────────
export async function getItemById(req, res) {
  const { id } = req.params;

  try {
    const result = await pool.query('SELECT * FROM items WHERE id = $1', [id]);
    if (!result.rows[0]) return res.status(404).json({ message: 'Item not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// ─────────────────────────────────────────────
// PUT /api/items/:id
// Converted from: actions/edit_item.php
// PHP: UPDATE items SET name=:name, category_id=:category_id ...
// ─────────────────────────────────────────────
export async function updateItem(req, res) {
  const { id } = req.params;
  const { name, category_id, classification_id, supplier_id, quantity, unit_price } = req.body;

  if (!name || !category_id || !supplier_id) {
    return res.status(400).json({ success: false, message: 'Please fill out all required fields.' });
  }

  try {
    await pool.query(
      `UPDATE items SET
         name              = $1,
         category_id       = $2,
         classification_id = $3,
         supplier_id       = $4,
         quantity          = $5,
         unit_price        = $6
       WHERE id = $7`,
      [name, category_id, classification_id || null, supplier_id, quantity, unit_price, id]
    );
    res.json({ success: true, message: 'Item updated successfully!' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Database error: ' + err.message });
  }
}

// ─────────────────────────────────────────────
// DELETE /api/items/:id
// Converted from: actions/delete_items.php
// PHP: DELETE FROM items WHERE id = :id
// ─────────────────────────────────────────────
export async function deleteItem(req, res) {
  const { id } = req.params;

  if (!id || isNaN(id)) {
    return res.status(400).json({ success: false, message: 'Invalid item ID.' });
  }

  try {
    // mirrors: check if item exists first
    const check = await pool.query('SELECT id FROM items WHERE id = $1', [id]);
    if (!check.rows[0]) {
      return res.status(404).json({ success: false, message: 'Item not found.' });
    }

    await pool.query('DELETE FROM items WHERE id = $1', [id]);
    res.json({ success: true, message: 'Item deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Database error: ' + err.message });
  }
}

// ─────────────────────────────────────────────
// GET /api/items/validate-stock?item_id=X&quantity=Y
// Converted from: actions/validate_stock.php
// PHP: compare requested qty vs items.quantity
// ─────────────────────────────────────────────
export async function validateStock(req, res) {
  const { item_id, quantity } = req.query;
  const qty = parseInt(quantity);

  if (!item_id || !qty || qty <= 0) {
    return res.json({ valid: false, message: 'Invalid parameters', available: 0 });
  }

  try {
    const result = await pool.query('SELECT quantity FROM items WHERE id = $1', [item_id]);
    const item = result.rows[0];

    if (!item) return res.json({ valid: false, message: 'Item not found', available: 0 });

    const available = parseInt(item.quantity);
    if (qty > available) {
      res.json({ valid: false, message: 'Insufficient stock', available });
    } else {
      res.json({ valid: true, remaining: available - qty });
    }
  } catch (err) {
    res.status(500).json({ valid: false, message: 'Error validating stock', available: 0 });
  }
}