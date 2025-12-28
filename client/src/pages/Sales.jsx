import { useState, useEffect } from 'react';
import { useSales } from '../hooks/useApi';
import Loading from '../components/Loading';
import toast from 'react-hot-toast';

function Sales() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    platform: 'all',
    payment_status: 'all',
    search: '',
    start_date: '',
    end_date: '',
  });

  const salesApi = useSales();

  const fetchSales = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.platform !== 'all') params.platform = filters.platform;
      if (filters.payment_status !== 'all') params.payment_status = filters.payment_status;
      if (filters.search) params.search = filters.search;
      if (filters.start_date) params.start_date = filters.start_date;
      if (filters.end_date) params.end_date = filters.end_date;

      const data = await salesApi.getAll(params);
      setSales(data);
    } catch (err) {
      toast.error('Failed to fetch sales');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, [filters]);

  const handleUpdateSale = async (id, field, value) => {
    try {
      await salesApi.update(id, { [field]: value });
      toast.success('Sale updated');
      fetchSales();
    } catch (err) {
      toast.error(err.message || 'Failed to update sale');
    }
  };

  const handleDeleteSale = async (id) => {
    if (!confirm('Are you sure you want to delete this sale? This will restore inventory stock.')) return;

    try {
      await salesApi.remove(id);
      toast.success('Sale deleted');
      fetchSales();
    } catch (err) {
      toast.error(err.message || 'Failed to delete sale');
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Calculate totals
  const totals = sales.reduce(
    (acc, sale) => ({
      revenue: acc.revenue + sale.payout_amount,
      profit: acc.profit + sale.profit,
      shipping: acc.shipping + sale.shipping_cost,
    }),
    { revenue: 0, profit: 0, shipping: 0 }
  );

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Sales</h1>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {sales.length} sales | ${totals.revenue.toFixed(2)} revenue | ${totals.profit.toFixed(2)} profit
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Search</label>
            <input
              type="text"
              placeholder="Search by name or SKU..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Platform</label>
            <select
              value={filters.platform}
              onChange={(e) => setFilters({ ...filters, platform: e.target.value })}
            >
              <option value="all">All Platforms</option>
              <option value="eBay">eBay</option>
              <option value="FB Marketplace">FB Marketplace</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Payment Status</label>
            <select
              value={filters.payment_status}
              onChange={(e) => setFilters({ ...filters, payment_status: e.target.value })}
            >
              <option value="all">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Received">Received</option>
              <option value="Cash">Cash</option>
              <option value="E-Transfer">E-Transfer</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Start Date</label>
            <input
              type="date"
              value={filters.start_date}
              onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">End Date</label>
            <input
              type="date"
              value={filters.end_date}
              onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <Loading />
      ) : sales.length === 0 ? (
        <div className="card p-8 text-center text-gray-500">
          <p>No sales recorded yet.</p>
          <p className="text-sm mt-2">Record sales from the Inventory page using the Sell button.</p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Item Name</th>
                <th>Platform</th>
                <th>Payout</th>
                <th>Shipping</th>
                <th>Profit</th>
                <th>ROI</th>
                <th>Payment</th>
                <th>Card Paid</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => (
                <tr key={sale.id}>
                  <td className="text-sm">{formatDate(sale.date_sold)}</td>
                  <td>
                    <div>{sale.item_name}</div>
                    <div className="text-xs text-gray-500 font-mono">{sale.sku}</div>
                  </td>
                  <td>
                    <span className={`badge ${sale.sell_platform === 'eBay' ? 'badge-gray' : 'badge-gray'}`}>
                      {sale.sell_platform}
                    </span>
                  </td>
                  <td>${sale.payout_amount.toFixed(2)}</td>
                  <td>${sale.shipping_cost.toFixed(2)}</td>
                  <td className={sale.profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                    ${sale.profit.toFixed(2)}
                  </td>
                  <td className={sale.roi_percent >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {sale.roi_percent.toFixed(1)}%
                  </td>
                  <td>
                    <select
                      value={sale.payment_status}
                      onChange={(e) => handleUpdateSale(sale.id, 'payment_status', e.target.value)}
                      className="text-sm py-1"
                    >
                      {sale.sell_platform === 'eBay' ? (
                        <>
                          <option value="Pending">Pending</option>
                          <option value="Received">Received</option>
                        </>
                      ) : (
                        <>
                          <option value="Cash">Cash</option>
                          <option value="E-Transfer">E-Transfer</option>
                        </>
                      )}
                    </select>
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={sale.card_paid_off === 1}
                      onChange={(e) => handleUpdateSale(sale.id, 'card_paid_off', e.target.checked)}
                      className="w-4 h-4"
                    />
                  </td>
                  <td>
                    <button
                      onClick={() => handleDeleteSale(sale.id)}
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default Sales;
