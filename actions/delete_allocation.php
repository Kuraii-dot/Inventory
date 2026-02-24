<?php
require_once '../includes/db.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['status' => 'error', 'message' => 'Invalid request method']);
    exit;
}

$id = isset($_POST['id']) ? (int)$_POST['id'] : 0;

if ($id <= 0) {
    echo json_encode(['status' => 'error', 'message' => 'Invalid allocation ID']);
    exit;
}

try {
    // Get allocation details
    $query = "SELECT item_id, quantity, status FROM allocations WHERE id = :id";
    $stmt = $conn->prepare($query);
    $stmt->execute([':id' => $id]);
    $allocation = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$allocation) {
        echo json_encode(['status' => 'error', 'message' => 'Allocation not found']);
        exit;
    }

    $item_id = $allocation['item_id'];
    $quantity = $allocation['quantity'];
    $status = $allocation['status'];

    // Start transaction
    $conn->beginTransaction();

    // Only restore stock if allocation is still active (not already returned)
    if ($status === 'active') {
        $restoreQuery = "UPDATE items SET quantity = quantity + :quantity WHERE id = :item_id";
        $restoreStmt = $conn->prepare($restoreQuery);
        $restoreStmt->execute([
            ':quantity' => $quantity,
            ':item_id' => $item_id
        ]);
    }
    
    // Soft delete: Mark as deleted instead of actually removing
    $deleteQuery = "UPDATE allocations SET status = 'deleted', updated_at = NOW() WHERE id = :id";
    $deleteStmt = $conn->prepare($deleteQuery);
    $deleteStmt->execute([':id' => $id]);
    
    $conn->commit();
    
    echo json_encode([
        'status' => 'success',
        'message' => 'Allocation deleted successfully',
        'stock_restored' => $status === 'active' ? $quantity : 0
    ]);
    
} catch (Exception $e) {
    if ($conn->inTransaction()) {
        $conn->rollBack();
    }
    echo json_encode([
        'status' => 'error',
        'message' => 'Failed to delete allocation: ' . $e->getMessage()
    ]);
}
?>