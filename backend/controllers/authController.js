// backend/controllers/authController.js
// Converted from: index.php (login logic) + logout.php
//
// PHP used:
//   $_POST for form data          → req.body (JSON from React)
//   password_verify()             → bcrypt.compare()
//   $_SESSION['user_id'] = ...    → jwt.sign({ id, username, role })
//   header("Location: ...")       → res.json({ token, user })
//   session_destroy()             → client discards token (stateless JWT)

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../db/pool.js';

/**
 * POST /api/auth/login
 * Converted from the POST handler in index.php
 */
export async function login(req, res) {
  const { username, password } = req.body;

  // Validation — mirrors: if ($username === "" || $password === "")
  if (!username?.trim() || !password?.trim()) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  try {
    // SQL query — identical to the one in index.php
    const result = await pool.query(
      `SELECT id, username, password, role
       FROM users
       WHERE username = $1
       LIMIT 1`,
      [username.trim()]
    );

    const user = result.rows[0];

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Invalid username or password.' });
    }

    // ✅ LOGIN SUCCESS
    // Instead of $_SESSION, we sign a JWT the React client will store
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    return res.json({
      token,
      user: {
        id:       user.id,
        username: user.username,
        role:     user.role,
      },
    });

  } catch (err) {
    console.error('Login error:', err.message);
    return res.status(500).json({ message: 'Server error.' });
  }
}

/**
 * POST /api/auth/logout
 * Converted from logout.php
 *
 * With JWT there is no server-side session to destroy.
 * The client simply deletes the token from localStorage/memory.
 * This endpoint exists as a clean API endpoint to call on logout.
 */
export function logout(req, res) {
  // session_unset() + session_destroy() → client handles token removal
  return res.json({ message: 'Logged out successfully.' });
}

/**
 * GET /api/auth/me
 * Returns the currently logged-in user from the JWT.
 * Useful for React to rehydrate auth state on page refresh.
 */
export function me(req, res) {
  return res.json({ user: req.user });
}