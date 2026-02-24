<?php
require_once '../includes/db.php';
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['status' => 'error', 'message' => 'Invalid request']);
    exit;
}

$item_id = (int) ($_POST['item_id'] ?? 0);
$classification_id = (int) ($_POST['classification_id'] ?? 0);

if ($item_id <= 0 || $classification_id <= 0) {
    echo json_encode(['status' => 'error', 'message' => 'Invalid data']);
    exit;
}

$stmt = $conn->prepare("
    UPDATE items 
    SET classification_id = :classification_id 
    WHERE id = :item_id
");

$stmt->execute([
    ':classification_id' => $classification_id,
    ':item_id' => $item_id
]);

echo json_encode([
    'status' => 'success',
    'message' => 'Classification assigned successfully'
]);
