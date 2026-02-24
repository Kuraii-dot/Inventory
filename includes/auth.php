<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Not logged in
if (!isset($_SESSION['user_id'])) {
    header("Location: /InventorySys/index.php");
    exit;
}

/**
 * Require a specific role
 * Usage: requireRole('admin');
 */
function requireRole(string $role): void
{
    if (!isset($_SESSION['role']) || $_SESSION['role'] !== $role) {
        http_response_code(403);
        echo "Access denied.";
        exit;
    }
}
