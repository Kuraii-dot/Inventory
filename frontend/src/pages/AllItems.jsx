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
  const [showReport,     setShowReport]     = useState(false);
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

    return filtered.reduce((acc, row) => {
      const cat = row.category_name ?? 'Uncategorized';
      (acc[cat] ??= []).push(row);
      return acc;
    }, {});
  }, [items, search]);

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

  const selectCls = "w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition";

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-sky-50 to-slate-200">
      <div className="max-w-[1500px] mx-auto px-8 py-10">

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
                          <div className="flex items-center gap-2">
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
            { bg: 'bg-indigo-100',  icon: '🔀', label: 'Multiple Variants', val: stats.variants, cls: 'text-indigo-600'  },
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
      <Modal open={showLedger} onClose={() => setShowLedger(false)}
        title="📂 Item Ledger" subtitle="View complete transaction history for any item" maxWidth="max-w-4xl">
        <div className="bg-white rounded-xl p-6 mb-6 border border-sky-200">
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