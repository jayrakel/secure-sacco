# Migration Strategy: Proper Flyway Approach

## Issue Fixed
The previous attempt modified V51, which violates Flyway best practices. Migrations are immutable once deployed.

## Correct Solution

### ✅ V51 (Reverted to Original)
```sql
-- Add branding URL columns to the sacco_settings table
ALTER TABLE sacco_settings
    ADD COLUMN logo_url VARCHAR(1024),
    ADD COLUMN favicon_url VARCHAR(1024);
```

**Purpose:** Create the columns (original intent)

### ✅ NEW: V54 (New Migration)
**File:** `V54__fix_branding_urls_null_values.sql`

```sql
-- Fix NULL values and add DEFAULT constraint for branding URLs
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

**Purpose:** Fix NULLs and enforce constraints (new migration)

## Flyway Migration Best Practices

### ❌ DON'T
- Modify existing migrations after deployment
- Change the version number of deployed migrations
- Delete deployed migrations

### ✅ DO
- Create new migrations for fixes (V54, V55, etc.)
- Keep old migrations exactly as they were deployed
- Use new migrations to fix issues from previous versions

## Why This Matters
1. **Immutability**: Once deployed, migrations must be unchangeable
2. **Audit Trail**: Shows exactly what was done and when
3. **Replayability**: New environments can replay the exact sequence
4. **Team Consistency**: Everyone gets the same final state
5. **Rollback Safety**: Can safely rollback knowing what happened

## Deployment for Staging

```bash
# Pull latest code
git pull origin main

# This now has:
# - V51 (original - unchanged)
# - V52 (alter type - unchanged)  
# - V53 (seed initial settings)
# - V54 (FIX NULL values - NEW!)

# Rebuild and deploy
cd backend/backend
mvn clean package -DskipTests
docker-compose restart backend

# Flyway will automatically run V54 on startup
sleep 15

# Verify
curl http://localhost:8080/api/v1/settings/sacco
```

## What V54 Does
1. ✅ Finds any existing NULLs for logo_url and favicon_url
2. ✅ Sets them to empty strings
3. ✅ Adds NOT NULL constraint (prevents future NULLs)
4. ✅ Sets DEFAULT '' (for new inserts)

## Result After V54 Runs
```sql
-- All existing records have empty strings instead of NULLs
SELECT logo_url, favicon_url FROM sacco_settings;
-- Result: '' | ''

-- New inserts will default to empty strings
INSERT INTO sacco_settings (...) VALUES (...);
-- logo_url automatically becomes '', favicon_url automatically becomes ''
```

---

**Key Learning:** Always create new migrations for fixes, never modify deployed ones!

