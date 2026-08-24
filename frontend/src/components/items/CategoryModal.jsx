// frontend/src/components/items/CategoryModal.jsx
// Converted from: Add Category modal in items.php
// PHP: categoryForm POST → add_category.php, edit via prompt(), delete via deleteCategory()
// React: controlled state, inline edit, API calls

import { useState } from 'react';
import Modal from '../Modal.jsx';
import { createCategory, updateCategory, deleteCategory } from '../../api/items.js';
import AppIcon from '../AppIcon.jsx';

export default function CategoryModal({ open, onClose, categories, onRefresh, showToast }) {
  const [newName, setNewName]   = useState('');
  const [editId, setEditId]     = useState(null);
  const [editName, setEditName] = useState('');
  const [loading, setLoading]   = useState(false);

  async function handleAdd(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    setLoading(true);
    try {
      await createCategory(newName.trim());
      showToast('Category added successfully!', 'success');
      setNewName('');
      onRefresh();
    } catch (err) {
      showToast(err.response?.data?.message || 'Error adding category.', 'error');
    } finally { setLoading(false); }
  }

  // mirrors: editCategory() — PHP used prompt(), React uses inline input
  async function handleUpdate(id) {
    if (!editName.trim()) return;
    try {
      await updateCategory(id, editName.trim());
      showToast('Category updated successfully!', 'success');
      setEditId(null);
      onRefresh();
    } catch (err) {
      showToast(err.response?.data?.message || 'Error updating category.', 'error');
    }
  }

  // mirrors: deleteCategory() JS function
  async function handleDelete(id) {
    if (!confirm('Are you sure you want to delete this category?')) return;
    try {
      await deleteCategory(id);
      showToast('Category deleted successfully!', 'success');
      onRefresh();
    } catch (err) {
      showToast(err.response?.data?.message || 'Error deleting category.', 'error');
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Manage Categories"
      subtitle="Add, edit, or remove inventory categories" maxWidth="max-w-lg">

      {/* Add form — mirrors the emerald-tinted form section */}
      <form onSubmit={handleAdd} className="mb-6 p-5 bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl border border-emerald-200">
        <label className="block text-sm font-medium text-slate-700 mb-2">New Category Name</label>
        <div className="flex gap-3">
          <input type="text" value={newName} onChange={e => setNewName(e.target.value)} required
            className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
            placeholder="e.g., Office Supplies" />
          <button type="submit" disabled={loading}
            className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-medium rounded-lg hover:shadow-lg transition-all duration-300 disabled:opacity-60">
            Add
          </button>
        </div>
      </form>

      {/* Category list — mirrors the <ul id="categoryList"> */}
      <div>
        <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wider mb-3">Existing Categories</h3>
        <ul className="space-y-2 max-h-80 overflow-y-auto pr-2">
          {categories.map(cat => (
            <li key={cat.id}
              className="group flex justify-between items-center bg-slate-50 hover:bg-slate-100 px-4 py-3 rounded-lg transition-colors border border-slate-200">
              {editId === cat.id ? (
                <div className="flex gap-2 flex-1 mr-2">
                  <input value={editName} onChange={e => setEditName(e.target.value)} autoFocus
                    className="flex-1 px-3 py-1 border border-blue-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                  <button onClick={() => handleUpdate(cat.id)}
                    className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700">Save</button>
                  <button onClick={() => setEditId(null)}
                    className="px-3 py-1 bg-slate-200 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-300">Cancel</button>
                </div>
              ) : (
                <>
                  <span className="font-medium text-slate-700">{cat.name}</span>
                  {/* mirrors: opacity-0 group-hover:opacity-100 buttons */}
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setEditId(cat.id); setEditName(cat.name); }}
                      className="px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors text-xs font-medium">
                      <AppIcon name="edit" size={13} className="app-icon-inline mr-1" /> Edit
                    </button>
                    <button onClick={() => handleDelete(cat.id)}
                      className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-xs font-medium">
                      <AppIcon name="trash" size={13} className="app-icon-inline mr-1" /> Delete
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
          {categories.length === 0 && (
            <li className="text-slate-400 text-sm px-4 py-3">No categories yet.</li>
          )}
        </ul>
      </div>
    </Modal>
  );
}
