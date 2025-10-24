# Deployment Checklist - Disconnect Cleanup

## Pre-Deployment Verification

-   [x] Backend builds successfully (`pnpm build`)
-   [x] No TypeScript errors in modified files
-   [x] `handleDisconnect` is async and awaits SFU cleanup
-   [x] `setSFUService` wired up in `index.ts`
-   [x] WebSocket close handler catches async errors

## Files Changed

1. `backend/src/websocket/websocket.ts`

    - Added `setSFUService(sfuService)` method
    - Made `handleDisconnect` async
    - Added SFU cleanup call before participant removal
    - Updated close event handler for async

2. `backend/src/index.ts`

    - Added `wsManager.setSFUService(sfuService)` call
    - Added confirmation log

3. `docs/DISCONNECT_CLEANUP.md` (new)
    - Implementation documentation

## Deployment Commands

```bash
# SSH into server
ssh root@185.128.105.95

# Navigate to project
cd ~/hype/backend

# Pull latest changes
git pull origin develop

# Install dependencies (if needed)
pnpm install

# Build backend
pnpm build

# Restart PM2 process
pm2 restart hype-backend

# Watch logs
pm2 logs hype-backend --lines 100
```

## Post-Deployment Testing

### 1. Check Backend Logs

```bash
pm2 logs hype-backend --lines 50
```

**Expected logs on startup:**

```
✅ SFU service connected to WebSocketManager
🚀 HTTP Server running on http://localhost:3001
🔌 WebSocket Server running on ws://localhost:8080
```

### 2. Test User Disconnect

**Steps:**

1. Open `https://voice.pestov-web.ru` in two different browsers/tabs
2. Login/register two different users
3. Both users join the same voice channel
4. **Close one browser tab completely**
5. Check backend logs
6. Check other tab's participant list

**Expected Backend Logs:**

```
🔌 Client disconnected: <client-id> (user: <username>)
🧹 SFU cleanup completed for user <username> in channel <channel-id>
👋 User <username> (<user-id>) removed from voice channel <channel-id> on disconnect
   Remaining participants: [ '<other-user>' ]
```

**Expected Frontend Behavior:**

-   Remaining user sees disconnected user removed from participant list
-   No errors in browser console
-   Voice call continues working for remaining user

### 3. Verify No Resource Leaks

After multiple connect/disconnect cycles:

```bash
# Check mediasoup worker memory
pm2 monit

# Check for transport/producer/consumer cleanup logs
pm2 logs hype-backend | grep -i cleanup
```

## Rollback Plan

If issues occur:

```bash
# Option 1: Restart backend
pm2 restart hype-backend

# Option 2: Rollback to previous version
cd ~/hype/backend
git log --oneline -n 5
git checkout <previous-commit-hash>
pnpm build
pm2 restart hype-backend

# Option 3: Full rollback
pm2 stop hype-backend
git reset --hard HEAD~1
pnpm build
pm2 start hype-backend
```

## Known Issues & Monitoring

### Monitor for:

1. **Memory Leaks**: Check `pm2 monit` for increasing memory usage
2. **Failed Cleanups**: Search logs for `❌ SFU cleanup failed`
3. **Orphaned Participants**: Users staying in participant list after disconnect

### Debugging Commands

```bash
# Real-time logs
pm2 logs hype-backend --lines 100 --raw

# Error logs only
pm2 logs hype-backend --err

# Check process status
pm2 status hype-backend

# Detailed process info
pm2 describe hype-backend
```

## Success Criteria

-   ✅ Users removed from participant list on disconnect
-   ✅ SFU resources cleaned up (no memory leaks)
-   ✅ Remaining users notified via `user_left` event
-   ✅ No errors in backend logs during disconnect
-   ✅ Voice calls continue working after users leave

## Environment Variables (Already Set)

Via `ecosystem.config.cjs`:

```javascript
env_production: {
  NODE_ENV: 'production',
  SFU_ANNOUNCED_IP: '185.128.105.95',
  DATABASE_URL: '<postgres-url>',
  JWT_SECRET: '<secret>',
  // ... other vars
}
```

## Timeline

-   Code Changes: ✅ Complete
-   Build Verification: ✅ Complete
-   Documentation: ✅ Complete
-   **Deployment: ⏳ Pending**
-   **Testing: ⏳ Pending**
-   **Monitoring: ⏳ Pending (24 hours)**
