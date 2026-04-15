// frontend/src/pages/Allocation.jsx

import { useState, useEffect, useCallback } from 'react';
import {
  fetchAllocations, fetchAllocationById,
  createAllocation, updateAllocation,
  deleteAllocation, returnAllocation,
} from '../api/allocations.js';
import { useToast, ToastContainer } from '../hooks/useToast.jsx';
import { fetchCategories } from '../api/items.js';
import Modal        from '../components/Modal.jsx';
import GroupedTable from '../components/GroupedTable.jsx';
import ItemRows     from '../components/ItemRows.jsx';
import ReportModal  from '../components/ReportModal.jsx';

const DEPARTMENTS = ['Admin', 'Engineering', 'Commercial', 'Finance'];

function fmtDate(str) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function fmtTime(str) {
  if (!str) return '';
  return new Date(str).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

export default function Allocation() {
  const { toasts, showToast } = useToast();

  const [records,    setRecords]    = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [filters,    setFilters]    = useState({ search: '', timeframe: 'all', startDate: '', endDate: '' });
  const [page,       setPage]       = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modal visibility
  const [showAllocate, setShowAllocate] = useState(false);
  const [showReport,   setShowReport]   = useState(false);
  const [editData,     setEditData]     = useState(null);
  const [returnData,   setReturnData]   = useState(null);

  // Allocate form state
  const [allocForm, setAllocForm] = useState({
    department: '', allocated_by: '', purpose: '', remarks: '',
  });
  const [allocItems,   setAllocItems]   = useState([{ category_id: '', classification_id: '', item_id: '', quantity: '' }]);
  const [allocLoading, setAllocLoading] = useState(false);

  // Edit / return form state
  const [editForm,   setEditForm]   = useState({});
  const [returnForm, setReturnForm] = useState({ return_quantity: '', return_reason: '' });

  // ── Load ──────────────────────────────────────────────────
  const loadAllocations = useCallback(async (pg = 1) => {
    setLoading(true);
    try {
      const data = await fetchAllocations({
        search:     filters.search,
        timeframe:  filters.timeframe,
        start_date: filters.startDate,
        end_date:   filters.endDate,
        page:       pg,
        limit:      50,
      });
      setRecords(data.data ?? []);
      setTotalPages(data.total_pages ?? 1);
      setTotalCount(data.total ?? 0);
      setPage(pg);
    } catch {
      showToast('Failed to load allocations.', 'error');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchCategories().then(setCategories).catch(console.error);
  }, []);

  useEffect(() => { loadAllocations(1); }, []);

  // ── Search ────────────────────────────────────────────────
  function handleSearch(e) {
    e.preventDefault();
    loadAllocations(1);
  }

  // ── Allocate ──────────────────────────────────────────────
  async function handleAllocateSubmit(e) {
    e.preventDefault();
    setAllocLoading(true);
    try {
      const result = await createAllocation({ ...allocForm, items: allocItems });
      showToast(`✅ ${result.message}`);
      setShowAllocate(false);
      setAllocForm({ department: '', allocated_by: '', purpose: '', remarks: '' });
      setAllocItems([{ category_id: '', classification_id: '', item_id: '', quantity: '' }]);
      loadAllocations(1);
    } catch (err) {
      showToast(err.response?.data?.message || 'Error allocating items.', 'error');
    } finally {
      setAllocLoading(false);
    }
  }

  // ── Edit ──────────────────────────────────────────────────
  async function openEdit(id) {
    try {
      const { data } = await fetchAllocationById(id);
      setEditData(data);
      setEditForm({
        item_id:      data.item_id,
        quantity:     data.quantity,
        department:   data.department,
        allocated_by: data.allocated_by,
        purpose:      data.purpose,
        remarks:      data.remarks ?? '',
      });
    } catch {
      showToast('Failed to load allocation.', 'error');
    }
  }

  async function handleEditSubmit(e) {
    e.preventDefault();
    try {
      await updateAllocation(editData.id, editForm);
      showToast('Allocation updated successfully.');
      setEditData(null);
      loadAllocations(page);
    } catch (err) {
      showToast(err.response?.data?.message || 'Error updating allocation.', 'error');
    }
  }

  // ── Delete ────────────────────────────────────────────────
  async function handleDelete(id) {
    if (!confirm('Delete this allocation? Stock will be restored.')) return;
    try {
      await deleteAllocation(id);
      showToast('Allocation deleted successfully.');
      loadAllocations(page);
    } catch {
      showToast('Error deleting allocation.', 'error');
    }
  }

  // ── Return ────────────────────────────────────────────────
  async function openReturn(id) {
    try {
      const { data } = await fetchAllocationById(id);
      setReturnData(data);
      setReturnForm({ return_quantity: data.quantity, return_reason: '' });
    } catch {
      showToast('Failed to load allocation.', 'error');
    }
  }

  async function handleReturnSubmit(e) {
    e.preventDefault();
    try {
      const result = await returnAllocation(returnData.id, returnForm);
      showToast(`✅ ${result.message}`);
      setReturnData(null);
      loadAllocations(page);
    } catch (err) {
      showToast(err.response?.data?.message || 'Error processing return.', 'error');
    }
  }

  // ── Table config ──────────────────────────────────────────
  const COLS = ['Date', 'Item', 'Category', 'Qty', 'Department', 'Allocated By', 'Purpose', 'Actions'];

  const groupKey = row => {
    const date = new Date(row.created_at).toISOString().split('T')[0];
    return `${row.department}|${date}|${row.allocated_by}`;
  };

  function renderHeader(key, rows) {
    const [dept, date, by] = key.split('|');
    const totalQty    = rows.reduce((s, r) => s + parseInt(r.quantity), 0);
    const hasReturned = rows.some(r => r.status === 'returned');
    return (
      <div>
        <div className="flex items-center gap-2">
          <span className="text-blue-600">📦 {dept}</span>
          <span className="px-2 py-0.5 bg-pink-200 text-pink-800 rounded-full text-xs font-medium">
            {rows.length} item{rows.length !== 1 ? 's' : ''}
          </span>
          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">Qty: {totalQty}</span>
          {hasReturned && (
            <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">Has Returns</span>
          )}
        </div>
        <p className="text-xs text-slate-600 mt-1">
          Allocated by <strong>{by}</strong> • {fmtDate(date)}
        </p>
      </div>
    );
  }

  function renderRow(row) {
    return (
      <>
        <td className="py-3 px-6 text-xs text-slate-600">
          {fmtDate(row.created_at)}<br />
          <span className="text-slate-400">{fmtTime(row.created_at)}</span>
        </td>
        <td className="py-3 px-6 text-sm font-medium text-slate-900">{row.item_name}</td>
        <td className="py-3 px-6 text-sm text-slate-700">{row.category_name}</td>
        <td className="py-3 px-6 font-semibold text-purple-600">{row.quantity}</td>
        <td className="py-3 px-6 text-sm text-slate-700">{row.department}</td>
        <td className="py-3 px-6 text-sm text-slate-700">{row.allocated_by}</td>
        <td className="py-3 px-6 text-sm text-slate-600 max-w-xs truncate">
          {(row.purpose ?? '').substring(0, 50)}
        </td>
        <td className="py-3 px-6">
          {row.status === 'returned' && (
            <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full font-medium block mb-1">
              Returned
            </span>
          )}
          <div className="flex gap-2">
            <button onClick={() => openEdit(row.id)}
              className="px-3 py-1.5 bg-pink-100 text-pink-700 rounded-lg hover:bg-pink-200 text-xs font-medium">
              ✏️ Edit
            </button>
            <button onClick={() => handleDelete(row.id)}
              className="px-2 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-xs font-medium">
              🗑️
            </button>
            {row.status === 'active' && (
              <button onClick={() => openReturn(row.id)}
                className="px-2 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-xs font-medium">
                ↩️
              </button>
            )}
          </div>
        </td>
      </>
    );
  }

  const inputCls = "w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition";

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-violet-50">
      <div className="max-w-screen-xl mx-auto px-8 py-10">

        {/* ── Header ─────────────────────────────────────── */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-pink-400 bg-clip-text text-transparent mb-2">
              Office Item Allocations
            </h1>
            <p className="text-slate-500 text-sm">Allocate and track office supplies across departments</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowReport(true)}
              className="px-5 py-2.5 bg-white text-purple-600 font-medium rounded-xl border-2 border-purple-200 hover:border-purple-300 hover:shadow-lg transition-all duration-300 hover:scale-105 flex items-center gap-2">
              <span>📊</span><span>Generate Report</span>
            </button>
            <button onClick={() => setShowAllocate(true)}
              className="px-6 py-2.5 bg-gradient-to-r from-pink-400 to-blue-500 text-white border-2 border-pink-400 font-semibold rounded-xl shadow-md hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center gap-2">
              <span className="text-lg">+</span><span>Allocate Items</span>
            </button>
          </div>
        </div>

        {/* ── Search & Filters ───────────────────────────── */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl shadow-sm border border-pink-100 p-6 mb-6">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-2">Search Allocations</label>
                <div className="relative">
                  <input type="text" value={filters.search}
                    onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
                    placeholder="Search by item, department, or allocated by..."
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition" />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-2">Timeframe</label>
                <select value={filters.timeframe}
                  onChange={e => setFilters(f => ({ ...f, timeframe: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition">
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                  <option value="year">This Year</option>
                  <option value="custom">Custom Range</option>
                </select>
              </div>
              <div className="flex items-end">
                <button type="submit"
                  className="w-full bg-gradient-to-r from-blue-400 to-pink-400 text-white py-2.5 px-4 rounded-lg font-medium hover:shadow-lg transition-all duration-300 hover:scale-105">
                  🔎 Search
                </button>
              </div>
            </div>

            {filters.timeframe === 'custom' && (
              <div className="grid grid-cols-2 gap-4 p-5 bg-gradient-to-r from-purple-50 to-violet-50 rounded-xl border border-purple-200">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-2">Start Date</label>
                  <input type="date" value={filters.startDate}
                    onChange={e => setFilters(f => ({ ...f, startDate: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 transition" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-2">End Date</label>
                  <input type="date" value={filters.endDate}
                    onChange={e => setFilters(f => ({ ...f, endDate: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 transition" />
                </div>
              </div>
            )}
          </form>

          <div className="mt-4 pt-4 border-t border-slate-100">
            <span className="text-sm font-medium text-slate-600">
              {loading ? 'Loading...' : `${totalCount} allocation${totalCount !== 1 ? 's' : ''} found`}
            </span>
          </div>
        </div>

        {/* ── Table ──────────────────────────────────────── */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl shadow-sm border border-pink-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table style={{ minWidth: "1200px" }} className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-pink-400 to-blue-500 text-white">
                  {COLS.map(h => (
                    <th key={h} className="py-4 px-6 text-center text-xs font-semibold uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={COLS.length} className="py-16 text-center text-slate-400 animate-pulse">
                      Loading...
                    </td>
                  </tr>
                ) : (
                  <GroupedTable
                    rows={records}
                    groupBy={groupKey}
                    renderHeader={renderHeader}
                    renderRow={renderRow}
                    columns={COLS}
                    accentClass="border-purple-300"
                  />
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-sm text-slate-600">Page {page} of {totalPages}</span>
              <div className="flex gap-2">
                <button disabled={page <= 1} onClick={() => loadAllocations(page - 1)}
                  className="px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50">
                  ← Previous
                </button>
                <button disabled={page >= totalPages} onClick={() => loadAllocations(page + 1)}
                  className="px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50">
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Allocate Modal ─────────────────────────────────── */}
      <Modal open={showAllocate} onClose={() => setShowAllocate(false)}
        title="Allocate Office Items" subtitle="Allocate office supplies to departments" maxWidth="max-w-3xl">
        <form onSubmit={handleAllocateSubmit} className="space-y-5">
          <div className="p-5 bg-gradient-to-r from-pink-50 to-violet-50 rounded-xl border border-purple-200">
            <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
              <span>📋</span><span>Allocation Information</span>
            </h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Department *</label>
                <select required value={allocForm.department}
                  onChange={e => setAllocForm(f => ({ ...f, department: e.target.value }))}
                  className={inputCls}>
                  <option value="">Select Department</option>
                  {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Allocated By *</label>
                <input type="text" required value={allocForm.allocated_by}
                  onChange={e => setAllocForm(f => ({ ...f, allocated_by: e.target.value }))}
                  className={inputCls} placeholder="Your name" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Purpose *</label>
                <textarea rows="2" required value={allocForm.purpose}
                  onChange={e => setAllocForm(f => ({ ...f, purpose: e.target.value }))}
                  className={`${inputCls} resize-none`} placeholder="Purpose of allocation..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Remarks (Optional)</label>
                <textarea rows="2" value={allocForm.remarks}
                  onChange={e => setAllocForm(f => ({ ...f, remarks: e.target.value }))}
                  className={`${inputCls} resize-none`} placeholder="Additional notes..." />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
              <span>📦</span><span>Items to Allocate</span>
            </h3>
            <ItemRows value={allocItems} onChange={setAllocItems} showClassification={false} />
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-slate-200">
            <span className="text-sm text-slate-600 font-medium">
              {allocItems.length} item{allocItems.length !== 1 ? 's' : ''} to allocate
            </span>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowAllocate(false)}
                className="px-6 py-2.5 bg-slate-100 text-slate-600 font-medium rounded-lg hover:bg-slate-200 transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={allocLoading}
                className="px-8 py-2.5 bg-gradient-to-r from-purple-500 to-violet-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-300 disabled:opacity-60">
                {allocLoading ? 'Allocating...' : 'Allocate All Items'}
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* ── Edit Modal ─────────────────────────────────────── */}
      <Modal open={!!editData} onClose={() => setEditData(null)}
        title="Edit Allocation" subtitle="Modify allocation details" maxWidth="max-w-2xl">
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Quantity *</label>
              <input type="number" min="1" required value={editForm.quantity ?? ''}
                onChange={e => setEditForm(f => ({ ...f, quantity: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Department *</label>
              <select required value={editForm.department ?? ''}
                onChange={e => setEditForm(f => ({ ...f, department: e.target.value }))} className={inputCls}>
                <option value="">Select Department</option>
                {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Allocated By *</label>
            <input type="text" required value={editForm.allocated_by ?? ''}
              onChange={e => setEditForm(f => ({ ...f, allocated_by: e.target.value }))} className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Purpose *</label>
              <textarea rows="3" required value={editForm.purpose ?? ''}
                onChange={e => setEditForm(f => ({ ...f, purpose: e.target.value }))}
                className={`${inputCls} resize-none`} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Remarks</label>
              <textarea rows="3" value={editForm.remarks ?? ''}
                onChange={e => setEditForm(f => ({ ...f, remarks: e.target.value }))}
                className={`${inputCls} resize-none`} />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button type="button" onClick={() => setEditData(null)}
              className="px-6 py-2.5 bg-slate-100 text-slate-600 font-medium rounded-lg hover:bg-slate-200 transition-colors">
              Cancel
            </button>
            <button type="submit"
              className="px-8 py-2.5 bg-gradient-to-r from-purple-500 to-violet-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-300">
              Update Allocation
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Return Modal ───────────────────────────────────── */}
      <Modal open={!!returnData} onClose={() => setReturnData(null)}
        title="Return Allocation" subtitle="Return allocated items to inventory" maxWidth="max-w-md">
        <form onSubmit={handleReturnSubmit} className="space-y-4">
          {returnData && (
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <p className="text-sm text-slate-600 mb-1"><strong>Item:</strong> {returnData.item_name}</p>
              <p className="text-sm text-slate-600"><strong>Allocated Quantity:</strong> {returnData.quantity}</p>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Return Quantity *</label>
            <input type="number" min="1" max={returnData?.quantity} required
              value={returnForm.return_quantity}
              onChange={e => setReturnForm(f => ({ ...f, return_quantity: e.target.value }))}
              className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Reason for Return *</label>
            <textarea rows="3" required value={returnForm.return_reason}
              onChange={e => setReturnForm(f => ({ ...f, return_reason: e.target.value }))}
              className={`${inputCls} resize-none`} placeholder="Enter reason for returning items..." />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button type="button" onClick={() => setReturnData(null)}
              className="px-6 py-2.5 bg-slate-100 text-slate-600 font-medium rounded-lg hover:bg-slate-200 transition-colors">
              Cancel
            </button>
            <button type="submit"
              className="px-8 py-2.5 bg-gradient-to-r from-purple-500 to-violet-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-300">
              Process Return
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Report Modal ───────────────────────────────────── */}
      <ReportModal
        open={showReport}
        onClose={() => setShowReport(false)}
        type="allocations"
        categories={categories}
      />

      <ToastContainer toasts={toasts} />
    </div>
  );
}