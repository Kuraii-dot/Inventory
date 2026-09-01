// frontend/src/components/items/SupplierModal.jsx
// Converted from: Add Supplier modal in items.php + front/js/supplier.js
// PHP: supplierForm POST → add_supplier.php, edit via editSupplier(), delete via deleteSupplier()

import { useState } from 'react';
import Modal from '../Modal.jsx';
import { createSupplier, updateSupplier, deleteSupplier } from '../../api/items.js';
import AppIcon from '../AppIcon.jsx';

export default function SupplierModal({ open, onClose, suppliers, onRefresh, showToast }) {
  const [newName, setNewName]   = useState('');
  const [editId, setEditId]     = useState(null);
  const [editName, setEditName] = useState('');
  const [loading, setLoading]   = useState(false);

  async function handleAdd(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    setLoading(true);
    try {
      await createSupplier(newName.trim());
      showToast('Supplier added successfully!', 'success');
      setNewName('');
      onRefresh();
    } catch (err) {
      showToast(err.response?.data?.message || 'Error adding supplier.', 'error');
    } finally { setLoading(false); }
  }

  // mirrors: editSupplier() in supplier.js — used prompt(), now inline input
  async function handleUpdate(id) {
    if (!editName.trim()) return;
    try {
      await updateSupplier(id, editName.trim());
      showToast('Supplier updated successfully!', 'success');
      setEditId(null);
      onRefresh();
    } catch (err) {
      showToast(err.response?.data?.message || 'Error updating supplier.', 'error');
    }
  }

  // mirrors: deleteSupplier() in supplier.js
  async function handleDelete(id, name) {
    if (!confirm(`WARNING: Delete supplier "${name}"?\n\nThis action cannot be undone.`)) return;
    try {
      await deleteSupplier(id);
      showToast('Supplier deleted successfully!', 'success');
      onRefresh();
    } catch (err) {
      showToast(err.response?.data?.message || 'Error deleting supplier.', 'error');
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Manage Suppliers"
      subtitle="Add, edit, or remove suppliers" maxWidth="max-w-lg">

      {/* mirrors: violet-tinted add form */}
      <form onSubmit={handleAdd} className="mb-6 p-5 bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl border border-violet-200">
        <label className="block text-sm font-medium text-slate-700 mb-2">New Supplier Name</label>
        <div className="flex gap-3">
          <input type="text" value={newName} onChange={e => setNewName(e.target.value)} required
            className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent transition"
            placeholder="e.g., ABC Corporation" />
          <button type="submit" disabled={loading}
            className="px-6 py-2.5 bg-gradient-to-r from-violet-500 to-violet-600 text-white font-medium rounded-lg hover:shadow-lg transition-all duration-300 disabled:opacity-60">
            Add
          </button>
        </div>
      </form>

      {/* mirrors: <ul id="supplierList"> */}
      <div>
        <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wider mb-3">Existing Suppliers</h3>
        <ul className="space-y-2 max-h-80 overflow-y-auto pr-2">
          {suppliers.map(sup => (
            <li key={sup.id}
              className="group flex justify-between items-center bg-slate-50 hover:bg-slate-100 px-4 py-3 rounded-lg transition-colors border border-slate-200">
              {editId === sup.id ? (
                <div className="flex gap-2 flex-1 mr-2">
                  <input value={editName} onChange={e => setEditName(e.target.value)} autoFocus
                    className="flex-1 px-3 py-1 border border-violet-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500" />
                  <button onClick={() => handleUpdate(sup.id)}
                    className="px-3 py-1 bg-violet-600 text-white rounded-lg text-xs font-medium hover:bg-violet-700">Save</button>
                  <button onClick={() => setEditId(null)}
                    className="px-3 py-1 bg-slate-200 text-slate-600 rounded-lg text-xs font-medium">Cancel</button>
                </div>
              ) : (
                <>
                  <span className="font-medium text-slate-700">{sup.name}</span>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setEditId(sup.id); setEditName(sup.name); }}
                      className="px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors text-xs font-medium">
                      <AppIcon name="edit" size={13} className="app-icon-inline mr-1" /> Edit
                    </button>
                    <button onClick={() => handleDelete(sup.id, sup.name)}
                      className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-xs font-medium">
                      <AppIcon name="trash" size={13} className="app-icon-inline mr-1" /> Delete
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
          {suppliers.length === 0 && (
            <li className="text-slate-400 text-sm px-4 py-3">No suppliers yet.</li>
          )}
        </ul>
      </div>
    </Modal>
  );
}
