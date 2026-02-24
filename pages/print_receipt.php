<?php
include '../includes/db.php';

if (!isset($_GET['id'])) {
    die("No receipt ID provided.");
}

$id = $_GET['id'];

$query = "SELECT d.*, i.name AS item_name, c.name AS category_name
          FROM distributions d
          JOIN items i ON d.item_id = i.id
          JOIN categories c ON d.category_id = c.id
          WHERE d.id = :id";
$stmt = $pdo->prepare($query);
$stmt->execute(['id' => $id]);
$dist = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$dist) {
    die("Receipt not found.");
}
?>
<!DOCTYPE html>
<html>
<head>
    <title>Distribution Receipt</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        .receipt-box {
            width: 100%;
            border: 1px solid #000;
            padding: 20px;
        }
        h2 { text-align: center; }
        .row { margin-bottom: 10px; }
        .label { font-weight: bold; }
        @media print {
            .no-print { display: none; }
        }
    </style>
</head>
<body>

<div class="receipt-box">
    <h2>Distribution Receipt</h2>

    <div class="row"><span class="label">Item:</span> <?= htmlspecialchars($dist['item_name']) ?></div>
    <div class="row"><span class="label">Category:</span> <?= htmlspecialchars($dist['category_name']) ?></div>
    <div class="row"><span class="label">Quantity:</span> <?= htmlspecialchars($dist['quantity']) ?></div>
    <div class="row"><span class="label">Department:</span> <?= htmlspecialchars($dist['department']) ?></div>
    <div class="row"><span class="label">Recipient:</span> <?= htmlspecialchars($dist['recipient']) ?></div>
    <div class="row"><span class="label">Purpose:</span> <?= htmlspecialchars($dist['purpose']) ?></div>
    <div class="row"><span class="label">Approved By:</span> <?= htmlspecialchars($dist['approved_by']) ?></div>
    <div class="row"><span class="label">Date Distributed:</span> <?= htmlspecialchars($dist['distributed_at']) ?></div>
</div>

<button onclick="window.print()" class="no-print" style="margin-top: 20px;">Print</button>

</body>
</html>
