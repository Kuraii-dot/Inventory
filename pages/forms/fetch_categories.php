<?php
include('../../includes/db.php');

// Fetch all categories
$stmt = $conn->query("SELECT * FROM categories ORDER BY id DESC");
$categories = $stmt->fetchAll(PDO::FETCH_ASSOC);
?>

<?php if (count($categories) > 0): ?>
  <ul class="divide-y divide-gray-200">
    <?php foreach ($categories as $category): ?>
      <li class="flex justify-between items-center py-2 px-4 hover:bg-gray-50">
        <span class="text-gray-800 font-medium">
          <?= htmlspecialchars($category['name']) ?>
        </span>
        <div class="flex gap-2">
          <button 
            class="text-blue-600 hover:text-blue-800 edit-category"
            data-id="<?= $category['id'] ?>"
            data-name="<?= htmlspecialchars($category['name']) ?>"
          >
            Edit
          </button>
          <button 
            class="text-red-600 hover:text-red-800 delete-category"
            data-id="<?= $category['id'] ?>"
          >
            Delete
          </button>
        </div>
      </li>
    <?php endforeach; ?>
  </ul>
<?php else: ?>
  <p class="text-gray-500 text-center py-4">No categories found.</p>
<?php endif; ?>
