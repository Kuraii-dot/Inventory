<?php
require_once '../includes/auth.php';
requireRole('admin');

require_once '../includes/db.php';
require_once '../includes/header.php';

try {
    // Fetch aggregated items - combines items with same name
    $query = "
        SELECT 
            i.name AS item_name,
            COUNT(DISTINCT i.id) AS variant_count,
            SUM(i.quantity) AS total_stock,
            COALESCE(SUM(d.quantity), 0) AS total_distributed,
            MIN(c.name) AS category_name,
            MIN(i.unit_price) AS min_price,
            MAX(i.unit_price) AS max_price,
            COUNT(DISTINCT c.id) AS category_count
        FROM items i
        LEFT JOIN categories c ON i.category_id = c.id
        LEFT JOIN distributions d ON i.id = d.item_id
        GROUP BY i.name
        ORDER BY i.name ASC
    ";
    
    $stmt = $conn->prepare($query);
    $stmt->execute();
    $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Fetch categories for modal dropdown
    $catStmt = $conn->prepare("
        SELECT id, name
        FROM categories
        ORDER BY name ASC
    ");
    $catStmt->execute();
    $categories = $catStmt->fetchAll(PDO::FETCH_ASSOC);

} catch (PDOException $e) {
    echo "<div class='text-red-600 font-bold'>Error fetching items: " . $e->getMessage() . "</div>";
    exit;
}
?>

<link href="../front/css/output.css" rel="stylesheet">

<style>
/* ── Modal animations (matches distributions.php) ── */
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

/* ── Toast ── */
.toast {
  animation: slideInRight 0.3s ease-out, fadeOut 0.5s ease-in 2.5s forwards;
}

@keyframes slideInRight {
  from { opacity: 0; transform: translateX(100%); }
  to   { opacity: 1; transform: translateX(0); }
}

@keyframes fadeOut {
  to { opacity: 0; transform: translateX(50%); }
}

/* ── Grouped rows (matches distributions.php) ── */
.group-items {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.4s ease-out, opacity 0.3s ease-out;
  opacity: 0;
}

.group-items.expanded {
  max-height: 3000px;
  opacity: 1;
  transition: max-height 0.5s ease-in, opacity 0.3s ease-in;
}

.group-toggle {
  transition: transform 0.3s ease;
  display: inline-block;
}

.group-toggle.rotated {
  transform: rotate(90deg);
}

.group-item {
  opacity: 0;
  transform: translateY(-10px);
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.group-items.expanded .group-item {
  opacity: 1;
  transform: translateY(0);
}

/* Stagger */
.group-items.expanded .group-item:nth-child(1) { transition-delay: 0.05s; }
.group-items.expanded .group-item:nth-child(2) { transition-delay: 0.10s; }
.group-items.expanded .group-item:nth-child(3) { transition-delay: 0.15s; }
.group-items.expanded .group-item:nth-child(4) { transition-delay: 0.20s; }
.group-items.expanded .group-item:nth-child(5) { transition-delay: 0.25s; }
.group-items.expanded .group-item:nth-child(6) { transition-delay: 0.30s; }
.group-items.expanded .group-item:nth-child(7) { transition-delay: 0.35s; }
.group-items.expanded .group-item:nth-child(8) { transition-delay: 0.40s; }

/* ── Hidden modal helper ── */
.modal-hidden {
  opacity: 0;
  pointer-events: none;
}

.modal-visible {
  opacity: 1;
  pointer-events: auto;
}
</style>

<!-- ════════════════════════════════════════════════
     MAIN CONTENT
════════════════════════════════════════════════ -->
<div class="min-h-screen bg-gradient-to-br from-amber-50 via-sky-50 to-slate-200">
  <div class="max-w-fit mx-auto px-8 py-10">

    <!-- Header -->
    <div class="flex justify-between items-start mb-8">
      <div>
        <h1 class="text-4xl font-bold bg-gradient-to-r from-amber-600 to-sky-600 bg-clip-text text-transparent mb-2">
          All Items Overview
        </h1>
        <p class="text-slate-500 text-sm">Complete lifetime inventory summary with all-time distribution tracking</p>
      </div>

      <div class="flex gap-3">
        <button id="generateDepartmentBtn" type="button"
                class="group relative px-5 py-2.5 bg-amber-50 text-sky-600 font-medium rounded-xl border-2 border-amber-300 hover:border-sky-400 hover:shadow-lg transition-all duration-300 hover:scale-105">
          <span class="flex items-center gap-2"><span>🏢</span><span>Department Reports</span></span>
        </button>

        <button id="generateReportBtn"
                class="group relative px-5 py-2.5 bg-amber-50 text-sky-600 font-medium rounded-xl border-2 border-amber-300 hover:border-sky-400 hover:shadow-lg transition-all duration-300 hover:scale-105">
          <span class="flex items-center gap-2"><span>📊</span><span>Item Reports</span></span>
        </button>

        <button id="generateLedgerBtn" type="button"
                class="group relative px-6 py-2.5 bg-gradient-to-r from-amber-400 to-sky-500 text-white border-2 border-amber-400 hover:border-amber-200 font-semibold rounded-xl shadow-md hover:shadow-xl transition-all duration-300 hover:scale-105">
          <span class="flex items-center gap-2"><span>📂</span><span>Item Ledger</span></span>
        </button>
      </div>
    </div>

    <!-- Info Banner -->
    <div class="bg-gradient-to-r from-amber-50 to-sky-50 border border-amber-200 rounded-xl p-5 mb-6">
      <div class="flex items-start gap-3">
        <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
          <span class="text-xl">ℹ️</span>
        </div>
        <div>
          <h3 class="font-semibold text-slate-800 mb-1">Combined View</h3>
          <p class="text-sm text-slate-600">Items with the same name are combined regardless of procurement date, price, or other attributes. Distribution counts show all-time totals across all years.</p>
        </div>
      </div>
    </div>

    <!-- Search Bar -->
    <div class="bg-gradient-to-r from-amber-50 to-sky-50 rounded-2xl shadow-sm border border-amber-200 p-6 mb-6">
      <div class="flex items-center gap-4">
        <div class="flex-1 relative">
          <input type="text" id="searchInput" placeholder="Search by item name or category..."
                 class="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-400 focus:border-transparent transition">
          <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
        </div>
        <div class="flex items-center gap-2 text-sm text-slate-600">
          <span class="font-medium">Showing:</span>
          <span id="visibleCount" class="font-bold text-sky-600"><?= count($items) ?></span>
          <span class="text-slate-400">/ <?= count($items) ?> items</span>
        </div>
        <button onclick="location.href='items.php'"
                class="px-6 py-2.5 bg-gradient-to-r from-amber-400 to-sky-500 text-white font-medium rounded-lg hover:shadow-lg transition-all duration-300 hover:scale-105">
          Manage Items
        </button>
      </div>
    </div>

    <!-- Items Table -->
    <div class="bg-gradient-to-r from-amber-50 to-sky-50 rounded-2xl shadow-sm border border-amber-100 overflow-hidden">
      <div class="overflow-hidden">
        <table class="min-w-full w-[1400px] table-fixed">
          <thead>
            <tr class="bg-gradient-to-r from-amber-300 to-sky-600 text-white">
              <th class="py-4 px-6 text-center text-xs font-semibold uppercase tracking-wider" style="width:5%;">#</th>
              <th class="py-4 px-6 text-center text-xs font-semibold uppercase tracking-wider" style="width:25%;">Item Name</th>
              <th class="py-4 px-6 text-center text-xs font-semibold uppercase tracking-wider" style="width:18%;">Category</th>
              <th class="py-4 px-6 text-center text-xs font-semibold uppercase tracking-wider" style="width:17%;">Total Stock</th>
              <th class="py-4 px-6 text-center text-xs font-semibold uppercase tracking-wider" style="width:20%;">All-Time Distributed</th>
              <th class="py-4 px-6 text-center text-xs font-semibold uppercase tracking-wider" style="width:15%;">Usage Rate</th>
            </tr>
          </thead>
          <tbody id="itemsTableBody" class="divide-y divide-slate-100">

            <?php if (count($items) > 0): ?>
              <?php
                // Group by category so we can do collapsible sections
                $grouped = [];
                foreach ($items as $row) {
                  $cat = $row['category_name'] ?? 'Uncategorized';
                  $grouped[$cat][] = $row;
                }
                $groupIndex = 0;
              ?>

              <?php foreach ($grouped as $categoryName => $categoryItems): ?>
                <?php
                  $groupId   = 'grp-' . $groupIndex++;
                  $catTotal  = array_sum(array_column($categoryItems, 'total_stock'));
                  $catDist   = array_sum(array_column($categoryItems, 'total_distributed'));
                  $itemCount = count($categoryItems);
                ?>

                <!-- Group Header Row -->
                <tr class="group-header bg-gradient-to-r from-amber-50 to-sky-50 hover:from-amber-100 hover:to-sky-100 cursor-pointer border-b-2 border-amber-200"
                    onclick="toggleGroup('<?= $groupId ?>')">
                  <td colspan="6" class="py-4 px-6 font-semibold text-slate-800">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-3">
                        <span class="group-toggle text-amber-600 font-bold text-lg" id="toggle-<?= $groupId ?>">⮞</span>
                        <div>
                          <div class="flex items-center gap-2">
                            <span class="text-sky-700">📦 <?= htmlspecialchars($categoryName) ?></span>
                            <span class="px-2 py-0.5 bg-amber-200 text-amber-800 rounded-full text-xs font-medium">
                              <?= $itemCount ?> item<?= $itemCount !== 1 ? 's' : '' ?>
                            </span>
                            <span class="px-2 py-0.5 bg-sky-100 text-sky-700 rounded-full text-xs font-medium">
                              Stock: <?= number_format($catTotal) ?>
                            </span>
                            <span class="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
                              Distributed: <?= number_format($catDist) ?>
                            </span>
                          </div>
                          <div class="text-xs text-slate-500 mt-1">Click to expand / collapse</div>
                        </div>
                      </div>
                      <div class="text-xs text-slate-400 italic">Click to expand/collapse</div>
                    </div>
                  </td>
                </tr>

                <!-- Group Items Wrapper -->
                <tr class="group-items-wrapper" data-group="<?= $groupId ?>">
                  <td colspan="6" class="p-0">
                    <div class="group-items" id="items-<?= $groupId ?>">
                      <table class="w-full table-fixed">
                        <tbody>
                          <?php $counter = 1; foreach ($categoryItems as $row): ?>
                            <?php
                              $totalStock  = $row['total_stock'] ?? 0;
                              $distributed = $row['total_distributed'];
                              $variantCount = $row['variant_count'];
                              $categoryCount = $row['category_count'];

                              $usageRate = $totalStock > 0 ? min(($distributed / $totalStock) * 100, 100) : 0;

                              if ($usageRate > 80) {
                                $rateColor = 'text-red-600';
                                $barColor  = 'bg-red-500';
                                $rateBg    = 'bg-red-50';
                                $rateLabel = 'High Usage';
                              } elseif ($usageRate > 50) {
                                $rateColor = 'text-amber-600';
                                $barColor  = 'bg-amber-500';
                                $rateBg    = 'bg-amber-50';
                                $rateLabel = 'Moderate';
                              } else {
                                $rateColor = 'text-emerald-600';
                                $barColor  = 'bg-emerald-500';
                                $rateBg    = 'bg-emerald-50';
                                $rateLabel = 'Low Usage';
                              }
                            ?>
                            <tr class="group-item hover:bg-amber-50/50 border-l-4 border-sky-300 transition-colors duration-150"
                                data-search="<?= strtolower(htmlspecialchars($row['item_name'] . ' ' . ($row['category_name'] ?? ''))) ?>">

                              <!-- # -->
                              <td class="py-3 px-6 text-slate-500 font-medium text-center" style="width:5%;">
                                <?= $counter++ ?>
                              </td>

                              <!-- Item Name -->
                              <td class="py-3 px-6" style="width:25%;">
                                <div class="flex items-center gap-3">
                                  <div class="w-9 h-9 bg-gradient-to-br from-amber-100 to-sky-200 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <span class="text-sm">📦</span>
                                  </div>
                                  <div>
                                    <p class="font-semibold text-sky-900 text-sm"><?= htmlspecialchars($row['item_name']) ?></p>
                                    <?php if ($variantCount > 1): ?>
                                      <p class="text-xs text-slate-500"><?= $variantCount ?> variants combined</p>
                                    <?php endif; ?>
                                  </div>
                                </div>
                              </td>

                              <!-- Category -->
                              <td class="py-3 px-6 text-center" style="width:18%;">
                                <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                                  <?= htmlspecialchars($row['category_name'] ?? 'Uncategorized') ?>
                                </span>
                                <?php if ($categoryCount > 1): ?>
                                  <p class="text-xs text-slate-500 mt-1">+<?= $categoryCount - 1 ?> more</p>
                                <?php endif; ?>
                              </td>

                              <!-- Total Stock -->
                              <td class="py-3 px-6 text-center" style="width:17%;">
                                <span class="font-bold text-amber-800"><?= number_format($totalStock) ?></span>
                                <span class="text-xs text-sky-500 ml-1">units</span>
                                <?php if ($variantCount > 1): ?>
                                  <p class="text-xs text-slate-500 mt-0.5">Avg: <?= number_format($totalStock / $variantCount, 1) ?>/variant</p>
                                <?php endif; ?>
                              </td>

                              <!-- Distributed -->
                              <td class="py-3 px-6" style="width:20%;">
                                <div class="flex items-center gap-2">
                                  <span class="font-bold text-amber-600"><?= number_format($distributed) ?></span>
                                  <span class="text-xs text-sky-500">units</span>
                                </div>
                                <div class="bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden">
                                  <div class="<?= $barColor ?> h-full transition-all duration-300" style="width:<?= min($usageRate, 100) ?>%"></div>
                                </div>
                              </td>

                              <!-- Usage Rate -->
                              <td class="py-3 px-6 text-center" style="width:15%;">
                                <div class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg <?= $rateBg ?>">
                                  <span class="font-bold <?= $rateColor ?>"><?= number_format($usageRate, 1) ?>%</span>
                                  <span class="text-xs text-slate-600 font-medium"><?= $rateLabel ?></span>
                                </div>
                              </td>
                            </tr>
                          <?php endforeach; ?>
                        </tbody>
                      </table>
                    </div>
                  </td>
                </tr>

              <?php endforeach; ?>

            <?php else: ?>
              <tr>
                <td colspan="6" class="py-16 text-center">
                  <div class="flex flex-col items-center justify-center">
                    <div class="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                      <span class="text-3xl">📦</span>
                    </div>
                    <p class="text-slate-500 font-medium text-lg">No items found</p>
                    <p class="text-slate-400 text-sm mt-1">Start by adding items to your inventory</p>
                  </div>
                </td>
              </tr>
            <?php endif; ?>

          </tbody>
        </table>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6">
      <?php
        $highUsage = $moderateUsage = $lowUsage = $multipleVariants = 0;
        foreach ($items as $i) {
          $stock = $i['total_stock'] ?? 0;
          $rate  = $stock > 0 ? (($i['total_distributed'] / $stock) * 100) : 0;
          if ($rate > 80)       $highUsage++;
          elseif ($rate > 50)   $moderateUsage++;
          else                  $lowUsage++;
          if ($i['variant_count'] > 1) $multipleVariants++;
        }
      ?>

      <?php
        $statCards = [
          ['bg-emerald-100','text-2xl','📊','text-slate-500','Low Usage',    'text-2xl font-bold text-emerald-600', $lowUsage],
          ['bg-amber-100',  'text-2xl','📈','text-slate-500','Moderate Usage','text-2xl font-bold text-amber-600',  $moderateUsage],
          ['bg-red-100',    'text-2xl','🔥','text-slate-500','High Usage',   'text-2xl font-bold text-red-600',     $highUsage],
          ['bg-indigo-100', 'text-2xl','🔀','text-slate-500','Multiple Variants','text-2xl font-bold text-indigo-600',$multipleVariants],
        ];
        foreach ($statCards as [$iconBg, $iconSize, $icon, $labelClass, $label, $valClass, $val]):
      ?>
      <div class="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 <?= $iconBg ?> rounded-lg flex items-center justify-center">
            <span class="<?= $iconSize ?>"><?= $icon ?></span>
          </div>
          <div>
            <p class="text-sm <?= $labelClass ?>"><?= $label ?></p>
            <p class="<?= $valClass ?>"><?= $val ?></p>
          </div>
        </div>
      </div>
      <?php endforeach; ?>
    </div>

  </div>
</div>


<!-- ════════════════════════════════════════════════
     MODALS
════════════════════════════════════════════════ -->

<!-- Item Report Modal -->
<div id="reportModal" class="hidden fixed inset-0 bg-black/40 modal-backdrop flex items-center justify-center z-50">
  <div class="modal-content bg-gradient-to-r from-amber-50 to-sky-50 rounded-2xl shadow-2xl w-full max-w-2xl relative p-8 max-h-[90vh] overflow-y-auto">
    <button id="closeReportModal" class="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-2xl font-bold transition-colors">&times;</button>

    <div class="mb-6">
      <h2 class="text-2xl font-bold text-slate-800">Generate Item Report</h2>
      <p class="text-sm text-slate-500 mt-1">Export distribution records in your preferred format</p>
    </div>

    <form action="forms/overall_report.php" method="POST" target="_blank" class="space-y-4">
      <div class="p-5 bg-gradient-to-r from-amber-50 to-sky-50 rounded-xl border border-sky-200">
        <label class="block text-sm font-semibold text-slate-700 mb-3">Select Format</label>
        <div class="flex gap-4">
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="report_type" value="pdf" checked class="w-4 h-4 text-amber-600">
            <span class="text-slate-700">📄 PDF</span>
          </label>
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="report_type" value="excel" class="w-4 h-4 text-amber-600">
            <span class="text-slate-700">📊 Excel</span>
          </label>
        </div>
      </div>

      <div>
        <label class="block text-sm font-medium text-slate-700 mb-2">Category</label>
        <select id="categorySelect" name="category_id"
                class="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition">
          <option value="all">All Categories</option>
          <?php foreach ($categories as $cat): ?>
            <option value="<?= $cat['id'] ?>"><?= htmlspecialchars($cat['name']) ?></option>
          <?php endforeach; ?>
        </select>
      </div>

      <div>
        <label class="block text-sm font-medium text-slate-700 mb-2">Item</label>
        <select id="itemSelect" name="item_id"
                class="w-full px-4 py-2.5 border border-slate-200 rounded-lg bg-amber-100 focus:border-transparent transition"
                disabled>
          <option value="all">All Items</option>
        </select>
      </div>

      <div>
        <label class="block text-sm font-medium text-slate-700 mb-2">Timeframe</label>
        <select id="timeframeSelect" name="timeframe"
                class="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent transition">
          <option value="daily">Daily</option>
          <option value="monthly">Monthly</option>
          <option value="custom">Custom Range</option>
        </select>
      </div>

      <div id="customRange" class="hidden grid grid-cols-2 gap-3">
        <div>
          <label class="block text-xs text-slate-500 mb-1">From</label>
          <input type="date" name="from" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 transition">
        </div>
        <div>
          <label class="block text-xs text-slate-500 mb-1">To</label>
          <input type="date" name="to" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 transition">
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        <div>
          <label class="block text-xs text-slate-500 mb-1">Prepared By</label>
          <input type="text" name="prepared_by" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 transition">
        </div>
        <div>
          <label class="block text-xs text-slate-500 mb-1">Reviewed By</label>
          <input type="text" name="reviewed_by" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 transition">
        </div>
        <div>
          <label class="block text-xs text-slate-500 mb-1">Approved By</label>
          <input type="text" name="approved_by" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 transition">
        </div>
      </div>

      <div class="flex justify-end gap-3 pt-4 border-t border-slate-200">
        <button type="button" id="cancelReportBtn"
                class="px-6 py-2.5 bg-slate-100 text-slate-600 font-medium rounded-lg hover:bg-slate-200 transition-colors">
          Cancel
        </button>
        <button type="submit"
                class="px-8 py-2.5 bg-gradient-to-r from-amber-400 to-sky-500 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-300">
          Generate Report
        </button>
      </div>
    </form>
  </div>
</div>

<!-- Department Report Modal -->
<div id="departmentModal" class="hidden fixed inset-0 bg-black/40 modal-backdrop flex items-center justify-center z-50">
  <div class="modal-content bg-gradient-to-r from-amber-50 to-sky-50 rounded-2xl shadow-2xl w-full max-w-2xl relative p-8 max-h-[90vh] overflow-y-auto">
    <button id="closeDeptModal" type="button"
            class="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-2xl font-bold transition-colors">&times;</button>

    <div class="mb-6">
      <h2 class="text-2xl font-bold text-slate-800">Generate Department Report</h2>
      <p class="text-sm text-slate-500 mt-1">Export distributions for a specific department</p>
    </div>

    <form action="forms/department_report.php" method="POST" target="_blank" class="space-y-4">
      <div class="p-5 bg-gradient-to-r from-amber-50 to-sky-50 rounded-xl border border-sky-200">
        <label class="block text-sm font-semibold text-slate-700 mb-3">Select Format</label>
        <div class="flex gap-4">
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="report_type" value="pdf" checked class="w-4 h-4 text-amber-600">
            <span class="text-slate-700">📄 PDF</span>
          </label>
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="report_type" value="excel" class="w-4 h-4 text-amber-600">
            <span class="text-slate-700">📊 Excel</span>
          </label>
        </div>
      </div>

      <div>
        <label class="block text-sm font-medium text-slate-700 mb-2">Select Department</label>
        <select name="department" required
                class="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition">
          <option value="" disabled selected>Select Department</option>
          <?php
            $stmt = $conn->prepare("SELECT DISTINCT department FROM distributions ORDER BY department ASC");
            $stmt->execute();
            $departments = $stmt->fetchAll(PDO::FETCH_COLUMN);
            foreach ($departments as $dept):
          ?>
            <option value="<?= htmlspecialchars($dept) ?>"><?= htmlspecialchars($dept) ?></option>
          <?php endforeach; ?>
        </select>
      </div>

      <div>
        <label class="block text-sm font-medium text-slate-700 mb-2">Timeframe</label>
        <select id="deptTimeframeSelect" name="timeframe"
                class="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent transition">
          <option value="daily">Daily</option>
          <option value="monthly">Monthly</option>
          <option value="custom">Custom Range</option>
        </select>
      </div>

      <div id="deptCustomRange" class="hidden grid grid-cols-2 gap-3">
        <div>
          <label class="block text-xs text-slate-500 mb-1">From</label>
          <input type="date" name="from" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 transition">
        </div>
        <div>
          <label class="block text-xs text-slate-500 mb-1">To</label>
          <input type="date" name="to" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 transition">
        </div>
      </div>

      <div class="flex justify-end gap-3 pt-4 border-t border-slate-200">
        <button type="button" id="cancelDeptBtn"
                class="px-6 py-2.5 bg-slate-100 text-slate-600 font-medium rounded-lg hover:bg-slate-200 transition-colors">
          Cancel
        </button>
        <button type="submit"
                class="px-8 py-2.5 bg-gradient-to-r from-amber-400 to-sky-500 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-300">
          Generate Department Report
        </button>
      </div>
    </form>
  </div>
</div>

<!-- Item Ledger Modal -->
<div id="ledgerModal" class="hidden fixed inset-0 bg-black/40 modal-backdrop flex items-center justify-center z-50">
  <div class="modal-content bg-gradient-to-r from-amber-50 to-sky-50 rounded-2xl shadow-2xl w-full max-w-6xl relative p-8 max-h-[90vh] overflow-y-auto">
    <button id="closeLedgerModal" type="button"
            class="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-2xl font-bold transition-colors">&times;</button>

    <div class="mb-6">
      <h2 class="text-2xl font-bold text-slate-800">📂 Item Ledger</h2>
      <p class="text-sm text-slate-500 mt-1">View complete transaction history for any item</p>
    </div>

    <!-- Selection Form -->
    <div class="bg-white rounded-xl p-6 mb-6 border border-sky-200">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-2">Category</label>
          <select id="ledgerCategorySelect"
                  class="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 transition">
            <option value="">Select Category</option>
            <?php foreach ($categories as $cat): ?>
              <option value="<?= $cat['id'] ?>"><?= htmlspecialchars($cat['name']) ?></option>
            <?php endforeach; ?>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-2">Classification</label>
          <select id="ledgerClassificationSelect"
                  class="w-full px-4 py-2.5 border border-slate-200 rounded-lg bg-slate-100 transition" disabled>
            <option value="">Select Classification</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-2">Item</label>
          <select id="ledgerItemSelect"
                  class="w-full px-4 py-2.5 border border-slate-200 rounded-lg bg-slate-100 transition" disabled>
            <option value="">Select Item</option>
          </select>
        </div>
      </div>
      <div class="flex justify-center">
        <button id="findLedgerBtn" type="button" disabled
                class="px-6 py-2.5 bg-gradient-to-r from-amber-400 to-sky-500 text-white font-medium rounded-lg hover:shadow-lg transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100">
          <span class="flex items-center gap-2"><span>🔍</span><span>Find Transactions</span></span>
        </button>
      </div>
    </div>

    <!-- Ledger Results -->
    <div id="ledgerResults" class="hidden">
      <div id="itemInfoCard" class="bg-white rounded-xl p-6 mb-4 border border-sky-200"></div>

      <div class="flex justify-end gap-3 mb-4">
        <button id="exportPdfBtn" type="button"
                class="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors">
          <span class="flex items-center gap-2"><span>📄</span><span>Export PDF</span></span>
        </button>
        <button id="exportExcelBtn" type="button"
                class="px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors">
          <span class="flex items-center gap-2"><span>📊</span><span>Export Excel</span></span>
        </button>
      </div>

      <div class="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="min-w-full">
            <thead>
              <tr class="bg-gradient-to-r from-amber-300 to-sky-600 text-white">
                <th class="py-3 px-4 text-left text-xs font-semibold uppercase">Date</th>
                <th class="py-3 px-4 text-left text-xs font-semibold uppercase">Type</th>
                <th class="py-3 px-4 text-left text-xs font-semibold uppercase">Reference</th>
                <th class="py-3 px-4 text-left text-xs font-semibold uppercase">Quantity</th>
                <th class="py-3 px-4 text-left text-xs font-semibold uppercase">Balance</th>
                <th class="py-3 px-4 text-left text-xs font-semibold uppercase">Details</th>
              </tr>
            </thead>
            <tbody id="ledgerTableBody"></tbody>
          </table>
        </div>
      </div>

      <div id="ledgerSummary" class="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4"></div>
    </div>
  </div>
</div>


<!-- ════════════════════════════════════════════════
     JAVASCRIPT
════════════════════════════════════════════════ -->
<script>
// ── Toggle group (same pattern as distributions.php) ──────────────────
function toggleGroup(groupId) {
  const container = document.getElementById(`items-${groupId}`);
  const toggle    = document.getElementById(`toggle-${groupId}`);
  if (!container || !toggle) return;

  if (container.classList.contains('expanded')) {
    container.classList.remove('expanded');
    toggle.classList.remove('rotated');
  } else {
    container.classList.add('expanded');
    toggle.classList.add('rotated');
  }
}
window.toggleGroup = toggleGroup;

// ── Search / filter ───────────────────────────────────────────────────
document.getElementById('searchInput').addEventListener('input', function () {
  const q     = this.value.trim().toLowerCase();
  const rows  = document.querySelectorAll('[data-search]');
  let visible = 0;

  // Collect which groups still have visible children
  const groupVisibility = {};

  rows.forEach(row => {
    const match = !q || row.dataset.search.includes(q);
    row.style.display = match ? '' : 'none';
    if (match) {
      visible++;
      // Find parent group-items-wrapper → mark group visible
      const wrapper = row.closest('tr[data-group]') ?? row.closest('.group-items-wrapper');
      // Walk up the DOM via the <table> structure to find the group id
    }
  });

  // Show/hide group header rows based on whether they still have visible items
  document.querySelectorAll('.group-items-wrapper').forEach(wrapper => {
    const groupId  = wrapper.dataset.group;
    const visRows  = wrapper.querySelectorAll('[data-search]');
    const anyMatch = Array.from(visRows).some(r => r.style.display !== 'none');

    // The preceding sibling is the group-header <tr>
    const headerRow = wrapper.previousElementSibling;
    if (headerRow) headerRow.style.display = anyMatch ? '' : 'none';
    wrapper.style.display = anyMatch ? '' : 'none';

    // Auto-expand groups that have matches when searching
    if (q && anyMatch) {
      const itemsDiv = document.getElementById(`items-${groupId}`);
      const toggle   = document.getElementById(`toggle-${groupId}`);
      if (itemsDiv && !itemsDiv.classList.contains('expanded')) {
        itemsDiv.classList.add('expanded');
        toggle?.classList.add('rotated');
      }
    }
  });

  document.getElementById('visibleCount').textContent = visible;
});

// ── Modal open/close helpers ──────────────────────────────────────────
function openModal(id) {
  const el = document.getElementById(id);
  el.classList.remove('hidden');
  el.classList.add('flex');
}

function closeModal(id) {
  const el = document.getElementById(id);
  el.classList.add('hidden');
  el.classList.remove('flex');
}

// Item Report Modal
document.getElementById('generateReportBtn').addEventListener('click', () => openModal('reportModal'));
document.getElementById('closeReportModal').addEventListener('click', () => closeModal('reportModal'));
document.getElementById('cancelReportBtn').addEventListener('click', () => closeModal('reportModal'));
document.getElementById('reportModal').addEventListener('click', e => { if (e.target === document.getElementById('reportModal')) closeModal('reportModal'); });

// Department Modal
document.getElementById('generateDepartmentBtn').addEventListener('click', () => openModal('departmentModal'));
document.getElementById('closeDeptModal').addEventListener('click', () => closeModal('departmentModal'));
document.getElementById('cancelDeptBtn').addEventListener('click', () => closeModal('departmentModal'));
document.getElementById('departmentModal').addEventListener('click', e => { if (e.target === document.getElementById('departmentModal')) closeModal('departmentModal'); });

// Ledger Modal
document.getElementById('generateLedgerBtn').addEventListener('click', () => openModal('ledgerModal'));
document.getElementById('closeLedgerModal').addEventListener('click', () => closeModal('ledgerModal'));
document.getElementById('ledgerModal').addEventListener('click', e => { if (e.target === document.getElementById('ledgerModal')) closeModal('ledgerModal'); });

// ── Custom date range toggles ─────────────────────────────────────────
document.getElementById('timeframeSelect')?.addEventListener('change', function () {
  document.getElementById('customRange').classList.toggle('hidden', this.value !== 'custom');
});

// ── Item Report: category → item cascade ──────────────────────────────
document.getElementById('categorySelect')?.addEventListener('change', async function () {
  const itemSelect = document.getElementById('itemSelect');

  itemSelect.innerHTML = '<option value="all">All Items</option>';
  itemSelect.disabled  = true;
  itemSelect.classList.add('bg-amber-100');
  itemSelect.classList.remove('bg-white');

  if (!this.value || this.value === 'all') return;

  try {
    const res   = await fetch(`forms/fetch_items_by_category.php?category_id=${this.value}`);
    const items = await res.json();

    if (Array.isArray(items) && items.length) {
      items.forEach(item => {
        const o       = document.createElement('option');
        o.value       = item.id;
        o.textContent = item.name;
        itemSelect.appendChild(o);
      });
      itemSelect.disabled = false;
      itemSelect.classList.remove('bg-amber-100');
      itemSelect.classList.add('bg-white');
    } else {
      const o       = document.createElement('option');
      o.disabled    = true;
      o.textContent = 'No items in this category';
      itemSelect.appendChild(o);
    }
  } catch (err) {
    console.error('Failed to fetch items by category:', err);
  }
});
document.getElementById('deptTimeframeSelect')?.addEventListener('change', function () {
  document.getElementById('deptCustomRange').classList.toggle('hidden', this.value !== 'custom');
});

// ── Ledger: cascade selects ───────────────────────────────────────────
document.getElementById('ledgerCategorySelect')?.addEventListener('change', async function () {
  const classSelect = document.getElementById('ledgerClassificationSelect');
  const itemSelect  = document.getElementById('ledgerItemSelect');
  const findBtn     = document.getElementById('findLedgerBtn');

  classSelect.innerHTML = '<option value="">Select Classification</option>';
  classSelect.disabled  = true;
  itemSelect.innerHTML  = '<option value="">Select Item</option>';
  itemSelect.disabled   = true;
  findBtn.disabled      = true;
  classSelect.classList.add('bg-slate-100');
  itemSelect.classList.add('bg-slate-100');

  if (!this.value) return;

  try {
    const res = await fetch(`forms/search_classification.php?category_id=${this.value}`);
    const cls = await res.json();
    cls.forEach(c => {
      const o = document.createElement('option');
      o.value = c.id; o.textContent = c.classification_name;
      classSelect.appendChild(o);
    });
    classSelect.disabled = false;
    classSelect.classList.remove('bg-slate-100');
  } catch (err) { console.error(err); }
});

document.getElementById('ledgerClassificationSelect')?.addEventListener('change', async function () {
  const itemSelect = document.getElementById('ledgerItemSelect');
  const findBtn    = document.getElementById('findLedgerBtn');

  itemSelect.innerHTML = '<option value="">Select Item</option>';
  itemSelect.disabled  = true;
  findBtn.disabled     = true;
  itemSelect.classList.add('bg-slate-100');

  if (!this.value) return;

  try {
    const res   = await fetch(`forms/fetch_items_by_classification.php?classification_id=${this.value}`);
    const items = await res.json();
    items.forEach(i => {
      const o = document.createElement('option');
      o.value = i.id; o.textContent = `${i.name} (Stock: ${i.quantity})`;
      itemSelect.appendChild(o);
    });
    itemSelect.disabled = false;
    itemSelect.classList.remove('bg-slate-100');
  } catch (err) { console.error(err); }
});

document.getElementById('ledgerItemSelect')?.addEventListener('change', function () {
  document.getElementById('findLedgerBtn').disabled = !this.value;
});

// ── Ledger find button ────────────────────────────────────────────────
document.getElementById('findLedgerBtn')?.addEventListener('click', async function () {
  const itemId = document.getElementById('ledgerItemSelect').value;
  if (!itemId) return;

  this.disabled      = true;
  this.innerHTML     = '<span class="flex items-center gap-2"><span>⏳</span><span>Loading...</span></span>';

  try {
    const res    = await fetch(`forms/fetch_item_ledger.php?item_id=${itemId}`);
    const result = await res.json();

    if (result.status !== 'success') {
      alert('Failed to load ledger: ' + result.message);
      return;
    }

    const data    = result.data;
    const info    = result.item_info;
    const summary = result.summary;

    // ── Item info card ──────────────────────────────────────────────
    document.getElementById('itemInfoCard').innerHTML = `
      <div class="flex items-center gap-4">
        <div class="w-14 h-14 bg-gradient-to-br from-amber-100 to-sky-200 rounded-xl flex items-center justify-center">
          <span class="text-2xl">📦</span>
        </div>
        <div>
          <h3 class="text-xl font-bold text-slate-800">${info.name}</h3>
          <p class="text-sm text-slate-500">${info.category} · ${info.classification}</p>
          <p class="text-sm font-medium text-emerald-600">Current Stock: <strong>${info.current_stock}</strong> units</p>
          ${info.unit_price ? `<p class="text-sm text-slate-500">Unit Price: ₱${parseFloat(info.unit_price).toFixed(2)}</p>` : ''}
        </div>
      </div>`;

    // ── Table rows ──────────────────────────────────────────────────
    const tbody = document.getElementById('ledgerTableBody');
    tbody.innerHTML = '';

    if (!data.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="py-10 text-center text-slate-400 text-sm">No transactions found for this item.</td>
        </tr>`;
    } else {
      data.forEach(row => {
        const isIn     = row.type !== 'OUT';
        const typeBg   = row.type === 'IN'     ? 'bg-emerald-100 text-emerald-700'
                       : row.type === 'RETURN' ? 'bg-blue-100 text-blue-700'
                       :                         'bg-red-100 text-red-700';
        const qtyColor = isIn ? 'text-emerald-600' : 'text-red-600';
        const sign     = isIn ? '+' : '-';

        const tr = document.createElement('tr');
        tr.className = 'hover:bg-amber-50/40 border-b border-slate-100';
        tr.innerHTML = `
          <td class="py-3 px-4 text-sm text-slate-600 whitespace-nowrap">${row.date}</td>
          <td class="py-3 px-4">
            <span class="px-2 py-1 rounded-full text-xs font-medium ${typeBg}">${row.type}</span>
          </td>
          <td class="py-3 px-4 text-sm text-slate-600">${row.reference || '—'}</td>
          <td class="py-3 px-4 font-semibold ${qtyColor}">${sign}${row.quantity}</td>
          <td class="py-3 px-4 font-bold text-slate-800">${row.balance}</td>
          <td class="py-3 px-4 text-sm text-slate-500">${row.details || '—'}</td>`;
        tbody.appendChild(tr);
      });
    }

    // ── Summary cards ───────────────────────────────────────────────
    document.getElementById('ledgerSummary').innerHTML = `
      <div class="bg-white rounded-xl p-4 border border-slate-100 shadow-sm text-center">
        <p class="text-xs text-slate-500 mb-1">Transactions</p>
        <p class="text-2xl font-bold text-slate-700">${summary.txn_count}</p>
      </div>
      <div class="bg-emerald-50 rounded-xl p-4 border border-emerald-100 shadow-sm text-center">
        <p class="text-xs text-slate-500 mb-1">Total IN</p>
        <p class="text-2xl font-bold text-emerald-600">+${summary.total_in}</p>
      </div>
      <div class="bg-red-50 rounded-xl p-4 border border-red-100 shadow-sm text-center">
        <p class="text-xs text-slate-500 mb-1">Total OUT</p>
        <p class="text-2xl font-bold text-red-600">-${summary.total_out}</p>
      </div>
      <div class="bg-blue-50 rounded-xl p-4 border border-blue-100 shadow-sm text-center">
        <p class="text-xs text-slate-500 mb-1">Total Returns</p>
        <p class="text-2xl font-bold text-blue-600">+${summary.total_returns}</p>
      </div>
      <div class="bg-amber-50 rounded-xl p-4 border border-amber-100 shadow-sm text-center">
        <p class="text-xs text-slate-500 mb-1">Current Stock</p>
        <p class="text-2xl font-bold text-amber-600">${summary.current_stock}</p>
      </div>`;

    // ── Export buttons ──────────────────────────────────────────────
    document.getElementById('exportPdfBtn').onclick = () => {
      window.open(`forms/export_ledger.php?item_id=${itemId}&format=pdf`, '_blank');
    };
    document.getElementById('exportExcelBtn').onclick = () => {
      window.open(`forms/export_ledger.php?item_id=${itemId}&format=excel`, '_blank');
    };

    // Show results section
    document.getElementById('ledgerResults').classList.remove('hidden');

  } catch (err) {
    console.error(err);
    alert('Error loading ledger data. Check console for details.');
  } finally {
    this.disabled  = false;
    this.innerHTML = '<span class="flex items-center gap-2"><span>🔍</span><span>Find Transactions</span></span>';
  }
});
</script>

<?php include '../includes/footer.php'; ?>