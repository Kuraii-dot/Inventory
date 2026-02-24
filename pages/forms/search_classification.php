<?php
require_once('../../includes/db.php');

header('Content-Type: application/json');

if (!isset($_GET['category_id']) || $_GET['category_id'] === '') {
    echo json_encode([]);
    exit;
}

$category_id = $_GET['category_id'];

$sql = "SELECT id, classification_name
        FROM classifications
        WHERE category_id = :category_id
        ORDER BY classification_name";

$stmt = $conn->prepare($sql);
$stmt->execute(['category_id' => $category_id]);


$classifications = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo json_encode($classifications);
