document.addEventListener("DOMContentLoaded", () => {
  const categoryModal = document.getElementById('addCategoryModal');
  const openCategoryBtn = document.getElementById('openCategoryModalBtn');
  const closeCategoryBtn = document.getElementById('closeCategoryModal');
  const categoryForm = document.getElementById('addCategoryForm');
  const categoryTableContainer = document.querySelector('#categoryTableContainer'); // container for refresh

  // ✅ Open / Close
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

  if (openCategoryBtn && categoryModal && closeCategoryBtn) {
    openCategoryBtn.addEventListener('click', () => openModal(categoryModal));
    closeCategoryBtn.addEventListener('click', () => closeModal(categoryModal));
    categoryModal.addEventListener('click', e => { if (e.target === categoryModal) closeModal(categoryModal); });
  }

  // ✅ Add Category via AJAX
  if (categoryForm) {
    categoryForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(categoryForm);
      formData.append('add_category', '1');

      try {
        const response = await fetch('../pages/forms/category_form.php', { method: 'POST', body: formData });
        const text = await response.text();

        // Parse updated category table
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');
        const newTable = doc.querySelector('#categoryTableContainer table');
        const alertBox = doc.querySelector('.bg-green-100, .bg-red-100');

        if (newTable && categoryTableContainer)
          categoryTableContainer.innerHTML = newTable.outerHTML;

        if (alertBox) {
          const oldAlert = document.querySelector('.bg-green-100, .bg-red-100');
          if (oldAlert) oldAlert.remove();
          document.querySelector('.max-w-7xl').insertAdjacentElement('afterbegin', alertBox);
        }

        categoryForm.reset();
        closeModal(categoryModal);
        attachCategoryEventHandlers();
      } catch (error) {
        alert('❌ Error adding category: ' + error.message);
      }
    });
  }

  // ✅ Delete Category
  async function deleteCategory(id) {
    if (!confirm('Are you sure you want to delete this category?')) return;

    try {
      const response = await fetch(`../actions/delete_category.php?id=${id}`);
      const data = await response.json();

      alert(data.message);

      if (data.success) {
        // Reload the category list dynamically
        const tableResponse = await fetch('../pages/forms/category_form.php');
        const html = await tableResponse.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const newTable = doc.querySelector('#categoryTableContainer table');
        if (newTable && categoryTableContainer)
          categoryTableContainer.innerHTML = newTable.outerHTML;

        attachCategoryEventHandlers();
      }
    } catch (error) {
      alert('❌ Error deleting category: ' + error.message);
    }
  }

  // ✅ Rebind delete button events
  function attachCategoryEventHandlers() {
    document.querySelectorAll('[data-action="delete-category"]').forEach(btn => {
      btn.onclick = () => deleteCategory(btn.dataset.id);
    });
  }

  attachCategoryEventHandlers();
});
