#!/bin/bash
# Quick fix for WebRTC ICE candidates issue
# Run on production server

echo "🔧 WebRTC ICE Candidates Fix"
echo "============================"
echo ""

# Check current environment
echo "📋 Current environment:"
echo "NODE_ENV=${NODE_ENV}"
echo "SFU_ANNOUNCED_IP=${SFU_ANNOUNCED_IP}"
echo ""

# Pull latest code
echo "📥 Pulling latest code..."
cd ~/hype
git pull origin develop

# Check .env.production
if [ ! -f backend/.env.production ]; then
    echo "❌ ERROR: backend/.env.production not found!"
    exit 1
fi

# Extract SFU_ANNOUNCED_IP from .env.production
SFU_IP=$(grep SFU_ANNOUNCED_IP backend/.env.production | cut -d'=' -f2 | tr -d '"' | tr -d ' ')

if [ -z "$SFU_IP" ] || [ "$SFU_IP" == "YOUR_SERVER_PUBLIC_IP_HERE" ]; then
    echo "❌ ERROR: SFU_ANNOUNCED_IP not configured!"
    echo "Current value: '$SFU_IP'"
    echo ""
    echo "Fix it:"
    echo "1. Get public IP: curl -4 ifconfig.me"
    echo "2. Edit backend/.env.production"
    echo "3. Set: SFU_ANNOUNCED_IP=\"YOUR_PUBLIC_IP\""
    exit 1
fi

echo "✅ SFU_ANNOUNCED_IP from .env.production: $SFU_IP"
echo ""

# Rebuild backend
echo "🔨 Building backend..."
cd backend
pnpm install --frozen-lockfile
pnpm build

if [ ! -f dist/index.js ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo "✅ Backend built"
echo ""

# Restart backend with explicit environment variables
echo "🔄 Restarting backend with NODE_ENV=production..."
pm2 delete hype-backend 2>/dev/null || true

# Start with explicit environment variables
NODE_ENV=production pm2 start dist/index.js \
    --name hype-backend \
    --max-memory-restart 1G \
    --env production

pm2 save
echo "✅ Backend restarted"
echo ""

# Wait for startup
echo "⏳ Waiting for backend to start..."
sleep 3

# Check if process is running
if ! pm2 list | grep -q "hype-backend.*online"; then
    echo "❌ Backend failed to start!"
    echo "Check logs: pm2 logs hype-backend --err"
    exit 1
fi

echo "✅ Backend is online"
echo ""

# Check environment variables in PM2
echo "🔍 PM2 environment check:"
pm2 env hype-backend | grep -E "NODE_ENV|SFU_ANNOUNCED_IP" || echo "⚠️ Environment variables not visible in pm2 env"
echo ""

# Check logs for ICE candidates
echo "🧊 Checking ICE candidates in logs (last 10 seconds)..."
sleep 2

# Tail logs and look for ICE candidates
echo "Waiting for voice channel join..."
echo "Join a voice channel in browser, then press Ctrl+C"
echo ""

pm2 logs hype-backend --lines 0 --raw | grep --line-buffered "ICE candidates" | head -n 1 | while read line; do
    echo "$line"
    
    if echo "$line" | grep -q "\"ip\": \"$SFU_IP\""; then
        echo ""
        echo "✅ SUCCESS: Public IP ($SFU_IP) found in ICE candidates!"
        echo ""
        echo "Next steps:"
        echo "1. Open https://voice.pestov-web.ru"
        echo "2. Join voice channel"
        echo "3. Check Console: '🔌 [SFU] Send transport connection state: connected'"
        echo ""
        pkill -P $$ pm2
    elif echo "$line" | grep -q "\"ip\": \"0.0.0.0\""; then
        echo ""
        echo "❌ FAILED: Still showing 0.0.0.0"
        echo ""
        echo "Troubleshooting:"
        echo "1. Check .env.production: cat backend/.env.production | grep SFU_ANNOUNCED_IP"
        echo "2. Restart with explicit env: NODE_ENV=production SFU_ANNOUNCED_IP=$SFU_IP pm2 restart hype-backend"
        echo "3. Check PM2 logs: pm2 logs hype-backend --lines 50"
        echo ""
        pkill -P $$ pm2
    elif echo "$line" | grep -q "\"ip\": \"127.0.0.1\""; then
        echo ""
        echo "❌ FAILED: Still showing 127.0.0.1 (development mode)"
        echo ""
        echo "Troubleshooting:"
        echo "1. Ensure NODE_ENV=production is set"
        echo "2. Restart: pm2 delete hype-backend && NODE_ENV=production pm2 start backend/dist/index.js --name hype-backend"
        echo "3. Verify: pm2 env hype-backend | grep NODE_ENV"
        echo ""
        pkill -P $$ pm2
    fi
done

echo ""
echo "Manual check:"
echo "pm2 logs hype-backend | grep 'ICE candidates'"
