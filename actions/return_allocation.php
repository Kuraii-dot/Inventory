<?php
require_once '../includes/db.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['status' => 'error', 'message' => 'Invalid request method']);
    exit;
}

$id = isset($_POST['id']) ? (int)$_POST['id'] : 0;
$return_quantity = isset($_POST['return_quantity']) ? (int)$_POST['return_quantity'] : 0;
$return_reason = isset($_POST['return_reason']) ? trim($_POST['return_reason']) : '';

if ($id <= 0) {
    echo json_encode(['status' => 'error', 'message' => 'Invalid allocation ID']);
    exit;
}

try {
    // Get allocation details
    $query = "SELECT item_id, quantity, status FROM allocations WHERE id = :id AND status = 'active'";
    $stmt = $conn->prepare($query);
    $stmt->execute([':id' => $id]);
    $allocation = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$allocation) {
        echo json_encode(['status' => 'error', 'message' => 'Allocation not found or already returned']);
        exit;
    }

    $item_id = $allocation['item_id'];
    $allocated_quantity = $allocation['quantity'];

    // Validate return quantity
    if ($return_quantity <= 0) {
        $return_quantity = $allocated_quantity; // Full return if not specified
    }

    if ($return_quantity > $allocated_quantity) {
        echo json_encode(['status' => 'error', 'message' => 'Return quantity cannot exceed allocated quantity']);
        exit;
    }

    // Start transaction
    $conn->beginTransaction();

    // Restore stock
    $restoreQuery = "UPDATE items SET quantity = quantity + :return_quantity WHERE id = :item_id";
    $restoreStmt = $conn->prepare($restoreQuery);
    $restoreStmt->execute([
        ':return_quantity' => $return_quantity,
        ':item_id' => $item_id
    ]);
    
    // Update allocation status
    if ($return_quantity == $allocated_quantity) {
        // Full return
        $updateQuery = "UPDATE allocations 
                       SET status = 'returned', 
                           remarks = COALESCE(remarks, '') || E'\nReturned: ' || :return_reason,
                           updated_at = NOW()
                       WHERE id = :id";
        $updateStmt = $conn->prepare($updateQuery);
        $updateStmt->execute([
            ':return_reason' => $return_reason,
            ':id' => $id
        ]);
    } else {
        // Partial return - update quantity
        $remaining = $allocated_quantity - $return_quantity;
        $updateQuery = "UPDATE allocations 
                       SET quantity = :remaining, 
                           remarks = COALESCE(remarks, '') || E'\nPartial return (' || :return_quantity || '): ' || :return_reason,
                           updated_at = NOW()
                       WHERE id = :id";
        $updateStmt = $conn->prepare($updateQuery);
        $updateStmt->execute([
            ':remaining' => $remaining,
            ':return_quantity' => $return_quantity,
            ':return_reason' => $return_reason,
            ':id' => $id
        ]);
    }
    
    $conn->commit();
    
    echo json_encode([
        'status' => 'success',
        'message' => ($return_quantity == $allocated_quantity ? 'Full' : 'Partial') . ' return processed successfully',
        'returned_quantity' => $return_quantity,
        'stock_restored' => $return_quantity
    ]);
    
} catch (Exception $e) {
    if ($conn->inTransaction()) {
        $conn->rollBack();
    }
    echo json_encode([
        'status' => 'error',
        'message' => 'Failed to process return: ' . $e->getMessage()
    ]);
}
?>