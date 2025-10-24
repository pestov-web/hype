# Production Deployment Checklist

## ⚠️ Critical Fix Applied (v2)

**Problem:** WebRTC connections fail with `connection state: failed`

**Root Cause #1:** Backend was listening on `127.0.0.1` → **FIXED** ✅  
**Root Cause #2:** Backend sends `0.0.0.0` instead of public IP in ICE candidates → **FIXED** ✅

**Solution:**

-   Conditional `listenIps` configuration based on `NODE_ENV` and `SFU_ANNOUNCED_IP`
-   Production: `ip: '0.0.0.0'` + `announcedIp: process.env.SFU_ANNOUNCED_IP`
-   Development: `ip: '127.0.0.1'` (no announcedIp needed)

**Key Change:** If `SFU_ANNOUNCED_IP` is not set, fallback to localhost mode instead of sending `0.0.0.0`

---

## 🚀 Deploy to Production Server

### Step 1: Prepare Server

```bash
# SSH into server
ssh user@185.128.105.95

# Navigate to project
cd ~/hype
```

### Step 2: Pull Latest Code

```bash
# Pull changes
git pull origin develop

# Verify .env.production exists
cat backend/.env.production | grep SFU_ANNOUNCED_IP
# Should show: SFU_ANNOUNCED_IP="185.128.105.95"
```

### Step 3: Open Firewall Ports

**CRITICAL: WebRTC will NOT work without these ports!**

```bash
# Open RTC media ports (UDP is essential!)
sudo ufw allow 40000:49999/udp
sudo ufw allow 40000:49999/tcp  # Fallback
sudo ufw reload

# Verify ports are open
sudo ufw status | grep 40000
# Expected output:
# 40000:49999/udp    ALLOW       Anywhere
# 40000:49999/tcp    ALLOW       Anywhere
```

### Step 4: Build Backend

```bash
cd ~/hype/backend

# Install dependencies
pnpm install --frozen-lockfile

# Build TypeScript
pnpm build

# Verify build succeeded
ls -la dist/
# Should see: index.js, config/, routes/, services/, etc.
```

### Step 5: Restart Backend with PM2

```bash
# Stop old process
pm2 delete hype-backend

# Start with production environment
NODE_ENV=production pm2 start dist/index.js --name hype-backend --max-memory-restart 1G

# Save PM2 config
pm2 save

# Enable auto-start on reboot
pm2 startup

# Watch logs in real-time
pm2 logs hype-backend --lines 50
```

### Step 6: Verify ICE Candidates

**Look for PUBLIC IP in logs (not 127.0.0.1):**

```bash
pm2 logs hype-backend | grep "ICE candidates"
```

**Expected (GOOD):**

```json
{
    "ip": "185.128.105.95", // ✅ Public IP
    "protocol": "udp",
    "port": 42315
}
```

**Bad (FAILED):**

```json
{
    "ip": "127.0.0.1", // ❌ Localhost
    "protocol": "udp",
    "port": 42315
}
```

### Step 7: Build and Deploy Frontend

```bash
cd ~/hype/frontend

# Verify .env.production
cat .env.production
# Should show:
# VITE_API_URL=https://pestov-web.ru/api
# VITE_WS_URL=wss://pestov-web.ru/ws

# Install dependencies
pnpm install --frozen-lockfile

# Build production bundle
pnpm build

# Copy to web root
sudo rsync -av --delete dist/ /var/www/voice.pestov-web.ru/

# Verify files copied
ls -la /var/www/voice.pestov-web.ru/
# Should see: index.html, assets/, *.js, *.css, etc.
```

### Step 8: Test WebRTC Connection

1. **Open browser:** https://voice.pestov-web.ru
2. **Open DevTools Console (F12)**
3. **Join voice channel**
4. **Check logs for:**

```javascript
✅ Success:
🧊 [SFU] Received ICE candidates: [{ip: "185.128.105.95", ...}]
🔌 [SFU] Send transport connection state: connecting
🔌 [SFU] Send transport connection state: connected  // ✅ SUCCESS!

❌ Failure:
🧊 [SFU] Received ICE candidates: [{ip: "127.0.0.1", ...}]
🔌 [SFU] Send transport connection state: failed  // ❌ FAILED
```

---

## 🐛 Troubleshooting

### Issue 1: ICE candidates show `0.0.0.0` instead of public IP

**Symptom in backend logs:**

```json
🧊 ICE candidates for send transport: [
  {
    "ip": "0.0.0.0",  // ❌ Wrong!
    "port": 45640
  }
]
```

**Cause:** `SFU_ANNOUNCED_IP` environment variable not loaded by PM2

**Solution:**

```bash
# Step 1: Verify .env.production has correct IP
cat ~/hype/backend/.env.production | grep SFU_ANNOUNCED_IP
# Should show: SFU_ANNOUNCED_IP="185.128.105.95"

# Step 2: Check if PM2 sees the variable
pm2 env hype-backend | grep SFU_ANNOUNCED_IP
# If empty, variable is not loaded!

# Step 3: Restart with explicit environment
pm2 delete hype-backend
cd ~/hype/backend

# Option A: Use ecosystem file (recommended)
# NOTE: Use .cjs extension for CommonJS in ESM project
cat > ecosystem.config.cjs << 'EOF'
module.exports = {
  apps: [{
    name: 'hype-backend',
    script: './dist/index.js',
    instances: 1,
    max_memory_restart: '1G',
    env_production: {
      NODE_ENV: 'production',
      SFU_ANNOUNCED_IP: '185.128.105.95',  // Replace with your IP
      RTC_MIN_PORT: '40000',
      RTC_MAX_PORT: '49999',
      SFU_LOG_LEVEL: 'warn'
    }
  }]
}
EOF

pm2 start ecosystem.config.cjs --env production
pm2 save

# Option B: Load from .env.production (requires dotenv)
pm2 start dist/index.js --name hype-backend --env production -- --env-file=.env.production

# Option C: Inline environment variables
NODE_ENV=production SFU_ANNOUNCED_IP=185.128.105.95 pm2 start dist/index.js --name hype-backend
pm2 save

# Step 4: Verify it worked
pm2 logs hype-backend --lines 20 | grep "ICE candidates"
# Should now show: "ip": "185.128.105.95" ✅
```

### Issue 2: Still seeing `127.0.0.1` in ICE candidates

**Cause:** `NODE_ENV` not set to `production`

**Solution:**

```bash
# Check PM2 environment
pm2 env hype-backend | grep NODE_ENV
# Should show: NODE_ENV=production

# If not, restart with explicit NODE_ENV
pm2 delete hype-backend
NODE_ENV=production pm2 start ~/hype/backend/dist/index.js --name hype-backend
pm2 save
```

### Issue 3: `connection state: failed`

**Cause:** Firewall blocking UDP ports

**Solution:**

```bash
# Check firewall status
sudo ufw status numbered

# If ports NOT in list, add them:
sudo ufw allow 40000:49999/udp
sudo ufw reload

# Test UDP port from client machine
nc -u -v 185.128.105.95 42315
```

### Issue 3: Backend crashes on startup

**Cause:** Port already in use or missing dependencies

**Solution:**

```bash
# Check if port 3001 is in use
sudo lsof -i :3001

# Kill old process
sudo kill -9 <PID>

# Rebuild
cd ~/hype/backend
rm -rf dist node_modules
pnpm install
pnpm build
```

---

## ✅ Success Criteria

After deployment, verify:

-   [ ] Backend logs show public IP in ICE candidates: `185.128.105.95`
-   [ ] Firewall allows UDP ports 40000-49999: `sudo ufw status | grep 40000`
-   [ ] Frontend loads without errors: https://voice.pestov-web.ru
-   [ ] VAD model loads successfully (no MIME errors)
-   [ ] WebSocket connects: Look for `🔌 WebSocket Server running` in logs
-   [ ] WebRTC transports connect: `Send transport connection state: connected`
-   [ ] **Audio works between 2+ users in same voice channel** ✅

---

## 📊 Monitoring

### Watch Backend Logs

```bash
# Real-time logs
pm2 logs hype-backend --lines 100

# Filter for errors
pm2 logs hype-backend --err --lines 50

# Export logs for debugging
pm2 logs hype-backend --lines 1000 --nostream > ~/debug.log
```

### Check Active RTC Connections

```bash
# Count active UDP connections on RTC ports
sudo netstat -anup | grep -E '40[0-9]{3}' | wc -l

# Show details
sudo ss -u -a sport ge 40000 sport le 49999
```

### Backend Health

```bash
# HTTP API health
curl http://localhost:3001/health

# SFU health
curl http://localhost:3001/api/sfu/health
```

---

## 🔄 Rolling Back

If deployment fails:

```bash
# 1. Stop backend
pm2 stop hype-backend

# 2. Checkout previous working commit
cd ~/hype
git log --oneline -10  # Find working commit hash
git checkout <commit-hash>

# 3. Rebuild
cd backend
pnpm install
pnpm build

# 4. Restart
pm2 restart hype-backend
```

---

## 📚 Additional Resources

-   Full setup guide: `docs/SFU_PRODUCTION_SETUP.md`
-   Architecture docs: `docs/PURE_SFU_APPROACH.md`
-   Copilot instructions: `.github/copilot-instructions.md`

**Need help?** Check backend logs: `pm2 logs hype-backend --lines 100`
