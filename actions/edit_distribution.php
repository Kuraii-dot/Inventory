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

    $id            = $_POST['id'] ?? null;
    $recipient     = trim($_POST['recipient'] ?? '');
    $department    = trim($_POST['department'] ?? '');
    $approved_by   = trim($_POST['approved_by'] ?? '');
    $debit_to      = trim($_POST['debit_to'] ?? '');
    $purpose       = trim($_POST['purpose'] ?? '');
    $quantity      = (int) ($_POST['quantity'] ?? 0);
    $item_id       = (int) ($_POST['item_id'] ?? 0);

    if (!$id || !$recipient || !$department || !$quantity || !$item_id) {
        echo json_encode(["status" => "error", "message" => "Missing required fields."]);
        exit;
    }

    // 🔐 START TRANSACTION
    $conn->beginTransaction();

    // 1️⃣ Get old distribution record
    $stmtOld = $conn->prepare("SELECT item_id, quantity FROM distributions WHERE id = :id");
    $stmtOld->execute(['id' => $id]);
    $oldData = $stmtOld->fetch(PDO::FETCH_ASSOC);

    if (!$oldData) {
        $conn->rollBack();
        echo json_encode(["status" => "error", "message" => "Distribution not found."]);
        exit;
    }

    $oldItemId = $oldData['item_id'];
    $oldQty    = (int)$oldData['quantity'];

    // 2️⃣ Restore old stock
    $restoreStock = $conn->prepare("
        UPDATE items 
        SET quantity = quantity + :oldQty 
        WHERE id = :oldItemId
    ");
    $restoreStock->execute([
        'oldQty' => $oldQty,
        'oldItemId' => $oldItemId
    ]);

    // 3️⃣ Check new stock availability
    $stmtStock = $conn->prepare("SELECT quantity FROM items WHERE id = :item_id FOR UPDATE");
    $stmtStock->execute(['item_id' => $item_id]);
    $item = $stmtStock->fetch(PDO::FETCH_ASSOC);

    if (!$item) {
        $conn->rollBack();
        echo json_encode(["status" => "error", "message" => "Item not found."]);
        exit;
    }

    if ($item['quantity'] < $quantity) {
        $conn->rollBack();
        echo json_encode(["status" => "error", "message" => "Not enough stock available."]);
        exit;
    }

    // 4️⃣ Deduct new stock
    $deductStock = $conn->prepare("
        UPDATE items 
        SET quantity = quantity - :qty 
        WHERE id = :item_id
    ");
    $deductStock->execute([
        'qty' => $quantity,
        'item_id' => $item_id
    ]);

    // 5️⃣ Update distribution record
    $update = $conn->prepare("
        UPDATE distributions
        SET recipient = :recipient,
            department = :department,
            approved_by = :approved_by,
            debit_to = :debit_to,
            purpose = :purpose,
            quantity = :quantity,
            item_id = :item_id
        WHERE id = :id
    ");

    $update->execute([
        'recipient' => $recipient,
        'department' => $department,
        'approved_by' => $approved_by,
        'debit_to' => $debit_to,
        'purpose' => $purpose,
        'quantity' => $quantity,
        'item_id' => $item_id,
        'id' => $id
    ]);

    // ✅ Commit everything
    $conn->commit();

    echo json_encode(["status" => "success"]);
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
