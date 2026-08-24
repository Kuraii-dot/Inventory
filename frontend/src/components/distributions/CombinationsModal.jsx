// frontend/src/components/distributions/CombinationsModal.jsx
// Updated to match actual DB schema:
//   combinations:      id, name, description, is_active, created_by
//   combination_items: id, combination_id, item_id, quantity_required, quantity

import { useState, useEffect } from 'react';
import Modal from '../Modal.jsx';
import {
  fetchCombinations, createCombination,
  updateCombination, deleteCombination,
  fetchCombinationById,
} from '../../api/combinations.js';
import { fetchCategories, fetchItemsByCategory } from '../../api/items.js';
import AppIcon from '../AppIcon.jsx';

// Simple item selector row — category → item → quantity
// No classification needed since combination_items doesn't store it
function ItemSelectorRow({ row, idx, categories, onChange, onRemove, showRemove }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (!row.category_id) return;
    fetchItemsByCategory(row.category_id).then(setItems).catch(console.error);
  }, [row.category_id]);

  const selectCls = "w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 text-sm";

  return (
    <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 relative">
      {showRemove && (
        <button type="button" onClick={onRemove}
          className="absolute top-2 right-2 text-red-500 hover:text-red-700 font-bold text-xl leading-none">
          &times;
        </button>
      )}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Category *</label>
          <select value={row.category_id} onChange={e => onChange(idx, 'category_id', e.target.value)}
            required className={selectCls}>
            <option value="">Select Category</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Item *</label>
          <select value={row.item_id} onChange={e => onChange(idx, 'item_id', e.target.value)}
            disabled={!items.length} required
            className={`${selectCls} disabled:bg-slate-100 disabled:cursor-not-allowed`}>
            <option value="">Select Item</option>
            {items.map(i => <option key={i.id} value={i.id}>{i.name} (Stock: {i.quantity})</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Quantity *</label>
          <input type="number" min="1" required value={row.quantity_required}
            onChange={e => onChange(idx, 'quantity_required', e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 text-sm"
            placeholder="0" />
        </div>
      </div>
    </div>
  );
}

const EMPTY_ROW = { category_id: '', item_id: '', quantity_required: '' };

export default function CombinationsModal({ open, onClose, showToast }) {
  const [combinations, setCombinations] = useState([]);
  const [categories,   setCategories]   = useState([]);
  const [loading,      setLoading]      = useState(false);

  // Create form
  const [newName,  setNewName]  = useState('');
  const [newDesc,  setNewDesc]  = useState('');
  const [newItems, setNewItems] = useState([{ ...EMPTY_ROW }]);
  const [saving,   setSaving]   = useState(false);

  // Edit state
  const [editCombo,  setEditCombo]  = useState(null);
  const [editName,   setEditName]   = useState('');
  const [editDesc,   setEditDesc]   = useState('');
  const [editItems,  setEditItems]  = useState([]);

  useEffect(() => {
    if (!open) return;
    loadCombinations();
    fetchCategories().then(setCategories).catch(console.error);
  }, [open]);

  async function loadCombinations() {
    setLoading(true);
    try {
      const result = await fetchCombinations();
      setCombinations(result.data ?? []);
    } catch { showToast('Failed to load combinations.', 'error'); }
    finally { setLoading(false); }
  }

  // Row helpers
  function updateRow(rows, setRows, idx, field, val) {
    setRows(rows.map((r, i) => i === idx
      ? { ...r, [field]: val, ...(field === 'category_id' ? { item_id: '' } : {}) }
      : r
    ));
  }
  function addRow(rows, setRows) { setRows([...rows, { ...EMPTY_ROW }]); }
  function removeRow(rows, setRows, idx) { setRows(rows.filter((_, i) => i !== idx)); }

  // ── Create ──────────────────────────────────────────────────
  async function handleCreate(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    const invalid = newItems.some(i => !i.item_id || !i.quantity_required);
    if (invalid) { showToast('Please fill in all item rows.', 'error'); return; }

    setSaving(true);
    try {
      await createCombination({
        combination_name: newName.trim(),
        description: newDesc.trim(),
        items: newItems.map(i => ({ item_id: i.item_id, quantity_required: parseInt(i.quantity_required) })),
      });
      showToast(`"${newName}" saved!`, 'success');
      setNewName(''); setNewDesc('');
      setNewItems([{ ...EMPTY_ROW }]);
      loadCombinations();
    } catch (err) {
      showToast(err.response?.data?.message || 'Error saving.', 'error');
    } finally { setSaving(false); }
  }

  // ── Edit ────────────────────────────────────────────────────
  async function openEdit(id) {
    try {
      const result = await fetchCombinationById(id);
      const combo  = result.data;
      setEditCombo(combo);
      setEditName(combo.name);
      setEditDesc(combo.description || '');
      setEditItems(combo.items.map(i => ({
        category_id:      String(i.category_id || ''),
        item_id:          String(i.item_id),
        quantity_required: String(i.quantity_required),
      })));
    } catch { showToast('Failed to load combination.', 'error'); }
  }

  async function handleUpdate(e) {
    e.preventDefault();
    const invalid = editItems.some(i => !i.item_id || !i.quantity_required);
    if (invalid) { showToast('Please fill in all item rows.', 'error'); return; }

    setSaving(true);
    try {
      await updateCombination(editCombo.id, {
        combination_name: editName.trim(),
        description: editDesc.trim(),
        items: editItems.map(i => ({ item_id: i.item_id, quantity_required: parseInt(i.quantity_required) })),
      });
      showToast(`"${editName}" updated!`, 'success');
      setEditCombo(null);
      loadCombinations();
    } catch (err) {
      showToast(err.response?.data?.message || 'Error updating.', 'error');
    } finally { setSaving(false); }
  }

  // ── Delete ──────────────────────────────────────────────────
  async function handleDelete(id, name) {
    if (!confirm(`Delete combination "${name}"?`)) return;
    try {
      await deleteCombination(id);
      showToast(`"${name}" deleted.`, 'success');
      loadCombinations();
    } catch { showToast('Error deleting.', 'error'); }
  }

  const btnCls = "px-6 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-300 disabled:opacity-60";
  const inputCls = "w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition";

  // ── Edit sub-modal ──────────────────────────────────────────
  if (editCombo) {
    return (
      <Modal open={!!editCombo} onClose={() => setEditCombo(null)}
        title="Edit Combination" subtitle="Modify the combination name or its items"
        maxWidth="max-w-3xl">
        <form onSubmit={handleUpdate} className="space-y-5">
          <div className="p-5 bg-gradient-to-r from-yellow-50 to-red-50 rounded-xl border border-red-200">
            <label className="block text-sm font-medium text-slate-700 mb-2">Combination Name *</label>
            <input type="text" required value={editName} onChange={e => setEditName(e.target.value)} className={`${inputCls} mb-3`} />
            <label className="block text-sm font-medium text-slate-700 mb-2">Description (Optional)</label>
            <input type="text" value={editDesc} onChange={e => setEditDesc(e.target.value)} className={inputCls} placeholder="e.g. For plumbing repairs" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2"><AppIcon name="package" /> Items</h3>
              <button type="button" onClick={() => addRow(editItems, setEditItems)}
                className="px-3 py-1.5 bg-yellow-100 text-red-700 rounded-lg hover:bg-yellow-200 text-xs font-medium">
                + Add Item
              </button>
            </div>
            <div className="space-y-3">
              {editItems.map((row, idx) => (
                <ItemSelectorRow key={idx} row={row} idx={idx} categories={categories}
                  onChange={(i, f, v) => updateRow(editItems, setEditItems, i, f, v)}
                  onRemove={() => removeRow(editItems, setEditItems, idx)}
                  showRemove={editItems.length > 1} />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button type="button" onClick={() => setEditCombo(null)}
              className="px-6 py-2.5 bg-slate-100 text-slate-600 font-medium rounded-lg hover:bg-slate-200 transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className={btnCls}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={onClose}
      title="Combinations" subtitle="Manage and create item combinations for future distributions"
      maxWidth="max-w-3xl">

      {/* ── Existing list ─────────────────────────────────── */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <AppIcon name="layers" /><span>Existing Combinations</span>
        </h3>
        {loading ? (
          <div className="text-center py-6 text-slate-400 animate-pulse">Loading...</div>
        ) : combinations.length === 0 ? (
          <div className="text-center py-6 text-slate-400 text-sm">No combinations yet. Create one below.</div>
        ) : (
          <div className="space-y-3 max-h-52 overflow-y-auto pr-1">
            {combinations.map(combo => (
              <div key={combo.id} className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-slate-800 flex items-center gap-1"><AppIcon name="layers" size={14} /> {combo.name}</span>
                      <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                        {combo.item_count} item{combo.item_count !== 1 ? 's' : ''}
                      </span>
                    </div>
                    {combo.description && (
                      <p className="text-xs text-slate-500 mb-1">{combo.description}</p>
                    )}
                    <div className="flex flex-wrap gap-1 mt-1">
                      {combo.items.map(item => (
                        <span key={item.id} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">
                          {item.item_name} ×{item.quantity_required}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4 flex-shrink-0">
                    <button onClick={() => openEdit(combo.id)}
                      className="px-3 py-1.5 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 text-xs font-medium">
                      <AppIcon name="edit" size={13} className="app-icon-inline mr-1" /> Edit
                    </button>
                    <button onClick={() => handleDelete(combo.id, combo.name)}
                      className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-xs font-medium">
                      <AppIcon name="trash" size={13} className="app-icon-inline mr-1" /> Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-red-200 my-6" />

      {/* ── Create new ────────────────────────────────────── */}
      <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
        <AppIcon name="plus" /><span>Create New Combination</span>
      </h3>

      <form onSubmit={handleCreate} className="space-y-5">
        <div className="p-5 bg-gradient-to-r from-yellow-50 to-red-50 rounded-xl border border-red-200">
          <label className="block text-sm font-medium text-slate-700 mb-2">Combination Name *</label>
          <input type="text" required value={newName} onChange={e => setNewName(e.target.value)}
            className={`${inputCls} mb-3`} placeholder="e.g. Tubes for Sink" />
          <label className="block text-sm font-medium text-slate-700 mb-2">Description (Optional)</label>
          <input type="text" value={newDesc} onChange={e => setNewDesc(e.target.value)}
            className={inputCls} placeholder="e.g. For plumbing repairs" />
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <AppIcon name="package" /><span>Items in Combination</span>
            </h3>
            <button type="button" onClick={() => addRow(newItems, setNewItems)}
              className="px-4 py-2 bg-yellow-100 text-red-700 rounded-lg hover:bg-yellow-200 text-sm font-medium flex items-center gap-2">
              <AppIcon name="plus" /><span>Add Item</span>
            </button>
          </div>
          <div className="space-y-3">
            {newItems.map((row, idx) => (
              <ItemSelectorRow key={idx} row={row} idx={idx} categories={categories}
                onChange={(i, f, v) => updateRow(newItems, setNewItems, i, f, v)}
                onRemove={() => removeRow(newItems, setNewItems, idx)}
                showRemove={newItems.length > 1} />
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
          <button type="button" onClick={onClose}
            className="px-6 py-2.5 bg-slate-100 text-slate-600 font-medium rounded-lg hover:bg-slate-200 transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={saving} className={btnCls}>
            {saving ? 'Saving...' : 'Save Combination'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
