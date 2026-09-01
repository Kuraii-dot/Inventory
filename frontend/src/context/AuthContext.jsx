// frontend/src/context/AuthContext.jsx
// Replaces: includes/auth.php session checks on every PHP page
//
// PHP checked $_SESSION['user_id'] at the top of every protected page.
// React uses a Context so ANY component can read the current user
// and any route can be protected without repeating logic.

import { createContext, useContext, useState, useEffect } from 'react';
import { loginRequest, logoutRequest, getMeRequest } from '../api/auth.js';
import { supabase } from '../api/supabase.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true); // rehydrating from localStorage

  // Supabase securely persists and refreshes the signed-in session. The public
  // users row remains the source of the Inventory username and application role.
  useEffect(() => {
    let active = true;
    const restore = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        if (active) { setUser(null); setLoading(false); }
        return;
      }
      try {
        const { user: profile } = await getMeRequest();
        if (active) {
          setUser(profile);
          localStorage.setItem('user', JSON.stringify(profile));
        }
      } catch {
        await supabase.auth.signOut({ scope: 'local' });
        if (active) setUser(null);
      } finally {
        if (active) setLoading(false);
      }
    };
    void restore();
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT' && active) {
        localStorage.removeItem('user');
        setUser(null);
      }
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  /**
   * login() — equivalent to the successful branch in index.php POST handler
   * Sets $_SESSION['user_id'], ['username'], ['role'] → stores token + user
   */
  async function login(username, password) {
    const { user } = await loginRequest(username, password);
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
