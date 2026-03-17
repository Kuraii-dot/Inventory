// frontend/src/api/auth.js
// Replaces: the form POST in index.php and logout.php redirect

import client from './client.js';

/**
 * Login — converted from the POST handler in index.php
 * PHP:  $_POST['username'], $_POST['password'] → header("Location: dashboard.php")
 * React: sends JSON → receives { token, user }
 */
export async function loginRequest(username, password) {
  const { data } = await client.post('/auth/login', { username, password });
  return data; // { token, user: { id, username, role } }
}

/**
 * Logout — converted from logout.php
 * PHP:  session_destroy() → header("Location: index.php")
 * React: tells server, then client removes token
 */
export async function logoutRequest() {
  await client.post('/auth/logout');
}

/**
 * Get current user — for rehydrating auth state on refresh
 */
export async function getMeRequest() {
  const { data } = await client.get('/auth/me');
  return data; // { user: { id, username, role } }
}