<?php
// includes/db.php - Updated for Supabase

$host = getenv('DB_HOST');      // aws-1-ap-southeast-1.pooler.supabase.com
$dbname = getenv('DB_NAME');    // postgres
$user = getenv('DB_USER');      // postgres.mkawcgjmlpykppuorjqd
$pass = getenv('DB_PASS');      // Supabase DB password
$port = getenv('DB_PORT');      // 5432
$sslmode = 'require';           // Supabase requires SSL for pooler

try {
    // DSN with SSL included
    $dsn = "pgsql:host=$host;port=$port;dbname=$dbname;sslmode=$sslmode";
    $conn = new PDO($dsn, $user, $pass);

    // Keep your error mode and attribute settings intact
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    // echo "✅ Connected to Supabase successfully!";
} catch (PDOException $e) {
    die("❌ Database connection failed: " . $e->getMessage());
}
?>
