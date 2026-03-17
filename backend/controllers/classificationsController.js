// backend/controllers/classificationsController.js
// Converted from:
//   actions/add_classification.php
//   actions/assign_classification.php
//   actions/get_classification.php
//   pages/forms/search_classification.php   → getByCategory()
//   pages/forms/get_classification.php      → getByCategory() (same endpoint)

import pool from '../db/pool.js';

// GET /api/classifications?category_id=X
// Converted from: pages/forms/search_classification.php
// PHP: SELECT id, classification_name FROM classifications WHERE category_id = :cat_id
// Used in: add item modal cascade, edit item modal cascade, ledger cascade
export async function getClassifications(req, res) {
  const { category_id } = req.query;

  try {
    let result;
    if (category_id) {
      // mirrors: fetch classifications under a specific category
      result = await pool.query(
        'SELECT id, classification_name FROM classifications WHERE category_id = $1 ORDER BY classification_name ASC',
        [category_id]
      );
    } else {
      // mirrors: fetch ALL classifications when no category filter
      result = await pool.query(
        'SELECT id, classification_name FROM classifications ORDER BY classification_name ASC'
      );
    }
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// POST /api/classifications
// Converted from: actions/add_classification.php
export async function addClassification(req, res) {
  const { category_id, classification_name } = req.body;

  if (!category_id || !classification_name?.trim()) {
    return res.status(400).json({ status: 'error', message: 'Category and name are required.' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO classifications (category_id, classification_name) VALUES ($1, $2) RETURNING id, classification_name',
      [category_id, classification_name.trim()]
    );
    res.json({
      status: 'success',
      message: 'Classification added successfully!',
      classification: result.rows[0],
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Database error: ' + err.message });
  }
}