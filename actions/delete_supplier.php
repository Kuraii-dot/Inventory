<?php
header('Content-Type: application/json');
include __DIR__ . '/../includes/db.php';

if (!isset($_GET['id'])) {
    echo json_encode(['status' => 'error', 'message' => 'Missing supplier ID.']);
    exit;
}

$id = intval($_GET['id']);
if ($id <= 0) {
    echo json_encode(['status' => 'error', 'message' => 'Invalid supplier ID.']);
    exit;
}

try {
    $stmt = $conn->prepare("DELETE FROM suppliers WHERE id = ?");
    $stmt->execute([$id]);
    echo json_encode(['status' => 'success', 'message' => 'Supplier deleted successfully.']);
} catch (PDOException $e) {
    echo json_encode(['status' => 'error', 'message' => 'Database error: ' . $e->getMessage()]);
}
