<?php
require_once '../includes/auth.php';
requireRole('admin');

require_once '../includes/db.php';
require_once '../includes/header.php';



// Handle form submission
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  $name = $_POST['name'];
  $category_id = $_POST['category_id'];
  $quantity = $_POST['quantity'];
  $unit_price = $_POST['unit_price'];
  $supplier_id = $_POST['supplier_id'];

  try {
    $stmt = $conn->prepare("INSERT INTO items (name, category_id, quantity, unit_price, supplier_id)
                            VALUES (:name, :category_id, :quantity, :unit_price, :supplier_id)");
    $stmt->execute([
      ':name' => $name,
      ':category_id' => $category_id,
      ':quantity' => $quantity,
      ':unit_price' => $unit_price,
      ':supplier_id' => $supplier_id
    ]);
    echo "<div class='bg-green-100 text-green-700 p-4 rounded mb-4'>✅ Item added successfully!</div>";
  } catch (PDOException $e) {
    echo "<div class='bg-red-100 text-red-700 p-4 rounded mb-4'>❌ Error: " . $e->getMessage() . "</div>";
  }
}

// Fetch categories and suppliers for dropdowns
$categories = $conn->query("SELECT id, name FROM categories ORDER BY name")->fetchAll(PDO::FETCH_ASSOC);
$suppliers = $conn->query("SELECT id, name FROM suppliers ORDER BY name")->fetchAll(PDO::FETCH_ASSOC);
?>

<link href="../front/css/output.css" rel="stylesheet">

<div class="max-w-2xl mx-auto mt-10 bg-white p-8 rounded-2xl shadow">
  <h2 class="text-2xl font-bold mb-6 text-center text-blue-600">Add New Item</h2>

  <form method="POST" class="space-y-5">
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
      <input type="text" name="name" required class="w-full border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 p-2">
    </div>

    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">Category</label>
      <select name="category_id" required class="w-full border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 p-2">
        <option value="">-- Select Category --</option>
        <?php foreach ($categories as $cat): ?>
          <option value="<?= $cat['id'] ?>"><?= htmlspecialchars($cat['name']) ?></option>
        <?php endforeach; ?>
      </select>
    </div>

    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
      <select name="supplier_id" required class="w-full border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 p-2">
        <option value="">-- Select Supplier --</option>
        <?php foreach ($suppliers as $sup): ?>
          <option value="<?= $sup['id'] ?>"><?= htmlspecialchars($sup['name']) ?></option>
        <?php endforeach; ?>
      </select>
    </div>

    <div class="grid grid-cols-2 gap-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
        <input type="number" name="quantity" required min="0" class="w-full border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 p-2">
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Unit Price (₱)</label>
        <input type="number" step="0.01" name="unit_price" required class="w-full border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 p-2">
      </div>
    </div>

    <div class="flex justify-between items-center mt-6">
      <a href="items.php" class="text-gray-600 hover:underline">← Back to Items</a>
      <button type="submit" class="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition">Save Item</button>
    </div>
  </form>
</div>

<?php include '../includes/footer.php'; ?>
