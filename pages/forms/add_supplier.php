<?php
// ✅ Force JSON response
header('Content-Type: application/json');
error_reporting(E_ALL);
ini_set('display_errors', 0);

include __DIR__ . '/../../includes/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['status' => 'error', 'message' => 'Invalid request method.']);
    exit;
}

$name = isset($_POST['supplierName']) ? trim($_POST['supplierName']) : '';

if ($name === '') {
    echo json_encode(['status' => 'error', 'message' => 'Supplier name cannot be empty.']);
    exit;
}

try {
    // ✅ Insert new supplier
    $stmt = $conn->prepare("INSERT INTO suppliers (name) VALUES (:name)");
    $stmt->execute([':name' => $name]);

    // ✅ Fetch updated list
    $suppliers = $conn->query("SELECT * FROM suppliers ORDER BY id ASC")->fetchAll(PDO::FETCH_ASSOC);

    // Build HTML for the modal list
    $html = '';
    foreach ($suppliers as $sup) {
        $html .= '<li class="flex justify-between items-center bg-gray-100 px-3 py-2 rounded-md">';
        $html .= '<span>' . htmlspecialchars($sup['name']) . '</span>';
        $html .= '<div class="flex gap-2">';
        $html .= '<button class="edit-supplier bg-yellow-500 text-white px-2 py-1 rounded text-xs hover:bg-yellow-600" data-id="' . $sup['id'] . '" data-name="' . htmlspecialchars($sup['name']) . '">Edit</button>';
        $html .= '<button class="delete-supplier bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600" data-id="' . $sup['id'] . '">Delete</button>';
        $html .= '</div></li>';
    }

    echo json_encode([
        'status' => 'success',
        'message' => 'Supplier added successfully!',
        'html' => $html
    ]);

} catch (PDOException $e) {
    echo json_encode(['status' => 'error', 'message' => 'Database error: ' . $e->getMessage()]);
}
