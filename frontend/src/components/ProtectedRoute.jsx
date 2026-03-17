// frontend/src/components/ProtectedRoute.jsx
// Replaces: the session check + header("Location: /index.php") in auth.php
//
// PHP: every protected page required auth.php at the top.
// React: wrap protected routes in this component in App.jsx — done once.

import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

/**
 * Usage in App.jsx:
 *   <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
 *
 * With role restriction (mirrors requireRole('admin')):
 *   <Route path="/admin" element={<ProtectedRoute role="admin"><AdminPage /></ProtectedRoute>} />
 */
export default function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth();

  // Still checking localStorage / server — don't redirect yet
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <span className="text-slate-500 text-sm">Loading...</span>
      </div>
    );
  }

  // Not logged in → redirect to login (mirrors header("Location: /index.php"))
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Wrong role → 403 (mirrors requireRole() in auth.php)
  if (role && user.role !== role) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}