<?php
// includes/db.php - Updated for Neon

$host = 'ep-frosty-paper-aiqukrya-pooler.c-4.us-east-1.aws.neon.tech';
$dbname = 'neondb';
$user = 'neondb_owner';
$pass = 'npg_ay1P4YiMDoXG';
$port = '5432';
$sslmode = 'require'; // Neon requires SSL

try {
    // DSN with SSL included
    $dsn = "pgsql:host=$host;port=$port;dbname=$dbname;sslmode=$sslmode";
    $conn = new PDO($dsn, $user, $pass);

    // Keep your error mode and attribute settings intact
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    // echo "✅ Connected to Neon successfully!";
} catch (PDOException $e) {
    die("❌ Database connection failed: " . $e->getMessage());
}
?>