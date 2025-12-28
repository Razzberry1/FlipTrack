const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../../database.sqlite');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize database schema
function initializeDatabase() {
  // Settings table for app configuration
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  // Insert default settings if not exist
  const insertSetting = db.prepare(`
    INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)
  `);
  insertSetting.run('tax_rate', '12');
  insertSetting.run('dark_mode', 'false');

  // SKU name mappings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS sku_names (
      sku TEXT PRIMARY KEY,
      short_name TEXT NOT NULL,
      original_name TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Inventory table - one row per unique SKU
  db.exec(`
    CREATE TABLE IF NOT EXISTS inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sku TEXT UNIQUE NOT NULL,
      item_name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'Other',
      buy_price REAL NOT NULL,
      quantity_owned INTEGER NOT NULL DEFAULT 0,
      quantity_sold INTEGER NOT NULL DEFAULT 0,
      order_status TEXT NOT NULL DEFAULT 'Pending',
      date_added TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Sales table - each sale is its own entry
  db.exec(`
    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      inventory_id INTEGER NOT NULL,
      sku TEXT NOT NULL,
      item_name TEXT NOT NULL,
      buy_price REAL NOT NULL,
      sell_platform TEXT NOT NULL,
      payout_amount REAL NOT NULL,
      shipping_cost REAL NOT NULL DEFAULT 0,
      profit REAL NOT NULL,
      roi_percent REAL NOT NULL,
      payment_status TEXT NOT NULL,
      card_paid_off INTEGER NOT NULL DEFAULT 0,
      date_sold TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (inventory_id) REFERENCES inventory(id)
    )
  `);

  // Overhead expenses table
  db.exec(`
    CREATE TABLE IF NOT EXISTS overhead (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      description TEXT,
      amount REAL NOT NULL,
      month TEXT NOT NULL,
      date_added TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log('Database initialized successfully');
}

module.exports = { db, initializeDatabase };
