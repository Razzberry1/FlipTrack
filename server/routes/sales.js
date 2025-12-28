const express = require('express');
const router = express.Router();
const { db } = require('../db/database');

// GET /sales - Get all sales
router.get('/', (req, res) => {
  try {
    const { platform, payment_status, search, start_date, end_date } = req.query;

    let query = 'SELECT * FROM sales WHERE 1=1';
    const params = [];

    if (platform && platform !== 'all') {
      query += ' AND sell_platform = ?';
      params.push(platform);
    }

    if (payment_status && payment_status !== 'all') {
      query += ' AND payment_status = ?';
      params.push(payment_status);
    }

    if (search) {
      query += ' AND (item_name LIKE ? OR sku LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (start_date) {
      query += ' AND date_sold >= ?';
      params.push(start_date);
    }

    if (end_date) {
      query += ' AND date_sold <= ?';
      params.push(end_date);
    }

    query += ' ORDER BY date_sold DESC';

    const sales = db.prepare(query).all(...params);
    res.json(sales);
  } catch (error) {
    console.error('Error fetching sales:', error);
    res.status(500).json({ error: 'Failed to fetch sales', details: error.message });
  }
});

// GET /sales/stats - Get sales statistics
router.get('/stats', (req, res) => {
  try {
    // Total revenue and profit
    const totals = db.prepare(`
      SELECT
        COALESCE(SUM(payout_amount), 0) as total_revenue,
        COALESCE(SUM(profit), 0) as total_profit,
        COUNT(*) as total_sales
      FROM sales
    `).get();

    // Calculate overall ROI
    const costData = db.prepare(`
      SELECT COALESCE(SUM(buy_price + shipping_cost), 0) as total_cost
      FROM sales
    `).get();

    const overallRoi = costData.total_cost > 0
      ? ((totals.total_profit / costData.total_cost) * 100).toFixed(2)
      : 0;

    // Items in stock (delivered and unsold)
    const inStock = db.prepare(`
      SELECT COALESCE(SUM(quantity_owned - quantity_sold), 0) as items_in_stock
      FROM inventory
      WHERE order_status = 'Delivered'
    `).get();

    // Pending orders
    const pending = db.prepare(`
      SELECT COALESCE(SUM(quantity_owned), 0) as pending_items
      FROM inventory
      WHERE order_status = 'Pending'
    `).get();

    // Current inventory value
    const inventoryValue = db.prepare(`
      SELECT COALESCE(SUM(buy_price * (quantity_owned - quantity_sold)), 0) as inventory_value
      FROM inventory
      WHERE order_status = 'Delivered'
    `).get();

    // Unpaid card balance
    const unpaidBalance = db.prepare(`
      SELECT COALESCE(SUM(buy_price), 0) as unpaid_balance
      FROM sales
      WHERE card_paid_off = 0
    `).get();

    // Sell-through rate
    const sellThrough = db.prepare(`
      SELECT
        COALESCE(SUM(quantity_sold), 0) as sold,
        COALESCE(SUM(quantity_owned - quantity_sold), 0) as in_stock
      FROM inventory
    `).get();

    const sellThroughRate = (sellThrough.sold + sellThrough.in_stock) > 0
      ? ((sellThrough.sold / (sellThrough.sold + sellThrough.in_stock)) * 100).toFixed(2)
      : 0;

    res.json({
      total_revenue: totals.total_revenue,
      total_profit: totals.total_profit,
      total_sales: totals.total_sales,
      overall_roi: parseFloat(overallRoi),
      items_in_stock: inStock.items_in_stock,
      pending_orders: pending.pending_items,
      inventory_value: inventoryValue.inventory_value,
      unpaid_card_balance: unpaidBalance.unpaid_balance,
      sell_through_rate: parseFloat(sellThroughRate)
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats', details: error.message });
  }
});

// GET /sales/by-platform - Get sales breakdown by platform
router.get('/by-platform', (req, res) => {
  try {
    const platforms = db.prepare(`
      SELECT
        sell_platform,
        COUNT(*) as items_sold,
        COALESCE(SUM(payout_amount), 0) as revenue,
        COALESCE(SUM(profit), 0) as profit,
        COALESCE(AVG(roi_percent), 0) as avg_roi
      FROM sales
      GROUP BY sell_platform
    `).all();

    res.json(platforms);
  } catch (error) {
    console.error('Error fetching platform stats:', error);
    res.status(500).json({ error: 'Failed to fetch platform stats', details: error.message });
  }
});

// GET /sales/by-category - Get sales breakdown by category
router.get('/by-category', (req, res) => {
  try {
    const categories = db.prepare(`
      SELECT
        i.category,
        COUNT(*) as items_sold,
        COALESCE(SUM(s.payout_amount), 0) as revenue,
        COALESCE(SUM(s.profit), 0) as profit,
        COALESCE(AVG(s.roi_percent), 0) as avg_roi
      FROM sales s
      JOIN inventory i ON s.inventory_id = i.id
      GROUP BY i.category
    `).all();

    res.json(categories);
  } catch (error) {
    console.error('Error fetching category stats:', error);
    res.status(500).json({ error: 'Failed to fetch category stats', details: error.message });
  }
});

// GET /sales/monthly - Get monthly profit trend
router.get('/monthly', (req, res) => {
  try {
    const monthly = db.prepare(`
      SELECT
        strftime('%Y-%m', date_sold) as month,
        COUNT(*) as items_sold,
        COALESCE(SUM(payout_amount), 0) as revenue,
        COALESCE(SUM(profit), 0) as profit
      FROM sales
      GROUP BY strftime('%Y-%m', date_sold)
      ORDER BY month DESC
      LIMIT 12
    `).all();

    res.json(monthly.reverse());
  } catch (error) {
    console.error('Error fetching monthly stats:', error);
    res.status(500).json({ error: 'Failed to fetch monthly stats', details: error.message });
  }
});

// GET /sales/recent - Get recent sales
router.get('/recent', (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;
    const sales = db.prepare(`
      SELECT * FROM sales
      ORDER BY date_sold DESC
      LIMIT ?
    `).all(limit);

    res.json(sales);
  } catch (error) {
    console.error('Error fetching recent sales:', error);
    res.status(500).json({ error: 'Failed to fetch recent sales', details: error.message });
  }
});

// POST /sales - Record a new sale
router.post('/', (req, res) => {
  try {
    const {
      inventory_id,
      sell_platform,
      payout_amount,
      shipping_cost,
      payment_status,
      card_paid_off,
      date_sold
    } = req.body;

    if (!inventory_id || !sell_platform || payout_amount === undefined) {
      return res.status(400).json({
        error: 'Missing required fields: inventory_id, sell_platform, payout_amount'
      });
    }

    // Get inventory item
    const item = db.prepare('SELECT * FROM inventory WHERE id = ?').get(inventory_id);
    if (!item) {
      return res.status(404).json({ error: 'Inventory item not found' });
    }

    // Check if there's stock to sell
    const inStock = item.quantity_owned - item.quantity_sold;
    if (inStock <= 0) {
      return res.status(400).json({ error: 'No stock available to sell' });
    }

    const payout = parseFloat(payout_amount);
    const shipping = parseFloat(shipping_cost) || 0;
    const buyPrice = item.buy_price;

    // Calculate profit and ROI
    const profit = payout - buyPrice - shipping;
    const totalCost = buyPrice + shipping;
    const roi = totalCost > 0 ? (profit / totalCost) * 100 : 0;

    // Insert sale
    const result = db.prepare(`
      INSERT INTO sales (
        inventory_id, sku, item_name, buy_price, sell_platform,
        payout_amount, shipping_cost, profit, roi_percent,
        payment_status, card_paid_off, date_sold
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      inventory_id,
      item.sku,
      item.item_name,
      buyPrice,
      sell_platform,
      payout,
      shipping,
      Math.round(profit * 100) / 100,
      Math.round(roi * 100) / 100,
      payment_status,
      card_paid_off ? 1 : 0,
      date_sold || new Date().toISOString()
    );

    // Increment quantity sold in inventory
    db.prepare(`
      UPDATE inventory
      SET quantity_sold = quantity_sold + 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(inventory_id);

    const newSale = db.prepare('SELECT * FROM sales WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json(newSale);
  } catch (error) {
    console.error('Error creating sale:', error);
    res.status(500).json({ error: 'Failed to create sale', details: error.message });
  }
});

// PUT /sales/:id - Update a sale
router.put('/:id', (req, res) => {
  try {
    const { payment_status, card_paid_off } = req.body;

    const existing = db.prepare('SELECT * FROM sales WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Sale not found' });
    }

    db.prepare(`
      UPDATE sales
      SET payment_status = COALESCE(?, payment_status),
          card_paid_off = COALESCE(?, card_paid_off)
      WHERE id = ?
    `).run(payment_status, card_paid_off !== undefined ? (card_paid_off ? 1 : 0) : null, req.params.id);

    const updated = db.prepare('SELECT * FROM sales WHERE id = ?').get(req.params.id);

    res.json(updated);
  } catch (error) {
    console.error('Error updating sale:', error);
    res.status(500).json({ error: 'Failed to update sale', details: error.message });
  }
});

// DELETE /sales/:id - Delete a sale
router.delete('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM sales WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Sale not found' });
    }

    // Decrement quantity sold in inventory
    db.prepare(`
      UPDATE inventory
      SET quantity_sold = quantity_sold - 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(existing.inventory_id);

    // Delete the sale
    db.prepare('DELETE FROM sales WHERE id = ?').run(req.params.id);

    res.json({ message: 'Sale deleted', sale: existing });
  } catch (error) {
    console.error('Error deleting sale:', error);
    res.status(500).json({ error: 'Failed to delete sale', details: error.message });
  }
});

module.exports = router;
