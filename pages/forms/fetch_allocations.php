<?php
require_once '../../includes/db.php';
// Filters
$search     = trim($_GET['search'] ?? '');
$timeframe  = $_GET['timeframe'] ?? 'all';
$startDate  = $_GET['start_date'] ?? '';
$endDate    = $_GET['end_date'] ?? '';
$page       = max(1, (int)($_GET['page'] ?? 1));
$limit      = max(1, (int)($_GET['limit'] ?? 50));
$offset     = ($page - 1) * $limit;

// Build WHERE clause
$where = ["a.status != 'deleted'"];
$params = [];

// Search filter
if ($search !== '') {
    $where[] = "(
        i.name ILIKE :search OR
        c.name ILIKE :search OR
        a.department ILIKE :search OR
        a.allocated_by ILIKE :search OR
        a.purpose ILIKE :search OR
        a.remarks ILIKE :search
    )";
    $params[':search'] = "%{$search}%";
}

// Timeframe filter
switch ($timeframe) {
    case 'today':
        $where[] = "a.created_at::date = CURRENT_DATE";
        break;
    case 'week':
        $where[] = "DATE_TRUNC('week', a.created_at) = DATE_TRUNC('week', CURRENT_DATE)";
        break;
    case 'month':
        $where[] = "EXTRACT(YEAR FROM a.created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
                     AND EXTRACT(MONTH FROM a.created_at) = EXTRACT(MONTH FROM CURRENT_DATE)";
        break;
    case 'year':
        $where[] = "EXTRACT(YEAR FROM a.created_at) = EXTRACT(YEAR FROM CURRENT_DATE)";
        break;
    case 'custom':
        if ($startDate && $endDate) {
            $where[] = "a.created_at::date BETWEEN :start AND :end";
            $params[':start'] = $startDate;
            $params[':end']   = $endDate;
        }
        break;
}

$whereSQL = implode(' AND ', $where);

// ---------- COUNT ----------
$countSQL = "
    SELECT COUNT(*) 
    FROM allocations a
    LEFT JOIN items i ON a.item_id = i.id
    LEFT JOIN categories c ON i.category_id = c.id
    WHERE {$whereSQL}
";

$countStmt = $conn->prepare($countSQL);
$countStmt->execute($params);
$totalRecords = (int) $countStmt->fetchColumn();

// ---------- MAIN QUERY ----------
$sql = "
    SELECT
        a.id,
        a.item_id,
        a.quantity,
        a.department,
        a.allocated_by,
        a.purpose,
        a.remarks,
        a.created_at,
        a.status,
        i.name AS item_name,
        i.quantity AS current_stock,
        c.name AS category_name
    FROM allocations a
    LEFT JOIN items i ON a.item_id = i.id
    LEFT JOIN categories c ON i.category_id = c.id
    WHERE {$whereSQL}
    ORDER BY a.created_at DESC
    LIMIT :limit OFFSET :offset
";

$stmt = $conn->prepare($sql);

// Bind dynamic params
foreach ($params as $key => $value) {
    $stmt->bindValue($key, $value);
}

// Bind pagination
$stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
$stmt->bindValue(':offset', $offset, PDO::PARAM_INT);

$stmt->execute();
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Add computed badges for front-end
foreach ($rows as &$row) {
    $row['statusBadge'] = $row['status'] === 'returned'
        ? "<span class='px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full'>Returned</span>"
        : "";
    $row['stockWarning'] = $row['current_stock'] < 10
        ? "<span class='text-xs text-red-500'>⚠️ Low Stock</span>"
        : "";
}

echo json_encode([
    'status' => 'success',
    'data'   => $rows,
    'page'   => $page,
    'limit'  => $limit,
    'total'  => $totalRecords,
    'total_pages' => ceil($totalRecords / $limit)
]);
