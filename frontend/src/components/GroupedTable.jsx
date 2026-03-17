// frontend/src/components/GroupedTable.jsx
// Converted from: the toggleGroup() + .group-items CSS pattern shared by
//   allocation.php and distributions.php
//
// PHP/vanilla JS: DOM .classList.toggle('expanded'), inline HTML renderTable()
// React: useState for expanded groups, map over grouped data

import { useState } from 'react';

// groupBy: function(row) => string key
// renderHeader: function(key, items) => JSX for the group header content
// renderRow: function(row, idx) => JSX <tr>
// columns: array of column header strings
export default function GroupedTable({ rows, groupBy, renderHeader, renderRow, columns, accentClass = 'border-purple-300' }) {
  const [expanded, setExpanded] = useState({});

  function toggle(key) {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  }

  // mirrors: PHP $grouped = []; foreach ... $grouped[$cat][] = $row;
  const grouped = rows.reduce((acc, row) => {
    const key = groupBy(row);
    (acc[key] ??= []).push(row);
    return acc;
  }, {});

  if (!rows.length) {
    return (
      <tr>
        <td colSpan={columns.length} className="py-16 text-center">
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-3xl">📭</span>
            </div>
            <p className="text-slate-500 font-medium text-lg">No records found</p>
            <p className="text-slate-400 text-sm mt-1">Try adjusting your search or date range</p>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <>
      {Object.entries(grouped).map(([key, groupRows]) => {
        const isOpen = !!expanded[key];
        return [
          // ── Group header row ──────────────────────────────────────
          <tr key={`h-${key}`}
            className="cursor-pointer bg-gradient-to-r from-pink-50 to-blue-50 hover:from-pink-100 hover:to-blue-100 border-b-2 border-purple-200"
            onClick={() => toggle(key)}>
            <td colSpan={columns.length} className="py-4 px-6 font-semibold text-slate-800">
              <div className="flex items-center gap-3">
                {/* mirrors: .group-toggle span with .rotated class */}
                <span className={`text-blue-500 font-bold text-lg inline-block transition-transform duration-300 ${isOpen ? 'rotate-90' : ''}`}>
                  ⮞
                </span>
                {renderHeader(key, groupRows)}
              </div>
            </td>
          </tr>,

          // ── Collapsible item rows ─────────────────────────────────
          // mirrors: .group-items div with max-height/opacity transition
          ...(isOpen ? groupRows.map((row, idx) => (
            <tr key={`${key}-${idx}`}
              className={`hover:bg-purple-50/40 border-l-4 ${accentClass} transition-all duration-150 animate-[fadeInDown_0.2s_ease]`}>
              {renderRow(row, idx)}
            </tr>
          )) : [])
        ];
      })}
    </>
  );
}