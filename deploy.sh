#!/bin/bash
# Quick deployment script for production server
# Run this on the server: bash deploy.sh

set -e  # Exit on error

echo "🚀 Hype Production Deployment"
echo "=============================="
echo ""

# Step 1: Pull latest code
echo "📥 Step 1/7: Pulling latest code..."
git pull origin develop
echo "✅ Code updated"
echo ""

# Step 2: Check environment
echo "🔍 Step 2/7: Checking environment..."
if [ ! -f backend/.env.production ]; then
    echo "❌ ERROR: backend/.env.production not found!"
    exit 1
fi

SFU_IP=$(grep SFU_ANNOUNCED_IP backend/.env.production | cut -d'=' -f2 | tr -d '"')
if [ "$SFU_IP" == "YOUR_SERVER_PUBLIC_IP_HERE" ] || [ -z "$SFU_IP" ]; then
    echo "❌ ERROR: SFU_ANNOUNCED_IP not configured in .env.production"
    echo "Run: curl -4 ifconfig.me"
    echo "Then edit backend/.env.production"
    exit 1
fi

echo "✅ SFU_ANNOUNCED_IP: $SFU_IP"
echo ""

# Step 3: Check firewall
echo "🔥 Step 3/7: Checking firewall..."
if ! sudo ufw status | grep -q "40000:49999/udp"; then
    echo "⚠️  WARNING: RTC ports not open in firewall!"
    echo "Run these commands:"
    echo "  sudo ufw allow 40000:49999/udp"
    echo "  sudo ufw allow 40000:49999/tcp"
    echo "  sudo ufw reload"
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo "✅ Firewall configured"
fi
echo ""

# Step 4: Build backend
echo "🔨 Step 4/7: Building backend..."
cd backend
pnpm install --frozen-lockfile
pnpm build
if [ ! -f dist/index.js ]; then
    echo "❌ ERROR: Backend build failed"
    exit 1
fi
echo "✅ Backend built successfully"
cd ..
echo ""

# Step 5: Restart backend
echo "🔄 Step 5/7: Restarting backend..."
pm2 delete hype-backend 2>/dev/null || true
NODE_ENV=production pm2 start backend/dist/index.js --name hype-backend --max-memory-restart 1G
pm2 save
echo "✅ Backend restarted"
echo ""

# Step 6: Build frontend
echo "🎨 Step 6/7: Building frontend..."
cd frontend
pnpm install --frozen-lockfile
pnpm build
if [ ! -f dist/index.html ]; then
    echo "❌ ERROR: Frontend build failed"
    exit 1
fi
echo "✅ Frontend built successfully"
cd ..
echo ""

# Step 7: Deploy frontend
echo "📦 Step 7/7: Deploying frontend..."
WEB_ROOT="/var/www/voice.pestov-web.ru"
if [ ! -d "$WEB_ROOT" ]; then
    echo "❌ ERROR: Web root $WEB_ROOT does not exist"
    exit 1
fi

sudo rsync -av --delete frontend/dist/ $WEB_ROOT/
echo "✅ Frontend deployed to $WEB_ROOT"
echo ""

# Verify deployment
echo "🔍 Verifying deployment..."
echo ""

# Check backend health
echo -n "Backend health: "
if curl -s http://localhost:3001/health | grep -q "ok"; then
    echo "✅ OK"
else
    echo "❌ FAILED"
    echo "Check logs: pm2 logs hype-backend"
fi

# Check SFU health
echo -n "SFU health: "
if curl -s http://localhost:3001/api/sfu/health | grep -q "healthy"; then
    echo "✅ OK"
else
    echo "❌ FAILED"
    echo "Check logs: pm2 logs hype-backend"
fi

# Check ICE candidates
echo -n "ICE candidates: "
sleep 2  # Wait for logs
if pm2 logs hype-backend --nostream --lines 100 | grep -q "\"ip\": \"$SFU_IP\""; then
    echo "✅ Public IP ($SFU_IP) announced"
else
    echo "⚠️  WARNING: Public IP not found in logs yet"
    echo "Check: pm2 logs hype-backend | grep 'ICE candidates'"
fi

echo ""
echo "=============================="
echo "✅ Deployment Complete!"
echo "=============================="
echo ""
echo "Next steps:"
echo "1. Open https://voice.pestov-web.ru in browser"
echo "2. Join voice channel"
echo "3. Check DevTools Console for:"
echo "   ✅ '🔌 [SFU] Send transport connection state: connected'"
echo ""
echo "Logs: pm2 logs hype-backend --lines 100"
echo "Monitor: pm2 monit"
echo ""
