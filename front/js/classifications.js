console.log('🔥 classifications.js loaded');
document.addEventListener('DOMContentLoaded', () => {

    // ===============================
    // MODAL CONTROLS
    // ===============================
    const openBtn  = document.getElementById('openClassificationModalBtn');
    const closeBtn = document.getElementById('closeClassificationModal');
    const modal    = document.getElementById('addClassificationModal');

    function openModal() {
        modal.classList.remove('opacity-0', 'pointer-events-none');
        modal.classList.add('opacity-100');
        document.body.classList.add('modal-open');
        loadClassifications();
    }

    function closeModal() {
        modal.classList.add('opacity-0', 'pointer-events-none');
        modal.classList.remove('opacity-100');
        document.body.classList.remove('modal-open');
    }

    if (openBtn && modal) openBtn.addEventListener('click', openModal);
    if (closeBtn && modal) closeBtn.addEventListener('click', closeModal);

    modal?.addEventListener('click', e => {
        if (e.target === modal) closeModal();
    });

    // ===============================
    // ADD CLASSIFICATION
    // ===============================
    const form = document.getElementById('addClassificationForm');

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const formData = new FormData(form);

            const res = await fetch('/InventorySys/actions/add_classification.php', {
                method: 'POST',
                body: formData
            });

            const data = await res.json();

            if (data.status === 'success') {
                form.reset();
                loadClassifications();
            } else {
                alert(data.message);
            }
        });
    }

    // ===============================
    // LOAD CLASSIFICATIONS LIST
    // ===============================
    async function loadClassifications() {
        const list = document.getElementById('classificationList');
        if (!list) return;

        const res = await fetch('/InventorySys/actions/get_classification.php');
        const data = await res.json();

        list.innerHTML = '';

        if (!data.length) {
            list.innerHTML = `<li class="text-slate-400 text-sm">No classifications yet.</li>`;
            return;
        }

        data.forEach(c => {
            const li = document.createElement('li');
            li.className = 'flex justify-between items-center px-4 py-2 bg-white rounded-lg border';
            li.innerHTML = `
                <span class="font-medium text-slate-700">${c.classification_name}</span>
                <span class="text-xs text-slate-400">${c.category_id}</span>
            `;
            list.appendChild(li);
        });
    }

    // ===============================
    // ASSIGN CLASSIFICATION TO ITEM
    // ===============================
    document.addEventListener('change', async (e) => {
        if (!e.target.classList.contains('classification-select')) return;

        const formData = new FormData();
        formData.append('item_id', e.target.dataset.itemId);
        formData.append('classification_id', e.target.value);

        const res = await fetch('/InventorySys/actions/assign_classification.php', {
            method: 'POST',
            body: formData
        });

        const data = await res.json();

        if (data.status !== 'success') {
            alert(data.message);
        }
    });

});


    // ===============================
    // Para sa Add Item to WAG PAPALITAN/GAGALAWIN
    // ===============================
const categorySelect = document.querySelector('#addItemForm select[name="category_id"]');
const classificationSelect = document.getElementById('classificationSelect');

categorySelect.addEventListener('change', async () => {
    const categoryId = categorySelect.value;

    // Clear previous options
    classificationSelect.innerHTML = '<option value="">Select Classification</option>';

    if (!categoryId) {
        classificationSelect.disabled = true;
        return;
    }

    classificationSelect.disabled = false;

    try {
        const res = await fetch(`../actions/get_classification.php?category_id=${categoryId}`);
        const data = await res.json();

        if (!data.length) {
            classificationSelect.innerHTML = '<option value="">No classifications found</option>';
            return;
        }

        data.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.textContent = c.classification_name;
            classificationSelect.appendChild(opt);
        });

    } catch (err) {
        console.error(err);
        classificationSelect.innerHTML = '<option value="">Error loading classifications</option>';
    }
});



    // ===============================
    // Para sa SEARCH FUNCTION
    // ===============================

document.addEventListener("DOMContentLoaded", () => {
  const categoryFilter = document.getElementById('categoryFilter');
  const classificationFilter = document.getElementById('classificationFilter');

  if (categoryFilter && classificationFilter) {
    categoryFilter.addEventListener('change', async () => {
      const categoryId = categoryFilter.value;

      // Reset classification dropdown
      classificationFilter.innerHTML = ''; // remove all options
      const defaultOption = document.createElement('option');
      defaultOption.value = '';
      defaultOption.textContent = 'All Classifications';
      classificationFilter.appendChild(defaultOption);

      if (!categoryId) return; // no category selected

      try {
        const res = await fetch(`../../pages/forms/search_classification.php?category_id=${categoryId}`);
        const data = await res.json();

        if (data.length === 0) {
          // optional: show "No classifications found"
          const option = document.createElement('option');
          option.value = '';
          option.textContent = 'No classifications available';
          classificationFilter.appendChild(option);
        } else {
          data.forEach(cls => {
            const option = document.createElement('option');
            option.value = cls.id;
            option.textContent = cls.classification_name;
            classificationFilter.appendChild(option);
          });
        }
      } catch (err) {
        console.error("Failed to fetch classifications:", err);
      }
    });
  }
});




