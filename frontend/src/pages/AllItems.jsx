// frontend/src/pages/AllItems.jsx

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchAllOverview, fetchClassifications, fetchItemsByClassification } from '../api/items.js';
import { fetchCategories } from '../api/items.js';
import { useToast, ToastContainer } from '../hooks/useToast.jsx';
import Modal       from '../components/Modal.jsx';
import client      from '../api/client.js';
import ReportModal from '../components/ReportModal.jsx';

// ── Helpers ───────────────────────────────────────────────────
function usageRate(stock, distributed) {
  if (!stock) return 0;
  return Math.min((distributed / stock) * 100, 100);
}

function usageLabel(rate) {
  if (rate > 80) return { color: 'text-red-600',    bar: 'bg-red-500',    bg: 'bg-red-50',    label: 'High Usage'  };
  if (rate > 50) return { color: 'text-amber-600',  bar: 'bg-amber-500',  bg: 'bg-amber-50',  label: 'Moderate'    };
  return           { color: 'text-emerald-600', bar: 'bg-emerald-500', bg: 'bg-emerald-50', label: 'Low Usage'   };
}

export default function AllItems() {
  const navigate = useNavigate();
  const { toasts, showToast } = useToast();

  const [items,      setItems]      = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [expanded,   setExpanded]   = useState({});

  // Modal visibility
  const [showReport,       setShowReport]       = useState(false);
  const [showInventoryRpt, setShowInventoryRpt] = useState(false);
  const [invRptLoading,    setInvRptLoading]    = useState(false);
  const [invRptFormat,     setInvRptFormat]     = useState('pdf');
  const [showDepartment, setShowDepartment] = useState(false);
  const [showLedger,     setShowLedger]     = useState(false);

  // Ledger data state
  const [ledgerData,    setLedgerData]    = useState(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerError,   setLedgerError]   = useState('');

  // Ledger cascade state
  const [ledgerCat,   setLedgerCat]   = useState('');
  const [ledgerCls,   setLedgerCls]   = useState('');
  const [ledgerItem,  setLedgerItem]  = useState('');
  const [clsOptions,  setClsOptions]  = useState([]);
  const [itemOptions, setItemOptions] = useState([]);

  // Per-group sort state: { [catName]: { field, dir } }
  const [groupSort, setGroupSort] = useState({});

  // Inventory preview state
  const [invPreview,        setInvPreview]        = useState(null);
  const [invPreviewLoading, setInvPreviewLoading] = useState(false);
  const [invPreviewError,   setInvPreviewError]   = useState('');
  const [invDateFrom,       setInvDateFrom]       = useState('');
  const [invDateTo,         setInvDateTo]         = useState('');
  const [invFilterType,     setInvFilterType]     = useState('all');
  const [invExporting,      setInvExporting]      = useState(false);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [overview, cats] = await Promise.all([fetchAllOverview(), fetchCategories()]);
        setItems(overview);
        setCategories(cats);
      } catch {
        showToast('Error loading items.', 'error');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // ── Group by category ─────────────────────────────────────
  const grouped = useMemo(() => {
    const filtered = search
      ? items.filter(i =>
          i.item_name.toLowerCase().includes(search.toLowerCase()) ||
          (i.category_name ?? '').toLowerCase().includes(search.toLowerCase()))
      : items;

    const groups = filtered.reduce((acc, row) => {
      const cat = row.category_name ?? 'Uncategorized';
      (acc[cat] ??= []).push(row);
      return acc;
    }, {});

    // Apply per-group sort
    Object.keys(groups).forEach(cat => {
      const sort = groupSort[cat];
      if (sort) {
        groups[cat] = [...groups[cat]].sort((a, b) => {
          const av = (a.item_name ?? '').toLowerCase();
          const bv = (b.item_name ?? '').toLowerCase();
          if (av < bv) return sort.dir === 'asc' ? -1 : 1;
          if (av > bv) return sort.dir === 'asc' ? 1 : -1;
          return 0;
        });
      }
    });

    return groups;
  }, [items, search, groupSort]);

  // ── Stats ─────────────────────────────────────────────────
  const stats = useMemo(() => {
    let high = 0, moderate = 0, low = 0, variants = 0;
    items.forEach(i => {
      const r = usageRate(i.total_stock, i.total_distributed);
      if (r > 80) high++; else if (r > 50) moderate++; else low++;
      if (i.variant_count > 1) variants++;
    });
    return { high, moderate, low, variants };
  }, [items]);

  const visibleCount = Object.values(grouped).flat().length;

  function toggleGroup(cat) {
    setExpanded(prev => ({ ...prev, [cat]: !prev[cat] }));
  }

  // ── Ledger cascade ────────────────────────────────────────
  async function handleLedgerCatChange(catId) {
    setLedgerCat(catId);
    setLedgerCls('');
    setLedgerItem('');
    setClsOptions([]);
    setItemOptions([]);
    if (!catId) return;
    const data = await fetchClassifications(catId);
    setClsOptions(data);
  }

  async function handleLedgerClsChange(clsId) {
    setLedgerCls(clsId);
    setLedgerItem('');
    setItemOptions([]);
    if (!clsId) return;
    const data = await fetchItemsByClassification(clsId);
    setItemOptions(data);
  }

  // ── Inventory Preview ────────────────────────────────────
  function buildInvParams() {
    const params = {};
    if (invFilterType === 'category'       && ledgerCat) params.category_id       = ledgerCat;
    if (invFilterType === 'classification' && ledgerCls) params.classification_id = ledgerCls;
    if (invFilterType === 'period') {
      if (invDateFrom) params.date_from = invDateFrom;
      if (invDateTo)   params.date_to   = invDateTo;
    }
    if (invFilterType === 'month') {
      const now = new Date();
      params.date_from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      params.date_to   = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    }
    return params;
  }

  async function loadInvPreview() {
    setInvPreviewLoading(true);
    setInvPreviewError('');
    setInvPreview(null);
    try {
      const params = buildInvParams();
      const res = await client.get('/reports/inventory-preview', { params });
      setInvPreview(res.data ?? []);
    } catch {
      setInvPreviewError('Failed to load preview.');
    } finally {
      setInvPreviewLoading(false);
    }
  }

  async function handleInvExport(format) {
    setInvExporting(true);
    try {
      const params = { ...buildInvParams(), format };
      const { data } = await client.get('/reports/inventory', { params, responseType: 'blob' });
      const mime = format === 'pdf'
        ? 'application/pdf'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      const ext  = format === 'pdf' ? 'pdf' : 'xlsx';
      const url  = URL.createObjectURL(new Blob([data], { type: mime }));
      const a    = document.createElement('a');
      a.href = url; a.download = `inventory_report.${ext}`;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
    } catch { showToast('Export failed.', 'error'); }
    finally { setInvExporting(false); }
  }

  async function handleInventoryReport(format) {
    setInvRptLoading(true);
    try {
      const { data } = await client.get(`/reports/inventory?format=${format}`, { responseType: 'blob' });
      const mime = format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      const ext  = format === 'pdf' ? 'pdf' : 'xlsx';
      const url  = URL.createObjectURL(new Blob([data], { type: mime }));
      const a    = document.createElement('a');
      a.href = url; a.download = `inventory_report.${ext}`;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
    } catch { showToast('Failed to generate report.', 'error'); }
    finally { setInvRptLoading(false); }
  }

  function toggleGroupSort(catName) {
    setGroupSort(prev => {
      const cur = prev[catName];
      if (!cur || cur.dir === 'desc') return { ...prev, [catName]: { dir: 'asc' } };
      return { ...prev, [catName]: { dir: 'desc' } };
    });
  }

  function groupSortIcon(catName) {
    const sort = groupSort[catName];
    if (!sort) return 'A→Z';
    return sort.dir === 'asc' ? 'A→Z ↑' : 'Z→A ↓';
  }

  const selectCls = "w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition";

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-sky-50 to-slate-200">
      <div className="max-w-screen-xl mx-auto px-8 py-10">

        {/* ── Header ─────────────────────────────────────── */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-amber-600 to-sky-600 bg-clip-text text-transparent mb-2">
              All Items Overview
            </h1>
            <p className="text-slate-500 text-sm">Complete lifetime inventory summary with all-time distribution tracking</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowDepartment(true)}
              className="px-5 py-2.5 bg-amber-50 text-sky-600 font-medium rounded-xl border-2 border-amber-300 hover:border-sky-400 hover:shadow-lg transition-all duration-300 hover:scale-105 flex items-center gap-2">
              <span>🏢</span><span>Department Reports</span>
            </button>
            <button onClick={() => setShowReport(true)}
              className="px-5 py-2.5 bg-amber-50 text-sky-600 font-medium rounded-xl border-2 border-amber-300 hover:border-sky-400 hover:shadow-lg transition-all duration-300 hover:scale-105 flex items-center gap-2">
              <span>📊</span><span>Item Reports</span>
            </button>
            <button onClick={() => setShowLedger(true)}
              className="px-6 py-2.5 bg-gradient-to-r from-amber-400 to-sky-500 text-white border-2 border-amber-400 font-semibold rounded-xl shadow-md hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center gap-2">
              <span>📂</span><span>Item Ledger</span>
            </button>
          </div>
        </div>

        {/* ── Info Banner ────────────────────────────────── */}
        <div className="bg-gradient-to-r from-amber-50 to-sky-50 border border-amber-200 rounded-xl p-5 mb-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-xl">ℹ️</span>
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 mb-1">Combined View</h3>
              <p className="text-sm text-slate-600">
                Items with the same name are combined. Distribution counts show all-time totals.
              </p>
            </div>
          </div>
        </div>

        {/* ── Search Bar ─────────────────────────────────── */}
        <div className="bg-gradient-to-r from-amber-50 to-sky-50 rounded-2xl shadow-sm border border-amber-200 p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by item name or category..."
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-400 focus:border-transparent transition" />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <span className="font-medium">Showing:</span>
              <span className="font-bold text-sky-600">{visibleCount}</span>
              <span className="text-slate-400">/ {items.length} items</span>
            </div>
            <button onClick={() => navigate('/items')}
              className="px-6 py-2.5 bg-gradient-to-r from-amber-400 to-sky-500 text-white font-medium rounded-lg hover:shadow-lg transition-all duration-300 hover:scale-105">
              Manage Items
            </button>
          </div>
        </div>

        {/* ── Items Table ─────────────────────────────────── */}
        <div className="bg-gradient-to-r from-amber-50 to-sky-50 rounded-2xl shadow-sm border border-amber-100 overflow-hidden">
          <table style={{ minWidth: "1200px" }} className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-amber-300 to-sky-600 text-white">
                {['#', 'Item Name', 'Category', 'Total Stock', 'All-Time Distributed', 'Usage Rate'].map(h => (
                  <th key={h} className="py-4 px-6 text-center text-xs font-semibold uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-16 text-center text-slate-400 animate-pulse">Loading...</td>
                </tr>
              ) : Object.keys(grouped).length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-16 text-center">
                    <div className="flex flex-col items-center">
                      <span className="text-3xl mb-4">📦</span>
                      <p className="text-slate-500 font-medium">No items found</p>
                    </div>
                  </td>
                </tr>
              ) : Object.entries(grouped).map(([catName, catItems]) => {
                const catTotal = catItems.reduce((s, i) => s + Number(i.total_stock), 0);
                const catDist  = catItems.reduce((s, i) => s + Number(i.total_distributed), 0);
                const isOpen   = !!expanded[catName];

                return [
                  // Group header row
                  <tr key={`h-${catName}`}
                    className="cursor-pointer bg-gradient-to-r from-amber-50 to-sky-50 hover:from-amber-100 hover:to-sky-100 border-b-2 border-amber-200"
                    onClick={() => toggleGroup(catName)}>
                    <td colSpan="6" className="py-4 px-6 font-semibold text-slate-800">
                      <div className="flex items-center gap-3">
                        <span className={`text-amber-600 font-bold text-lg inline-block transition-transform duration-300 ${isOpen ? 'rotate-90' : ''}`}>
                          ⮞
                        </span>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sky-700">📦 {catName}</span>
                            <span className="px-2 py-0.5 bg-amber-200 text-amber-800 rounded-full text-xs font-medium">
                              {catItems.length} item{catItems.length !== 1 ? 's' : ''}
                            </span>
                            <span className="px-2 py-0.5 bg-sky-100 text-sky-700 rounded-full text-xs font-medium">
                              Stock: {catTotal.toLocaleString()}
                            </span>
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
                              Distributed: {catDist.toLocaleString()}
                            </span>
                            {isOpen && (
                              <button
                                onClick={e => { e.stopPropagation(); toggleGroupSort(catName); }}
                                className="px-2 py-0.5 bg-white border border-amber-300 text-amber-700 rounded-full text-xs font-medium hover:bg-amber-50 transition-colors">
                                🔤 {groupSortIcon(catName)}
                              </button>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-1">Click to expand / collapse</p>
                        </div>
                      </div>
                    </td>
                  </tr>,

                  // Item rows
                  ...(!isOpen ? [] : catItems.map((row, idx) => {
                    const rate = usageRate(row.total_stock, row.total_distributed);
                    const u    = usageLabel(rate);
                    return (
                      <tr key={`${catName}-${idx}`}
                        className="hover:bg-amber-50/50 border-l-4 border-sky-300 transition-colors duration-150">
                        <td className="py-3 px-6 text-slate-500 font-medium text-center">{idx + 1}</td>
                        <td className="py-3 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-gradient-to-br from-amber-100 to-sky-200 rounded-lg flex items-center justify-center">
                              <span className="text-sm">📦</span>
                            </div>
                            <div>
                              <p className="font-semibold text-sky-900 text-sm">{row.item_name}</p>
                              {row.variant_count > 1 && (
                                <p className="text-xs text-slate-500">{row.variant_count} variants combined</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-6 text-center">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                            {row.category_name ?? 'Uncategorized'}
                          </span>
                        </td>
                        <td className="py-3 px-6 text-center">
                          <span className="font-bold text-amber-800">{Number(row.total_stock).toLocaleString()}</span>
                          <span className="text-xs text-sky-500 ml-1">units</span>
                        </td>
                        <td className="py-3 px-6">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-amber-600">{Number(row.total_distributed).toLocaleString()}</span>
                            <span className="text-xs text-sky-500">units</span>
                          </div>
                          <div className="bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden">
                            <div className={`${u.bar} h-full transition-all duration-300`} style={{ width: `${rate}%` }} />
                          </div>
                        </td>
                        <td className="py-3 px-6 text-center">
                          <div className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg ${u.bg}`}>
                            <span className={`font-bold ${u.color}`}>{rate.toFixed(1)}%</span>
                            <span className="text-xs text-slate-600 font-medium">{u.label}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  }))
                ];
              })}
            </tbody>
          </table>
        </div>

        {/* ── Stats Cards ─────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6">
          {[
            { bg: 'bg-emerald-100', icon: '📊', label: 'Low Usage',         val: stats.low,      cls: 'text-emerald-600' },
            { bg: 'bg-amber-100',   icon: '📈', label: 'Moderate Usage',    val: stats.moderate, cls: 'text-amber-600'   },
            { bg: 'bg-red-100',     icon: '🔥', label: 'High Usage',        val: stats.high,     cls: 'text-red-600'     },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 ${s.bg} rounded-lg flex items-center justify-center`}>
                  <span className="text-2xl">{s.icon}</span>
                </div>
                <div>
                  <p className="text-sm text-slate-500">{s.label}</p>
                  <p className={`text-2xl font-bold ${s.cls}`}>{s.val}</p>
                </div>
              </div>
            </div>
          ))}

          {/* Multiple Variants — same size card with simple hover */}
          <div className="relative bg-white rounded-xl shadow-sm border border-slate-100 p-6 group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">🔀</span>
              </div>
              <div>
                <p className="text-sm text-slate-500">Multiple Variants</p>
                <p className="text-2xl font-bold text-indigo-600">{stats.variants}</p>
              </div>
            </div>
            {stats.variants > 0 && (
              <div className="absolute bottom-full left-0 mb-2 w-64 bg-white border border-indigo-200 rounded-xl shadow-xl p-3 z-20 hidden group-hover:block">
                <p className="font-semibold text-slate-700 text-xs mb-2">Items with multiple variants:</p>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {items.filter(i => i.variant_count > 1).map((i, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs py-0.5">
                      <span className="text-slate-700 truncate flex-1">{i.item_name}</span>
                      <span className="ml-2 px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded-full flex-shrink-0">{i.variant_count}x</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>

      </div>

      {/* ── Item Report Modal ──────────────────────────────── */}
      <ReportModal
        open={showReport}
        onClose={() => setShowReport(false)}
        type="overall"
        categories={categories}
      />

      {/* ── Department Report Modal ───────────────────────── */}
      <ReportModal
        open={showDepartment}
        onClose={() => setShowDepartment(false)}
        type="department"
      />

      {/* ── Ledger Modal ───────────────────────────────────── */}
      <Modal open={showLedger} onClose={() => { setShowLedger(false); setLedgerData(null); setInvPreview(null); }}
        title="📂 Item Ledger" subtitle="View transaction history and movement preview" maxWidth="max-w-5xl">

        {/* ── Tabs ── */}
        <div className="flex gap-2 mb-6">
          {[
            { id: 'ledger',  label: '📋 Item Ledger'   },
            { id: 'preview', label: '👁️ Movement Preview' },
          ].map(t => (
            <button key={t.id}
              onClick={() => { setLedgerData(null); setInvPreview(null); }}
              className="px-5 py-2 rounded-xl font-medium text-sm border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors">
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Inventory Preview & Report ── */}
        <div className="bg-gradient-to-r from-emerald-50 to-sky-50 rounded-xl p-5 border border-emerald-200 mb-4">
          <h3 className="font-semibold text-slate-700 mb-3">📋 Inventory Preview & Report</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Filter Type</label>
              <select value={invFilterType} onChange={e => { setInvFilterType(e.target.value); setInvPreview(null); }}
                className={selectCls}>
                <option value="all">All Items</option>
                <option value="category">By Category</option>
                <option value="classification">By Classification</option>
                <option value="period">Custom Period</option>
                <option value="month">This Month</option>
              </select>
            </div>
            {(invFilterType === 'category' || invFilterType === 'classification') && (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Category</label>
                <select value={ledgerCat} onChange={e => handleLedgerCatChange(e.target.value)} className={selectCls}>
                  <option value="">Select Category</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}
            {invFilterType === 'classification' && (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Classification</label>
                <select value={ledgerCls} onChange={e => handleLedgerClsChange(e.target.value)}
                  disabled={!clsOptions.length}
                  className={`${selectCls} disabled:bg-slate-100 disabled:cursor-not-allowed`}>
                  <option value="">Select Classification</option>
                  {clsOptions.map(c => <option key={c.id} value={c.id}>{c.classification_name}</option>)}
                </select>
              </div>
            )}
            {(invFilterType === 'category' || invFilterType === 'classification') && (<>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">From Date</label>
                <input type="date" value={invDateFrom} onChange={e => setInvDateFrom(e.target.value)} className={selectCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">To Date</label>
                <input type="date" value={invDateTo} onChange={e => setInvDateTo(e.target.value)} className={selectCls} />
              </div>
            </>)}
            {invFilterType === 'period' && (<>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">From Date</label>
                <input type="date" value={invDateFrom} onChange={e => setInvDateFrom(e.target.value)} className={selectCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">To Date</label>
                <input type="date" value={invDateTo} onChange={e => setInvDateTo(e.target.value)} className={selectCls} />
              </div>
            </>)}
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 mt-1">
            <button onClick={loadInvPreview} disabled={invPreviewLoading}
              className="px-5 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium rounded-lg hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2 text-sm">
              {invPreviewLoading ? '⏳ Loading...' : '👁️ Preview'}
            </button>
            <button onClick={() => handleInvExport('pdf')} disabled={invExporting}
              className="px-5 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 text-sm disabled:opacity-50">
              📄 Export PDF
            </button>
            <button onClick={() => handleInvExport('excel')} disabled={invExporting}
              className="px-5 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 text-sm disabled:opacity-50">
              📊 Export Excel
            </button>
          </div>

          {invPreviewError && <p className="text-red-600 text-sm mt-2">{invPreviewError}</p>}

          {invPreview && (
            <div className="mt-4 overflow-x-auto rounded-xl border border-emerald-200">
              <table style={{ minWidth: '750px' }} className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs uppercase">
                    {['Item Code','Item Description','Unit','In Stock','Unit Price','Amount'].map(h => (
                      <th key={h} className={`py-3 px-4 font-semibold ${h !== 'Item Code' && h !== 'Item Description' && h !== 'Unit' ? 'text-right' : 'text-left'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-100">
                  {invPreview.length === 0 ? (
                    <tr><td colSpan="6" className="py-8 text-center text-slate-400">No items found</td></tr>
                  ) : invPreview.map((item, i) => (
                    <tr key={i} className={`hover:bg-emerald-50/50 ${i % 2 === 1 ? 'bg-slate-50' : ''}`}>
                      <td className="py-2 px-4 text-xs text-slate-500">{item.sku || '—'}</td>
                      <td className="py-2 px-4 text-sm font-medium text-slate-800">{item.name}</td>
                      <td className="py-2 px-4 text-sm text-slate-600">{item.unit || 'Pcs'}</td>
                      <td className="py-2 px-4 text-sm text-slate-800 text-right font-semibold">{item.quantity}</td>
                      <td className="py-2 px-4 text-sm text-slate-800 text-right">₱{parseFloat(item.unit_price ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                      <td className="py-2 px-4 text-sm text-slate-800 text-right font-semibold">₱{parseFloat(item.amount ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
                {invPreview.length > 0 && (
                  <tfoot>
                    <tr className="bg-emerald-700 text-white">
                      <td colSpan="5" className="py-2 px-4 text-sm font-bold">GRAND TOTAL</td>
                      <td className="py-2 px-4 text-sm font-bold text-right">
                        ₱{invPreview.reduce((s, i) => s + parseFloat(i.amount ?? 0), 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
              <div className="px-4 py-2 bg-emerald-50 border-t border-emerald-200 text-xs text-slate-500">
                {invPreview.length} item{invPreview.length !== 1 ? 's' : ''} found
              </div>
            </div>
          )}
        </div>

        {/* ── Item Ledger Section ── */}
        <div className="bg-white rounded-xl p-5 border border-sky-200">
          <h3 className="font-semibold text-slate-700 mb-3">📋 Item Ledger</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Category</label>
              <select value={ledgerCat} onChange={e => handleLedgerCatChange(e.target.value)} className={selectCls}>
                <option value="">Select Category</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Classification</label>
              <select value={ledgerCls} onChange={e => handleLedgerClsChange(e.target.value)}
                disabled={!clsOptions.length}
                className={`${selectCls} disabled:bg-slate-100 disabled:cursor-not-allowed`}>
                <option value="">Select Classification</option>
                {clsOptions.map(c => <option key={c.id} value={c.id}>{c.classification_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Item</label>
              <select value={ledgerItem} onChange={e => setLedgerItem(e.target.value)}
                disabled={!itemOptions.length}
                className={`${selectCls} disabled:bg-slate-100 disabled:cursor-not-allowed`}>
                <option value="">Select Item</option>
                {itemOptions.map(i => <option key={i.id} value={i.id}>{i.name} (Stock: {i.quantity})</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-center">
            <button
              disabled={!ledgerItem || ledgerLoading}
              onClick={async () => {
                if (!ledgerItem) return;
                setLedgerLoading(true);
                setLedgerError('');
                setLedgerData(null);
                try {
                  const { data } = await client.get(`/ledger/${ledgerItem}`);
                  setLedgerData(data);
                } catch (err) {
                  setLedgerError(err.response?.data?.message || 'Failed to load ledger.');
                } finally {
                  setLedgerLoading(false);
                }
              }}
              className="px-6 py-2.5 bg-gradient-to-r from-amber-400 to-sky-500 text-white font-medium rounded-lg hover:shadow-lg transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
              {ledgerLoading ? <><span>⏳</span><span>Loading...</span></> : <><span>🔍</span><span>Find Transactions</span></>}
            </button>
          </div>
        </div>

        {ledgerError && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">{ledgerError}</div>
        )}

        {ledgerData && (
          <div>
            {/* Item info card */}
            <div className="bg-white rounded-xl p-6 mb-4 border border-sky-200 flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-amber-100 to-sky-200 rounded-xl flex items-center justify-center">
                <span className="text-2xl">📦</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800">{ledgerData.item_info.name}</h3>
                <p className="text-sm text-slate-500">{ledgerData.item_info.category} · {ledgerData.item_info.classification}</p>
                <p className="text-sm font-medium text-emerald-600">Current Stock: <strong>{ledgerData.item_info.current_stock}</strong> units</p>
              </div>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-5 gap-4 mb-4">
              {[
                { label: 'Transactions', val: ledgerData.summary.txn_count,     bg: 'bg-white',        cls: 'text-slate-700'   },
                { label: 'Total IN',     val: `+${ledgerData.summary.total_in}`, bg: 'bg-emerald-50',   cls: 'text-emerald-600' },
                { label: 'Total OUT',    val: `-${ledgerData.summary.total_out}`,bg: 'bg-red-50',       cls: 'text-red-600'     },
                { label: 'Returns',      val: `+${ledgerData.summary.total_returns}`, bg: 'bg-blue-50', cls: 'text-blue-600'    },
                { label: 'Current Stock',val: ledgerData.summary.current_stock,  bg: 'bg-amber-50',    cls: 'text-amber-600'   },
              ].map(s => (
                <div key={s.label} className={`${s.bg} rounded-xl p-4 border border-slate-100 shadow-sm text-center`}>
                  <p className="text-xs text-slate-500 mb-1">{s.label}</p>
                  <p className={`text-2xl font-bold ${s.cls}`}>{s.val}</p>
                </div>
              ))}
            </div>

            {/* Export buttons — must use axios to send JWT token */}
            <div className="flex justify-end gap-3 mb-4">
              <button
                onClick={async () => {
                  const { data } = await client.get(`/ledger/${ledgerItem}/export?format=pdf`, { responseType: 'blob' });
                  const url = URL.createObjectURL(new Blob([data], { type: 'application/pdf' }));
                  const a = document.createElement('a'); a.href = url;
                  a.download = `ledger_${ledgerData.item_info.name}.pdf`;
                  document.body.appendChild(a); a.click();
                  document.body.removeChild(a); URL.revokeObjectURL(url);
                }}
                className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 text-sm">
                <span>📄</span><span>Export PDF</span>
              </button>
              <button
                onClick={async () => {
                  const { data } = await client.get(`/ledger/${ledgerItem}/export?format=excel`, { responseType: 'blob' });
                  const url = URL.createObjectURL(new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
                  const a = document.createElement('a'); a.href = url;
                  a.download = `ledger_${ledgerData.item_info.name}.xlsx`;
                  document.body.appendChild(a); a.click();
                  document.body.removeChild(a); URL.revokeObjectURL(url);
                }}
                className="px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 text-sm">
                <span>📊</span><span>Export Excel</span>
              </button>
            </div>

            {/* Ledger table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-gradient-to-r from-amber-300 to-sky-600 text-white">
                      {['Date','Type','Reference','Quantity','Balance','Details'].map(h => (
                        <th key={h} className="py-3 px-4 text-left text-xs font-semibold uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ledgerData.data.length === 0 ? (
                      <tr><td colSpan="6" className="py-10 text-center text-slate-400 text-sm">No transactions found.</td></tr>
                    ) : ledgerData.data.map((row, i) => {
                      const isIn = row.type !== 'OUT';
                      const typeBg = row.type === 'IN' ? 'bg-emerald-100 text-emerald-700'
                                   : row.type === 'RETURN' ? 'bg-blue-100 text-blue-700'
                                   : 'bg-red-100 text-red-700';
                      return (
                        <tr key={i} className="hover:bg-amber-50/40 border-b border-slate-100">
                          <td className="py-3 px-4 text-sm text-slate-600 whitespace-nowrap">{row.date}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${typeBg}`}>{row.type}</span>
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-600">{row.reference || '—'}</td>
                          <td className={`py-3 px-4 font-semibold ${isIn ? 'text-emerald-600' : 'text-red-600'}`}>
                            {isIn ? '+' : '-'}{row.quantity}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-800">{row.balance}</td>
                          <td className="py-3 px-4 text-sm text-slate-500">{row.details || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <ToastContainer toasts={toasts} />
    </div>
  );
}