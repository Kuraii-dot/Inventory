import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import AppIcon from '../components/AppIcon.jsx';

export default function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    if (!username.trim() || !password.trim()) { setError('All fields are required.'); return; }
    setLoading(true);
    try { await login(username, password); navigate('/dashboard'); }
    catch (err) { setError(err.response?.data?.message || 'Invalid username or password.'); }
    finally { setLoading(false); }
  }

  return (
    <main className="login-page">
      <section className="login-brand-pane">
        <div className="login-brand-mark"><img src="/Logo.png" alt="Smart Inventory logo" /><div><strong>Smart Inventory</strong><small>Management System</small></div></div>
        <div className="login-brand-message"><h1>Every item, clearly accounted for.</h1><p>A focused inventory workspace for monitoring stock, managing allocations, and keeping distributions organized.</p></div>
        <div className="login-brand-foot"><AppIcon name="shield" size={15} /> Secure inventory operations</div>
      </section>
      <section className="login-form-pane">
        <div className="login-card">
          <span className="login-card-eyebrow"><AppIcon name="sparkles" size={14} /> Welcome back</span>
          <h2>Sign in to continue</h2>
          <p>Enter your account details to open your inventory workspace.</p>
          {error && <div className="login-error" role="alert"><AppIcon name="alert" size={17} />{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="login-field"><label htmlFor="login-username">Username</label><div className="login-input-wrap"><AppIcon name="user" size={17} /><input id="login-username" type="text" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Enter your username" autoComplete="username" /></div></div>
            <div className="login-field"><label htmlFor="login-password">Password</label><div className="login-input-wrap"><AppIcon name="shield" size={17} /><input id="login-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" autoComplete="current-password" /></div></div>
            <button type="submit" disabled={loading} className="login-submit">{loading ? <><AppIcon name="refresh" size={17} className="animate-spin" /> Signing in...</> : <>Sign in <AppIcon name="arrowRight" size={17} /></>}</button>
          </form>
        </div>
      </section>
    </main>
  );
}
