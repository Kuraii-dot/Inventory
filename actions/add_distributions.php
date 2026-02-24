<?php
include('../includes/db.php');
header('Content-Type: application/json');

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        echo json_encode(['status' => 'error', 'message' => 'Invalid request method']);
        exit;
    }

    // 🧾 Extract common distribution data
    $recipient = trim($_POST['recipient']);
    $department = trim($_POST['department']);
    $approved_by = trim($_POST['approved_by']);
    $purpose = trim($_POST['purpose']);
    $debit_to = $_POST['debit_to'] ?? null;

    if ($debit_to === '') {
        $debit_to = null;
    }

    // 🗓 Respect user-selected date/time, fallback to now if not provided
    $date = !empty($_POST['date']) ? $_POST['date'] : date('Y-m-d');
    $time = !empty($_POST['time']) ? $_POST['time'] : date('H:i:s');
    $distributed_at = $date . ' ' . $time;

    // 📦 Get items array
    $items = $_POST['items'] ?? [];

    if (empty($items)) {
        echo json_encode(['status' => 'error', 'message' => 'No items to distribute.']);
        exit;
    }

    // 🧱 Begin transaction
    $conn->beginTransaction();

    $total_distributed_value = 0;
    $all_distribution_logs = [];
    $items_distributed = 0;

    // 🔄 Process each item
    foreach ($items as $itemData) {
        $category_id = (int) $itemData['category_id'];
        $item_id = (int) $itemData['item_id'];
        $quantity_requested = (int) $itemData['quantity'];

        if ($quantity_requested <= 0) {
            $conn->rollBack();
            echo json_encode(['status' => 'error', 'message' => 'Invalid quantity for one of the items.']);
            exit;
        }

        // Fetch item details
        $getItem = $conn->prepare("SELECT name FROM items WHERE id = :id");
        $getItem->execute([':id' => $item_id]);
        $itemName = $getItem->fetchColumn();

        if (!$itemName) {
            $conn->rollBack();
            echo json_encode(['status' => 'error', 'message' => "Item with ID $item_id not found."]);
            exit;
        }

        // ⚖️ Fetch stock batches ordered by oldest (FIFO)
        $stmt = $conn->prepare("
            SELECT id, quantity, unit_price, date_procured
            FROM items
            WHERE name = :item_name AND quantity > 0
            ORDER BY date_procured ASC, id ASC
        ");
        $stmt->execute([':item_name' => $itemName]);
        $batches = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $remaining = $quantity_requested;
        $item_value = 0;
        $distribution_log = [];

        foreach ($batches as $batch) {
            if ($remaining <= 0) break;

            $deduct = min($remaining, $batch['quantity']);
            $remaining -= $deduct;
            $item_value += ($deduct * $batch['unit_price']);

            // Update stock
            $update = $conn->prepare("UPDATE items SET quantity = quantity - :deduct WHERE id = :id");
            $update->execute([
                ':deduct' => $deduct,
                ':id' => $batch['id']
            ]);

            // Track batch details
            $distribution_log[] = [
                'batch_id' => $batch['id'],
                'deducted' => $deduct,
                'date_procured' => $batch['date_procured']
            ];
        }

        if ($remaining > 0) {
            $conn->rollBack();
            echo json_encode(['status' => 'error', 'message' => "Not enough stock available for $itemName."]);
            exit;
        }

        // 🧾 Record distribution for this item
        $insert = $conn->prepare("
            INSERT INTO distributions 
            (
                item_id,
                category_id,
                recipient,
                department,
                debit_to,
                approved_by,
                quantity,
                purpose,
                date,
                time,
                total_value,
                distributed_at
            )
            VALUES 
            (
                :item_id,
                :category_id,
                :recipient,
                :department,
                :debit_to,
                :approved_by,
                :quantity,
                :purpose,
                :date,
                :time,
                :total_value,
                :distributed_at
            )
        ");
        $insert->execute([
            ':item_id'        => $item_id,
            ':category_id'    => $category_id,
            ':recipient'      => $recipient,
            ':department'     => $department,
            ':debit_to'       => $debit_to,
            ':approved_by'    => $approved_by,
            ':quantity'       => $quantity_requested,
            ':purpose'        => $purpose,
            ':date'           => $date,
            ':time'           => $time,
            ':total_value'    => $item_value,
            ':distributed_at' => $distributed_at
        ]);

        $total_distributed_value += $item_value;
        $all_distribution_logs[] = [
            'item' => $itemName,
            'quantity' => $quantity_requested,
            'value' => $item_value,
            'batches' => $distribution_log
        ];
        $items_distributed++;
    }

    $conn->commit();

    echo json_encode([
        'status' => 'success',
        'message' => "✅ $items_distributed item(s) distributed successfully (FIFO applied).",
        'total_value' => $total_distributed_value,
        'items_count' => $items_distributed,
        'log' => $all_distribution_logs
    ]);

} catch (Exception $e) {
    if ($conn->inTransaction()) $conn->rollBack();
    echo json_encode(['status' => 'error', 'message' => '❌ ' . $e->getMessage()]);
}
?>