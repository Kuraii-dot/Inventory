<?php
require_once('../../includes/db.php');
header('Content-Type: application/json');

ini_set('display_errors', 0);
error_reporting(0);


// Validate ID
if (!isset($_GET['id']) || !is_numeric($_GET['id'])) {
    echo json_encode([
        "status" => "error",
        "message" => "Invalid distribution ID."
    ]);
    exit;
}

$id = (int) $_GET['id'];

try {

    $sql = "
        SELECT 
            d.id,
            d.recipient,
            d.department,
            d.quantity,
            d.purpose,
            d.approved_by,
            d.debit_to,
            d.item_id,
            i.classification_id,
            c.category_id
        FROM distributions d
        LEFT JOIN items i ON d.item_id = i.id
        LEFT JOIN classifications c ON i.classification_id = c.id
        WHERE d.id = :id
        LIMIT 1
    ";
    $stmt = $conn->prepare($sql);
    $stmt->execute(['id' => $id]);
    $distribution = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$distribution) {
        echo json_encode([
            "status" => "error",
            "message" => "Distribution not found."
        ]);
        exit;
    }

    echo json_encode([
        "status" => "success",
        "data" => $distribution
    ]);

} catch (PDOException $e) {

    echo json_encode([
        "status" => "error",
        "message" => "Database error."
    ]);

}
