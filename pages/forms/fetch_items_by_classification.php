<?php
include '../../includes/db.php';

header('Content-Type: application/json');

$classification_id = $_GET['classification_id'] ?? null;

if (!$classification_id) {
    echo json_encode([]);
    exit;
}

try {
    $stmt = $conn->prepare("
        SELECT id, name, quantity 
        FROM items 
        WHERE classification_id = :classification_id 
        AND quantity > 0
        ORDER BY date_procured DESC, name ASC
    ");
    $stmt->execute([':classification_id' => $classification_id]);
    $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode($items);
} catch (PDOException $e) {
    echo json_encode(['error' => $e->getMessage()]);
}