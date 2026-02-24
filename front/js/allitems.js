// Search Functionality
document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('searchInput');
  const tableBody = document.getElementById('itemsTableBody');
  const itemCount = document.getElementById('itemCount');
  const rows = tableBody.querySelectorAll('tr[data-search]');
  const totalItems = rows.length;

  searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase().trim();
    let visibleCount = 0;

    rows.forEach(row => {
      const searchData = row.getAttribute('data-search');
      if (searchData.includes(searchTerm)) {
        row.style.display = '';
        visibleCount++;
      } else {
        row.style.display = 'none';
      }
    });

    itemCount.textContent = visibleCount;
    itemCount.classList.remove('text-blue-600', 'text-amber-600');
    itemCount.classList.add(visibleCount === totalItems ? 'text-blue-600' : 'text-amber-600');
  });
});

// Item Report Modal
document.addEventListener('DOMContentLoaded', () => {
  const reportModal = document.getElementById('reportModal');
  const modalContent = reportModal.querySelector('.modal-content');
  const openBtn = document.getElementById('generateReportBtn');
  const closeBtn = document.getElementById('closeReportModal');

  openBtn.addEventListener('click', () => {
    reportModal.classList.remove('opacity-0', 'pointer-events-none');
    modalContent.classList.remove('scale-95');
  });

  closeBtn.addEventListener('click', () => {
    reportModal.classList.add('opacity-0', 'pointer-events-none');
    modalContent.classList.add('scale-95');
  });

  reportModal.addEventListener('click', (e) => {
    if (e.target === reportModal) {
      reportModal.classList.add('opacity-0', 'pointer-events-none');
      modalContent.classList.add('scale-95');
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !reportModal.classList.contains('opacity-0')) {
      reportModal.classList.add('opacity-0', 'pointer-events-none');
      modalContent.classList.add('scale-95');
    }
  });
});

// Custom date range for Item Report
document.addEventListener('DOMContentLoaded', () => {
  const timeframeSelect = document.getElementById('timeframeSelect');
  const customRangeDiv = document.getElementById('customRange');
  const fromInput = customRangeDiv.querySelector('input[name="from"]');
  const toInput = customRangeDiv.querySelector('input[name="to"]');

  timeframeSelect.addEventListener('change', () => {
    if (timeframeSelect.value === 'custom') {
      customRangeDiv.style.display = 'grid';
      const today = new Date().toISOString().split('T')[0];
      if (!fromInput.value) fromInput.value = today;
      if (!toInput.value) toInput.value = today;
      fromInput.required = true;
      toInput.required = true;
    } else {
      customRangeDiv.style.display = 'none';
      fromInput.required = false;
      toInput.required = false;
    }
  });
});

// Category and Item selection for Item Report
document.addEventListener('DOMContentLoaded', () => {
  const categorySelect = document.getElementById('categorySelect');
  const itemSelect = document.getElementById('itemSelect');

  categorySelect.addEventListener('change', async () => {
    const categoryId = categorySelect.value;
    itemSelect.innerHTML = '<option value="all">All Items</option>';
    itemSelect.disabled = true;
    itemSelect.classList.add('bg-slate-100');

    if (categoryId === 'all') return;

    itemSelect.innerHTML = '<option>Loading items...</option>';

    try {
      const res = await fetch('forms/fetch_items_by_category.php?category_id=' + categoryId);
      const items = await res.json();

      itemSelect.innerHTML = '<option value="all">All Items</option>';

      if (items.length === 0) {
        itemSelect.innerHTML = '<option>No items found</option>';
        return;
      }

      items.forEach(item => {
        const opt = document.createElement('option');
        opt.value = item.id;
        opt.textContent = item.name;
        itemSelect.appendChild(opt);
      });

      itemSelect.disabled = false;
      itemSelect.classList.remove('bg-slate-100');

    } catch (err) {
      itemSelect.innerHTML = '<option>Error loading items</option>';
    }
  });
});

// Department Report Modal
document.addEventListener('DOMContentLoaded', () => {
  const deptBtn = document.getElementById('generateDepartmentBtn');
  const deptModal = document.getElementById('departmentModal');
  const closeDept = document.getElementById('closeDeptModal');
  const deptTimeframe = document.getElementById('deptTimeframeSelect');
  const deptCustom = document.getElementById('deptCustomRange');

  deptBtn.addEventListener('click', (e) => {
    e.preventDefault();
    deptModal.classList.remove('opacity-0', 'pointer-events-none');
    deptModal.querySelector('.modal-content').classList.remove('scale-95');
  });

  closeDept.addEventListener('click', () => {
    deptModal.classList.add('opacity-0', 'pointer-events-none');
    deptModal.querySelector('.modal-content').classList.add('scale-95');
  });

  deptModal.addEventListener('click', (e) => {
    if (e.target === deptModal) {
      deptModal.classList.add('opacity-0', 'pointer-events-none');
      deptModal.querySelector('.modal-content').classList.add('scale-95');
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !deptModal.classList.contains('opacity-0')) {
      deptModal.classList.add('opacity-0', 'pointer-events-none');
      deptModal.querySelector('.modal-content').classList.add('scale-95');
    }
  });

  deptTimeframe.addEventListener('change', () => {
    if (deptTimeframe.value === 'custom') {
      deptCustom.classList.remove('hidden');
      const today = new Date().toISOString().split('T')[0];
      const fromInput = deptCustom.querySelector('input[name="from"]');
      const toInput = deptCustom.querySelector('input[name="to"]');
      if (!fromInput.value) fromInput.value = today;
      if (!toInput.value) toInput.value = today;
      fromInput.required = true;
      toInput.required = true;
    } else {
      deptCustom.classList.add('hidden');
      const fromInput = deptCustom.querySelector('input[name="from"]');
      const toInput = deptCustom.querySelector('input[name="to"]');
      fromInput.required = false;
      toInput.required = false;
    }
  });
});

// Item Ledger Modal
document.addEventListener('DOMContentLoaded', function() {
  const ledgerBtn = document.getElementById('generateLedgerBtn');
  const ledgerModal = document.getElementById('ledgerModal');
  const closeLedgerBtn = document.getElementById('closeLedgerModal');
  const modalContent = ledgerModal.querySelector('.modal-content');
  
  const categorySelect = document.getElementById('ledgerCategorySelect');
  const classificationSelect = document.getElementById('ledgerClassificationSelect');
  const itemSelect = document.getElementById('ledgerItemSelect');
  const findBtn = document.getElementById('findLedgerBtn');
  const ledgerResults = document.getElementById('ledgerResults');

  let currentItemId = null;

  // Open modal
  ledgerBtn.addEventListener('click', () => {
    ledgerModal.classList.remove('opacity-0', 'pointer-events-none');
    modalContent.classList.remove('scale-95');
  });

  // Close modal
  closeLedgerBtn.addEventListener('click', () => {
    ledgerModal.classList.add('opacity-0', 'pointer-events-none');
    modalContent.classList.add('scale-95');
    resetModal();
  });

  // Click outside to close
  ledgerModal.addEventListener('click', (e) => {
    if (e.target === ledgerModal) {
      ledgerModal.classList.add('opacity-0', 'pointer-events-none');
      modalContent.classList.add('scale-95');
      resetModal();
    }
  });

  // ESC key to close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !ledgerModal.classList.contains('opacity-0')) {
      ledgerModal.classList.add('opacity-0', 'pointer-events-none');
      modalContent.classList.add('scale-95');
      resetModal();
    }
  });

  // Category change - fetch classifications
  categorySelect.addEventListener('change', async function() {
    const categoryId = this.value;
    
    // Reset downstream selects
    classificationSelect.innerHTML = '<option value="">Select Classification</option>';
    classificationSelect.disabled = true;
    classificationSelect.classList.add('bg-slate-100');
    itemSelect.innerHTML = '<option value="">Select Item</option>';
    itemSelect.disabled = true;
    itemSelect.classList.add('bg-slate-100');
    findBtn.disabled = true;
    ledgerResults.classList.add('hidden');

    if (!categoryId) return;

    try {
      classificationSelect.innerHTML = '<option value="">Loading...</option>';
      
      const response = await fetch(`forms/fetch_classifications_by_category.php?category_id=${categoryId}`);
      const classifications = await response.json();

      classificationSelect.innerHTML = '<option value="">Select Classification</option>';
      
      if (classifications.length > 0) {
        classifications.forEach(cls => {
          const option = document.createElement('option');
          option.value = cls.id;
          option.textContent = cls.name;
          classificationSelect.appendChild(option);
        });
        
        classificationSelect.disabled = false;
        classificationSelect.classList.remove('bg-slate-100');
      } else {
        classificationSelect.innerHTML = '<option value="">No classifications found</option>';
      }
    } catch (error) {
      console.error('Error fetching classifications:', error);
      classificationSelect.innerHTML = '<option value="">Error loading classifications</option>';
    }
  });

  // Classification change - fetch items
  classificationSelect.addEventListener('change', async function() {
    const classificationId = this.value;
    
    // Reset item select
    itemSelect.innerHTML = '<option value="">Select Item</option>';
    itemSelect.disabled = true;
    itemSelect.classList.add('bg-slate-100');
    findBtn.disabled = true;
    ledgerResults.classList.add('hidden');

    if (!classificationId) return;

    try {
      itemSelect.innerHTML = '<option value="">Loading...</option>';
      
      const response = await fetch(`forms/fetch_items_by_classification.php?classification_id=${classificationId}`);
      const items = await response.json();

      itemSelect.innerHTML = '<option value="">Select Item</option>';
      
      if (items.length > 0) {
        items.forEach(item => {
          const option = document.createElement('option');
          option.value = item.id;
          option.textContent = item.name;
          itemSelect.appendChild(option);
        });
        
        itemSelect.disabled = false;
        itemSelect.classList.remove('bg-slate-100');
      } else {
        itemSelect.innerHTML = '<option value="">No items found</option>';
      }
    } catch (error) {
      console.error('Error fetching items:', error);
      itemSelect.innerHTML = '<option value="">Error loading items</option>';
    }
  });

  // Item change - enable find button
  itemSelect.addEventListener('change', function() {
    findBtn.disabled = !this.value;
    ledgerResults.classList.add('hidden');
  });

  // Find button - fetch and display ledger
  findBtn.addEventListener('click', async function() {
    const itemId = itemSelect.value;
    if (!itemId) return;

    currentItemId = itemId;
    findBtn.disabled = true;
    findBtn.innerHTML = '<span class="flex items-center gap-2"><span>⏳</span><span>Loading...</span></span>';

    try {
      const response = await fetch(`forms/fetch_item_ledger.php?item_id=${itemId}`);
      const data = await response.json();

      if (data.success) {
        displayLedger(data);
        ledgerResults.classList.remove('hidden');
      } else {
        alert('Error: ' + (data.error || 'Failed to fetch ledger'));
      }
    } catch (error) {
      console.error('Error fetching ledger:', error);
      alert('Error loading ledger data');
    } finally {
      findBtn.disabled = false;
      findBtn.innerHTML = '<span class="flex items-center gap-2"><span>🔍</span><span>Find Transactions</span></span>';
    }
  });

  // Display ledger data
  function displayLedger(data) {
    const { item, transactions, summary } = data;

    // Item Info Card
    document.getElementById('itemInfoCard').innerHTML = `
      <div class="flex items-start justify-between">
        <div>
          <h3 class="text-xl font-bold text-slate-800 mb-2">${escapeHtml(item.name)}</h3>
          <div class="flex gap-4 text-sm">
            <span class="text-slate-600"><strong>Category:</strong> ${escapeHtml(item.category)}</span>
            <span class="text-slate-600"><strong>Classification:</strong> ${escapeHtml(item.classification)}</span>
            <span class="text-slate-600"><strong>Current Stock:</strong> <span class="font-bold text-amber-600">${item.current_stock}</span> units</span>
          </div>
        </div>
        <div class="text-right">
          <p class="text-xs text-slate-500">Total Transactions</p>
          <p class="text-3xl font-bold text-sky-600">${transactions.length}</p>
        </div>
      </div>
    `;

    // Transactions Table
    const tbody = document.getElementById('ledgerTableBody');
    tbody.innerHTML = '';

    if (transactions.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="py-8 text-center text-slate-500">
            No transactions found for this item
          </td>
        </tr>
      `;
    } else {
      transactions.forEach(tx => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-sky-50/30 transition-colors border-b border-slate-100';
        
        let typeColor = 'bg-blue-100 text-blue-700';
        let quantityClass = 'text-slate-700';
        let quantityPrefix = '';
        
        if (tx.type === 'Procurement') {
          typeColor = 'bg-blue-100 text-blue-700';
          quantityClass = 'text-blue-600 font-semibold';
          quantityPrefix = '+';
        } else if (tx.type === 'Distribution' || tx.type === 'Allocation') {
          typeColor = 'bg-pink-100 text-pink-700';
          quantityClass = 'text-red-600 font-semibold';
          quantityPrefix = '-';
        } else if (tx.type === 'Return') {
          typeColor = 'bg-amber-100 text-amber-700';
          quantityClass = 'text-amber-600 font-semibold';
          quantityPrefix = '+';
        }

        row.innerHTML = `
          <td class="py-3 px-4 text-sm">${formatDate(tx.date)}</td>
          <td class="py-3 px-4">
            <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${typeColor}">
              ${tx.type}
            </span>
          </td>
          <td class="py-3 px-4 text-sm text-slate-600">${escapeHtml(tx.reference)}</td>
          <td class="py-3 px-4 text-sm ${quantityClass}">${quantityPrefix}${tx.quantity}</td>
          <td class="py-3 px-4 text-sm font-semibold text-slate-700">${tx.balance}</td>
          <td class="py-3 px-4 text-sm text-blue-600">${escapeHtml(tx.details)}</td>
        `;
        
        tbody.appendChild(row);
      });
    }

    // Summary Stats
    document.getElementById('ledgerSummary').innerHTML = `
      <div class="bg-green-50 rounded-lg p-4 border border-green-200">
        <p class="text-xs text-green-600 font-medium mb-1">Total Procured</p>
        <p class="text-2xl font-bold text-green-700">${summary.total_procured}</p>
      </div>
      <div class="bg-red-50 rounded-lg p-4 border border-red-200">
        <p class="text-xs text-red-600 font-medium mb-1">Total Distributed</p>
        <p class="text-2xl font-bold text-red-700">${summary.total_distributed}</p>
      </div>
      <div class="bg-purple-50 rounded-lg p-4 border border-purple-200">
        <p class="text-xs text-purple-600 font-medium mb-1">Total Allocated</p>
        <p class="text-2xl font-bold text-purple-700">${summary.total_allocated}</p>
      </div>
      <div class="bg-amber-50 rounded-lg p-4 border border-amber-200">
        <p class="text-xs text-amber-600 font-medium mb-1">Total Returned</p>
        <p class="text-2xl font-bold text-amber-700">${summary.total_returned}</p>
      </div>
      <div class="bg-sky-50 rounded-lg p-4 border border-sky-200">
        <p class="text-xs text-sky-600 font-medium mb-1">Current Balance</p>
        <p class="text-2xl font-bold text-sky-700">${summary.current_balance}</p>
      </div>
    `;
  }

  // Export PDF
  document.getElementById('exportPdfBtn').addEventListener('click', function() {
    if (!currentItemId) return;
    window.open(`forms/export_ledger.php?item_id=${currentItemId}&format=pdf`, '_blank');
  });

  // Export Excel
  document.getElementById('exportExcelBtn').addEventListener('click', function() {
    if (!currentItemId) return;
    window.open(`forms/export_ledger.php?item_id=${currentItemId}&format=excel`, '_blank');
  });

  // Helper functions
  function resetModal() {
    categorySelect.value = '';
    classificationSelect.innerHTML = '<option value="">Select Classification</option>';
    classificationSelect.disabled = true;
    classificationSelect.classList.add('bg-slate-100');
    itemSelect.innerHTML = '<option value="">Select Item</option>';
    itemSelect.disabled = true;
    itemSelect.classList.add('bg-slate-100');
    findBtn.disabled = true;
    ledgerResults.classList.add('hidden');
    currentItemId = null;
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
});