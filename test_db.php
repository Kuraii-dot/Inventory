<?php
include 'includes/db.php';

$stmt = $conn->query("SELECT COUNT(*) FROM users");
$count = $stmt->fetchColumn();

echo "Connected! There are $count users in the database.";
?>
