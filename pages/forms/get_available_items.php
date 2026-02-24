<?php
include('../includes/db.php');

$category_id = $_GET['category_id'] ?? '';

if (empty($category_id)) {
    echo json_encode([]);
    exit;
}

try {
    $stmt = $conn->prepare("
        SELECT id, name, quantity
        FROM items
        WHERE category_id = :category_id
        AND quantity > 0
        ORDER BY name ASC
    ");
    $stmt->bindParam(':category_id', $category_id, PDO::PARAM_INT);
    $stmt->execute();
    $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

    header('Content-Type: application/json');
    echo json_encode($items);
} catch (Exception $e) {
    header('Content-Type: application/json');
    echo json_encode(['error' => $e->getMessage()]);
}
