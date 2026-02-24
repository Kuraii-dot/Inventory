<?php
session_start();
require_once "includes/db.php";

$error = "";

if ($_SERVER["REQUEST_METHOD"] === "POST") {

    $username = trim($_POST["username"] ?? "");
    $password = trim($_POST["password"] ?? "");

    if ($username === "" || $password === "") {
        $error = "All fields are required.";
    } else {

        $sql = "
            SELECT id, username, password, role
            FROM users
            WHERE username = :username
            LIMIT 1
        ";

        $stmt = $conn->prepare($sql);
        $stmt->execute([
            ':username' => $username
        ]);

        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($user && password_verify($password, $user['password'])) {

            // ✅ LOGIN SUCCESS
            $_SESSION['user_id']   = $user['id'];
            $_SESSION['username']  = $user['username'];
            $_SESSION['role']      = $user['role'];
            $_SESSION['logged_in'] = true;

            header("Location: pages/dashboard.php");
            exit;

        } else {
            $error = "Invalid username or password.";
        }
    }
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="front/css/output.css" rel="stylesheet">
  <title>Smart Inventory</title>

</head>
<body>

<section class="bg-gray-100">
  <div class="flex items-center justify-center min-h-screen p-6">
    <div class="relative flex flex-col m-6 space-y-8 bg-white shadow-2xl rounded-2xl md:space-y-0 max-w-md w-full overflow-hidden border border-slate-200">
      
      <!-- Login Form Section -->
      <div class="flex flex-col justify-center p-8 md:p-14 flex-1">
        <div class="text-center mb-8">
          <span class="text-3xl font-bold bg-gradient-to-r from-slate-700 to-blue-600 bg-clip-text text-transparent md:text-4xl">
            Smart Inventory System
          </span>
          <span class="mt-4 text-lg text-slate-500 block">
            Welcome! Please enter your account to proceed.
          </span>
        </div>
        
        <form method="POST" class="space-y-6">
          <div>
            <label class="block text-sm font-semibold text-slate-700 mb-2">Username</label>
            <input type="text"
                   name="username"
                   class="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 placeholder-slate-400" 
                   placeholder="Enter your username" />
          </div>
          
          <div>
            <label class="block text-sm font-semibold text-slate-700 mb-2">Password</label>
            <input type="password" 
                   name="password"
                   class="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 placeholder-slate-400" 
                   placeholder="Enter your password" />
          </div>
          
          <button type="submit" 
                  class="w-full py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-lg shadow-md hover:shadow-xl transition-all duration-300 hover:scale-105">
            Login
          </button>
        </form>
      </div>
      
      <!-- Image Section -->
      <div class="relative md:flex-1">
        <img src="/Projects/InventorySys/includes/BG.svg"
     alt="LOGO"
     class="w-full h-full object-cover rounded-r-2xl hidden md:block">
     </div>

        <!-- Overlay Text -->
        <div class="absolute hidden bottom-10 right-6 p-6 bg-white bg-opacity-30 backdrop-blur-sm rounded-xl drop-shadow-lg md:block max-w-sm">
          <span class="text-white text-xl font-medium leading-relaxed">
            Inventory Management System, Keeping Track Made Easy.<br>
            <span class="text-sm">multi-user access | real-time updates | detailed reports</span><br>
            <span class="text-lg font-bold">Streamline your inventory today!</span>
          </span>
        </div>
      </div>
    </div>
  </div>

</body>
</html>