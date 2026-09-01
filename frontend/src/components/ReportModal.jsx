// frontend/src/components/ReportModal.jsx
// Converted from: the Generate Report modals in distributions.php, allocation.php, allitems.php
//
// PHP: <form action="forms/generate_report.php" method="POST" target="_blank">
// React: controlled form → downloadReport() → blob → auto-download
//
// This single component handles all report types via the `type` prop:
//   type="distributions"  ← generate_report.php
//   type="overall"        ← overall_report.php
//   type="department"     ← department_report.php
//   type="allocations"    ← generate_allocation_report.php

import { useState } from 'react';
import Modal from './Modal.jsx';
import AppIcon from './AppIcon.jsx';
import SearchableSelect from './SearchableSelect.jsx';
import usePersistentState from '../hooks/usePersistentState.js';
import {
  downloadDistributionsReport,
  downloadOverallReport,
  downloadDepartmentReport,
  downloadAllocationsReport,
  downloadInspectionRequestsReport,
} from '../api/reports.js';

const DEPARTMENTS = ['Admin', 'Engineering', 'Commercial', 'Finance'];

// Config per report type
const REPORT_CONFIG = {
  distributions: {
    title:    'Generate Distributions Report',
    subtitle: 'Export distribution records in your preferred format',
    color:    'blue',
    fn:       downloadDistributionsReport,
  },
  overall: {
    title:    'Generate Overall Item Report',
    subtitle: 'Export item stock and distribution summary',
    color:    'emerald',
    fn:       downloadOverallReport,
  },
  department: {
    title:    'Generate Department Report',
    subtitle: 'Export distributions for a specific department',
    color:    'amber',
    fn:       downloadDepartmentReport,
  },
  allocations: {
    title:    'Generate Allocations Report',
    subtitle: 'Export allocation records in your preferred format',
    color:    'purple',
    fn:       downloadAllocationsReport,
  },
  inspections: {
    title:    'Generate Inspection Report',
    subtitle: 'Track requested, prepared, and released materials by application',
    color:    'blue',
    fn:       downloadInspectionRequestsReport,
  },
};

const COLOR_MAP = {
  blue:    { btn: 'from-blue-500 to-blue-600',    ring: 'focus:ring-blue-500',    bg: 'from-blue-50 to-indigo-50',    border: 'border-blue-200'    },
  emerald: { btn: 'from-emerald-500 to-emerald-600', ring: 'focus:ring-emerald-500', bg: 'from-emerald-50 to-green-50', border: 'border-emerald-200' },
  amber:   { btn: 'from-amber-500 to-amber-600',  ring: 'focus:ring-amber-500',   bg: 'from-amber-50 to-yellow-50',   border: 'border-amber-200'   },
  purple:  { btn: 'from-purple-500 to-violet-600', ring: 'focus:ring-purple-500', bg: 'from-purple-50 to-violet-50',  border: 'border-purple-200'  },
};

export default function ReportModal({
  open, onClose,
  type = 'distributions',
  categories = [],
}) {
  const config = REPORT_CONFIG[type] ?? REPORT_CONFIG.distributions;
  const clr    = COLOR_MAP[config.color];

  const [form, setForm] = usePersistentState(`inventory.filters.report.${type}`, {
    format:      'pdf',
    timeframe:   'today',
    from:        '',
    to:          '',
    department:  '',
    category_id: 'all',
    item_id:     'all',
    prepared_by: '',
    reviewed_by: '',
    approved_by: '',
    status:      'all',
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [generatedFilename, setGeneratedFilename] = useState('');

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    setGeneratedFilename('');
  }

  function handleSelect(name, value) {
    setForm(current => ({ ...current, [name]: value }));
    setGeneratedFilename('');
  }

  function handleClose() {
    if (loading) return;
    setError('');
    setGeneratedFilename('');
    onClose();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setGeneratedFilename('');
    setLoading(true);
    try {
      const filename = await config.fn(form);
      setGeneratedFilename(filename);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate report. Please try again.');
    } finally {
      setLoading(false);
    }
  }


  return (
    <Modal open={open} onClose={handleClose} title={config.title} subtitle={config.subtitle} maxWidth="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Format selector — mirrors: radio buttons in all report modals */}
        <div className={`p-5 bg-gradient-to-r ${clr.bg} rounded-xl border ${clr.border}`}>
          <label className="block text-sm font-semibold text-slate-700 mb-3">Select Format</label>
          <div className="flex gap-6">
            {[['pdf','PDF','file'], ['excel','Excel','report']].map(([val, label, icon]) => (
              <label key={val} className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="format" value={val}
                  checked={form.format === val} onChange={handleChange}
                  className="w-4 h-4 accent-slate-700" />
                <span className="text-slate-700 font-medium flex items-center gap-2"><AppIcon name={icon} size={15} />{label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Department selector — only for department report */}
        {type === 'department' && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Department *</label>
            <SearchableSelect name="department" required value={form.department}
              onChange={value => handleSelect('department', value)}
              placeholder="Select Department" searchPlaceholder="Search departments..."
              options={DEPARTMENTS.map(department => ({ value: department, label: department }))} />
          </div>
        )}

        {/* Department + Item filters for allocations report */}
        {type === 'allocations' && (
          <>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Department</label>
              <SearchableSelect name="department" value={form.department}
                onChange={value => handleSelect('department', value)}
                placeholder="All Departments" searchPlaceholder="Search departments..."
                options={DEPARTMENTS.map(department => ({ value: department, label: department }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Category</label>
              <SearchableSelect name="category_id" value={form.category_id} allowEmpty={false}
                onChange={value => handleSelect('category_id', value)}
                placeholder="All Categories" searchPlaceholder="Search categories..."
                options={[{ value: 'all', label: 'All Categories' }, ...categories.map(c => ({ value: c.id, label: c.name }))]} />
            </div>
          </>
        )}

        {type === 'inspections' && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Request Status</label>
            <SearchableSelect name="status" value={form.status} allowEmpty={false}
              onChange={value => handleSelect('status', value)}
              placeholder="All statuses" searchPlaceholder="Search statuses..."
              options={[
                ['all','All statuses'], ['new','New request'], ['preparing','Preparing'],
                ['ready','Ready'], ['released','Released'], ['cancelled','Cancelled'],
              ].map(([value, label]) => ({ value, label }))} />
          </div>
        )}

        {/* Category + signatories for overall report */}
        {type === 'overall' && (
          <>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Category</label>
              <SearchableSelect name="category_id" value={form.category_id} allowEmpty={false}
                onChange={value => handleSelect('category_id', value)}
                placeholder="All Categories" searchPlaceholder="Search categories..."
                options={[{ value: 'all', label: 'All Categories' }, ...categories.map(c => ({ value: c.id, label: c.name }))]} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[['prepared_by','Prepared By'],['reviewed_by','Reviewed By'],['approved_by','Approved By']].map(([k,l]) => (
                <div key={k}>
                  <label className="block text-xs text-slate-500 mb-1">{l}</label>
                  <input type="text" name={k} value={form[k]} onChange={handleChange}
                    className={`w-full px-3 py-2 border border-slate-200 rounded-lg ${clr.ring} focus:border-transparent transition text-sm`}
                    placeholder={l} />
                </div>
              ))}
            </div>
          </>
        )}

        {/* Timeframe — mirrors: timeframe select in all report modals */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Timeframe</label>
          <SearchableSelect name="timeframe" value={form.timeframe} allowEmpty={false}
            onChange={value => handleSelect('timeframe', value)}
            placeholder="Select timeframe" searchPlaceholder="Search timeframes..."
            options={[
              ['today','Today'], ['monthly','This Month'], ['year','This Year'], ['custom','Custom Range'],
            ].map(([value, label]) => ({ value, label }))} />
        </div>

        {/* Custom range — mirrors: the hidden #customRange div toggled by JS */}
        {form.timeframe === 'custom' && (
          <div className={`grid grid-cols-2 gap-3 p-4 bg-gradient-to-r ${clr.bg} rounded-xl border ${clr.border}`}>
            <div>
              <label className="block text-xs text-slate-500 mb-1">From</label>
              <input type="date" name="from" required value={form.from} onChange={handleChange}
                className={`w-full px-3 py-2 border border-slate-200 rounded-lg ${clr.ring} focus:border-transparent transition`} />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">To</label>
              <input type="date" name="to" required value={form.to} onChange={handleChange}
                className={`w-full px-3 py-2 border border-slate-200 rounded-lg ${clr.ring} focus:border-transparent transition`} />
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div role="alert" className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
            {error}
          </div>
        )}

        {generatedFilename && (
          <div role="status" aria-live="polite" className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex gap-3">
            <span className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <AppIcon name="check" size={18} />
            </span>
            <div>
              <p className="font-semibold">Report generated successfully</p>
              <p className="text-sm mt-1 text-emerald-700">
                Saved to your Downloads folder as <strong>{generatedFilename}</strong>.
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
          <button type="button" onClick={handleClose}
            className="px-6 py-2.5 bg-slate-100 text-slate-600 font-medium rounded-lg hover:bg-slate-200 transition-colors">
            {generatedFilename ? 'Done' : 'Cancel'}
          </button>
          <button type="submit" disabled={loading}
            className={`px-8 py-2.5 bg-gradient-to-r ${clr.btn} text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-300 disabled:opacity-60 flex items-center gap-2`}>
            {loading ? (
              <><AppIcon name="refresh" className="animate-spin" /><span>Generating...</span></>
            ) : (
              <><AppIcon name={form.format === 'excel' ? 'report' : 'file'} /><span>{generatedFilename ? 'Generate Again' : 'Generate Report'}</span></>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
