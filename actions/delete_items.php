<?php
// actions/delete_item.php
header('Content-Type: application/json; charset=utf-8');

try {
    require_once __DIR__ . '/../includes/db.php'; // ensure $conn is your PDO (PostgreSQL)

    // Validate input
    if (!isset($_GET['id']) || !is_numeric($_GET['id'])) {
        echo json_encode(['success' => false, 'message' => 'Invalid or missing item ID.']);
        exit;
    }

    $id = (int) $_GET['id'];

    // Check if item exists
    $check = $conn->prepare("SELECT id FROM items WHERE id = :id");
    $check->execute([':id' => $id]);

    if (!$check->fetch()) {
        echo json_encode(['success' => false, 'message' => 'Item not found.']);
        exit;
    }

    // Delete item
    $stmt = $conn->prepare("DELETE FROM items WHERE id = :id");
    $ok = $stmt->execute([':id' => $id]);

    if ($ok) {
        echo json_encode(['success' => true, 'message' => '✅ Item deleted successfully.']);
    } else {
        echo json_encode(['success' => false, 'message' => '❌ Failed to delete item.']);
    }

} catch (PDOException $e) {
    // Log the actual error in your system logs instead of exposing it publicly
    echo json_encode([
        'success' => false,
        'message' => 'Database error: ' . $e->getMessage()
    ]);
    exit;
}
