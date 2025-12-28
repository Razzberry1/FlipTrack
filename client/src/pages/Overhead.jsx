import { useState, useEffect } from 'react';
import { useOverhead } from '../hooks/useApi';
import Modal from '../components/Modal';
import Loading from '../components/Loading';
import toast from 'react-hot-toast';

const CATEGORIES = ['Botting', 'Proxies', 'Servers', 'Subscriptions', 'Other'];

function Overhead() {
  const [expenses, setExpenses] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);

  const overheadApi = useOverhead();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [expensesData, monthlyDataResult] = await Promise.all([
        overheadApi.getAll({ month: selectedMonth }),
        overheadApi.getMonthly(),
      ]);
      setExpenses(expensesData);
      setMonthlyData(monthlyDataResult);
    } catch (err) {
      toast.error('Failed to fetch overhead data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedMonth]);

  const handleAddExpense = async (formData) => {
    try {
      await overheadApi.create({ ...formData, month: selectedMonth });
      toast.success('Expense added');
      setShowAddModal(false);
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Failed to add expense');
    }
  };

  const handleUpdateExpense = async (id, formData) => {
    try {
      await overheadApi.update(id, formData);
      toast.success('Expense updated');
      setEditingExpense(null);
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Failed to update expense');
    }
  };

  const handleDeleteExpense = async (id) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;

    try {
      await overheadApi.remove(id);
      toast.success('Expense deleted');
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Failed to delete expense');
    }
  };

  // Group expenses by category
  const expensesByCategory = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = expenses.filter((e) => e.category === cat);
    return acc;
  }, {});

  // Calculate totals
  const totalByCategory = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = expensesByCategory[cat].reduce((sum, e) => sum + e.amount, 0);
    return acc;
  }, {});

  const monthTotal = expenses.reduce((sum, e) => sum + e.amount, 0);

  // Generate month options (last 12 months)
  const monthOptions = [];
  for (let i = 0; i < 12; i++) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const value = date.toISOString().slice(0, 7);
    const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    monthOptions.push({ value, label });
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Overhead Expenses</h1>
        <button onClick={() => setShowAddModal(true)} className="btn btn-primary">
          + Add Expense
        </button>
      </div>

      {/* Month Selector */}
      <div className="card p-4 mb-6">
        <div className="flex items-center gap-4">
          <label className="font-medium">Month:</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-48"
          >
            {monthOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <div className="ml-auto text-lg font-bold">
            Total: ${monthTotal.toFixed(2)}
          </div>
        </div>
      </div>

      {loading ? (
        <Loading />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Expenses by Category */}
          <div className="space-y-4">
            {CATEGORIES.map((category) => (
              <div key={category} className="card">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                  <h3 className="font-semibold">{category}</h3>
                  <span className="font-medium">${totalByCategory[category].toFixed(2)}</span>
                </div>
                {expensesByCategory[category].length === 0 ? (
                  <div className="p-4 text-gray-500 text-sm">No expenses</div>
                ) : (
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {expensesByCategory[category].map((expense) => (
                      <div key={expense.id} className="p-4 flex justify-between items-center">
                        <div>
                          <p className="font-medium">{expense.description || category}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(expense.date_added).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-medium">${expense.amount.toFixed(2)}</span>
                          <button
                            onClick={() => setEditingExpense(expense)}
                            className="text-gray-500 hover:text-gray-700 text-sm"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteExpense(expense.id)}
                            className="text-red-600 hover:text-red-700 text-sm"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Monthly Summary */}
          <div className="card p-4">
            <h3 className="font-semibold mb-4">Monthly History</h3>
            {monthlyData.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No historical data</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="text-sm">
                  <thead>
                    <tr>
                      <th>Month</th>
                      {CATEGORIES.map((cat) => (
                        <th key={cat}>{cat}</th>
                      ))}
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyData.map((month) => (
                      <tr key={month.month}>
                        <td>{month.month}</td>
                        {CATEGORIES.map((cat) => (
                          <td key={cat}>${(month.categories[cat] || 0).toFixed(2)}</td>
                        ))}
                        <td className="font-medium">${month.total.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Expense Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add Expense">
        <ExpenseForm onSubmit={handleAddExpense} onCancel={() => setShowAddModal(false)} />
      </Modal>

      {/* Edit Expense Modal */}
      <Modal
        isOpen={!!editingExpense}
        onClose={() => setEditingExpense(null)}
        title="Edit Expense"
      >
        {editingExpense && (
          <ExpenseForm
            expense={editingExpense}
            onSubmit={(data) => handleUpdateExpense(editingExpense.id, data)}
            onCancel={() => setEditingExpense(null)}
          />
        )}
      </Modal>
    </div>
  );
}

function ExpenseForm({ expense, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    category: expense?.category || 'Botting',
    description: expense?.description || '',
    amount: expense?.amount || '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      amount: parseFloat(formData.amount),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Category *</label>
        <select
          value={formData.category}
          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
        >
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Description</label>
        <input
          type="text"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="e.g., Monthly bot subscription"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Amount *</label>
        <input
          type="number"
          step="0.01"
          value={formData.amount}
          onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
          required
        />
      </div>
      <div className="flex gap-3 pt-4">
        <button type="submit" className="btn btn-primary flex-1">
          {expense ? 'Update' : 'Add'} Expense
        </button>
        <button type="button" onClick={onCancel} className="btn btn-secondary flex-1">
          Cancel
        </button>
      </div>
    </form>
  );
}

export default Overhead;
