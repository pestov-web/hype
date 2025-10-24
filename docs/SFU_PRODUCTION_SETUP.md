# SFU Production Setup Guide

## 🔴 Critical Issue: WebRTC Transport Failed

**Error:** `🔌 [SFU] Send transport connection state: failed`

**Cause:** WebRTC cannot establish connection because:

1. Server firewall blocks RTC ports
2. SFU_ANNOUNCED_IP not set to server's public IP
3. Client gets localhost (127.0.0.1) ICE candidates instead of public IP

---

## 🔧 Required Configuration

### Step 1: Get Server Public IP

```bash
# On production server, run:
curl -4 ifconfig.me

# Example output:
# 185.123.45.67
```

### Step 2: Open Firewall Ports

**WebRTC requires UDP ports for media transport!**

```bash
# On Ubuntu/Debian with ufw
sudo ufw allow 3001/tcp              # Backend HTTP API
sudo ufw allow 8080/tcp              # WebSocket signaling
sudo ufw allow 40000:49999/udp       # RTC media ports (CRITICAL!)
sudo ufw allow 40000:49999/tcp       # RTC fallback
sudo ufw reload

# Verify
sudo ufw status numbered
```

**Expected output:**

```
Status: active

     To                         Action      From
     --                         ------      ----
[1]  3001/tcp                   ALLOW IN    Anywhere
[2]  8080/tcp                   ALLOW IN    Anywhere
[3]  40000:49999/udp            ALLOW IN    Anywhere
[4]  40000:49999/tcp            ALLOW IN    Anywhere
```

### Step 3: Configure .env.production

On production server (`~/hype/backend/.env.production`):

```bash
# REQUIRED: Replace with actual public IP from Step 1
SFU_ANNOUNCED_IP="185.123.45.67"

# Port range (must match firewall rules)
RTC_MIN_PORT=40000
RTC_MAX_PORT=49999

# Logging (use 'warn' or 'error' in production)
SFU_LOG_LEVEL=warn

# Node identification
NODE_ID=sfu-1
NODE_REGION=eu-west-1

# Other required vars
PORT=3001
WS_PORT=8080
FRONTEND_URL=https://voice.pestov-web.ru
NODE_ENV=production
```

### Step 4: Deploy Backend

```bash
cd ~/hype/backend

# Install dependencies
pnpm install --frozen-lockfile

# Build
pnpm build

# Start with PM2
pm2 start dist/index.js --name hype-backend --env production --max-memory-restart 1G
pm2 save
pm2 startup  # Enable auto-start
```

### Step 5: Verify SFU Health

```bash
# Check SFU status
curl http://localhost:3001/api/sfu/health

# Expected response:
{
  "nodeId": "sfu-1",
  "region": "eu-west-1",
  "workers": 4,
  "rooms": 0,
  "totalParticipants": 0,
  "status": "healthy"
}
```

---

## 🧪 Testing WebRTC Connection

### Test 1: Check Backend Logs

```bash
# Watch logs in real-time
pm2 logs hype-backend --lines 50

# Look for ICE candidates with PUBLIC IP:
✅ Good:
{
  "ip": "185.123.45.67",
  "port": 42315,
  "protocol": "udp",
  "type": "host"
}

❌ Bad (localhost):
{
  "ip": "127.0.0.1",
  "port": 42315,
  "protocol": "udp",
  "type": "host"
}
```

### Test 2: Browser DevTools

Open https://voice.pestov-web.ru and check Console:

```
✅ Success:
🔌 [SFU] Send transport connection state: new → connecting → connected
🔌 [SFU] Recv transport connection state: new → connecting → connected

❌ Failure:
🔌 [SFU] Send transport connection state: failed
```

### Test 3: Network Tab

1. Open DevTools → Network tab
2. Join voice channel
3. Look for WebSocket messages with ICE candidates:

```json
{
    "type": "sfu_transport_created",
    "data": {
        "iceCandidates": [
            {
                "ip": "185.123.45.67", // Should be public IP
                "port": 42315,
                "protocol": "udp"
            }
        ]
    }
}
```

---

## 🐛 Troubleshooting

### Issue 1: Transport Connection Failed

**Symptom:** `Send transport connection state: failed`

**Diagnosis:**

1. Check firewall:

    ```bash
    sudo ufw status | grep 40000
    ```

2. Check announced IP:

    ```bash
    grep SFU_ANNOUNCED_IP ~/hype/backend/.env.production
    ```

3. Verify backend is using .env.production:
    ```bash
    pm2 env hype-backend | grep SFU_ANNOUNCED_IP
    ```

**Solution:**

-   If firewall closed: `sudo ufw allow 40000:49999/udp`
-   If IP wrong: Edit `.env.production` and `pm2 restart hype-backend`
-   If backend not reading env: `pm2 delete hype-backend && pm2 start dist/index.js --name hype-backend --env production`

### Issue 2: ICE Candidates Show 127.0.0.1

**Symptom:** Browser receives localhost candidates instead of public IP

**Cause:** `SFU_ANNOUNCED_IP` not set or backend not restarted

**Solution:**

```bash
# Edit .env.production
nano ~/hype/backend/.env.production

# Set public IP
SFU_ANNOUNCED_IP="185.123.45.67"

# Restart backend
pm2 restart hype-backend

# Verify
pm2 env hype-backend | grep SFU_ANNOUNCED_IP
```

### Issue 3: Connection Works Locally But Not Remotely

**Symptom:** Works on localhost, fails on production

**Cause:** Cloud provider firewall (e.g., AWS Security Groups, GCP Firewall Rules)

**Solution:**

1. **Check cloud provider console:**

    - AWS: Security Groups → Inbound Rules
    - GCP: VPC Network → Firewall Rules
    - Azure: Network Security Groups

2. **Add inbound rules:**

    - Protocol: UDP
    - Port Range: 40000-49999
    - Source: 0.0.0.0/0 (anywhere)

3. **Restart instance if necessary**

### Issue 4: Only TCP Works, UDP Fails

**Symptom:** Connection established but high latency (100ms+)

**Cause:** UDP blocked by ISP or corporate network

**Solution:**

1. **Enable TCP fallback (already configured):**

    ```typescript
    enableUdp: true,
    enableTcp: true,  // Fallback if UDP blocked
    preferUdp: true,
    ```

2. **Add TCP ports to firewall:**

    ```bash
    sudo ufw allow 40000:49999/tcp
    ```

3. **Test UDP connectivity:**

    ```bash
    # Install nmap
    sudo apt install nmap

    # Test UDP port
    sudo nmap -sU -p 42315 YOUR_SERVER_IP
    ```

---

## 📊 Monitoring

### Check Active Connections

```bash
# Count active RTC connections
sudo netstat -anup | grep -E '40[0-9]{3}' | wc -l

# Show active UDP connections
sudo ss -u -a sport ge 40000 sport le 49999
```

### Monitor Resource Usage

```bash
# Backend memory/CPU
pm2 monit

# System resources
htop

# Network traffic
iftop -i eth0
```

### Backend Logs

```bash
# Real-time logs
pm2 logs hype-backend --lines 100 --raw

# Filter for WebRTC errors
pm2 logs hype-backend --err --lines 200 | grep -i "transport\|ice\|dtls"

# Export logs
pm2 logs hype-backend --lines 1000 --nostream > ~/sfu-debug.log
```

---

## 🔒 Security

### Firewall Best Practices

```bash
# Allow only necessary ports
sudo ufw default deny incoming
sudo ufw default allow outgoing

# SSH
sudo ufw allow 22/tcp

# HTTP/HTTPS (Nginx)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Backend (only if not behind Nginx)
sudo ufw allow 3001/tcp
sudo ufw allow 8080/tcp

# RTC media
sudo ufw allow 40000:49999/udp
sudo ufw allow 40000:49999/tcp

# Enable
sudo ufw enable
```

### Rate Limiting (TODO)

```typescript
// backend/src/index.ts
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

---

## 🚀 Performance Tuning

### Linux Kernel Parameters

```bash
# Edit sysctl.conf
sudo nano /etc/sysctl.conf

# Add these lines for high-performance WebRTC:
net.core.rmem_max=26214400
net.core.rmem_default=26214400
net.core.wmem_max=26214400
net.core.wmem_default=26214400
net.ipv4.udp_mem=102400 873800 16777216
net.ipv4.udp_rmem_min=16384
net.ipv4.udp_wmem_min=16384
fs.file-max=1000000

# Apply changes
sudo sysctl -p
```

### File Descriptor Limits

```bash
# Edit limits.conf
sudo nano /etc/security/limits.conf

# Add:
* soft nofile 65535
* hard nofile 65535

# Logout and login to apply
```

### PM2 Cluster Mode

For multi-core servers (4+ cores):

```bash
pm2 start dist/index.js --name hype-backend -i max --max-memory-restart 1G
```

**Note:** Mediasoup workers are already multi-threaded, so clustering may not improve performance significantly.

---

## ✅ Production Checklist

Before going live:

-   [ ] Public IP configured in `SFU_ANNOUNCED_IP`
-   [ ] Firewall ports 40000-49999/udp opened
-   [ ] Cloud provider security groups allow UDP
-   [ ] Backend deployed and running (PM2)
-   [ ] SFU health endpoint returns 200 OK
-   [ ] WebRTC connection test passes (2+ users in voice)
-   [ ] Nginx configured with SSL (HTTPS + WSS)
-   [ ] JWT secrets are strong random strings
-   [ ] Database credentials are unique
-   [ ] PM2 auto-start enabled (`pm2 startup`)
-   [ ] Monitoring enabled (PM2, htop, iftop)
-   [ ] Backup strategy in place (database, configs)

---

## 📚 Additional Resources

-   [Mediasoup Installation](https://mediasoup.org/documentation/v3/mediasoup/installation/)
-   [WebRTC Firewall Guide](https://webrtc.org/getting-started/firewall)
-   [PM2 Production Guide](https://pm2.keymetrics.io/docs/usage/quick-start/)
-   [UFW Firewall Tutorial](https://www.digitalocean.com/community/tutorials/ufw-essentials-common-firewall-rules-and-commands)

---

**Questions?** Check backend logs with `pm2 logs hype-backend --lines 100`
