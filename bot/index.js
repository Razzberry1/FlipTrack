const { Client, GatewayIntentBits, Partials } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Configuration from environment variables
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_CHANNEL_ID = process.env.DISCORD_CHANNEL_ID;
const API_URL = process.env.API_URL || 'http://localhost:3001';

// Pending checkouts file path
const PENDING_FILE = path.join(__dirname, 'pending_checkouts.json');

// Validate required environment variables
if (!DISCORD_BOT_TOKEN) {
  console.error('ERROR: DISCORD_BOT_TOKEN environment variable is required');
  process.exit(1);
}

if (!DISCORD_CHANNEL_ID) {
  console.error('ERROR: DISCORD_CHANNEL_ID environment variable is required');
  process.exit(1);
}

// Initialize Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Message, Partials.Channel],
});

// Load pending checkouts from file
function loadPendingCheckouts() {
  try {
    if (fs.existsSync(PENDING_FILE)) {
      const data = fs.readFileSync(PENDING_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error loading pending checkouts:', err.message);
  }
  return [];
}

// Save pending checkouts to file
function savePendingCheckouts(checkouts) {
  try {
    fs.writeFileSync(PENDING_FILE, JSON.stringify(checkouts, null, 2));
  } catch (err) {
    console.error('Error saving pending checkouts:', err.message);
  }
}

// Auto-shorten product names
function shortenProductName(fullName) {
  const name = fullName.trim();
  const upperName = name.toUpperCase();

  // RAM patterns
  if (upperName.includes('DDR4') || upperName.includes('DDR5') ||
      upperName.includes('RAM') || upperName.includes('MEMORY')) {
    return shortenRAM(name);
  }

  // GPU patterns
  if (upperName.includes('RTX') || upperName.includes('GTX') ||
      upperName.includes('RADEON') || upperName.includes('GPU') ||
      upperName.includes('RX ') || upperName.includes('GRAPHICS')) {
    return shortenGPU(name);
  }

  // Pokemon/TCG patterns
  const tcgKeywords = ['POKEMON', 'POKÉMON', 'TCG', 'MAGIC', 'MTG', 'YU-GI-OH', 'YUGIOH'];
  for (const keyword of tcgKeywords) {
    if (upperName.includes(keyword)) {
      return shortenTCG(name);
    }
  }

  // Default: truncate if too long
  if (name.length > 50) {
    return name.substring(0, 47) + '...';
  }

  return name;
}

function shortenRAM(name) {
  const parts = [];
  const ramBrands = ['Corsair', 'G.Skill', 'Kingston', 'Crucial', 'TeamGroup', 'ADATA', 'Patriot', 'PNY', 'Samsung'];

  // Find brand
  for (const brand of ramBrands) {
    if (name.toUpperCase().includes(brand.toUpperCase())) {
      parts.push(brand);
      break;
    }
  }

  // Find model name
  const modelPatterns = ['Vengeance', 'Trident', 'Fury', 'Dominator', 'Ripjaws', 'HyperX', 'T-Force'];
  for (const model of modelPatterns) {
    if (name.toUpperCase().includes(model.toUpperCase())) {
      parts.push(model);
      break;
    }
  }

  // Find DDR type
  const ddrMatch = name.match(/DDR[45]/i);
  if (ddrMatch) parts.push(ddrMatch[0].toUpperCase());

  // Find capacity
  const capacityMatch = name.match(/(\d+)\s*GB/i);
  if (capacityMatch) parts.push(capacityMatch[1] + 'GB');

  // Find speed
  const speedMatch = name.match(/(\d{4,5})\s*(MHz|MT\/s)/i);
  if (speedMatch) parts.push(speedMatch[1] + 'MHz');

  return parts.length > 2 ? parts.join(' ') : name.substring(0, 50);
}

function shortenGPU(name) {
  const parts = [];
  const gpuBrands = ['ASUS', 'EVGA', 'MSI', 'Gigabyte', 'Zotac', 'PNY', 'NVIDIA', 'AMD', 'Sapphire', 'XFX', 'PowerColor'];

  // Find brand
  for (const brand of gpuBrands) {
    if (name.toUpperCase().includes(brand.toUpperCase())) {
      parts.push(brand);
      break;
    }
  }

  // Find GPU model
  const rtxMatch = name.match(/(RTX|GTX)\s*(\d{4}(\s*Ti)?)/i);
  const rxMatch = name.match(/RX\s*(\d{4}(\s*XT)?)/i);

  if (rtxMatch) {
    parts.push(rtxMatch[1].toUpperCase() + ' ' + rtxMatch[2]);
  } else if (rxMatch) {
    parts.push('RX ' + rxMatch[1]);
  }

  // Find VRAM
  const vramMatch = name.match(/(\d{1,2})\s*GB/i);
  if (vramMatch) parts.push(vramMatch[1] + 'GB');

  return parts.length > 1 ? parts.join(' ') : name.substring(0, 50);
}

function shortenTCG(name) {
  const parts = [];

  // Always start with Pokemon for Pokemon products
  if (name.toUpperCase().includes('POKEMON') || name.toUpperCase().includes('POKÉMON')) {
    parts.push('Pokemon');
  } else if (name.toUpperCase().includes('MAGIC') || name.toUpperCase().includes('MTG')) {
    parts.push('MTG');
  } else if (name.toUpperCase().includes('YU-GI-OH') || name.toUpperCase().includes('YUGIOH')) {
    parts.push('Yu-Gi-Oh');
  }

  // Find set name
  const pokemonSets = [
    'Prismatic Evolution', 'Surging Sparks', 'Stellar Crown', 'Shrouded Fable',
    'Twilight Masquerade', 'Temporal Forces', 'Paldean Fates', 'Paradox Rift',
    'Obsidian Flames', 'Paldea Evolved', 'Scarlet & Violet', 'Crown Zenith',
    'Silver Tempest', 'Lost Origin', 'Astral Radiance', '151', 'Evolving Skies'
  ];

  for (const set of pokemonSets) {
    if (name.toUpperCase().includes(set.toUpperCase())) {
      parts.push(set);
      break;
    }
  }

  // Find product type
  const productTypes = [
    { pattern: /Elite\s*Trainer\s*Box/i, short: 'ETB' },
    { pattern: /ETB/i, short: 'ETB' },
    { pattern: /Booster\s*Box/i, short: 'Booster Box' },
    { pattern: /Booster\s*Bundle/i, short: 'Booster Bundle' },
    { pattern: /Collection\s*Box/i, short: 'Collection' },
    { pattern: /Premium\s*Collection/i, short: 'Premium Collection' },
    { pattern: /Binder/i, short: 'Binder' },
    { pattern: /Tin/i, short: 'Tin' },
    { pattern: /Bundle/i, short: 'Bundle' },
  ];

  for (const type of productTypes) {
    if (type.pattern.test(name)) {
      parts.push(type.short);
      break;
    }
  }

  return parts.length > 1 ? parts.join(' ') : name.substring(0, 50);
}

// Parse checkout message from Spidey Bot
function parseSpideyBotMessage(message) {
  const content = message.content || '';
  const embed = message.embeds?.[0];

  // Try to parse from embed fields first, then fall back to content
  let product = null;
  let sku = null;
  let qty = null;
  let price = null;
  let imageUrl = null;

  // Get image from embed thumbnail
  if (embed?.thumbnail?.url) {
    imageUrl = embed.thumbnail.url;
  } else if (embed?.image?.url) {
    imageUrl = embed.image.url;
  }

  // Parse embed fields if available
  if (embed?.fields) {
    for (const field of embed.fields) {
      const fieldName = field.name.toLowerCase();
      const fieldValue = field.value.trim();

      if (fieldName.includes('product') || fieldName.includes('item') || fieldName.includes('name')) {
        product = fieldValue;
      } else if (fieldName.includes('sku') || fieldName.includes('asin') || fieldName.includes('id')) {
        sku = fieldValue;
      } else if (fieldName.includes('qty') || fieldName.includes('quantity')) {
        qty = fieldValue;
      } else if (fieldName.includes('price') || fieldName.includes('cost') || fieldName.includes('total')) {
        price = fieldValue;
      }
    }
  }

  // If embed title contains product info
  if (!product && embed?.title) {
    product = embed.title;
  }

  // Parse from message content (label on one line, value on next)
  if (!product || !sku || !qty || !price) {
    const lines = content.split('\n').map(l => l.trim()).filter(l => l);

    for (let i = 0; i < lines.length - 1; i++) {
      const label = lines[i].toLowerCase();
      const value = lines[i + 1];

      if (!product && (label.includes('product') || label.includes('item') || label.includes('name'))) {
        product = value;
      } else if (!sku && (label.includes('sku') || label.includes('asin') || label.includes('id'))) {
        sku = value;
      } else if (!qty && (label.includes('qty') || label.includes('quantity'))) {
        qty = value;
      } else if (!price && (label.includes('price') || label.includes('cost') || label.includes('total'))) {
        price = value;
      }
    }
  }

  // Try to extract from content using regex patterns
  if (!sku) {
    // Match common SKU/ASIN patterns (e.g., B0BLYL79TT)
    const skuMatch = content.match(/\b([A-Z0-9]{10})\b/);
    if (skuMatch) sku = skuMatch[1];
  }

  if (!price) {
    // Match price patterns like $123.45 or 123.45
    const priceMatch = content.match(/\$?([\d,]+\.?\d*)/);
    if (priceMatch) price = priceMatch[1].replace(',', '');
  }

  if (!qty) {
    // Default to 1 if not found
    qty = '1';
  }

  // Clean up extracted values
  if (price) {
    price = price.replace(/[$,]/g, '');
  }

  if (qty) {
    qty = qty.replace(/[^\d]/g, '') || '1';
  }

  // Validate we have minimum required fields
  if (!product || !sku || !price) {
    return null;
  }

  return {
    product: product.trim(),
    sku: sku.trim(),
    qty: parseInt(qty, 10) || 1,
    price: price.trim(),
    imageUrl: imageUrl || null,
  };
}

// Send checkout to API
async function sendCheckout(checkout) {
  try {
    const response = await fetch(`${API_URL}/api/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        product: checkout.product,
        sku: checkout.sku,
        qty: checkout.qty,
        price: checkout.price,
        imageUrl: checkout.imageUrl,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'API request failed');
    }

    const result = await response.json();
    console.log(`[API] Checkout saved: ${checkout.sku} - ${result.action}`);
    return true;
  } catch (err) {
    console.error(`[API] Failed to send checkout: ${err.message}`);
    return false;
  }
}

// Process pending checkouts
async function syncPendingCheckouts() {
  const pending = loadPendingCheckouts();

  if (pending.length === 0) {
    return;
  }

  console.log(`[Sync] Processing ${pending.length} pending checkout(s)...`);

  const stillPending = [];

  for (const checkout of pending) {
    const success = await sendCheckout(checkout);
    if (!success) {
      stillPending.push(checkout);
    }
  }

  savePendingCheckouts(stillPending);

  if (stillPending.length > 0) {
    console.log(`[Sync] ${stillPending.length} checkout(s) still pending`);
  } else {
    console.log('[Sync] All pending checkouts synced successfully');
  }
}

// Bot ready event
client.once('ready', () => {
  console.log(`[Discord] Bot logged in as ${client.user.tag}`);
  console.log(`[Discord] Watching channel: ${DISCORD_CHANNEL_ID}`);
  console.log(`[API] Sending checkouts to: ${API_URL}`);

  // Sync pending checkouts on startup
  syncPendingCheckouts();

  // Sync every 5 minutes
  setInterval(syncPendingCheckouts, 5 * 60 * 1000);
});

// Message create event
client.on('messageCreate', async (message) => {
  // Only process messages from the configured channel
  if (message.channel.id !== DISCORD_CHANNEL_ID) {
    return;
  }

  // Only process messages from Spidey Bot
  const authorName = message.author?.username?.toLowerCase() || '';
  const authorBot = message.author?.bot || false;

  if (!authorBot || !authorName.includes('spidey')) {
    return;
  }

  console.log(`[Discord] Received message from ${message.author.username}`);

  // Parse the checkout message
  const checkout = parseSpideyBotMessage(message);

  if (!checkout) {
    console.log('[Discord] Could not parse checkout from message');
    return;
  }

  // Auto-shorten the product name
  checkout.product = shortenProductName(checkout.product);

  console.log(`[Discord] Parsed checkout: ${checkout.sku} - ${checkout.product} x${checkout.qty} @ $${checkout.price}`);

  // Try to send to API
  const success = await sendCheckout(checkout);

  if (!success) {
    // Save to pending if API fails
    console.log('[Discord] Saving to pending checkouts...');
    const pending = loadPendingCheckouts();
    pending.push({
      ...checkout,
      timestamp: new Date().toISOString(),
    });
    savePendingCheckouts(pending);
  }
});

// Error handling
client.on('error', (error) => {
  console.error('[Discord] Client error:', error.message);
});

process.on('unhandledRejection', (error) => {
  console.error('[Discord] Unhandled rejection:', error.message);
});

// Login to Discord
console.log('[Discord] Starting bot...');
client.login(DISCORD_BOT_TOKEN).catch((err) => {
  console.error('[Discord] Failed to login:', err.message);
  process.exit(1);
});
