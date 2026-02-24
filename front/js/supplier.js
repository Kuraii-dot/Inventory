document.addEventListener("DOMContentLoaded", () => {
  const supplierModal = document.getElementById('addSupplierModal');
  const openSupplierBtn = document.getElementById('openSupplierModalBtn');
  const closeSupplierBtn = document.getElementById('closeSupplierModal');
  const supplierForm = document.getElementById('addSupplierForm');
  const supplierTableContainer = document.querySelector('#supplierTableContainer');

  // ✅ Modal controls
  function openModal(target) {
    target.classList.remove('opacity-0', 'pointer-events-none');
    target.classList.add('opacity-100');
    document.body.classList.add('overflow-hidden');
  }

  function closeModal(target) {
    target.classList.add('opacity-0', 'pointer-events-none');
    target.classList.remove('opacity-100');
    document.body.classList.remove('overflow-hidden');
  }

  if (openSupplierBtn && supplierModal && closeSupplierBtn) {
    openSupplierBtn.addEventListener('click', () => openModal(supplierModal));
    closeSupplierBtn.addEventListener('click', () => closeModal(supplierModal));
    supplierModal.addEventListener('click', e => { if (e.target === supplierModal) closeModal(supplierModal); });
  }

  // ✅ Add Supplier via AJAX
  if (supplierForm) {
    supplierForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(supplierForm);
      formData.append('add_supplier', '1');

      try {
        const response = await fetch('../pages/forms/supplier_form.php', { method: 'POST', body: formData });
        const text = await response.text();

        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');
        const newTable = doc.querySelector('#supplierTableContainer table');
        const alertBox = doc.querySelector('.bg-green-100, .bg-red-100');

        if (newTable && supplierTableContainer)
          supplierTableContainer.innerHTML = newTable.outerHTML;

        if (alertBox) {
          const oldAlert = document.querySelector('.bg-green-100, .bg-red-100');
          if (oldAlert) oldAlert.remove();
          document.querySelector('.max-w-7xl').insertAdjacentElement('afterbegin', alertBox);
        }

        supplierForm.reset();
        closeModal(supplierModal);
        attachSupplierEventHandlers();
      } catch (error) {
        alert('❌ Error adding supplier: ' + error.message);
      }
    });
  }

  // ✅ Delete Supplier
  async function deleteSupplier(id) {
    if (!confirm('Are you sure you want to delete this supplier?')) return;

    try {
      const response = await fetch(`../actions/delete_supplier.php?id=${id}`);
      const data = await response.json();

      alert(data.message);

      if (data.success) {
        const tableResponse = await fetch('../pages/forms/supplier_form.php');
        const html = await tableResponse.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const newTable = doc.querySelector('#supplierTableContainer table');
        if (newTable && supplierTableContainer)
          supplierTableContainer.innerHTML = newTable.outerHTML;

        attachSupplierEventHandlers();
      }
    } catch (error) {
      alert('❌ Error deleting supplier: ' + error.message);
    }
  }

  // ✅ Rebind delete button events
  function attachSupplierEventHandlers() {
    document.querySelectorAll('[data-action="delete-supplier"]').forEach(btn => {
      btn.onclick = () => deleteSupplier(btn.dataset.id);
    });
  }

  attachSupplierEventHandlers();
});
