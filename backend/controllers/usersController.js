// backend/controllers/usersController.js

import bcrypt from 'bcryptjs';
import pool   from '../db/pool.js';

// GET /api/users
export async function getUsers(req, res) {
  try {
    let result;
    try {
      result = await pool.query(
        `SELECT id, username, role, created_at,
                (auth_user_id IS NOT NULL) AS cloud_ready
         FROM users
         WHERE role <> 'integration'
         ORDER BY id ASC`
      );
    } catch (error) {
      // Preserve the LAN rollback build until the cloud migration is applied.
      if (error.code !== '42703') throw error;
      result = await pool.query(
        `SELECT id, username, role, created_at, false AS cloud_ready
         FROM users ORDER BY id ASC`
      );
    }
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// POST /api/users
export async function createUser(req, res) {
  const { username, password, role = 'admin' } = req.body;
  if (!username?.trim() || !password?.trim())
    return res.status(400).json({ message: 'Username and password are required.' });

  try {
    // Check duplicate
    const exists = await pool.query('SELECT id FROM users WHERE username = $1', [username.trim()]);
    if (exists.rows[0])
      return res.status(400).json({ message: 'Username already exists.' });

    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (username, password, role) VALUES ($1, $2, $3) RETURNING id, username, role`,
      [username.trim(), hash, role]
    );
    res.json({ message: `User "${username}" created successfully!`, user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// PUT /api/users/:id
export async function updateUser(req, res) {
  const { id } = req.params;
  const { username, password, role } = req.body;

  try {
    const existing = await pool.query('SELECT id, username FROM users WHERE id = $1', [id]);
    if (!existing.rows[0])
      return res.status(404).json({ message: 'User not found.' });

    // Build dynamic update
    const fields  = [];
    const params  = [];
    let   idx     = 1;

    if (username?.trim()) { fields.push(`username = $${idx++}`); params.push(username.trim()); }
    if (password?.trim()) {
      const hash = await bcrypt.hash(password, 10);
      fields.push(`password = $${idx++}`);
      params.push(hash);
    }
    if (role) { fields.push(`role = $${idx++}`); params.push(role); }

    if (!fields.length)
      return res.status(400).json({ message: 'Nothing to update.' });

    params.push(id);
    await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE id = $${idx}`, params);

    res.json({ message: `User "${existing.rows[0].username}" updated successfully!` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// DELETE /api/users/:id
export async function deleteUser(req, res) {
  const { id } = req.params;

  // Prevent deleting yourself
  if (parseInt(id) === req.user.id)
    return res.status(400).json({ message: 'You cannot delete your own account.' });

  try {
    const existing = await pool.query('SELECT username FROM users WHERE id = $1', [id]);
    if (!existing.rows[0])
      return res.status(404).json({ message: 'User not found.' });

    await pool.query('DELETE FROM users WHERE id = $1', [id]);
    res.json({ message: `User "${existing.rows[0].username}" deleted.` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}
