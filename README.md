# Flip Tracker

A full-stack flip tracking application for reselling businesses. Track inventory, sales, profits, and business costs.

## Features

- **Inventory Management**: Track items by SKU with auto-categorization and name shortening
- **Sales Tracking**: Record sales with profit/ROI calculations
- **Dashboard**: Summary cards, charts, and analytics
- **Overhead Tracking**: Track monthly business expenses
- **Discord Bot API**: REST endpoints for bot integration
- **Data Export/Import**: JSON and CSV support
- **Dark Mode**: Toggle between light and dark themes

## Quick Start

```bash
# Install all dependencies
npm run install-all

# Start both server and client
npm start
```

The app will be available at:
- Frontend: http://localhost:3000
- API: http://localhost:3001

## Discord Bot API Endpoints

### POST /api/checkout
Push checkout data from your bot.

```json
{
  "product": "Full product name from bot",
  "sku": "B0BLYL79TT",
  "qty": 2,
  "price": "467.99"
}
```

Features:
- Auto-applies tax (configurable in settings)
- Auto-shortens product names based on category
- Auto-detects category (Electronics, Pokemon Cards, etc.)
- Increments quantity if SKU already exists

### PUT /api/inventory/:sku/delivered
Mark an item as delivered.

### GET /api/sku/:sku
Get the saved name for a SKU.

### GET /api/status
Check API connection status.

## Tech Stack

- **Frontend**: React + Tailwind CSS + Recharts
- **Backend**: Node.js + Express
- **Database**: SQLite (better-sqlite3)

## Project Structure

```
flip-tracker/
├── client/           # React frontend
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   └── App.jsx
├── server/           # Express backend
│   ├── routes/
│   ├── models/
│   ├── db/
│   └── index.js
├── database.sqlite   # SQLite database (created on first run)
└── package.json
```

## Development

```bash
# Run server only
cd server && npm start

# Run client only
cd client && npm start
```

## Categories

- Electronics (RAM, GPUs, etc.)
- Pokemon Cards
- Trading Cards
- Collectibles
- Other

## Name Auto-Shortening

The app automatically shortens long product names:

- **RAM**: Brand + Model + Capacity + Speed (e.g., "Corsair Vengeance DDR5 64GB 6000MHz")
- **GPU**: Brand + Model + VRAM (e.g., "ASUS RTX 4090 24GB")
- **Pokemon/TCG**: Brand + Set + Product Type (e.g., "Pokemon Prismatic Evolution ETB")

Edit names in the app, and future items with the same SKU will use your edited name.
