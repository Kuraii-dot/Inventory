import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  fetchInspectionMaterialCatalog,
  fetchInspectionRequest,
  fetchInspectionRequests,
  releaseInspectionMaterials,
  updateInspectionPreparation,
} from '../api/inspectionRequests.js';
import AppIcon from '../components/AppIcon.jsx';
import Modal from '../components/Modal.jsx';
import ReportModal from '../components/ReportModal.jsx';
import { ToastContainer, useToast } from '../hooks/useToast.jsx';
import { CardGridSkeleton } from '../components/LoadingSkeletons.jsx';
import SearchableSelect from '../components/SearchableSelect.jsx';
import usePersistentState from '../hooks/usePersistentState.js';
import { stockTextClass } from '../utils/stock.js';

const STATUS_LABELS = {
  new: 'New request',
  preparing: 'Preparing',
  ready: 'Ready',
  released: 'Released',
  cancelled: 'Cancelled',
};

const STATUS_STYLES = {
  new: 'bg-blue-100 text-blue-700',
  preparing: 'bg-amber-100 text-amber-700',
  ready: 'bg-emerald-100 text-emerald-700',
  released: 'bg-slate-200 text-slate-700',
  cancelled: 'bg-red-100 text-red-700',
};

const UNCLASSIFIED_VALUE = '__unclassified__';

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-PH', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function materialClassificationValue(material) {
  return material?.classification_id === null || material?.classification_id === undefined
    ? UNCLASSIFIED_VALUE
    : String(material.classification_id);
}

function buildCatalogTree(materials) {
  const categories = new Map();

  materials.forEach(material => {
    const categoryValue = String(material.category_id ?? '');
    if (!categoryValue) return;

    if (!categories.has(categoryValue)) {
      categories.set(categoryValue, {
        value: categoryValue,
        label: material.category_name || 'Uncategorized',
        classifications: new Map(),
      });
    }

    const category = categories.get(categoryValue);
    const classificationValue = materialClassificationValue(material);
    if (!category.classifications.has(classificationValue)) {
      category.classifications.set(classificationValue, {
        value: classificationValue,
        label: material.classification_name || 'Unclassified',
        items: [],
      });
    }
    category.classifications.get(classificationValue).items.push(material);
  });

  return [...categories.values()]
    .map(category => ({
      ...category,
      classifications: [...category.classifications.values()]
        .map(classification => ({
          ...classification,
          items: classification.items.sort((left, right) => left.description.localeCompare(right.description)),
        }))
        .sort((left, right) => left.label.localeCompare(right.label)),
    }))
    .sort((left, right) => left.label.localeCompare(right.label));
}

function toPreparedRows(request, catalog = []) {
  return (request.items || [])
    .filter(line => Number(line.prepared_quantity) > 0 && line.prepared_item_id)
    .map(line => {
      const material = catalog.find(entry => String(entry.item_id) === String(line.prepared_item_id));
      return {
        line_id: line.id,
        category_id: material
          ? String(material.category_id)
          : String(line.prepared_category_id ?? ''),
        classification_id: material
          ? materialClassificationValue(material)
          : (line.prepared_classification_id === null
              ? UNCLASSIFIED_VALUE
              : String(line.prepared_classification_id ?? '')),
        item_id: String(line.prepared_item_id),
        quantity: String(line.prepared_quantity),
        warehouse_remarks: line.warehouse_remarks || '',
      };
    });
}

export default function InspectionRequests() {
  const { toasts, showToast } = useToast();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = usePersistentState('inventory.filters.inspections.search', '');
  const [status, setStatus] = usePersistentState('inventory.filters.inspections.status', '');
  const [selected, setSelected] = useState(null);
  const [catalog, setCatalog] = useState([]);
  const [preparedRows, setPreparedRows] = useState([]);
  const [preparationStatus, setPreparationStatus] = useState('preparing');
  const [warehouseRemarks, setWarehouseRemarks] = useState('');
  const [saving, setSaving] = useState(false);
  const [showReport, setShowReport] = useState(false);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchInspectionRequests({ search: search || undefined, status: status || undefined, limit: 100 });
      setRecords(result.data || []);
    } catch (error) {
      showToast(error.response?.data?.message || 'Could not load inspection requests.', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, status, showToast]);

  useEffect(() => { void loadRequests(); }, [loadRequests]);

  async function openRequest(id) {
    try {
      const [request, materials] = await Promise.all([
        fetchInspectionRequest(id),
        // Re-read through the short API cache on every open so catalog changes
        // made on this or another workstation do not remain stale all session.
        fetchInspectionMaterialCatalog(),
      ]);
      setCatalog(materials);
      setSelected(request);
      setPreparedRows(toPreparedRows(request, materials));
      setPreparationStatus(request.status === 'new' ? 'preparing' : request.status);
      setWarehouseRemarks(request.warehouse_remarks || '');
    } catch (error) {
      showToast(error.response?.data?.message || 'Could not open this request.', 'error');
    }
  }

  const requestedMaterials = useMemo(
    () => (selected?.items || []).filter(line => line.source_active && Number(line.inspector_quantity) > 0),
    [selected]
  );
  const catalogTree = useMemo(() => buildCatalogTree(catalog), [catalog]);
  const categoryOptions = useMemo(
    () => catalogTree.map(category => ({ value: category.value, label: category.label })),
    [catalogTree]
  );
  const firstLoad = loading && records.length === 0;

  function updateRow(index, field, value) {
    setPreparedRows(rows => rows.map((row, rowIndex) => rowIndex === index ? { ...row, [field]: value } : row));
  }

  function addPreparedRow() {
    setPreparedRows(rows => [...rows, {
      category_id: '', classification_id: '', item_id: '', quantity: '1', warehouse_remarks: '',
    }]);
  }

  function updatePreparedCategory(index, value) {
    setPreparedRows(rows => rows.map((row, rowIndex) => rowIndex === index
      ? { ...row, category_id: value, classification_id: '', item_id: '' }
      : row));
  }

  function updatePreparedClassification(index, value) {
    setPreparedRows(rows => rows.map((row, rowIndex) => rowIndex === index
      ? { ...row, classification_id: value, item_id: '' }
      : row));
  }

  function updatePreparedItem(index, value) {
    const material = catalog.find(entry => String(entry.item_id) === String(value));
    setPreparedRows(rows => rows.map((row, rowIndex) => rowIndex === index
      ? {
          ...row,
          item_id: value,
          category_id: material ? String(material.category_id) : row.category_id,
          classification_id: material ? materialClassificationValue(material) : row.classification_id,
        }
      : row));
  }

  function removePreparedRow(index) {
    setPreparedRows(rows => rows.filter((_, rowIndex) => rowIndex !== index));
  }

  async function refreshSelected() {
    if (!selected) return;
    const request = await fetchInspectionRequest(selected.id);
    setSelected(request);
    setPreparedRows(toPreparedRows(request, catalog));
    setWarehouseRemarks(request.warehouse_remarks || '');
  }

  async function savePreparation() {
    if (!selected) return;
    const invalid = preparedRows.some(row => (
      !row.category_id || !row.classification_id || !row.item_id || Number(row.quantity) <= 0
    ));
    if (invalid) {
      showToast('Choose a category, classification, inventory item, and valid quantity for every prepared line.', 'error');
      return;
    }

    setSaving(true);
    try {
      const result = await updateInspectionPreparation(selected.id, {
        status: preparationStatus,
        warehouse_remarks: warehouseRemarks,
        items: preparedRows,
      });
      showToast(result.message || 'Prepared materials updated.');
      await Promise.all([refreshSelected(), loadRequests()]);
    } catch (error) {
      showToast(error.response?.data?.message || 'Could not update prepared materials.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function releaseMaterials() {
    if (!selected || !window.confirm(`Release the prepared materials for ${selected.application_no}? Inventory stock will be deducted.`)) return;
    setSaving(true);
    try {
      const result = await releaseInspectionMaterials(selected.id);
      showToast(result.message || 'Materials released.');
      await Promise.all([refreshSelected(), loadRequests()]);
    } catch (error) {
      showToast(error.response?.data?.message || 'Could not release materials.', 'error');
    } finally {
      setSaving(false);
    }
  }

  const editingDisabled = selected?.status === 'released';

  return (
    <div className="app-page min-h-screen bg-gradient-to-br from-sky-50 via-white to-cyan-50">
      <div className="app-page-inner max-w-screen-xl mx-auto px-4 md:px-8 py-8 md:py-10">
        <div className="app-page-header flex flex-col md:flex-row md:items-end justify-between gap-5 mb-7">
          <div>
            <div className="flex items-center gap-2 text-blue-600 text-xs font-bold uppercase tracking-[0.16em] mb-2">
              <AppIcon name="clipboard" size={15} /> TCMS field operations
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900">Inspection Requests</h1>
            <p className="text-slate-500 text-sm mt-2">Review inspector selections, correct quantities, and prepare materials before release.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setShowReport(true)} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-semibold shadow-sm hover:bg-blue-700">
              <AppIcon name="report" /> Generate Report
            </button>
            <button onClick={() => void loadRequests()} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 font-semibold shadow-sm hover:border-blue-300">
              <AppIcon name="refresh" /> Refresh
            </button>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 mb-5 grid md:grid-cols-[1fr,220px] gap-3">
          <label className="relative">
            <AppIcon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search application, applicant, or barangay…" className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </label>
          <SearchableSelect value={status} onChange={setStatus}
            placeholder="All statuses" searchPlaceholder="Search statuses..."
            options={Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }))} />
        </div>

        {firstLoad ? (
          <CardGridSkeleton cards={6} />
        ) : records.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
            <span className="w-14 h-14 mx-auto rounded-2xl bg-blue-50 text-blue-600 grid place-items-center mb-4"><AppIcon name="packageCheck" size={28} /></span>
            <h2 className="text-lg font-bold text-slate-800">No inspection requests yet</h2>
            <p className="text-sm text-slate-500 mt-1">Submitted field inspections will appear here after TCMS synchronization.</p>
          </div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-4">
            {records.map(record => (
              <button key={record.id} onClick={() => void openRequest(record.id)} className="text-left bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-blue-300 transition">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold tracking-wider text-blue-600">{record.application_no}</p>
                    <h2 className="font-bold text-slate-900 text-lg mt-1">{record.applicant_name}</h2>
                    <p className="text-sm text-slate-500 mt-1">{record.address || 'No address'}{record.barangay ? `, ${record.barangay}` : ''}</p>
                  </div>
                  <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-bold ${STATUS_STYLES[record.status] || STATUS_STYLES.new}`}>{STATUS_LABELS[record.status] || record.status}</span>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t border-slate-100 text-xs">
                  <div><span className="block text-slate-400">Inspected</span><strong className="text-slate-700">{formatDate(record.date_inspected)}</strong></div>
                  <div><span className="block text-slate-400">Requested</span><strong className="text-slate-700">{record.requested_count} items</strong></div>
                  <div><span className="block text-slate-400">Prepared</span><strong className="text-slate-700">{record.prepared_count} items</strong></div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected ? `Application ${selected.application_no}` : ''} subtitle={selected?.applicant_name} maxWidth="max-w-5xl">
        {selected && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-4 gap-3">
              <Info label="Inspector" value={selected.inspector_name || '—'} />
              <Info label="Date inspected" value={formatDate(selected.date_inspected)} />
              <Info label="Recommendation" value={selected.recommendation || '—'} />
              <Info label="Status" value={STATUS_LABELS[selected.status] || selected.status} />
            </div>

            <section>
              <div className="flex items-center gap-2 mb-3"><AppIcon name="clipboard" className="text-blue-600" /><h3 className="font-bold text-slate-800">Inspector requested</h3></div>
              <div className="grid md:grid-cols-2 gap-2">
                {requestedMaterials.length ? requestedMaterials.map(line => (
                  <div key={line.id} className="rounded-xl border border-blue-100 bg-blue-50/70 px-4 py-3 flex justify-between gap-3">
                    <span>
                      <strong className="block font-semibold text-slate-800">{line.inspector_description}</strong>
                      <small className="text-slate-500">
                        {[line.inspector_category, line.inspector_classification].filter(Boolean).join(' · ') || 'Uncategorized'}
                      </small>
                    </span>
                    <span className="text-blue-700 font-bold">× {line.inspector_quantity}</span>
                  </div>
                )) : <p className="text-sm text-slate-500">The inspector did not select any materials.</p>}
              </div>
            </section>

            <section className="border-t border-slate-200 pt-5">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2"><AppIcon name="packageCheck" className="text-emerald-600" /><h3 className="font-bold text-slate-800">Warehouse prepared</h3></div>
                {!editingDisabled && <button onClick={addPreparedRow} className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold"><AppIcon name="plus" size={14} /> Add material</button>}
              </div>
              <div className="space-y-3">
                {preparedRows.map((row, index) => {
                  const selectedMaterial = catalog.find(material => String(material.item_id) === String(row.item_id));
                  const categoryGroup = catalogTree.find(category => category.value === String(row.category_id));
                  const classificationOptions = (categoryGroup?.classifications || [])
                    .map(classification => ({ value: classification.value, label: classification.label }));
                  const classificationGroup = categoryGroup?.classifications
                    .find(classification => classification.value === String(row.classification_id));
                  const itemOptions = (classificationGroup?.items || [])
                    .map(material => ({
                      value: material.item_id,
                      label: material.description,
                      keywords: [material.description, material.item_id, material.code].filter(Boolean).join(' '),
                      stock: material.available_quantity,
                    }));
                  return (
                    <div key={`${row.line_id || 'new'}-${index}`} className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <div>
                          <strong className="block text-sm text-slate-800">Prepared material {index + 1}</strong>
                          <span className="text-xs text-slate-500">Select in order: category, classification, then item.</span>
                        </div>
                        {!editingDisabled && <button onClick={() => removePreparedRow(index)} className="shrink-0 w-10 h-10 grid place-items-center text-red-600 bg-red-50 hover:bg-red-100 rounded-xl" title="Remove prepared material" aria-label={`Remove prepared material ${index + 1}`}><AppIcon name="trash" /></button>}
                      </div>

                      <div className="grid md:grid-cols-3 gap-3 items-start">
                        <label>
                          <span className="block text-xs font-bold text-slate-600 mb-1.5">1. Category</span>
                          <SearchableSelect disabled={editingDisabled} value={row.category_id}
                            onChange={value => updatePreparedCategory(index, value)}
                            placeholder="Choose category" searchPlaceholder="Search categories..."
                            options={categoryOptions} />
                        </label>
                        <label>
                          <span className="block text-xs font-bold text-slate-600 mb-1.5">2. Classification</span>
                          <SearchableSelect disabled={editingDisabled || !row.category_id} value={row.classification_id}
                            onChange={value => updatePreparedClassification(index, value)}
                            placeholder={row.category_id ? 'Choose classification' : 'Choose category first'}
                            searchPlaceholder="Search classifications..." options={classificationOptions} />
                        </label>
                        <label>
                          <span className="block text-xs font-bold text-slate-600 mb-1.5">3. Inventory item</span>
                          <SearchableSelect disabled={editingDisabled || !row.classification_id} value={row.item_id}
                            onChange={value => updatePreparedItem(index, value)}
                            placeholder={row.classification_id ? 'Choose item' : 'Choose classification first'}
                            searchPlaceholder="Search item name or number..." options={itemOptions} />
                          {selectedMaterial && <small className={`mt-1 block font-semibold ${stockTextClass(selectedMaterial.available_quantity)}`}>Available stock: {selectedMaterial.available_quantity} {selectedMaterial.unit || ''}</small>}
                        </label>
                      </div>

                      <div className="grid md:grid-cols-[140px,1fr] gap-3 items-start mt-3 pt-3 border-t border-slate-200">
                        <label>
                          <span className="block text-xs font-bold text-slate-600 mb-1.5">Quantity</span>
                          <input disabled={editingDisabled} type="number" min="1" value={row.quantity} onChange={event => updateRow(index, 'quantity', event.target.value)} className="min-h-[42px] w-full px-3 py-2.5 border border-slate-200 rounded-lg bg-white disabled:bg-slate-100" />
                        </label>
                        <label>
                          <span className="block text-xs font-bold text-slate-600 mb-1.5">Line remarks</span>
                          <input disabled={editingDisabled} value={row.warehouse_remarks} onChange={event => updateRow(index, 'warehouse_remarks', event.target.value)} placeholder="Optional correction note" className="min-h-[42px] w-full px-3 py-2.5 border border-slate-200 rounded-lg bg-white disabled:bg-slate-100" />
                        </label>
                      </div>
                    </div>
                  );
                })}
                {!preparedRows.length && <div className="text-sm text-slate-500 border border-dashed border-slate-300 rounded-xl p-5 text-center">No materials are currently prepared.</div>}
              </div>
            </section>

            <div className="grid md:grid-cols-[220px,1fr] gap-3">
              <label>
                <span className="block text-xs font-semibold text-slate-600 mb-1.5">Preparation status</span>
                <SearchableSelect disabled={editingDisabled} value={preparationStatus} allowEmpty={false}
                  onChange={setPreparationStatus} placeholder="Select status" searchPlaceholder="Search statuses..."
                  options={['new','preparing','ready','cancelled'].map(value => ({ value, label: STATUS_LABELS[value] }))} />
              </label>
              <label>
                <span className="block text-xs font-semibold text-slate-600 mb-1.5">Warehouse remarks</span>
                <input disabled={editingDisabled} value={warehouseRemarks} onChange={event => setWarehouseRemarks(event.target.value)} placeholder="Overall preparation notes" className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-white disabled:bg-slate-100" />
              </label>
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t border-slate-200">
              <button onClick={() => setSelected(null)} className="px-5 py-2.5 border border-slate-200 rounded-xl font-semibold text-slate-600">Close</button>
              {!editingDisabled && <button disabled={saving} onClick={() => void savePreparation()} className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold disabled:opacity-50">{saving ? 'Saving…' : 'Save preparation'}</button>}
              {!editingDisabled && selected.status !== 'cancelled' && <button disabled={saving || !preparedRows.length} onClick={() => void releaseMaterials()} className="inline-flex justify-center items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-bold disabled:opacity-50"><AppIcon name="truck" /> Release materials</button>}
            </div>
          </div>
        )}
      </Modal>
      <ReportModal open={showReport} onClose={() => setShowReport(false)} type="inspections" />
      <ToastContainer toasts={toasts} />
    </div>
  );
}

function Info({ label, value }) {
  return <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2.5"><span className="block text-[10px] uppercase tracking-wide text-slate-400 font-bold">{label}</span><strong className="text-sm text-slate-800">{value}</strong></div>;
}
