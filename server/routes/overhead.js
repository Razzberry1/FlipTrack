const express = require('express');
const router = express.Router();
const { db } = require('../db/database');

// GET /overhead - Get all overhead expenses
router.get('/', (req, res) => {
  try {
    const { month, category } = req.query;

    let query = 'SELECT * FROM overhead WHERE 1=1';
    const params = [];

    if (month) {
      query += ' AND month = ?';
      params.push(month);
    }

    if (category && category !== 'all') {
      query += ' AND category = ?';
      params.push(category);
    }

    query += ' ORDER BY date_added DESC';

    const expenses = db.prepare(query).all(...params);
    res.json(expenses);
  } catch (error) {
    console.error('Error fetching overhead:', error);
    res.status(500).json({ error: 'Failed to fetch overhead', details: error.message });
  }
});

// GET /overhead/monthly - Get monthly overhead totals
router.get('/monthly', (req, res) => {
  try {
    const monthly = db.prepare(`
      SELECT
        month,
        category,
        COALESCE(SUM(amount), 0) as total
      FROM overhead
      GROUP BY month, category
      ORDER BY month DESC
    `).all();

    // Organize by month
    const byMonth = {};
    monthly.forEach(row => {
      if (!byMonth[row.month]) {
        byMonth[row.month] = {
          month: row.month,
          categories: {},
          total: 0
        };
      }
      byMonth[row.month].categories[row.category] = row.total;
      byMonth[row.month].total += row.total;
    });

    res.json(Object.values(byMonth));
  } catch (error) {
    console.error('Error fetching monthly overhead:', error);
    res.status(500).json({ error: 'Failed to fetch monthly overhead', details: error.message });
  }
});

// GET /overhead/current-month - Get current month's overhead
router.get('/current-month', (req, res) => {
  try {
    const currentMonth = new Date().toISOString().slice(0, 7);

    const expenses = db.prepare(`
      SELECT * FROM overhead
      WHERE month = ?
      ORDER BY category, date_added DESC
    `).all(currentMonth);

    const total = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM overhead
      WHERE month = ?
    `).get(currentMonth);

    const byCategory = db.prepare(`
      SELECT category, COALESCE(SUM(amount), 0) as total
      FROM overhead
      WHERE month = ?
      GROUP BY category
    `).all(currentMonth);

    res.json({
      month: currentMonth,
      expenses,
      total: total.total,
      by_category: byCategory
    });
  } catch (error) {
    console.error('Error fetching current month overhead:', error);
    res.status(500).json({ error: 'Failed to fetch overhead', details: error.message });
  }
});

// POST /overhead - Add new overhead expense
router.post('/', (req, res) => {
  try {
    const { category, description, amount, month } = req.body;

    if (!category || amount === undefined) {
      return res.status(400).json({ error: 'Missing required fields: category, amount' });
    }

    const validCategories = ['Botting', 'Proxies', 'Servers', 'Subscriptions', 'Other'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        error: 'Invalid category. Must be one of: ' + validCategories.join(', ')
      });
    }

    const expenseMonth = month || new Date().toISOString().slice(0, 7);

    const result = db.prepare(`
      INSERT INTO overhead (category, description, amount, month)
      VALUES (?, ?, ?, ?)
    `).run(category, description || '', parseFloat(amount), expenseMonth);

    const newExpense = db.prepare('SELECT * FROM overhead WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json(newExpense);
  } catch (error) {
    console.error('Error creating overhead expense:', error);
    res.status(500).json({ error: 'Failed to create expense', details: error.message });
  }
});

// PUT /overhead/:id - Update overhead expense
router.put('/:id', (req, res) => {
  try {
    const { category, description, amount, month } = req.body;

    const existing = db.prepare('SELECT * FROM overhead WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    db.prepare(`
      UPDATE overhead
      SET category = COALESCE(?, category),
          description = COALESCE(?, description),
          amount = COALESCE(?, amount),
          month = COALESCE(?, month)
      WHERE id = ?
    `).run(category, description, amount, month, req.params.id);

    const updated = db.prepare('SELECT * FROM overhead WHERE id = ?').get(req.params.id);

    res.json(updated);
  } catch (error) {
    console.error('Error updating overhead:', error);
    res.status(500).json({ error: 'Failed to update expense', details: error.message });
  }
});

// DELETE /overhead/:id - Delete overhead expense
router.delete('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM overhead WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    db.prepare('DELETE FROM overhead WHERE id = ?').run(req.params.id);

    res.json({ message: 'Expense deleted', expense: existing });
  } catch (error) {
    console.error('Error deleting overhead:', error);
    res.status(500).json({ error: 'Failed to delete expense', details: error.message });
  }
});

// GET /overhead/categories/list - Get list of overhead categories
router.get('/categories/list', (req, res) => {
  res.json(['Botting', 'Proxies', 'Servers', 'Subscriptions', 'Other']);
});

module.exports = router;
