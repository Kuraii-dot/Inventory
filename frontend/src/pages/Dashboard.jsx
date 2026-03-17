// frontend/src/pages/Dashboard.jsx
// Converted from: pages/dashboard.php
//
// PHP: server-side PHP queries → inline <script> with json_encode() → Chart.js
// React: useEffect API call → useState → Chart.js via useEffect on canvas ref
//
// Key conversions:
//   <?= $totalItems ?>            → stats.total_items
//   json_encode($categoryLabels)  → chart_data.labels
//   json_encode($itemCounts)      → chart_data.item_counts
//   new Chart(canvas, config)     → useEffect with Chart.js instance

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { fetchDashboardData } from '../api/dashboard.js';
import Chart from 'chart.js/auto';

// ── Stat Card ────────────────────────────────────────────────
function StatCard({ icon, label, value, badge, badgeColor, accentColor, note, noteColor, popup }) {
  const [showPopup, setShowPopup] = useState(false);

  return (
    <div
      className="group relative bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-100 hover:scale-105 overflow-visible cursor-pointer"
      onMouseEnter={() => popup && setShowPopup(true)}
      onMouseLeave={() => setShowPopup(false)}
      onClick={() => popup && setShowPopup(v => !v)}
    >
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${accentColor} rounded-full -mr-16 -mt-16`} />
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <div className={`w-12 h-12 bg-gradient-to-br ${accentColor.replace('/10', '')} rounded-xl flex items-center justify-center shadow-md`}>
            <span className="text-white text-xl">{icon}</span>
          </div>
          <span className={`text-xs font-medium ${badgeColor} px-3 py-1 rounded-full`}>{badge}</span>
        </div>
        <h2 className="text-sm font-medium text-slate-500 mb-1">{label}</h2>
        <p className="text-3xl font-bold text-slate-800">{value}</p>
        <div className={`mt-3 flex items-center text-xs ${noteColor ?? 'text-slate-500'}`}>{note}</div>
        {popup && (
          <div className="mt-2 text-xs text-amber-600 font-medium flex items-center gap-1">
            <span>👁</span><span>Hover to see items</span>
          </div>
        )}
      </div>

      {/* Popup panel */}
      {popup && showPopup && (
        <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-xl shadow-2xl border border-amber-200 z-50 overflow-hidden">
          <div className="bg-gradient-to-r from-amber-500 to-red-500 px-4 py-3">
            <p className="text-white font-semibold text-sm">⚠️ Low Stock Items</p>
            <p className="text-amber-100 text-xs">Items with quantity below 10</p>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {popup.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-6">All items are well stocked! ✅</p>
            ) : popup.map((item, i) => (
              <div key={i} className={`flex items-center justify-between px-4 py-3 border-b border-slate-100 last:border-0 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                <div>
                  <p className="text-sm font-medium text-slate-800">{item.name}</p>
                  <p className="text-xs text-slate-400">{item.category}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                  item.quantity === 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {item.quantity === 0 ? 'Out of stock' : `${item.quantity} left`}
                </span>
              </div>
            ))}
          </div>
          {popup.length > 0 && (
            <div className="px-4 py-2 bg-amber-50 border-t border-amber-100">
              <p className="text-xs text-amber-600 text-center">{popup.length} item{popup.length !== 1 ? 's' : ''} need restocking</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  // Chart refs — mirrors: document.getElementById('itemsByCategoryChart')
  const barChartRef  = useRef(null);
  const pieChartRef  = useRef(null);
  const barInstance  = useRef(null);
  const pieInstance  = useRef(null);

  // Fetch data — mirrors: the PHP queries at the top of dashboard.php
  useEffect(() => {
    fetchDashboardData()
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // Build charts — mirrors: the two `new Chart(...)` calls in dashboard.php <script>
  useEffect(() => {
    if (!data?.chart_data || !barChartRef.current || !pieChartRef.current) return;

    const { labels, item_counts, stock_counts } = data.chart_data;

    // Destroy old instances to avoid "canvas already in use" error
    barInstance.current?.destroy();
    pieInstance.current?.destroy();

    // ── Bar Chart: Items per Category ────────────────────────────
    // mirrors: new Chart(document.getElementById('itemsByCategoryChart'), { type: 'bar', ... })
    barInstance.current = new Chart(barChartRef.current, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Items',
          data: item_counts,
          backgroundColor: 'rgba(59, 130, 246, 0.8)',
          borderRadius: 8,
          borderWidth: 0,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            padding: 12,
            borderRadius: 8,
            titleColor: '#fff',
            bodyColor: '#cbd5e1',
            borderColor: 'rgba(148, 163, 184, 0.2)',
            borderWidth: 1,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { stepSize: 1, color: '#64748b', font: { size: 11 } },
            grid: { color: 'rgba(148, 163, 184, 0.1)', drawBorder: false },
          },
          x: {
            ticks: { color: '#64748b', font: { size: 11 } },
            grid: { display: false },
          },
        },
      },
    });

    // ── Doughnut Chart: Stock Distribution ───────────────────────
    // mirrors: new Chart(document.getElementById('stockDistributionChart'), { type: 'doughnut', ... })
    pieInstance.current = new Chart(pieChartRef.current, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data: stock_counts,
          backgroundColor: ['#3B82F6','#10B981','#F59E0B','#EF4444','#8B5CF6','#06B6D4','#84CC16'],
          borderWidth: 0,
          spacing: 2,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 15,
              usePointStyle: true,
              pointStyle: 'circle',
              font: { size: 11 },
              color: '#64748b',
            },
          },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            padding: 12,
            borderRadius: 8,
            titleColor: '#fff',
            bodyColor: '#cbd5e1',
            borderColor: 'rgba(148, 163, 184, 0.2)',
            borderWidth: 1,
          },
        },
        cutout: '65%',
      },
    });

    // Cleanup on unmount
    return () => {
      barInstance.current?.destroy();
      pieInstance.current?.destroy();
    };
  }, [data]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-yellow-50 to-slate-100 flex items-center justify-center">
        <div className="text-slate-500 animate-pulse text-lg">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-yellow-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 font-medium mb-2">Failed to load dashboard</p>
          <p className="text-slate-400 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  const { stats, recent_items } = data;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-yellow-50 to-slate-100">
      <div className="max-w-screen-xl mx-auto px-8 py-10">

        {/* Header — mirrors: h1 + p in dashboard.php */}
        <div className="mb-10">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-700 to-blue-600 bg-clip-text text-transparent mb-2">
            Inventory Overview
          </h1>
          <p className="text-slate-500 text-sm">Monitor your inventory performance and key metrics</p>
        </div>

        {/* Stats Grid — mirrors: the 4-card grid in dashboard.php */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <StatCard
            icon="📦" label="Total Items"
            value={stats.total_items.toLocaleString()}
            badge="Active" badgeColor="text-blue-600 bg-blue-50"
            accentColor="from-blue-500/10 to-transparent"
            note={<><span className="mr-1">↑</span> All inventory items</>}
            noteColor="text-green-600"
          />
          <StatCard
            icon="📂" label="Total Categories"
            value={stats.total_categories.toLocaleString()}
            badge="Organized" badgeColor="text-emerald-600 bg-emerald-50"
            accentColor="from-emerald-500/10 to-transparent"
            note="Categories tracked"
          />
          <StatCard
            icon="⚠️" label="Low Stock Items"
            value={stats.low_stock_items.toLocaleString()}
            badge="Alert" badgeColor="text-amber-600 bg-amber-50"
            accentColor="from-amber-500/10 to-transparent"
            note={<><span className="mr-1">!</span> {stats.low_stock_items === 0 ? 'All items well stocked' : `${stats.low_stock_items} item${stats.low_stock_items !== 1 ? 's' : ''} need restocking`}</>}
            noteColor="text-amber-600"
            popup={data.low_stock_items_list ?? []}
          />
          <StatCard
            icon="💰" label="Inventory Value"
            value={`₱${stats.total_value.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`}
            badge="Total" badgeColor="text-violet-600 bg-violet-50"
            accentColor="from-violet-500/10 to-transparent"
            note="Current total worth"
          />
        </div>

        {/* Charts — mirrors: the two Chart.js canvas elements */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
          {/* Bar chart */}
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 hover:shadow-lg transition-shadow duration-300">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Items per Category</h2>
                <p className="text-xs text-slate-500 mt-1">Distribution across categories</p>
              </div>
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <span className="text-blue-600">📊</span>
              </div>
            </div>
            {/* mirrors: <canvas id="itemsByCategoryChart" height="120"> */}
            <canvas ref={barChartRef} height={120} />
          </div>

          {/* Doughnut chart */}
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 hover:shadow-lg transition-shadow duration-300">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Stock Distribution</h2>
                <p className="text-xs text-slate-500 mt-1">Quantity breakdown by category</p>
              </div>
              <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
                <span className="text-emerald-600">📈</span>
              </div>
            </div>
            {/* mirrors: <canvas id="stockDistributionChart" height="120"> */}
            <canvas ref={pieChartRef} height={120} />
          </div>
        </div>

        {/* Recent Items Table — mirrors: the recent items PHP foreach table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-lg transition-shadow duration-300">
          <div className="px-8 py-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-transparent">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Recently Added Items</h2>
                <p className="text-xs text-slate-500 mt-1">Latest additions to your inventory</p>
              </div>
              {/* mirrors: <a href="./items.php"> */}
              <button onClick={() => navigate('/items')}
                className="group flex items-center space-x-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors">
                <span>View All</span>
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-slate-50/50">
                  {['Item Name','Category','Quantity','Unit Price'].map(h => (
                    <th key={h} className="py-4 px-8 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recent_items.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="py-12 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                          <span className="text-2xl">📦</span>
                        </div>
                        <p className="text-slate-500 font-medium">No recent items found</p>
                        <p className="text-slate-400 text-sm mt-1">Add your first item to get started</p>
                      </div>
                    </td>
                  </tr>
                ) : recent_items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-blue-50/30 transition-colors duration-150">
                    <td className="py-4 px-8">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center mr-3">
                          <span className="text-xs">📦</span>
                        </div>
                        <span className="font-medium text-slate-800">{item.name}</span>
                      </div>
                    </td>
                    <td className="py-4 px-8">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                        {item.category ?? 'Uncategorized'}
                      </span>
                    </td>
                    <td className="py-4 px-8">
                      <span className="text-slate-700 font-medium">{item.quantity}</span>
                    </td>
                    <td className="py-4 px-8">
                      {/* mirrors: ₱<?= number_format($item['unit_price'], 2) ?> */}
                      <span className="text-slate-700 font-semibold">
                        ₱{parseFloat(item.unit_price).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}