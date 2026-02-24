// front/js/items.js

document.addEventListener("DOMContentLoaded", () => {
  // ========================
  // 🪄 UTILITY: FADE EFFECTS
  // ========================
  const fadeOut = (el, callback) => {
    el.style.transition = "opacity 0.3s ease, transform 0.3s ease";
    el.style.opacity = "0";
    el.style.transform = "translateY(-8px)";
    setTimeout(() => {
      el.remove();
      if (callback) callback();
    }, 300);
  };

  const fadeIn = (el) => {
    el.style.opacity = "0";
    el.style.transform = "translateY(8px)";
    requestAnimationFrame(() => {
      el.style.transition = "opacity 0.4s ease, transform 0.4s ease";
      el.style.opacity = "1";
      el.style.transform = "translateY(0)";
    });
  };

  const animateTableRefresh = () => {
    const rows = document.querySelectorAll("tbody tr");
    rows.forEach((row, i) => {
      row.style.opacity = "0";
      row.style.transform = "translateY(8px)";
      setTimeout(() => fadeIn(row), i * 60);
    });
  };

  // Initial fade-in animation for all rows
  animateTableRefresh();

  // ========================
  // 🗑 DELETE ITEM HANDLER
  // ========================
  document.querySelectorAll("[data-action='delete']").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      const row = btn.closest("tr");

      if (confirm("Are you sure you want to delete this item?")) {
        try {
          const res = await fetch(`../actions/delete_items.php?id=${id}`, { method: "GET" });
          const data = await res.json();
          if (data.success) {
            showToast("🗑️ Item deleted successfully!", "success");
            fadeOut(row);
          } else {
            showToast(data.message || "Failed to delete item.", "error");
          }
        } catch (error) {
          console.error(error);
          showToast("⚠️ Error deleting item.", "error");
        }
      }
    });
  });

  // ========================
  // ✏️ EDIT ITEM HANDLER
  // ========================
  document.querySelectorAll("[data-action='edit']").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      const modal = document.getElementById("editItemModal");
      const modalContent = document.getElementById("editItemContent");

      modal.classList.remove("hidden");
      modal.classList.add("flex");
      modalContent.innerHTML = `<div class='text-center py-10 text-gray-500 animate-pulse'>Loading...</div>`;

      try {
        const response = await fetch(`forms/edit_item.php?id=${id}`);
        const html = await response.text();
        modalContent.innerHTML = html;

        const editForm = document.getElementById("editItemForm");
        if (editForm) {
          editForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const formData = new FormData(editForm);

            try {
              const response = await fetch("../actions/edit_item.php", {
                method: "POST",
                body: formData,
              });
              const result = await response.json();

              if (result.success) {
                showToast("✅ Item updated successfully!", "success");
                modal.classList.add("hidden");

                // Animate refresh without instant reload
                const tbody = document.querySelector("tbody");
                tbody.style.opacity = "0";
                setTimeout(() => {
                  location.reload(); // Still reload, but after fade
                }, 500);
              } else {
                showToast(result.message || "Failed to update item.", "error");
              }
            } catch (error) {
              console.error("Error updating item:", error);
              showToast("⚠️ Something went wrong while updating the item.", "error");
            }
          });
        }
      } catch (error) {
        console.error(error);
        modalContent.innerHTML = `<div class='text-center text-red-600 py-10'>Error loading form.</div>`;
      }
    });
  });

  // ========================
  // 🔍 SEARCH FILTER (Smooth Transition)
  // ========================
  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.addEventListener("input", async (e) => {
      const query = e.target.value.trim();
      const tbody = document.querySelector("tbody");

      tbody.querySelectorAll("tr").forEach((row) => fadeOut(row));

      try {
        const res = await fetch(`../../actions/search_items.php?q=${encodeURIComponent(query)}`);
        const data = await res.text();
        tbody.innerHTML = data;
        animateTableRefresh();
      } catch (error) {
        console.error("Search error:", error);
      }
    });
  }

  // ========================
  // ❌ CLOSE MODAL HANDLER
  // ========================
  const modal = document.getElementById("editItemModal");
  const closeModalBtn = document.getElementById("closeEditModal");

  closeModalBtn?.addEventListener("click", () => modal.classList.add("hidden"));
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.classList.add("hidden");
  });
});

  // ========================
  // ung pang populate ng classifications sa search bar to
  // ========================
document.addEventListener("DOMContentLoaded", () => {
  const categoryFilter = document.getElementById('categoryFilter');
  const classificationFilter = document.getElementById('classificationFilter');

  if (categoryFilter && classificationFilter) {
    categoryFilter.addEventListener('change', async () => {
      const categoryId = categoryFilter.value;

      // Reset classification dropdown
      classificationFilter.innerHTML = '<option value="">All Classifications</option>';

      if (!categoryId) return; // no category selected

      try {
        const res = await fetch(`../../pages/forms/get_classification.php?category_id=${categoryId}`);
        const data = await res.json();

        data.forEach(cls => {
          const option = document.createElement('option');
          option.value = cls.id;
          option.textContent = cls.classification_name;
          classificationFilter.appendChild(option);
        });
      } catch (err) {
        console.error("Failed to fetch classifications:", err);
      }
    });
  }
});

