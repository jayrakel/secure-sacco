# Staging Deployment: Corrected Migration Strategy

## Issue & Fix
❌ **Problem:** logo_url and favicon_url had NULL values  
✅ **Solution:** Use proper Flyway migrations (V51 unchanged, new V54 to fix)

## Migration Files

### V51 (ORIGINAL - UNCHANGED)
```sql
ALTER TABLE sacco_settings
    ADD COLUMN logo_url VARCHAR(1024),
    ADD COLUMN favicon_url VARCHAR(1024);
```

### V52 (UNCHANGED)
```sql
ALTER TABLE sacco_settings
    ALTER COLUMN logo_url TYPE TEXT,
    ALTER COLUMN favicon_url TYPE TEXT;
```

### V53 (AUTO-SEED)
Seed initial settings if empty

### V54 (NEW - FIXES NULL VALUES)
```sql
UPDATE sacco_settings SET
    logo_url = COALESCE(logo_url, ''),
    favicon_url = COALESCE(favicon_url, '')
WHERE logo_url IS NULL OR favicon_url IS NULL;

ALTER TABLE sacco_settings
    ALTER COLUMN logo_url SET NOT NULL,
    ALTER COLUMN favicon_url SET NOT NULL;

ALTER TABLE sacco_settings
    ALTER COLUMN logo_url SET DEFAULT '',
    ALTER COLUMN favicon_url SET DEFAULT '';
```

## Deployment Steps

### Step 1: Pull Latest Code
```bash
git pull origin main
# Now includes:
# - V51 (original)
# - V52 (original)
# - V53 (auto-seed)
# - V54 (FIX) ← NEW!
```

### Step 2: Rebuild Backend
```bash
cd backend/backend
mvn clean package -DskipTests
```

### Step 3: Restart Backend
```bash
docker-compose restart backend
```

### Step 4: Wait for Migrations
```bash
sleep 20
# Flyway automatically runs V54
```

### Step 5: Verify
```bash
# Check the endpoint
curl http://localhost:8080/api/v1/settings/sacco

# Expected response (200 OK):
{
  "initialized": true,
  "saccoName": "Betterlink Ventures Limited",
  "logoUrl": "",                    # ← Empty string, not null
  "faviconUrl": "",                 # ← Empty string, not null
  ...
}
```

## If Migrations Already Ran

If V51-V53 already ran on staging, V54 will still work correctly because:
1. Flyway tracks executed migrations
2. It only runs V54 (the new one)
3. V54 safely handles existing NULLs

## Verification Checklist
- [ ] Code pulled with new migrations
- [ ] Backend rebuilt successfully
- [ ] Backend restarted
- [ ] No errors in logs
- [ ] Settings endpoint returns 200
- [ ] logoUrl and faviconUrl are empty strings (not null)
- [ ] Frontend login page loads without errors

## Rollback (if needed)
Cannot rollback Flyway migrations. Instead:
```sql
-- Manual fix if V54 failed:
UPDATE sacco_settings SET
    logo_url = '',
    favicon_url = ''
WHERE id IS NOT NULL;
```

---
**Status:** ✅ READY FOR DEPLOYMENT  
**Estimated Time:** 5 minutes  
**Downtime:** None  
**Data Impact:** None (only fixes NULLs)

