// frontend/src/pages/Admin.jsx
// Master Admin Dashboard — only accessible to master_admin role

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast, ToastContainer } from '../hooks/useToast.jsx';
import Modal from '../components/Modal.jsx';
import {
  fetchAdminStats, fetchActivityLog, fetchItemMovement,
  fetchUserReport, fetchUsers, createUser, updateUser, deleteUser,
} from '../api/admin.js';

function fmtDate(str) {
  if (!str) return '—';
  return new Date(str).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' });
}

const ACTION_COLORS = {
  CREATE: 'bg-emerald-100 text-emerald-700',
  UPDATE: 'bg-blue-100 text-blue-700',
  DELETE: 'bg-red-100 text-red-700',
  LOGIN:  'bg-purple-100 text-purple-700',
  RETURN: 'bg-amber-100 text-amber-700',
};

const TYPE_COLORS = {
  IN:    'bg-emerald-100 text-emerald-700',
  OUT:   'bg-red-100 text-red-700',
  ALLOC: 'bg-blue-100 text-blue-700',
};

const ROLES = ['admin', 'master_admin'];

export default function Admin() {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const { toasts, showToast } = useToast();

  const [activeTab,  setActiveTab]  = useState('overview');
  const [stats,      setStats]      = useState(null);

  // Activity log state
  const [logs,       setLogs]       = useState([]);
  const [logFilters, setLogFilters] = useState({ search: '', module: '', action: '', start_date: '', end_date: '' });
  const [logPage,    setLogPage]    = useState(1);
  const [logTotal,   setLogTotal]   = useState(0);
  const [logPages,   setLogPages]   = useState(1);
  const [logLoading, setLogLoading] = useState(false);

  // Item movement state
  const [movements,  setMovements]  = useState([]);
  const [movLoading, setMovLoading] = useState(false);
  const [movType,    setMovType]    = useState('');
  const [movFrom,    setMovFrom]    = useState('');
  const [movTo,      setMovTo]      = useState('');
  const [movExporting, setMovExporting] = useState(false);

  // Users state
  const [users,      setUsers]      = useState([]);
  const [showAddUser,setShowAddUser]= useState(false);
  const [editUser,   setEditUser]   = useState(null);
  const [userForm,   setUserForm]   = useState({ username: '', password: '', role: 'admin' });
  const [userLoading,setUserLoading]= useState(false);

  // User report state
  const [reportUser,  setReportUser]  = useState('');
  const [reportData,  setReportData]  = useState(null);
  const [reportLoading,setReportLoading] = useState(false);

  // Redirect if not master_admin
  useEffect(() => {
    if (user && user.role !== 'master_admin') {
      navigate('/dashboard');
    }
  }, [user]);

  // Load stats on mount
  useEffect(() => {
    fetchAdminStats().then(setStats).catch(console.error);
    loadUsers();
  }, []);

  // Load logs when tab or filters change
  useEffect(() => {
    if (activeTab === 'activity') loadLogs(1);
  }, [activeTab, logFilters]);

  // Load movements when tab changes
  useEffect(() => {
    if (activeTab === 'movement') loadMovements();
  }, [activeTab, movType]);

  // ── Loaders ───────────────────────────────────────────────
  async function loadLogs(pg = 1) {
    setLogLoading(true);
    try {
      const data = await fetchActivityLog({ ...logFilters, page: pg, limit: 50 });
      setLogs(data.data ?? []);
      setLogTotal(data.total_records ?? 0);
      setLogPages(data.total_pages ?? 1);
      setLogPage(pg);
    } catch { showToast('Failed to load activity log.', 'error'); }
    finally { setLogLoading(false); }
  }

  async function loadMovements() {
    setMovLoading(true);
    try {
      const data = await fetchItemMovement({
        type:       movType     || undefined,
        start_date: movFrom     || undefined,
        end_date:   movTo       || undefined,
      });
      setMovements(data.data ?? []);
    } catch { showToast('Failed to load movements.', 'error'); }
    finally { setMovLoading(false); }
  }

  async function handleMovExport(format) {
    setMovExporting(true);
    try {
      const params = new URLSearchParams({
        format,
        ...(movType ? { type: movType } : {}),
        ...(movFrom ? { start_date: movFrom } : {}),
        ...(movTo   ? { end_date:   movTo   } : {}),
      });
      const { data } = await import('../api/client.js').then(m =>
        m.default.get(`/admin/item-movement/export?${params}`, { responseType: 'blob' })
      );
      const mime = format === 'pdf'
        ? 'application/pdf'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      const ext  = format === 'pdf' ? 'pdf' : 'xlsx';
      const url  = URL.createObjectURL(new Blob([data], { type: mime }));
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `item_movement.${ext}`;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
    } catch { showToast('Export failed.', 'error'); }
    finally { setMovExporting(false); }
  }

  async function loadUsers() {
    try {
      const data = await fetchUsers();
      setUsers(data);
    } catch { showToast('Failed to load users.', 'error'); }
  }

  async function loadUserReport() {
    if (!reportUser) return;
    setReportLoading(true);
    try {
      const data = await fetchUserReport(reportUser);
      setReportData(data);
    } catch { showToast('Failed to load user report.', 'error'); }
    finally { setReportLoading(false); }
  }

  // ── User CRUD ─────────────────────────────────────────────
  async function handleCreateUser(e) {
    e.preventDefault();
    setUserLoading(true);
    try {
      await createUser(userForm);
      showToast(`✅ User "${userForm.username}" created!`, 'success');
      setShowAddUser(false);
      setUserForm({ username: '', password: '', role: 'admin' });
      loadUsers();
    } catch (err) {
      showToast(err.response?.data?.message || 'Error creating user.', 'error');
    } finally { setUserLoading(false); }
  }

  async function handleUpdateUser(e) {
    e.preventDefault();
    setUserLoading(true);
    try {
      await updateUser(editUser.id, userForm);
      showToast(`✅ User updated!`, 'success');
      setEditUser(null);
      setUserForm({ username: '', password: '', role: 'admin' });
      loadUsers();
    } catch (err) {
      showToast(err.response?.data?.message || 'Error updating user.', 'error');
    } finally { setUserLoading(false); }
  }

  async function handleDeleteUser(id, username) {
    if (!confirm(`Delete user "${username}"? This cannot be undone.`)) return;
    try {
      await deleteUser(id);
      showToast(`✅ User "${username}" deleted.`, 'success');
      loadUsers();
    } catch (err) {
      showToast(err.response?.data?.message || 'Error deleting user.', 'error');
    }
  }

  function openEditUser(u) {
    setEditUser(u);
    setUserForm({ username: u.username, password: '', role: u.role });
  }

  const inputCls = "w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition";

  const TABS = [
    { id: 'overview',  label: '📊 Overview'       },
    { id: 'activity',  label: '📋 Activity Log'    },
    { id: 'movement',  label: '📦 Item Movement'   },
    { id: 'users',     label: '👥 User Management' },
    { id: 'reports',   label: '📄 User Reports'    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">
      <div className="max-w-screen-xl mx-auto px-8 py-10">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-2xl">🛡️</span>
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                Master Admin
              </h1>
              <p className="text-slate-400 text-sm">Full system control — logged in as {user?.username}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 flex-wrap">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2.5 rounded-xl font-medium transition-all duration-200 text-sm ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW TAB ─────────────────────────────────── */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { icon: '👥', label: 'Total Users',     value: stats?.total_users      ?? '—', color: 'from-blue-500 to-blue-600'    },
                { icon: '📋', label: 'Total Actions',   value: stats?.total_actions    ?? '—', color: 'from-purple-500 to-purple-600' },
                { icon: '⚡', label: 'Actions Today',   value: stats?.actions_today    ?? '—', color: 'from-emerald-500 to-emerald-600' },
                { icon: '🔥', label: 'Top Module',      value: stats?.top_modules?.[0]?.module ?? '—', color: 'from-amber-500 to-amber-600' },
              ].map(s => (
                <div key={s.label} className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
                  <div className={`w-12 h-12 bg-gradient-to-br ${s.color} rounded-xl flex items-center justify-center mb-4 shadow-md`}>
                    <span className="text-2xl">{s.icon}</span>
                  </div>
                  <p className="text-slate-400 text-sm">{s.label}</p>
                  <p className="text-3xl font-bold text-white mt-1">{s.value}</p>
                </div>
              ))}
            </div>

            {/* Top Modules */}
            {stats?.top_modules?.length > 0 && (
              <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
                <h3 className="text-white font-semibold mb-4">🔥 Most Active Modules</h3>
                <div className="space-y-3">
                  {stats.top_modules.map(m => (
                    <div key={m.module} className="flex items-center justify-between">
                      <span className="text-slate-300 capitalize">{m.module}</span>
                      <div className="flex items-center gap-3">
                        <div className="w-48 bg-slate-700 rounded-full h-2">
                          <div className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full"
                            style={{ width: `${Math.min((m.count / stats.total_actions) * 100 * 3, 100)}%` }} />
                        </div>
                        <span className="text-indigo-400 font-medium text-sm w-12 text-right">{m.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── ACTIVITY LOG TAB ─────────────────────────────── */}
        {activeTab === 'activity' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700">
              {/* Row 1 - Search + Module + Action */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Search</label>
                  <input type="text" placeholder="Search description or username..."
                    value={logFilters.search}
                    onChange={e => setLogFilters(f => ({ ...f, search: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm placeholder-slate-400" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Module</label>
                  <select value={logFilters.module} onChange={e => setLogFilters(f => ({ ...f, module: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm">
                    <option value="">All Modules</option>
                    {['auth','items','distributions','allocations','suppliers','categories','classifications','combinations'].map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Action</label>
                  <select value={logFilters.action} onChange={e => setLogFilters(f => ({ ...f, action: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm">
                    <option value="">All Actions</option>
                    {['CREATE','UPDATE','DELETE','LOGIN','RETURN'].map(a => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>
              </div>
              {/* Row 2 - Date range */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">From Date</label>
                  <input type="date" value={logFilters.start_date}
                    onChange={e => setLogFilters(f => ({ ...f, start_date: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">To Date</label>
                  <input type="date" value={logFilters.end_date}
                    onChange={e => setLogFilters(f => ({ ...f, end_date: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm" />
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-700 flex items-center justify-between">
                <span className="text-slate-400 text-sm">{logTotal} records found</span>
                <button onClick={() => setLogFilters({ search: '', module: '', action: '', start_date: '', end_date: '' })}
                  className="text-indigo-400 text-sm hover:text-indigo-300 transition-colors">
                  ✕ Reset filters
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table style={{ minWidth: '900px' }} className="w-full">
                  <thead>
                    <tr className="bg-slate-900 text-slate-400 text-xs uppercase">
                      {['Date','User','Action','Module','Description','IP'].map(h => (
                        <th key={h} className="py-4 px-4 text-left font-semibold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {logLoading ? (
                      <tr><td colSpan="6" className="py-12 text-center text-slate-400 animate-pulse">Loading...</td></tr>
                    ) : logs.length === 0 ? (
                      <tr><td colSpan="6" className="py-12 text-center text-slate-400">No activity found</td></tr>
                    ) : logs.map(log => (
                      <tr key={log.id} className="hover:bg-slate-750 transition-colors">
                        <td className="py-3 px-4 text-slate-400 text-xs whitespace-nowrap">{fmtDate(log.created_at)}</td>
                        <td className="py-3 px-4 text-white font-medium text-sm">{log.username}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${ACTION_COLORS[log.action] || 'bg-slate-700 text-slate-300'}`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-300 text-sm capitalize">{log.module}</td>
                        <td className="py-3 px-4 text-slate-300 text-sm max-w-xs truncate">{log.description}</td>
                        <td className="py-3 px-4 text-slate-500 text-xs">{log.ip_address || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {logPages > 1 && (
                <div className="px-6 py-4 border-t border-slate-700 flex items-center justify-between">
                  <span className="text-slate-400 text-sm">Page {logPage} of {logPages}</span>
                  <div className="flex gap-2">
                    <button disabled={logPage <= 1} onClick={() => loadLogs(logPage - 1)}
                      className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 disabled:opacity-50 text-sm">← Prev</button>
                    <button disabled={logPage >= logPages} onClick={() => loadLogs(logPage + 1)}
                      className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 disabled:opacity-50 text-sm">Next →</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── ITEM MOVEMENT TAB ────────────────────────────── */}
        {activeTab === 'movement' && (
          <div className="space-y-4">
            <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Type</label>
                  <select value={movType} onChange={e => setMovType(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm">
                    <option value="">All Types</option>
                    <option value="IN">IN (Procurement)</option>
                    <option value="OUT">OUT (Distribution)</option>
                    <option value="ALLOC">ALLOC (Allocation)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">From Date</label>
                  <input type="date" value={movFrom} onChange={e => setMovFrom(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">To Date</label>
                  <input type="date" value={movTo} onChange={e => setMovTo(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm" />
                </div>
                <div className="flex items-end">
                  <button onClick={loadMovements}
                    className="w-full px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium rounded-lg hover:shadow-lg transition-all text-sm">
                    🔎 Search
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-slate-700">
                <span className="text-slate-400 text-sm">{movements.length} records found</span>
                <div className="flex gap-2">
                  <button onClick={() => handleMovExport('pdf')} disabled={movExporting}
                    className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 text-sm disabled:opacity-60">
                    <span>📄</span><span>{movExporting ? 'Exporting...' : 'Export PDF'}</span>
                  </button>
                  <button onClick={() => handleMovExport('excel')} disabled={movExporting}
                    className="px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 text-sm disabled:opacity-60">
                    <span>📊</span><span>{movExporting ? 'Exporting...' : 'Export Excel'}</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table style={{ minWidth: '800px' }} className="w-full">
                  <thead>
                    <tr className="bg-slate-900 text-slate-400 text-xs uppercase">
                      {['Date','Item','Type','Source','Quantity','Performed By'].map(h => (
                        <th key={h} className="py-4 px-4 text-left font-semibold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {movLoading ? (
                      <tr><td colSpan="6" className="py-12 text-center text-slate-400 animate-pulse">Loading...</td></tr>
                    ) : movements.length === 0 ? (
                      <tr><td colSpan="6" className="py-12 text-center text-slate-400">No movements found</td></tr>
                    ) : movements.map((m, i) => (
                      <tr key={i} className="hover:bg-slate-750 transition-colors">
                        <td className="py-3 px-4 text-slate-400 text-xs whitespace-nowrap">{fmtDate(m.txn_date)}</td>
                        <td className="py-3 px-4 text-white font-medium text-sm">{m.item_name}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${TYPE_COLORS[m.type] || 'bg-slate-700 text-slate-300'}`}>
                            {m.type}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-300 text-sm">{m.source}</td>
                        <td className="py-3 px-4 font-semibold text-sm text-white">{m.quantity}</td>
                        <td className="py-3 px-4 text-slate-300 text-sm">{m.performed_by || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── USER MANAGEMENT TAB ──────────────────────────── */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-slate-300 text-sm">{users.length} user{users.length !== 1 ? 's' : ''}</span>
              <button onClick={() => { setShowAddUser(true); setUserForm({ username: '', password: '', role: 'admin' }); }}
                className="px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium rounded-xl hover:shadow-lg transition-all duration-300 hover:scale-105 flex items-center gap-2">
                <span>+</span><span>Add User</span>
              </button>
            </div>

            <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-900 text-slate-400 text-xs uppercase">
                    {['ID','Username','Role','Created','Actions'].map(h => (
                      <th key={h} className="py-4 px-6 text-left font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-slate-750 transition-colors">
                      <td className="py-4 px-6 text-slate-400 text-sm">{u.id}</td>
                      <td className="py-4 px-6 text-white font-medium">{u.username}</td>
                      <td className="py-4 px-6">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          u.role === 'master_admin'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-slate-400 text-sm">{fmtDate(u.created_at)}</td>
                      <td className="py-4 px-6">
                        <div className="flex gap-2">
                          <button onClick={() => openEditUser(u)}
                            className="px-3 py-1.5 bg-amber-900/50 text-amber-400 rounded-lg hover:bg-amber-900 text-xs font-medium">
                            ✏️ Edit
                          </button>
                          {u.id !== user.id && (
                            <button onClick={() => handleDeleteUser(u.id, u.username)}
                              className="px-3 py-1.5 bg-red-900/50 text-red-400 rounded-lg hover:bg-red-900 text-xs font-medium">
                              🗑️ Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── USER REPORTS TAB ─────────────────────────────── */}
        {activeTab === 'reports' && (
          <div className="space-y-4">
            <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700">
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className="block text-slate-300 text-sm font-medium mb-2">Select User</label>
                  <select value={reportUser} onChange={e => setReportUser(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-indigo-500">
                    <option value="">Select a user...</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.username} ({u.role})</option>)}
                  </select>
                </div>
                <button onClick={loadUserReport} disabled={!reportUser || reportLoading}
                  className="px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium rounded-xl hover:shadow-lg transition-all disabled:opacity-50">
                  {reportLoading ? 'Loading...' : '🔍 Generate Report'}
                </button>
              </div>
            </div>

            {reportData && (
              <div className="space-y-4">
                {/* User info */}
                <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                      <span className="text-2xl">👤</span>
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-white">{reportData.user.username}</h3>
                      <p className="text-slate-400">{reportData.user.role} — Joined {fmtDate(reportData.user.created_at)}</p>
                    </div>
                    <div className="ml-auto text-right">
                      <p className="text-3xl font-bold text-indigo-400">{reportData.total_actions}</p>
                      <p className="text-slate-400 text-sm">Total Actions</p>
                    </div>
                  </div>
                </div>

                {/* Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(reportData.summary).map(([key, count]) => (
                    <div key={key} className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                      <p className="text-slate-400 text-xs capitalize">{key.replace('_', ' ')}</p>
                      <p className="text-2xl font-bold text-white mt-1">{count}</p>
                    </div>
                  ))}
                </div>

                {/* Activity table */}
                <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table style={{ minWidth: '700px' }} className="w-full">
                      <thead>
                        <tr className="bg-slate-900 text-slate-400 text-xs uppercase">
                          {['Date','Action','Module','Description'].map(h => (
                            <th key={h} className="py-4 px-4 text-left font-semibold">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700">
                        {reportData.activity.map((log, i) => (
                          <tr key={i} className="hover:bg-slate-750">
                            <td className="py-3 px-4 text-slate-400 text-xs whitespace-nowrap">{fmtDate(log.created_at)}</td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${ACTION_COLORS[log.action] || 'bg-slate-700 text-slate-300'}`}>
                                {log.action}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-300 text-sm capitalize">{log.module}</td>
                            <td className="py-3 px-4 text-slate-300 text-sm">{log.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add User Modal */}
      <Modal open={showAddUser} onClose={() => setShowAddUser(false)}
        title="Add New User" subtitle="Create a new system account" maxWidth="max-w-md">
        <form onSubmit={handleCreateUser} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Username *</label>
            <input type="text" required value={userForm.username}
              onChange={e => setUserForm(f => ({ ...f, username: e.target.value }))}
              className={inputCls} placeholder="Enter username" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Password *</label>
            <input type="password" required value={userForm.password}
              onChange={e => setUserForm(f => ({ ...f, password: e.target.value }))}
              className={inputCls} placeholder="Enter password" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Role *</label>
            <select value={userForm.role} onChange={e => setUserForm(f => ({ ...f, role: e.target.value }))}
              className={inputCls}>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button type="button" onClick={() => setShowAddUser(false)}
              className="px-6 py-2.5 bg-slate-100 text-slate-600 font-medium rounded-lg hover:bg-slate-200 transition-colors">Cancel</button>
            <button type="submit" disabled={userLoading}
              className="px-8 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-60">
              {userLoading ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal open={!!editUser} onClose={() => setEditUser(null)}
        title="Edit User" subtitle="Update user credentials or role" maxWidth="max-w-md">
        <form onSubmit={handleUpdateUser} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Username</label>
            <input type="text" value={userForm.username}
              onChange={e => setUserForm(f => ({ ...f, username: e.target.value }))}
              className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              New Password <span className="font-normal text-slate-400">(leave blank to keep current)</span>
            </label>
            <input type="password" value={userForm.password}
              onChange={e => setUserForm(f => ({ ...f, password: e.target.value }))}
              className={inputCls} placeholder="Enter new password" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Role</label>
            <select value={userForm.role} onChange={e => setUserForm(f => ({ ...f, role: e.target.value }))}
              className={inputCls}>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button type="button" onClick={() => setEditUser(null)}
              className="px-6 py-2.5 bg-slate-100 text-slate-600 font-medium rounded-lg hover:bg-slate-200 transition-colors">Cancel</button>
            <button type="submit" disabled={userLoading}
              className="px-8 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-60">
              {userLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      <ToastContainer toasts={toasts} />
    </div>
  );
}