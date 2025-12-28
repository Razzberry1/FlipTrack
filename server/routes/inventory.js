const express = require('express');
const router = express.Router();
const { db } = require('../db/database');

// GET /inventory - Get all inventory items
router.get('/', (req, res) => {
  try {
    const { category, status, search, inStock } = req.query;

    let query = 'SELECT * FROM inventory WHERE 1=1';
    const params = [];

    if (category && category !== 'all') {
      query += ' AND category = ?';
      params.push(category);
    }

    if (status && status !== 'all') {
      query += ' AND order_status = ?';
      params.push(status);
    }

    if (search) {
      query += ' AND (item_name LIKE ? OR sku LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (inStock === 'true') {
      query += ' AND (quantity_owned - quantity_sold) > 0';
    } else if (inStock === 'false') {
      query += ' AND (quantity_owned - quantity_sold) = 0';
    }

    query += ' ORDER BY date_added DESC';

    const items = db.prepare(query).all(...params);

    // Calculate quantity in stock for each item
    const itemsWithStock = items.map(item => ({
      ...item,
      quantity_in_stock: item.quantity_owned - item.quantity_sold
    }));

    res.json(itemsWithStock);
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({ error: 'Failed to fetch inventory', details: error.message });
  }
});

// GET /inventory/:id - Get single inventory item
router.get('/:id', (req, res) => {
  try {
    const item = db.prepare('SELECT * FROM inventory WHERE id = ?').get(req.params.id);

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json({
      ...item,
      quantity_in_stock: item.quantity_owned - item.quantity_sold
    });
  } catch (error) {
    console.error('Error fetching item:', error);
    res.status(500).json({ error: 'Failed to fetch item', details: error.message });
  }
});

// POST /inventory - Create new inventory item manually
router.post('/', (req, res) => {
  try {
    const { item_name, sku, category, buy_price, quantity_owned, order_status } = req.body;

    if (!item_name || !sku || !buy_price) {
      return res.status(400).json({ error: 'Missing required fields: item_name, sku, buy_price' });
    }

    // Check if SKU already exists
    const existing = db.prepare('SELECT * FROM inventory WHERE sku = ?').get(sku);
    if (existing) {
      return res.status(400).json({ error: 'SKU already exists. Use PUT to update quantity.' });
    }

    // Get tax rate from settings
    const taxSetting = db.prepare('SELECT value FROM settings WHERE key = ?').get('tax_rate');
    const taxRate = taxSetting ? parseFloat(taxSetting.value) / 100 : 0.12;

    // Apply tax to price
    const priceWithTax = Math.round(parseFloat(buy_price) * (1 + taxRate) * 100) / 100;

    const result = db.prepare(`
      INSERT INTO inventory (item_name, sku, category, buy_price, quantity_owned, order_status)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      item_name,
      sku,
      category || 'Other',
      priceWithTax,
      quantity_owned || 1,
      order_status || 'Pending'
    );

    // Save the SKU name mapping
    db.prepare(`
      INSERT OR IGNORE INTO sku_names (sku, short_name, original_name)
      VALUES (?, ?, ?)
    `).run(sku, item_name, item_name);

    const newItem = db.prepare('SELECT * FROM inventory WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json({
      ...newItem,
      quantity_in_stock: newItem.quantity_owned - newItem.quantity_sold
    });
  } catch (error) {
    console.error('Error creating item:', error);
    res.status(500).json({ error: 'Failed to create item', details: error.message });
  }
});

// PUT /inventory/:id - Update inventory item
router.put('/:id', (req, res) => {
  try {
    const { item_name, category, buy_price, quantity_owned, order_status } = req.body;

    const existing = db.prepare('SELECT * FROM inventory WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Item not found' });
    }

    db.prepare(`
      UPDATE inventory
      SET item_name = COALESCE(?, item_name),
          category = COALESCE(?, category),
          buy_price = COALESCE(?, buy_price),
          quantity_owned = COALESCE(?, quantity_owned),
          order_status = COALESCE(?, order_status),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(item_name, category, buy_price, quantity_owned, order_status, req.params.id);

    // Update SKU name mapping if item name changed
    if (item_name) {
      db.prepare(`
        UPDATE sku_names
        SET short_name = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE sku = ?
      `).run(item_name, existing.sku);
    }

    const updated = db.prepare('SELECT * FROM inventory WHERE id = ?').get(req.params.id);

    res.json({
      ...updated,
      quantity_in_stock: updated.quantity_owned - updated.quantity_sold
    });
  } catch (error) {
    console.error('Error updating item:', error);
    res.status(500).json({ error: 'Failed to update item', details: error.message });
  }
});

// DELETE /inventory/:id - Delete inventory item
router.delete('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM inventory WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Delete related sales
    db.prepare('DELETE FROM sales WHERE inventory_id = ?').run(req.params.id);

    // Delete the inventory item
    db.prepare('DELETE FROM inventory WHERE id = ?').run(req.params.id);

    res.json({ message: 'Item deleted', item: existing });
  } catch (error) {
    console.error('Error deleting item:', error);
    res.status(500).json({ error: 'Failed to delete item', details: error.message });
  }
});

// GET /inventory/categories/list - Get list of categories
router.get('/categories/list', (req, res) => {
  res.json(['Electronics', 'Pokemon Cards', 'Trading Cards', 'Collectibles', 'Other']);
});

module.exports = router;
