<?php
include('../includes/db.php');

$combination_name = trim($_POST['combination_name'] ?? '');
$items            = $_POST['items'] ?? [];

if (empty($combination_name)) {
    echo json_encode(['status' => 'error', 'message' => 'Combination name is required.']);
    exit;
}

// Filter out rows that have no item selected
$validItems = array_filter($items, fn($i) => !empty($i['item_id']) && !empty($i['quantity']));

if (empty($validItems)) {
    echo json_encode(['status' => 'error', 'message' => 'At least one item with a quantity is required.']);
    exit;
}

try {
    $conn->beginTransaction();

    // Insert combination
    $stmt = $conn->prepare("
        INSERT INTO combinations (name)
        VALUES (:name)
        RETURNING id
    ");
    $stmt->bindParam(':name', $combination_name, PDO::PARAM_STR);
    $stmt->execute();
    $combination_id = $stmt->fetchColumn();

    if (!$combination_id) {
        throw new Exception("Failed to create combination.");
    }

    // Insert each item
    $stmtItem = $conn->prepare("
        INSERT INTO combination_items (combination_id, item_id, quantity_required)
        VALUES (:combination_id, :item_id, :quantity_required)
    ");

    foreach ($validItems as $item) {
        $item_id           = (int) $item['item_id'];
        $quantity_required = (int) $item['quantity'];

        $stmtItem->bindParam(':combination_id',   $combination_id,   PDO::PARAM_INT);
        $stmtItem->bindParam(':item_id',          $item_id,          PDO::PARAM_INT);
        $stmtItem->bindParam(':quantity_required', $quantity_required, PDO::PARAM_INT);
        $stmtItem->execute();
    }

    $conn->commit();

    echo json_encode([
        'status'  => 'success',
        'message' => 'Combination saved successfully.',
        'id'      => $combination_id,
        'name'    => $combination_name
    ]);

} catch (Exception $e) {
    $conn->rollBack();
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}