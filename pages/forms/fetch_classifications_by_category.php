<?php
include '../../includes/db.php';

header('Content-Type: application/json');

$category_id = $_GET['category_id'] ?? null;

if (!$category_id) {
    echo json_encode([]);
    exit;
}

try {
    // Get classifications that belong to this category
    $stmt = $conn->prepare("
        SELECT id, classification_name as name 
        FROM classifications
        WHERE category_id = :category_id
        ORDER BY classification_name ASC
    ");
    
    $stmt->execute([':category_id' => $category_id]);
    $classifications = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode($classifications);
    
} catch (PDOException $e) {
    echo json_encode(['error' => $e->getMessage()]);
}