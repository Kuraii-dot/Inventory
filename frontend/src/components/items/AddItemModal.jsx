// frontend/src/components/items/AddItemModal.jsx
// Converted from: the Add Item modal in items.php
// PHP: <form method="POST" name="add_item"> + inline PHP echo for success/error
// React: controlled form state + API call + toast feedback

import { useState, useEffect } from 'react';
import Modal from '../Modal.jsx';
import { createItem } from '../../api/items.js';
import { fetchClassifications } from '../../api/items.js';
import SearchableSelect from '../SearchableSelect.jsx';

const today = new Date().toISOString().split('T')[0];

export default function AddItemModal({ open, onClose, categories, suppliers, onSuccess }) {
  const [form, setForm] = useState({
    name: '', category_id: '', classification_id: '', supplier_id: '',
    quantity: '', unit_price: '', unit: 'Pcs', sku: '', date_ordered: today, date_procured: today, notes: ''
  });
  const [classifications, setClassifications] = useState([]);
  const [loading, setLoading] = useState(false);

  // mirrors: category select onChange → fetch classifications for that category
  // Converted from: classificationSelect disabled until category picked in items.php
  useEffect(() => {
    if (!form.category_id) {
      setClassifications([]);
      setForm(f => ({ ...f, classification_id: '' }));
      return;
    }
    fetchClassifications(form.category_id).then(setClassifications).catch(console.error);
  }, [form.category_id]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await createItem(form);
      onSuccess('Item added successfully!');
      onClose();
      setForm({
        name: '', category_id: '', classification_id: '', supplier_id: '',
        quantity: '', unit_price: '', unit: 'Pcs', sku: '', date_ordered: today, date_procured: today, notes: ''
      });
    } catch (err) {
      onSuccess(err.response?.data?.message || 'Error adding item.', 'error');
    } finally {
      setLoading(false);
    }
  }

  const inputCls = "w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition";

  return (
    <Modal open={open} onClose={onClose} title="Add New Item" subtitle="Fill in the details to add a new inventory item">
      <form onSubmit={handleSubmit} className="space-y-5">

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Item Name *</label>
          <input type="text" name="name" required value={form.name} onChange={handleChange}
            className={inputCls} placeholder="Enter item name" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Category *</label>
            <SearchableSelect name="category_id" required value={form.category_id}
              onChange={value => setForm(f => ({ ...f, category_id: value }))}
              placeholder="Select Category" searchPlaceholder="Search categories..."
              options={categories.map(c => ({ value: c.id, label: c.name }))} />
          </div>

          {/* mirrors: classificationSelect disabled until category is picked */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Classification</label>
            <SearchableSelect name="classification_id" value={form.classification_id}
              onChange={value => setForm(f => ({ ...f, classification_id: value }))}
              disabled={!form.category_id || classifications.length === 0}
              placeholder="Select Classification" searchPlaceholder="Search classifications..."
              options={classifications.map(c => ({ value: c.id, label: c.classification_name }))} />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Supplier *</label>
            <SearchableSelect name="supplier_id" required value={form.supplier_id}
              onChange={value => setForm(f => ({ ...f, supplier_id: value }))}
              placeholder="Select Supplier" searchPlaceholder="Search suppliers..."
              options={suppliers.map(s => ({ value: s.id, label: s.name }))} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Quantity *</label>
            <input type="number" name="quantity" required min="0" value={form.quantity} onChange={handleChange}
              className={inputCls} placeholder="0" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Item Code <span className="font-normal text-slate-400">(leave blank to auto-generate)</span>
            </label>
            <input type="text" name="sku" value={form.sku} onChange={handleChange}
              placeholder={form.category_id ? `e.g. ${form.category_id}-${form.classification_id || '00'}-[ID]` : 'Auto-generated on save'}
              className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Unit *</label>
            <SearchableSelect name="unit" required value={form.unit} allowEmpty={false}
              onChange={value => setForm(f => ({ ...f, unit: value }))}
              placeholder="Select Unit" searchPlaceholder="Search units..."
              options={['Pc','Pcs','Mtr','Mtrs','Assy'].map(unit => ({ value: unit, label: unit }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Unit Price (₱) *</label>
            <input type="number" step="0.01" name="unit_price" required value={form.unit_price} onChange={handleChange}
              className={inputCls} placeholder="0.00" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Date Ordered *</label>
            <input type="date" name="date_ordered" required value={form.date_ordered} onChange={handleChange} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Date Procured *</label>
            <input type="date" name="date_procured" required value={form.date_procured} onChange={handleChange} className={inputCls} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Notes (Optional)</label>
          <textarea name="notes" rows="3" value={form.notes} onChange={handleChange}
            className={`${inputCls} resize-none`} placeholder="Additional notes..." />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={onClose}
            className="px-6 py-2.5 bg-slate-100 text-slate-600 font-medium rounded-lg hover:bg-slate-200 transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={loading}
            className="px-8 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-300 disabled:opacity-60">
            {loading ? 'Saving...' : 'Save Item'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
