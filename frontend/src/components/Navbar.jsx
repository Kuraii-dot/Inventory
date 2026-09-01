import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import AppIcon from './AppIcon.jsx';

const BASE_LINKS = [
  { to: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { to: '/allitems', label: 'All Items', icon: 'boxes' },
  { to: '/allocation', label: 'Allocation', icon: 'layers' },
  { to: '/distributions', label: 'Distributions', icon: 'truck' },
  { to: '/inspection-requests', label: 'Inspection Requests', icon: 'clipboard' },
  { to: '/items', label: 'Manage Items', icon: 'settings' },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const connected = () => setOnline(true);
    const disconnected = () => setOnline(false);
    window.addEventListener('online', connected);
    window.addEventListener('offline', disconnected);
    return () => {
      window.removeEventListener('online', connected);
      window.removeEventListener('offline', disconnected);
    };
  }, []);
  if (!user) return null;
  const links = user.role === 'master_admin' ? [...BASE_LINKS, { to: '/admin', label: 'Admin', icon: 'shield' }] : BASE_LINKS;

  async function handleLogout() { await logout(); navigate('/login'); }

  return (
    <header className="app-navbar">
      <div className="app-navbar-inner">
        <NavLink to="/dashboard" className="app-brand" onClick={() => setOpen(false)}>
          <span className="app-brand-logo"><img src="/Logo.png" alt="Smart Inventory logo" /></span>
          <span className="app-brand-copy"><strong>Smart Inventory</strong><small>Management System</small></span>
        </NavLink>
        <button type="button" className="app-mobile-menu" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-label="Toggle navigation"><AppIcon name={open ? 'x' : 'menu'} size={20} /></button>
        <nav className={`app-nav-links ${open ? 'is-open' : ''}`} aria-label="Primary navigation">
          {links.map((link) => <NavLink key={link.to} to={link.to} onClick={() => setOpen(false)} className={({ isActive }) => `app-nav-link${isActive ? ' active' : ''}`}><AppIcon name={link.icon} size={16} /><span>{link.label}</span></NavLink>)}
        </nav>
        <span className={`app-cloud-status ${online ? 'is-online' : 'is-offline'}`} role="status" title={online ? 'Connected to the cloud inventory service' : 'Reconnect to use live inventory actions'}>
          <AppIcon name={online ? 'wifi' : 'wifiOff'} size={14} />
          <span>{online ? 'Cloud connected' : 'Offline'}</span>
        </span>
        <div className="app-user-menu">
          <span className="app-user-avatar"><AppIcon name={user.role === 'master_admin' ? 'shield' : 'user'} size={17} /></span>
          <span className="app-user-copy"><strong>{user.username || 'User'}</strong><small>{user.role === 'master_admin' ? 'Master Administrator' : user.role || 'Inventory User'}</small></span>
          <button type="button" onClick={handleLogout} aria-label="Log out" title="Log out"><AppIcon name="logout" size={17} /></button>
        </div>
      </div>
    </header>
  );
}
