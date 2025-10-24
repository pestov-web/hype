# 🚀 Production Deployment - Quick Start

## Current Issue: ICE Candidates Show `0.0.0.0`

**Backend logs show:**

```json
🧊 ICE candidates: [{ "ip": "0.0.0.0", ... }]  // ❌ Wrong!
```

**Expected:**

```json
🧊 ICE candidates: [{ "ip": "185.128.105.95", ... }]  // ✅ Correct!
```

---

## 🎯 Solution: Use PM2 Ecosystem File

### On Production Server (SSH required)

```bash
# 1. Navigate to project
cd ~/hype

# 2. Pull latest code
git pull origin develop

# 3. Edit ecosystem.config.cjs with your public IP
cd backend
nano ecosystem.config.cjs

# Find this line and replace with your actual IP:
# SFU_ANNOUNCED_IP: '185.128.105.95',  // ⚠️ REPLACE with: curl -4 ifconfig.me

# Get your public IP:
curl -4 ifconfig.me
# Example output: 185.128.105.95

# Update ecosystem.config.cjs:
# SFU_ANNOUNCED_IP: '185.128.105.95',  // Your actual IP here

# 4. Build backend
pnpm install --frozen-lockfile
pnpm build

# 5. Stop old PM2 process
pm2 delete hype-backend

# 6. Start with ecosystem file (NOTE: .cjs extension for CommonJS)
pm2 start ecosystem.config.cjs --env production

# 7. Save PM2 config
pm2 save

# 8. Enable auto-start on reboot
pm2 startup
# Follow the printed command (usually: sudo env PATH=$PATH:...)

# 9. Verify environment variables
pm2 env hype-backend | grep -E "NODE_ENV|SFU_ANNOUNCED_IP"
# Expected:
# NODE_ENV=production
# SFU_ANNOUNCED_IP=185.128.105.95

# 10. Check logs for correct ICE candidates
pm2 logs hype-backend --lines 20

# Join voice channel in browser, then check logs:
# Should see: "ip": "185.128.105.95" ✅
```

---

## ✅ Verification Checklist

After deployment, verify:

1. **Backend logs show public IP:**

    ```bash
    pm2 logs hype-backend | grep "ICE candidates"
    # Should see: "ip": "185.128.105.95"
    ```

2. **PM2 environment is correct:**

    ```bash
    pm2 env hype-backend | grep SFU_ANNOUNCED_IP
    # Should show: SFU_ANNOUNCED_IP=185.128.105.95
    ```

3. **Firewall allows RTC ports:**

    ```bash
    sudo ufw status | grep 40000
    # Should show:
    # 40000:49999/udp    ALLOW       Anywhere
    # 40000:49999/tcp    ALLOW       Anywhere
    ```

4. **Browser shows successful connection:**
    - Open https://voice.pestov-web.ru
    - Join voice channel
    - Check DevTools Console:
    ```javascript
    🧊 [SFU] Received ICE candidates: [{ip: "185.128.105.95", ...}]
    🔌 [SFU] Send transport connection state: connected  ✅
    ```

---

## 🐛 Still Not Working?

### Issue: `pm2 env` shows empty `SFU_ANNOUNCED_IP`

**Solution:**

```bash
# Edit ecosystem.config.cjs and verify SFU_ANNOUNCED_IP is set
grep SFU_ANNOUNCED_IP backend/ecosystem.config.cjs

# Restart PM2
pm2 delete hype-backend
pm2 start backend/ecosystem.config.cjs --env production
pm2 save
```

### Issue: Still seeing `0.0.0.0` in logs

**Solution:**

```bash
# Check if backend was rebuilt after config change
ls -la backend/dist/config/sfu.config.js

# Rebuild if needed
cd backend
pnpm build
pm2 restart hype-backend
```

### Issue: Firewall blocking connections

**Solution:**

```bash
# Ensure firewall rules are active
sudo ufw status numbered

# Add missing rules
sudo ufw allow 40000:49999/udp
sudo ufw allow 40000:49999/tcp
sudo ufw reload
```

---

## 📊 Monitoring

```bash
# Watch logs in real-time
pm2 logs hype-backend --lines 100

# Monitor resource usage
pm2 monit

# Check process status
pm2 status

# View environment
pm2 env hype-backend
```

---

## 🔄 Rollback

If deployment fails:

```bash
# Stop backend
pm2 stop hype-backend

# Checkout previous commit
cd ~/hype
git log --oneline -5
git checkout <previous-commit-hash>

# Rebuild
cd backend
pnpm build

# Restart
pm2 restart hype-backend
```

---

## 📚 Files Modified

-   `backend/src/config/sfu.config.ts` - Conditional listenIps based on NODE_ENV
-   `backend/ecosystem.config.cjs` - PM2 configuration with environment variables (CommonJS)
-   `DEPLOY_CHECKLIST.md` - Detailed deployment guide
-   `fix-ice-candidates.sh` - Automated fix script

**Documentation:**

-   Full guide: `DEPLOY_CHECKLIST.md`
-   SFU setup: `docs/SFU_PRODUCTION_SETUP.md`

---

**Need Help?** Check backend logs: `pm2 logs hype-backend --lines 100`
