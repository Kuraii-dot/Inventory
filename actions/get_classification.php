<?php
require_once '../includes/db.php';
header('Content-Type: application/json');

$category_id = isset($_GET['category_id']) ? (int) $_GET['category_id'] : 0;

if ($category_id > 0) {
    $stmt = $conn->prepare("
        SELECT id, classification_name 
        FROM classifications 
        WHERE category_id = :category_id
        ORDER BY classification_name ASC
    ");
    $stmt->execute([':category_id' => $category_id]);
} else {
    $stmt = $conn->query("
        SELECT id, classification_name 
        FROM classifications 
        ORDER BY classification_name ASC
    ");
}

$classifications = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo json_encode($classifications);
