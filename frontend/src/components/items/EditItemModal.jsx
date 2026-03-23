// frontend/src/components/items/EditItemModal.jsx
// Converted from:
//   pages/forms/edit_item.php          (the form HTML fetched via AJAX)
//   openEditItemModal() in items.php   (AJAX fetch of form + submit handler)
//   initEditModal() in items.php       (category→classification cascade)
//
// PHP pattern: fetch the entire form HTML via AJAX, inject into modal div
// React pattern: fetch item data as JSON, populate controlled form state

import { useState, useEffect } from 'react';
import Modal from '../Modal.jsx';
import { fetchItemById, updateItem } from '../../api/items.js';
import { fetchClassifications } from '../../api/items.js';

export default function EditItemModal({ itemId, open, onClose, categories, suppliers, onSuccess }) {
  const [form, setForm] = useState({
    name: '', category_id: '', classification_id: '',
    supplier_id: '', quantity: '', unit_price: '', unit: 'Pcs'
  });
  const [classifications, setClassifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  // Fetch item data when modal opens — mirrors: fetch(`forms/edit_item.php?id=${itemId}`)
  useEffect(() => {
    if (!open || !itemId) return;
    setFetching(true);
    fetchItemById(itemId)
      .then(item => {
        setForm({
          name:              item.name,
          category_id:       item.category_id       ?? '',
          classification_id: item.classification_id ?? '',
          supplier_id:       item.supplier_id        ?? '',
          quantity:          item.quantity,
          unit_price:        item.unit_price,
          unit:              item.unit || 'Pcs',
        });
      })
      .catch(console.error)
      .finally(() => setFetching(false));
  }, [open, itemId]);

  // mirrors: initEditModal() category→classification cascade
  useEffect(() => {
    if (!form.category_id) return;
    fetchClassifications(form.category_id).then(setClassifications).catch(console.error);
  }, [form.category_id]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  }

  // mirrors: editItemForm submit → fetch('/InventorySys/actions/edit_item.php', POST)
  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await updateItem(itemId, form);
      onSuccess('Item updated successfully!');
      onClose();
    } catch (err) {
      onSuccess(err.response?.data?.message || 'Error updating item.', 'error');
    } finally {
      setLoading(false);
    }
  }

  const inputCls = "w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition";

  return (
    <Modal open={open} onClose={onClose} title="✏️ Edit Item">
      {fetching ? (
        // mirrors: <div class='text-center text-slate-500'>Loading...</div>
        <div className="text-center py-10 text-slate-500 animate-pulse">Loading...</div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Item Name</label>
            <input type="text" name="name" required value={form.name} onChange={handleChange} className={inputCls} />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Category</label>
            <select name="category_id" required value={form.category_id} onChange={handleChange} className={inputCls}>
              <option value="">-- Select Category --</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* mirrors: #editClassification — populated by initEditModal() */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Classification</label>
            <select name="classification_id" value={form.classification_id} onChange={handleChange} className={inputCls}>
              <option value="">-- Select Classification --</option>
              {classifications.map(c => <option key={c.id} value={c.id}>{c.classification_name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Supplier</label>
            <select name="supplier_id" required value={form.supplier_id} onChange={handleChange} className={inputCls}>
              <option value="">-- Select Supplier --</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Quantity</label>
              <input type="number" name="quantity" required min="0" value={form.quantity} onChange={handleChange} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Unit *</label>
              <select name="unit" required value={form.unit} onChange={handleChange} className={inputCls}>
                <option value="Pc">Pc</option>
                <option value="Set">Set</option>
                <option value="Pcs">Pcs</option>
                <option value="Mtr">Mtr</option>
                <option value="Mtrs">Mtrs</option>
                <option value="Assy">Assy</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Unit Price (₱)</label>
              <input type="number" step="0.01" name="unit_price" required value={form.unit_price} onChange={handleChange} className={inputCls} />
            </div>
          </div>

          <div className="flex justify-end mt-6 gap-3">
            <button type="button" onClick={onClose}
              className="px-6 py-2.5 bg-slate-100 text-slate-600 font-medium rounded-lg hover:bg-slate-200 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-60">
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}