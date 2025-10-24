#!/bin/bash

# Hype Application Update Script
# Usage: ./update.sh

set -e  # Exit on any error

echo "🚀 Starting Hype update..."

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Change to project directory
cd "$(dirname "$0")"
PROJECT_DIR=$(pwd)

echo -e "${YELLOW}📂 Project directory: $PROJECT_DIR${NC}"

# Pull latest changes
echo -e "${YELLOW}🔄 Pulling latest changes from git...${NC}"
git pull

# Backend update
echo -e "${YELLOW}📦 Updating backend...${NC}"
cd backend
pnpm install
pnpm build

# Check if mediasoup worker exists
if [ ! -f "node_modules/mediasoup/worker/out/Release/mediasoup-worker" ]; then
    echo -e "${RED}⚠️  mediasoup worker not found, downloading...${NC}"
    node scripts/download-mediasoup-worker.js || true
fi

# Frontend update
echo -e "${YELLOW}📦 Updating frontend...${NC}"
cd ../frontend
pnpm install
pnpm build

# Database migrations
echo -e "${YELLOW}🗄️  Running database migrations...${NC}"
cd ../backend
pnpm prisma migrate deploy

# Restart application
echo -e "${YELLOW}🔄 Restarting application...${NC}"
pm2 restart hype-backend || pm2 start ../ecosystem.config.js

echo -e "${GREEN}✅ Update completed successfully!${NC}"
echo ""
echo "📊 Application status:"
pm2 status

echo ""
echo -e "${GREEN}🎉 Hype is up and running!${NC}"
