// frontend/src/api/auth.js
// Replaces: the form POST in index.php and logout.php redirect

import client from './client.js';
import { inventoryAuthEmail, supabase } from './supabase.js';

/**
 * Login — converted from the POST handler in index.php
 * PHP:  $_POST['username'], $_POST['password'] → header("Location: dashboard.php")
 * React: sends JSON → receives { token, user }
 */
export async function loginRequest(username, password) {
  const { error } = await supabase.auth.signInWithPassword({
    email: inventoryAuthEmail(username),
    password,
  });
  if (error) throw error;
  const { data } = await client.get('/auth/me');
  // Do not use /auth/me itself as the event: it is also called during session
  // restoration and would create duplicate login records.
  await client.post('/auth/login-event').catch(error => {
    console.error('Could not record login activity:', error);
  });
  return data;
}

/**
 * Logout — converted from logout.php
 * PHP:  session_destroy() → header("Location: index.php")
 * React: tells server, then client removes token
 */
export async function logoutRequest() {
  await client.post('/auth/logout-event').catch(error => {
    console.error('Could not record logout activity:', error);
  });
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * Get current user — for rehydrating auth state on refresh
 */
export async function getMeRequest() {
  const { data } = await client.get('/auth/me');
  return data; // { user: { id, username, role } }
}
