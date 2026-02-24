<?php
include('../../includes/db.php');

header('Content-Type: application/json');

$item_id = (int) ($_GET['item_id'] ?? 0);

if (!$item_id) {
    echo json_encode(['status' => 'error', 'message' => 'Item ID required']);
    exit;
}

try {
    // ── Item details ──────────────────────────────────────────────────
    $itemStmt = $conn->prepare("
        SELECT
            i.id,
            i.name,
            i.quantity      AS current_stock,
            i.unit_price,
            i.created_at,
            i.date_procured,
            c.name          AS category,
            cl.classification_name AS classification
        FROM items i
        LEFT JOIN categories      c  ON c.id  = i.category_id
        LEFT JOIN classifications cl ON cl.id = i.classification_id
        WHERE i.id = :item_id
    ");
    $itemStmt->execute([':item_id' => $item_id]);
    $item = $itemStmt->fetch(PDO::FETCH_ASSOC);

    if (!$item) {
        echo json_encode(['status' => 'error', 'message' => 'Item not found']);
        exit;
    }

    $transactions = [];

    // ── 1. Procurement / opening balance ──────────────────────────────
    $procureStmt = $conn->prepare("
        SELECT
            i.created_at     AS date,
            i.date_procured  AS procurement_date,
            CONCAT('INV-', i.id) AS reference,
            i.quantity,
            CONCAT('Procured from ', COALESCE(s.name, 'Unknown Supplier')) AS details
        FROM items i
        LEFT JOIN suppliers s ON i.supplier_id = s.id
        WHERE i.id = :item_id
    ");
    $procureStmt->execute([':item_id' => $item_id]);
    $proc = $procureStmt->fetch(PDO::FETCH_ASSOC);

    if ($proc) {
        $txnDate = $proc['procurement_date'] ?? $proc['date'] ?? date('Y-m-d');
        $transactions[] = [
            'date'      => date('M d, Y', strtotime($txnDate)),
            'type'      => 'IN',
            'reference' => $proc['reference'],
            'quantity'  => (int) $proc['quantity'],
            'details'   => $proc['details'],
            'raw_date'  => $txnDate,
        ];
    }

    // ── 2. Distributions (OUT) ────────────────────────────────────────
    $distStmt = $conn->prepare("
        SELECT
            d.distributed_at AS date,
            CONCAT('DIST-', d.id) AS reference,
            d.quantity,
            CONCAT('To ', COALESCE(d.department, ''), ' — ', COALESCE(d.recipient, '')) AS details
        FROM distributions d
        WHERE d.item_id = :item_id AND d.quantity > 0
        ORDER BY d.distributed_at ASC
    ");
    $distStmt->execute([':item_id' => $item_id]);
    while ($row = $distStmt->fetch(PDO::FETCH_ASSOC)) {
        $transactions[] = [
            'date'      => date('M d, Y h:i A', strtotime($row['date'])),
            'type'      => 'OUT',
            'reference' => $row['reference'],
            'quantity'  => (int) $row['quantity'],
            'details'   => $row['details'],
            'raw_date'  => $row['date'],
        ];
    }

    // ── 3. Allocations (OUT) ──────────────────────────────────────────
    $allocStmt = $conn->prepare("
        SELECT
            a.allocated_at AS date,
            CONCAT('ALLOC-', a.id) AS reference,
            a.quantity,
            CONCAT('To ', COALESCE(a.department, '')) AS details
        FROM allocations a
        WHERE a.item_id = :item_id AND a.quantity > 0
        ORDER BY a.allocated_at ASC
    ");
    $allocStmt->execute([':item_id' => $item_id]);
    while ($row = $allocStmt->fetch(PDO::FETCH_ASSOC)) {
        $transactions[] = [
            'date'      => date('M d, Y h:i A', strtotime($row['date'])),
            'type'      => 'OUT',
            'reference' => $row['reference'],
            'quantity'  => (int) $row['quantity'],
            'details'   => $row['details'],
            'raw_date'  => $row['date'],
        ];
    }

    // ── 4. Returns from distributions (negative qty rows) ─────────────
    $retDistStmt = $conn->prepare("
        SELECT
            d.distributed_at AS date,
            CONCAT('RET-DIST-', d.id) AS reference,
            ABS(d.quantity) AS quantity,
            CONCAT('Returned from ', COALESCE(d.department, ''), ' — ', COALESCE(d.recipient, '')) AS details
        FROM distributions d
        WHERE d.item_id = :item_id AND d.quantity < 0
        ORDER BY d.distributed_at ASC
    ");
    $retDistStmt->execute([':item_id' => $item_id]);
    while ($row = $retDistStmt->fetch(PDO::FETCH_ASSOC)) {
        $transactions[] = [
            'date'      => date('M d, Y h:i A', strtotime($row['date'])),
            'type'      => 'RETURN',
            'reference' => $row['reference'],
            'quantity'  => (int) $row['quantity'],
            'details'   => $row['details'],
            'raw_date'  => $row['date'],
        ];
    }

    // ── 5. Returns from allocations (negative qty rows) ───────────────
    $retAllocStmt = $conn->prepare("
        SELECT
            a.allocated_at AS date,
            CONCAT('RET-ALLOC-', a.id) AS reference,
            ABS(a.quantity) AS quantity,
            CONCAT('Returned from ', COALESCE(a.department, '')) AS details
        FROM allocations a
        WHERE a.item_id = :item_id AND a.quantity < 0
        ORDER BY a.allocated_at ASC
    ");
    $retAllocStmt->execute([':item_id' => $item_id]);
    while ($row = $retAllocStmt->fetch(PDO::FETCH_ASSOC)) {
        $transactions[] = [
            'date'      => date('M d, Y h:i A', strtotime($row['date'])),
            'type'      => 'RETURN',
            'reference' => $row['reference'],
            'quantity'  => (int) $row['quantity'],
            'details'   => $row['details'],
            'raw_date'  => $row['date'],
        ];
    }

    // ── Sort by date ASC ──────────────────────────────────────────────
    usort($transactions, fn($a, $b) => strtotime($a['raw_date']) - strtotime($b['raw_date']));

    // ── Running balance ───────────────────────────────────────────────
    $balance = 0;
    foreach ($transactions as &$tx) {
        if ($tx['type'] === 'OUT') {
            $balance -= $tx['quantity'];
        } else {
            $balance += $tx['quantity'];
        }
        $tx['balance'] = $balance;
        unset($tx['raw_date']);
    }
    unset($tx);

    // ── Summary ───────────────────────────────────────────────────────
    $totalIn      = array_sum(array_map(fn($t) => $t['type'] === 'IN'     ? $t['quantity'] : 0, $transactions));
    $totalOut     = array_sum(array_map(fn($t) => $t['type'] === 'OUT'    ? $t['quantity'] : 0, $transactions));
    $totalReturns = array_sum(array_map(fn($t) => $t['type'] === 'RETURN' ? $t['quantity'] : 0, $transactions));

    echo json_encode([
        'status'    => 'success',
        'item_info' => [
            'name'           => $item['name'],
            'category'       => $item['category']       ?? 'N/A',
            'classification' => $item['classification'] ?? 'N/A',
            'current_stock'  => (int) $item['current_stock'],
            'unit_price'     => $item['unit_price'],
        ],
        'data'    => $transactions,
        'summary' => [
            'total_in'      => $totalIn,
            'total_out'     => $totalOut,
            'total_returns' => $totalReturns,
            'txn_count'     => count($transactions),
            'current_stock' => (int) $item['current_stock'],
        ],
    ]);

} catch (PDOException $e) {
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}