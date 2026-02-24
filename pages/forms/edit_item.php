<?php
include '../../includes/db.php';

// ✅ Get item ID
$id = $_GET['id'] ?? null;
if (!$id) {
    echo "<div class='text-center mt-10 text-red-600 font-semibold'>Invalid Item ID.</div>";
    exit;
}

// ✅ Fetch item
$stmt = $conn->prepare("SELECT * FROM items WHERE id = :id");
$stmt->execute([':id' => $id]);
$item = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$item) {
    echo "<div class='text-center mt-10 text-red-600 font-semibold'>Item not found.</div>";
    exit;
}

// ✅ Fetch categories & suppliers
$categories = $conn->query("SELECT id, name FROM categories ORDER BY name")->fetchAll(PDO::FETCH_ASSOC);
$suppliers = $conn->query("SELECT id, name FROM suppliers ORDER BY name")->fetchAll(PDO::FETCH_ASSOC);
?>

<link href="/InventorySys/front/css/output.css" rel="stylesheet">

<div class="space-y-5">
    <h2 class="text-2xl font-bold mb-6 text-center text-blue-600">✏️ Edit Item</h2>

    <form id="editItemForm" method="POST" class="space-y-5">
        <input type="hidden" name="item_id" value="<?= htmlspecialchars($item['id']) ?>">
        <!-- Item Name -->
        <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
            <input type="text" name="name" value="<?= htmlspecialchars($item['name']) ?>" required
                   class="w-full border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 p-2">
        </div>

        <!-- Category -->
        <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select name="category_id" id="editCategory" required
                    class="w-full border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 p-2">
                <option value="">-- Select Category --</option>
                <?php foreach ($categories as $cat): ?>
                    <option value="<?= $cat['id'] ?>" <?= $cat['id'] == $item['category_id'] ? 'selected' : '' ?>>
                        <?= htmlspecialchars($cat['name']) ?>
                    </option>
                <?php endforeach; ?>
            </select>
        </div>

        <!-- Classification -->
        <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Classification</label>
            <input type="hidden" id="currentClassificationId" value="<?= htmlspecialchars($item['classification_id'] ?? '') ?>">
            <select name="classification_id" id="editClassification"
                    class="w-full border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 p-2">
                <option value="">-- Select Classification --</option>
            </select>
        </div>

        <!-- Supplier -->
        <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
            <select name="supplier_id" required
                    class="w-full border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 p-2">
                <option value="">-- Select Supplier --</option>
                <?php foreach ($suppliers as $sup): ?>
                    <option value="<?= $sup['id'] ?>" <?= $sup['id'] == $item['supplier_id'] ? 'selected' : '' ?>>
                        <?= htmlspecialchars($sup['name']) ?>
                    </option>
                <?php endforeach; ?>
            </select>
        </div>

        <!-- Quantity + Unit Price -->
        <div class="grid grid-cols-2 gap-4">
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                <input type="number" name="quantity" value="<?= htmlspecialchars($item['quantity']) ?>" required min="0"
                       class="w-full border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 p-2">
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Unit Price (₱)</label>
                <input type="number" step="0.01" name="unit_price" value="<?= htmlspecialchars($item['unit_price']) ?>" required
                       class="w-full border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 p-2">
            </div>
        </div>

        <!-- Save Button -->
        <div class="flex justify-end mt-6">
            <button type="submit"
                    class="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition">
                Save Changes
            </button>
        </div>
    </form>
</div>
