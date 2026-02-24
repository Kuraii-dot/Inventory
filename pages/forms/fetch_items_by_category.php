<?php
include('../../includes/db.php');

header('Content-Type: application/json');

$category_id = (int) ($_GET['category_id'] ?? 0);

if (!$category_id) {
    echo json_encode([]);
    exit;
}

try {
    $stmt = $conn->prepare("
        SELECT id, name
        FROM items
        WHERE category_id = :category_id
        ORDER BY name ASC
    ");
    $stmt->bindParam(':category_id', $category_id, PDO::PARAM_INT);
    $stmt->execute();
    $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode($items);

} catch (PDOException $e) {
    echo json_encode(['error' => $e->getMessage()]);
}