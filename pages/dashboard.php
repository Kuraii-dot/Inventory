<?php
require_once '../includes/auth.php';
requireRole('admin');

require_once '../includes/db.php';
require_once '../includes/header.php';
?>




<link href="../front/css/output.css" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>

<?php
// Fetch key metrics
$totalItems = $conn->query("SELECT COUNT(*) FROM items")->fetchColumn();
$totalCategories = $conn->query("SELECT COUNT(*) FROM categories")->fetchColumn();
$totalSuppliers = $conn->query("SELECT COUNT(*) FROM suppliers")->fetchColumn();
$lowStockItems = $conn->query("SELECT COUNT(*) FROM items WHERE quantity < 5")->fetchColumn();
$totalValue = $conn->query("SELECT COALESCE(SUM(quantity * unit_price), 0) FROM items")->fetchColumn();

// Fetch latest 5 items
$stmt = $conn->query("SELECT i.name, i.quantity, i.unit_price, c.name AS category
                      FROM items i 
                      LEFT JOIN categories c ON i.category_id = c.id
                      ORDER BY i.id DESC
                      LIMIT 5");
$recentItems = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Fetch category data for charts
$categoryData = $conn->query("
  SELECT c.name AS category, 
         COUNT(i.id) AS item_count, 
         COALESCE(SUM(i.quantity), 0) AS total_stock
  FROM categories c
  LEFT JOIN items i ON i.category_id = c.id
  GROUP BY c.id, c.name
  ORDER BY c.name ASC
")->fetchAll(PDO::FETCH_ASSOC);

$categoryLabels = [];
$itemCounts = [];
$stockCounts = [];

foreach ($categoryData as $row) {
  $categoryLabels[] = $row['category'];
  $itemCounts[] = $row['item_count'];
  $stockCounts[] = $row['total_stock'];
}
?>

<!-- Dashboard Content -->
<div class="min-h-screen bg-gradient-to-br from-slate-50 via-yellow-50 to-slate-100">
  <div class="max-w-screen mx-auto px-8 py-10">

    <!-- Header Section -->
    <div class="mb-10">
      <h1 class="text-4xl font-bold bg-gradient-to-r from-slate-700 to-blue-600 bg-clip-text text-transparent mb-2">
        Inventory Overview
      </h1>
      <p class="text-slate-500 text-sm">Monitor your inventory performance and key metrics</p>
    </div>

    <!-- Stats Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
      <!-- Total Items Card -->
      <div class="group relative bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-100 hover:scale-105 overflow-hidden">
        <div class="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-transparent rounded-full -mr-16 -mt-16"></div>
        <div class="relative">
          <div class="flex items-center justify-between mb-4">
            <div class="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md">
              <span class="text-white text-xl">📦</span>
            </div>
            <span class="text-xs font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full">Active</span>
          </div>
          <h2 class="text-sm font-medium text-slate-500 mb-1">Total Items</h2>
          <p class="text-3xl font-bold text-slate-800"><?= $totalItems ?></p>
          <div class="mt-3 flex items-center text-xs text-green-600">
            <span class="mr-1">↑</span> All inventory items
          </div>
        </div>
      </div>

      <!-- Total Categories Card -->
      <div class="group relative bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-100 hover:scale-105 overflow-hidden">
        <div class="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-full -mr-16 -mt-16"></div>
        <div class="relative">
          <div class="flex items-center justify-between mb-4">
            <div class="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-md">
              <span class="text-white text-xl">📂</span>
            </div>
            <span class="text-xs font-medium text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">Organized</span>
          </div>
          <h2 class="text-sm font-medium text-slate-500 mb-1">Total Categories</h2>
          <p class="text-3xl font-bold text-slate-800"><?= $totalCategories ?></p>
          <div class="mt-3 flex items-center text-xs text-slate-500">
            Categories tracked
          </div>
        </div>
      </div>

      <!-- Low Stock Items Card -->
      <div class="group relative bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-100 hover:scale-105 overflow-hidden">
        <div class="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-500/10 to-transparent rounded-full -mr-16 -mt-16"></div>
        <div class="relative">
          <div class="flex items-center justify-between mb-4">
            <div class="w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center shadow-md">
              <span class="text-white text-xl">⚠️</span>
            </div>
            <span class="text-xs font-medium text-amber-600 bg-amber-50 px-3 py-1 rounded-full">Alert</span>
          </div>
          <h2 class="text-sm font-medium text-slate-500 mb-1">Low Stock Items</h2>
          <p class="text-3xl font-bold text-slate-800"><?= $lowStockItems ?></p>
          <div class="mt-3 flex items-center text-xs text-amber-600">
            <span class="mr-1">!</span> Needs restocking
          </div>
        </div>
      </div>

      <!-- Total Value Card -->
      <div class="group relative bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-100 hover:scale-105 overflow-hidden">
        <div class="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-violet-500/10 to-transparent rounded-full -mr-16 -mt-16"></div>
        <div class="relative">
          <div class="flex items-center justify-between mb-4">
            <div class="w-12 h-12 bg-gradient-to-br from-violet-500 to-violet-600 rounded-xl flex items-center justify-center shadow-md">
              <span class="text-white text-xl">💰</span>
            </div>
            <span class="text-xs font-medium text-violet-600 bg-violet-50 px-3 py-1 rounded-full">Total</span>
          </div>
          <h2 class="text-sm font-medium text-slate-500 mb-1">Inventory Value</h2>
          <p class="text-3xl font-bold text-slate-800">₱<?= number_format($totalValue, 2) ?></p>
          <div class="mt-3 flex items-center text-xs text-slate-500">
            Current total worth
          </div>
        </div>
      </div>
    </div>

    <!-- Charts Section -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
      <!-- Items per Category Chart -->
      <div class="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 hover:shadow-lg transition-shadow duration-300">
        <div class="flex items-center justify-between mb-6">
          <div>
            <h2 class="text-xl font-bold text-slate-800">Items per Category</h2>
            <p class="text-xs text-slate-500 mt-1">Distribution across categories</p>
          </div>
          <div class="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
            <span class="text-blue-600">📊</span>
          </div>
        </div>
        <div class="relative">
          <canvas id="itemsByCategoryChart" height="120"></canvas>
        </div>
      </div>

      <!-- Stock Distribution Chart -->
      <div class="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 hover:shadow-lg transition-shadow duration-300">
        <div class="flex items-center justify-between mb-6">
          <div>
            <h2 class="text-xl font-bold text-slate-800">Stock Distribution</h2>
            <p class="text-xs text-slate-500 mt-1">Quantity breakdown by category</p>
          </div>
          <div class="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
            <span class="text-emerald-600">📈</span>
          </div>
        </div>
        <div class="relative">
          <canvas id="stockDistributionChart" height="120"></canvas>
        </div>
      </div>
    </div>

    <!-- Recent Items Table -->
    <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-lg transition-shadow duration-300">
      <div class="px-8 py-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-transparent">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-xl font-bold text-slate-800">Recently Added Items</h2>
            <p class="text-xs text-slate-500 mt-1">Latest additions to your inventory</p>
          </div>
          <a href="./items.php" class="group flex items-center space-x-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors">
            <span>View All</span>
            <span class="group-hover:translate-x-1 transition-transform">→</span>
          </a>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="min-w-full">
          <thead>
            <tr class="bg-slate-50/50">
              <th class="py-4 px-8 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Item Name</th>
              <th class="py-4 px-8 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Category</th>
              <th class="py-4 px-8 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Quantity</th>
              <th class="py-4 px-8 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Unit Price</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <?php if ($recentItems): ?>
              <?php foreach ($recentItems as $item): ?>
                <tr class="hover:bg-blue-50/30 transition-colors duration-150">
                  <td class="py-4 px-8">
                    <div class="flex items-center">
                      <div class="w-8 h-8 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center mr-3">
                        <span class="text-xs">📦</span>
                      </div>
                      <span class="font-medium text-slate-800"><?= htmlspecialchars($item['name']) ?></span>
                    </div>
                  </td>
                  <td class="py-4 px-8">
                    <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                      <?= htmlspecialchars($item['category'] ?? 'Uncategorized') ?>
                    </span>
                  </td>
                  <td class="py-4 px-8">
                    <span class="text-slate-700 font-medium"><?= htmlspecialchars($item['quantity']) ?></span>
                  </td>
                  <td class="py-4 px-8">
                    <span class="text-slate-700 font-semibold">₱<?= number_format($item['unit_price'], 2) ?></span>
                  </td>
                </tr>
              <?php endforeach; ?>
            <?php else: ?>
              <tr>
                <td colspan="4" class="py-12 text-center">
                  <div class="flex flex-col items-center justify-center">
                    <div class="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                      <span class="text-2xl">📦</span>
                    </div>
                    <p class="text-slate-500 font-medium">No recent items found</p>
                    <p class="text-slate-400 text-sm mt-1">Add your first item to get started</p>
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

<script>
  const categoryLabels = <?= json_encode($categoryLabels) ?>;
  const itemCounts = <?= json_encode($itemCounts) ?>;
  const stockCounts = <?= json_encode($stockCounts) ?>;

  // Bar Chart - Items per Category
  new Chart(document.getElementById('itemsByCategoryChart'), {
    type: 'bar',
    data: {
      labels: categoryLabels,
      datasets: [{
        label: 'Items',
        data: itemCounts,
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderRadius: 8,
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: { 
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          padding: 12,
          borderRadius: 8,
          titleColor: '#fff',
          bodyColor: '#cbd5e1',
          borderColor: 'rgba(148, 163, 184, 0.2)',
          borderWidth: 1
        }
      },
      scales: {
        y: { 
          beginAtZero: true, 
          ticks: { 
            stepSize: 1,
            color: '#64748b',
            font: { size: 11 }
          },
          grid: {
            color: 'rgba(148, 163, 184, 0.1)',
            drawBorder: false
          }
        },
        x: {
          ticks: {
            color: '#64748b',
            font: { size: 11 }
          },
          grid: {
            display: false
          }
        }
      }
    }
  });

  // Pie Chart - Stock Distribution
  new Chart(document.getElementById('stockDistributionChart'), {
    type: 'doughnut',
    data: {
      labels: categoryLabels,
      datasets: [{
        data: stockCounts,
        backgroundColor: [
          '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16'
        ],
        borderWidth: 0,
        spacing: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { 
          position: 'bottom',
          labels: {
            padding: 15,
            usePointStyle: true,
            pointStyle: 'circle',
            font: { size: 11 },
            color: '#64748b'
          }
        },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          padding: 12,
          borderRadius: 8,
          titleColor: '#fff',
          bodyColor: '#cbd5e1',
          borderColor: 'rgba(148, 163, 184, 0.2)',
          borderWidth: 1
        }
      },
      cutout: '65%'
    }
  });
</script>

<?php include '../includes/footer.php'; ?>