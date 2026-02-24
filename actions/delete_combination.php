<?php
include('../includes/db.php');

$id = (int) ($_POST['id'] ?? 0);

if (!$id) {
    echo json_encode(['status' => 'error', 'message' => 'Invalid combination ID.']);
    exit;
}

try {
    // combination_items will cascade delete automatically
    $stmt = $conn->prepare("DELETE FROM combinations WHERE id = :id");
    $stmt->bindParam(':id', $id, PDO::PARAM_INT);
    $stmt->execute();

    if ($stmt->rowCount() === 0) {
        echo json_encode(['status' => 'error', 'message' => 'Combination not found.']);
        exit;
    }

    echo json_encode(['status' => 'success', 'message' => 'Combination deleted successfully.']);

} catch (Exception $e) {
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}