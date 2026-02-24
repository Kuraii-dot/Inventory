<?php
include('../includes/db.php');
header('Content-Type: application/json');

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        echo json_encode(['status' => 'error', 'message' => 'Invalid request method']);
        exit;
    }

    // Extract common allocation data
    $department = trim($_POST['department']);
    $allocated_by = trim($_POST['allocated_by']);
    $purpose = trim($_POST['purpose']);
    $remarks = trim($_POST['remarks'] ?? '');

    // Get items array
    $items = $_POST['items'] ?? [];

    if (empty($items)) {
        echo json_encode(['status' => 'error', 'message' => 'No items to allocate.']);
        exit;
    }

    // Begin transaction
    $conn->beginTransaction();

    $total_quantity = 0;
    $items_allocated = 0;

    // Process each item
    foreach ($items as $itemData) {
        $category_id = (int) $itemData['category_id'];
        $item_id = (int) $itemData['item_id'];
        $quantity_requested = (int) $itemData['quantity'];

        if ($quantity_requested <= 0) {
            $conn->rollBack();
            echo json_encode(['status' => 'error', 'message' => 'Invalid quantity for one of the items.']);
            exit;
        }

        // Fetch item details
        $getItem = $conn->prepare("SELECT name, quantity FROM items WHERE id = :id");
        $getItem->execute([':id' => $item_id]);
        $item = $getItem->fetch(PDO::FETCH_ASSOC);

        if (!$item) {
            $conn->rollBack();
            echo json_encode(['status' => 'error', 'message' => "Item with ID $item_id not found."]);
            exit;
        }

        // Check if enough stock available
        $stmt = $conn->prepare("
            SELECT SUM(quantity) as total_stock 
            FROM items 
            WHERE name = :item_name AND quantity > 0
        ");
        $stmt->execute([':item_name' => $item['name']]);
        $totalStock = $stmt->fetchColumn();

        if ($totalStock < $quantity_requested) {
            $conn->rollBack();
            echo json_encode(['status' => 'error', 'message' => "Not enough stock available for {$item['name']}. Available: $totalStock"]);
            exit;
        }

        // Fetch stock batches ordered by oldest (FIFO)
        $stmt = $conn->prepare("
            SELECT id, quantity
            FROM items
            WHERE name = :item_name AND quantity > 0
            ORDER BY date_procured ASC, id ASC
        ");
        $stmt->execute([':item_name' => $item['name']]);
        $batches = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $remaining = $quantity_requested;

        foreach ($batches as $batch) {
            if ($remaining <= 0) break;

            $deduct = min($remaining, $batch['quantity']);
            $remaining -= $deduct;

            // Update stock
            $update = $conn->prepare("UPDATE items SET quantity = quantity - :deduct WHERE id = :id");
            $update->execute([
                ':deduct' => $deduct,
                ':id' => $batch['id']
            ]);
        }

        // Record allocation
        $insert = $conn->prepare("
            INSERT INTO allocations 
            (item_id, category_id, department, allocated_by, quantity, purpose, remarks, allocated_at)
            VALUES 
            (:item_id, :category_id, :department, :allocated_by, :quantity, :purpose, :remarks, NOW())
        ");
        $insert->execute([
            ':item_id' => $item_id,
            ':category_id' => $category_id,
            ':department' => $department,
            ':allocated_by' => $allocated_by,
            ':quantity' => $quantity_requested,
            ':purpose' => $purpose,
            ':remarks' => $remarks
        ]);

        $total_quantity += $quantity_requested;
        $items_allocated++;
    }

    $conn->commit();

    echo json_encode([
        'status' => 'success',
        'message' => "✅ $items_allocated item(s) allocated successfully (FIFO applied).",
        'total_quantity' => $total_quantity,
        'items_count' => $items_allocated
    ]);

} catch (Exception $e) {
    if ($conn->inTransaction()) $conn->rollBack();
    echo json_encode(['status' => 'error', 'message' => '❌ ' . $e->getMessage()]);
}