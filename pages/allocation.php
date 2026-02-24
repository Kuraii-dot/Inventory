<?php
require_once '../includes/auth.php';
requireRole('admin');

require_once '../includes/db.php';
require_once '../includes/header.php';
?>

<link href="../front/css/output.css" rel="stylesheet">

<style>
/* ── Toast (matches distributions.php) ── */
.toast {
  animation: slideInRight 0.3s ease-out, fadeOut 0.5s ease-in 2.5s forwards;
}

@keyframes slideInRight {
  from { opacity: 0; transform: translateX(100%); }
  to   { opacity: 1; transform: translateX(0); }
}

@keyframes fadeOut {
  to { opacity: 0; transform: translateX(50%); }
}

/* ── Modal animations (matches distributions.php) ── */
.modal-backdrop {
  backdrop-filter: blur(8px);
  transition: opacity 0.3s ease;
}

.modal-content {
  animation: modalSlideIn 0.3s ease;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* ── Grouped rows – EXACT same as distributions.php ── */
.group-items {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.4s ease-out, opacity 0.3s ease-out;
  opacity: 0;
}

.group-items.expanded {
  max-height: 3000px;
  opacity: 1;
  transition: max-height 0.5s ease-in, opacity 0.3s ease-in;
}

/* Arrow rotation */
.group-toggle {
  transition: transform 0.3s ease;
  display: inline-block;
}

.group-toggle.rotated {
  transform: rotate(90deg);
}

/* Slide-in per item */
.group-item {
  opacity: 0;
  transform: translateY(-10px);
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.group-items.expanded .group-item {
  opacity: 1;
  transform: translateY(0);
}

/* Stagger delays */
.group-items.expanded .group-item:nth-child(1) { transition-delay: 0.05s; }
.group-items.expanded .group-item:nth-child(2) { transition-delay: 0.10s; }
.group-items.expanded .group-item:nth-child(3) { transition-delay: 0.15s; }
.group-items.expanded .group-item:nth-child(4) { transition-delay: 0.20s; }
.group-items.expanded .group-item:nth-child(5) { transition-delay: 0.25s; }
.group-items.expanded .group-item:nth-child(6) { transition-delay: 0.30s; }
.group-items.expanded .group-item:nth-child(7) { transition-delay: 0.35s; }
.group-items.expanded .group-item:nth-child(8) { transition-delay: 0.40s; }
</style>

<!-- Main Content -->
<div class="min-h-screen bg-gradient-to-br from-purple-50 via-lavender-50 to-violet-50">
  <div class="max-w-fit mx-auto px-8 py-10">
    
    <!-- Header Section -->
    <div class="flex justify-between items-start mb-8">
      <div>
        <h1 class="text-4xl font-bold bg-gradient-to-r from-blue-400 to-pink-400 bg-clip-text text-transparent mb-2">
          Office Item Allocations
        </h1>
        <p class="text-slate-500 text-sm">Allocate and track office supplies across departments</p>
      </div>
      
      <!-- Action Buttons -->
      <div class="flex gap-3">
        <button id="manageCategoriesBtn" class="group relative px-5 py-2.5 bg-white text-purple-600 font-medium rounded-xl border-2 border-purple-200 hover:border-purple-300 hover:shadow-lg transition-all duration-300 hover:scale-105">
          <span class="flex items-center gap-2"><span>📂</span><span>Categories</span></span>
        </button>

        <button id="generateReportBtn" class="group relative px-5 py-2.5 bg-white text-purple-600 font-medium rounded-xl border-2 border-purple-200 hover:border-purple-300 hover:shadow-lg transition-all duration-300 hover:scale-105">
          <span class="flex items-center gap-2"><span>📊</span><span>Generate Report</span></span>
        </button>

        <button id="allocateItemsBtn" class="group relative px-6 py-2.5 bg-gradient-to-r from-pink-400 to-blue-500 text-white border-2 border-pink-400 hover:border-pink-200 font-semibold rounded-xl shadow-md hover:shadow-xl transition-all duration-300 hover:scale-105">
          <span class="flex items-center gap-2"><span class="text-lg">+</span><span>Allocate Items</span></span>
        </button>
      </div>
    </div>

    <!-- Search & Filter Card -->
    <div class="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl shadow-sm border border-pink-100 p-6 mb-6">
      <form id="searchForm" class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">

          <!-- Search -->
          <div class="md:col-span-2">
            <label class="block text-xs font-medium text-slate-600 mb-2">Search Allocations</label>
            <div class="relative">
              <input id="searchInput" type="text" placeholder="Search by item, department, or allocated by..." 
                     class="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
            </div>
          </div>

          <!-- Timeframe -->
          <div>
            <label class="block text-xs font-medium text-slate-600 mb-2">Timeframe</label>
            <select id="timeframeFilter" class="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition">
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
                    class="w-full bg-gradient-to-r from-blue-400 to-pink-400 hover:shadow-lg text-white py-2.5 px-4 rounded-lg font-medium transition-all duration-300 hover:scale-105 flex items-center justify-center gap-2">
              <span id="searchBtnIcon">🔎</span>
              <span id="searchBtnText">Search</span>
            </button>
          </div>

        </div>

        <!-- Custom Date Range -->
        <div id="customDateInputs" class="hidden">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 p-5 bg-gradient-to-r from-purple-50 to-violet-50 rounded-xl border border-purple-200">
            <div>
              <label class="block text-xs font-medium text-slate-700 mb-2">Start Date</label>
              <input type="date" id="startDate" class="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition">
            </div>
            <div>
              <label class="block text-xs font-medium text-slate-700 mb-2">End Date</label>
              <input type="date" id="endDate" class="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition">
            </div>
            <div class="flex items-end">
              <div class="w-full px-4 py-2.5 bg-white/50 rounded-lg border border-purple-300 flex items-center justify-center">
                <span class="text-xs text-slate-600">Click Search to apply</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Active Filters -->
        <div id="activeFilters" class="hidden flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          <span class="text-xs font-medium text-slate-500">Active Filters:</span>
          <div id="filterTags" class="flex flex-wrap gap-2"></div>
          <button type="button" id="clearFilters" class="text-xs text-purple-600 hover:text-purple-700 font-medium ml-auto transition-colors">
            Clear All ✕
          </button>
        </div>
      </form>

      <!-- Results Info Bar -->
      <div class="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div id="loadingIndicator" class="hidden">
            <svg class="animate-spin h-4 w-4 text-purple-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <span id="resultCount" class="text-sm font-medium text-slate-600">Loading allocations...</span>
        </div>
        <span class="text-xs text-slate-400">Last updated: <span id="lastUpdated">--</span></span>
      </div>
    </div>

    <!-- Allocations Table -->
    <div class="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl shadow-sm border border-pink-100 overflow-hidden">
      <div class="overflow-x-hidden overflow-y-hidden">
        <table class="min-w-full w-[1400px] table-fixed">
          <thead>
            <tr class="bg-gradient-to-r from-pink-400 to-blue-500 text-white">
              <th class="py-4 px-6 text-center text-xs font-semibold uppercase tracking-wider" style="width:10%;">Date</th>
              <th class="py-4 px-6 text-center text-xs font-semibold uppercase tracking-wider" style="width:15%;">Item</th>
              <th class="py-4 px-6 text-center text-xs font-semibold uppercase tracking-wider" style="width:12%;">Category</th>
              <th class="py-4 px-6 text-center text-xs font-semibold uppercase tracking-wider" style="width:8%;">Quantity</th>
              <th class="py-4 px-6 text-center text-xs font-semibold uppercase tracking-wider" style="width:12%;">Department</th>
              <th class="py-4 px-6 text-center text-xs font-semibold uppercase tracking-wider" style="width:12%;">Allocated By</th>
              <th class="py-4 px-6 text-center text-xs font-semibold uppercase tracking-wider" style="width:15%;">Purpose</th>
              <th class="py-4 px-6 text-center text-xs font-semibold uppercase tracking-wider" style="width:16%;">Actions</th>
            </tr>
          </thead>
          <tbody id="allocationsTable" class="divide-y divide-slate-100">
            <!-- Data loaded dynamically -->
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div id="paginationContainer" class="hidden px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
        <div class="text-sm text-slate-600">
          Showing <span id="pageInfo">--</span>
        </div>
        <div class="flex gap-2">
          <button id="prevPage" class="px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            ← Previous
          </button>
          <div id="pageNumbers" class="flex gap-1"></div>
          <button id="nextPage" class="px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            Next →
          </button>
        </div>
      </div>
    </div>

  </div>
</div>

<!-- ════════ MODALS ════════ -->

<!-- Categories Modal -->
<div id="categoriesModal" class="hidden fixed inset-0 bg-black/40 modal-backdrop flex items-center justify-center z-50">
  <div class="modal-content bg-white rounded-2xl shadow-2xl w-full max-w-lg relative p-8">
    <button id="closeCategoriesModal" class="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-2xl font-bold transition-colors">&times;</button>
    <div class="mb-6">
      <h2 class="text-2xl font-bold text-slate-800">Manage Categories</h2>
      <p class="text-sm text-slate-500 mt-1">Add, edit, or remove item categories</p>
    </div>
    <p class="text-slate-600">Use the Categories management in Items page to manage categories.</p>
    <p class="text-sm text-slate-500 mt-2">Categories are shared across Items, Distributions, and Allocations.</p>
  </div>
</div>

<!-- Generate Report Modal -->
<div id="reportModal" class="hidden fixed inset-0 bg-black/40 modal-backdrop flex items-center justify-center z-50">
  <div class="modal-content bg-white rounded-2xl shadow-2xl w-full max-w-lg relative p-8">
    <button id="closeReportModal" class="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-2xl font-bold transition-colors">&times;</button>
    <div class="mb-6">
      <h2 class="text-2xl font-bold text-slate-800">Generate Allocation Report</h2>
      <p class="text-sm text-slate-500 mt-1">Export allocation records in your preferred format</p>
    </div>
    <form action="forms/generate_allocation_report.php" method="POST" target="_blank" class="space-y-4">
      <div class="p-5 bg-gradient-to-r from-purple-50 to-violet-50 rounded-xl border border-purple-200">
        <label class="block text-sm font-semibold text-slate-700 mb-3">Select Format</label>
        <div class="flex gap-4">
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="format" value="pdf" checked class="w-4 h-4 text-purple-600">
            <span class="text-slate-700">📄 PDF</span>
          </label>
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="format" value="excel" class="w-4 h-4 text-purple-600">
            <span class="text-slate-700">📊 Excel</span>
          </label>
        </div>
      </div>
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-2">Select Timeframe</label>
        <select id="timeframeSelect" name="timeframe" class="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition">
          <option value="today">Today</option>
          <option value="month">This Month</option>
          <option value="year">This Year</option>
          <option value="custom">Custom Range</option>
        </select>
      </div>
      <div id="customRange" class="hidden space-y-3">
        <label class="block text-sm font-medium text-slate-700">Select Custom Date Range</label>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs text-slate-500 mb-1">From</label>
            <input type="date" name="from" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition">
          </div>
          <div>
            <label class="block text-xs text-slate-500 mb-1">To</label>
            <input type="date" name="to" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition">
          </div>
        </div>
      </div>
      <div class="flex justify-end gap-3 pt-4 border-t border-slate-200">
        <button type="button" id="cancelReportBtn"
                class="px-6 py-2.5 bg-slate-100 text-slate-600 font-medium rounded-lg hover:bg-slate-200 transition-colors">Cancel</button>
        <button type="submit"
                class="px-8 py-2.5 bg-gradient-to-r from-purple-500 to-violet-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-300">
          Generate Report
        </button>
      </div>
    </form>
  </div>
</div>

<!-- Allocate Items Modal -->
<div id="allocateItemsModal" class="hidden fixed inset-0 bg-black/40 modal-backdrop flex items-center justify-center z-50">
  <div class="modal-content bg-gradient-to-r from-pink-50 to-violet-50 rounded-2xl shadow-2xl w-full max-w-3xl relative p-8 max-h-[90vh] overflow-y-auto">
    <button id="closeAllocateModal" class="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-2xl font-bold transition-colors">&times;</button>
    <div class="mb-6">
      <h2 class="text-2xl font-bold text-slate-800">Allocate Office Items</h2>
      <p class="text-sm text-slate-500 mt-1">Allocate office supplies to departments (single or multiple items)</p>
    </div>

    <form id="allocateForm" method="POST" class="space-y-5">
      <div class="p-5 bg-gradient-to-r from-pink-50 to-violet-50 rounded-xl border border-purple-200">
        <h3 class="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
          <span>📋</span><span>Allocation Information</span>
        </h3>
        <div class="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">Department *</label>
            <select name="department" required class="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition">
              <option value="">Select Department</option>
              <option>Admin</option>
              <option>Engineering</option>
              <option>Commercial</option>
              <option>Finance</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">Allocated By *</label>
            <input type="text" name="allocated_by" required
                   class="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                   placeholder="Your name">
          </div>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">Purpose *</label>
            <textarea name="purpose" rows="2" required
                      class="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition resize-none"
                      placeholder="Purpose of allocation..."></textarea>
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">Remarks (Optional)</label>
            <textarea name="remarks" rows="2"
                      class="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition resize-none"
                      placeholder="Additional notes..."></textarea>
          </div>
        </div>
      </div>

      <div>
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <span>📦</span><span>Items to Allocate</span>
          </h3>
          <button type="button" id="addItemRowBtn"
                  class="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-sm font-medium flex items-center gap-2">
            <span>+</span><span>Add Another Item</span>
          </button>
        </div>

        <div id="itemsContainer" class="space-y-4">
          <div class="item-row p-4 bg-slate-50 rounded-lg border border-slate-200 relative">
            <button type="button" class="remove-item-btn hidden absolute top-4 right-2 text-red-500 hover:text-red-700 font-bold text-xl" title="Remove item">&times;</button>
            <div class="grid grid-cols-3 gap-3">
              <div>
                <label class="block text-xs font-medium text-slate-700 mb-1">Category *</label>
                <select name="items[0][category_id]" class="category-select w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm" required>
                  <option value="">Select Category</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-700 mb-1">Item *</label>
                <select name="items[0][item_id]" class="item-select w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm" required>
                  <option value="">Select Item</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-700 mb-1">Quantity *</label>
                <input type="number" name="items[0][quantity]" min="1" required
                       class="quantity-input w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
                       placeholder="0">
                <div class="stock-warning text-xs mt-1 hidden"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="flex justify-between items-center pt-4 border-t border-slate-200">
        <span id="itemCount" class="text-sm text-slate-600 font-medium">1 item to allocate</span>
        <div class="flex gap-3">
          <button type="button" onclick="document.getElementById('closeAllocateModal').click()"
                  class="px-6 py-2.5 bg-slate-100 text-slate-600 font-medium rounded-lg hover:bg-slate-200 transition-colors">Cancel</button>
          <button type="submit"
                  class="px-8 py-2.5 bg-gradient-to-r from-purple-500 to-violet-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-300">
            Allocate All Items
          </button>
        </div>
      </div>
    </form>
  </div>
</div>

<!-- Edit Allocation Modal -->
<div id="editAllocationModal" class="hidden fixed inset-0 bg-black/40 modal-backdrop flex items-center justify-center z-50">
  <div class="modal-content bg-gradient-to-r from-pink-50 to-violet-50 rounded-2xl shadow-2xl w-full max-w-2xl relative p-8 max-h-[90vh] overflow-y-auto">
    <button id="closeEditModal" class="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-2xl font-bold transition-colors">&times;</button>
    <div class="mb-6">
      <h2 class="text-2xl font-bold text-slate-800">Edit Allocation</h2>
      <p class="text-sm text-slate-500 mt-1">Modify allocation details</p>
    </div>
    <form id="editForm" method="POST" class="space-y-5">
      <input type="hidden" id="edit_id" name="id">
      <div class="p-5 bg-gradient-to-r from-pink-50 to-violet-50 rounded-xl border border-slate-300">
        <h3 class="text-sm font-semibold text-slate-700 mb-4">Allocation Details</h3>
        <div class="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">Category *</label>
            <select id="edit_category" class="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent transition" required>
              <option value="">Select Category</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">Item *</label>
            <select id="edit_item_id" name="item_id" class="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent transition" required>
              <option value="">Select Item</option>
            </select>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">Quantity *</label>
            <input type="number" id="edit_quantity" name="quantity" min="1" required
                   class="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent transition">
            <div id="edit_stock_warning" class="text-xs mt-1 hidden"></div>
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">Department *</label>
            <select id="edit_department" name="department" required
                    class="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent transition">
              <option value="">Select Department</option>
              <option>Admin</option>
              <option>Engineering</option>
              <option>Commercial</option>
              <option>Finance</option>
            </select>
          </div>
        </div>
        <div class="mb-4">
          <label class="block text-sm font-medium text-slate-700 mb-2">Allocated By *</label>
          <input type="text" id="edit_allocated_by" name="allocated_by" required
                 class="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent transition">
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">Purpose *</label>
            <textarea id="edit_purpose" name="purpose" rows="3" required
                      class="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent transition resize-none"></textarea>
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">Remarks</label>
            <textarea id="edit_remarks" name="remarks" rows="3"
                      class="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent transition resize-none"></textarea>
          </div>
        </div>
      </div>
      <div class="flex justify-end gap-3 pt-4 border-t border-slate-200">
        <button type="button" onclick="document.getElementById('closeEditModal').click()"
                class="px-6 py-2.5 bg-slate-100 text-slate-600 font-medium rounded-lg hover:bg-slate-200 transition-colors">Cancel</button>
        <button type="submit"
                class="px-8 py-2.5 bg-gradient-to-r from-purple-500 to-violet-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-300">
          Update Allocation
        </button>
      </div>
    </form>
  </div>
</div>

<!-- Return Allocation Modal -->
<div id="returnModal" class="hidden fixed inset-0 bg-black/40 modal-backdrop flex items-center justify-center z-50">
  <div class="modal-content bg-gradient-to-r from-pink-50 to-violet-50 rounded-2xl shadow-2xl w-full max-w-md relative p-8">
    <button id="closeReturnModal" class="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-2xl font-bold transition-colors">&times;</button>
    <div class="mb-6">
      <h2 class="text-2xl font-bold text-slate-800">Return Allocation</h2>
      <p class="text-sm text-slate-500 mt-1">Return allocated items to inventory</p>
    </div>
    <form id="returnForm" method="POST" class="space-y-4">
      <input type="hidden" id="return_id" name="id">
      <div class="p-4 bg-purple-50 rounded-lg border border-purple-200">
        <div class="text-sm text-slate-600 mb-2"><strong>Item:</strong> <span id="return_item_name"></span></div>
        <div class="text-sm text-slate-600"><strong>Allocated Quantity:</strong> <span id="return_allocated_qty"></span></div>
      </div>
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-2">Return Quantity *</label>
        <input type="number" id="return_quantity" name="return_quantity" min="1" required
               class="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition">
        <p class="text-xs text-slate-500 mt-1">Leave empty or enter full quantity for complete return</p>
      </div>
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-2">Reason for Return *</label>
        <textarea id="return_reason" name="return_reason" rows="3" required
                  class="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition resize-none"
                  placeholder="Enter reason for returning items..."></textarea>
      </div>
      <div class="flex justify-end gap-3 pt-4 border-t border-slate-200">
        <button type="button" onclick="document.getElementById('closeReturnModal').click()"
                class="px-6 py-2.5 bg-slate-100 text-slate-600 font-medium rounded-lg hover:bg-slate-200 transition-colors">Cancel</button>
        <button type="submit"
                class="px-8 py-2.5 bg-gradient-to-r from-purple-500 to-violet-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-300">
          Process Return
        </button>
      </div>
    </form>
  </div>
</div>


<script>
// ── Global State ──────────────────────────────────────────────────────
let currentPage = 1;
let currentFilters = { search: '', timeframe: 'all', startDate: '', endDate: '' };
let itemRowIndex = 1;

// ── Helpers ───────────────────────────────────────────────────────────
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text ?? '';
  return div.innerHTML;
}

function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `fixed bottom-4 right-4 ${type === 'success' ? 'bg-purple-500' : 'bg-red-500'} text-white px-6 py-3 rounded-xl shadow-lg z-50 toast`;
  toast.style.cssText = 'position:fixed;bottom:1rem;right:1rem;z-index:9999;';
  toast.innerHTML = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

// ── Modal helpers ─────────────────────────────────────────────────────
function openModal(id) {
  const el = document.getElementById(id);
  el.classList.remove('hidden');
  el.classList.add('flex');
}
function closeModal(id) {
  const el = document.getElementById(id);
  el.classList.add('hidden');
  el.classList.remove('flex');
}
function backdropClose(id) {
  document.getElementById(id)?.addEventListener('click', e => {
    if (e.target === document.getElementById(id)) closeModal(id);
  });
}

// ── Modal wiring ──────────────────────────────────────────────────────
document.getElementById('manageCategoriesBtn').addEventListener('click', () => openModal('categoriesModal'));
document.getElementById('closeCategoriesModal').addEventListener('click', () => closeModal('categoriesModal'));
backdropClose('categoriesModal');

document.getElementById('generateReportBtn').addEventListener('click', () => openModal('reportModal'));
document.getElementById('closeReportModal').addEventListener('click', () => closeModal('reportModal'));
document.getElementById('cancelReportBtn').addEventListener('click', () => closeModal('reportModal'));
backdropClose('reportModal');

document.getElementById('allocateItemsBtn').addEventListener('click', async () => {
  openModal('allocateItemsModal');
  await loadCategoriesForRow(document.querySelector('.item-row'));
});
document.getElementById('closeAllocateModal').addEventListener('click', () => { closeModal('allocateItemsModal'); resetModal(); });
backdropClose('allocateItemsModal');

document.getElementById('closeEditModal').addEventListener('click', () => closeModal('editAllocationModal'));
backdropClose('editAllocationModal');

document.getElementById('closeReturnModal').addEventListener('click', () => closeModal('returnModal'));
backdropClose('returnModal');

// Timeframe toggles
document.getElementById('timeframeSelect')?.addEventListener('change', function () {
  document.getElementById('customRange').classList.toggle('hidden', this.value !== 'custom');
});
document.getElementById('timeframeFilter')?.addEventListener('change', function () {
  document.getElementById('customDateInputs').classList.toggle('hidden', this.value !== 'custom');
});

// ── Render Table (same pattern as distributions.php) ──────────────────
function renderTable(data) {
  const tableBody = document.getElementById('allocationsTable');
  if (!tableBody) return;
  tableBody.innerHTML = '';

  if (!data || data.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="8" class="py-16 text-center">
          <div class="flex flex-col items-center justify-center">
            <div class="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <span class="text-3xl">📭</span>
            </div>
            <p class="text-slate-500 font-medium text-lg">No allocations found</p>
            <p class="text-slate-400 text-sm mt-1">Try adjusting your search or date range</p>
          </div>
        </td>
      </tr>`;
    return;
  }

  // Group by department + date + allocated_by (matches distributions.php grouping logic)
  const groups = {};
  data.forEach(row => {
    const date = row.created_at.split(' ')[0];
    const groupKey = `${row.department}|${date}|${row.allocated_by}`;
    if (!groups[groupKey]) {
      groups[groupKey] = {
        department: row.department,
        date: date,
        allocated_by: row.allocated_by,
        items: []
      };
    }
    groups[groupKey].items.push(row);
  });

  Object.keys(groups).forEach(groupKey => {
    const group = groups[groupKey];
    // Safe group ID (same sanitisation as distributions.php)
    const groupId = `group-${groupKey.replace(/\|/g, '-').replace(/\s/g, '_').replace(/:/g, '-')}`;
    const itemCount = group.items.length;
    const totalQty = group.items.reduce((s, i) => s + parseInt(i.quantity), 0);
    const hasReturned = group.items.some(i => i.status === 'returned');

    const dateObj = new Date(group.date);
    const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    // ── Group header row ──────────────────────────────────────────────
    const headerRow = document.createElement('tr');
    headerRow.className = 'group-header bg-gradient-to-r from-pink-50 to-blue-50 hover:from-pink-100 hover:to-blue-100 cursor-pointer border-b-2 border-purple-200';
    headerRow.onclick = () => toggleGroup(groupId);
    headerRow.innerHTML = `
      <td class="py-4 px-6 font-semibold text-slate-800" colspan="8">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <span class="group-toggle text-blue-500 font-bold text-lg" id="toggle-${groupId}">⮞</span>
            <div>
              <div class="flex items-center gap-2">
                <span class="text-blue-600">📦 ${escapeHtml(group.department)}</span>
                <span class="px-2 py-0.5 bg-pink-200 text-pink-800 rounded-full text-xs font-medium">${itemCount} item${itemCount !== 1 ? 's' : ''}</span>
                <span class="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">Qty: ${totalQty}</span>
                ${hasReturned ? '<span class="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">Has Returns</span>' : ''}
              </div>
              <div class="text-xs text-slate-600 mt-1">
                Allocated by <span class="font-medium">${escapeHtml(group.allocated_by)}</span> • ${formattedDate}
              </div>
            </div>
          </div>
          <div class="text-xs text-slate-500 italic">Click to expand/collapse</div>
        </div>
      </td>
    `;
    tableBody.appendChild(headerRow);

    // ── Items wrapper row (uses .group-items for smooth animation) ────
    const wrapperRow = document.createElement('tr');
    wrapperRow.className = 'group-items-wrapper';
    wrapperRow.setAttribute('data-group', groupId);

    const itemsHTML = group.items.map(row => {
      const itemDate = new Date(row.created_at);
      const itemFormattedDate = itemDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const itemFormattedTime = itemDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

      const statusBadge = row.status === 'returned'
        ? `<span class="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full font-medium">Returned</span>`
        : '';
      const stockWarning = (row.current_stock ?? 99) < 10
        ? `<span class="text-xs text-red-500 block mt-0.5">⚠️ Low Stock</span>`
        : '';

      return `
        <tr class="group-item hover:bg-purple-50/40 border-l-4 border-purple-300">
          <td class="py-3 px-6 text-xs text-slate-600" style="width:10%;">
            ${itemFormattedDate}<br>
            <span class="text-slate-400">${itemFormattedTime}</span>
          </td>
          <td class="py-3 px-6" style="width:15%;">
            <div class="text-sm font-medium text-slate-900">${escapeHtml(row.item_name)}</div>
            ${stockWarning}
          </td>
          <td class="py-3 px-6 text-sm text-slate-700" style="width:12%;">${escapeHtml(row.category_name)}</td>
          <td class="py-3 px-6 font-semibold text-purple-600" style="width:8%;">${row.quantity}</td>
          <td class="py-3 px-6 text-sm text-slate-700" style="width:12%;">${escapeHtml(row.department)}</td>
          <td class="py-3 px-6 text-sm text-slate-700" style="width:12%;">${escapeHtml(row.allocated_by)}</td>
          <td class="py-3 px-6 text-sm text-slate-600" style="width:15%;">
            <div class="max-w-xs truncate" title="${escapeHtml(row.purpose || '')}">${escapeHtml((row.purpose || '').substring(0, 50))}</div>
          </td>
          <td class="py-3 px-6" style="width:16%;">
            ${statusBadge}
            <div class="flex gap-2 ${row.status === 'returned' ? 'mt-1' : ''}">
              <button onclick="editAllocation(${row.id})"
                      class="px-3 py-1.5 bg-pink-100 text-pink-700 rounded-lg hover:bg-pink-200 transition-colors text-xs font-medium">
                ✏️ Edit
              </button>
              <button onclick="deleteAllocation(${row.id})"
                      class="px-2 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-xs font-medium">
                🗑️ Delete
              </button>
              ${row.status === 'active' ? `
                <button onclick="returnAllocation(${row.id})"
                        class="px-2 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-xs font-medium">
                  ↩️ Return
                </button>` : ''}
            </div>
          </td>
        </tr>`;
    }).join('');

    wrapperRow.innerHTML = `
      <td colspan="8" class="p-0">
        <div class="group-items" id="items-${groupId}">
          <table class="w-full table-fixed">
            <tbody>${itemsHTML}</tbody>
          </table>
        </div>
      </td>`;

    tableBody.appendChild(wrapperRow);
  });
}

// ── Toggle group (exact same as distributions.php) ────────────────────
function toggleGroup(groupId) {
  const container = document.getElementById(`items-${groupId}`);
  const toggle    = document.getElementById(`toggle-${groupId}`);
  if (!container || !toggle) return;

  if (container.classList.contains('expanded')) {
    container.classList.remove('expanded');
    toggle.classList.remove('rotated');
  } else {
    container.classList.add('expanded');
    toggle.classList.add('rotated');
  }
}

function expandAllGroups() {
  document.querySelectorAll('.group-items').forEach(el => el.classList.add('expanded'));
  document.querySelectorAll('.group-toggle').forEach(el => el.classList.add('rotated'));
}
function collapseAllGroups() {
  document.querySelectorAll('.group-items').forEach(el => el.classList.remove('expanded'));
  document.querySelectorAll('.group-toggle').forEach(el => el.classList.remove('rotated'));
}

window.toggleGroup = toggleGroup;
window.expandAllGroups = expandAllGroups;
window.collapseAllGroups = collapseAllGroups;

// ── Load Allocations ──────────────────────────────────────────────────
async function loadAllocations() {
  const loadingIndicator = document.getElementById('loadingIndicator');
  const resultCount      = document.getElementById('resultCount');
  const searchBtn        = document.getElementById('searchBtn');
  const searchBtnIcon    = document.getElementById('searchBtnIcon');
  const searchBtnText    = document.getElementById('searchBtnText');

  loadingIndicator?.classList.remove('hidden');
  if (resultCount)   resultCount.textContent = 'Loading...';
  if (searchBtn)     searchBtn.disabled = true;
  if (searchBtnIcon) searchBtnIcon.textContent = '⏳';
  if (searchBtnText) searchBtnText.textContent = 'Searching...';

  try {
    const params = new URLSearchParams({
      search:     currentFilters.search,
      timeframe:  currentFilters.timeframe,
      start_date: currentFilters.startDate,
      end_date:   currentFilters.endDate,
      page:       currentPage,
      limit:      50
    });

    const res  = await fetch(`forms/fetch_allocations.php?${params}`);
    const json = await res.json();

    renderTable(json.data);

    const total = json.total || 0;
    if (resultCount) {
      if (total === 0) {
        resultCount.textContent = 'No allocations found';
      } else {
        const s = (currentPage - 1) * (json.limit || 50) + 1;
        const e = Math.min(currentPage * (json.limit || 50), total);
        resultCount.textContent = `Showing ${s}–${e} of ${total} allocation${total !== 1 ? 's' : ''}`;
      }
    }

    updatePagination(total, json.total_pages);

    document.getElementById('lastUpdated').textContent = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  } catch (err) {
    console.error(err);
    showToast('❌ Failed to load allocations', 'error');

    const tableBody = document.getElementById('allocationsTable');
    if (tableBody) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="8" class="py-16 text-center">
            <div class="flex flex-col items-center justify-center">
              <div class="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <span class="text-3xl">⚠️</span>
              </div>
              <p class="text-red-600 font-medium text-lg">Error loading allocations</p>
              <button onclick="location.reload()" class="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition">
                Reload Page
              </button>
            </div>
          </td>
        </tr>`;
    }
  } finally {
    loadingIndicator?.classList.add('hidden');
    if (searchBtn)     searchBtn.disabled = false;
    if (searchBtnIcon) searchBtnIcon.textContent = '🔎';
    if (searchBtnText) searchBtnText.textContent = 'Search';
  }
}

// ── Pagination ────────────────────────────────────────────────────────
function updatePagination(totalRecords, totalPages) {
  const container   = document.getElementById('paginationContainer');
  const pageInfo    = document.getElementById('pageInfo');
  const prevPage    = document.getElementById('prevPage');
  const nextPage    = document.getElementById('nextPage');
  const pageNumbers = document.getElementById('pageNumbers');

  if (!totalPages || totalPages <= 1) { container?.classList.add('hidden'); return; }
  container?.classList.remove('hidden');

  const s = ((currentPage - 1) * 50) + 1;
  const e = Math.min(currentPage * 50, totalRecords);
  if (pageInfo) pageInfo.textContent = `${s}–${e} of ${totalRecords}`;

  prevPage.disabled = currentPage === 1;
  prevPage.onclick  = () => { if (currentPage > 1) { currentPage--; loadAllocations(); } };
  nextPage.disabled = currentPage === totalPages;
  nextPage.onclick  = () => { if (currentPage < totalPages) { currentPage++; loadAllocations(); } };

  if (pageNumbers) pageNumbers.innerHTML = '';
  const maxBtns = 5;
  let startP = Math.max(1, currentPage - Math.floor(maxBtns / 2));
  let endP   = Math.min(totalPages, startP + maxBtns - 1);
  if (endP - startP < maxBtns - 1) startP = Math.max(1, endP - maxBtns + 1);

  for (let i = startP; i <= endP; i++) {
    const btn = document.createElement('button');
    btn.textContent = i;
    btn.className = `px-3 py-2 rounded-lg transition-colors ${i === currentPage ? 'bg-purple-500 text-white' : 'bg-white border border-slate-200 hover:bg-slate-50'}`;
    btn.onclick = () => { currentPage = i; loadAllocations(); };
    pageNumbers?.appendChild(btn);
  }
}

// ── Search & Filters ──────────────────────────────────────────────────
document.getElementById('searchForm')?.addEventListener('submit', e => {
  e.preventDefault();
  currentFilters.search    = document.getElementById('searchInput').value;
  currentFilters.timeframe = document.getElementById('timeframeFilter').value;
  if (currentFilters.timeframe === 'custom') {
    currentFilters.startDate = document.getElementById('startDate').value;
    currentFilters.endDate   = document.getElementById('endDate').value;
  }
  currentPage = 1;
  loadAllocations();
  updateActiveFilters();
});

document.getElementById('clearFilters')?.addEventListener('click', () => {
  document.getElementById('searchForm')?.reset();
  currentFilters = { search: '', timeframe: 'all', startDate: '', endDate: '' };
  currentPage = 1;
  document.getElementById('activeFilters')?.classList.add('hidden');
  document.getElementById('customDateInputs')?.classList.add('hidden');
  loadAllocations();
});

function updateActiveFilters() {
  const activeFilters = document.getElementById('activeFilters');
  const filterTags    = document.getElementById('filterTags');
  if (!filterTags) return;
  filterTags.innerHTML = '';
  let hasFilters = false;

  if (currentFilters.search) {
    filterTags.innerHTML += `<span class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">🔍 "${escapeHtml(currentFilters.search)}"</span>`;
    hasFilters = true;
  }
  if (currentFilters.timeframe !== 'all') {
    const labels = { today: 'Today', week: 'This Week', month: 'This Month', year: 'This Year', custom: 'Custom Range' };
    filterTags.innerHTML += `<span class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">📅 ${labels[currentFilters.timeframe]}</span>`;
    hasFilters = true;
  }
  activeFilters?.classList.toggle('hidden', !hasFilters);
}

// ── Item Row Management ───────────────────────────────────────────────
async function loadCategoriesForRow(row) {
  const select = row.querySelector('.category-select');
  try {
    const res  = await fetch('./forms/fetch_categories.php');
    const html = await res.text();
    const temp = document.createElement('div');
    temp.innerHTML = html;
    select.innerHTML = '<option value="">Select Category</option>';
    temp.querySelectorAll('li .edit-category').forEach(btn => {
      const o = document.createElement('option');
      o.value = btn.dataset.id; o.textContent = btn.dataset.name;
      select.appendChild(o);
    });
  } catch (err) { console.error(err); }
}

function attachRowEventListeners(row) {
  const categorySelect = row.querySelector('.category-select');
  const itemSelect     = row.querySelector('.item-select');
  const quantityInput  = row.querySelector('.quantity-input');
  const stockWarning   = row.querySelector('.stock-warning');
  const removeBtn      = row.querySelector('.remove-item-btn');

  categorySelect?.addEventListener('change', async () => {
    itemSelect.innerHTML = '<option value="">Select Item</option>';
    if (!categorySelect.value) return;
    try {
      const res   = await fetch(`../actions/fetch_items.php?category_id=${categorySelect.value}`);
      const items = await res.json();
      if (!items.length) { itemSelect.innerHTML = '<option value="">No items available</option>'; return; }
      items.forEach(item => {
        const o = document.createElement('option');
        o.value = item.id; o.textContent = `${item.name} (Stock: ${item.quantity})`; o.dataset.stock = item.quantity;
        itemSelect.appendChild(o);
      });
    } catch (err) { console.error(err); }
  });

  quantityInput?.addEventListener('input', async () => {
    const itemId   = itemSelect.value;
    const quantity = parseInt(quantityInput.value);
    if (!itemId || !quantity || quantity <= 0) { stockWarning?.classList.add('hidden'); return; }
    try {
      const res  = await fetch(`../actions/validate_stock.php?item_id=${itemId}&quantity=${quantity}`);
      const data = await res.json();
      if (!data.valid) {
        stockWarning.textContent = `⚠️ ${data.message} (Available: ${data.available})`;
        stockWarning.className   = 'stock-warning text-xs mt-1 text-red-600';
        quantityInput.classList.add('border-red-500');
      } else {
        stockWarning.textContent = `✓ ${data.remaining} will remain in stock`;
        stockWarning.className   = 'stock-warning text-xs mt-1 text-green-600';
        quantityInput.classList.remove('border-red-500');
      }
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
  document.getElementById('itemCount').textContent = `${count} item${count !== 1 ? 's' : ''} to allocate`;
}

function updateRemoveButtons() {
  const rows = document.querySelectorAll('.item-row');
  rows.forEach(row => row.querySelector('.remove-item-btn')?.classList.toggle('hidden', rows.length <= 1));
}

function resetModal() {
  document.querySelectorAll('.item-row:not(:first-child)').forEach(r => r.remove());
  document.getElementById('allocateForm')?.reset();
  itemRowIndex = 1;
  updateItemCount();
  updateRemoveButtons();
}

document.getElementById('addItemRowBtn')?.addEventListener('click', async () => {
  const newRow = document.createElement('div');
  newRow.className = 'item-row p-4 bg-slate-50 rounded-lg border border-slate-200 relative';
  newRow.innerHTML = `
    <button type="button" class="remove-item-btn absolute top-2 right-2 text-red-500 hover:text-red-700 font-bold text-xl" title="Remove item">&times;</button>
    <div class="grid grid-cols-3 gap-3">
      <div><label class="block text-xs font-medium text-slate-700 mb-1">Category *</label>
        <select name="items[${itemRowIndex}][category_id]" class="category-select w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm" required>
          <option value="">Select Category</option>
        </select></div>
      <div><label class="block text-xs font-medium text-slate-700 mb-1">Item *</label>
        <select name="items[${itemRowIndex}][item_id]" class="item-select w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm" required>
          <option value="">Select Item</option>
        </select></div>
      <div><label class="block text-xs font-medium text-slate-700 mb-1">Quantity *</label>
        <input type="number" name="items[${itemRowIndex}][quantity]" min="1" required class="quantity-input w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm" placeholder="0">
        <div class="stock-warning text-xs mt-1 hidden"></div></div>
    </div>`;
  document.getElementById('itemsContainer').appendChild(newRow);
  itemRowIndex++;
  await loadCategoriesForRow(newRow);
  attachRowEventListeners(newRow);
  updateItemCount();
  updateRemoveButtons();
});

// ── Allocate Form Submit ──────────────────────────────────────────────
document.getElementById('allocateForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  try {
    const res    = await fetch('/InventorySys/actions/add_allocation.php', { method: 'POST', body: new FormData(e.target) });
    const result = await res.json();
    if (result.status === 'success') {
      closeModal('allocateItemsModal');
      showToast(`✅ ${result.message}<br><span class="text-sm opacity-90">Items: ${result.items_count} | Total: ${result.total_quantity}</span>`);
      await loadAllocations();
      resetModal();
    } else { showToast(`❌ ${result.message}`, 'error'); }
  } catch (err) { console.error(err); showToast('❌ Failed to allocate items. Please try again.', 'error'); }
});

// ── Edit Allocation ───────────────────────────────────────────────────
async function editAllocation(id) {
  try {
    const res  = await fetch(`forms/fetch_single_allocation.php?id=${id}`);
    const json = await res.json();
    if (json.status !== 'success') { showToast('❌ ' + (json.message || 'Failed to fetch allocation'), 'error'); return; }

    const data = json.data;
    openModal('editAllocationModal');
    document.getElementById('edit_id').value           = data.id;
    document.getElementById('edit_department').value   = data.department || '';
    document.getElementById('edit_allocated_by').value = data.allocated_by || '';
    document.getElementById('edit_purpose').value      = data.purpose || '';
    document.getElementById('edit_remarks').value      = data.remarks || '';
    document.getElementById('edit_quantity').value     = data.quantity || '';
    await loadCategoriesForEdit(data.category_id, data.item_id);
  } catch (err) { console.error(err); showToast('❌ Failed to fetch allocation', 'error'); }
}

async function loadCategoriesForEdit(selectedCategory, selectedItem) {
  const catSel  = document.getElementById('edit_category');
  const itemSel = document.getElementById('edit_item_id');
  try {
    const res  = await fetch('./forms/fetch_categories.php');
    const html = await res.text();
    const temp = document.createElement('div');
    temp.innerHTML = html;
    catSel.innerHTML = '<option value="">Select Category</option>';
    temp.querySelectorAll('li .edit-category').forEach(btn => {
      const o = document.createElement('option'); o.value = btn.dataset.id; o.textContent = btn.dataset.name; catSel.appendChild(o);
    });
    catSel.value = selectedCategory;

    const res2  = await fetch(`../actions/fetch_items.php?category_id=${selectedCategory}`);
    const items = await res2.json();
    itemSel.innerHTML = '<option value="">Select Item</option>';
    items.forEach(item => {
      const o = document.createElement('option'); o.value = item.id; o.textContent = `${item.name} (Stock: ${item.quantity})`; itemSel.appendChild(o);
    });
    itemSel.value = selectedItem;
  } catch (err) { console.error(err); }
}

document.getElementById('edit_category')?.addEventListener('change', async function () {
  const itemSel = document.getElementById('edit_item_id');
  itemSel.innerHTML = '<option value="">Select Item</option>';
  if (!this.value) return;
  try {
    const res   = await fetch(`../actions/fetch_items.php?category_id=${this.value}`);
    const items = await res.json();
    items.forEach(item => {
      const o = document.createElement('option'); o.value = item.id; o.textContent = `${item.name} (Stock: ${item.quantity})`; itemSel.appendChild(o);
    });
  } catch (err) { console.error(err); }
});

document.getElementById('editForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  try {
    const res    = await fetch('/InventorySys/actions/edit_allocation.php', { method: 'POST', body: new FormData(e.target) });
    const result = await res.json();
    if (result.status === 'success') {
      closeModal('editAllocationModal');
      showToast('✅ Allocation updated successfully');
      await loadAllocations();
    } else { showToast(`❌ ${result.message}`, 'error'); }
  } catch (err) { console.error(err); showToast('❌ Failed to update allocation', 'error'); }
});

// ── Delete Allocation ─────────────────────────────────────────────────
function deleteAllocation(id) {
  if (!confirm('Are you sure you want to delete this allocation? The stock will be restored.')) return;
  const fd = new FormData(); fd.append('id', id);
  fetch('/InventorySys/actions/delete_allocation.php', { method: 'POST', body: fd })
    .then(r => r.json())
    .then(data => {
      if (data.status === 'success') { showToast(`✅ ${data.message}`); loadAllocations(); }
      else { showToast(`❌ ${data.message}`, 'error'); }
    })
    .catch(err => { console.error(err); showToast('❌ Failed to delete allocation', 'error'); });
}

// ── Return Allocation ─────────────────────────────────────────────────
async function returnAllocation(id) {
  try {
    const res    = await fetch(`forms/get_allocation.php?id=${id}`);
    const result = await res.json();
    if (result.success) {
      const data = result.data;
      document.getElementById('return_id').value           = data.id;
      document.getElementById('return_item_name').textContent = data.item_name;
      document.getElementById('return_allocated_qty').textContent = data.quantity;
      document.getElementById('return_quantity').value     = data.quantity;
      document.getElementById('return_quantity').max       = data.quantity;
      openModal('returnModal');
    } else { showToast('❌ Failed to load allocation data', 'error'); }
  } catch (err) { console.error(err); showToast('❌ Failed to load allocation', 'error'); }
}

document.getElementById('returnForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  try {
    const res    = await fetch('/InventorySys/actions/return_allocation.php', { method: 'POST', body: new FormData(e.target) });
    const result = await res.json();
    if (result.status === 'success') {
      closeModal('returnModal');
      showToast(`✅ ${result.message}`);
      await loadAllocations();
    } else { showToast(`❌ ${result.message}`, 'error'); }
  } catch (err) { console.error(err); showToast('❌ Failed to process return', 'error'); }
});

// ── Global exports ────────────────────────────────────────────────────
window.editAllocation   = editAllocation;
window.deleteAllocation = deleteAllocation;
window.returnAllocation = returnAllocation;

// ── Init ──────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  attachRowEventListeners(document.querySelector('.item-row'));
  loadAllocations();
});
</script>

<?php include '../includes/footer.php'; ?>