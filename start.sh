#!/bin/bash

# Auto-update from Git on startup
echo "Checking for updates..."

# Pull latest changes if this is a git repo
if [ -d ".git" ]; then
  git fetch origin 2>/dev/null

  LOCAL=$(git rev-parse HEAD 2>/dev/null)
  REMOTE=$(git rev-parse @{u} 2>/dev/null)

  if [ "$LOCAL" != "$REMOTE" ]; then
    echo "Updates found! Pulling latest changes..."
    git pull origin $(git branch --show-current) --ff-only

    # Reinstall dependencies if package.json changed
    if git diff --name-only HEAD@{1} HEAD | grep -q "package.json"; then
      echo "Dependencies changed. Reinstalling..."
      npm run install-all
    fi

    echo "Update complete!"
  else
    echo "Already up to date."
  fi
else
  echo "Not a git repository. Skipping update check."
fi

# Start the application
echo "Starting Flip Tracker..."
npm run start:no-bot
