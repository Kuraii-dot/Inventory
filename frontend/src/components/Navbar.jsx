// frontend/src/components/Navbar.jsx
// Converted from: includes/header.php
//
// PHP: included on every page via require_once '../includes/header.php'
// React: imported into App.jsx and rendered above all routes
//
// Changes from PHP version:
//   <a href="../pages/dashboard.php">  →  <NavLink to="/dashboard">
//   header("Location: index.php")      →  navigate('/login') via logout()
//   <?= $_SESSION['username'] ?>       →  user.username from AuthContext

import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const BASE_LINKS = [
  { to: '/dashboard',     label: 'Dashboard'     },
  { to: '/allitems',      label: 'All Items'      },
  { to: '/allocation',    label: 'Allocation'     },
  { to: '/distributions', label: 'Distributions'  },
  { to: '/items',         label: 'Manage Items'   },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  // Don't render navbar on login page
  if (!user) return null;

  const NAV_LINKS = user.role === 'master_admin'
    ? [...BASE_LINKS, { to: '/admin', label: '🛡️ Admin' }]
    : BASE_LINKS;

  return (
    <nav className="bg-gradient-to-r from-slate-50 to-blue-50 backdrop-blur-sm border-b border-slate-200/60 shadow-sm sticky top-0 z-40">
      <div className="max-w-screen-xl mx-auto px-8 py-4">
        <div className="flex justify-between items-center">

          {/* ── Logo / Brand ─────────────────────────────── */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg shadow-md overflow-hidden flex items-center justify-center">
              <img src="/public/Logo.png" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="text-xl font-semibold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
                Smart Inventory
              </h1>
              <p className="text-xs text-slate-500 -mt-0.5">Management System</p>
            </div>
          </div>

          {/* ── Nav Links ─────────────────────────────────── */}
          <div className="flex items-center space-x-1">
            {NAV_LINKS.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `group relative px-5 py-2.5 font-medium transition-all duration-300 rounded-lg hover:scale-105 text-sm ` +
                  (isActive
                    ? 'text-blue-700 bg-white shadow-md'
                    : 'text-slate-600 hover:text-blue-700 hover:bg-white hover:shadow-md')
                }
              >
                {/* mirrors: the gradient hover overlay div in header.php */}
                <span className="relative z-10">{label}</span>
                <div className="absolute inset-0 bg-gradient-to-r from-blue-100 to-blue-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg" />
              </NavLink>
            ))}

            {/* ── User + Logout ────────────────────────────── */}
            <div className="flex items-center space-x-2 ml-4 pl-4 border-l border-slate-200">
              {/* mirrors: $_SESSION['username'] display */}
              {user?.username && (
                <span className="text-sm text-slate-500 font-medium">
                  👤 {user.username}
                </span>
              )}
              <button
                onClick={handleLogout}
                className="group relative px-5 py-2.5 text-slate-600 hover:text-red-600 font-medium transition-all duration-300 rounded-lg hover:bg-red-50 hover:shadow-md hover:scale-105 text-sm"
              >
                <span className="relative z-10">Logout</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </nav>
  );
}