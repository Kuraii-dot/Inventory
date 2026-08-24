// frontend/src/pages/Distributions.jsx

import { useState, useEffect, useCallback } from 'react';
import {
  fetchDistributions, fetchDistributionById,
  createDistribution, updateDistribution,
  deleteDistribution, returnDistribution,
} from '../api/allocations.js';
import { useToast, ToastContainer } from '../hooks/useToast.jsx';
import Modal        from '../components/Modal.jsx';
import GroupedTable from '../components/GroupedTable.jsx';
import ItemRows     from '../components/ItemRows.jsx';
import ReportModal  from '../components/ReportModal.jsx';
import CombinationsModal from '../components/distributions/CombinationsModal.jsx';
import client       from '../api/client.js';
import AppIcon      from '../components/AppIcon.jsx';

const DEPARTMENTS = ['Admin', 'Engineering', 'Commercial', 'Finance'];

function fmtDate(str) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function fmtTime(str) {
  if (!str) return '';
  return new Date(str).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

export default function Distributions() {
  const { toasts, showToast } = useToast();

  const [records,    setRecords]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [filters,    setFilters]    = useState({ search: '', timeframe: 'all', startDate: '', endDate: '' });
  const [page,       setPage]       = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [showDistribute,   setShowDistribute]   = useState(false);
  const [showReport,       setShowReport]       = useState(false);
  const [showCombinations, setShowCombinations] = useState(false);
  const [editData,         setEditData]         = useState(null);
  const [returnData,       setReturnData]       = useState(null);

  // Combinations picker state
  const [combinations,  setCombinations]  = useState([]);
  const [selectedCombo, setSelectedCombo] = useState('');
  const [comboLoading,  setComboLoading]  = useState(false);

  const today   = new Date().toISOString().split('T')[0];
  const nowTime = new Date().toTimeString().slice(0, 5);

  const [distForm, setDistForm] = useState({
    recipient: '', department: '', approved_by: '',
    purpose: '', debit_to: '', date: today, time: nowTime,
  });
  const [distItems,   setDistItems]   = useState([{ category_id: '', classification_id: '', item_id: '', quantity: '' }]);
  const [distLoading, setDistLoading] = useState(false);
  const [editForm,   setEditForm]   = useState({});
  const [returnForm, setReturnForm] = useState({ return_quantity: '', return_reason: '' });

  // ── Load distributions ────────────────────────────────────
  const loadDistributions = useCallback(async (pg = 1) => {
    setLoading(true);
    try {
      const data = await fetchDistributions({
        search: filters.search, timeframe: filters.timeframe,
        start_date: filters.startDate, end_date: filters.endDate,
        page: pg, limit: 15,
      });
      setRecords(data.data ?? []);
      setTotalPages(data.total_pages ?? 1);
      setTotalCount(data.total_records ?? 0);
      setPage(pg);
    } catch { showToast('Failed to load distributions.', 'error'); }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { loadDistributions(1); }, []);

  // ── Load combinations when distribute modal opens ─────────
  async function openDistributeModal() {
    setShowDistribute(true);
    setComboLoading(true);
    try {
      const { data } = await client.get('/combinations');
      setCombinations(data.data ?? []);
    } catch (err) {
      console.error('Failed to load combinations:', err);
      showToast('Could not load combinations.', 'error');
    } finally {
      setComboLoading(false);
    }
  }

  // ── Load combo items into the form ────────────────────────
  async function handleLoadCombo() {
    if (!selectedCombo) return;
    const combo = combinations.find(c => String(c.id) === String(selectedCombo));
    if (!combo?.items?.length) { showToast('Combination has no items.', 'error'); return; }

    try {
      // Fetch full item details for each combination_item
      // so we have category_id to populate the dropdowns
      const mapped = await Promise.all(combo.items.map(async (ci) => {
        // Get the item's full details including category_id
        const { data: itemData } = await client.get(`/items/${ci.item_id}`);
        return {
          category_id:       String(itemData.category_id || ''),
          classification_id: String(itemData.classification_id || ''),
          item_id:           String(ci.item_id),
          quantity:          String(ci.quantity_required),
        };
      }));
      setDistItems(mapped);
      showToast(`Loaded "${combo.name}"`, 'success');
    } catch (err) {
      console.error('Load combo error:', err);
      showToast('Error loading combination items.', 'error');
    }
  }

  function handleSearch(e) { e.preventDefault(); loadDistributions(1); }

  async function handleDistributeSubmit(e) {
    e.preventDefault();
    setDistLoading(true);
    try {
      const result = await createDistribution({ ...distForm, items: distItems });
      showToast(`${result.message} | Value: ₱${result.total_value?.toFixed(2)}`);
      setShowDistribute(false);
      setDistForm({ recipient: '', department: '', approved_by: '', purpose: '', debit_to: '', date: today, time: nowTime });
      setDistItems([{ category_id: '', classification_id: '', item_id: '', quantity: '' }]);
      setSelectedCombo('');
      loadDistributions(1);
    } catch (err) { showToast(err.response?.data?.message || 'Error distributing.', 'error'); }
    finally { setDistLoading(false); }
  }

  async function openEdit(id) {
    try {
      const { data } = await fetchDistributionById(id);
      setEditData(data);
      setEditForm({ item_id: data.item_id, quantity: data.quantity, recipient: data.recipient, department: data.department, approved_by: data.approved_by, debit_to: data.debit_to ?? '', purpose: data.purpose });
    } catch { showToast('Failed to load distribution.', 'error'); }
  }

  async function handleEditSubmit(e) {
    e.preventDefault();
    try {
      await updateDistribution(editData.id, editForm);
      showToast('Distribution updated.');
      setEditData(null); loadDistributions(page);
    } catch (err) { showToast(err.response?.data?.message || 'Error updating.', 'error'); }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this distribution? Stock will be restored.')) return;
    try { await deleteDistribution(id); showToast('Deleted.'); loadDistributions(page); }
    catch { showToast('Error deleting.', 'error'); }
  }

  async function openReturn(id) {
    try {
      const { data } = await fetchDistributionById(id);
      setReturnData(data);
      setReturnForm({ return_quantity: data.quantity, return_reason: '' });
    } catch { showToast('Failed to load.', 'error'); }
  }

  async function handleReturnSubmit(e) {
    e.preventDefault();
    try {
      const result = await returnDistribution(returnData.id, returnForm);
      showToast(result.message); setReturnData(null); loadDistributions(page);
    } catch (err) { showToast(err.response?.data?.message || 'Error.', 'error'); }
  }

  const COLS = ['Date','Item','Qty','Total Value','Category','Department','Recipient','Purpose','Approved By','Actions'];
  const groupKey = row => `${row.distributed_at}|${row.purpose}|${row.recipient}`;

  function renderHeader(key, rows) {
    const [dateTime, purpose, recipient] = key.split('|');
    const totalQty   = rows.reduce((s, r) => s + parseInt(r.quantity), 0);
    const totalValue = rows.reduce((s, r) => s + parseFloat(r.total_value ?? 0), 0);
    return (
      <div>
        <div className="flex items-center gap-2">
          <span className="text-red-600 flex items-center gap-1"><AppIcon name="package" size={14} /> {purpose}</span>
          <span className="px-2 py-0.5 bg-yellow-200 text-yellow-800 rounded-full text-xs font-medium">{rows.length} item{rows.length !== 1 ? 's' : ''}</span>
          <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">Qty: {totalQty}</span>
          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">₱{totalValue.toFixed(2)}</span>
        </div>
        <p className="text-xs text-slate-600 mt-1">To <strong>{recipient}</strong> • {rows[0]?.department} • {fmtDate(dateTime)} {fmtTime(dateTime)} • Approved by {rows[0]?.approved_by}</p>
      </div>
    );
  }

  function renderRow(row) {
    return (
      <>
        <td className="py-3 px-4 text-xs text-slate-600 whitespace-nowrap">{fmtDate(row.distributed_at)}<br/><span className="text-slate-400">{fmtTime(row.distributed_at)}</span></td>
        <td className="py-3 px-4 text-sm font-medium text-slate-900 whitespace-nowrap">{row.item_name}</td>
        <td className="py-3 px-4 font-semibold text-red-600 text-center">{row.quantity}</td>
        <td className="py-3 px-4 font-medium text-emerald-600 whitespace-nowrap">₱{parseFloat(row.total_value ?? 0).toFixed(2)}</td>
        <td className="py-3 px-4 text-sm text-slate-700 whitespace-nowrap">{row.category_name}</td>
        <td className="py-3 px-4 text-sm text-slate-700 whitespace-nowrap">{row.department}</td>
        <td className="py-3 px-4 text-sm text-slate-700 whitespace-nowrap">{row.recipient}</td>
        <td className="min-w-[280px] py-3 px-4 text-sm text-slate-600 whitespace-normal break-words">{row.purpose || '—'}</td>
        <td className="py-3 px-4 text-sm text-slate-700 whitespace-nowrap">{row.approved_by}</td>
        <td className="py-3 px-4">
          <div className="flex gap-1 whitespace-nowrap">
            <button onClick={() => openEdit(row.id)} className="px-2 py-1.5 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 text-xs font-medium"><AppIcon name="edit" size={13} className="app-icon-inline mr-1" /> Edit</button>
            <button onClick={() => handleDelete(row.id)} className="px-2 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-xs font-medium"><AppIcon name="trash" size={13} className="app-icon-inline mr-1" /> Delete</button>
            <button onClick={() => openReturn(row.id)} className="px-2 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-xs font-medium"><AppIcon name="return" size={13} className="app-icon-inline mr-1" /> Return</button>
          </div>
        </td>
      </>
    );
  }

  const inputCls = "w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition";

  return (
    <div className="app-page min-h-screen bg-gradient-to-br from-red-50 via-yellow-50 to-red-100">
      <div className="app-page-inner max-w-[1600px] mx-auto px-8 py-10">

        {/* Header */}
        <div className="app-page-header flex justify-between items-start mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-600 to-red-600 bg-clip-text text-transparent mb-2">Distribution Records</h1>
            <p className="text-slate-500 text-sm">Track and manage item distributions across departments</p>
          </div>
          <div className="app-page-actions flex gap-3">
            <button onClick={() => setShowReport(true)} className="px-5 py-2.5 bg-yellow-50 text-red-600 font-medium rounded-xl border-2 border-yellow-600 hover:border-red-600 hover:shadow-lg transition-all duration-300 hover:scale-105 flex items-center gap-2">
              <AppIcon name="report" /><span>Generate Report</span>
            </button>
            <button onClick={() => setShowCombinations(true)} className="px-5 py-2.5 bg-yellow-50 text-red-600 font-medium rounded-xl border-2 border-yellow-600 hover:border-red-600 hover:shadow-lg transition-all duration-300 hover:scale-105 flex items-center gap-2">
              <AppIcon name="layers" /><span>Combinations</span>
            </button>
            <button onClick={openDistributeModal} className="app-primary-button px-6 py-2.5 bg-gradient-to-r from-yellow-500 to-red-500 text-white border-2 border-yellow-600 font-semibold rounded-xl shadow-md hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center gap-2">
              <AppIcon name="plus" /><span>Distribute Item</span>
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="app-page-panel bg-gradient-to-r from-red-50 to-yellow-50 rounded-2xl shadow-sm border border-yellow-200 p-6 mb-6">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-2">Search Distribution</label>
                <div className="relative">
                  <input type="text" value={filters.search} onChange={e => setFilters(f => ({...f, search: e.target.value}))} placeholder="Search by item, department, or recipient..." className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-300 focus:border-transparent transition"/>
                  <AppIcon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-2">Timeframe</label>
                <select value={filters.timeframe} onChange={e => setFilters(f => ({...f, timeframe: e.target.value}))} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition">
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                  <option value="year">This Year</option>
                  <option value="custom">Custom Range</option>
                </select>
              </div>
              <div className="flex items-end">
                <button type="submit" className="w-full bg-gradient-to-r from-yellow-400 to-red-400 text-white py-2.5 px-4 rounded-lg font-medium hover:shadow-lg transition-all duration-300 hover:scale-105"><AppIcon name="search" size={15} className="app-icon-inline mr-1" /> Search</button>
              </div>
            </div>
            {filters.timeframe === 'custom' && (
              <div className="grid grid-cols-2 gap-4 p-5 bg-gradient-to-r from-red-50 to-orange-50 rounded-xl">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-2">Start Date</label>
                  <input type="date" value={filters.startDate} onChange={e => setFilters(f => ({...f, startDate: e.target.value}))} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 transition"/>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-2">End Date</label>
                  <input type="date" value={filters.endDate} onChange={e => setFilters(f => ({...f, endDate: e.target.value}))} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 transition"/>
                </div>
              </div>
            )}
          </form>
          <div className="mt-4 pt-4 border-t border-slate-100">
            <span className="text-sm font-medium text-slate-600">{loading ? 'Loading...' : `${totalCount} record${totalCount !== 1 ? 's' : ''} found`}</span>
          </div>
        </div>

        {/* Table */}
        <div className="app-page-panel bg-gradient-to-r from-orange-50 to-red-50 rounded-2xl shadow-sm border border-red-100 overflow-hidden">
          <div className="app-table-scroll overflow-x-auto">
            <table className="app-table-wide w-full">
              <thead>
                <tr className="bg-gradient-to-r from-yellow-400 to-red-500 text-white">
                  {COLS.map(h => <th key={h} className="py-4 px-4 text-center text-xs font-semibold uppercase tracking-wider whitespace-nowrap">{h}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={COLS.length} className="py-16 text-center text-slate-400 animate-pulse">Loading...</td></tr>
                ) : (
                  <GroupedTable rows={records} groupBy={groupKey} renderHeader={renderHeader} renderRow={renderRow} columns={COLS} accentClass="border-red-300"/>
                )}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-sm text-slate-600">Page {page} of {totalPages}</span>
              <div className="flex gap-2">
                <button disabled={page <= 1} onClick={() => loadDistributions(page - 1)} className="px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50">← Previous</button>
                <button disabled={page >= totalPages} onClick={() => loadDistributions(page + 1)} className="px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50">Next →</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Distribute Modal */}
      <Modal open={showDistribute} onClose={() => { setShowDistribute(false); setSelectedCombo(''); }} title="Distribute Items" subtitle="Record a new item distribution" maxWidth="max-w-3xl">
        <form onSubmit={handleDistributeSubmit} className="space-y-5">
          <div className="p-5 bg-gradient-to-r from-yellow-50 to-red-50 rounded-xl border border-red-200">
            <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2"><AppIcon name="clipboard" /><span>Distribution Information</span></h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">To Whom *</label>
                <input type="text" required value={distForm.recipient} onChange={e => setDistForm(f => ({...f, recipient: e.target.value}))} className={inputCls} placeholder="Recipient name"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Department *</label>
                <select required value={distForm.department} onChange={e => setDistForm(f => ({...f, department: e.target.value}))} className={inputCls}>
                  <option value="">Select Department</option>
                  {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Date *</label>
                <input type="date" required value={distForm.date} onChange={e => setDistForm(f => ({...f, date: e.target.value}))} className={inputCls}/>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Time *</label>
                <input type="time" required value={distForm.time} onChange={e => setDistForm(f => ({...f, time: e.target.value}))} className={inputCls}/>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Approved By *</label>
                <input type="text" required value={distForm.approved_by} onChange={e => setDistForm(f => ({...f, approved_by: e.target.value}))} className={inputCls} placeholder="Approver name"/>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Debit To <span className="font-normal text-slate-400">(Optional)</span></label>
                <input type="text" value={distForm.debit_to} onChange={e => setDistForm(f => ({...f, debit_to: e.target.value}))} className={inputCls} placeholder="e.g. Contractor Name"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Purpose *</label>
                <textarea rows="2" required value={distForm.purpose} onChange={e => setDistForm(f => ({...f, purpose: e.target.value}))} className={`${inputCls} resize-none`} placeholder="Purpose of distribution..."/>
              </div>
            </div>
          </div>

          {/* Combinations Picker */}
          <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border border-yellow-300">
            <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
              <AppIcon name="layers" /><span>Load from Combination <span className="font-normal text-slate-400">(Optional)</span></span>
            </label>
            {comboLoading ? (
              <p className="text-sm text-slate-400 animate-pulse">Loading combinations...</p>
            ) : combinations.length === 0 ? (
              <p className="text-sm text-slate-400">No combinations saved yet. Create one via the Combinations button.</p>
            ) : (
              <div className="flex gap-3 items-center">
                <select value={selectedCombo} onChange={e => setSelectedCombo(e.target.value)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition text-sm bg-white">
                  <option value="">— Select a combination —</option>
                  {combinations.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.item_count} item{c.item_count !== 1 ? 's' : ''})</option>
                  ))}
                </select>
                <button type="button" disabled={!selectedCombo} onClick={handleLoadCombo}
                  className="px-4 py-2.5 bg-gradient-to-r from-yellow-400 to-red-400 text-white font-medium rounded-lg hover:shadow-md transition-all text-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2">
                  <AppIcon name="zap" /><span>Load Items</span>
                </button>
              </div>
            )}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2"><AppIcon name="package" /><span>Items to Distribute</span></h3>
            <ItemRows value={distItems} onChange={setDistItems} showClassification={true}/>
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-slate-200">
            <span className="text-sm text-slate-600 font-medium">{distItems.length} item{distItems.length !== 1 ? 's' : ''} to distribute</span>
            <div className="flex gap-3">
              <button type="button" onClick={() => { setShowDistribute(false); setSelectedCombo(''); }} className="px-6 py-2.5 bg-slate-100 text-slate-600 font-medium rounded-lg hover:bg-slate-200 transition-colors">Cancel</button>
              <button type="submit" disabled={distLoading} className="px-8 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-300 disabled:opacity-60">
                {distLoading ? 'Distributing...' : 'Distribute All Items'}
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editData} onClose={() => setEditData(null)} title="Edit Distribution" subtitle="Modify distribution details" maxWidth="max-w-2xl">
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Recipient *</label>
              <input type="text" required value={editForm.recipient ?? ''} onChange={e => setEditForm(f => ({...f, recipient: e.target.value}))} className={inputCls}/>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Department *</label>
              <select required value={editForm.department ?? ''} onChange={e => setEditForm(f => ({...f, department: e.target.value}))} className={inputCls}>
                <option value="">Select Department</option>
                {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Approved By *</label>
              <input type="text" required value={editForm.approved_by ?? ''} onChange={e => setEditForm(f => ({...f, approved_by: e.target.value}))} className={inputCls}/>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Debit To</label>
              <input type="text" value={editForm.debit_to ?? ''} onChange={e => setEditForm(f => ({...f, debit_to: e.target.value}))} className={inputCls}/>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Purpose *</label>
            <textarea rows="3" required value={editForm.purpose ?? ''} onChange={e => setEditForm(f => ({...f, purpose: e.target.value}))} className={`${inputCls} resize-none`}/>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button type="button" onClick={() => setEditData(null)} className="px-6 py-2.5 bg-slate-100 text-slate-600 font-medium rounded-lg hover:bg-slate-200 transition-colors">Cancel</button>
            <button type="submit" className="px-8 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-300">Update Distribution</button>
          </div>
        </form>
      </Modal>

      {/* Return Modal */}
      <Modal open={!!returnData} onClose={() => setReturnData(null)} title="Return Distribution" subtitle="Return distributed items to inventory" maxWidth="max-w-md">
        <form onSubmit={handleReturnSubmit} className="space-y-4">
          {returnData && (
            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-sm text-slate-600 mb-1"><strong>Item:</strong> {returnData.item_name}</p>
              <p className="text-sm text-slate-600"><strong>Distributed Quantity:</strong> {returnData.quantity}</p>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Return Quantity *</label>
            <input type="number" min="1" max={returnData?.quantity} required value={returnForm.return_quantity} onChange={e => setReturnForm(f => ({...f, return_quantity: e.target.value}))} className={inputCls}/>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Reason for Return *</label>
            <textarea rows="3" required value={returnForm.return_reason} onChange={e => setReturnForm(f => ({...f, return_reason: e.target.value}))} className={`${inputCls} resize-none`} placeholder="Enter reason..."/>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button type="button" onClick={() => setReturnData(null)} className="px-6 py-2.5 bg-slate-100 text-slate-600 font-medium rounded-lg hover:bg-slate-200 transition-colors">Cancel</button>
            <button type="submit" className="px-8 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-300">Process Return</button>
          </div>
        </form>
      </Modal>

      {/* Combinations Modal */}
      <CombinationsModal open={showCombinations} onClose={() => setShowCombinations(false)} showToast={showToast}/>

      {/* Report Modal */}
      <ReportModal open={showReport} onClose={() => setShowReport(false)} type="distributions"/>

      <ToastContainer toasts={toasts}/>
    </div>
  );
}
