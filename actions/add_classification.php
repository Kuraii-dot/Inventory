<?php
include('../includes/db.php');
header('Content-Type: application/json');

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        echo json_encode(['status' => 'error', 'message' => 'Invalid request method']);
        exit;
    }

    $category_id = (int) ($_POST['category_id'] ?? 0);
    $classification_name = trim($_POST['classification_name'] ?? '');

    if ($category_id <= 0 || empty($classification_name)) {
        echo json_encode(['status' => 'error', 'message' => 'All fields are required']);
        exit;
    }

    // Prevent duplicates per category
    $check = $conn->prepare("
        SELECT COUNT(*) 
        FROM classifications 
        WHERE category_id = :category_id 
        AND classification_name = :classification_name
    ");
    $check->execute([
        ':category_id' => $category_id,
        ':classification_name' => $classification_name
    ]);

    if ($check->fetchColumn() > 0) {
        echo json_encode([
            'status' => 'error',
            'message' => 'Classification already exists in this category'
        ]);
        exit;
    }

    // Insert classification
    $insert = $conn->prepare("
        INSERT INTO classifications (category_id, classification_name) 
        VALUES (:category_id, :classification_name)
    ");
    $insert->execute([
        ':category_id' => $category_id,
        ':classification_name' => $classification_name
    ]);

    echo json_encode([
        'status' => 'success',
        'message' => '✅ Classification added successfully'
    ]);

} catch (Exception $e) {
    echo json_encode([
        'status' => 'error',
        'message' => '❌ ' . $e->getMessage()
    ]);
}
