import { useState, useEffect, useRef } from 'react';
import { useSettings, useApiStatus } from '../hooks/useApi';
import Loading from '../components/Loading';
import toast from 'react-hot-toast';

function Settings({ darkMode, setDarkMode }) {
  const [settings, setSettings] = useState({ tax_rate: '12' });
  const [skuNames, setSkuNames] = useState([]);
  const [apiStatus, setApiStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingSku, setEditingSku] = useState(null);
  const fileInputRef = useRef(null);

  const settingsApi = useSettings();
  const apiStatusApi = useApiStatus();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [settingsData, skuNamesData, statusData] = await Promise.all([
        settingsApi.getAll(),
        settingsApi.getSkuNames(),
        apiStatusApi.checkStatus().catch(() => null),
      ]);
      setSettings(settingsData);
      setSkuNames(skuNamesData);
      setApiStatus(statusData);
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdateTaxRate = async (value) => {
    try {
      await settingsApi.update('tax_rate', value);
      setSettings({ ...settings, tax_rate: value });
      toast.success('Tax rate updated');
    } catch (err) {
      toast.error(err.message || 'Failed to update tax rate');
    }
  };

  const handleUpdateSkuName = async (sku, shortName) => {
    try {
      await settingsApi.updateSkuName(sku, shortName);
      toast.success('SKU name updated');
      setEditingSku(null);
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Failed to update SKU name');
    }
  };

  const handleDeleteSkuName = async (sku) => {
    if (!confirm('Delete this SKU name mapping?')) return;

    try {
      await settingsApi.deleteSkuName(sku);
      toast.success('SKU name mapping deleted');
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Failed to delete SKU name');
    }
  };

  const handleExportJson = async () => {
    try {
      const data = await settingsApi.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `flip-tracker-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Data exported');
    } catch (err) {
      toast.error(err.message || 'Failed to export data');
    }
  };

  const handleExportCsv = (type) => {
    window.open(settingsApi.exportCsv(type), '_blank');
    toast.success(`${type} CSV exported`);
  };

  const handleImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const importData = JSON.parse(text);

      if (!importData.data) {
        throw new Error('Invalid export file format');
      }

      const merge = confirm('Merge with existing data? Click Cancel to replace all data.');

      const response = await fetch('/settings/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: importData.data, merge }),
      });

      if (!response.ok) {
        throw new Error('Import failed');
      }

      toast.success('Data imported successfully');
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Failed to import data');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Settings</h1>
        <Loading />
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <div className="space-y-6">
        {/* API Status */}
        <div className="card p-4">
          <h2 className="text-lg font-semibold mb-4">Discord Bot API</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="font-medium">Status:</span>
              <span className={`badge ${apiStatus ? 'badge-green' : 'badge-red'}`}>
                {apiStatus ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-2">API Endpoints for your Discord bot:</p>
              <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg font-mono text-sm space-y-2">
                <p><span className="text-green-600">POST</span> /api/checkout - Push checkout data</p>
                <p><span className="text-blue-600">PUT</span> /api/inventory/:sku/delivered - Mark as delivered</p>
                <p><span className="text-gray-500">GET</span> /api/sku/:sku - Get saved SKU name</p>
                <p><span className="text-gray-500">GET</span> /api/status - Check connection</p>
              </div>
            </div>
            <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg">
              <p className="text-sm font-medium mb-2">Checkout Payload Example:</p>
              <pre className="text-xs overflow-x-auto">
{`{
  "product": "Full product name from bot",
  "sku": "B0BLYL79TT",
  "qty": 2,
  "price": "467.99"
}`}
              </pre>
            </div>
          </div>
        </div>

        {/* General Settings */}
        <div className="card p-4">
          <h2 className="text-lg font-semibold mb-4">General Settings</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <label className="font-medium w-32">Tax Rate:</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.1"
                  value={settings.tax_rate}
                  onChange={(e) => setSettings({ ...settings, tax_rate: e.target.value })}
                  onBlur={(e) => handleUpdateTaxRate(e.target.value)}
                  className="w-24"
                />
                <span>%</span>
              </div>
              <span className="text-sm text-gray-500">Applied to buy price on checkout</span>
            </div>

            <div className="flex items-center gap-4">
              <label className="font-medium w-32">Dark Mode:</label>
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`btn ${darkMode ? 'btn-primary' : 'btn-secondary'}`}
              >
                {darkMode ? 'On' : 'Off'}
              </button>
            </div>
          </div>
        </div>

        {/* SKU Name Mappings */}
        <div className="card p-4">
          <h2 className="text-lg font-semibold mb-4">SKU Name Mappings</h2>
          <p className="text-sm text-gray-500 mb-4">
            Edit product names here. Changes will apply to future items with the same SKU.
          </p>
          {skuNames.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No SKU mappings yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="text-sm">
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Short Name</th>
                    <th>Original Name</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {skuNames.map((sku) => (
                    <tr key={sku.sku}>
                      <td className="font-mono">{sku.sku}</td>
                      <td>
                        {editingSku?.sku === sku.sku ? (
                          <input
                            type="text"
                            value={editingSku.short_name}
                            onChange={(e) =>
                              setEditingSku({ ...editingSku, short_name: e.target.value })
                            }
                            className="w-full"
                            autoFocus
                          />
                        ) : (
                          sku.short_name
                        )}
                      </td>
                      <td className="text-gray-500 max-w-xs truncate" title={sku.original_name}>
                        {sku.original_name}
                      </td>
                      <td>
                        {editingSku?.sku === sku.sku ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleUpdateSkuName(sku.sku, editingSku.short_name)}
                              className="text-green-600 hover:text-green-700"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingSku(null)}
                              className="text-gray-500 hover:text-gray-600"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              onClick={() => setEditingSku({ ...sku })}
                              className="text-gray-500 hover:text-gray-700"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteSkuName(sku.sku)}
                              className="text-red-600 hover:text-red-700"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Data Management */}
        <div className="card p-4">
          <h2 className="text-lg font-semibold mb-4">Data Management</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Export Data</h3>
              <div className="flex gap-3">
                <button onClick={handleExportJson} className="btn btn-secondary">
                  Export JSON (Full Backup)
                </button>
                <button onClick={() => handleExportCsv('inventory')} className="btn btn-secondary">
                  Export Inventory CSV
                </button>
                <button onClick={() => handleExportCsv('sales')} className="btn btn-secondary">
                  Export Sales CSV
                </button>
              </div>
            </div>

            <div>
              <h3 className="font-medium mb-2">Import Data</h3>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="btn btn-secondary"
              >
                Import JSON Backup
              </button>
              <p className="text-sm text-gray-500 mt-2">
                Import a previously exported JSON file. You can choose to merge or replace existing data.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;
