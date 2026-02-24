    </main>

    <!-- Footer -->
    <footer class="mt-auto bg-gray-200 text-center py-3 text-sm text-gray-600">
      &copy; <?= date('Y') ?> Smart Inventory Management System
    </footer>
  </div>

  <!-- 📱 Mobile Sidebar Toggle -->
  <script>
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.querySelector('aside');
    if (menuToggle) {
      menuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('hidden');
      });
    }
  </script>
</body>
</html>
