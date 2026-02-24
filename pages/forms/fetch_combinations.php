<?php
include('../../includes/db.php');

try {
    $stmt = $conn->prepare("
        SELECT
            c.id,
            c.name,
            c.is_active,
            c.created_at,
            COUNT(ci.id) AS item_count
        FROM combinations c
        LEFT JOIN combination_items ci ON ci.combination_id = c.id
        GROUP BY c.id, c.name, c.is_active, c.created_at
        ORDER BY c.created_at DESC
    ");
    $stmt->execute();
    $combinations = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Fetch items WITH category_id and classification_id
    $stmtItems = $conn->prepare("
        SELECT
            ci.id,
            ci.item_id,
            ci.quantity_required,
            i.name              AS item_name,
            i.category_id,
            i.classification_id,
            cat.name            AS category_name,
            cls.classification_name
        FROM combination_items ci
        JOIN items              i   ON i.id   = ci.item_id
        LEFT JOIN categories    cat ON cat.id = i.category_id
        LEFT JOIN classifications cls ON cls.id = i.classification_id
        WHERE ci.combination_id = :combination_id
        ORDER BY ci.id ASC
    ");

    foreach ($combinations as &$combo) {
        $stmtItems->bindParam(':combination_id', $combo['id'], PDO::PARAM_INT);
        $stmtItems->execute();
        $combo['items'] = $stmtItems->fetchAll(PDO::FETCH_ASSOC);
    }

    echo json_encode(['status' => 'success', 'data' => $combinations]);

} catch (Exception $e) {
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}