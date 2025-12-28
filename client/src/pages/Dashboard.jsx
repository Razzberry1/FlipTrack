import { useState, useEffect } from 'react';
import { useSales, useOverhead, useInventory } from '../hooks/useApi';
import Loading from '../components/Loading';
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from 'recharts';

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [platformStats, setPlatformStats] = useState([]);
  const [categoryStats, setCategoryStats] = useState([]);
  const [monthlyStats, setMonthlyStats] = useState([]);
  const [recentSales, setRecentSales] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [overhead, setOverhead] = useState({ total: 0, by_category: [] });
  const [loading, setLoading] = useState(true);

  const salesApi = useSales();
  const overheadApi = useOverhead();
  const inventoryApi = useInventory();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [
          statsData,
          platformData,
          categoryData,
          monthlyData,
          recentData,
          inventoryData,
          overheadData,
        ] = await Promise.all([
          salesApi.getStats(),
          salesApi.getByPlatform(),
          salesApi.getByCategory(),
          salesApi.getMonthly(),
          salesApi.getRecent(10),
          inventoryApi.getAll({ status: 'Delivered' }),
          overheadApi.getCurrentMonth(),
        ]);

        setStats(statsData);
        setPlatformStats(platformData);
        setCategoryStats(categoryData);
        setMonthlyStats(monthlyData);
        setRecentSales(recentData);
        setOverhead(overheadData);

        // Find low stock items (qty < 2)
        const low = inventoryData.filter(
          (item) => item.quantity_in_stock > 0 && item.quantity_in_stock < 2
        );
        setLowStock(low);
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
        <Loading />
      </div>
    );
  }

  const COLORS = ['#3f3f46', '#71717a', '#a1a1aa', '#d4d4d8', '#e4e4e7'];

  const formatCurrency = (val) => `$${val.toFixed(2)}`;
  const formatPercent = (val) => `${val.toFixed(1)}%`;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-6">
        <StatCard
          title="Total Revenue"
          value={formatCurrency(stats?.total_revenue || 0)}
          subtitle="All sales"
        />
        <StatCard
          title="Total Profit"
          value={formatCurrency(stats?.total_profit || 0)}
          valueClass={(stats?.total_profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}
          subtitle={`${stats?.total_sales || 0} sales`}
        />
        <StatCard
          title="Overall ROI"
          value={formatPercent(stats?.overall_roi || 0)}
          valueClass={(stats?.overall_roi || 0) >= 0 ? 'text-green-600' : 'text-red-600'}
        />
        <StatCard
          title="Items In Stock"
          value={stats?.items_in_stock || 0}
          subtitle="Delivered, unsold"
        />
        <StatCard
          title="Pending Orders"
          value={stats?.pending_orders || 0}
          subtitle="Not delivered"
        />
        <StatCard
          title="Inventory Value"
          value={formatCurrency(stats?.inventory_value || 0)}
          subtitle="At buy price"
        />
        <StatCard
          title="Unpaid Card Balance"
          value={formatCurrency(stats?.unpaid_card_balance || 0)}
          valueClass="text-red-600"
          subtitle="To pay off"
        />
        <StatCard
          title="Sell-Through Rate"
          value={formatPercent(stats?.sell_through_rate || 0)}
          subtitle="Sold / Total"
        />
        <StatCard
          title="Monthly Overhead"
          value={formatCurrency(overhead?.total || 0)}
          subtitle="Current month"
        />
        <StatCard
          title="Net Profit"
          value={formatCurrency((stats?.total_profit || 0) - (overhead?.total || 0))}
          valueClass={(stats?.total_profit || 0) - (overhead?.total || 0) >= 0 ? 'text-green-600' : 'text-red-600'}
          subtitle="After overhead"
        />
      </div>

      {/* Platform Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="card p-4">
          <h2 className="text-lg font-semibold mb-4">Platform Comparison</h2>
          {platformStats.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No sales data yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="text-sm">
                <thead>
                  <tr>
                    <th>Platform</th>
                    <th>Items Sold</th>
                    <th>Revenue</th>
                    <th>Profit</th>
                    <th>Avg ROI</th>
                  </tr>
                </thead>
                <tbody>
                  {platformStats.map((p) => (
                    <tr key={p.sell_platform}>
                      <td>{p.sell_platform}</td>
                      <td>{p.items_sold}</td>
                      <td>${p.revenue.toFixed(2)}</td>
                      <td className={p.profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                        ${p.profit.toFixed(2)}
                      </td>
                      <td className={p.avg_roi >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {p.avg_roi.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card p-4">
          <h2 className="text-lg font-semibold mb-4">Revenue by Platform</h2>
          {platformStats.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No sales data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={platformStats}
                  dataKey="revenue"
                  nameKey="sell_platform"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {platformStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(val) => `$${val.toFixed(2)}`} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Category Breakdown & Monthly Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="card p-4">
          <h2 className="text-lg font-semibold mb-4">Profit by Category</h2>
          {categoryStats.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No sales data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={categoryStats} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(val) => `$${val}`} />
                <YAxis dataKey="category" type="category" width={100} />
                <Tooltip formatter={(val) => `$${val.toFixed(2)}`} />
                <Bar dataKey="profit" fill="#3f3f46" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card p-4">
          <h2 className="text-lg font-semibold mb-4">Monthly Profit Trend</h2>
          {monthlyStats.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No sales data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={monthlyStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(val) => `$${val}`} />
                <Tooltip formatter={(val) => `$${val.toFixed(2)}`} />
                <Legend />
                <Line type="monotone" dataKey="profit" stroke="#22c55e" name="Profit" />
                <Line type="monotone" dataKey="revenue" stroke="#3f3f46" name="Revenue" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Recent Sales & Low Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-4">
          <h2 className="text-lg font-semibold mb-4">Recent Sales</h2>
          {recentSales.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No sales yet</p>
          ) : (
            <div className="space-y-3">
              {recentSales.map((sale) => (
                <div
                  key={sale.id}
                  className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700 last:border-0"
                >
                  <div>
                    <p className="font-medium text-sm">{sale.item_name}</p>
                    <p className="text-xs text-gray-500">
                      {sale.sell_platform} | {new Date(sale.date_sold).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`font-medium ${sale.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${sale.profit.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500">{sale.roi_percent.toFixed(1)}% ROI</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-4">
          <h2 className="text-lg font-semibold mb-4">Low Stock Alerts</h2>
          {lowStock.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No low stock items</p>
          ) : (
            <div className="space-y-3">
              {lowStock.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700 last:border-0"
                >
                  <div>
                    <p className="font-medium text-sm">{item.item_name}</p>
                    <p className="text-xs text-gray-500 font-mono">{item.sku}</p>
                  </div>
                  <div className="text-right">
                    <span className="badge badge-yellow">
                      {item.quantity_in_stock} left
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, subtitle, valueClass = '' }) {
  return (
    <div className="card p-4">
      <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
      <p className={`text-2xl font-bold mt-1 ${valueClass}`}>{value}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
    </div>
  );
}

export default Dashboard;
