<?php
include('../includes/db.php');

$id               = (int) ($_POST['combination_id'] ?? 0);
$combination_name = trim($_POST['combination_name'] ?? '');

// Supports both 'items' and 'edit_items' form key names
$items = $_POST['edit_items'] ?? $_POST['items'] ?? [];

if (!$id || empty($combination_name)) {
    echo json_encode(['status' => 'error', 'message' => 'ID and combination name are required.']);
    exit;
}

$validItems = array_filter($items, fn($i) => !empty($i['item_id']) && isset($i['quantity']) && $i['quantity'] > 0);

if (empty($validItems)) {
    echo json_encode(['status' => 'error', 'message' => 'At least one item with a quantity is required.']);
    exit;
}

try {
    $conn->beginTransaction();

    // Update combination name
    $stmt = $conn->prepare("
        UPDATE combinations
        SET name       = :name,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = :id
    ");
    $stmt->bindParam(':name', $combination_name, PDO::PARAM_STR);
    $stmt->bindParam(':id',   $id,               PDO::PARAM_INT);
    $stmt->execute();

    // Delete old items
    $del = $conn->prepare("DELETE FROM combination_items WHERE combination_id = :combination_id");
    $del->bindParam(':combination_id', $id, PDO::PARAM_INT);
    $del->execute();

    // Re-insert items
    $stmtItem = $conn->prepare("
        INSERT INTO combination_items (combination_id, item_id, quantity_required)
        VALUES (:combination_id, :item_id, :quantity_required)
    ");

    foreach ($validItems as $item) {
        $item_id           = (int) $item['item_id'];
        $quantity_required = (int) $item['quantity'];

        $stmtItem->bindParam(':combination_id',    $id,                PDO::PARAM_INT);
        $stmtItem->bindParam(':item_id',           $item_id,           PDO::PARAM_INT);
        $stmtItem->bindParam(':quantity_required', $quantity_required, PDO::PARAM_INT);
        $stmtItem->execute();
    }

    $conn->commit();

    echo json_encode(['status' => 'success', 'message' => 'Combination updated successfully.']);

} catch (Exception $e) {
    $conn->rollBack();
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}