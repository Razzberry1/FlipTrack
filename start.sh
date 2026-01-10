#!/bin/bash

# =============================================================================
# Flip Tracker - Bulletproof Startup Script
# - Auto-syncs from Git with retry logic
# - Handles network failures gracefully
# - Auto-installs dependencies if changed
# =============================================================================

set -e  # Exit on error

echo "=============================================="
echo "🚀 Flip Tracker Starting..."
echo "=============================================="

# Retry function with exponential backoff
retry_command() {
    local max_attempts=4
    local delay=2
    local attempt=1
    local cmd="$@"

    while [ $attempt -le $max_attempts ]; do
        echo "Attempt $attempt/$max_attempts: $cmd"
        if eval "$cmd"; then
            return 0
        fi

        if [ $attempt -lt $max_attempts ]; then
            echo "⚠️ Failed. Retrying in ${delay}s..."
            sleep $delay
            delay=$((delay * 2))
        fi
        attempt=$((attempt + 1))
    done

    echo "❌ Command failed after $max_attempts attempts"
    return 1
}

# Git sync function
sync_from_git() {
    if [ ! -d ".git" ]; then
        echo "📁 Not a git repository. Skipping sync."
        return 0
    fi

    echo "🔄 Checking for updates from GitHub..."

    # Get current branch
    BRANCH=$(git branch --show-current 2>/dev/null || echo "main")
    echo "📌 Current branch: $BRANCH"

    # Fetch with retry
    if ! retry_command "git fetch origin $BRANCH 2>/dev/null"; then
        echo "⚠️ Could not fetch from remote. Continuing with local version..."
        return 0
    fi

    # Check if we need to update
    LOCAL=$(git rev-parse HEAD 2>/dev/null)
    REMOTE=$(git rev-parse "origin/$BRANCH" 2>/dev/null || echo "$LOCAL")

    if [ "$LOCAL" = "$REMOTE" ]; then
        echo "✅ Already up to date."
        return 0
    fi

    echo "📥 Updates found! Pulling latest changes..."

    # Store current HEAD for dependency check
    OLD_HEAD=$LOCAL

    # Try fast-forward pull first
    if git pull origin "$BRANCH" --ff-only 2>/dev/null; then
        echo "✅ Fast-forward update successful!"
    else
        echo "⚠️ Fast-forward failed. Attempting reset..."

        # Stash any local changes
        git stash push -m "auto-stash-$(date +%s)" 2>/dev/null || true

        # Hard reset to remote (ensures clean sync)
        if git reset --hard "origin/$BRANCH"; then
            echo "✅ Reset to remote successful!"
        else
            echo "❌ Could not sync. Continuing with current version..."
            return 0
        fi
    fi

    # Check if dependencies changed
    if git diff --name-only "$OLD_HEAD" HEAD 2>/dev/null | grep -qE "package\.json|package-lock\.json"; then
        echo "📦 Dependencies changed. Reinstalling..."
        npm run install-all
    fi

    echo "✅ Sync complete!"
}

# Install dependencies if node_modules is missing
check_dependencies() {
    if [ ! -d "node_modules" ] || [ ! -d "server/node_modules" ] || [ ! -d "client/node_modules" ]; then
        echo "📦 Installing dependencies..."
        npm run install-all
    fi
}

# Main startup sequence
main() {
    # Step 1: Sync from Git
    sync_from_git

    # Step 2: Ensure dependencies are installed
    check_dependencies

    # Step 3: Start the application
    echo ""
    echo "=============================================="
    echo "🌐 Starting Flip Tracker Server..."
    echo "=============================================="

    # Use start:no-bot since Python bot runs separately
    # Change to 'npm start' if you want to run the Node.js bot too
    npm run start:no-bot
}

# Run main function
main
