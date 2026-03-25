// frontend/src/pages/Items.jsx

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { fetchItems, deleteItem, restoreItem, fetchClassifications } from '../api/items.js';
import { fetchCategories }              from '../api/items.js';
import { fetchSuppliers }               from '../api/items.js';
import { useToast, ToastContainer }     from '../hooks/useToast.jsx';
import AddItemModal                     from '../components/items/AddItemModal.jsx';
import EditItemModal                    from '../components/items/EditItemModal.jsx';
import CategoryModal                    from '../components/items/CategoryModal.jsx';
import SupplierModal                    from '../components/items/SupplierModal.jsx';
import ClassificationModal              from '../components/items/ClassificationModal.jsx';

function fmt(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-PH', { month: 'short', day: '2-digit', year: 'numeric' });
}

const MONTHS = ['','January','February','March','April','May','June','July','August','September','October','November','December'];
function buildYears() { const y = new Date().getFullYear(); return Array.from({ length: 6 }, (_, i) => y - i); }

export default function Items() {
  const { user, hasRole } = useAuth();
  const { toasts, showToast } = useToast();

  const [items,           setItems]           = useState([]);
  const [categories,      setCategories]      = useState([]);
  const [suppliers,       setSuppliers]       = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [clsOptions,      setClsOptions]      = useState([]);
  const [deactivated,     setDeactivated]     = useState([]);
  const [showDeactivated, setShowDeactivated] = useState(false);
  const [page,            setPage]            = useState(1);
  const [totalPages,      setTotalPages]      = useState(1);
  const [totalRecords,    setTotalRecords]    = useState(0);

  const [filters, setFilters] = useState({
    search: '', category_id: '', classification_id: '',
    filter_month: '', filter_year: '', date_from: '', date_to: '',
  });
  const [appliedFilters, setAppliedFilters] = useState(filters);

  const [showFilters,  setShowFilters]  = useState(false);
  const [sortField,    setSortField]    = useState('date_procured');
  const [sortDir,      setSortDir]      = useState('desc');
  const [showAddItem,             setShowAddItem]             = useState(false);
  const [editItemId,              setEditItemId]              = useState(null);
  const [showCategoryModal,       setShowCategoryModal]       = useState(false);
  const [showSupplierModal,       setShowSupplierModal]       = useState(false);
  const [showClassificationModal, setShowClassificationModal] = useState(false);

  // ── Load items ────────────────────────────────────────────
  const loadItems = useCallback(async (params = appliedFilters, pg = 1) => {
    setLoading(true);
    try {
      const data = await fetchItems({ ...params, page: pg, limit: 15 });
      if (data.data) {
        setItems(data.data);
        setTotalPages(data.total_pages ?? 1);
        setTotalRecords(data.total_records ?? 0);
        setPage(pg);
      } else {
        setItems(data);
      }
    } catch { showToast('Error loading items.', 'error'); }
    finally { setLoading(false); }
  }, [appliedFilters]);

  // ── Load deactivated (master_admin only) ──────────────────
  async function loadDeactivated() {
    if (!hasRole('master_admin')) return;
    try {
      const data = await fetchItems({ is_active: 'false', limit: 100 });
      setDeactivated(data.data ?? []);
    } catch { /* silent */ }
  }

  const loadDropdowns = useCallback(async () => {
    const [cats, sups] = await Promise.all([fetchCategories(), fetchSuppliers()]);
    setCategories(cats);
    setSuppliers(sups);
  }, []);

  useEffect(() => { loadItems(appliedFilters, 1); loadDropdowns(); loadDeactivated(); }, []);

  // ── Filters ───────────────────────────────────────────────
  async function handleFilterChange(e) {
    const { name, value } = e.target;
    setFilters(f => ({ ...f, [name]: value }));
    if (name === 'category_id') {
      if (value) { const cls = await fetchClassifications(value); setClsOptions(cls); }
      else setClsOptions([]);
      setFilters(f => ({ ...f, category_id: value, classification_id: '' }));
    }
  }

  function handleApplyFilters(e) {
    e.preventDefault();
    setAppliedFilters(filters);
    loadItems(filters, 1);
  }

  function handleReset() {
    const empty = { search: '', category_id: '', classification_id: '', filter_month: '', filter_year: '', date_from: '', date_to: '' };
    setFilters(empty);
    setAppliedFilters(empty);
    loadItems(empty, 1);
  }

  // ── Delete / Restore ──────────────────────────────────────
  async function handleDelete(id, name) {
    if (!hasRole('master_admin')) {
      showToast('Only Master Admin can deactivate items.', 'error');
      return;
    }
    if (!confirm(`Deactivate "${name}"? All historical data will be preserved.`)) return;
    try {
      const result = await deleteItem(id);
      showToast(`✅ ${result.message}`, 'success');
      loadItems(appliedFilters, page);
      loadDeactivated();
    } catch (err) {
      showToast(err.response?.data?.message || 'Error deactivating item.', 'error');
    }
  }

  async function handleRestore(id, name) {
    if (!confirm(`Restore "${name}"?`)) return;
    try {
      const result = await restoreItem(id);
      showToast(`✅ ${result.message}`, 'success');
      loadItems(appliedFilters, page);
      loadDeactivated();
    } catch (err) {
      showToast(err.response?.data?.message || 'Error restoring item.', 'error');
    }
  }

  const sortedItems = [...items].sort((a, b) => {
    let av, bv;
    switch (sortField) {
      case 'name':
        av = a.name.toLowerCase(); bv = b.name.toLowerCase(); break;
      case 'date_procured':
        av = new Date(a.date_procured ?? 0); bv = new Date(b.date_procured ?? 0); break;
      case 'quantity':
        av = parseInt(a.quantity ?? 0); bv = parseInt(b.quantity ?? 0); break;
      case 'unit_price':
        av = parseFloat(a.unit_price ?? 0); bv = parseFloat(b.unit_price ?? 0); break;
      default:
        av = a.name.toLowerCase(); bv = b.name.toLowerCase();
    }
    if (av < bv) return sortDir === 'asc' ? -1 : 1;
    if (av > bv) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const lowStockCount = items.filter(i => i.quantity < 10).length;
  const hasFilters    = Object.values(appliedFilters).some(Boolean);
  const selectCls     = "w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      <div className="max-w-[1900px] mx-auto px-8 py-8">

        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-700 to-blue-600 bg-clip-text text-transparent mb-3">
              Manage Items Inventory
            </h1>
            <p className="text-slate-500 text-sm">Manage your inventory items and stock levels</p>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={() => setShowClassificationModal(true)}
              className="px-5 py-2.5 bg-white text-blue-600 font-medium rounded-xl border-2 border-blue-200 hover:border-blue-300 hover:shadow-lg transition-all duration-300 hover:scale-105 flex items-center gap-2">
              <span>🧩</span><span>Classifications</span>
            </button>
            <button onClick={() => setShowCategoryModal(true)}
              className="px-5 py-2.5 bg-white text-emerald-600 font-medium rounded-xl border-2 border-emerald-200 hover:border-emerald-300 hover:shadow-lg transition-all duration-300 hover:scale-105 flex items-center gap-2">
              <span>📂</span><span>Categories</span>
            </button>
            <button onClick={() => setShowSupplierModal(true)}
              className="px-5 py-2.5 bg-white text-violet-600 font-medium rounded-xl border-2 border-violet-200 hover:border-violet-300 hover:shadow-lg transition-all duration-300 hover:scale-105 flex items-center gap-2">
              <span>🚚</span><span>Suppliers</span>
            </button>
            <button onClick={() => setShowAddItem(true)}
              className="px-6 py-2.5 bg-gradient-to-r from-slate-700 to-blue-600 text-white font-semibold rounded-xl shadow-md hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center gap-2">
              <span className="text-lg">+</span><span>Add Item</span>
            </button>
          </div>
        </div>

        {/* Low stock alert */}
        {lowStockCount > 0 && (
          <div className="mb-6 bg-gradient-to-r from-amber-50 to-red-50 border-l-4 border-amber-500 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <span className="text-amber-600 text-xl">⚠️</span>
              </div>
              <div>
                <p className="font-semibold text-amber-900">Low Stock Alert</p>
                <p className="text-sm text-amber-700">You have <strong>{lowStockCount}</strong> item(s) running low on stock</p>
              </div>
            </div>
          </div>
        )}

        {/* Filter Drawer Toggle + Sort */}
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => setShowFilters(v => !v)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm border-2 transition-all duration-300 ${
              showFilters
                ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                : 'bg-white text-blue-600 border-blue-200 hover:border-blue-400 hover:shadow-md'
            }`}>
            <span>{showFilters ? '✕' : '🔍'}</span>
            <span>{showFilters ? 'Hide Filters' : 'Show Filters'}</span>
            {hasFilters && !showFilters && (
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">Active</span>
            )}
          </button>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <span className="text-sm text-slate-500">Sort:</span>
            {[
              { field: 'name',          labelAsc: 'A→Z',        labelDesc: 'Z→A'        },
              { field: 'date_procured', labelAsc: 'Oldest',     labelDesc: 'Newest'     },
              { field: 'quantity',      labelAsc: 'Low Stock',  labelDesc: 'High Stock' },
              { field: 'unit_price',    labelAsc: 'Low Price',  labelDesc: 'High Price' },
            ].map(s => (
              <button key={s.field}
                onClick={() => {
                  if (sortField === s.field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
                  else { setSortField(s.field); setSortDir(s.field === 'date_procured' ? 'desc' : 'asc'); }
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  sortField === s.field
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:bg-blue-50'
                }`}>
                {sortField === s.field
                  ? `${sortDir === 'asc' ? '↑' : '↓'} ${sortDir === 'asc' ? s.labelAsc : s.labelDesc}`
                  : s.labelAsc}
              </button>
            ))}
          </div>
        </div>

        {/* Collapsible Filter Drawer */}
        {showFilters && (
          <div className="bg-white rounded-2xl shadow-sm border border-blue-100 p-6 mb-6 animate-fade-in">
            <form onSubmit={handleApplyFilters} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-2">Search Items</label>
                  <div className="relative">
                    <input type="text" name="search" placeholder="Search by name..."
                      value={filters.search} onChange={handleFilterChange}
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition" />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-2">Category</label>
                  <select name="category_id" value={filters.category_id} onChange={handleFilterChange} className={selectCls}>
                    <option value="">All Categories</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-2">Classification</label>
                  <select name="classification_id" value={filters.classification_id} onChange={handleFilterChange}
                    disabled={clsOptions.length === 0}
                    className={`${selectCls} disabled:bg-slate-100 disabled:cursor-not-allowed`}>
                    <option value="">{clsOptions.length === 0 ? 'Select category first' : 'All Classifications'}</option>
                    {clsOptions.map(c => <option key={c.id} value={c.id}>{c.classification_name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-2">Month</label>
                  <select name="filter_month" value={filters.filter_month} onChange={handleFilterChange} className={selectCls}>
                    <option value="">All Months</option>
                    {MONTHS.slice(1).map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-2">Year</label>
                  <select name="filter_year" value={filters.filter_year} onChange={handleFilterChange} className={selectCls}>
                    <option value="">All Years</option>
                    {buildYears().map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-2">Date From</label>
                  <input type="date" name="date_from" value={filters.date_from} onChange={handleFilterChange} className={selectCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-2">Date To</label>
                  <input type="date" name="date_to" value={filters.date_to} onChange={handleFilterChange} className={selectCls} />
                </div>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button type="submit"
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium rounded-lg hover:shadow-lg transition-all duration-300">
                  Apply Filters
                </button>
                {hasFilters && (
                  <button type="button" onClick={handleReset}
                    className="px-6 py-2.5 bg-slate-100 text-slate-600 font-medium rounded-lg hover:bg-slate-200 transition-colors">
                    Reset
                  </button>
                )}
                <button type="button" onClick={() => setShowFilters(false)}
                  className="ml-auto px-4 py-2.5 text-slate-400 hover:text-slate-600 text-sm transition-colors">
                  ✕ Hide
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Record count */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-slate-500">
            {loading ? 'Loading...' : `${totalRecords} item${totalRecords !== 1 ? 's' : ''} found`}
          </span>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-blue-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table style={{ minWidth: '1300px' }} className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-blue-600 to-slate-600 text-white">
                  {['Item Name','Category','Classification','Supplier','Qty','Unit','Unit Price','Date Ordered','Date Procured','Actions'].map(h => (
                    <th key={h} className="py-4 px-4 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan="10" className="py-16 text-center text-slate-400 animate-pulse">Loading...</td></tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="py-16 text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-3xl mb-4">📦</span>
                        <p className="text-slate-500 font-medium">No items found</p>
                        <p className="text-slate-400 text-sm mt-1">Try adjusting your filters or add a new item</p>
                      </div>
                    </td>
                  </tr>
                ) : sortedItems.map(item => (
                  <tr key={item.id}
                    className={`hover:bg-blue-50/30 transition-colors duration-150 ${item.quantity < 10 ? 'bg-red-50/50' : ''}`}>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-gradient-to-br from-blue-100 to-blue-300 rounded-lg flex items-center justify-center flex-shrink-0">
                          <span className="text-sm">📦</span>
                        </div>
                        <span className="font-semibold text-slate-800 whitespace-nowrap">{item.name}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 whitespace-nowrap">
                        {item.category ?? 'N/A'}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 whitespace-nowrap">
                        {item.classification_name ?? 'Unclassified'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-slate-700 whitespace-nowrap">{item.supplier ?? 'N/A'}</td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${item.quantity < 10 ? 'text-red-600' : 'text-slate-800'}`}>
                          {item.quantity}
                        </span>
                        {item.quantity < 10 && (
                          <span className="px-2 py-0.5 bg-red-50 text-red-700 text-xs font-medium rounded-full">Low</span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-slate-600 text-sm">{item.unit || 'Pcs'}</td>
                    <td className="py-4 px-4">
                      <span className="font-semibold text-slate-700 whitespace-nowrap">
                        ₱{parseFloat(item.unit_price ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-blue-600 text-sm whitespace-nowrap">{fmt(item.date_ordered)}</td>
                    <td className="py-4 px-4 text-blue-600 text-sm whitespace-nowrap">{fmt(item.date_procured)}</td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2 whitespace-nowrap">
                        <button onClick={() => setEditItemId(item.id)}
                          className="px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors text-xs font-medium">
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => handleDelete(item.id, item.name)}
                          disabled={!hasRole('master_admin')}
                          title={!hasRole('master_admin') ? 'Only Master Admin can deactivate items' : 'Deactivate item'}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            hasRole('master_admin')
                              ? 'bg-red-100 text-red-700 hover:bg-red-200'
                              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          }`}>
                          🗑️ {hasRole('master_admin') ? 'Deactivate' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-sm text-slate-600">Page {page} of {totalPages} — {totalRecords} total items</span>
              <div className="flex gap-2">
                <button disabled={page <= 1} onClick={() => loadItems(appliedFilters, page - 1)}
                  className="px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 text-sm">
                  ← Previous
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const pg = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                  return (
                    <button key={pg} onClick={() => loadItems(appliedFilters, pg)}
                      className={`px-4 py-2 rounded-lg text-sm border ${pg === page ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                      {pg}
                    </button>
                  );
                })}
                <button disabled={page >= totalPages} onClick={() => loadItems(appliedFilters, page + 1)}
                  className="px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 text-sm">
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Deactivated Items — master_admin only */}
        {hasRole('master_admin') && (
          <div className="mt-6">
            <button onClick={() => setShowDeactivated(v => !v)}
              className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm font-medium mb-3">
              <span>{showDeactivated ? '⮟' : '⮞'}</span>
              <span>🗃️ Deactivated Items ({deactivated.length})</span>
            </button>
            {showDeactivated && (
              deactivated.length === 0 ? (
                <p className="text-slate-400 text-sm">No deactivated items.</p>
              ) : (
                <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-200 text-slate-600 text-xs uppercase">
                        {['Item Name','Category','Qty','Unit','Unit Price','Action'].map(h => (
                          <th key={h} className="py-3 px-4 text-left font-semibold">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {deactivated.map(item => (
                        <tr key={item.id} className="opacity-60 hover:opacity-80 transition-opacity">
                          <td className="py-3 px-4 text-sm line-through text-slate-500">{item.name}</td>
                          <td className="py-3 px-4 text-sm text-slate-500">{item.category ?? '—'}</td>
                          <td className="py-3 px-4 text-sm text-slate-500">{item.quantity}</td>
                          <td className="py-3 px-4 text-sm text-slate-500">{item.unit || 'Pcs'}</td>
                          <td className="py-3 px-4 text-sm text-slate-500">₱{parseFloat(item.unit_price ?? 0).toFixed(2)}</td>
                          <td className="py-3 px-4">
                            <button onClick={() => handleRestore(item.id, item.name)}
                              className="px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 text-xs font-medium">
                              ♻️ Restore
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <AddItemModal open={showAddItem} onClose={() => setShowAddItem(false)}
        categories={categories} suppliers={suppliers}
        onSuccess={(msg, type = 'success') => { showToast(msg, type); loadItems(appliedFilters, page); }} />

      <EditItemModal open={!!editItemId} itemId={editItemId} onClose={() => setEditItemId(null)}
        categories={categories} suppliers={suppliers}
        onSuccess={(msg, type = 'success') => { showToast(msg, type); loadItems(appliedFilters, page); setEditItemId(null); }} />

      <CategoryModal open={showCategoryModal} onClose={() => setShowCategoryModal(false)}
        categories={categories} onRefresh={loadDropdowns} showToast={showToast} />

      <SupplierModal open={showSupplierModal} onClose={() => setShowSupplierModal(false)}
        suppliers={suppliers} onRefresh={loadDropdowns} showToast={showToast} />

      <ClassificationModal open={showClassificationModal} onClose={() => setShowClassificationModal(false)}
        categories={categories} showToast={showToast} />

      <ToastContainer toasts={toasts} />
    </div>
  );
}