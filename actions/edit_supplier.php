<?php
// Force JSON response
header('Content-Type: application/json');
error_reporting(E_ALL);
ini_set('display_errors', 0);

include __DIR__ . '/../includes/db.php'; // Absolute-safe include path

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['status' => 'error', 'message' => 'Invalid request method.']);
    exit;
}

$id = isset($_POST['id']) ? intval($_POST['id']) : 0;
$name = isset($_POST['name']) ? trim($_POST['name']) : '';

if ($id <= 0 || $name === '') {
    echo json_encode(['status' => 'error', 'message' => 'Invalid input data.']);
    exit;
}

try {
    $stmt = $conn->prepare("UPDATE suppliers SET name = :name WHERE id = :id");
    $stmt->execute([
        ':name' => $name,
        ':id' => $id
    ]);

    echo json_encode(['status' => 'success', 'message' => 'Supplier updated successfully.']);
} catch (PDOException $e) {
    echo json_encode(['status' => 'error', 'message' => 'Database error: ' . $e->getMessage()]);
}
