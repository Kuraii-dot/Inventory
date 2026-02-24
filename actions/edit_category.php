<?php
// ✅ Force JSON response
header('Content-Type: application/json');
error_reporting(E_ALL);
ini_set('display_errors', 0);

include __DIR__ . '/../includes/db.php'; // use absolute-safe include path

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['status' => 'error', 'message' => 'Invalid request method.']);
    exit;
}

$id = isset($_POST['id']) ? intval($_POST['id']) : 0;
$name = isset($_POST['name']) ? trim($_POST['name']) : '';
$description = isset($_POST['description']) ? trim($_POST['description']) : '';

if ($id <= 0 || $name === '') {
    echo json_encode(['status' => 'error', 'message' => 'Invalid input data.']);
    exit;
}

try {
    // ✅ Update query
    $stmt = $conn->prepare("UPDATE categories SET name = :name, description = :description WHERE id = :id");
    $stmt->execute([
        ':name' => $name,
        ':description' => $description ?: null,
        ':id' => $id
    ]);

    // ✅ Return success
    echo json_encode(['status' => 'success', 'message' => 'Category updated successfully.']);
} catch (PDOException $e) {
    echo json_encode(['status' => 'error', 'message' => 'Database error: ' . $e->getMessage()]);
}
