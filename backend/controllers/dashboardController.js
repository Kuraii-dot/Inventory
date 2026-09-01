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
    const [statsRes, lowStockListRes, recentItemsRes, categoryDataRes] = await Promise.all([
      // Fetch scalar totals in one database round-trip.
      pool.query(`
        SELECT
          COUNT(*) AS total_items,
          COUNT(*) FILTER (WHERE quantity < 10) AS low_stock_items,
          COALESCE(SUM(quantity * unit_price), 0) AS total_value,
          (SELECT COUNT(*) FROM categories) AS total_categories,
          (SELECT COUNT(*) FROM suppliers) AS total_suppliers
        FROM items
      `),
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
    const stats = statsRes.rows[0];

    res.json({
      stats: {
        total_items:      parseInt(stats.total_items),
        total_categories: parseInt(stats.total_categories),
        total_suppliers:  parseInt(stats.total_suppliers),
        low_stock_items:  parseInt(stats.low_stock_items),
        total_value:      parseFloat(stats.total_value),
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
