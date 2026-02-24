<?php
require_once('../includes/db.php');

header('Content-Type: application/json');
ini_set('display_errors', 0);
error_reporting(0);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(["status" => "error", "message" => "Invalid request method."]);
    exit;
}

try {

    $id = $_POST['id'] ?? null;
    $returnQty = (int) ($_POST['return_quantity'] ?? 0);

    if (!$id || $returnQty <= 0) {
        echo json_encode([
            "status" => "error",
            "message" => "Invalid return request."
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

    $currentQty = (int)$distribution['quantity'];
    $itemId     = $distribution['item_id'];

    if ($returnQty > $currentQty) {
        $conn->rollBack();
        echo json_encode([
            "status" => "error",
            "message" => "Return quantity exceeds distributed amount."
        ]);
        exit;
    }

    // 2️⃣ Add stock back
    $updateStock = $conn->prepare("
        UPDATE items
        SET quantity = quantity + :qty
        WHERE id = :item_id
    ");
    $updateStock->execute([
        'qty' => $returnQty,
        'item_id' => $itemId
    ]);

    // 3️⃣ Update distribution quantity
    $newQty = $currentQty - $returnQty;

    if ($newQty > 0) {
        $updateDistribution = $conn->prepare("
            UPDATE distributions
            SET quantity = :newQty
            WHERE id = :id
        ");
        $updateDistribution->execute([
            'newQty' => $newQty,
            'id' => $id
        ]);
    } else {
        // If fully returned, delete record
        $deleteDistribution = $conn->prepare("
            DELETE FROM distributions
            WHERE id = :id
        ");
        $deleteDistribution->execute(['id' => $id]);
    }

    // ✅ Commit
    $conn->commit();

    echo json_encode([
        "status" => "success",
        "message" => "Return processed successfully."
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
