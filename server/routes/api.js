const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const { shortenProductName, detectCategory } = require('../models/nameShortener');

// POST /api/checkout - Discord bot pushes checkout data
router.post('/checkout', (req, res) => {
  try {
    const { product, sku, qty, price, imageUrl } = req.body;

    if (!product || !sku || !qty || !price) {
      return res.status(400).json({ error: 'Missing required fields: product, sku, qty, price' });
    }

    const quantity = parseInt(qty, 10);
    const basePrice = parseFloat(price);

    if (isNaN(quantity) || isNaN(basePrice)) {
      return res.status(400).json({ error: 'Invalid qty or price format' });
    }

    // Get tax rate from settings
    const taxSetting = db.prepare('SELECT value FROM settings WHERE key = ?').get('tax_rate');
    const taxRate = taxSetting ? parseFloat(taxSetting.value) / 100 : 0.12;

    // Calculate price with tax
    const priceWithTax = Math.round(basePrice * (1 + taxRate) * 100) / 100;

    // Check if we have a saved name for this SKU
    const savedName = db.prepare('SELECT short_name FROM sku_names WHERE sku = ?').get(sku);
    let itemName;

    if (savedName) {
      itemName = savedName.short_name;
    } else {
      // Auto-shorten the product name
      itemName = shortenProductName(product, sku);

      // Save the name mapping
      db.prepare(`
        INSERT INTO sku_names (sku, short_name, original_name)
        VALUES (?, ?, ?)
      `).run(sku, itemName, product);
    }

    // Auto-detect category
    const category = detectCategory(product);

    // Check if SKU already exists in inventory
    const existing = db.prepare('SELECT * FROM inventory WHERE sku = ?').get(sku);

    if (existing) {
      // Update quantity, price, and image (use latest values)
      db.prepare(`
        UPDATE inventory
        SET quantity_owned = quantity_owned + ?,
            buy_price = ?,
            image_url = COALESCE(?, image_url),
            updated_at = CURRENT_TIMESTAMP
        WHERE sku = ?
      `).run(quantity, priceWithTax, imageUrl || null, sku);

      const updated = db.prepare('SELECT * FROM inventory WHERE sku = ?').get(sku);

      res.json({
        message: 'Inventory updated',
        action: 'incremented',
        item: updated
      });
    } else {
      // Create new inventory item
      const result = db.prepare(`
        INSERT INTO inventory (sku, item_name, category, buy_price, quantity_owned, order_status, image_url)
        VALUES (?, ?, ?, ?, ?, 'Pending', ?)
      `).run(sku, itemName, category, priceWithTax, quantity, imageUrl || null);

      const newItem = db.prepare('SELECT * FROM inventory WHERE id = ?').get(result.lastInsertRowid);

      res.json({
        message: 'Item added to inventory',
        action: 'created',
        item: newItem
      });
    }
  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({ error: 'Failed to process checkout', details: error.message });
  }
});

// PUT /api/inventory/:sku/delivered - Mark item as delivered
router.put('/inventory/:sku/delivered', (req, res) => {
  try {
    const { sku } = req.params;

    const existing = db.prepare('SELECT * FROM inventory WHERE sku = ?').get(sku);

    if (!existing) {
      return res.status(404).json({ error: 'Item not found' });
    }

    db.prepare(`
      UPDATE inventory
      SET order_status = 'Delivered',
          updated_at = CURRENT_TIMESTAMP
      WHERE sku = ?
    `).run(sku);

    const updated = db.prepare('SELECT * FROM inventory WHERE sku = ?').get(sku);

    res.json({
      message: 'Item marked as delivered',
      item: updated
    });
  } catch (error) {
    console.error('Delivery update error:', error);
    res.status(500).json({ error: 'Failed to update delivery status', details: error.message });
  }
});

// GET /api/sku/:sku - Get saved name for a SKU
router.get('/sku/:sku', (req, res) => {
  try {
    const { sku } = req.params;

    const skuName = db.prepare('SELECT * FROM sku_names WHERE sku = ?').get(sku);

    if (!skuName) {
      return res.status(404).json({ error: 'SKU not found', sku });
    }

    res.json(skuName);
  } catch (error) {
    console.error('SKU lookup error:', error);
    res.status(500).json({ error: 'Failed to lookup SKU', details: error.message });
  }
});

// GET /api/status - Check API status (for Discord bot connection check)
router.get('/status', (req, res) => {
  res.json({
    status: 'connected',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

module.exports = router;
