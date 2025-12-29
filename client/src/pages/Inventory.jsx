import { useState, useEffect } from 'react';
import { useInventory, useSales } from '../hooks/useApi';
import Modal from '../components/Modal';
import Loading from '../components/Loading';
import toast from 'react-hot-toast';

const CATEGORIES = ['Electronics', 'Pokemon Cards', 'Trading Cards', 'Collectibles', 'Other'];

function Inventory() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    category: 'all',
    status: 'all',
    search: '',
    inStock: 'all',
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSellModal, setShowSellModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);

  const inventory = useInventory();
  const sales = useSales();

  const fetchItems = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.category !== 'all') params.category = filters.category;
      if (filters.status !== 'all') params.status = filters.status;
      if (filters.search) params.search = filters.search;
      if (filters.inStock !== 'all') params.inStock = filters.inStock === 'inStock' ? 'true' : 'false';

      const data = await inventory.getAll(params);
      setItems(data);
    } catch (err) {
      toast.error('Failed to fetch inventory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [filters]);

  const handleAddItem = async (formData) => {
    try {
      await inventory.create(formData);
      toast.success('Item added to inventory');
      setShowAddModal(false);
      fetchItems();
    } catch (err) {
      toast.error(err.message || 'Failed to add item');
    }
  };

  const handleUpdateItem = async (id, formData) => {
    try {
      await inventory.update(id, formData);
      toast.success('Item updated');
      setEditingItem(null);
      fetchItems();
    } catch (err) {
      toast.error(err.message || 'Failed to update item');
    }
  };

  const handleDeleteItem = async (id) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      await inventory.remove(id);
      toast.success('Item deleted');
      fetchItems();
    } catch (err) {
      toast.error(err.message || 'Failed to delete item');
    }
  };

  const handleSell = async (formData) => {
    try {
      await sales.create({
        inventory_id: selectedItem.id,
        ...formData,
      });
      toast.success('Sale recorded');
      setShowSellModal(false);
      setSelectedItem(null);
      fetchItems();
    } catch (err) {
      toast.error(err.message || 'Failed to record sale');
    }
  };

  const handleMarkDelivered = async (id) => {
    try {
      await inventory.update(id, { order_status: 'Delivered' });
      toast.success('Marked as delivered');
      fetchItems();
    } catch (err) {
      toast.error(err.message || 'Failed to update status');
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Inventory</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn btn-primary"
        >
          + Add Item
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
            <label className="block text-sm font-medium mb-1">Category</label>
            <select
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
            >
              <option value="all">All Categories</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Order Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="all">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Delivered">Delivered</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Stock</label>
            <select
              value={filters.inStock}
              onChange={(e) => setFilters({ ...filters, inStock: e.target.value })}
            >
              <option value="all">All</option>
              <option value="inStock">In Stock</option>
              <option value="outOfStock">Out of Stock</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <Loading />
      ) : items.length === 0 ? (
        <div className="card p-8 text-center text-gray-500">
          <p>No inventory items found.</p>
          <p className="text-sm mt-2">Add items manually or let your Discord bot push checkouts.</p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th className="w-20">Image</th>
                <th>Item Name</th>
                <th>SKU</th>
                <th>Category</th>
                <th>Buy Price</th>
                <th>In Stock</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="p-2">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.item_name}
                        className="w-14 h-14 object-cover rounded border border-gray-200 dark:border-gray-700"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = '';
                          e.target.className = 'hidden';
                          e.target.nextSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <div className={`w-14 h-14 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center ${item.image_url ? 'hidden' : ''}`}>
                      <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  </td>
                  <td>
                    {editingItem?.id === item.id ? (
                      <input
                        type="text"
                        value={editingItem.item_name}
                        onChange={(e) => setEditingItem({ ...editingItem, item_name: e.target.value })}
                        className="w-full"
                        autoFocus
                      />
                    ) : (
                      <span
                        className="cursor-pointer hover:text-gray-600 dark:hover:text-gray-300"
                        onClick={() => setEditingItem({ ...item })}
                        title="Click to edit"
                      >
                        {item.item_name}
                      </span>
                    )}
                  </td>
                  <td className="font-mono text-sm">{item.sku}</td>
                  <td>{item.category}</td>
                  <td>${item.buy_price.toFixed(2)}</td>
                  <td>
                    <span className={item.quantity_in_stock > 0 ? 'text-green-600' : 'text-red-600'}>
                      {item.quantity_in_stock}
                    </span>
                    <span className="text-gray-400"> / {item.quantity_owned}</span>
                  </td>
                  <td>
                    <span className={`badge ${item.order_status === 'Delivered' ? 'badge-green' : 'badge-yellow'}`}>
                      {item.order_status}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-2">
                      {editingItem?.id === item.id ? (
                        <>
                          <button
                            onClick={() => handleUpdateItem(item.id, editingItem)}
                            className="text-green-600 hover:text-green-700 text-sm"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingItem(null)}
                            className="text-gray-500 hover:text-gray-600 text-sm"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          {item.order_status === 'Pending' && (
                            <button
                              onClick={() => handleMarkDelivered(item.id)}
                              className="text-blue-600 hover:text-blue-700 text-sm"
                            >
                              Delivered
                            </button>
                          )}
                          {item.quantity_in_stock > 0 && item.order_status === 'Delivered' && (
                            <button
                              onClick={() => {
                                setSelectedItem(item);
                                setShowSellModal(true);
                              }}
                              className="text-green-600 hover:text-green-700 text-sm"
                            >
                              Sell
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="text-red-600 hover:text-red-700 text-sm"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Item Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add Inventory Item">
        <AddItemForm onSubmit={handleAddItem} onCancel={() => setShowAddModal(false)} />
      </Modal>

      {/* Sell Modal */}
      <Modal isOpen={showSellModal} onClose={() => { setShowSellModal(false); setSelectedItem(null); }} title="Record Sale">
        {selectedItem && (
          <SellForm
            item={selectedItem}
            onSubmit={handleSell}
            onCancel={() => { setShowSellModal(false); setSelectedItem(null); }}
          />
        )}
      </Modal>
    </div>
  );
}

function AddItemForm({ onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    item_name: '',
    sku: '',
    category: 'Electronics',
    buy_price: '',
    quantity_owned: 1,
    order_status: 'Pending',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Item Name *</label>
        <input
          type="text"
          value={formData.item_name}
          onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">SKU *</label>
        <input
          type="text"
          value={formData.sku}
          onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Category</label>
        <select
          value={formData.category}
          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
        >
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Buy Price (before tax) *</label>
        <input
          type="number"
          step="0.01"
          value={formData.buy_price}
          onChange={(e) => setFormData({ ...formData, buy_price: e.target.value })}
          required
        />
        <p className="text-xs text-gray-500 mt-1">Tax will be auto-applied based on settings</p>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Quantity</label>
        <input
          type="number"
          min="1"
          value={formData.quantity_owned}
          onChange={(e) => setFormData({ ...formData, quantity_owned: parseInt(e.target.value, 10) })}
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Order Status</label>
        <select
          value={formData.order_status}
          onChange={(e) => setFormData({ ...formData, order_status: e.target.value })}
        >
          <option value="Pending">Pending</option>
          <option value="Delivered">Delivered</option>
        </select>
      </div>
      <div className="flex gap-3 pt-4">
        <button type="submit" className="btn btn-primary flex-1">Add Item</button>
        <button type="button" onClick={onCancel} className="btn btn-secondary flex-1">Cancel</button>
      </div>
    </form>
  );
}

function SellForm({ item, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    sell_platform: 'eBay',
    payout_amount: '',
    shipping_cost: '',
    payment_status: 'Pending',
    card_paid_off: false,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const payout = parseFloat(formData.payout_amount) || 0;
  const shipping = parseFloat(formData.shipping_cost) || 0;
  const profit = payout - item.buy_price - shipping;
  const roi = (item.buy_price + shipping) > 0 ? (profit / (item.buy_price + shipping)) * 100 : 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg">
        <p className="font-medium">{item.item_name}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          SKU: {item.sku} | Buy Price: ${item.buy_price.toFixed(2)}
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Sell Platform *</label>
        <select
          value={formData.sell_platform}
          onChange={(e) => {
            const platform = e.target.value;
            setFormData({
              ...formData,
              sell_platform: platform,
              payment_status: platform === 'eBay' ? 'Pending' : 'Cash',
            });
          }}
        >
          <option value="eBay">eBay</option>
          <option value="FB Marketplace">FB Marketplace</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Payout Amount *</label>
        <input
          type="number"
          step="0.01"
          value={formData.payout_amount}
          onChange={(e) => setFormData({ ...formData, payout_amount: e.target.value })}
          placeholder="Final amount received"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Shipping Cost</label>
        <input
          type="number"
          step="0.01"
          value={formData.shipping_cost}
          onChange={(e) => setFormData({ ...formData, shipping_cost: e.target.value })}
          placeholder="0.00"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Payment Status</label>
        <select
          value={formData.payment_status}
          onChange={(e) => setFormData({ ...formData, payment_status: e.target.value })}
        >
          {formData.sell_platform === 'eBay' ? (
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
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="card_paid_off"
          checked={formData.card_paid_off}
          onChange={(e) => setFormData({ ...formData, card_paid_off: e.target.checked })}
          className="w-4 h-4"
        />
        <label htmlFor="card_paid_off" className="text-sm">Card paid off for this item</label>
      </div>

      {/* Profit Preview */}
      {payout > 0 && (
        <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg">
          <div className="flex justify-between text-sm">
            <span>Payout:</span>
            <span>${payout.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Buy Price:</span>
            <span>-${item.buy_price.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Shipping:</span>
            <span>-${shipping.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-medium pt-2 border-t border-gray-300 dark:border-gray-600 mt-2">
            <span>Profit:</span>
            <span className={profit >= 0 ? 'text-green-600' : 'text-red-600'}>
              ${profit.toFixed(2)} ({roi.toFixed(1)}% ROI)
            </span>
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-4">
        <button type="submit" className="btn btn-success flex-1">Record Sale</button>
        <button type="button" onClick={onCancel} className="btn btn-secondary flex-1">Cancel</button>
      </div>
    </form>
  );
}

export default Inventory;
