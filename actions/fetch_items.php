<?php
include('../includes/db.php');

// Get category ID from the query parameter
$category_id = $_GET['category_id'] ?? '';

if (empty($category_id)) {
    echo json_encode([]);
    exit;
}

try {
    // ✅ FIXED: Added quantity to SELECT
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

    // Return JSON
    header('Content-Type: application/json');
    echo json_encode($items);
} catch (Exception $e) {
    // Handle any errors gracefully
    header('Content-Type: application/json');
    echo json_encode(['error' => $e->getMessage()]);
}