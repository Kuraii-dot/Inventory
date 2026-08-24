// frontend/src/components/items/ClassificationModal.jsx

import { useState, useEffect } from 'react';
import Modal from '../Modal.jsx';
import client from '../../api/client.js';
import { fetchClassifications, createClassification } from '../../api/items.js';
import AppIcon from '../AppIcon.jsx';

export default function ClassificationModal({ open, onClose, categories, showToast }) {
  const [selectedCategory,  setSelectedCategory]  = useState('');
  const [classificationName,setClassificationName]= useState('');
  const [classifications,   setClassifications]   = useState([]);
  const [loading,           setLoading]           = useState(false);
  const [editId,            setEditId]            = useState(null);
  const [editName,          setEditName]          = useState('');

  useEffect(() => {
    if (!open) return;
    loadList(selectedCategory);
  }, [open, selectedCategory]);

  async function loadList(categoryId = '') {
    try {
      const data = await fetchClassifications(categoryId || undefined);
      setClassifications(data);
    } catch { showToast('Error loading classifications.', 'error'); }
  }

  // ── Add ──────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault();
    if (!selectedCategory || !classificationName.trim()) return;
    setLoading(true);
    try {
      await createClassification(selectedCategory, classificationName.trim());
      showToast('Classification added!', 'success');
      setClassificationName('');
      loadList(selectedCategory);
    } catch (err) {
      showToast(err.response?.data?.message || 'Error adding.', 'error');
    } finally { setLoading(false); }
  }

  // ── Edit ─────────────────────────────────────────────────
  async function handleUpdate(id) {
    if (!editName.trim()) return;
    try {
      await client.put(`/classifications/${id}`, { classification_name: editName.trim() });
      showToast('Classification updated!', 'success');
      setEditId(null);
      loadList(selectedCategory);
    } catch (err) {
      showToast(err.response?.data?.message || 'Error updating.', 'error');
    }
  }

  // ── Delete ────────────────────────────────────────────────
  async function handleDelete(id) {
    if (!confirm('Delete this classification?')) return;
    try {
      await client.delete(`/classifications/${id}`);
      showToast('Classification deleted!', 'success');
      loadList(selectedCategory);
    } catch (err) {
      showToast(err.response?.data?.message || 'Error deleting.', 'error');
    }
  }

  function getCategoryName(id) {
    return categories.find(c => String(c.id) === String(id))?.name ?? '—';
  }

  return (
    <Modal open={open} onClose={onClose} title="Manage Classifications"
      subtitle="Add, edit or remove classifications under categories" maxWidth="max-w-lg">

      {/* Add form */}
      <form onSubmit={handleSubmit}
        className="mb-6 p-5 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200">
        <label className="block text-sm font-medium text-slate-700 mb-2">Category *</label>
        <select required value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}
          className="w-full mb-3 px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition">
          <option value="">Select Category</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <label className="block text-sm font-medium text-slate-700 mb-2">Classification Name *</label>
        <div className="flex gap-3">
          <input type="text" required value={classificationName}
            onChange={e => setClassificationName(e.target.value)}
            placeholder="e.g., Elbow, Steel Pipes"
            className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"/>
          <button type="submit" disabled={loading}
            className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium rounded-lg hover:shadow-lg transition-all duration-300 disabled:opacity-60">
            Add
          </button>
        </div>
      </form>

      {/* List */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wider">Existing Classifications</h3>
          {selectedCategory && (
            <span className="text-xs text-blue-600 bg-blue-50 px-3 py-1 rounded-full font-medium">
              Showing: {getCategoryName(selectedCategory)}
            </span>
          )}
        </div>

        <ul className="space-y-2 max-h-80 overflow-y-auto pr-2">
          {classifications.length === 0 ? (
            <li className="text-slate-400 text-sm px-4 py-3">
              {selectedCategory ? 'No classifications under this category yet.' : 'No classifications yet.'}
            </li>
          ) : classifications.map(cls => (
            <li key={cls.id}
              className="group flex justify-between items-center bg-slate-50 hover:bg-slate-100 px-4 py-3 rounded-lg transition-colors border border-slate-200">
              {editId === cls.id ? (
                <div className="flex gap-2 flex-1 mr-2">
                  <input value={editName} onChange={e => setEditName(e.target.value)} autoFocus
                    className="flex-1 px-3 py-1 border border-blue-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"/>
                  <button onClick={() => handleUpdate(cls.id)}
                    className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700">Save</button>
                  <button onClick={() => setEditId(null)}
                    className="px-3 py-1 bg-slate-200 text-slate-600 rounded-lg text-xs font-medium">Cancel</button>
                </div>
              ) : (
                <>
                  <div>
                    <span className="font-medium text-slate-700">{cls.classification_name}</span>
                    {!selectedCategory && (
                      <span className="ml-2 text-xs text-slate-400">({getCategoryName(cls.category_id)})</span>
                    )}
                  </div>
                  {/* Edit + Delete — visible on hover */}
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setEditId(cls.id); setEditName(cls.classification_name); }}
                      className="px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors text-xs font-medium">
                      <AppIcon name="edit" size={13} className="app-icon-inline mr-1" /> Edit
                    </button>
                    <button onClick={() => handleDelete(cls.id)}
                      className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-xs font-medium">
                      <AppIcon name="trash" size={13} className="app-icon-inline mr-1" /> Delete
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      </div>
    </Modal>
  );
}
