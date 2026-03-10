<?php
// includes/db.php

$host = 'localhost';
$dbname = 'inventory_db';
$user = 'postgres';
$pass = 'CCWD123';
$port = '5432';

try {
    $conn = new PDO("pgsql:host=$host;port=$port;dbname=$dbname", $user, $pass);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    // echo "✅ Database connected successfully!";
} catch (PDOException $e) {
    die("❌ Database connection failed: " . $e->getMessage());
}
?>
