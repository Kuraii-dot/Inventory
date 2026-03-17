// frontend/src/pages/Login.jsx
// Converted from: index.php (the HTML form + PHP POST handler)
//
// PHP form:  <form method="POST"> → $_POST['username'], $_POST['password']
// React:     controlled inputs    → login() from AuthContext → navigate('/dashboard')

import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const { login, user } = useAuth();
  const navigate        = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');   // mirrors $error in PHP
  const [loading, setLoading]   = useState(false);

  // Already logged in → go straight to dashboard
  // Mirrors: the session check redirect at the top of index.php
  if (user) return <Navigate to="/dashboard" replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    // Mirrors: if ($username === "" || $password === "")
    if (!username.trim() || !password.trim()) {
      setError('All fields are required.');
      return;
    }

    setLoading(true);
    try {
      const loggedIn = await login(username, password);
      // Mirrors: header("Location: pages/dashboard.php")
      navigate('/dashboard');
    } catch (err) {
      // Mirrors: $error = "Invalid username or password."
      setError(err.response?.data?.message || 'Invalid username or password.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="bg-gray-100">
      <div className="flex items-center justify-center min-h-screen p-6">
        <div className="relative flex flex-col m-6 space-y-8 bg-white shadow-2xl rounded-2xl md:space-y-0 max-w-md w-full overflow-hidden border border-slate-200">

          <div className="flex flex-col justify-center p-8 md:p-14 flex-1">
            <div className="text-center mb-8">
              <span className="text-3xl font-bold bg-gradient-to-r from-slate-700 to-blue-600 bg-clip-text text-transparent md:text-4xl">
                Smart Inventory System
              </span>
              <span className="mt-4 text-lg text-slate-500 block">
                Welcome! Please enter your account to proceed.
              </span>
            </div>

            {/* Error message — mirrors PHP $error display */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 placeholder-slate-400"
                  placeholder="Enter your username"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 placeholder-slate-400"
                  placeholder="Enter your password"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-lg shadow-md hover:shadow-xl transition-all duration-300 hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {loading ? 'Logging in...' : 'Login'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}