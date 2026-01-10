#!/usr/bin/env python3
"""
Bulletproof Discord Checkout Bot for FlipTrack
- Watches Spidey Bot messages for checkouts
- Saves failed checkouts locally
- Auto-syncs on startup and every 2 minutes
- Exponential backoff for retries
"""

import discord
import requests
import json
import os
import re
import time
import asyncio
from datetime import datetime
from pathlib import Path

# =============================================================================
# CONFIGURATION - UPDATE THESE VALUES
# =============================================================================
DISCORD_BOT_TOKEN = os.getenv('DISCORD_BOT_TOKEN', 'YOUR_BOT_TOKEN_HERE')
DISCORD_CHANNEL_ID = int(os.getenv('DISCORD_CHANNEL_ID', '0'))
API_URL = os.getenv('API_URL', 'https://YOUR-REPLIT-URL.repl.co')  # Your Replit URL
# =============================================================================

# File to store pending checkouts when API is down
PENDING_FILE = Path(__file__).parent / 'pending_checkouts.json'
SYNC_INTERVAL = 120  # Sync every 2 minutes
MAX_RETRIES = 5
RETRY_DELAYS = [2, 4, 8, 16, 32]  # Exponential backoff

intents = discord.Intents.default()
intents.message_content = True
client = discord.Client(intents=intents)


def log(message):
    """Print timestamped log message"""
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    print(f"[{timestamp}] {message}")


def load_pending():
    """Load pending checkouts from file"""
    if PENDING_FILE.exists():
        try:
            with open(PENDING_FILE, 'r') as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            return []
    return []


def save_pending(checkouts):
    """Save pending checkouts to file"""
    try:
        with open(PENDING_FILE, 'w') as f:
            json.dump(checkouts, f, indent=2)
    except IOError as e:
        log(f"❌ Failed to save pending checkouts: {e}")


def add_pending(checkout_data):
    """Add a checkout to pending queue"""
    pending = load_pending()
    checkout_data['added_at'] = datetime.now().isoformat()
    checkout_data['retry_count'] = 0
    pending.append(checkout_data)
    save_pending(pending)
    log(f"📥 Saved to pending queue: {checkout_data.get('sku', 'unknown')}")


def send_checkout(checkout_data, retry=True):
    """
    Send checkout to API with retry logic
    Returns True if successful, False otherwise
    """
    for attempt in range(MAX_RETRIES):
        try:
            response = requests.post(
                f"{API_URL}/api/checkout",
                json=checkout_data,
                timeout=30,
                headers={'Content-Type': 'application/json'}
            )

            if response.status_code == 200:
                result = response.json()
                log(f"✅ Checkout sent: {checkout_data.get('sku')} - {result.get('action', 'success')}")
                return True
            elif response.status_code == 400:
                # Bad request - don't retry, data is invalid
                log(f"❌ Invalid checkout data: {response.text}")
                return True  # Return True to remove from queue (won't fix itself)
            else:
                log(f"⚠️ API returned {response.status_code}: {response.text}")

        except requests.exceptions.ConnectionError:
            log(f"🔌 Connection failed (attempt {attempt + 1}/{MAX_RETRIES}) - Replit may be sleeping")
        except requests.exceptions.Timeout:
            log(f"⏱️ Request timeout (attempt {attempt + 1}/{MAX_RETRIES})")
        except requests.exceptions.RequestException as e:
            log(f"❌ Request error: {e}")

        if attempt < MAX_RETRIES - 1 and retry:
            delay = RETRY_DELAYS[min(attempt, len(RETRY_DELAYS) - 1)]
            log(f"⏳ Retrying in {delay}s...")
            time.sleep(delay)

    return False


def sync_pending():
    """Sync all pending checkouts to API"""
    pending = load_pending()

    if not pending:
        return 0

    log(f"🔄 Syncing {len(pending)} pending checkout(s)...")

    synced = 0
    still_pending = []

    for checkout in pending:
        # Remove metadata before sending
        data = {k: v for k, v in checkout.items()
                if k not in ['added_at', 'retry_count']}

        if send_checkout(data, retry=False):  # Single attempt per item during sync
            synced += 1
        else:
            # Increment retry count and keep in queue
            checkout['retry_count'] = checkout.get('retry_count', 0) + 1

            # Give up after 50 retries (about 100 minutes of sync attempts)
            if checkout['retry_count'] < 50:
                still_pending.append(checkout)
            else:
                log(f"🗑️ Giving up on checkout after 50 retries: {checkout.get('sku')}")

    save_pending(still_pending)

    if synced > 0:
        log(f"✅ Synced {synced} checkout(s), {len(still_pending)} still pending")

    return synced


def check_api_health():
    """Check if API is reachable"""
    try:
        response = requests.get(f"{API_URL}/health", timeout=10)
        return response.status_code == 200
    except:
        return False


def parse_spidey_message(message):
    """Parse checkout data from Spidey Bot message"""
    content = message.content

    # Extract fields using regex
    product_match = re.search(r'Product:\s*(.+?)(?:\n|$)', content)
    sku_match = re.search(r'SKU:\s*(\S+)', content)
    qty_match = re.search(r'Qty:\s*(\d+)', content)
    price_match = re.search(r'Price:\s*\$?([\d.]+)', content)

    if not all([product_match, sku_match, qty_match, price_match]):
        return None

    checkout_data = {
        'product': product_match.group(1).strip(),
        'sku': sku_match.group(1).strip(),
        'qty': qty_match.group(1).strip(),
        'price': price_match.group(1).strip()
    }

    # Extract image from embed if present
    if message.embeds:
        for embed in message.embeds:
            if embed.thumbnail and embed.thumbnail.url:
                checkout_data['imageUrl'] = embed.thumbnail.url
                break
            if embed.image and embed.image.url:
                checkout_data['imageUrl'] = embed.image.url
                break

    return checkout_data


async def periodic_sync():
    """Background task to sync pending checkouts periodically"""
    await client.wait_until_ready()

    while not client.is_closed():
        try:
            pending = load_pending()
            if pending:
                if check_api_health():
                    sync_pending()
                else:
                    log(f"💤 API not reachable, {len(pending)} checkout(s) waiting...")
        except Exception as e:
            log(f"❌ Sync error: {e}")

        await asyncio.sleep(SYNC_INTERVAL)


@client.event
async def on_ready():
    log(f"🤖 Bot connected as {client.user}")
    log(f"📡 API URL: {API_URL}")
    log(f"👀 Watching channel: {DISCORD_CHANNEL_ID}")

    # Sync pending checkouts on startup
    pending_count = len(load_pending())
    if pending_count > 0:
        log(f"📋 Found {pending_count} pending checkout(s) from previous session")

        if check_api_health():
            log("🌐 API is online - syncing now...")
            sync_pending()
        else:
            log("💤 API is offline - will sync when available")

    # Start periodic sync task
    client.loop.create_task(periodic_sync())


@client.event
async def on_message(message):
    # Only process messages from Spidey Bot in the specified channel
    if message.channel.id != DISCORD_CHANNEL_ID:
        return

    if not message.author.bot:
        return

    # Check if it's from Spidey Bot (adjust name if needed)
    if 'spidey' not in message.author.name.lower():
        return

    # Parse the checkout data
    checkout_data = parse_spidey_message(message)

    if not checkout_data:
        return

    log(f"📦 New checkout detected: {checkout_data['product'][:50]}...")

    # Try to send immediately
    if send_checkout(checkout_data):
        return  # Success!

    # Failed - save to pending queue
    add_pending(checkout_data)


def main():
    log("=" * 50)
    log("🚀 FlipTrack Discord Bot Starting...")
    log("=" * 50)

    # Validate configuration
    if DISCORD_BOT_TOKEN == 'YOUR_BOT_TOKEN_HERE':
        log("❌ ERROR: Set DISCORD_BOT_TOKEN environment variable")
        return

    if DISCORD_CHANNEL_ID == 0:
        log("❌ ERROR: Set DISCORD_CHANNEL_ID environment variable")
        return

    if 'YOUR-REPLIT-URL' in API_URL:
        log("⚠️ WARNING: Update API_URL with your actual Replit URL")

    # Check for pending checkouts
    pending = load_pending()
    if pending:
        log(f"📋 {len(pending)} pending checkout(s) will sync when API is available")

    # Start the bot
    try:
        client.run(DISCORD_BOT_TOKEN)
    except discord.LoginFailure:
        log("❌ Invalid Discord bot token")
    except Exception as e:
        log(f"❌ Bot error: {e}")


if __name__ == '__main__':
    main()
