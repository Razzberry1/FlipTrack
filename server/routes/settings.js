const express = require('express');
const router = express.Router();
const { db } = require('../db/database');

// GET /settings - Get all settings
router.get('/', (req, res) => {
  try {
    const settings = db.prepare('SELECT * FROM settings').all();
    const settingsObj = {};
    settings.forEach(s => {
      settingsObj[s.key] = s.value;
    });
    res.json(settingsObj);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings', details: error.message });
  }
});

// PUT /settings/:key - Update a setting
router.put('/:key', (req, res) => {
  try {
    const { value } = req.body;

    if (value === undefined) {
      return res.status(400).json({ error: 'Missing value' });
    }

    db.prepare(`
      INSERT INTO settings (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).run(req.params.key, String(value));

    res.json({ key: req.params.key, value: String(value) });
  } catch (error) {
    console.error('Error updating setting:', error);
    res.status(500).json({ error: 'Failed to update setting', details: error.message });
  }
});

// GET /settings/sku-names - Get all SKU name mappings
router.get('/sku-names', (req, res) => {
  try {
    const skuNames = db.prepare('SELECT * FROM sku_names ORDER BY updated_at DESC').all();
    res.json(skuNames);
  } catch (error) {
    console.error('Error fetching SKU names:', error);
    res.status(500).json({ error: 'Failed to fetch SKU names', details: error.message });
  }
});

// PUT /settings/sku-names/:sku - Update a SKU name mapping
router.put('/sku-names/:sku', (req, res) => {
  try {
    const { short_name } = req.body;

    if (!short_name) {
      return res.status(400).json({ error: 'Missing short_name' });
    }

    const existing = db.prepare('SELECT * FROM sku_names WHERE sku = ?').get(req.params.sku);
    if (!existing) {
      return res.status(404).json({ error: 'SKU not found' });
    }

    db.prepare(`
      UPDATE sku_names
      SET short_name = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE sku = ?
    `).run(short_name, req.params.sku);

    // Also update the inventory item name
    db.prepare(`
      UPDATE inventory
      SET item_name = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE sku = ?
    `).run(short_name, req.params.sku);

    const updated = db.prepare('SELECT * FROM sku_names WHERE sku = ?').get(req.params.sku);

    res.json(updated);
  } catch (error) {
    console.error('Error updating SKU name:', error);
    res.status(500).json({ error: 'Failed to update SKU name', details: error.message });
  }
});

// DELETE /settings/sku-names/:sku - Delete a SKU name mapping
router.delete('/sku-names/:sku', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM sku_names WHERE sku = ?').get(req.params.sku);
    if (!existing) {
      return res.status(404).json({ error: 'SKU not found' });
    }

    db.prepare('DELETE FROM sku_names WHERE sku = ?').run(req.params.sku);

    res.json({ message: 'SKU name mapping deleted', sku_name: existing });
  } catch (error) {
    console.error('Error deleting SKU name:', error);
    res.status(500).json({ error: 'Failed to delete SKU name', details: error.message });
  }
});

// GET /settings/export - Export all data as JSON
router.get('/export', (req, res) => {
  try {
    const inventory = db.prepare('SELECT * FROM inventory').all();
    const sales = db.prepare('SELECT * FROM sales').all();
    const overhead = db.prepare('SELECT * FROM overhead').all();
    const skuNames = db.prepare('SELECT * FROM sku_names').all();
    const settings = db.prepare('SELECT * FROM settings').all();

    const exportData = {
      exported_at: new Date().toISOString(),
      version: '1.0.0',
      data: {
        inventory,
        sales,
        overhead,
        sku_names: skuNames,
        settings
      }
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=flip-tracker-export.json');
    res.json(exportData);
  } catch (error) {
    console.error('Error exporting data:', error);
    res.status(500).json({ error: 'Failed to export data', details: error.message });
  }
});

// POST /settings/import - Import data from JSON
router.post('/import', (req, res) => {
  try {
    const { data, merge } = req.body;

    if (!data) {
      return res.status(400).json({ error: 'Missing data' });
    }

    // Begin transaction
    const importData = db.transaction(() => {
      // If not merging, clear existing data
      if (!merge) {
        db.prepare('DELETE FROM sales').run();
        db.prepare('DELETE FROM inventory').run();
        db.prepare('DELETE FROM overhead').run();
        db.prepare('DELETE FROM sku_names').run();
      }

      // Import SKU names first
      if (data.sku_names) {
        const insertSkuName = db.prepare(`
          INSERT OR REPLACE INTO sku_names (sku, short_name, original_name, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?)
        `);
        data.sku_names.forEach(s => {
          insertSkuName.run(s.sku, s.short_name, s.original_name, s.created_at, s.updated_at);
        });
      }

      // Import inventory
      if (data.inventory) {
        const insertInventory = db.prepare(`
          INSERT OR REPLACE INTO inventory (id, sku, item_name, category, buy_price, quantity_owned, quantity_sold, order_status, date_added, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        data.inventory.forEach(i => {
          insertInventory.run(i.id, i.sku, i.item_name, i.category, i.buy_price, i.quantity_owned, i.quantity_sold, i.order_status, i.date_added, i.updated_at);
        });
      }

      // Import sales
      if (data.sales) {
        const insertSale = db.prepare(`
          INSERT OR REPLACE INTO sales (id, inventory_id, sku, item_name, buy_price, sell_platform, payout_amount, shipping_cost, profit, roi_percent, payment_status, card_paid_off, date_sold)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        data.sales.forEach(s => {
          insertSale.run(s.id, s.inventory_id, s.sku, s.item_name, s.buy_price, s.sell_platform, s.payout_amount, s.shipping_cost, s.profit, s.roi_percent, s.payment_status, s.card_paid_off, s.date_sold);
        });
      }

      // Import overhead
      if (data.overhead) {
        const insertOverhead = db.prepare(`
          INSERT OR REPLACE INTO overhead (id, category, description, amount, month, date_added)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        data.overhead.forEach(o => {
          insertOverhead.run(o.id, o.category, o.description, o.amount, o.month, o.date_added);
        });
      }

      // Import settings
      if (data.settings) {
        const insertSetting = db.prepare(`
          INSERT OR REPLACE INTO settings (key, value)
          VALUES (?, ?)
        `);
        data.settings.forEach(s => {
          insertSetting.run(s.key, s.value);
        });
      }
    });

    importData();

    res.json({ message: 'Data imported successfully' });
  } catch (error) {
    console.error('Error importing data:', error);
    res.status(500).json({ error: 'Failed to import data', details: error.message });
  }
});

// GET /settings/export/csv - Export inventory as CSV
router.get('/export/csv', (req, res) => {
  try {
    const { type } = req.query;

    let data, filename, headers;

    if (type === 'sales') {
      data = db.prepare('SELECT * FROM sales').all();
      filename = 'flip-tracker-sales.csv';
      headers = ['id', 'inventory_id', 'sku', 'item_name', 'buy_price', 'sell_platform', 'payout_amount', 'shipping_cost', 'profit', 'roi_percent', 'payment_status', 'card_paid_off', 'date_sold'];
    } else {
      data = db.prepare('SELECT * FROM inventory').all();
      filename = 'flip-tracker-inventory.csv';
      headers = ['id', 'sku', 'item_name', 'category', 'buy_price', 'quantity_owned', 'quantity_sold', 'order_status', 'date_added', 'updated_at'];
    }

    // Convert to CSV
    const csvRows = [headers.join(',')];
    data.forEach(row => {
      const values = headers.map(h => {
        let val = row[h];
        if (val === null || val === undefined) val = '';
        // Escape quotes and wrap in quotes if contains comma
        val = String(val).replace(/"/g, '""');
        if (val.includes(',') || val.includes('"') || val.includes('\n')) {
          val = `"${val}"`;
        }
        return val;
      });
      csvRows.push(values.join(','));
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(csvRows.join('\n'));
  } catch (error) {
    console.error('Error exporting CSV:', error);
    res.status(500).json({ error: 'Failed to export CSV', details: error.message });
  }
});

module.exports = router;
