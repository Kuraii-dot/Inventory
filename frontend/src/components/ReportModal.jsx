// frontend/src/components/ReportModal.jsx
// Converted from: the Generate Report modals in distributions.php, allocation.php, allitems.php
//
// PHP: <form action="forms/generate_report.php" method="POST" target="_blank">
// React: controlled form → downloadReport() → blob → auto-download
//
// This single component handles all 4 report types via the `type` prop:
//   type="distributions"  ← generate_report.php
//   type="overall"        ← overall_report.php
//   type="department"     ← department_report.php
//   type="allocations"    ← generate_allocation_report.php

import { useState } from 'react';
import Modal from './Modal.jsx';
import {
  downloadDistributionsReport,
  downloadOverallReport,
  downloadDepartmentReport,
  downloadAllocationsReport,
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

  const [form, setForm] = useState({
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
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await config.fn(form);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate report. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const selectCls = `w-full px-4 py-2.5 border border-slate-200 rounded-lg ${clr.ring} focus:border-transparent transition`;

  return (
    <Modal open={open} onClose={onClose} title={config.title} subtitle={config.subtitle} maxWidth="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Format selector — mirrors: radio buttons in all report modals */}
        <div className={`p-5 bg-gradient-to-r ${clr.bg} rounded-xl border ${clr.border}`}>
          <label className="block text-sm font-semibold text-slate-700 mb-3">Select Format</label>
          <div className="flex gap-6">
            {[['pdf','📄 PDF'], ['excel','📊 Excel']].map(([val, label]) => (
              <label key={val} className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="format" value={val}
                  checked={form.format === val} onChange={handleChange}
                  className="w-4 h-4 accent-slate-700" />
                <span className="text-slate-700 font-medium">{label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Department selector — only for department report */}
        {type === 'department' && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Department *</label>
            <select name="department" required value={form.department} onChange={handleChange} className={selectCls}>
              <option value="">Select Department</option>
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        )}

        {/* Department + Item filters for allocations report */}
        {type === 'allocations' && (
          <>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Department</label>
              <select name="department" value={form.department} onChange={handleChange} className={selectCls}>
                <option value="">All Departments</option>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Category</label>
              <select name="category_id" value={form.category_id} onChange={handleChange} className={selectCls}>
                <option value="all">All Categories</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </>
        )}

        {/* Category + signatories for overall report */}
        {type === 'overall' && (
          <>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Category</label>
              <select name="category_id" value={form.category_id} onChange={handleChange} className={selectCls}>
                <option value="all">All Categories</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
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
          <select name="timeframe" value={form.timeframe} onChange={handleChange} className={selectCls}>
            <option value="today">Today</option>
            <option value="monthly">This Month</option>
            <option value="year">This Year</option>
            <option value="custom">Custom Range</option>
          </select>
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
          <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
          <button type="button" onClick={onClose}
            className="px-6 py-2.5 bg-slate-100 text-slate-600 font-medium rounded-lg hover:bg-slate-200 transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={loading}
            className={`px-8 py-2.5 bg-gradient-to-r ${clr.btn} text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-300 disabled:opacity-60 flex items-center gap-2`}>
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                <span>Generating...</span>
              </>
            ) : (
              <><span>{form.format === 'excel' ? '📊' : '📄'}</span><span>Generate Report</span></>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}