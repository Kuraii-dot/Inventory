<?php
require_once('../includes/db.php');

header('Content-Type: application/json');
ini_set('display_errors', 0);
error_reporting(0);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode([
        "status" => "error",
        "message" => "Invalid request method."
    ]);
    exit;
}

try {

    $id = $_POST['id'] ?? null;

    if (!$id) {
        echo json_encode([
            "status" => "error",
            "message" => "Invalid distribution ID."
        ]);
        exit;
    }

    // 🔐 Start transaction
    $conn->beginTransaction();

    // 1️⃣ Lock distribution row
    $stmt = $conn->prepare("
        SELECT id, item_id, quantity
        FROM distributions
        WHERE id = :id
        FOR UPDATE
    ");
    $stmt->execute(['id' => $id]);
    $distribution = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$distribution) {
        $conn->rollBack();
        echo json_encode([
            "status" => "error",
            "message" => "Distribution not found."
        ]);
        exit;
    }

    $itemId = $distribution['item_id'];
    $qty    = (int)$distribution['quantity'];

    // 2️⃣ Restore stock
    $restore = $conn->prepare("
        UPDATE items
        SET quantity = quantity + :qty
        WHERE id = :item_id
    ");
    $restore->execute([
        'qty' => $qty,
        'item_id' => $itemId
    ]);

    // 3️⃣ Delete distribution record
    $delete = $conn->prepare("
        DELETE FROM distributions
        WHERE id = :id
    ");
    $delete->execute(['id' => $id]);

    // ✅ Commit
    $conn->commit();

    echo json_encode([
        "status" => "success",
        "message" => "Distribution deleted and stock restored."
    ]);
    exit;

} catch (Throwable $e) {

    if ($conn->inTransaction()) {
        $conn->rollBack();
    }

    echo json_encode([
        "status" => "error",
        "message" => "Server error."
    ]);
    exit;
}
