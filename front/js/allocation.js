// ---------- FETCH & RENDER TABLE ----------
async function fetchAllocations(params = {}) {
    try {
        // Build query string
        const query = new URLSearchParams(params).toString();
        const res = await fetch('forms/fetch_allocations.php?'+query);
        const data = await res.json();

        if (data.status !== 'success') throw new Error('Failed to fetch allocations');

        renderTable(data.data);
        setupPagination(data.page, data.total_pages);
    } catch (err) {
        console.error('Error:', err);
        showToast('❌ Failed to load allocations', 'error');
    }
}

function renderTable(rows) {
    const tbody = document.querySelector('#allocationsTable tbody');
    tbody.innerHTML = ''; // clear previous rows

    if (!rows.length) {
        tbody.innerHTML = `
        <tr>
            <td colspan="8" class="text-center py-12">
                📭 No allocations found
            </td>
        </tr>`;
        return;
    }

    rows.forEach(row => {
        const tr = document.createElement('tr');
        tr.classList.add('hover:bg-purple-50');
        tr.dataset.id = row.id;

        tr.innerHTML = `
            <td class="py-4 px-6 text-sm text-slate-700">${new Date(row.created_at).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })}</td>
            <td class="py-4 px-6">
                <div class="text-sm font-medium text-slate-900">${row.item_name}</div>
                ${row.stockWarning}
            </td>
            <td class="py-4 px-6 text-sm">${row.category_name}</td>
            <td class="py-4 px-6 font-semibold text-purple-600">${row.quantity}</td>
            <td class="py-4 px-6 text-sm">${row.department}</td>
            <td class="py-4 px-6 text-sm">${row.allocated_by}</td>
            <td class="py-4 px-6 text-sm">${row.purpose.length > 50 ? row.purpose.substring(0,50)+'...' : row.purpose}</td>
            <td class="py-4 px-6">
                <div class="flex gap-2 mt-2">
                    ${row.statusBadge}
                    <button onclick="editAllocation(${row.id})" class="text-blue-500 hover:text-blue-700 text-xs font-medium">✏️ Edit</button>
                    <button onclick="deleteAllocation(${row.id})" class="text-red-500 hover:text-red-700 text-xs font-medium">🗑️ Delete</button>
                    ${row.status === 'active' ? `<button onclick="returnAllocation(${row.id})" class="text-green-500 hover:text-green-700 text-xs font-medium">↩️ Return</button>` : ''}
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// ---------- EDIT FUNCTION ----------
async function editAllocation(id) {
    try {
        const res = await fetch(`pages/forms/fetch_single_allocation.php?id=${id}`);
        const data = await res.json();

        if (data.status !== 'success') throw new Error('Failed to fetch allocation');

        const allocation = data.data;

        // fill modal fields
        document.querySelector('#editAllocationModal [name="id"]').value = allocation.id;
        document.querySelector('#editAllocationModal [name="item_id"]').value = allocation.item_id;
        document.querySelector('#editAllocationModal [name="quantity"]').value = allocation.quantity;
        document.querySelector('#editAllocationModal [name="department"]').value = allocation.department;
        document.querySelector('#editAllocationModal [name="allocated_by"]').value = allocation.allocated_by;
        document.querySelector('#editAllocationModal [name="purpose"]').value = allocation.purpose;
        document.querySelector('#editAllocationModal [name="remarks"]').value = allocation.remarks;

        // show modal (use your modal function)
        showModal('editAllocationModal');

    } catch (err) {
        console.error('Error:', err);
        showToast('❌ Failed to load allocation', 'error');
    }
}

// ---------- INITIAL LOAD ----------
document.addEventListener('DOMContentLoaded', () => {
    fetchAllocations({ page: 1, limit: 50 });
});
