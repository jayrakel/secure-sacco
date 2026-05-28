# Root Cause Fixed: NULL Logo/Favicon Values

## The Issue
The staging server was returning 500 errors because:
- `logo_url` and `favicon_url` columns had **NULL values**
- The entity tried to serialize these NULL values
- This caused a serialization/mapping error

## The Fix (3 Changes)

### 1. Entity Default Values
**File:** `SaccoSettings.java`

Added `@Builder.Default` and default empty string values:
```java
@Column(name = "logo_url", columnDefinition = "TEXT DEFAULT ''")
@Builder.Default
private String logoUrl = "";

@Column(name = "favicon_url", columnDefinition = "TEXT DEFAULT ''")
@Builder.Default
private String faviconUrl = "";
```

**Why:** Ensures these fields are never NULL - always default to empty string

### 2. Controller NULL Handling
**File:** `SaccoSettingsController.java`

Added null-safe checks before returning:
```java
"logoUrl", settings.getLogoUrl() != null ? settings.getLogoUrl() : "",
"faviconUrl", settings.getFaviconUrl() != null ? settings.getFaviconUrl() : "",
```

**Why:** Double-protection in case any legacy NULLs exist in database

### 3. Database Migration Update
**File:** `V51__add_branding_urls_to_settings.sql`

Updated to include DEFAULT clause and cleanup:
```sql
ALTER TABLE sacco_settings
    ADD COLUMN logo_url VARCHAR(1024) DEFAULT '',
    ADD COLUMN favicon_url VARCHAR(1024) DEFAULT '';

UPDATE sacco_settings SET
    logo_url = COALESCE(logo_url, ''),
    favicon_url = COALESCE(favicon_url, '');
```

**Why:** Ensures new databases get default values, old data gets cleaned up

## For Staging Server

### Immediate Database Fix (if not already done)
```sql
-- Set any existing NULL values to empty strings
UPDATE sacco_settings SET
    logo_url = COALESCE(logo_url, ''),
    favicon_url = COALESCE(favicon_url, '');
```

### Then Deploy
```bash
git pull origin main
cd backend/backend && mvn clean package -DskipTests
docker-compose restart backend
```

## Verification
```bash
# Test the endpoint
curl http://localhost:8080/api/v1/settings/sacco

# Should return:
{
  "initialized": true,
  "saccoName": "Betterlink Ventures Limited",
  "logoUrl": "",           # ← Now guaranteed to be string, never null
  "faviconUrl": "",        # ← Now guaranteed to be string, never null
  ...
}
```

## What This Prevents
✅ No more NULL values for branding URLs  
✅ No more serialization errors  
✅ Frontend gets valid empty strings instead of nulls  
✅ Consistent behavior across all environments  

---
**Status:** ✅ FIXED  
**Date:** April 6, 2026

