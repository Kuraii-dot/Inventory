<?php
include '../../includes/db.php';
$stmt = $conn->query("SELECT * FROM categories");
?>

<div id="categoryList">
  <table>
    <thead>
      <tr><th>Name</th><th>Actions</th></tr>
    </thead>
    <tbody>
      <?php while ($row = $stmt->fetch(PDO::FETCH_ASSOC)): ?>
      <tr>
        <td><?= htmlspecialchars($row['name']) ?></td>
        <td>
          <button class="edit-category" data-id="<?= $row['id'] ?>" data-name="<?= htmlspecialchars($row['name']) ?>">Edit</button>
          <button class="delete-category" data-id="<?= $row['id'] ?>">Delete</button>
        </td>
      </tr>
      <?php endwhile; ?>
    </tbody>
  </table>
</div>
