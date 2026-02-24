<?php
require_once '../includes/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['status' => 'error', 'message' => 'Invalid request method']);
    exit;
}

$id = isset($_POST['id']) ? (int)$_POST['id'] : 0;
$item_id = isset($_POST['item_id']) ? (int)$_POST['item_id'] : 0;
$quantity = isset($_POST['quantity']) ? (int)$_POST['quantity'] : 0;
$department = isset($_POST['department']) ? trim($_POST['department']) : '';
$allocated_by = isset($_POST['allocated_by']) ? trim($_POST['allocated_by']) : '';
$purpose = isset($_POST['purpose']) ? trim($_POST['purpose']) : '';
$remarks = isset($_POST['remarks']) ? trim($_POST['remarks']) : '';

// Validation
if ($id <= 0 || $item_id <= 0 || $quantity <= 0 || empty($department) || empty($allocated_by) || empty($purpose)) {
    echo json_encode(['status' => 'error', 'message' => 'All required fields must be filled']);
    exit;
}

try {
    // Get current allocation
    $currentQuery = "SELECT item_id, quantity FROM allocations WHERE id = :id AND status = 'active'";
    $currentStmt = $conn->prepare($currentQuery);
    $currentStmt->execute([':id' => $id]);
    $current = $currentStmt->fetch(PDO::FETCH_ASSOC);

    if (!$current) {
        echo json_encode(['status' => 'error', 'message' => 'Allocation not found or already processed']);
        exit;
    }

    $oldItemId = $current['item_id'];
    $oldQuantity = $current['quantity'];

    // Start transaction
    $conn->beginTransaction();

    // If item changed, restore old item stock and deduct from new item
    if ($oldItemId != $item_id) {
        // Restore old item stock
        $restoreQuery = "UPDATE items SET quantity = quantity + :old_quantity WHERE id = :old_item_id";
        $restoreStmt = $conn->prepare($restoreQuery);
        $restoreStmt->execute([
            ':old_quantity' => $oldQuantity,
            ':old_item_id' => $oldItemId
        ]);
        
        // Check new item stock
        $stockQuery = "SELECT quantity FROM items WHERE id = :item_id";
        $stockStmt = $conn->prepare($stockQuery);
        $stockStmt->execute([':item_id' => $item_id]);
        $newItem = $stockStmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$newItem) {
            throw new Exception("Selected item not found");
        }
        
        $newItemStock = $newItem['quantity'];
        
        if ($newItemStock < $quantity) {
            throw new Exception("Insufficient stock for the selected item. Available: {$newItemStock}");
        }
        
        // Deduct from new item
        $deductQuery = "UPDATE items SET quantity = quantity - :quantity WHERE id = :item_id";
        $deductStmt = $conn->prepare($deductQuery);
        $deductStmt->execute([
            ':quantity' => $quantity,
            ':item_id' => $item_id
        ]);
        
    } else {
        // Same item, just quantity changed
        $quantityDiff = $quantity - $oldQuantity;
        
        if ($quantityDiff != 0) {
            // Check stock if increasing quantity
            if ($quantityDiff > 0) {
                $stockQuery = "SELECT quantity FROM items WHERE id = :item_id";
                $stockStmt = $conn->prepare($stockQuery);
                $stockStmt->execute([':item_id' => $item_id]);
                $itemData = $stockStmt->fetch(PDO::FETCH_ASSOC);
                
                if (!$itemData) {
                    throw new Exception("Item not found");
                }
                
                $currentStock = $itemData['quantity'];
                
                if ($currentStock < $quantityDiff) {
                    throw new Exception("Insufficient stock. Available: {$currentStock}, Requested increase: {$quantityDiff}");
                }
            }
            
            // Update item stock (subtract if increasing, add if decreasing)
            $updateStockQuery = "UPDATE items SET quantity = quantity - :quantity_diff WHERE id = :item_id";
            $updateStockStmt = $conn->prepare($updateStockQuery);
            $updateStockStmt->execute([
                ':quantity_diff' => $quantityDiff,
                ':item_id' => $item_id
            ]);
        }
    }
    
    // Update allocation
    $updateQuery = "UPDATE allocations 
                    SET item_id = :item_id, 
                        quantity = :quantity, 
                        department = :department, 
                        allocated_by = :allocated_by, 
                        purpose = :purpose, 
                        remarks = :remarks,
                        updated_at = NOW()
                    WHERE id = :id";
    
    $updateStmt = $conn->prepare($updateQuery);
    $updateStmt->execute([
        ':item_id' => $item_id,
        ':quantity' => $quantity,
        ':department' => $department,
        ':allocated_by' => $allocated_by,
        ':purpose' => $purpose,
        ':remarks' => $remarks,
        ':id' => $id
    ]);
    
    $conn->commit();
    
    echo json_encode([
        'status' => 'success',
        'message' => 'Allocation updated successfully'
    ]);
    
} catch (Exception $e) {
    if ($conn->inTransaction()) {
        $conn->rollBack();
    }
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}
?>