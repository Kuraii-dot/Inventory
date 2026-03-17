// frontend/src/context/AuthContext.jsx
// Replaces: includes/auth.php session checks on every PHP page
//
// PHP checked $_SESSION['user_id'] at the top of every protected page.
// React uses a Context so ANY component can read the current user
// and any route can be protected without repeating logic.

import { createContext, useContext, useState, useEffect } from 'react';
import { loginRequest, logoutRequest, getMeRequest } from '../api/auth.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true); // rehydrating from localStorage

  // On app load: restore session from localStorage (like PHP re-reading $_SESSION)
  useEffect(() => {
    const token    = localStorage.getItem('token');
    const stored   = localStorage.getItem('user');

    if (token && stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem('user');
      }
      // Optionally verify with server (catches expired tokens)
      getMeRequest()
        .then(({ user }) => setUser(user))
        .catch(() => {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  /**
   * login() — equivalent to the successful branch in index.php POST handler
   * Sets $_SESSION['user_id'], ['username'], ['role'] → stores token + user
   */
  async function login(username, password) {
    const { token, user } = await loginRequest(username, password);
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setUser(user);
    return user;
  }

  /**
   * logout() — equivalent to logout.php
   * session_destroy() → remove token from localStorage
   */
  async function logout() {
    try { await logoutRequest(); } catch (_) {}
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  }

  /**
   * hasRole() — equivalent to requireRole() in auth.php
   * Usage: if (!hasRole('admin')) return <Navigate to="/dashboard" />
   */
  function hasRole(role) {
    return user?.role === role;
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook — use this instead of useContext(AuthContext) directly
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}