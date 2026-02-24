<?php
// actions/validate_stock.php
require_once '../includes/db.php';

$item_id = $_GET['item_id'] ?? null;
$quantity = intval($_GET['quantity'] ?? 0);

if (!$item_id || $quantity <= 0) {
    echo json_encode(['valid' => false, 'message' => 'Invalid parameters', 'available' => 0]);
    exit;
}

try {
    $stmt = $conn->prepare("SELECT quantity FROM items WHERE id = ?");
    $stmt->execute([$item_id]);
    $item = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$item) {
        echo json_encode(['valid' => false, 'message' => 'Item not found', 'available' => 0]);
        exit;
    }

    $available = intval($item['quantity']);
    if ($quantity > $available) {
        echo json_encode(['valid' => false, 'message' => 'Insufficient stock', 'available' => $available]);
    } else {
        echo json_encode(['valid' => true, 'remaining' => $available - $quantity]);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['valid' => false, 'message' => 'Error validating stock', 'available' => 0]);
}
exit;
?>