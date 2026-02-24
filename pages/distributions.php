<?php
// ============================================================
// Auth & Dependencies
// ============================================================
require_once '../includes/auth.php';
requireRole('admin');

require_once '../includes/db.php';
require_once '../includes/header.php';
?>

<link href="../front/css/output.css" rel="stylesheet">

<!-- ============================================================
     Page Styles
     ============================================================ -->
<style>
  /* ── Modal animations ───────────────────── */
  .modal-backdrop {
    backdrop-filter: blur(8px);
    transition: opacity 0.3s ease;
  }

  .modal-content {
    animation: modalSlideIn 0.3s ease;
  }

  @keyframes modalSlideIn {
    from { opacity: 0; transform: translateY(-20px) scale(0.95); }
    to   { opacity: 1; transform: translateY(0)    scale(1);    }
  }

  /* ── Toast ──────────────────────────────── */
  .toast {
    animation: slideInRight 0.3s ease-out, fadeOut 0.5s ease-in 2.5s forwards;
  }

  @keyframes slideInRight {
    from { opacity: 0; transform: translateX(100%); }
    to   { opacity: 1; transform: translateX(0);    }
  }

  @keyframes fadeOut {
    to { opacity: 0; transform: translateX(50%); }
  }

  /* ── Collapsible group rows ─────────────── */
  .group-items {
    max-height: 0;
    overflow: hidden;
    opacity: 0;
    transition: max-height 0.4s ease-out, opacity 0.3s ease-out;
  }

  .group-items.expanded {
    max-height: 3000px;
    opacity: 1;
    transition: max-height 0.5s ease-in, opacity 0.3s ease-in;
  }

  .group-toggle {
    display: inline-block;
    transition: transform 0.3s ease;
  }

  .group-toggle.rotated { transform: rotate(90deg); }

  /* ── Staggered slide-in for group items ─── */
  .group-item {
    opacity: 0;
    transform: translateY(-10px);
    transition: opacity 0.3s ease, transform 0.3s ease;
  }

  .group-items.expanded .group-item { opacity: 1; transform: translateY(0); }

  .group-items.expanded .group-item:nth-child(1) { transition-delay: 0.05s; }
  .group-items.expanded .group-item:nth-child(2) { transition-delay: 0.10s; }
  .group-items.expanded .group-item:nth-child(3) { transition-delay: 0.15s; }
  .group-items.expanded .group-item:nth-child(4) { transition-delay: 0.20s; }
  .group-items.expanded .group-item:nth-child(5) { transition-delay: 0.25s; }
  .group-items.expanded .group-item:nth-child(6) { transition-delay: 0.30s; }
  .group-items.expanded .group-item:nth-child(7) { transition-delay: 0.35s; }
  .group-items.expanded .group-item:nth-child(8) { transition-delay: 0.40s; }
</style>


<!-- ============================================================
     Main Content
     ============================================================ -->
<div class="min-h-screen bg-gradient-to-br from-red-50 via-yellow-50 to-red-100">
  <div class="max-w-fit mx-auto px-8 py-10">

    <!-- Page Header -->
    <div class="flex justify-between items-start mb-8">
      <div>
        <h1 class="text-4xl font-bold bg-gradient-to-r from-yellow-600 to-red-600 bg-clip-text text-transparent mb-2">
          Distribution Records
        </h1>
        <p class="text-slate-500 text-sm">Track and manage item distributions across departments</p>
      </div>

      <!-- Action Buttons -->
      <div class="flex gap-3">
        <button id="generateReportBtn"
                class="px-5 py-2.5 bg-yellow-50 text-red-600 font-medium rounded-xl border-2 border-yellow-600 hover:border-red-600 hover:shadow-lg transition-all duration-300 hover:scale-105">
          <span class="flex items-center gap-2"><span>📊</span><span>Generate Report</span></span>
        </button>

        <button id="combinationBtn"
                class="px-5 py-2.5 bg-yellow-50 text-red-600 font-medium rounded-xl border-2 border-yellow-600 hover:border-red-600 hover:shadow-lg transition-all duration-300 hover:scale-105">
          <span class="flex items-center gap-2"><span>📂</span><span>Combinations</span></span>
        </button>

        <button id="distributeItemBtn"
                class="px-6 py-2.5 bg-gradient-to-r from-yellow-500 to-red-500 text-white border-2 border-yellow-600 hover:border-yellow-300 font-semibold rounded-xl shadow-md hover:shadow-xl transition-all duration-300 hover:scale-105">
          <span class="flex items-center gap-2"><span class="text-lg">+</span><span>Distribute Item</span></span>
        </button>
      </div>
    </div>

    <!-- Search & Filter Card -->
    <div class="bg-gradient-to-r from-red-50 to-yellow-50 rounded-2xl shadow-sm border border-yellow-200 p-6 mb-6">
      <form id="searchForm" class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">

          <!-- Search Input -->
          <div class="md:col-span-2">
            <label class="block text-xs font-medium text-slate-600 mb-2">Search Distribution</label>
            <div class="relative">
              <input id="searchInput" type="text"
                     placeholder="Search by item, department, or recipient..."
                     class="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-300 focus:border-transparent transition">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
            </div>
          </div>

          <!-- Timeframe Filter -->
          <div>
            <label class="block text-xs font-medium text-slate-600 mb-2">Timeframe</label>
            <select id="timeframeFilter"
                    class="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition">
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          <!-- Search Button -->
          <div class="flex items-end">
            <button type="submit" id="searchBtn"
                    class="w-full bg-gradient-to-r from-yellow-400 to-red-400 hover:shadow-lg text-white py-2.5 px-4 rounded-lg font-medium transition-all duration-300 hover:scale-105 flex items-center justify-center gap-2">
              <span id="searchBtnIcon">🔎</span>
              <span id="searchBtnText">Search</span>
            </button>
          </div>

        </div>

        <!-- Custom Date Range (hidden by default) -->
        <div id="customDateInputs" class="hidden">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 p-5 bg-gradient-to-r from-red-50 to-orange-50 rounded-xl">
            <div>
              <label class="block text-xs font-medium text-slate-700 mb-2">Start Date</label>
              <input type="date" id="startDate"
                     class="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition">
            </div>
            <div>
              <label class="block text-xs font-medium text-slate-700 mb-2">End Date</label>
              <input type="date" id="endDate"
                     class="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition">
            </div>
            <div class="flex items-end">
              <div class="w-full px-4 py-2.5 bg-white/50 rounded-lg border border-red-300 flex items-center justify-center">
                <span class="text-xs text-slate-600">Click Search to apply</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Active Filters -->
        <div id="activeFilters" class="hidden flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          <span class="text-xs font-medium text-slate-500">Active Filters:</span>
          <div id="filterTags" class="flex flex-wrap gap-2"></div>
          <button type="button" id="clearFilters"
                  class="text-xs text-red-600 hover:text-red-700 font-medium ml-auto transition-colors">
            Clear All ✕
          </button>
        </div>
      </form>

      <!-- Results Info Bar -->
      <div class="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div id="loadingIndicator" class="hidden">
            <svg class="animate-spin h-4 w-4 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <span id="resultCount" class="text-sm font-medium text-slate-600">Loading distributions...</span>
        </div>
        <span class="text-xs text-slate-400">Last updated: <span id="lastUpdated">--</span></span>
      </div>
    </div>

    <!-- Distribution Table -->
    <div class="bg-gradient-to-r from-orange-50 to-red-50 rounded-2xl shadow-sm border border-red-100 overflow-hidden">
      <div class="overflow-x-hidden overflow-y-hidden">
        <table class="min-w-full w-[1400px] table-fixed">
          <thead>
            <tr class="bg-gradient-to-r from-yellow-400 to-red-500 text-white">
              <th class="py-4 px-6 text-center text-xs font-semibold uppercase tracking-wider" style="width:10%">Date</th>
              <th class="py-4 px-6 text-center text-xs font-semibold uppercase tracking-wider" style="width:13%">Item</th>
              <th class="py-4 px-6 text-center text-xs font-semibold uppercase tracking-wider" style="width:7%">Quantity</th>
              <th class="py-4 px-6 text-center text-xs font-semibold uppercase tracking-wider" style="width:10%">Total Value (₱)</th>
              <th class="py-4 px-6 text-center text-xs font-semibold uppercase tracking-wider" style="width:10%">Category</th>
              <th class="py-4 px-6 text-center text-xs font-semibold uppercase tracking-wider" style="width:10%">Department</th>
              <th class="py-4 px-6 text-center text-xs font-semibold uppercase tracking-wider" style="width:10%">Recipient</th>
              <th class="py-4 px-6 text-center text-xs font-semibold uppercase tracking-wider" style="width:8%">Purpose</th>
              <th class="py-4 px-6 text-center text-xs font-semibold uppercase tracking-wider" style="width:8%">Approved By</th>
              <th class="py-4 px-6 text-center text-xs font-semibold uppercase tracking-wider" style="width:14%">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100"></tbody>
        </table>
      </div>
    </div>

  </div>
</div>


<!-- ============================================================
     MODAL: Generate Report
     ============================================================ -->
<div id="reportModal" class="hidden fixed inset-0 bg-black/40 modal-backdrop flex items-center justify-center z-50">
  <div class="modal-content bg-white rounded-2xl shadow-2xl w-full max-w-lg relative p-8">
    <button id="closeReportModal" class="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-2xl font-bold transition-colors">&times;</button>

    <div class="mb-6">
      <h2 class="text-2xl font-bold text-slate-800">Generate Report</h2>
      <p class="text-sm text-slate-500 mt-1">Export distribution records in your preferred format</p>
    </div>

    <form action="forms/generate_report.php" method="POST" target="_blank">
      <!-- Format -->
      <div class="p-5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 mb-4">
        <label class="block text-sm font-semibold text-slate-700 mb-3">Select Format</label>
        <div class="flex gap-4">
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="format" value="pdf" checked class="w-4 h-4 text-blue-600">
            <span class="text-slate-700">📄 PDF</span>
          </label>
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="format" value="excel" class="w-4 h-4 text-blue-600">
            <span class="text-slate-700">📊 Excel</span>
          </label>
        </div>
      </div>

      <!-- Timeframe -->
      <div class="mb-4">
        <label class="block text-sm font-medium text-slate-700 mb-2">Select Timeframe</label>
        <select id="timeframeSelect" name="timeframe"
                class="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition">
          <option value="today">Today</option>
          <option value="month">This Month</option>
          <option value="year">This Year</option>
          <option value="custom">Custom Range</option>
        </select>
      </div>

      <!-- Custom Range (hidden) -->
      <div id="customRange" class="hidden space-y-3 mb-4">
        <label class="block text-sm font-medium text-slate-700">Select Custom Date Range</label>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs text-slate-500 mb-1">From</label>
            <input type="date" name="from"
                   class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition">
          </div>
          <div>
            <label class="block text-xs text-slate-500 mb-1">To</label>
            <input type="date" name="to"
                   class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition">
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex justify-end gap-3 pt-4">
        <button type="button" onclick="document.getElementById('closeReportModal').click()"
                class="px-6 py-2.5 bg-slate-100 text-slate-600 font-medium rounded-lg hover:bg-slate-200 transition-colors">
          Cancel
        </button>
        <button type="submit"
                class="px-8 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-300">
          Generate Report
        </button>
      </div>
    </form>
  </div>
</div>


<!-- ============================================================
     MODAL: Combinations (Create + List)
     ============================================================ -->
<div id="combinationModal" class="hidden fixed inset-0 bg-black/40 modal-backdrop flex items-center justify-center z-50">
  <div class="modal-content bg-gradient-to-r from-yellow-50 to-red-50 rounded-2xl shadow-2xl w-3xl max-w-3xl relative p-8 max-h-[90vh] overflow-y-auto">
    <button id="closeCombinationModal" class="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-2xl font-bold transition-colors">&times;</button>

    <div class="mb-6">
      <h2 class="text-2xl font-bold text-slate-800">Combinations</h2>
      <p class="text-sm text-slate-500 mt-1">Manage and create item combinations for future distributions</p>
    </div>

    <!-- Existing Combinations -->
    <div class="mb-6">
      <h3 class="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
        <span>📂</span><span>Existing Combinations</span>
      </h3>
      <div id="combinationsListContainer" class="space-y-3 max-h-52 overflow-y-auto pr-1"></div>
    </div>

    <div class="border-t border-red-200 my-6"></div>

    <!-- Create New Combination -->
    <div class="mb-4">
      <h3 class="text-sm font-semibold text-slate-700 flex items-center gap-2">
        <span>➕</span><span>Create New Combination</span>
      </h3>
    </div>

    <form id="combinationForm" class="space-y-5">
      <!-- Name -->
      <div class="p-5 bg-gradient-to-r from-yellow-50 to-red-50 rounded-xl border border-red-200">
        <label class="block text-sm font-medium text-slate-700 mb-2">Combination Name *</label>
        <input type="text" name="combination_name" id="combination_name" required
               class="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition"
               placeholder="e.g. Tubes for Sink">
      </div>

      <!-- Items -->
      <div>
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <span>📦</span><span>Items in Combination</span>
          </h3>
          <button type="button" id="addCombinationItemBtn"
                  class="px-4 py-2 bg-yellow-100 text-red-700 rounded-lg hover:bg-yellow-200 transition-colors text-sm font-medium flex items-center gap-2">
            <span>+</span><span>Add Item</span>
          </button>
        </div>
        <div id="combinationItemsContainer" class="space-y-4"></div>
      </div>

      <!-- Actions -->
      <div class="flex justify-end gap-3 pt-4 border-t border-slate-200">
        <button type="button" id="cancelCombinationBtn"
                class="px-6 py-2.5 bg-slate-100 text-slate-600 font-medium rounded-lg hover:bg-slate-200 transition-colors">
          Cancel
        </button>
        <button type="submit"
                class="px-8 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-300">
          Save Combination
        </button>
      </div>
    </form>
  </div>
</div>


<!-- ============================================================
     MODAL: Edit Combination
     ============================================================ -->
<div id="editCombinationModal" class="hidden fixed inset-0 bg-black/40 modal-backdrop flex items-center justify-center z-50">
  <div class="modal-content bg-gradient-to-r from-yellow-50 to-red-50 rounded-2xl shadow-2xl w-3xl max-w-3xl relative p-8 max-h-[90vh] overflow-y-auto">
    <button id="closeEditCombinationModal" class="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-2xl font-bold transition-colors">&times;</button>

    <div class="mb-6">
      <h2 class="text-2xl font-bold text-slate-800">Edit Combination</h2>
      <p class="text-sm text-slate-500 mt-1">Modify the combination name or its items</p>
    </div>

    <form id="editCombinationForm" class="space-y-5">
      <input type="hidden" id="edit_combination_id" name="combination_id">

      <!-- Name -->
      <div class="p-5 bg-gradient-to-r from-yellow-50 to-red-50 rounded-xl border border-red-200">
        <label class="block text-sm font-medium text-slate-700 mb-2">Combination Name *</label>
        <input type="text" name="combination_name" id="edit_combination_name" required
               class="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition"
               placeholder="e.g. Tubes for Sink">
      </div>

      <!-- Items -->
      <div>
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <span>📦</span><span>Items in Combination</span>
          </h3>
          <button type="button" id="addEditCombinationItemBtn"
                  class="px-4 py-2 bg-yellow-100 text-red-700 rounded-lg hover:bg-yellow-200 transition-colors text-sm font-medium flex items-center gap-2">
            <span>+</span><span>Add Item</span>
          </button>
        </div>
        <div id="editCombinationItemsContainer" class="space-y-4"></div>
      </div>

      <!-- Actions -->
      <div class="flex justify-end gap-3 pt-4 border-t border-slate-200">
        <button type="button" id="cancelEditCombinationBtn"
                class="px-6 py-2.5 bg-slate-100 text-slate-600 font-medium rounded-lg hover:bg-slate-200 transition-colors">
          Cancel
        </button>
        <button type="submit"
                class="px-8 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-300">
          Save Changes
        </button>
      </div>
    </form>
  </div>
</div>


<!-- ============================================================
     MODAL: Distribute Item
     ============================================================ -->
<div id="distributeItemModal" class="hidden fixed inset-0 bg-black/40 modal-backdrop flex items-center justify-center z-50">
  <div class="modal-content bg-gradient-to-r from-yellow-50 to-red-50 rounded-2xl shadow-2xl w-3xl max-w-3xl relative p-8 max-h-[90vh] overflow-y-auto">
    <button id="closeDistributeModal" class="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-2xl font-bold transition-colors">&times;</button>

    <div class="mb-6">
      <h2 class="text-2xl font-bold text-slate-800">Distribute Items</h2>
      <p class="text-sm text-slate-500 mt-1">Record a new item distribution (single or multiple items)</p>
    </div>

    <form id="distributeForm" method="POST" class="space-y-5">

      <!-- Distribution Info -->
      <div class="p-5 bg-gradient-to-r from-yellow-50 to-red-50 rounded-xl border border-red-200">
        <h3 class="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
          <span>📋</span><span>Distribution Information</span>
        </h3>

        <div class="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">To Whom *</label>
            <input type="text" name="recipient" required
                   class="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition"
                   placeholder="Recipient name">
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">Department *</label>
            <select name="department" required
                    class="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition">
              <option value="">Select Department</option>
              <option>Admin</option>
              <option>Engineering</option>
              <option>Commercial</option>
              <option>Finance</option>
            </select>
          </div>
        </div>

        <div class="grid grid-cols-3 gap-4 mb-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">Date *</label>
            <input type="date" name="date" required value="<?php echo date('Y-m-d'); ?>"
                   class="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition">
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">Time *</label>
            <input type="time" name="time" required value="<?php echo date('H:i'); ?>"
                   class="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition">
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">Approved By *</label>
            <input type="text" name="approved_by" required
                   class="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition"
                   placeholder="Approver name">
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">
              Debit To <span class="font-normal text-slate-400">(Optional)</span>
              <span class="text-xs block text-slate-500">Use if recipient is not under any department</span>
            </label>
            <input type="text" name="debit_to"
                   class="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition"
                   placeholder="e.g. Contractor Name">
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">Purpose *</label>
            <textarea name="purpose" rows="2" required
                      class="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition resize-none"
                      placeholder="Purpose of distribution..."></textarea>
          </div>
        </div>
      </div>

      <!-- Combination Picker -->
      <div class="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border border-yellow-300">
        <label class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
          <span>📂</span>
          <span>Load from Combination <span class="font-normal text-slate-400">(Optional)</span></span>
        </label>
        <div class="flex gap-3 items-center">
          <select id="combinationPicker"
                  class="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition text-sm bg-white">
            <option value="">— Select a combination —</option>
          </select>
          <button type="button" id="loadCombinationBtn" disabled
                  class="px-4 py-2.5 bg-gradient-to-r from-yellow-400 to-red-400 text-white font-medium rounded-lg hover:shadow-md transition-all duration-200 text-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2">
            <span id="loadCombinationBtnIcon">⚡</span>
            <span id="loadCombinationBtnText">Load Items</span>
          </button>
          <button type="button" id="clearCombinationBtn"
                  class="hidden px-4 py-2.5 bg-slate-100 text-slate-600 font-medium rounded-lg hover:bg-slate-200 transition-colors text-sm">
            ✕ Clear
          </button>
        </div>
        <p id="combinationPickerHint" class="text-xs text-slate-500 mt-2">
          Choosing a combination will fill the items below automatically. You can still add or remove items after.
        </p>
      </div>

      <!-- Items to Distribute -->
      <div>
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <span>📦</span><span>Items to Distribute</span>
          </h3>
          <button type="button" id="addItemRowBtn"
                  class="px-4 py-2 bg-yellow-100 text-red-700 rounded-lg hover:bg-yellow-200 transition-colors text-sm font-medium flex items-center gap-2">
            <span>+</span><span>Add Another Item</span>
          </button>
        </div>

        <div id="itemsContainer" class="space-y-4">
          <!-- First item row (seeded by JS) -->
          <div class="item-row p-4 bg-slate-50 rounded-lg border border-slate-200 relative">
            <button type="button" class="remove-item-btn hidden absolute top-4 right-2 text-red-500 hover:text-red-700 font-bold text-xl" title="Remove item">&times;</button>
            <div class="grid grid-cols-4 gap-3">
              <div>
                <label class="block text-xs font-medium text-slate-700 mb-1">Category *</label>
                <select name="items[0][category_id]" class="category-select w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 text-sm" required>
                  <option value="">Select Category</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-700 mb-1">Classification</label>
                <select name="items[0][classification_id]" class="classification-select w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 text-sm">
                  <option value="">Select Classification</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-700 mb-1">Item *</label>
                <select name="items[0][item_id]" class="item-select w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 text-sm" required>
                  <option value="">Select Item</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-700 mb-1">Quantity *</label>
                <input type="number" name="items[0][quantity]" min="1" required
                       class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 text-sm"
                       placeholder="0">
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex justify-between items-center pt-4 border-t border-slate-200">
        <span id="itemCount" class="text-sm text-slate-600 font-medium">1 item to distribute</span>
        <div class="flex gap-3">
          <button type="button" onclick="document.getElementById('closeDistributeModal').click()"
                  class="px-6 py-2.5 bg-slate-100 text-slate-600 font-medium rounded-lg hover:bg-slate-200 transition-colors">
            Cancel
          </button>
          <button type="submit"
                  class="px-8 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-300">
            Distribute All Items
          </button>
        </div>
      </div>
    </form>
  </div>
</div>


<!-- ============================================================
     MODAL: Edit Distribution
     ============================================================ -->
<div id="editDistributionModal" class="hidden fixed inset-0 bg-black/40 modal-backdrop flex items-center justify-center z-50">
  <div class="modal-content bg-gradient-to-r from-yellow-50 to-red-50 rounded-2xl shadow-2xl w-full max-w-2xl relative p-8 max-h-[90vh] overflow-y-auto">
    <button id="closeEditModal" class="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-2xl font-bold transition-colors">&times;</button>

    <div class="mb-6">
      <h2 class="text-2xl font-bold text-slate-800">Edit Distribution</h2>
      <p class="text-sm text-slate-500 mt-1">Modify distribution details</p>
    </div>

    <form id="editForm" method="POST" class="space-y-5">
      <input type="hidden" id="edit_id" name="id">

      <div class="p-5 bg-gradient-to-r from-yellow-50 to-red-50 rounded-xl border border-red-300">
        <h3 class="text-sm font-semibold text-slate-700 mb-4">Distribution Details</h3>

        <div class="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">Category *</label>
            <select id="edit_category" class="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition" required>
              <option value="">Select Category</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">Classification</label>
            <select id="edit_classification" class="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition">
              <option value="">Select Classification</option>
            </select>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">Item *</label>
            <select id="edit_item_id" name="item_id" class="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition" required>
              <option value="">Select Item</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">Quantity *</label>
            <input type="number" id="edit_quantity" name="quantity" min="1" required
                   class="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition">
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">Recipient *</label>
            <input type="text" id="edit_recipient" name="recipient" required
                   class="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition">
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">Department *</label>
            <select id="edit_department" name="department" required
                    class="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition">
              <option value="">Select Department</option>
              <option>Admin</option>
              <option>Engineering</option>
              <option>Commercial</option>
              <option>Finance</option>
            </select>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">Approved By *</label>
            <input type="text" id="edit_approved_by" name="approved_by" required
                   class="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition">
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">Debit To</label>
            <input type="text" id="edit_debit_to" name="debit_to"
                   class="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition">
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700 mb-2">Purpose *</label>
          <textarea id="edit_purpose" name="purpose" rows="3" required
                    class="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition resize-none"></textarea>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex justify-end gap-3 pt-4 border-t border-slate-200">
        <button type="button" onclick="document.getElementById('closeEditModal').click()"
                class="px-6 py-2.5 bg-slate-100 text-slate-600 font-medium rounded-lg hover:bg-slate-200 transition-colors">
          Cancel
        </button>
        <button type="submit"
                class="px-8 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-300">
          Update Distribution
        </button>
      </div>
    </form>
  </div>
</div>


<!-- ============================================================
     MODAL: Return Distribution
     ============================================================ -->
<div id="returnModal" class="hidden fixed inset-0 bg-black/40 modal-backdrop flex items-center justify-center z-50">
  <div class="modal-content bg-gradient-to-r from-yellow-50 to-red-50 rounded-xl border border-red-200 rounded-2xl shadow-2xl w-full max-w-md relative p-8">
    <button id="closeReturnModal" class="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-2xl font-bold transition-colors">&times;</button>

    <div class="mb-6">
      <h2 class="text-2xl font-bold text-slate-800">Return Distribution</h2>
      <p class="text-sm text-slate-500 mt-1">Return distributed items to inventory</p>
    </div>

    <form id="returnForm" method="POST" class="space-y-4">
      <input type="hidden" id="return_id" name="id">

      <div class="p-4 bg-yellow-50 rounded-lg">
        <div class="text-sm text-slate-600 mb-2"><strong>Item:</strong> <span id="return_item_name"></span></div>
        <div class="text-sm text-slate-600"><strong>Distributed Quantity:</strong> <span id="return_distributed_qty"></span></div>
      </div>

      <div>
        <label class="block text-sm font-medium text-slate-700 mb-2">Return Quantity *</label>
        <input type="number" id="return_quantity" name="return_quantity" min="1" required
               class="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition">
        <p class="text-xs text-slate-500 mt-1">Leave empty or enter full quantity for complete return</p>
      </div>

      <div>
        <label class="block text-sm font-medium text-slate-700 mb-2">Reason for Return *</label>
        <textarea id="return_reason" name="return_reason" rows="3" required
                  class="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition resize-none"
                  placeholder="Enter reason for returning items..."></textarea>
      </div>

      <!-- Actions -->
      <div class="flex justify-end gap-3 pt-4 border-t border-slate-200">
        <button type="button" onclick="document.getElementById('closeReturnModal').click()"
                class="px-6 py-2.5 bg-slate-100 text-slate-600 font-medium rounded-lg hover:bg-slate-200 transition-colors">
          Cancel
        </button>
        <button type="submit"
                class="px-8 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-300">
          Process Return
        </button>
      </div>
    </form>
  </div>
</div>


<!-- ============================================================
     JavaScript
     ============================================================ -->
<script>
// ──────────────────────────────────────────────────────────────
// 1. GLOBALS
// ──────────────────────────────────────────────────────────────
let itemRowIndex          = 1;
let currentPage           = 1;
let totalPages            = 1;
let combinationItemIndex  = 0;
let editCombinationItemIndex = 0;


// ──────────────────────────────────────────────────────────────
// 2. UTILITIES
// ──────────────────────────────────────────────────────────────
function escapeHtml(text) {
  const d = document.createElement('div');
  d.textContent = text ?? '';
  return d.innerHTML;
}

// alias used throughout combination functions
const escapeHtmlCombo = escapeHtml;

function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  const bg    = type === 'success' ? 'bg-green-500' : 'bg-red-500';
  toast.className = `fixed bottom-4 right-4 ${bg} text-white px-6 py-3 rounded-xl shadow-lg z-[9999] toast`;
  toast.style.cssText = 'position:fixed;bottom:1rem;right:1rem;z-index:9999;';
  toast.innerHTML = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

// Legacy alias used by combination functions
const showCombinationToast = showToast;


// ──────────────────────────────────────────────────────────────
// 3. TABLE RENDERING
// ──────────────────────────────────────────────────────────────
function renderTable(data) {
  const tableBody = document.querySelector('tbody');
  if (!tableBody) return;

  if (!data || data.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="10" class="py-16 text-center">
          <div class="flex flex-col items-center justify-center">
            <div class="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <span class="text-3xl">📦</span>
            </div>
            <p class="text-slate-500 font-medium text-lg">No distributions found</p>
            <p class="text-slate-400 text-sm mt-1">Try adjusting your search or date range</p>
          </div>
        </td>
      </tr>`;
    return;
  }

  // Group by datetime + purpose + recipient
  const groups = {};
  data.forEach(row => {
    const key = `${row.distributed_at}|${row.purpose}|${row.recipient}`;
    if (!groups[key]) {
      groups[key] = {
        dateTime:    row.distributed_at,
        purpose:     row.purpose,
        recipient:   row.recipient,
        department:  row.department,
        approved_by: row.approved_by,
        debit_to:    row.debit_to,
        items:       []
      };
    }
    groups[key].items.push(row);
  });

  tableBody.innerHTML = '';

  Object.values(groups).forEach(group => {
    const groupId      = `group-${group.dateTime}-${group.purpose}-${group.recipient}`
                          .replace(/[^a-zA-Z0-9]/g, '_');
    const totalQty     = group.items.reduce((s, i) => s + parseInt(i.quantity), 0);
    const totalValue   = group.items.reduce((s, i) => s + parseFloat(i.total_value || 0), 0);
    const dateObj      = new Date(group.dateTime);
    const fmtDate      = dateObj.toLocaleDateString('en-US',  { month: 'short', day: 'numeric', year: 'numeric' });
    const fmtTime      = dateObj.toLocaleTimeString('en-US',  { hour: '2-digit', minute: '2-digit' });

    // Group header row
    const headerRow = document.createElement('tr');
    headerRow.className = 'group-header bg-gradient-to-r from-orange-50 to-red-50 hover:from-orange-100 hover:to-red-100 cursor-pointer border-b-2 border-red-200';
    headerRow.onclick   = () => toggleGroup(groupId);
    headerRow.innerHTML = `
      <td class="py-4 px-6 font-semibold text-slate-800" colspan="10">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <span class="group-toggle text-red-600 font-bold text-lg" id="toggle-${groupId}">⮞</span>
            <div>
              <div class="flex items-center gap-2">
                <span class="text-red-600">📦 ${escapeHtml(group.purpose)}</span>
                <span class="px-2 py-0.5 bg-yellow-200 text-yellow-800 rounded-full text-xs font-medium">
                  ${group.items.length} item${group.items.length !== 1 ? 's' : ''}
                </span>
                <span class="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">Qty: ${totalQty}</span>
                <span class="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">₱${totalValue.toFixed(2)}</span>
              </div>
              <div class="text-xs text-slate-600 mt-1">
                To <span class="font-medium">${escapeHtml(group.recipient)}</span>
                • ${escapeHtml(group.department)}
                • ${fmtDate} ${fmtTime}
                • Approved by ${escapeHtml(group.approved_by)}
              </div>
            </div>
          </div>
          <div class="text-xs text-slate-500 italic">Click to expand/collapse</div>
        </div>
      </td>`;

    tableBody.appendChild(headerRow);

    // Collapsible items wrapper
    const wrapperRow = document.createElement('tr');
    wrapperRow.className = 'group-items-wrapper';
    wrapperRow.setAttribute('data-group', groupId);

    const itemsHTML = group.items.map(row => {
      const d = new Date(row.distributed_at);
      const fd = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const ft = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      return `
        <tr class="group-item hover:bg-yellow-50 border-l-4 border-red-300">
          <td class="py-3 px-6 text-xs text-slate-600" style="width:10%">${fd}<br><span class="text-slate-400">${ft}</span></td>
          <td class="py-3 px-6" style="width:13%"><div class="text-sm font-medium text-slate-900">${escapeHtml(row.item_name)}</div></td>
          <td class="py-3 px-6 font-semibold text-red-600"   style="width:7%">${row.quantity}</td>
          <td class="py-3 px-6 font-medium text-emerald-600" style="width:10%">₱${parseFloat(row.total_value || 0).toFixed(2)}</td>
          <td class="py-3 px-6 text-sm text-slate-700" style="width:10%">${escapeHtml(row.category_name)}</td>
          <td class="py-3 px-6 text-sm text-slate-700" style="width:10%">${escapeHtml(row.department)}</td>
          <td class="py-3 px-6 text-sm text-slate-700" style="width:10%">${escapeHtml(row.recipient)}</td>
          <td class="py-3 px-6 text-sm text-slate-600" style="width:8%">
            <div class="max-w-xs truncate" title="${escapeHtml(row.purpose || '')}">
              ${escapeHtml((row.purpose || '').substring(0, 30))}
            </div>
          </td>
          <td class="py-3 px-6 text-sm text-slate-700" style="width:8%">${escapeHtml(row.approved_by)}</td>
          <td class="py-3 px-6" style="width:14%">
            <div class="flex gap-2">
              <button onclick="editDistribution(${row.id})"
                      class="px-3 py-1.5 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition-colors text-xs font-medium">
                ✏️ Edit
              </button>
              <button onclick="deleteDistribution(${row.id})"
                      class="px-2 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-xs font-medium">
                🗑️ Delete
              </button>
              <button onclick="returnDistribution(${row.id})"
                      class="px-2 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-xs font-medium">
                ↩️ Return
              </button>
            </div>
          </td>
        </tr>`;
    }).join('');

    wrapperRow.innerHTML = `
      <td colspan="10" class="p-0">
        <div class="group-items" id="items-${groupId}">
          <table class="w-full table-fixed"><tbody>${itemsHTML}</tbody></table>
        </div>
      </td>`;

    tableBody.appendChild(wrapperRow);
  });
}


// ──────────────────────────────────────────────────────────────
// 4. GROUP TOGGLE
// ──────────────────────────────────────────────────────────────
function toggleGroup(groupId) {
  document.getElementById(`items-${groupId}`)?.classList.toggle('expanded');
  document.getElementById(`toggle-${groupId}`)?.classList.toggle('rotated');
}

function expandAllGroups() {
  document.querySelectorAll('.group-items').forEach(el  => el.classList.add('expanded'));
  document.querySelectorAll('.group-toggle').forEach(el => el.classList.add('rotated'));
}

function collapseAllGroups() {
  document.querySelectorAll('.group-items').forEach(el  => el.classList.remove('expanded'));
  document.querySelectorAll('.group-toggle').forEach(el => el.classList.remove('rotated'));
}

window.toggleGroup      = toggleGroup;
window.expandAllGroups  = expandAllGroups;
window.collapseAllGroups = collapseAllGroups;


// ──────────────────────────────────────────────────────────────
// 5. PAGINATION
// ──────────────────────────────────────────────────────────────
function updatePagination(json) {
  let container = document.getElementById('paginationContainer');

  if (!container) {
    const tableWrap = document.querySelector('.bg-gradient-to-r.from-orange-50.to-red-50');
    if (!tableWrap) return;
    container = document.createElement('div');
    container.id        = 'paginationContainer';
    container.className = 'px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between';
    container.innerHTML = `
      <div class="text-sm text-slate-600"><span id="pageInfo"></span></div>
      <div class="flex gap-2">
        <button type="button" id="prevPage"
                class="px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
          ← Previous
        </button>
        <button type="button" id="nextPage"
                class="px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
          Next →
        </button>
      </div>`;
    tableWrap.appendChild(container);
  }

  if (json.total_pages <= 1) {
    container.classList.add('hidden');
    return;
  }

  container.classList.remove('hidden');
  document.getElementById('pageInfo').textContent = `Page ${currentPage} of ${totalPages}`;

  const prevBtn = document.getElementById('prevPage');
  const nextBtn = document.getElementById('nextPage');
  prevBtn.disabled = currentPage === 1;
  nextBtn.disabled = currentPage === totalPages;
  prevBtn.onclick  = () => { if (currentPage > 1)           loadDistributions(currentPage - 1); };
  nextBtn.onclick  = () => { if (currentPage < totalPages)  loadDistributions(currentPage + 1); };
}


// ──────────────────────────────────────────────────────────────
// 6. LOAD DISTRIBUTIONS (fetch + render)
// ──────────────────────────────────────────────────────────────
async function loadDistributions(page = 1) {
  const searchInput      = document.getElementById('searchInput');
  const timeframeFilter  = document.getElementById('timeframeFilter');
  const startDate        = document.getElementById('startDate');
  const endDate          = document.getElementById('endDate');
  const loadingIndicator = document.getElementById('loadingIndicator');
  const resultCount      = document.getElementById('resultCount');
  const searchBtn        = document.getElementById('searchBtn');
  const searchBtnIcon    = document.getElementById('searchBtnIcon');
  const searchBtnText    = document.getElementById('searchBtnText');
  const lastUpdated      = document.getElementById('lastUpdated');

  const search    = searchInput.value.trim();
  const timeframe = timeframeFilter.value;
  const start     = startDate.value;
  const end       = endDate.value;

  if (timeframe === 'custom') {
    if (!start || !end) {
      resultCount.textContent = 'Please select both start and end dates';
      resultCount.classList.add('text-amber-600');
      return;
    }
    if (new Date(start) > new Date(end)) {
      resultCount.textContent = 'Start date must be before end date';
      resultCount.classList.add('text-red-600');
      return;
    }
  }

  // Loading state
  loadingIndicator.classList.remove('hidden');
  resultCount.textContent = 'Loading...';
  resultCount.classList.remove('text-red-600', 'text-amber-600');
  resultCount.classList.add('text-slate-600');
  searchBtn.disabled       = true;
  searchBtnIcon.textContent = '⏳';
  searchBtnText.textContent = 'Searching...';

  const params = new URLSearchParams({ search, timeframe, start_date: start, end_date: end, page });

  try {
    const response = await fetch(`forms/fetch_distributions.php?${params}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const json = await response.json();
    currentPage = json.page;
    totalPages  = json.total_pages;

    renderTable(json.data);
    updatePagination(json);

    const count = json.count || 0;
    if (count === 0) {
      resultCount.textContent = 'No distributions found';
      resultCount.classList.add('text-slate-500');
    } else {
      const from = ((currentPage - 1) * 15) + 1;
      const to   = from + count - 1;
      resultCount.textContent = `Showing ${from}–${to} of ${json.total_records} record${json.total_records !== 1 ? 's' : ''}`;
      resultCount.classList.remove('text-slate-500');
    }

    lastUpdated.textContent = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    updateActiveFilters();

  } catch (err) {
    console.error(err);
    resultCount.textContent = 'Error loading data. Please try again.';
    resultCount.classList.add('text-red-600');

    document.querySelector('tbody').innerHTML = `
      <tr>
        <td colspan="10" class="py-16 text-center">
          <div class="flex flex-col items-center justify-center">
            <div class="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <span class="text-3xl">⚠️</span>
            </div>
            <p class="text-red-600 font-medium text-lg">Error loading distributions</p>
            <p class="text-slate-400 text-sm mt-1">${err.message}</p>
            <button onclick="location.reload()" class="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition">
              Reload Page
            </button>
          </div>
        </td>
      </tr>`;
  } finally {
    loadingIndicator.classList.add('hidden');
    searchBtn.disabled        = false;
    searchBtnIcon.textContent = '🔎';
    searchBtnText.textContent = 'Search';
  }
}


// ──────────────────────────────────────────────────────────────
// 7. SEARCH / FILTER
// ──────────────────────────────────────────────────────────────
function updateActiveFilters() {
  const activeFiltersDiv = document.getElementById('activeFilters');
  const filterTagsDiv    = document.getElementById('filterTags');
  const searchInput      = document.getElementById('searchInput');
  const timeframeFilter  = document.getElementById('timeframeFilter');
  const startDate        = document.getElementById('startDate');
  const endDate          = document.getElementById('endDate');

  const tags = [];
  const search    = searchInput.value.trim();
  const timeframe = timeframeFilter.value;

  if (search)            tags.push({ label: `"${search}"`, type: 'search',    icon: '🔍' });
  if (timeframe !== 'all') tags.push({ label: timeframeFilter.options[timeframeFilter.selectedIndex].text, type: 'timeframe', icon: '📅' });
  if (timeframe === 'custom' && startDate.value && endDate.value) {
    const fmt = d => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    tags.push({ label: `${fmt(startDate.value)} – ${fmt(endDate.value)}`, type: 'date', icon: '📆' });
  }

  if (tags.length) {
    activeFiltersDiv.classList.remove('hidden');
    filterTagsDiv.innerHTML = tags.map(t => `
      <span class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-100 text-red-700 rounded-full text-xs font-medium shadow-sm hover:shadow transition-shadow">
        <span>${t.icon}</span><span>${t.label}</span>
        <button type="button" onclick="removeFilter('${t.type}')" class="hover:text-red-900 ml-1 font-bold">×</button>
      </span>`).join('');
  } else {
    activeFiltersDiv.classList.add('hidden');
  }
}

window.removeFilter = function(type) {
  if (type === 'search')    document.getElementById('searchInput').value     = '';
  if (type === 'timeframe') { document.getElementById('timeframeFilter').value = 'all'; document.getElementById('customDateInputs').classList.add('hidden'); }
  if (type === 'date')      { document.getElementById('startDate').value = ''; document.getElementById('endDate').value = ''; }
  currentPage = 1;
  loadDistributions(1);
};


// ──────────────────────────────────────────────────────────────
// 8. MODAL: REPORT
// ──────────────────────────────────────────────────────────────
(function initReportModal() {
  const modal       = document.getElementById('reportModal');
  const openBtn     = document.getElementById('generateReportBtn');
  const closeBtn    = document.getElementById('closeReportModal');
  const tfSelect    = document.getElementById('timeframeSelect');
  const customRange = document.getElementById('customRange');

  const open  = () => { modal.classList.remove('hidden'); modal.classList.add('flex'); };
  const close = () => { modal.classList.add('hidden');    modal.classList.remove('flex'); };

  openBtn.addEventListener('click', open);
  closeBtn.addEventListener('click', close);
  modal.addEventListener('click', e => { if (e.target === modal) close(); });
  tfSelect?.addEventListener('change', () => customRange.classList.toggle('hidden', tfSelect.value !== 'custom'));
})();


// ──────────────────────────────────────────────────────────────
// 9. MODAL: DISTRIBUTE ITEM — item-row management
// ──────────────────────────────────────────────────────────────
function generateItemRowInnerHTML(index) {
  return `
    <button type="button" class="remove-item-btn hidden absolute top-4 right-2 text-red-500 hover:text-red-700 font-bold text-xl" title="Remove item">&times;</button>
    <div class="grid grid-cols-4 gap-3">
      <div>
        <label class="block text-xs font-medium text-slate-700 mb-1">Category *</label>
        <select name="items[${index}][category_id]" class="category-select w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 text-sm" required>
          <option value="">Select Category</option>
        </select>
      </div>
      <div>
        <label class="block text-xs font-medium text-slate-700 mb-1">Classification</label>
        <select name="items[${index}][classification_id]" class="classification-select w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 text-sm">
          <option value="">Select Classification</option>
        </select>
      </div>
      <div>
        <label class="block text-xs font-medium text-slate-700 mb-1">Item *</label>
        <select name="items[${index}][item_id]" class="item-select w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 text-sm" required>
          <option value="">Select Item</option>
        </select>
      </div>
      <div>
        <label class="block text-xs font-medium text-slate-700 mb-1">Quantity *</label>
        <input type="number" name="items[${index}][quantity]" min="1" required
               class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 text-sm" placeholder="0">
      </div>
    </div>`;
}

async function loadCategoriesForRow(row) {
  const select = row.querySelector('.category-select');
  try {
    const html  = await (await fetch('./forms/fetch_categories.php')).text();
    const temp  = document.createElement('div');
    temp.innerHTML = html;
    select.innerHTML = '<option value="">Select Category</option>';
    temp.querySelectorAll('li .edit-category').forEach(btn => {
      const o = document.createElement('option');
      o.value = btn.getAttribute('data-id');
      o.textContent = btn.getAttribute('data-name');
      select.appendChild(o);
    });
  } catch (err) { console.error('Failed to load categories:', err); }
}

function attachRowEventListeners(row) {
  const categorySelect       = row.querySelector('.category-select');
  const classificationSelect = row.querySelector('.classification-select');
  const itemSelect           = row.querySelector('.item-select');
  const removeBtn            = row.querySelector('.remove-item-btn');

  categorySelect.addEventListener('change', async () => {
    classificationSelect.innerHTML = '<option value="">Select Classification</option>';
    itemSelect.innerHTML           = '<option value="">Select Item</option>';
    if (!categorySelect.value) return;
    try {
      const cls = await (await fetch(`forms/search_classification.php?category_id=${categorySelect.value}`)).json();
      cls.forEach(c => {
        const o = document.createElement('option');
        o.value = c.id; o.textContent = c.classification_name;
        classificationSelect.appendChild(o);
      });
    } catch (err) { console.error(err); }
  });

  classificationSelect.addEventListener('change', async () => {
    itemSelect.innerHTML = '<option value="">Select Item</option>';
    if (!classificationSelect.value) return;
    try {
      const items = await (await fetch(`forms/fetch_items_by_classification.php?classification_id=${classificationSelect.value}`)).json();
      if (!items.length || items.error) { itemSelect.innerHTML = '<option value="">No items available</option>'; return; }
      items.forEach(item => {
        const o = document.createElement('option');
        o.value = item.id; o.textContent = `${item.name} (Stock: ${item.quantity})`;
        itemSelect.appendChild(o);
      });
    } catch (err) { console.error(err); }
  });

  removeBtn?.addEventListener('click', () => {
    row.remove();
    updateItemCount();
    updateRemoveButtons();
  });
}

function updateItemCount() {
  const count = document.querySelectorAll('.item-row').length;
  document.getElementById('itemCount').textContent = `${count} item${count !== 1 ? 's' : ''} to distribute`;
}

function updateRemoveButtons() {
  const rows = document.querySelectorAll('.item-row');
  rows.forEach(row => {
    const btn = row.querySelector('.remove-item-btn');
    if (btn) btn.classList.toggle('hidden', rows.length <= 1);
  });
}

function resetDistributeModal() {
  document.querySelectorAll('.item-row').forEach((row, i) => { if (i > 0) row.remove(); });
  document.getElementById('distributeForm').reset();
  itemRowIndex = 1;
  updateItemCount();
  updateRemoveButtons();
}

(function initDistributeModal() {
  const modal    = document.getElementById('distributeItemModal');
  const openBtn  = document.getElementById('distributeItemBtn');
  const closeBtn = document.getElementById('closeDistributeModal');
  const addBtn   = document.getElementById('addItemRowBtn');

  const open = async () => {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    await loadCategoriesForRow(document.querySelector('.item-row'));
    await loadCombinationPicker();
  };
  const close = () => { modal.classList.add('hidden'); modal.classList.remove('flex'); resetDistributeModal(); };

  openBtn.addEventListener('click', open);
  closeBtn.addEventListener('click', close);
  modal.addEventListener('click', e => { if (e.target === modal) close(); });

  addBtn.addEventListener('click', async () => {
    const newRow = document.createElement('div');
    newRow.className = 'item-row p-4 bg-slate-50 rounded-lg border border-slate-200 relative';
    newRow.innerHTML = generateItemRowInnerHTML(itemRowIndex++);
    document.getElementById('itemsContainer').appendChild(newRow);
    await loadCategoriesForRow(newRow);
    attachRowEventListeners(newRow);
    updateItemCount();
    updateRemoveButtons();
  });
})();


// ──────────────────────────────────────────────────────────────
// 10. DISTRIBUTE FORM SUBMIT
// ──────────────────────────────────────────────────────────────
document.getElementById('distributeForm').addEventListener('submit', async e => {
  e.preventDefault();
  try {
    const result = await (await fetch('../actions/add_distributions.php', {
      method: 'POST', body: new FormData(e.target)
    })).json();

    if (result.status === 'success') {
      document.getElementById('distributeItemModal').classList.add('hidden');
      document.getElementById('distributeItemModal').classList.remove('flex');
      showToast(`✅ ${result.message}<br><span class="text-sm opacity-90">Items: ${result.items_count} | Total Value: ₱${result.total_value.toFixed(2)}</span>`);
      await loadDistributions(1);
      resetDistributeModal();
    } else {
      alert(result.message || 'Error distributing items.');
    }
  } catch (err) {
    console.error(err);
    alert('❌ Failed to distribute items. Please try again.');
  }
});


// ──────────────────────────────────────────────────────────────
// 11. COMBINATION PICKER (inside Distribute modal)
// ──────────────────────────────────────────────────────────────
async function loadCombinationPicker() {
  const picker = document.getElementById('combinationPicker');
  picker.innerHTML = '<option value="">— Select a combination —</option>';
  try {
    const result = await (await fetch('forms/fetch_combinations.php')).json();
    if (result.status === 'success' && result.data.length) {
      result.data.forEach(combo => {
        const o = document.createElement('option');
        o.value = combo.id;
        o.dataset.items = JSON.stringify(combo.items);
        o.textContent   = `${combo.name}  (${combo.item_count} item${combo.item_count != 1 ? 's' : ''})`;
        picker.appendChild(o);
      });
    } else {
      const o = Object.assign(document.createElement('option'), { disabled: true, textContent: 'No combinations saved yet' });
      picker.appendChild(o);
    }
  } catch (err) { console.error('Failed to load combination picker:', err); }
}

document.getElementById('combinationPicker').addEventListener('change', function () {
  document.getElementById('loadCombinationBtn').disabled = !this.value;
});

document.getElementById('loadCombinationBtn').addEventListener('click', async () => {
  const picker = document.getElementById('combinationPicker');
  const sel    = picker.options[picker.selectedIndex];
  if (!sel?.value) return;

  let comboItems = [];
  try { comboItems = JSON.parse(sel.dataset.items || '[]'); } catch { comboItems = []; }
  if (!comboItems.length) { alert('This combination has no items.'); return; }

  const btn     = document.getElementById('loadCombinationBtn');
  const btnIcon = document.getElementById('loadCombinationBtnIcon');
  const btnText = document.getElementById('loadCombinationBtnText');
  btn.disabled        = true;
  btnIcon.textContent = '⏳';
  btnText.textContent = 'Loading...';

  document.getElementById('itemsContainer').innerHTML = '';
  itemRowIndex = 0;

  for (const item of comboItems) await addPrepopulatedRow(item);

  updateItemCount();
  updateRemoveButtons();

  btn.disabled        = false;
  btnIcon.textContent = '✅';
  btnText.textContent = 'Loaded!';
  setTimeout(() => { btnIcon.textContent = '⚡'; btnText.textContent = 'Load Items'; }, 1500);

  document.getElementById('clearCombinationBtn').classList.remove('hidden');
  document.getElementById('combinationPickerHint').innerHTML =
    `<span class="text-green-600 font-medium">✅ Loaded from "${sel.textContent.split('  (')[0]}"</span> — you can still add or remove items below.`;
});

document.getElementById('clearCombinationBtn').addEventListener('click', async () => {
  const container = document.getElementById('itemsContainer');
  container.innerHTML = '';
  itemRowIndex = 0;

  const blankRow = document.createElement('div');
  blankRow.className = 'item-row p-4 bg-slate-50 rounded-lg border border-slate-200 relative';
  blankRow.innerHTML = generateItemRowInnerHTML(itemRowIndex++);
  container.appendChild(blankRow);

  await loadCategoriesForRow(blankRow);
  attachRowEventListeners(blankRow);
  updateItemCount();
  updateRemoveButtons();

  document.getElementById('combinationPicker').value   = '';
  document.getElementById('loadCombinationBtn').disabled = true;
  document.getElementById('clearCombinationBtn').classList.add('hidden');
  document.getElementById('combinationPickerHint').textContent =
    'Choosing a combination will fill the items below automatically. You can still add or remove items after.';
});


async function addPrepopulatedRow(comboItem) {
  const container = document.getElementById('itemsContainer');
  const index     = itemRowIndex++;

  const row       = document.createElement('div');
  row.className   = 'item-row p-4 bg-slate-50 rounded-lg border border-yellow-200 relative';
  row.innerHTML   = generateItemRowInnerHTML(index);
  container.appendChild(row);

  const catSelect  = row.querySelector('.category-select');
  const clsSelect  = row.querySelector('.classification-select');
  const itemSelect = row.querySelector('.item-select');
  const qtyInput   = row.querySelector(`input[name="items[${index}][quantity]"]`);

  try {
    const html = await (await fetch('./forms/fetch_categories.php')).text();
    const temp = document.createElement('div');
    temp.innerHTML = html;

    catSelect.innerHTML = '<option value="">Select Category</option>';
    temp.querySelectorAll('li .edit-category').forEach(btn => {
      const o       = document.createElement('option');
      o.value       = btn.getAttribute('data-id');
      o.textContent = btn.getAttribute('data-name');
      catSelect.appendChild(o);
    });

    catSelect.value = String(comboItem.category_id);
  } catch (err) {
    console.error('Category load failed:', err);
    return;
  }

  if (comboItem.category_id) {
    try {
      const cls = await (await fetch(`forms/search_classification.php?category_id=${comboItem.category_id}`)).json();

      clsSelect.innerHTML = '<option value="">Select Classification</option>';
      cls.forEach(c => {
        const o       = document.createElement('option');
        o.value       = String(c.id);
        o.textContent = c.classification_name;
        clsSelect.appendChild(o);
      });

      clsSelect.disabled = false;
      clsSelect.value    = String(comboItem.classification_id);
    } catch (err) {
      console.error('Classification load failed:', err);
      return;
    }
  }

  if (comboItem.classification_id) {
    try {
      const items = await (await fetch(`forms/fetch_items_by_classification.php?classification_id=${comboItem.classification_id}`)).json();

      itemSelect.innerHTML = '<option value="">Select Item</option>';
      if (Array.isArray(items) && items.length) {
        items.forEach(item => {
          const o       = document.createElement('option');
          o.value       = String(item.id);
          o.textContent = `${item.name} (Stock: ${item.quantity})`;
          itemSelect.appendChild(o);
        });
      }

      itemSelect.disabled = false;
      itemSelect.value    = String(comboItem.item_id);
    } catch (err) {
      console.error('Item load failed:', err);
      return;
    }
  }

  qtyInput.value = comboItem.quantity_required;
  attachRowEventListeners(row);
}


// ──────────────────────────────────────────────────────────────
// 12. MODAL: COMBINATIONS (Create + List)
// ──────────────────────────────────────────────────────────────
function buildCombItemRowHTML(index, prefix = 'items') {
  return `
    <div class="combination-item-row p-4 bg-slate-50 rounded-lg border border-slate-200 relative" data-index="${index}">
      <button type="button"
              class="remove-combination-item-btn absolute top-3 right-3 text-red-400 hover:text-red-600 font-bold text-xl transition-colors hidden"
              title="Remove item">&times;</button>
      <div class="grid grid-cols-4 gap-3">
        <div>
          <label class="block text-xs font-medium text-slate-700 mb-1">Category *</label>
          <select name="${prefix}[${index}][category_id]"
                  class="comb-category-select w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-yellow-500 text-sm" required>
            <option value="">Select Category</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-700 mb-1">Classification</label>
          <select name="${prefix}[${index}][classification_id]"
                  class="comb-classification-select w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-yellow-500 text-sm bg-slate-100" disabled>
            <option value="">Select Classification</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-700 mb-1">Item *</label>
          <select name="${prefix}[${index}][item_id]"
                  class="comb-item-select w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-yellow-500 text-sm bg-slate-100" required disabled>
            <option value="">Select Item</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-700 mb-1">Quantity *</label>
          <input type="number" name="${prefix}[${index}][quantity]" min="1" required
                 class="comb-quantity-input w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-yellow-500 text-sm"
                 placeholder="0">
        </div>
      </div>
    </div>`;
}

async function loadCombinationCategories(row) {
  const select = row.querySelector('.comb-category-select');
  try {
    const html = await (await fetch('./forms/fetch_categories.php')).text();
    const temp = document.createElement('div');
    temp.innerHTML = html;
    select.innerHTML = '<option value="">Select Category</option>';
    temp.querySelectorAll('li .edit-category').forEach(btn => {
      const o = document.createElement('option');
      o.value = btn.getAttribute('data-id');
      o.textContent = btn.getAttribute('data-name');
      select.appendChild(o);
    });
  } catch (err) { console.error('Failed to load categories:', err); }
}

function attachCombinationRowListeners(row, containerId = 'combinationItemsContainer') {
  const catSel  = row.querySelector('.comb-category-select');
  const clsSel  = row.querySelector('.comb-classification-select');
  const itemSel = row.querySelector('.comb-item-select');
  const remBtn  = row.querySelector('.remove-combination-item-btn');

  catSel.addEventListener('change', async () => {
    clsSel.innerHTML = '<option value="">Select Classification</option>';
    clsSel.disabled  = true; clsSel.classList.add('bg-slate-100');
    itemSel.innerHTML = '<option value="">Select Item</option>';
    itemSel.disabled  = true; itemSel.classList.add('bg-slate-100');
    if (!catSel.value) return;
    try {
      const cls = await (await fetch(`forms/search_classification.php?category_id=${catSel.value}`)).json();
      cls.forEach(c => {
        const o = document.createElement('option');
        o.value = c.id; o.textContent = c.classification_name;
        clsSel.appendChild(o);
      });
      clsSel.disabled = false; clsSel.classList.remove('bg-slate-100');
    } catch (err) { console.error(err); }
  });

  clsSel.addEventListener('change', async () => {
    itemSel.innerHTML = '<option value="">Select Item</option>';
    itemSel.disabled  = true; itemSel.classList.add('bg-slate-100');
    if (!clsSel.value) return;
    try {
      const items = await (await fetch(`forms/fetch_items_by_classification.php?classification_id=${clsSel.value}`)).json();
      if (!items.length || items.error) { itemSel.innerHTML = '<option value="">No items available</option>'; return; }
      items.forEach(item => {
        const o = document.createElement('option');
        o.value = item.id; o.textContent = `${item.name} (Stock: ${item.quantity})`;
        itemSel.appendChild(o);
      });
      itemSel.disabled = false; itemSel.classList.remove('bg-slate-100');
    } catch (err) { console.error(err); }
  });

  remBtn?.addEventListener('click', () => { row.remove(); updateCombRemoveBtns(containerId); });
}

function updateCombRemoveBtns(containerId = 'combinationItemsContainer') {
  const rows = document.getElementById(containerId)?.querySelectorAll('.combination-item-row');
  if (!rows) return;
  rows.forEach(row => {
    const btn = row.querySelector('.remove-combination-item-btn');
    if (btn) btn.classList.toggle('hidden', rows.length <= 1);
  });
}

async function addCombItemRow(containerId = 'combinationItemsContainer', prefix = 'items') {
  const container = document.getElementById(containerId);
  const index     = containerId === 'combinationItemsContainer' ? combinationItemIndex++ : editCombinationItemIndex++;
  container.insertAdjacentHTML('beforeend', buildCombItemRowHTML(index, prefix));
  const row = container.querySelector(`[data-index="${index}"]`);
  await loadCombinationCategories(row);
  attachCombinationRowListeners(row, containerId);
  updateCombRemoveBtns(containerId);
}

async function loadCombinationsList() {
  const listContainer = document.getElementById('combinationsListContainer');
  if (!listContainer) return;

  listContainer.innerHTML = `
    <div class="flex items-center justify-center py-6">
      <svg class="animate-spin h-5 w-5 text-red-500 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path  class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
      </svg>
      <span class="text-sm text-slate-500">Loading combinations...</span>
    </div>`;

  try {
    const result = await (await fetch('forms/fetch_combinations.php')).json();

    if (result.status !== 'success' || !result.data.length) {
      listContainer.innerHTML = `<div class="text-center py-6 text-slate-400 text-sm">No combinations yet. Create one below.</div>`;
      return;
    }

    listContainer.innerHTML = result.data.map(combo => `
      <div class="combination-card p-4 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow" data-id="${combo.id}">
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-1">
              <span class="font-semibold text-slate-800">📂 ${escapeHtmlCombo(combo.name)}</span>
              <span class="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                ${combo.item_count} item${combo.item_count != 1 ? 's' : ''}
              </span>
            </div>
            <div class="flex flex-wrap gap-1 mt-2">
              ${combo.items.map(item => `
                <span class="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">
                  ${escapeHtmlCombo(item.item_name)} ×${item.quantity_required}
                </span>`).join('')}
            </div>
          </div>
          <div class="flex gap-2 ml-4 flex-shrink-0">
            <button onclick="openEditCombinationModal(${combo.id})"
                    class="px-3 py-1.5 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition-colors text-xs font-medium">
              ✏️ Edit
            </button>
            <button onclick="deleteCombination(${combo.id}, '${escapeHtmlCombo(combo.name).replace(/'/g, "\\'")}')"
                    class="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-xs font-medium">
              🗑️ Delete
            </button>
          </div>
        </div>
      </div>`).join('');
  } catch (err) {
    console.error(err);
    listContainer.innerHTML = `<div class="text-center py-4 text-red-500 text-sm">Failed to load combinations.</div>`;
  }
}

async function deleteCombination(id, name) {
  if (!confirm(`Delete combination "${name}"? This cannot be undone.`)) return;
  try {
    const fd = new FormData(); fd.append('id', id);
    const result = await (await fetch('../actions/delete_combination.php', { method: 'POST', body: fd })).json();
    if (result.status === 'success') {
      showToast(`✅ "${name}" deleted.`);
      loadCombinationsList();
    } else {
      showToast(`❌ ${result.message}`, 'error');
    }
  } catch (err) { console.error(err); showToast('❌ Failed to delete.', 'error'); }
}

(function initCombinationModal() {
  const modal        = document.getElementById('combinationModal');
  const openBtn      = document.getElementById('combinationBtn');
  const closeBtn     = document.getElementById('closeCombinationModal');
  const cancelBtn    = document.getElementById('cancelCombinationBtn');
  const addItemBtn   = document.getElementById('addCombinationItemBtn');

  const open = async () => {
    modal.classList.remove('hidden'); modal.classList.add('flex');
    loadCombinationsList();
    document.getElementById('combinationItemsContainer').innerHTML = '';
    combinationItemIndex = 0;
    document.getElementById('combination_name').value = '';
    await addCombItemRow();
  };
  const close = () => { modal.classList.add('hidden'); modal.classList.remove('flex'); };

  openBtn.addEventListener('click', open);
  closeBtn.addEventListener('click', close);
  cancelBtn.addEventListener('click', close);
  modal.addEventListener('click', e => { if (e.target === modal) close(); });
  addItemBtn.addEventListener('click', () => addCombItemRow());
})();

document.getElementById('combinationForm').addEventListener('submit', async e => {
  e.preventDefault();
  const form      = e.target;
  const submitBtn = form.querySelector('[type="submit"]');
  const origText  = submitBtn.textContent;
  const name      = document.getElementById('combination_name').value.trim();

  if (!name) { showToast('Please enter a combination name.', 'error'); return; }

  const rows = document.getElementById('combinationItemsContainer').querySelectorAll('.combination-item-row');
  for (const row of rows) {
    if (!row.querySelector('.comb-item-select').value) { showToast('Please select an item for every row.', 'error'); return; }
    if (parseInt(row.querySelector('.comb-quantity-input').value) < 1) { showToast('Please enter a valid quantity for every item.', 'error'); return; }
  }

  submitBtn.disabled = true; submitBtn.textContent = 'Saving...';
  try {
    const result = await (await fetch('../actions/save_combination.php', { method: 'POST', body: new FormData(form) })).json();
    if (result.status === 'success') {
      showToast(`✅ "${name}" saved!`);
      form.reset();
      document.getElementById('combinationItemsContainer').innerHTML = '';
      combinationItemIndex = 0;
      await addCombItemRow();
      loadCombinationsList();
    } else {
      showToast(`❌ ${result.message}`, 'error');
    }
  } catch (err) { console.error(err); showToast('❌ Failed to save. Please try again.', 'error'); }
  finally { submitBtn.disabled = false; submitBtn.textContent = origText; }
});


// ──────────────────────────────────────────────────────────────
// 13. MODAL: EDIT COMBINATION
// ──────────────────────────────────────────────────────────────
async function openEditCombinationModal(id) {
  try {
    const result = await (await fetch(`forms/get_combination.php?id=${id}`)).json();
    if (result.status !== 'success') { showToast(`❌ ${result.message}`, 'error'); return; }

    const combo = result.data;
    document.getElementById('edit_combination_id').value   = combo.id;
    document.getElementById('edit_combination_name').value = combo.name;

    const container = document.getElementById('editCombinationItemsContainer');
    container.innerHTML = '';
    editCombinationItemIndex = 0;

    for (const item of combo.items) await addEditItemRow(item);

    document.getElementById('editCombinationModal').classList.remove('hidden');
    document.getElementById('editCombinationModal').classList.add('flex');
  } catch (err) { console.error(err); showToast('❌ Failed to load combination.', 'error'); }
}

async function addEditItemRow(prefill = null) {
  const containerId = 'editCombinationItemsContainer';
  const index       = editCombinationItemIndex++;
  const container   = document.getElementById(containerId);

  container.insertAdjacentHTML('beforeend', buildCombItemRowHTML(index, 'edit_items'));
  const row = container.querySelector(`[data-index="${index}"]`);
  await loadCombinationCategories(row);
  attachCombinationRowListeners(row, containerId);
  updateCombRemoveBtns(containerId);

  if (!prefill) return;

  const catSel  = row.querySelector('.comb-category-select');
  const clsSel  = row.querySelector('.comb-classification-select');
  const itemSel = row.querySelector('.comb-item-select');
  const qtyIn   = row.querySelector('.comb-quantity-input');

  catSel.value = prefill.category_id;

  if (prefill.category_id) {
    try {
      const cls = await (await fetch(`forms/search_classification.php?category_id=${prefill.category_id}`)).json();
      clsSel.innerHTML = '<option value="">Select Classification</option>';
      cls.forEach(c => {
        const o = document.createElement('option');
        o.value = c.id; o.textContent = c.classification_name;
        clsSel.appendChild(o);
      });
      clsSel.disabled = false; clsSel.classList.remove('bg-slate-100');
      clsSel.value    = prefill.classification_id;
    } catch (err) { console.error(err); }
  }

  if (prefill.classification_id) {
    try {
      const items = await (await fetch(`forms/fetch_items_by_classification.php?classification_id=${prefill.classification_id}`)).json();
      itemSel.innerHTML = '<option value="">Select Item</option>';
      items.forEach(item => {
        const o = document.createElement('option');
        o.value = item.id; o.textContent = `${item.name} (Stock: ${item.quantity})`;
        itemSel.appendChild(o);
      });
      itemSel.disabled = false; itemSel.classList.remove('bg-slate-100');
      itemSel.value    = prefill.item_id;
    } catch (err) { console.error(err); }
  }

  qtyIn.value = prefill.quantity_required;
}

(function initEditCombinationModal() {
  const modal      = document.getElementById('editCombinationModal');
  const closeBtn   = document.getElementById('closeEditCombinationModal');
  const cancelBtn  = document.getElementById('cancelEditCombinationBtn');
  const addItemBtn = document.getElementById('addEditCombinationItemBtn');

  const close = () => { modal.classList.add('hidden'); modal.classList.remove('flex'); };

  closeBtn.addEventListener('click', close);
  cancelBtn.addEventListener('click', close);
  modal.addEventListener('click', e => { if (e.target === modal) close(); });
  addItemBtn.addEventListener('click', () => addEditItemRow());
})();

document.getElementById('editCombinationForm').addEventListener('submit', async e => {
  e.preventDefault();
  const form      = e.target;
  const submitBtn = form.querySelector('[type="submit"]');
  const origText  = submitBtn.textContent;
  const name      = document.getElementById('edit_combination_name').value.trim();

  if (!name) { showToast('Please enter a combination name.', 'error'); return; }

  const rows = document.getElementById('editCombinationItemsContainer').querySelectorAll('.combination-item-row');
  for (const row of rows) {
    if (!row.querySelector('.comb-item-select').value) { showToast('Please select an item for every row.', 'error'); return; }
    if (parseInt(row.querySelector('.comb-quantity-input').value) < 1) { showToast('Please enter a valid quantity.', 'error'); return; }
  }

  submitBtn.disabled = true; submitBtn.textContent = 'Saving...';
  try {
    const result = await (await fetch('../actions/edit_combination.php', { method: 'POST', body: new FormData(form) })).json();
    if (result.status === 'success') {
      showToast(`✅ "${name}" updated!`);
      document.getElementById('editCombinationModal').classList.add('hidden');
      document.getElementById('editCombinationModal').classList.remove('flex');
      loadCombinationsList();
    } else {
      showToast(`❌ ${result.message}`, 'error');
    }
  } catch (err) { console.error(err); showToast('❌ Failed to update. Please try again.', 'error'); }
  finally { submitBtn.disabled = false; submitBtn.textContent = origText; }
});


// ──────────────────────────────────────────────────────────────
// 14. EDIT DISTRIBUTION
// ──────────────────────────────────────────────────────────────
async function editDistribution(id) {
  try {
    const json = await (await fetch(`forms/get_distribution.php?id=${id}`)).json();
    if (json.status !== 'success') { alert('❌ ' + (json.message || 'Failed to fetch distribution')); return; }

    const d = json.data;
    document.getElementById('edit_id').value          = d.id;
    document.getElementById('edit_recipient').value   = d.recipient    || '';
    document.getElementById('edit_department').value  = d.department   || '';
    document.getElementById('edit_approved_by').value = d.approved_by  || '';
    document.getElementById('edit_debit_to').value    = d.debit_to     || '';
    document.getElementById('edit_purpose').value     = d.purpose      || '';
    document.getElementById('edit_quantity').value    = d.quantity      || '';

    await loadCategoriesForEdit(d.category_id, d.classification_id, d.item_id);
    document.getElementById('editDistributionModal').classList.replace('hidden', 'flex');
  } catch (err) { console.error(err); alert('❌ Failed to fetch distribution'); }
}

async function loadCategoriesForEdit(catId, clsId, itemId) {
  const catSel  = document.getElementById('edit_category');
  const clsSel  = document.getElementById('edit_classification');
  const itemSel = document.getElementById('edit_item_id');

  const html = await (await fetch('./forms/fetch_categories.php')).text();
  const temp = document.createElement('div'); temp.innerHTML = html;
  catSel.innerHTML = '<option value="">Select Category</option>';
  temp.querySelectorAll('li .edit-category').forEach(btn => {
    const o = document.createElement('option');
    o.value = btn.getAttribute('data-id'); o.textContent = btn.getAttribute('data-name');
    catSel.appendChild(o);
  });
  catSel.value = catId;

  if (catId) {
    const cls = await (await fetch(`forms/search_classification.php?category_id=${catId}`)).json();
    clsSel.innerHTML = '<option value="">Select Classification</option>';
    cls.forEach(c => {
      const o = document.createElement('option');
      o.value = c.id; o.textContent = c.classification_name;
      clsSel.appendChild(o);
    });
    clsSel.value = clsId;
  }

  if (clsId) {
    const items = await (await fetch(`forms/fetch_items_by_classification.php?classification_id=${clsId}`)).json();
    itemSel.innerHTML = '<option value="">Select Item</option>';
    items.forEach(item => {
      const o = document.createElement('option');
      o.value = item.id; o.textContent = `${item.name} (Stock: ${item.quantity})`;
      itemSel.appendChild(o);
    });
    itemSel.value = itemId;
  }
}

document.getElementById('edit_category')?.addEventListener('change', async function () {
  const clsSel  = document.getElementById('edit_classification');
  const itemSel = document.getElementById('edit_item_id');
  clsSel.innerHTML = '<option value="">Select Classification</option>';
  itemSel.innerHTML = '<option value="">Select Item</option>';
  if (!this.value) return;
  const cls = await (await fetch(`forms/search_classification.php?category_id=${this.value}`)).json();
  cls.forEach(c => {
    const o = document.createElement('option');
    o.value = c.id; o.textContent = c.classification_name;
    clsSel.appendChild(o);
  });
});

document.getElementById('edit_classification')?.addEventListener('change', async function () {
  const itemSel = document.getElementById('edit_item_id');
  itemSel.innerHTML = '<option value="">Select Item</option>';
  if (!this.value) return;
  const items = await (await fetch(`forms/fetch_items_by_classification.php?classification_id=${this.value}`)).json();
  items.forEach(item => {
    const o = document.createElement('option');
    o.value = item.id; o.textContent = `${item.name} (Stock: ${item.quantity})`;
    itemSel.appendChild(o);
  });
});

document.getElementById('closeEditModal')?.addEventListener('click', () => {
  document.getElementById('editDistributionModal').classList.replace('flex', 'hidden');
});

document.getElementById('editForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  try {
    const result = await (await fetch('/InventorySys/actions/edit_distribution.php', {
      method: 'POST', body: new FormData(e.target)
    })).json();
    if (result.status === 'success') {
      document.getElementById('editDistributionModal').classList.replace('flex', 'hidden');
      showToast('✅ Distribution updated successfully');
      await loadDistributions(currentPage);
    } else {
      alert('❌ ' + result.message);
    }
  } catch (err) { console.error(err); alert('❌ Failed to update distribution'); }
});


// ──────────────────────────────────────────────────────────────
// 15. DELETE DISTRIBUTION
// ──────────────────────────────────────────────────────────────
function deleteDistribution(id) {
  if (!confirm('Are you sure you want to delete this distribution? The stock will be restored.')) return;
  const fd = new FormData(); fd.append('id', id);
  fetch('/InventorySys/actions/delete_distribution.php', { method: 'POST', body: fd })
    .then(r => r.json())
    .then(data => {
      if (data.status === 'success') {
        showToast(`✅ ${data.message}`);
        loadDistributions(currentPage);
      } else {
        alert('❌ ' + data.message);
      }
    })
    .catch(err => { console.error(err); alert('❌ Failed to delete distribution'); });
}


// ──────────────────────────────────────────────────────────────
// 16. RETURN DISTRIBUTION
// ──────────────────────────────────────────────────────────────
async function returnDistribution(id) {
  try {
    const result = await (await fetch(`forms/get_distribution.php?id=${id}`)).json();
    if (result.status !== 'success') { alert('❌ Failed to load distribution data'); return; }

    const d = result.data;
    document.getElementById('return_id').value            = d.id;
    document.getElementById('return_item_name').textContent     = d.item_name;
    document.getElementById('return_distributed_qty').textContent = d.quantity;
    document.getElementById('return_quantity').value      = d.quantity;
    document.getElementById('return_quantity').max        = d.quantity;

    document.getElementById('returnModal').classList.replace('hidden', 'flex');
  } catch (err) { console.error(err); alert('❌ Failed to load distribution'); }
}

document.getElementById('closeReturnModal')?.addEventListener('click', () => {
  document.getElementById('returnModal').classList.replace('flex', 'hidden');
});

document.getElementById('returnForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  try {
    const result = await (await fetch('/InventorySys/actions/return_distribution.php', {
      method: 'POST', body: new FormData(e.target)
    })).json();
    if (result.status === 'success') {
      document.getElementById('returnModal').classList.replace('flex', 'hidden');
      showToast(`✅ ${result.message}`);
      await loadDistributions(currentPage);
    } else {
      alert('❌ ' + result.message);
    }
  } catch (err) { console.error(err); alert('❌ Failed to process return'); }
});


// ──────────────────────────────────────────────────────────────
// 17. SEARCH FORM EVENT LISTENERS
// ──────────────────────────────────────────────────────────────
document.getElementById('searchForm')?.addEventListener('submit', e => {
  e.preventDefault();
  currentPage = 1;
  loadDistributions(1);
});

document.getElementById('timeframeFilter')?.addEventListener('change', () => {
  document.getElementById('customDateInputs').classList.toggle(
    'hidden', document.getElementById('timeframeFilter').value !== 'custom'
  );
});

document.getElementById('clearFilters')?.addEventListener('click', () => {
  document.getElementById('searchInput').value    = '';
  document.getElementById('timeframeFilter').value = 'all';
  document.getElementById('startDate').value       = '';
  document.getElementById('endDate').value         = '';
  document.getElementById('customDateInputs').classList.add('hidden');
  document.getElementById('activeFilters').classList.add('hidden');
  currentPage = 1;
  loadDistributions(1);
});


// ──────────────────────────────────────────────────────────────
// 18. GLOBAL EXPORTS & INIT
// ──────────────────────────────────────────────────────────────
window.editDistribution         = editDistribution;
window.deleteDistribution       = deleteDistribution;
window.returnDistribution       = returnDistribution;
window.openEditCombinationModal = openEditCombinationModal;
window.deleteCombination        = deleteCombination;

document.addEventListener('DOMContentLoaded', () => {
  attachRowEventListeners(document.querySelector('.item-row'));
  loadDistributions(1);
});
</script>

<?php include '../includes/footer.php'; ?>