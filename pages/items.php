<?php
require_once '../includes/auth.php';
requireRole('admin');

require_once '../includes/db.php';
require_once '../includes/header.php';


// ung adding a new item to
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['add_item'])) {
    $name = $_POST['name'];
    $category_id = $_POST['category_id'];
    $classification_id = !empty($_POST['classification_id']) ? $_POST['classification_id'] : null;
    $supplier_id = $_POST['supplier_id'];
    $quantity = $_POST['quantity'];
    $unit_price = $_POST['unit_price'];
    $date_ordered = $_POST['date_ordered'];
    $date_procured = $_POST['date_procured'];

    try {
        $stmt = $conn->prepare("INSERT INTO items
            (name, category_id, classification_id, supplier_id, quantity, unit_price, date_ordered, date_procured)
            VALUES (:name, :category_id, :classification_id, :supplier_id, :quantity, :unit_price, :date_ordered, :date_procured)");
        
        $stmt->execute([
            ':name' => $name,
            ':category_id' => $category_id,
            ':classification_id' => $classification_id,
            ':supplier_id' => $supplier_id,
            ':quantity' => $quantity,
            ':unit_price' => $unit_price,
            ':date_ordered' => $date_ordered,
            ':date_procured' => $date_procured
        ]);

        echo "<div class='bg-green-100 text-green-700 p-4 rounded mb-4 text-center font-medium'>
                ✅ Item added successfully!
              </div>";
    } catch (PDOException $e) {
        echo "<div class='bg-red-100 text-red-700 p-4 rounded mb-4 text-center font-medium'>
                ❌ Error: " . htmlspecialchars($e->getMessage()) . "
              </div>";
    }
}


// Sa adding a new category naman to
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['add_category'])) {
    $name = $_POST['category_name'];
    try {
        $stmt = $conn->prepare("INSERT INTO categories (name) VALUES (:name)");
        $stmt->execute([':name' => $name]);
        echo "<div class='bg-green-100 text-green-700 p-4 rounded mb-4 text-center font-medium'>✅ Category added successfully!</div>";
    } catch (PDOException $e) {
        echo "<div class='bg-red-100 text-red-700 p-4 rounded mb-4 text-center font-medium'>❌ Error: " . $e->getMessage() . "</div>";
    }
}

// Add Supplier
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['add_supplier'])) {
    $name = $_POST['supplier_name'];
    try {
        $stmt = $conn->prepare("INSERT INTO suppliers (name) VALUES (:name)");
        $stmt->execute([':name' => $name]);
        echo "<div class='bg-green-100 text-green-700 p-4 rounded mb-4 text-center font-medium'>✅ Supplier added successfully!</div>";
    } catch (PDOException $e) {
        echo "<div class='bg-red-100 text-red-700 p-4 rounded mb-4 text-center font-medium'>❌ Error: " . $e->getMessage() . "</div>";
    }
}

// item deletion
if (isset($_GET['delete'])) {
    $id = $_GET['delete'];
    $stmt = $conn->prepare("DELETE FROM items WHERE id = :id");
    $stmt->execute([':id' => $id]);
    echo "<div class='bg-green-100 text-green-700 p-4 rounded mb-4 text-center font-medium'>🗑 Item deleted successfully!</div>";
}

// 🔍 Search + Filter setup
$search = $_GET['search'] ?? '';
$category_id = $_GET['category_id'] ?? '';
$classification_id = $_GET['classification_id'] ?? '';
$filter_month = $_GET['filter_month'] ?? '';
$filter_year = $_GET['filter_year'] ?? '';


// ✅ Main query
$query = "
    SELECT 
        i.id,
        i.name,
        i.quantity,
        i.unit_price,
        i.date_ordered,
        i.date_procured,
        c.name AS category,
        s.name AS supplier,
        cls.classification_name
    FROM items i
    LEFT JOIN categories c ON i.category_id = c.id
    LEFT JOIN suppliers s ON i.supplier_id = s.id
    LEFT JOIN classifications cls ON i.classification_id = cls.id
    WHERE 1=1
";


$params = [];

// 🔎 Search by name
if (!empty($search)) {
    $query .= " AND i.name ILIKE :search";
    $params[':search'] = "%$search%";
}

// 🧭 Filter by category
if (!empty($category_id)) {
    $query .= " AND i.category_id = :category_id";
    $params[':category_id'] = $category_id;
}

// 🧭 Filter by classification
if (!empty($classification_id)) {
    $query .= " AND i.classification_id = :classification_id";
    $params[':classification_id'] = $classification_id;
}


// 🗓️ Filter by month/year
if (!empty($filter_month)) {
    $query .= " AND EXTRACT(MONTH FROM i.date_procured) = :filter_month";
    $params[':filter_month'] = $filter_month;
}
if (!empty($filter_year)) {
    $query .= " AND EXTRACT(YEAR FROM i.date_procured) = :filter_year";
    $params[':filter_year'] = $filter_year;
}


$query .= " ORDER BY i.id DESC";

$stmt = $conn->prepare($query);
$stmt->execute($params);
$items = $stmt->fetchAll(PDO::FETCH_ASSOC);

// pang fetch categories + suppliers
$categories = $conn->query("SELECT id, name FROM categories ORDER BY name")->fetchAll(PDO::FETCH_ASSOC);
$suppliers = $conn->query("SELECT id, name FROM suppliers ORDER BY name")->fetchAll(PDO::FETCH_ASSOC);
if (!empty($category_id)) {
    // kukunin neto lahat ng classification under ng pinili mong category
    $stmt = $conn->prepare("SELECT id, classification_name FROM classifications WHERE category_id = :cat_id ORDER BY classification_name");
    $stmt->execute([':cat_id' => $category_id]);
    $classifications = $stmt->fetchAll(PDO::FETCH_ASSOC);
} else {
    // kukunin neto lahat ng classification kung walang naka apply na category
    $classifications = $conn->query("SELECT id, classification_name FROM classifications ORDER BY classification_name")->fetchAll(PDO::FETCH_ASSOC);
}
?>

<link href="../front/css/output.css" rel="stylesheet">

<style>
.toast-container {
  position: fixed;
  bottom: 1.25rem;
  right: 1.25rem;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.toast {
  color: #fff;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  font-weight: 500;
  box-shadow: 0 4px 8px rgba(0,0,0,0.2);
  animation: slideIn 0.3s ease, fadeOut 3s ease forwards;
  min-width: 200px;
  text-align: center;
}

.toast.success {
  background-color: #16a34a;
}

.toast.error {
  background-color: #dc2626;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(100%);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes fadeOut {
  to {
    opacity: 0;
    transform: translateX(50%);
  }
}

/* Modal animations */
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
</style>

<!-- Main Content -->
<div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
  <div class="max-w-max mx-auto px-8 py-8">
    
    <!-- Header Section -->
    <div class="flex justify-between items-start mb-8">
      <div>
        <h1 class="text-4xl font-bold bg-gradient-to-r from-slate-700 to-blue-600 bg-clip-text text-transparent mb-3">
         Manage Items Inventory
        </h1>
        <p class="text-slate-500 text-sm">Manage your inventory items and stock levels</p>
      </div>
      
      <!-- Action Buttons -->
      <div class="flex gap-3 mt-4">
      <button id="openClassificationModalBtn" class="group relative px-5 py-2.5 bg-white text-blue-600 font-medium rounded-xl border-2 border-blue-200 hover:border-blue-300 hover:shadow-lg transition-all duration-300 hover:scale-105">
        <span class="flex items-center gap-2">
          <span>🧩</span>
          <span>Classifications</span>
        </span>
      </button>

        <button id="openCategoryModalBtn" class="group relative px-5 py-2.5 bg-white text-emerald-600 font-medium rounded-xl border-2 border-emerald-200 hover:border-emerald-300 hover:shadow-lg transition-all duration-300 hover:scale-105">
          <span class="flex items-center gap-2">
            <span>📂</span>
            <span>Categories</span>
          </span>
        </button>

        <button id="openSupplierModalBtn" class="group relative px-5 py-2.5 bg-white text-violet-600 font-medium rounded-xl border-2 border-violet-200 hover:border-violet-300 hover:shadow-lg transition-all duration-300 hover:scale-105">
          <span class="flex items-center gap-2">
            <span>🚚</span>
            <span>Suppliers</span>
          </span>
        </button>

        <button id="openModalBtn" class="group relative px-6 py-2.5 bg-gradient-to-r from-slate-700 to-blue-600 text-white font-semibold rounded-xl shadow-md hover:shadow-xl transition-all duration-300 hover:scale-105">
          <span class="flex items-center gap-2">
            <span class="text-lg">+</span>
            <span>Add Item</span>
          </span>
        </button>
      </div>
    </div>

    <?php
    $lowStockCount = count(array_filter($items, fn($i) => $i['quantity'] < 10));
    if ($lowStockCount > 0): ?>
    <div class="mb-6 bg-gradient-to-r from-amber-50 to-red-50 border-l-4 border-amber-500 rounded-xl p-5 shadow-sm">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
          <span class="text-amber-600 text-xl">⚠️</span>
        </div>
        <div>
          <p class="font-semibold text-amber-900">Low Stock Alert</p>
          <p class="text-sm text-amber-700">You have <strong><?= $lowStockCount ?></strong> item(s) running low on stock</p>
        </div>
      </div>
    </div>
    <?php endif; ?>

    <!-- Search & Filters Card -->
    <div class="bg-white rounded-2xl shadow-sm border border-blue-100 p-6 mb-6">
      <form method="GET" class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          
          <!-- Search -->
          <div class="lg:col-span-2">
            <label class="block text-xs font-medium text-slate-600 mb-2">Search Items</label>
            <div class="relative">
              <input type="text" name="search" placeholder="Search by name..." value="<?= htmlspecialchars($search) ?>"
                     class="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
            </div>
          </div>

          <!-- Category Filter -->
          <div>
            <label class="block text-xs font-medium text-slate-600 mb-2">Category</label>
            <select name="category_id" class="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition">
              <option value="">All Categories</option>
              <?php foreach ($categories as $cat): ?>
                <option value="<?= $cat['id'] ?>" <?= $cat['id'] == $category_id ? 'selected' : '' ?>>
                  <?= htmlspecialchars($cat['name']) ?>
                </option>
              <?php endforeach; ?>
            </select>
          </div>


          <!-- Classification Filter -->
          <div>
            <label class="block text-xs font-medium text-slate-600 mb-2">Classification</label>
            <select name="classification_id" id="classificationFilter" class="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition">
              <option value="">All Classifications</option>
              <?php foreach ($classifications as $cls): ?>
                <option value="<?= $cls['id'] ?>" <?= $cls['id'] == $classification_id ? 'selected' : '' ?>>
                  <?= htmlspecialchars($cls['classification_name']) ?>
                </option>
              <?php endforeach; ?>
            </select>
          </div>



          <!-- Month Filter -->
          <div>
            <label class="block text-xs font-medium text-slate-600 mb-2">Month</label>
            <select name="filter_month" class="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition">
              <option value="">All Months</option>
              <?php
              $months = [
                1=>'January', 2=>'February', 3=>'March', 4=>'April', 5=>'May', 6=>'June',
                7=>'July', 8=>'August', 9=>'September', 10=>'October', 11=>'November', 12=>'December'
              ];
              foreach ($months as $num => $name): ?>
                <option value="<?= $num ?>" <?= $num == $filter_month ? 'selected' : '' ?>><?= $name ?></option>
              <?php endforeach; ?>
            </select>
          </div>

          <!-- Year Filter -->
          <div>
            <label class="block text-xs font-medium text-slate-600 mb-2">Year</label>
            <select name="filter_year" class="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition">
              <option value="">All Years</option>
              <?php
              $years = range(date('Y'), date('Y') - 5);
              foreach ($years as $y): ?>
                <option value="<?= $y ?>" <?= $y == $filter_year ? 'selected' : '' ?>><?= $y ?></option>
              <?php endforeach; ?>
            </select>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center gap-3 pt-2">
          <button type="submit" class="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium rounded-lg hover:shadow-lg transition-all duration-300">
            Apply Filters
          </button>
          <?php if ($search || $category_id || $filter_month || $filter_year): ?>
            <a href="items.php" class="px-6 py-2.5 bg-slate-100 text-slate-600 font-medium rounded-lg hover:bg-slate-200 transition-colors">
              Reset
            </a>
          <?php endif; ?>
        </div>
      </form>
    </div>

    <!-- Items Table -->
    <div class="bg-white rounded-2xl shadow-sm border border-blue-100 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full py-8">
          <thead>
            <tr class="bg-gradient-to-r from-blue-600 to-slate-600 text-white">
              <th class="py-4 px-6 text-left text-xs font-semibold uppercase tracking-wider">Item Name</th>
              <th class="py-4 px-6 text-left text-xs font-semibold uppercase tracking-wider">Category</th>
              <th class="py-4 px-6 text-left text-xs font-semibold uppercase tracking-wider">Classification</th>
              <th class="py-4 px-6 text-left text-xs font-semibold uppercase tracking-wider">Supplier</th>
              <th class="py-4 px-6 text-left text-xs font-semibold uppercase tracking-wider">Quantity</th>
              <th class="py-4 px-6 text-left text-xs font-semibold uppercase tracking-wider">Unit Price</th>
              <th class="py-4 px-6 text-left text-xs font-semibold uppercase tracking-wider">Date Ordered</th>
              <th class="py-4 px-6 text-left text-xs font-semibold uppercase tracking-wider">Date Procured</th>
              <th class="py-4 px-6 text-right text-xs font-semibold uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <?php if (count($items) > 0): ?>
              <?php foreach ($items as $item): ?>
                <tr class="hover:bg-blue-50/30 transition-colors duration-150 <?= ($item['quantity'] < 10) ? 'bg-red-50/50' : '' ?>">
                  
                  <!-- Item Name -->
                  <td class="py-4 px-6">
                    <div class="flex items-center gap-3">
                      <div class="w-9 h-9 bg-gradient-to-br from-blue-100 to-blue-300 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span class="text-sm">📦</span>
                      </div>
                      <span class="font-semibold text-slate-800"><?= htmlspecialchars($item['name']) ?></span>
                    </div>
                  </td>

                  <!-- Category -->
                  <td class="py-4 px-6">
                    <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                      <?= htmlspecialchars($item['category'] ?? 'N/A') ?>
                    </span>
                  </td>

                  <!-- Classification -->
                  <td class="py-4 px-6">
                    <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                      <?= htmlspecialchars($item['classification_name'] ?? 'Unclassified') ?>
                    </span>
                  </td>

                  <!-- Supplier -->
                  <td class="py-4 px-6">
                    <span class="text-slate-700"><?= htmlspecialchars($item['supplier'] ?? 'N/A') ?></span>
                  </td>

                  <!-- Quantity -->
                  <td class="py-4 px-6">
                    <div class="flex items-center gap-2">
                      <span class="font-bold <?= ($item['quantity'] < 10) ? 'text-red-600' : 'text-slate-800' ?>">
                        <?= htmlspecialchars($item['quantity']) ?>
                      </span>
                      <?php if ($item['quantity'] < 10): ?>
                        <span class="px-2 py-0.5 bg-red-50 text-red-700 text-xs font-medium rounded-full">Low</span>
                      <?php endif; ?>
                    </div>
                  </td>

                  <!-- Unit Price -->
                  <td class="py-4 px-6">
                    <span class="font-semibold text-slate-700">₱<?= number_format($item['unit_price'] ?? 0, 2) ?></span>
                  </td>

                  <!-- Date Ordered -->
                  <td class="py-4 px-6 text-blue-600 text-sm">
                    <?= htmlspecialchars(date('M d, Y', strtotime($item['date_ordered']))) ?>
                  </td>

                  <!-- Date Procured -->
                  <td class="py-4 px-6 text-blue-600 text-sm">
                    <?= htmlspecialchars(date('M d, Y', strtotime($item['date_procured']))) ?>
                  </td>

                  <!-- Actions -->
                  <td class="py-4 px-6">
                    <div class="flex items-center justify-end gap-2">
                      <button data-id="<?= $item['id'] ?>" data-action="edit"
                        class="px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors text-xs font-medium">
                        ✏️ Edit
                      </button>
                      <button data-id="<?= $item['id'] ?>" data-action="delete"
                        class="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-xs font-medium">
                        🗑️ Delete
                      </button>
                    </div>
                  </td>

                </tr>
              <?php endforeach; ?>
            <?php else: ?>
              <tr>
                <td colspan="8" class="py-16 text-center">
                  <div class="flex flex-col items-center justify-center">
                    <div class="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                      <span class="text-3xl">📦</span>
                    </div>
                    <p class="text-slate-500 font-medium text-lg">No items found</p>
                    <p class="text-slate-400 text-sm mt-1">Try adjusting your filters or add a new item</p>
                  </div>
                </td>
              </tr>
            <?php endif; ?>
          </tbody>
        </table>
      </div>  
    </div>
  </div>
</div>

<!-- Add Classification Modal -->
<div id="addClassificationModal" class="fixed inset-0 bg-black/40 modal-backdrop flex items-center justify-center opacity-0 pointer-events-none transition-opacity duration-300 z-50">
  <div class="modal-content bg-white rounded-2xl shadow-2xl w-full max-w-lg relative p-8">
    <button id="closeClassificationModal" class="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-2xl font-bold transition-colors">
      &times;
    </button>
    
    <div class="mb-6">
      <h2 class="text-2xl font-bold text-slate-800">Manage Classifications</h2>
      <p class="text-sm text-slate-500 mt-1">Add classifications under categories</p>
    </div>
    
    <!-- Add New Classification Form -->
    <form id="addClassificationForm" method="POST" class="mb-6 p-5 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200">
      
      <label class="block text-sm font-medium text-slate-700 mb-2">Category *</label>
      <select name="category_id" required 
              class="w-full mb-3 px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition">
        <option value="">Select Category</option>
        <?php foreach ($categories as $cat): ?>
          <option value="<?= $cat['id'] ?>"><?= htmlspecialchars($cat['name']) ?></option>
        <?php endforeach; ?>
      </select>

      <label class="block text-sm font-medium text-slate-700 mb-2">Classification Name *</label>
      <div class="flex gap-3">
        <input type="text" name="classification_name" 
               class="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
               placeholder="e.g., Elbow, Steel Pipes" required>
        <button type="submit" name="add_classification"
                class="px-6 py-2.5 bg-linear-to-r from-blue-500 to-blue-600 text-slate-600 font-medium rounded-lg hover:shadow-lg transition-all duration-300">
          Add
        </button>
      </div>
    </form>

    <!-- Existing Classifications List -->
    <div>
      <h3 class="text-sm font-semibold text-slate-600 uppercase tracking-wider mb-3">Existing Classifications</h3>
      <ul id="classificationList" class="space-y-2 max-h-80 overflow-y-auto pr-2">
        <!-- We will load this dynamically later -->
        <li class="text-slate-400 text-sm">No classifications yet.</li>
      </ul>
    </div>
  </div>
</div>


<!-- Edit Item Modal -->
<div id="editItemModal" class="hidden fixed inset-0 bg-black/40 modal-backdrop z-50 flex items-center justify-center">
  <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl relative modal-content">
    <button id="closeEditModal" class="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-2xl font-bold transition-colors">
      &times;
    </button>
    <div id="editItemContent" class="p-8">
      <div class="text-center text-slate-500">Loading...</div>
    </div>
  </div>
</div>

<!-- Add Item Modal -->
<div id="addItemModal" class="fixed inset-0 bg-black/40 modal-backdrop flex items-center justify-center opacity-0 pointer-events-none transition-opacity duration-300 z-50">
  <div class="modal-content bg-white rounded-2xl shadow-2xl w-full max-w-2xl relative p-8">
    <button id="closeModal" class="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-2xl font-bold transition-colors">
      &times;
    </button>
    
    <div class="mb-6">
      <h2 class="text-2xl font-bold text-slate-800">Add New Item</h2>
      <p class="text-sm text-slate-500 mt-1">Fill in the details to add a new inventory item</p>
    </div>
    
    <form method="POST" id="addItemForm" class="space-y-5">
      
      <!-- Item Name -->
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-2">Item Name *</label>
        <input type="text" name="name" required 
               class="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
               placeholder="Enter item name">
      </div>

      <!-- Category & Supplier -->
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-2">Category *</label>
          <select name="category_id" required 
                  class="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition">
            <option value="">Select Category</option>
            <?php foreach ($categories as $cat): ?>
              <option value="<?= $cat['id'] ?>"><?= htmlspecialchars($cat['name']) ?></option>
            <?php endforeach; ?>
          </select>
        </div>

        <div>
  <label class="block text-sm font-medium text-slate-700 mb-2">Classification *</label>
  <select name="classification_id" id="classificationSelect" disabled
          class="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition">
    <option value="">Select Classification</option>
    <!-- Options kineme will be loaded in here -->
  </select>
</div>


        <div>
          <label class="block text-sm font-medium text-slate-700 mb-2">Supplier *</label>
          <select name="supplier_id" required 
                  class="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition">
            <option value="">Select Supplier</option>
            <?php foreach ($suppliers as $sup): ?>
              <option value="<?= $sup['id'] ?>"><?= htmlspecialchars($sup['name']) ?></option>
            <?php endforeach; ?>
          </select>
        </div>
      </div>

      <!-- Quantity & Unit Price -->
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-2">Quantity *</label>
          <input type="number" name="quantity" required min="1" 
                 class="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                 placeholder="0">
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-2">Unit Price (₱) *</label>
          <input type="number" step="0.01" name="unit_price" required 
                 class="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                 placeholder="0.00">
        </div>
      </div>

      <!-- Date Ordered & Procured -->
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-2">Date Ordered *</label>
          <input type="date" name="date_ordered" required 
                 class="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition">
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-2">Date Procured *</label>
          <input type="date" name="date_procured" required 
                 class="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition">
        </div>
      </div>

      <!-- Notes -->
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-2">Notes (Optional)</label>
        <textarea name="notes" rows="3"
                  class="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
                  placeholder="Additional notes or comments..."></textarea>
      </div>

      <!-- Submit Button -->
      <div class="flex justify-end gap-3 pt-4">
        <button type="button" onclick="document.getElementById('closeModal').click()"
                class="px-6 py-2.5 bg-slate-100 text-slate-600 font-medium rounded-lg hover:bg-slate-200 transition-colors">
          Cancel
        </button>
        <button type="submit" name="add_item"
                class="px-8 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-300">
          Save Item
        </button>
      </div>
    </form>
  </div>
</div>

<!-- Add Category Modal -->
<div id="addCategoryModal" class="fixed inset-0 bg-black/40 modal-backdrop flex items-center justify-center opacity-0 pointer-events-none transition-opacity duration-300 z-50">
  <div class="modal-content bg-white rounded-2xl shadow-2xl w-full max-w-lg relative p-8">
    <button id="closeCategoryModal" class="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-2xl font-bold transition-colors">
      &times;
    </button>
    
    <div class="mb-6">
      <h2 class="text-2xl font-bold text-slate-800">Manage Categories</h2>
      <p class="text-sm text-slate-500 mt-1">Add, edit, or remove inventory categories</p>
    </div>
    
    <!-- Add New Category Form -->
    <form id="addCategoryForm" method="POST" class="mb-6 p-5 bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl border border-emerald-200">
      <label for="category_name" class="block text-sm font-medium text-slate-700 mb-2">New Category Name</label>
      <div class="flex gap-3">
        <input type="text" name="category_name" id="category_name" 
               class="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
               placeholder="e.g., Office Supplies" required>
        <button type="submit" name="add_category"
                class="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-medium rounded-lg hover:shadow-lg transition-all duration-300">
          Add
        </button>
      </div>
    </form>

    <!-- Existing Categories List -->
    <div>
      <h3 class="text-sm font-semibold text-slate-600 uppercase tracking-wider mb-3">Existing Categories</h3>
      <ul id="categoryList" class="space-y-2 max-h-80 overflow-y-auto pr-2">
        <?php
        $stmt = $conn->query("SELECT * FROM categories ORDER BY id ASC");
        $categories = $stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($categories as $cat): ?>
          <li class="group flex justify-between items-center bg-slate-50 hover:bg-slate-100 px-4 py-3 rounded-lg transition-colors border border-slate-200">
            <span class="font-medium text-slate-700"><?= htmlspecialchars($cat['name']) ?></span>
            <div class="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button class="edit-category px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors text-xs font-medium"
                data-id="<?= $cat['id'] ?>" data-name="<?= htmlspecialchars($cat['name']) ?>">
                ✏️ Edit
              </button>
              <button class="delete-category px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-xs font-medium"
                data-id="<?= $cat['id'] ?>">
                🗑️ Delete
              </button>
            </div>
          </li>
        <?php endforeach; ?>
      </ul>
    </div>
  </div>
</div>

<!-- Add Supplier Modal -->
<div id="addSupplierModal" class="fixed inset-0 bg-black/40 modal-backdrop flex items-center justify-center opacity-0 pointer-events-none transition-opacity duration-300 z-50">
  <div class="modal-content bg-white rounded-2xl shadow-2xl w-full max-w-lg relative p-8">
    <button id="closeSupplierModal" class="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-2xl font-bold transition-colors">
      &times;
    </button>
    
    <div class="mb-6">
      <h2 class="text-2xl font-bold text-slate-800">Manage Suppliers</h2>
      <p class="text-sm text-slate-500 mt-1">Add, edit, or remove suppliers</p>
    </div>
    
    <!-- Add New Supplier Form -->
    <form id="addSupplierForm" method="POST" action="forms/add_supplier.php" class="mb-6 p-5 bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl border border-violet-200">
      <label for="supplierName" class="block text-sm font-medium text-slate-700 mb-2">New Supplier Name</label>
      <div class="flex gap-3">
        <input type="text" id="supplierName" name="supplierName" 
               class="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent transition"
               placeholder="e.g., ABC Corporation" required>
        <button type="submit"
                class="px-6 py-2.5 bg-gradient-to-r from-violet-500 to-violet-600 text-white font-medium rounded-lg hover:shadow-lg transition-all duration-300">
          Add
        </button>
      </div>
    </form>

    <!-- Existing Suppliers List -->
    <div>
      <h3 class="text-sm font-semibold text-slate-600 uppercase tracking-wider mb-3">Existing Suppliers</h3>
      <ul id="supplierList" class="space-y-2 max-h-80 overflow-y-auto pr-2">
        <?php
        $stmt = $conn->query("SELECT * FROM suppliers ORDER BY id ASC");
        $suppliers = $stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($suppliers as $sup): ?>
          <li class="group flex justify-between items-center bg-slate-50 hover:bg-slate-100 px-4 py-3 rounded-lg transition-colors border border-slate-200">
            <span class="font-medium text-slate-700"><?= htmlspecialchars($sup['name']) ?></span>
            <div class="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button class="edit-supplier px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors text-xs font-medium"
                data-id="<?= $sup['id'] ?>" data-name="<?= htmlspecialchars($sup['name']) ?>">
                ✏️ Edit
              </button>
              <button class="delete-supplier px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-xs font-medium"
                data-id="<?= $sup['id'] ?>">
                🗑️ Delete
              </button>
            </div>
          </li>
        <?php endforeach; ?>
      </ul>
    </div>
  </div>
</div>

<script src="../front/js/items.js"></script>
<script>  
document.addEventListener("DOMContentLoaded", () => {
  // ======= COMMON VARIABLES =======
  const tableContainer = document.querySelector('.overflow-x-auto');

  // ======= ITEM MODAL =======
  const itemModal = document.getElementById('addItemModal');
  const openItemBtn = document.getElementById('openModalBtn');
  const closeItemBtn = itemModal?.querySelector('#closeModal');
  const itemForm = document.getElementById('addItemForm');

  // ======= CATEGORY MODAL =======
  const categoryModal = document.getElementById('addCategoryModal');
  const openCategoryBtn = document.getElementById('openCategoryModalBtn');
  const closeCategoryBtn = document.getElementById('closeCategoryModal');
  const categoryForm = document.getElementById('addCategoryForm');
  const categoryList = document.getElementById('categoryList');

  // ======= SUPPLIER MODAL =======
  const supplierModal = document.getElementById('addSupplierModal');
  const openSupplierBtn = document.getElementById('openSupplierModalBtn');
  const closeSupplierBtn = document.getElementById('closeSupplierModal');
  const supplierForm = document.getElementById('addSupplierForm');
  const supplierList = document.getElementById('supplierList');

  // 🧩 UNIVERSAL MODAL FUNCTIONS
  function openModal(modal) {
    if (!modal) return;
    modal.classList.remove('opacity-0', 'pointer-events-none');
    modal.classList.add('flex', 'opacity-100');
    document.body.classList.add('overflow-hidden');
  }

  function closeModal(modal) {
    if (!modal) return;
    modal.classList.add('opacity-0', 'pointer-events-none');
    modal.classList.remove('opacity-100');
    document.body.classList.remove('overflow-hidden');
    setTimeout(() => modal.classList.remove('flex'), 200);
  }

  // ===== MODAL OPEN/CLOSE LOGIC =====
  if (openItemBtn) openItemBtn.addEventListener('click', () => openModal(itemModal));
  if (closeItemBtn) closeItemBtn.addEventListener('click', () => closeModal(itemModal));
  itemModal?.addEventListener('click', e => { if (e.target === itemModal) closeModal(itemModal); });

  if (openCategoryBtn) openCategoryBtn.addEventListener('click', () => openModal(categoryModal));
  if (closeCategoryBtn) closeCategoryBtn.addEventListener('click', () => closeModal(categoryModal));
  categoryModal?.addEventListener('click', e => { if (e.target === categoryModal) closeModal(categoryModal); });

  if (openSupplierBtn) openSupplierBtn.addEventListener('click', () => openModal(supplierModal));
  if (closeSupplierBtn) closeSupplierBtn.addEventListener('click', () => closeModal(supplierModal));
  supplierModal?.addEventListener('click', e => { if (e.target === supplierModal) closeModal(supplierModal); });

  // ====== ADD ITEM FORM ======
  if (itemForm) {
    itemForm.addEventListener('submit', async e => {
      e.preventDefault();
      const formData = new FormData(itemForm);
      formData.append('add_item', '1');

      try {
        const response = await fetch('items.php', { method: 'POST', body: formData });
        const text = await response.text();
        const doc = new DOMParser().parseFromString(text, 'text/html');
        const newTable = doc.querySelector('table');

        if (newTable && tableContainer) tableContainer.innerHTML = newTable.outerHTML;

        itemForm.reset();
        closeModal(itemModal);
        showToast('Item added successfully!', 'success');
        attachRowEventHandlers();
      } catch (err) {
        showToast('Error adding item: ' + err.message, 'error');
      }
    });
  }

  // ====== CATEGORY FORM ======
  if (categoryForm) {
    categoryForm.addEventListener('submit', async e => {
      e.preventDefault();
      const formData = new FormData(categoryForm);

      try {
        const response = await fetch('forms/add_category.php', { method: 'POST', body: formData });
        const text = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');
        const updatedList = doc.getElementById('categoryList');

        if (updatedList && categoryList) {
          categoryList.innerHTML = updatedList.innerHTML;
          attachCategoryEventHandlers();
        }

        categoryForm.reset();
        showToast('Category added successfully!', 'success');
      } catch (err) {
        showToast('Error adding category: ' + err.message, 'error');
      }
    });
  }

  // ====== SUPPLIER FORM ======
  if (supplierForm) {
    supplierForm.addEventListener('submit', async e => {
      e.preventDefault();
      const formData = new FormData(supplierForm);

      try {
        const response = await fetch('forms/add_supplier.php', { method: 'POST', body: formData });
        const text = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');
        const updatedList = doc.getElementById('supplierList');

        if (updatedList && supplierList) {
          supplierList.innerHTML = updatedList.innerHTML;
          attachSupplierEventHandlers();
        }

        supplierForm.reset();
        showToast('Supplier added successfully!', 'success');
      } catch (err) {
        showToast('Error adding supplier: ' + err.message, 'error');
      }
    });
  }

  // ===== DELETE/EDIT FUNCTIONS =====
  async function deleteItem(id) {
    if (!confirm('Are you sure you want to delete this item?')) return;
    try {
      const response = await fetch(`items.php?delete=${id}`);
      const text = await response.text();
      const doc = new DOMParser().parseFromString(text, 'text/html');
      const newTable = doc.querySelector('table');
      if (newTable && tableContainer) tableContainer.innerHTML = newTable.outerHTML;
      attachRowEventHandlers();
      showToast('Item deleted successfully!', 'success');
    } catch (err) {
      showToast('Error deleting item: ' + err.message, 'error');
    }
  }

  async function editCategory(id, name) {
    const newName = prompt("Edit category name:", name);
    if (!newName || newName.trim() === "") {
      alert("Category name cannot be empty.");
      return;
    }

    try {
      const res = await fetch("../actions/edit_category.php", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ id, name: newName.trim() }),
      });

      const data = await res.json();

      if (data.status === "success") {
        const listRes = await fetch("forms/category_form.php");
        const html = await listRes.text();

        const categoryList = document.getElementById("categoryList");

        if (categoryList) {
          categoryList.innerHTML = html;
          attachCategoryEventHandlers();
        }

        showToast("Category updated successfully!", "success");
      } else {
        alert(data.message || "Failed to update category.");
      }
    } catch (error) {
      console.error("Error updating category:", error);
      alert("Something went wrong while updating the category.");
    }
  }

  async function deleteCategory(id) {
    if (!confirm('Are you sure you want to delete this category?')) return;
    try {
      const res = await fetch('../actions/delete_category.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `id=${id}`
      });

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error('Invalid JSON response. Check PHP errors.');
      }

      if (data.status === 'success') {
        showToast('Category deleted successfully!', 'success');

        const listRes = await fetch('forms/fetch_categories.php');
        const html = await listRes.text();
        document.getElementById('categoryList').innerHTML = html;
        attachCategoryEventHandlers();
      } else {
        showToast('⚠️ ' + data.message, 'error');
      }

    } catch (err) {
      showToast('Error deleting category: ' + err.message, 'error');
    }
  }

  async function editSupplier(id, name) {
    const newName = prompt('Edit supplier name:', name);
    if (!newName) return;

    try {
      const formData = new FormData();
      formData.append('id', id);
      formData.append('name', newName);

      const res = await fetch('../actions/edit_supplier.php', { method: 'POST', body: formData });
      const data = await res.json();

      if (data.status === 'success') {
        const row = document.querySelector(`[data-id="supplier-${id}"]`);
        if (row) {
          const nameCell = row.querySelector('.supplier-name');
          if (nameCell) nameCell.textContent = newName;
        }

        showToast(data.message, 'success');
      } else {
        showToast('Error editing supplier: ' + data.message, 'error');
      }
    } catch (err) {
      showToast('Error editing supplier: ' + err.message, 'error');
    }
  }

  async function deleteSupplier(id) {
    if (!confirm('Are you sure you want to delete this supplier?')) return;

    try {
      const res = await fetch(`../actions/delete_supplier.php?id=${id}`);
      const data = await res.json();

      if (data.status === 'success') {
        const row = document.querySelector(`[data-id="supplier-${id}"]`);
        if (row) row.remove();

        showToast(data.message, 'success');
      } else {
        showToast('Error deleting supplier: ' + data.message, 'error');
      }
    } catch (err) {
      showToast('Error deleting supplier: ' + err.message, 'error');
    }
  }

  // ===== EVENT ATTACHERS =====
  function attachCategoryEventHandlers() {
    document.querySelectorAll('.edit-category').forEach(btn => {
      btn.onclick = () => editCategory(btn.dataset.id, btn.dataset.name);
    });
    document.querySelectorAll('.delete-category').forEach(btn => {
      btn.onclick = () => deleteCategory(btn.dataset.id);
    });
  }

  function attachSupplierEventHandlers() {
    document.querySelectorAll('.edit-supplier').forEach(btn => {
      btn.onclick = () => editSupplier(btn.dataset.id, btn.dataset.name);
    });
    document.querySelectorAll('.delete-supplier').forEach(btn => {
      btn.onclick = () => deleteSupplier(btn.dataset.id);
    });
  }

  function attachRowEventHandlers() {
    document.querySelectorAll('[data-action="edit"]').forEach(btn => {
      btn.onclick = () => openEditItemModal(btn.dataset.id);
    });

    document.querySelectorAll('[data-action="delete"]').forEach(btn => {
      btn.onclick = () => deleteItem(btn.dataset.id);
    });
  }

  // Open Edit Item modal
  async function openEditItemModal(itemId) {
    const modal = document.getElementById('editItemModal');
    const modalContent = document.getElementById('editItemContent');

    try {
      const res = await fetch(`forms/edit_item.php?id=${itemId}`);
      const html = await res.text();

      modalContent.innerHTML = html;
      modal.classList.remove('hidden');

      // Initialize category -> classification behavior
      initEditModal(modalContent);

    } catch (err) {
      console.error('Failed to load edit modal:', err);
      modalContent.innerHTML = '<div class="text-red-600 p-4">Error loading modal</div>';
      modal.classList.remove('hidden');
    }
  }

  // Initialize modal category/classification behavior
  function initEditModal(modalRoot) {
    const categorySelect = modalRoot.querySelector('#editCategory');
    const classificationSelect = modalRoot.querySelector('#editClassification');
    const currentClassificationId = modalRoot.querySelector('#currentClassificationId')?.value;

    if (!categorySelect || !classificationSelect) return;

    // Populate classifications initially
    if (categorySelect.value) {
      loadClassifications(categorySelect.value, classificationSelect, currentClassificationId);
    }

    // Update classifications on category change
    categorySelect.addEventListener('change', () => {
      loadClassifications(categorySelect.value, classificationSelect);
    });
  }

  // Fetch classifications
  async function loadClassifications(categoryId, classificationSelect, currentClassificationId = null) {
    classificationSelect.innerHTML = '<option value="">-- Select Classification --</option>';

    if (!categoryId) return;

    try {
      const res = await fetch(`forms/search_classification.php?category_id=${categoryId}`);
      const data = await res.json();

      data.forEach(cls => {
        const option = document.createElement('option');
        option.value = cls.id;
        option.textContent = cls.classification_name;

        if (currentClassificationId && cls.id == currentClassificationId) {
          option.selected = true;
        }

        classificationSelect.appendChild(option);
      });
    } catch (err) {
      console.error('Failed to fetch classifications:', err);
      classificationSelect.innerHTML = '<option value="">Error loading classifications</option>';
    }
  }

  // Close modal
  document.getElementById('closeEditModal').onclick = () => {
    document.getElementById('editItemModal').classList.add('hidden');
    document.getElementById('editItemContent').innerHTML = '<div class="text-center text-slate-500">Loading...</div>';
  }
  
  // ===== INITIAL ATTACH =====
  attachCategoryEventHandlers();
  attachSupplierEventHandlers();
  attachRowEventHandlers();
}); // ← END OF DOMContentLoaded

// ✅ Handle form submission for edit item (OUTSIDE DOMContentLoaded)
document.addEventListener('submit', async (e) => {
  if (e.target.id !== 'editItemForm') return;

  e.preventDefault();

  const form = e.target;
  const formData = new FormData(form);

  try {
    const res = await fetch('/InventorySys/actions/edit_item.php', {
      method: 'POST',
      body: formData
    });

    const data = await res.json();

    if (data.success) {
      alert(data.message);
      document.getElementById('editItemModal').classList.add('hidden');
      document.getElementById('editItemContent').innerHTML = '<div class="text-center text-slate-500">Loading...</div>';
      location.reload();
    } else {
      alert(data.message);
    }
  } catch (err) {
    console.error('Error:', err);
    alert('❌ Failed to save item.');
  }
});

// === Toast Function ===
function showToast(message, type = 'info') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;

  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 4000);
}
</script>
<script src="../front/js/classifications.js"></script>
<?php include '../includes/footer.php'; ?>
