<?php
require_once '../../includes/db.php';

// Get allocation ID
$id = $_GET['id'] ?? null;

if (!$id) {
    echo json_encode(['status'=>'error', 'message'=>'Missing allocation ID']);
    exit;
}

// Fetch single allocation with joins
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
        c.name AS category_name,
        i.category_id
    FROM allocations a
    LEFT JOIN items i ON a.item_id = i.id
    LEFT JOIN categories c ON i.category_id = c.id
    WHERE a.id = :id
    LIMIT 1
";

$stmt = $conn->prepare($sql);
$stmt->execute([':id'=>$id]);
$allocation = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$allocation) {
    echo json_encode(['status'=>'error','message'=>'Allocation not found']);
    exit;
}

echo json_encode(['status'=>'success','data'=>$allocation]);
