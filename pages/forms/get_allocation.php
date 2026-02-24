<?php
require_once '../../includes/db.php';

header('Content-Type: application/json');

if (!isset($_GET['id'])) {
    echo json_encode(['error' => 'Allocation ID required']);
    exit;
}

$id = (int)$_GET['id'];

try {
    $query = "SELECT 
                a.*,
                i.name as item_name,
                i.category_id,
                c.name as category_name
              FROM allocations a
              LEFT JOIN items i ON a.item_id = i.id
              LEFT JOIN categories c ON i.category_id = c.id
              WHERE a.id = :id AND a.status != 'deleted'";

    $stmt = $conn->prepare($query);
    $stmt->execute([':id' => $id]);
    $allocation = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($allocation) {
        echo json_encode(['success' => true, 'data' => $allocation]);
    } else {
        echo json_encode(['error' => 'Allocation not found']);
    }
} catch (Exception $e) {
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
}
?>