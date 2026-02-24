<?php
include('../../includes/db.php');

$id = (int) ($_GET['id'] ?? 0);

if (!$id) {
    echo json_encode(['status' => 'error', 'message' => 'Invalid combination ID.']);
    exit;
}

try {
    // Fetch combination
    $stmt = $conn->prepare("SELECT * FROM combinations WHERE id = :id");
    $stmt->bindParam(':id', $id, PDO::PARAM_INT);
    $stmt->execute();
    $combination = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$combination) {
        echo json_encode(['status' => 'error', 'message' => 'Combination not found.']);
        exit;
    }

    // Fetch its items with category + classification info
    $stmtItems = $conn->prepare("
        SELECT
            ci.id,
            ci.item_id,
            ci.quantity_required,
            i.name            AS item_name,
            i.category_id,
            i.classification_id,
            cat.name          AS category_name,
            cls.classification_name
        FROM combination_items ci
        JOIN items            i   ON i.id   = ci.item_id
        LEFT JOIN categories  cat ON cat.id = i.category_id
        LEFT JOIN classifications cls ON cls.id = i.classification_id
        WHERE ci.combination_id = :combination_id
        ORDER BY ci.id ASC
    ");
    $stmtItems->bindParam(':combination_id', $id, PDO::PARAM_INT);
    $stmtItems->execute();
    $combination['items'] = $stmtItems->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(['status' => 'success', 'data' => $combination]);

} catch (Exception $e) {
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}