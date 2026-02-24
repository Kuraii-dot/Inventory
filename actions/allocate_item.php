<?php
require_once('../includes/db.php');

header('Content-Type: application/json');

$item_id       = $_POST['item_id'] ?? null;
$category_id   = $_POST['category_id'] ?? null;
$department    = trim($_POST['department'] ?? '');
$quantity      = (int)($_POST['quantity'] ?? 0);
$allocated_by  = trim($_POST['allocated_by'] ?? '');
$purpose       = trim($_POST['purpose'] ?? '');
$remarks       = trim($_POST['remarks'] ?? '');

if (!$item_id || !$category_id || !$department || !$allocated_by || $quantity <= 0) {
    echo json_encode(['success' => false, 'message' => '❌ Missing or invalid fields.']);
    exit;
}

try {
    $conn->beginTransaction();

    // 🔒 Lock item row
    $stmt = $conn->prepare("
        SELECT quantity 
        FROM items 
        WHERE id = :item_id 
        FOR UPDATE
    ");
    $stmt->execute([':item_id' => $item_id]);
    $item = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$item) {
        throw new Exception('Item not found.');
    }

    if ($item['quantity'] < $quantity) {
        throw new Exception('❌ Insufficient stock for allocation.');
    }

    // ➖ Deduct quantity
    $update = $conn->prepare("
        UPDATE items
        SET quantity = quantity - :qty
        WHERE id = :item_id
    ");
    $update->execute([
        ':qty' => $quantity,
        ':item_id' => $item_id
    ]);

    // ➕ Insert allocation record
    $insert = $conn->prepare("
        INSERT INTO allocations
        (item_id, category_id, department, quantity, allocated_by, purpose, remarks, allocated_at)
        VALUES
        (:item_id, :category_id, :department, :quantity, :allocated_by, :purpose, :remarks, NOW())
    ");

    $insert->execute([
        ':item_id'      => $item_id,
        ':category_id'  => $category_id,
        ':department'   => $department,
        ':quantity'     => $quantity,
        ':allocated_by' => $allocated_by,
        ':purpose'      => $purpose,
        ':remarks'      => $remarks
    ]);

    $conn->commit();

    echo json_encode([
        'success' => true,
        'message' => '✅ Item successfully allocated.'
    ]);

} catch (Exception $e) {
    $conn->rollBack();

    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
