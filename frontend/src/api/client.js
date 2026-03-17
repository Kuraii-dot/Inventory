// frontend/src/api/client.js
// Replaces: all direct PHP $_POST / fetch() calls in front/js/
//
// This single axios instance:
//   1. Points to the Express backend
//   2. Automatically attaches the JWT token to every request
//   3. Redirects to /login on 401 (token expired or missing)

import axios from 'axios';

const client = axios.create({
  baseURL: '/api',          // proxied to http://localhost:5000/api by Vite
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — attach JWT from localStorage to every request
// Replaces: PHP session cookie sent automatically with every request
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — handle expired/invalid tokens globally
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default client;