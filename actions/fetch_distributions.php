<?php
include '../../includes/db.php';

// Get filter parameters from GET
$filter = $_GET['filter'] ?? 'all';
$from_date = $_GET['from'] ?? null;
$to_date = $_GET['to'] ?? null;

$query = "SELECT d.id, d.quantity, d.department, d.recipient, d.purpose, d.approved_by, d.distributed_at,
                 i.name AS item_name, c.name AS category_name
          FROM distributions d
          JOIN items i ON d.item_id = i.id
          JOIN categories c ON d.category_id = c.id
          WHERE 1=1";

if ($filter === 'today') {
    $query .= " AND DATE(d.distributed_at) = CURRENT_DATE";
} elseif ($filter === 'month') {
    $query .= " AND EXTRACT(MONTH FROM d.distributed_at) = EXTRACT(MONTH FROM CURRENT_DATE)
                 AND EXTRACT(YEAR FROM d.distributed_at) = EXTRACT(YEAR FROM CURRENT_DATE)";
} elseif ($filter === 'year') {
    $query .= " AND EXTRACT(YEAR FROM d.distributed_at) = EXTRACT(YEAR FROM CURRENT_DATE)";
} elseif ($filter === 'range' && $from_date && $to_date) {
    $query .= " AND d.distributed_at BETWEEN :from AND :to";
}

$stmt = $pdo->prepare($query);

if ($filter === 'range' && $from_date && $to_date) {
    $stmt->bindValue(':from', $from_date . " 00:00:00");
    $stmt->bindValue(':to', $to_date . " 23:59:59");
}

$stmt->execute();
$distributions = $stmt->fetchAll(PDO::FETCH_ASSOC);

header('Content-Type: application/json');
echo json_encode($distributions);
