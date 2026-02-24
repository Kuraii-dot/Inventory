<?php
include '../../includes/db.php';

$search = $_GET['search'] ?? '';
$timeframe = $_GET['timeframe'] ?? 'all';
$start_date = $_GET['start_date'] ?? '';
$end_date = $_GET['end_date'] ?? '';
$page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
$limit = 15;
$offset = ($page - 1) * $limit;

$where = [];
$params = [':search' => "%$search%"];

$where[] = "(i.name ILIKE :search OR d.department ILIKE :search OR d.recipient ILIKE :search)";

// Timeframe filters
switch ($timeframe) {
  case 'today':
    $where[] = "DATE(d.distributed_at) = CURRENT_DATE";
    break;

  case 'week':
    $where[] = "d.distributed_at >= CURRENT_DATE - INTERVAL '7 days'";
    break;

  case 'month':
    $where[] = "EXTRACT(MONTH FROM d.distributed_at) = EXTRACT(MONTH FROM CURRENT_DATE)
                AND EXTRACT(YEAR FROM d.distributed_at) = EXTRACT(YEAR FROM CURRENT_DATE)";
    break;

  case 'year':
    $where[] = "EXTRACT(YEAR FROM d.distributed_at) = EXTRACT(YEAR FROM CURRENT_DATE)";
    break;

  case 'custom':
    if (!empty($start_date) && !empty($end_date)) {
      $where[] = "DATE(d.distributed_at) BETWEEN :start_date AND :end_date";
      $params[':start_date'] = $start_date;
      $params[':end_date'] = $end_date;
    }
    break;
}

$whereSQL = 'WHERE ' . implode(' AND ', $where);

// Get total count
$countQuery = "
  SELECT COUNT(*) as total
  FROM distributions d
  JOIN items i ON d.item_id = i.id
  JOIN categories c ON d.category_id = c.id
  $whereSQL
";

$countStmt = $conn->prepare($countQuery);
$countStmt->execute($params);
$totalRecords = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];
$totalPages = ceil($totalRecords / $limit);

// Get paginated data
$query = "
  SELECT 
    d.*, 
    i.name AS item_name, 
    c.name AS category_name,
    (d.quantity * i.unit_price) AS total_value
  FROM distributions d
  JOIN items i ON d.item_id = i.id
  JOIN categories c ON d.category_id = c.id
  $whereSQL
  ORDER BY d.distributed_at DESC
  LIMIT :limit OFFSET :offset
";

$stmt = $conn->prepare($query);
foreach ($params as $key => $value) {
  $stmt->bindValue($key, $value);
}
$stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
$stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
$stmt->execute();

$results = [];
$total = 0;

while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
  $total += $row['total_value'];
  $results[] = $row;
}

// Return JSON
header('Content-Type: application/json');
echo json_encode([
  'status' => 'success',
  'data' => $results,
  'total' => $total,
  'count' => count($results),
  'page' => $page,
  'total_pages' => $totalPages,
  'total_records' => $totalRecords
]);
?>