# ⚠️ IMPORTANT: ecosystem.config.js → ecosystem.config.cjs

## Problem

PM2 shows error:

```
[PM2][ERROR] File ecosystem.config.js malformated
ReferenceError: module is not defined in ES module scope
```

## Reason

Backend uses **ESM modules** (`"type": "module"` in `package.json`), but PM2 ecosystem config uses CommonJS syntax (`module.exports`).

## Solution

**Rename the file to `.cjs` extension:**

```bash
# On production server
cd ~/hype/backend

# If ecosystem.config.js exists, remove it
rm -f ecosystem.config.js

# Use ecosystem.config.cjs instead (already in git)
git pull origin develop

# Start with .cjs file
pm2 start ecosystem.config.cjs --env production
pm2 save
```

## Updated Commands

**Old (won't work):**

```bash
pm2 start ecosystem.config.js --env production  # ❌ Error!
```

**New (correct):**

```bash
pm2 start ecosystem.config.cjs --env production  # ✅ Works!
```

---

## Complete Deployment Steps

```bash
# 1. SSH to server
ssh mwk@185.128.105.95

# 2. Update code
cd ~/hype
git pull origin develop

# 3. Build backend
cd backend
pnpm install --frozen-lockfile
pnpm build

# 4. Stop old process
pm2 delete hype-backend

# 5. Start with .cjs file
pm2 start ecosystem.config.cjs --env production

# 6. Save PM2 config
pm2 save

# 7. Check logs
pm2 logs hype-backend --lines 50

# Look for: "ip": "185.128.105.95" in ICE candidates ✅
```

---

## Files in Repository

-   ✅ `backend/ecosystem.config.cjs` - **Use this** (CommonJS, works with ESM)
-   ❌ `backend/ecosystem.config.js` - Old file (will cause errors)

**Note:** Git will have both files after pull. Just use `.cjs` version.
