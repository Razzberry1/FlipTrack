# Flip Tracker

A full-stack flip tracking application for reselling businesses. Track inventory, sales, profits, and business costs.

## Features

- **Inventory Management**: Track items by SKU with auto-categorization and name shortening
- **Sales Tracking**: Record sales with profit/ROI calculations
- **Dashboard**: Summary cards, charts, and analytics
- **Overhead Tracking**: Track monthly business expenses
- **Discord Bot**: Watches Spidey Bot messages and auto-adds checkouts
- **Product Images**: Captures and displays product images from Discord embeds
- **Data Export/Import**: JSON and CSV support
- **Dark Mode**: Toggle between light and dark themes

## Quick Start

```bash
# Install all dependencies
npm run install-all

# Set up Discord bot (optional)
cp .env.example .env
# Edit .env with your Discord bot token and channel ID

# Start server, client, and Discord bot
npm start

# Or start without the Discord bot
npm run start:no-bot
```

The app will be available at:
- Frontend: http://localhost:3000
- API: http://localhost:3001

## Discord Bot Setup

1. Create a Discord bot at https://discord.com/developers/applications
2. Enable "Message Content Intent" in Bot settings
3. Copy the bot token
4. Get your channel ID (Developer Mode > Right-click channel > Copy ID)
5. Create a `.env` file in the root directory:

```env
DISCORD_BOT_TOKEN=your_bot_token_here
DISCORD_CHANNEL_ID=your_channel_id_here
```

The bot will:
- Watch the specified channel for messages from Spidey Bot
- Parse product name, SKU, quantity, and price from messages
- Extract product images from embed thumbnails
- Auto-shorten product names (RAM, GPU, Pokemon/TCG patterns)
- Add 12% tax automatically
- Save to pending_checkouts.json if API is down, sync every 5 mins

## Discord Bot API Endpoints

### POST /api/checkout
Push checkout data from your bot.

```json
{
  "product": "Full product name from bot",
  "sku": "B0BLYL79TT",
  "qty": 2,
  "price": "467.99",
  "imageUrl": "https://example.com/product-image.jpg"
}
```

Features:
- Auto-applies tax (configurable in settings)
- Auto-shortens product names based on category
- Auto-detects category (Electronics, Pokemon Cards, etc.)
- Stores product image URL for display in inventory
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
├── bot/              # Discord bot
│   └── index.js
├── database.sqlite   # SQLite database (created on first run)
├── .env              # Environment variables (create from .env.example)
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
