<?php
// includes/db.php

// This part looks for the .env file in the folder above
$envFile = __DIR__ . '/../.env'; 

if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue; 
        $parts = explode('=', $line, 2);
        if (count($parts) === 2) {
            putenv(trim($parts[0]) . "=" . trim($parts[1]));
        }
    }
}

// These lines grab the info from the .env file
$host = getenv('DB_HOST');
$dbname = getenv('DB_NAME');
$user = getenv('DB_USER');
$pass = getenv('DB_PASS');
$port = getenv('DB_PORT');

try {
    // 1. Get the Endpoint ID (it's the first part of your host before the first dot)
    // For you, it is: ep-steep-dew-a1qnkdl1-pooler
    $endpointId = explode('.', $host)[0];

    // 2. Add the endpoint to the connection string (DSN)
    $dsn = "pgsql:host=$host;port=$port;dbname=$dbname;sslmode=require;options=endpoint=$endpointId";
    
    $conn = new PDO($dsn, $user, $pass);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // If this runs, you are officially connected to the cloud!
} catch (PDOException $e) {
    die("❌ Connection failed: " . $e->getMessage());
}
?>