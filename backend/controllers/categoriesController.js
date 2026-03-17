// backend/controllers/categoriesController.js
// Converted from:
//   items.php POST add_category handler
//   actions/delete_category.php
//   actions/edit_category.php
//   pages/forms/fetch_categories.php

import pool from '../db/pool.js';

// GET /api/categories
export async function getCategories(req, res) {
  try {
    const result = await pool.query('SELECT id, name FROM categories ORDER BY name ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// POST /api/categories
// Converted from: items.php POST add_category handler
// PHP: INSERT INTO categories (name) VALUES (:name)
export async function addCategory(req, res) {
  const name = req.body.name?.trim() ?? '';

  if (!name) {
    return res.status(400).json({ status: 'error', message: 'Category name cannot be empty.' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO categories (name) VALUES ($1) RETURNING id, name',
      [name]
    );
    res.json({
      status: 'success',
      message: 'Category added successfully!',
      category: result.rows[0],
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Database error: ' + err.message });
  }
}

// PUT /api/categories/:id
// Converted from: actions/edit_category.php
export async function updateCategory(req, res) {
  const { id } = req.params;
  const name = req.body.name?.trim() ?? '';

  if (!name) {
    return res.status(400).json({ status: 'error', message: 'Category name cannot be empty.' });
  }

  try {
    await pool.query('UPDATE categories SET name = $1 WHERE id = $2', [name, id]);
    res.json({ status: 'success', message: 'Category updated successfully.' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Database error: ' + err.message });
  }
}

// DELETE /api/categories/:id
// Converted from: actions/delete_category.php
export async function deleteCategory(req, res) {
  const { id } = req.params;

  try {
    await pool.query('DELETE FROM categories WHERE id = $1', [id]);
    res.json({ status: 'success', message: 'Category deleted successfully.' });
  } catch (err) {
    // mirrors: items attached to this category will throw a FK constraint error
    res.status(500).json({ status: 'error', message: 'Cannot delete: category may have items attached.' });
  }
}