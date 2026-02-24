<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Inventory System</title>
<link href="../front/css/output.css" rel="stylesheet">
<body class="bg-gray-100 min-h-screen">

<!-- Navigation -->
<nav class="bg-gradient-to-r from-slate-50 to-blue-50 backdrop-blur-sm border-b border-slate-200/60 shadow-sm">
  <div class="max-w-7xl mx-auto px-8 py-4">
    <div class="flex justify-between items-center">
      <!-- Logo/Brand -->
     <div class="flex items-center space-x-3">
  <div class="w-10 h-10 rounded-lg shadow-md overflow-hidden">
    <img src='../includes/Logo.png' alt="Logo" class="w-full h-full object-cover">
  </div>
  <div>
          <h1 class="text-xl font-semibold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
            Smart Inventory
          </h1>
          <p class="text-xs text-slate-500 -mt-0.5">Management System</p>
        </div>
      </div>
      
      <!-- Navigation Links -->
      <div class="flex items-center space-x-2">
        <a href="../pages/dashboard.php" class="group relative px-5 py-2.5 text-slate-600 hover:text-blue-700 font-medium transition-all duration-300 rounded-lg hover:bg-white hover:shadow-md hover:scale-105">
          <span class="relative z-10">Dashboard</span>
          <div class="absolute inset-0 bg-gradient-to-r from-blue-100 to-blue-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg"></div>
        </a>

        <a href="../pages/allitems.php" class="group relative px-5 py-2.5 text-slate-600 hover:text-blue-700 font-medium transition-all duration-300 rounded-lg hover:bg-white hover:shadow-md hover:scale-105">
          <span class="relative z-10">All Items</span>
          <div class="absolute inset-0 bg-gradient-to-r from-blue-100 to-blue-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg"></div>
        </a>

        <a href="../pages/allocation.php" class="group relative px-5 py-2.5 text-slate-600 hover:text-blue-700 font-medium transition-all duration-300 rounded-lg hover:bg-white hover:shadow-md hover:scale-105">
          <span class="relative z-10">Allocation</span>
          <div class="absolute inset-0 bg-gradient-to-r from-blue-100 to-blue-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg"></div>
        </a>

        <a href="../pages/distributions.php" class="group relative px-5 py-2.5 text-slate-600 hover:text-blue-700 font-medium transition-all duration-300 rounded-lg hover:bg-white hover:shadow-md hover:scale-105">
          <span class="relative z-10">Distributions</span>
          <div class="absolute inset-0 bg-gradient-to-r from-blue-100 to-blue-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg"></div>
        </a>

        <a href="../pages/items.php" class="group relative px-5 py-2.5 text-slate-600 hover:text-blue-700 font-medium transition-all duration-300 rounded-lg hover:bg-white hover:shadow-md hover:scale-105">
          <span class="relative z-10">Manage Items</span>
          <div class="absolute inset-0 bg-gradient-to-r from-blue-100 to-blue-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg"></div>
        </a>

            <!-- USER + LOGOUT -->
    <div class="flex items-center space-x-2 ml-4">
        <a href="../logout.php" class="group relative px-5 py-2.5 text-slate-600 hover:text-blue-700 font-medium transition-all duration-300 rounded-lg hover:bg-white hover:shadow-md hover:scale-105">
            <span class="relative z-10">Logout</span>
        </a>
    </div>
      </div>
    </div>
  </div>
</nav>
