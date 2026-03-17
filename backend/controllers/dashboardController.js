// backend/controllers/dashboardController.js
// Converted from: pages/dashboard.php PHP queries
//
// PHP fetched everything server-side and embedded into HTML
// Node.js returns it all as JSON for React to consume

import pool from '../db/pool.js';

// ─────────────────────────────────────────────────────────────
// GET /api/dashboard
// Returns all stats + chart data + recent items in one call
// Converted from: the 5 individual PHP queries at top of dashboard.php
// ─────────────────────────────────────────────────────────────
export async function getDashboardData(req, res) {
  try {
    // Run all queries in parallel — mirrors the 5 individual PHP $conn->query() calls
    const [
      totalItemsRes,
      totalCategoriesRes,
      totalSuppliersRes,
      lowStockRes,
      totalValueRes,
      lowStockListRes,
      recentItemsRes,
      categoryDataRes,
    ] = await Promise.all([
      // mirrors: SELECT COUNT(*) FROM items
      pool.query('SELECT COUNT(*) AS count FROM items'),

      // mirrors: SELECT COUNT(*) FROM categories
      pool.query('SELECT COUNT(*) AS count FROM categories'),

      // mirrors: SELECT COUNT(*) FROM suppliers
      pool.query('SELECT COUNT(*) AS count FROM suppliers'),

      // mirrors: SELECT COUNT(*) FROM items WHERE quantity < 5
      pool.query('SELECT COUNT(*) AS count FROM items WHERE quantity < 10'),

      // mirrors: SELECT COALESCE(SUM(quantity * unit_price), 0) FROM items
      pool.query('SELECT COALESCE(SUM(quantity * unit_price), 0) AS total FROM items'),

      // mirrors: low stock items list for hover panel
      pool.query(`
        SELECT i.name, i.quantity, c.name AS category
        FROM items i
        LEFT JOIN categories c ON i.category_id = c.id
        WHERE i.quantity < 10
        ORDER BY i.quantity ASC
        LIMIT 20
      `),

      // mirrors: latest 5 items query
      pool.query(`
        SELECT i.name, i.quantity, i.unit_price, c.name AS category
        FROM items i
        LEFT JOIN categories c ON i.category_id = c.id
        ORDER BY i.id DESC
        LIMIT 5
      `),

      // mirrors: category chart data query
      pool.query(`
        SELECT
          c.name                          AS category,
          COUNT(i.id)                     AS item_count,
          COALESCE(SUM(i.quantity), 0)    AS total_stock
        FROM categories c
        LEFT JOIN items i ON i.category_id = c.id
        GROUP BY c.id, c.name
        ORDER BY c.name ASC
      `),
    ]);

    // mirrors: PHP $categoryLabels[], $itemCounts[], $stockCounts[] arrays
    const categoryData = categoryDataRes.rows;

    res.json({
      stats: {
        total_items:      parseInt(totalItemsRes.rows[0].count),
        total_categories: parseInt(totalCategoriesRes.rows[0].count),
        total_suppliers:  parseInt(totalSuppliersRes.rows[0].count),
        low_stock_items:  parseInt(lowStockRes.rows[0].count),
        total_value:      parseFloat(totalValueRes.rows[0].total),
      },
      recent_items:     recentItemsRes.rows,
      low_stock_items_list: lowStockListRes.rows,
      chart_data: {
        // mirrors: json_encode($categoryLabels), json_encode($itemCounts), json_encode($stockCounts)
        labels:       categoryData.map(r => r.category),
        item_counts:  categoryData.map(r => parseInt(r.item_count)),
        stock_counts: categoryData.map(r => parseInt(r.total_stock)),
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Error loading dashboard data: ' + err.message });
  }
}