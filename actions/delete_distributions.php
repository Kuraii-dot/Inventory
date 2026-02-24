<?php
include '../includes/db.php';

header('Content-Type: application/json');

// ✅ Get item ID
$id = $_POST['id'] ?? null;

if (!$id) {
    echo json_encode(['success' => false, 'message' => 'Invalid item ID.']);
    exit;
}

$name = $_POST['name'] ?? '';
$category_id = $_POST['category_id'] ?? '';
$quantity = $_POST['quantity'] ?? 0;
$unit_price = $_POST['unit_price'] ?? 0;
$supplier_id = $_POST['supplier_id'] ?? '';

if (!$name || !$category_id || !$supplier_id) {
    echo json_encode(['success' => false, 'message' => 'Please fill out all required fields.']);
    exit;
}

try {
    $stmt = $conn->prepare("UPDATE items 
        SET name = :name, category_id = :category_id, quantity = :quantity, 
            unit_price = :unit_price, supplier_id = :supplier_id
        WHERE id = :id");

    $stmt->execute([
        ':name' => $name,
        ':category_id' => $category_id,
        ':quantity' => $quantity,
        ':unit_price' => $unit_price,
        ':supplier_id' => $supplier_id,
        ':id' => $id
    ]);

    echo json_encode(['success' => true, 'message' => '✅ Item updated successfully!']);
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => '❌ Database error: ' . $e->getMessage()]);
}
