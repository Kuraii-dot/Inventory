import axios from 'axios';
import { getAccessToken, publishableKey, supabase } from './supabase.js';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api`
    : '/api',
  headers: {
    'Content-Type': 'application/json',
    apikey: publishableKey,
  },
});

client.interceptors.request.use(async (config) => {
  if (!navigator.onLine) {
    const error = new Error('Smart Inventory is offline. Reconnect before loading or changing live inventory data.');
    error.response = { data: { message: error.message }, status: 0 };
    return Promise.reject(error);
  }
  const accessToken = await getAccessToken();
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('user');
      void supabase.auth.signOut({ scope: 'local' });
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default client;
