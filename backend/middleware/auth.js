// backend/middleware/auth.js
// Converted from: includes/auth.php
//
// PHP used $_SESSION to store user_id and role.
// Node.js uses JWT (JSON Web Tokens) — stateless, no server-side sessions needed.
//
// PHP logic mapped to Node.js:
//   isset($_SESSION['user_id'])  →  verify JWT from Authorization header
//   requireRole('admin')         →  requireRole('admin') middleware below

import jwt from 'jsonwebtoken';

/**
 * Middleware: protect any route that requires a logged-in user.
 * Equivalent to the session check at the top of auth.php.
 *
 * Usage: router.get('/protected', authenticate, handler)
 */
export function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // "Bearer <token>"

  if (!token) {
    return res.status(401).json({ message: 'Not logged in. Token missing.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, username, role }
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
}

/**
 * Middleware factory: require a specific role.
 * Equivalent to requireRole() function in auth.php.
 *
 * Usage: router.post('/admin-only', authenticate, requireRole('admin'), handler)
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(403).json({ message: 'Access denied.' });
    }
    // master_admin can access everything
    if (req.user.role === 'master_admin') return next();
    // Check if user has one of the required roles
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied.' });
    }
    next();
  };
}