import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Chart from 'chart.js/auto';
import { useAuth } from '../context/AuthContext.jsx';
import { fetchDashboardData } from '../api/dashboard.js';
import { fetchAllOverview, fetchCategories, fetchItems, fetchSuppliers } from '../api/items.js';
import { fetchInspectionRequests } from '../api/inspectionRequests.js';
import AppIcon from '../components/AppIcon.jsx';
import './Dashboard.css';

const numberFormat = new Intl.NumberFormat('en-PH');
const pesoFormat = new Intl.NumberFormat('en-PH', {
  style: 'currency', currency: 'PHP', minimumFractionDigits: 2, maximumFractionDigits: 2,
});

function MiniBars({ values }) {
  const normalized = values?.length ? values.slice(0, 8) : [0, 0, 0, 0, 0, 0];
  const max = Math.max(...normalized, 1);
  return (
    <span className="inventory-mini-bars" aria-hidden="true">
      {normalized.map((value, index) => <i key={index} style={{ height: `${Math.max((value / max) * 100, 12)}%` }} />)}
    </span>
  );
}

function MetricCard({ label, value, note, icon, tone, values, onClick }) {
  return (
    <button type="button" className={`inventory-kpi inventory-kpi-${tone}`} onClick={onClick}>
      <span className="inventory-kpi-top">
        <span className="inventory-kpi-icon"><AppIcon name={icon} size={18} /></span>
        <span className="inventory-arrow"><AppIcon name="arrowRight" size={17} /></span>
      </span>
      <span className="inventory-kpi-copy"><span>{label}</span><strong>{value}</strong><small>{note}</small></span>
      <MiniBars values={values} />
    </button>
  );
}

function DashboardSkeleton() {
  return <div className="inventory-loading" aria-label="Loading dashboard">{Array.from({ length: 4 }).map((_, index) => <span key={index} />)}</div>;
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const categoryChartRef = useRef(null);
  const stockChartRef = useRef(null);
  const categoryChartInstance = useRef(null);
  const stockChartInstance = useRef(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showLowStock, setShowLowStock] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('inventory_dashboard_theme') === 'dark' ? 'dark' : 'light');
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let active = true;
    fetchDashboardData()
      .then((result) => { if (active) setData(result); })
      .catch((err) => { if (active) setError(err.message || 'The dashboard could not be loaded.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!data) return undefined;
    const warmCommonScreens = () => {
      void Promise.allSettled([
        fetchItems({ page: 1, limit: 15, sort_field: 'date_procured', sort_dir: 'desc' }),
        fetchAllOverview(),
        fetchCategories(),
        fetchSuppliers(),
        fetchInspectionRequests({ limit: 100 }),
      ]);
    };
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(warmCommonScreens, { timeout: 1_500 });
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(warmCommonScreens, 400);
    return () => window.clearTimeout(id);
  }, [data]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => { localStorage.setItem('inventory_dashboard_theme', theme); }, [theme]);

  useEffect(() => {
    if (!data?.chart_data || !categoryChartRef.current || !stockChartRef.current) return undefined;
    const { labels = [], item_counts = [], stock_counts = [] } = data.chart_data;
    const dark = theme === 'dark';
    const labelColor = dark ? '#9fb1cf' : '#607395';
    const gridColor = dark ? 'rgba(127,154,196,.14)' : 'rgba(148,163,184,.14)';

    categoryChartInstance.current?.destroy();
    stockChartInstance.current?.destroy();
    categoryChartInstance.current = new Chart(categoryChartRef.current, {
      type: 'doughnut',
      data: { labels, datasets: [{ data: item_counts, backgroundColor: ['#1766ef','#11b981','#f3a51f','#6d5ce7','#00a9c5','#ef5b6a','#86a6d5'], borderColor: dark ? '#13213a' : '#ffffff', borderWidth: 3, hoverOffset: 4 }] },
      options: { responsive: true, maintainAspectRatio: false, cutout: '69%', plugins: { legend: { display: false }, tooltip: { backgroundColor: dark ? '#0a1324' : '#10244b', padding: 11, cornerRadius: 8, displayColors: true } } },
    });
    stockChartInstance.current = new Chart(stockChartRef.current, {
      type: 'bar',
      data: { labels, datasets: [{ label: 'Units in stock', data: stock_counts, backgroundColor: '#1766ef', hoverBackgroundColor: '#0b53d0', borderRadius: 7, borderSkipped: false, maxBarThickness: 58 }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { backgroundColor: dark ? '#0a1324' : '#10244b', padding: 11, cornerRadius: 8 } },
        scales: {
          y: { beginAtZero: true, ticks: { color: labelColor, precision: 0, font: { size: 10 } }, grid: { color: gridColor }, border: { display: false } },
          x: { ticks: { color: labelColor, font: { size: 10 }, maxRotation: 0, autoSkip: true }, grid: { display: false }, border: { display: false } },
        },
      },
    });
    return () => { categoryChartInstance.current?.destroy(); stockChartInstance.current?.destroy(); };
  }, [data, theme]);

  const stats = data?.stats ?? {};
  const labels = data?.chart_data?.labels ?? [];
  const itemCounts = data?.chart_data?.item_counts ?? [];
  const stockCounts = data?.chart_data?.stock_counts ?? [];
  const recentItems = data?.recent_items ?? [];
  const lowStockItems = data?.low_stock_items_list ?? [];
  const healthyItems = Math.max((stats.total_items ?? 0) - (stats.low_stock_items ?? 0), 0);
  const totalStock = stockCounts.reduce((sum, value) => sum + value, 0);
  const legendRows = useMemo(() => labels.map((label, index) => ({
    label, value: itemCounts[index] ?? 0,
    color: ['#1766ef','#11b981','#f3a51f','#6d5ce7','#00a9c5','#ef5b6a','#86a6d5'][index % 7],
  })), [labels, itemCounts]);
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening';
  const firstName = user?.full_name?.split(' ')[0] || user?.name?.split(' ')[0] || user?.username || 'User';
  const dateLabel = now.toLocaleDateString('en-PH', { month: 'short', day: '2-digit', year: 'numeric' });
  const metrics = [
    { label: 'Total Items', value: numberFormat.format(stats.total_items ?? 0), note: 'Active inventory records', icon: 'package', tone: 'blue', route: '/allitems', values: itemCounts },
    { label: 'Categories', value: numberFormat.format(stats.total_categories ?? 0), note: 'Organized stock groups', icon: 'categories', tone: 'green', route: '/allitems', values: itemCounts.slice().reverse() },
    { label: 'Low Stock', value: numberFormat.format(stats.low_stock_items ?? 0), note: stats.low_stock_items ? 'Items need attention' : 'Stock levels look healthy', icon: 'alert', tone: 'amber', action: () => setShowLowStock(true), values: lowStockItems.map((item) => item.quantity) },
    { label: 'Inventory Value', value: pesoFormat.format(stats.total_value ?? 0), note: 'Current total worth', icon: 'barChart', tone: 'violet', route: '/allitems', values: stockCounts },
  ];

  if (error) return (
    <main className="inventory-dashboard inventory-dashboard-error"><div><span><AppIcon name="alert" size={22} /></span><h1>Dashboard unavailable</h1><p>{error}</p><button type="button" onClick={() => window.location.reload()}>Try again</button></div></main>
  );

  return (
    <main className={`inventory-dashboard inventory-theme-${theme}`}>
      <div className="inventory-dashboard-inner">
        <header className="inventory-welcome">
          <div><span className="inventory-eyebrow"><AppIcon name="shield" size={14} /> Management overview</span><h1>{greeting}, {firstName}!</h1><p>Here is what is happening with Smart Inventory today.</p></div>
          <div className="inventory-header-actions">
            <button type="button" className="inventory-header-button" onClick={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}><AppIcon name={theme === 'dark' ? 'sun' : 'moon'} size={16} />{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</button>
            <span className="inventory-date"><AppIcon name="clock" size={15} />{dateLabel}</span>
            <button type="button" className="inventory-primary-action" onClick={() => navigate('/allitems')}><AppIcon name="boxes" size={16} /> View Inventory</button>
          </div>
        </header>

        {loading ? <DashboardSkeleton /> : <section className="inventory-kpis" aria-label="Inventory summary">{metrics.map((metric) => <MetricCard key={metric.label} {...metric} onClick={metric.action ?? (() => navigate(metric.route))} />)}</section>}

        {!loading && <div className="inventory-dashboard-grid">
          <section className="inventory-card inventory-overview-card">
            <div className="inventory-card-head"><div><h2>Inventory Overview</h2><p>Item distribution by category</p></div></div>
            <div className="inventory-overview-body">
              <div className="inventory-donut-wrap"><canvas ref={categoryChartRef} aria-label="Items by category chart" /><div><strong>{numberFormat.format(stats.total_items ?? 0)}</strong><span>Total items</span></div></div>
              <div className="inventory-legend">{legendRows.length === 0 ? <p className="inventory-empty">No categories yet.</p> : legendRows.map((row) => <button type="button" key={row.label} onClick={() => navigate('/allitems')}><i style={{ backgroundColor: row.color }} /><span title={row.label}>{row.label}</span><strong>{numberFormat.format(row.value)}</strong></button>)}</div>
            </div>
          </section>

          <section className="inventory-card inventory-recent-card">
            <div className="inventory-card-head"><div><h2>Recently Added Items</h2><p>Latest additions to inventory</p></div><button type="button" onClick={() => navigate('/allitems')}>View all <AppIcon name="arrowRight" size={13} /></button></div>
            <div className="inventory-recent-list">{recentItems.length === 0 ? <p className="inventory-empty">No recent items available.</p> : recentItems.map((item, index) => <button type="button" key={`${item.name}-${index}`} onClick={() => navigate('/allitems')}><span className="inventory-recent-icon"><AppIcon name="package" size={15} /></span><span className="inventory-recent-copy"><strong>{item.name}</strong><small>{item.category || 'Uncategorized'}</small></span><span className="inventory-recent-meta"><b className={Number(item.quantity) <= 10 ? 'low' : 'good'}>{numberFormat.format(item.quantity)} in stock</b><small>{pesoFormat.format(Number(item.unit_price) || 0)}</small></span></button>)}</div>
          </section>

          <section className="inventory-card inventory-quick-card">
            <div className="inventory-card-head"><div><h2>Quick Actions</h2><p>Common inventory tasks</p></div></div>
            <div className="inventory-quick-grid"><button type="button" onClick={() => navigate('/items')}><AppIcon name="plus" size={16} />Add Item</button><button type="button" onClick={() => navigate('/allitems')}><AppIcon name="search" size={16} />Browse Items</button><button type="button" onClick={() => navigate('/allocation')}><AppIcon name="layers" size={16} />Allocate Stock</button><button type="button" onClick={() => navigate('/distributions')}><AppIcon name="truck" size={16} />Distributions</button></div>
            <div className="inventory-health-strip"><span><AppIcon name="check" size={17} /></span><div><strong>System Operational</strong><small>Inventory services are available</small></div></div>
          </section>

          <section className="inventory-card inventory-stock-chart-card">
            <div className="inventory-card-head"><div><h2>Stock by Category</h2><p>Total units currently available</p></div><span className="inventory-live"><i /> Live data</span></div>
            <div className="inventory-stock-chart"><canvas ref={stockChartRef} aria-label="Stock by category chart" /></div>
          </section>

          <section className="inventory-card inventory-status-card">
            <div className="inventory-card-head"><div><h2>Stock Health</h2><p>Current inventory condition</p></div></div>
            <button type="button" className="inventory-outcome healthy" onClick={() => navigate('/allitems')}><span><AppIcon name="check" size={19} /></span><div><strong>{numberFormat.format(healthyItems)}</strong><small>Well-stocked items</small></div><AppIcon name="arrowRight" size={15} /></button>
            <button type="button" className="inventory-outcome warning" onClick={() => setShowLowStock(true)}><span><AppIcon name="alert" size={19} /></span><div><strong>{numberFormat.format(stats.low_stock_items ?? 0)}</strong><small>Low-stock items</small></div><AppIcon name="arrowRight" size={15} /></button>
            <div className="inventory-total-stock"><span>Total units on hand</span><strong>{numberFormat.format(totalStock)}</strong></div>
          </section>
        </div>}
      </div>

      {showLowStock && <div className="inventory-modal-backdrop" role="presentation" onMouseDown={() => setShowLowStock(false)}>
        <section className="inventory-low-stock-modal" role="dialog" aria-modal="true" aria-labelledby="low-stock-title" onMouseDown={(event) => event.stopPropagation()}>
          <div className="inventory-modal-head"><div><span><AppIcon name="alert" size={19} /></span><div><h2 id="low-stock-title">Low Stock Items</h2><p>Items with fewer than 10 units remaining</p></div></div><button type="button" onClick={() => setShowLowStock(false)} aria-label="Close low stock items"><AppIcon name="x" size={18} /></button></div>
          <div className="inventory-low-stock-list">{lowStockItems.length === 0 ? <div className="inventory-all-good"><span><AppIcon name="check" size={22} /></span><strong>All items are well stocked</strong><p>Nothing needs your attention right now.</p></div> : lowStockItems.map((item, index) => <div key={`${item.name}-${index}`}><span className="inventory-recent-icon"><AppIcon name="package" size={15} /></span><div><strong>{item.name}</strong><small>{item.category || 'Uncategorized'}</small></div><b className={Number(item.quantity) === 0 ? 'empty' : ''}>{Number(item.quantity) === 0 ? 'Out of stock' : `${numberFormat.format(item.quantity)} left`}</b></div>)}</div>
          <div className="inventory-modal-footer"><span>{lowStockItems.length} item{lowStockItems.length === 1 ? '' : 's'} need attention</span><button type="button" onClick={() => navigate('/items')}>Manage Items</button></div>
        </section>
      </div>}
    </main>
  );
}
