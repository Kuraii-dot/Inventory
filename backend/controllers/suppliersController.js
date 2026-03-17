// backend/controllers/suppliersController.js
// Converted from:
//   actions/delete_supplier.php    → deleteSupplier()
//   actions/edit_supplier.php      → updateSupplier()
//   pages/forms/add_supplier.php   → addSupplier()

import pool from '../db/pool.js';

// ─────────────────────────────────────────────
// GET /api/suppliers
// Fetch all suppliers for dropdowns and list
// ─────────────────────────────────────────────
export async function getSuppliers(req, res) {
  try {
    const result = await pool.query('SELECT id, name FROM suppliers ORDER BY name ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
}

// ─────────────────────────────────────────────
// POST /api/suppliers
// Converted from: pages/forms/add_supplier.php
// PHP: INSERT INTO suppliers (name) VALUES (:name)
//      → returns updated supplier list as HTML
// React: returns JSON { status, message, supplier }
// ─────────────────────────────────────────────
export async function addSupplier(req, res) {
  const name = req.body.name?.trim() ?? '';

  if (!name) {
    return res.status(400).json({ status: 'error', message: 'Supplier name cannot be empty.' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO suppliers (name) VALUES ($1) RETURNING id, name',
      [name]
    );
    res.json({
      status: 'success',
      message: 'Supplier added successfully!',
      supplier: result.rows[0],
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Database error: ' + err.message });
  }
}

// ─────────────────────────────────────────────
// PUT /api/suppliers/:id
// Converted from: actions/edit_supplier.php
// PHP: UPDATE suppliers SET name = :name WHERE id = :id
// ─────────────────────────────────────────────
export async function updateSupplier(req, res) {
  const { id } = req.params;
  const name = req.body.name?.trim() ?? '';

  if (!id || !name) {
    return res.status(400).json({ status: 'error', message: 'Invalid input data.' });
  }

  try {
    await pool.query('UPDATE suppliers SET name = $1 WHERE id = $2', [name, id]);
    res.json({ status: 'success', message: 'Supplier updated successfully.' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Database error: ' + err.message });
  }
}

// ─────────────────────────────────────────────
// DELETE /api/suppliers/:id
// Converted from: actions/delete_supplier.php
// PHP: DELETE FROM suppliers WHERE id = ?
// ─────────────────────────────────────────────
export async function deleteSupplier(req, res) {
  const { id } = req.params;

  if (!id || isNaN(id) || parseInt(id) <= 0) {
    return res.status(400).json({ status: 'error', message: 'Invalid supplier ID.' });
  }

  try {
    await pool.query('DELETE FROM suppliers WHERE id = $1', [id]);
    res.json({ status: 'success', message: 'Supplier deleted successfully.' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Database error: ' + err.message });
  }
}