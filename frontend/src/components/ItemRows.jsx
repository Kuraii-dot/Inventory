// frontend/src/components/ItemRows.jsx

import { useState, useEffect, useRef } from 'react';
import {
  fetchCategories, fetchClassifications,
  fetchItemsByClassification, fetchItemsByCategory,
  validateStock,
} from '../api/items.js';

const EMPTY_ROW = { category_id: '', classification_id: '', item_id: '', quantity: '' };

function ItemRow({ row, idx, categories, onRowChange, onRemove, showRemove, showClassification }) {
  const [clsOptions,   setClsOptions]   = useState([]);
  const [itemOptions,  setItemOptions]  = useState([]);
  const [stockWarning, setStockWarning] = useState(null);

  // Load cascade when category_id changes or is pre-filled
  useEffect(() => {
    if (!row.category_id) {
      setClsOptions([]);
      setItemOptions([]);
      return;
    }

    async function loadForCategory() {
      if (showClassification) {
        const cls = await fetchClassifications(row.category_id);
        setClsOptions(cls);
        if (row.classification_id) {
          const items = await fetchItemsByClassification(row.classification_id);
          setItemOptions(items);
        }
      } else {
        const items = await fetchItemsByCategory(row.category_id);
        setItemOptions(items);
      }
    }

    loadForCategory().catch(console.error);
  }, [row.category_id, row.classification_id, showClassification]);

  async function handleCategoryChange(val) {
    onRowChange(idx, { category_id: val, classification_id: '', item_id: '' });
    setClsOptions([]);
    setItemOptions([]);
  }

  async function handleClassificationChange(val) {
    onRowChange(idx, { classification_id: val, item_id: '' });
    if (val) {
      const items = await fetchItemsByClassification(val);
      setItemOptions(items);
    } else {
      setItemOptions([]);
    }
  }

  async function handleQtyChange(qty) {
    onRowChange(idx, { quantity: qty });
    if (!row.item_id || !qty || parseInt(qty) <= 0) { setStockWarning(null); return; }
    try {
      const result = await validateStock(row.item_id, parseInt(qty));
      setStockWarning(result);
    } catch { setStockWarning(null); }
  }

  const sel = "w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm";

  return (
    <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 relative">
      {showRemove && (
        <button type="button" onClick={() => onRemove(idx)}
          className="absolute top-2 right-2 text-red-500 hover:text-red-700 font-bold text-xl leading-none">
          &times;
        </button>
      )}
      <div className={`grid gap-3 ${showClassification ? 'grid-cols-4' : 'grid-cols-3'}`}>

        {/* Category */}
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Category *</label>
          <select value={row.category_id}
            onChange={e => handleCategoryChange(e.target.value)}
            required className={sel}>
            <option value="">Select Category</option>
            {categories.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
          </select>
        </div>

        {/* Classification */}
        {showClassification && (
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Classification</label>
            <select value={row.classification_id}
              onChange={e => handleClassificationChange(e.target.value)}
              disabled={clsOptions.length === 0}
              className={`${sel} disabled:bg-slate-100 disabled:cursor-not-allowed`}>
              <option value="">Select Classification</option>
              {clsOptions.map(c => <option key={c.id} value={String(c.id)}>{c.classification_name}</option>)}
            </select>
          </div>
        )}

        {/* Item */}
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Item *</label>
          <select value={row.item_id}
            onChange={e => onRowChange(idx, { item_id: e.target.value })}
            disabled={itemOptions.length === 0}
            required className={`${sel} disabled:bg-slate-100 disabled:cursor-not-allowed`}>
            <option value="">Select Item</option>
            {itemOptions.map(i => (
              <option key={i.id} value={String(i.id)}>{i.name} (Stock: {i.quantity})</option>
            ))}
          </select>
        </div>

        {/* Quantity */}
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Quantity *</label>
          <input type="number" min="1" required value={row.quantity}
            onChange={e => handleQtyChange(e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 text-sm ${
              stockWarning && !stockWarning.valid ? 'border-red-500' : 'border-slate-200'
            }`} placeholder="0" />
          {stockWarning && (
            <p className={`text-xs mt-1 ${stockWarning.valid ? 'text-green-600' : 'text-red-600'}`}>
              {stockWarning.valid
                ? `✓ ${stockWarning.remaining} remaining`
                : `⚠️ ${stockWarning.message} (Available: ${stockWarning.available})`}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ItemRows({ value, onChange, showClassification = true }) {
  const [categories, setCategories] = useState([]);
  const loadedRef = useRef(false);

  // Load categories once and cache — also reload if categories is empty
  useEffect(() => {
    if (loadedRef.current && categories.length > 0) return;
    loadedRef.current = true;
    fetchCategories()
      .then(data => {
        if (data?.length > 0) setCategories(data);
      })
      .catch(console.error);
  });

  // Update multiple fields at once — fixes stale state bug
  function onRowChange(idx, fields) {
    onChange(value.map((row, i) => i === idx ? { ...row, ...fields } : row));
  }

  function addRow()       { onChange([...value, { ...EMPTY_ROW }]); }
  function removeRow(idx) { onChange(value.filter((_, i) => i !== idx)); }

  return (
    <div className="space-y-4">
      {value.map((row, idx) => (
        <ItemRow
          key={`${idx}-${row.category_id}-${row.classification_id}-${row.item_id}`}
          row={row}
          idx={idx}
          categories={categories}
          onRowChange={onRowChange}
          onRemove={removeRow}
          showRemove={value.length > 1}
          showClassification={showClassification}
        />
      ))}
      <button type="button" onClick={addRow}
        className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-sm font-medium flex items-center gap-2">
        <span>+</span><span>Add Another Item</span>
      </button>
    </div>
  );
}