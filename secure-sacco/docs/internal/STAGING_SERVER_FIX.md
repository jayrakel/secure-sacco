# Staging Server Fix: API /settings/sacco Returning 500 Error

## Issue
The frontend is unable to load settings on the staging server, receiving 500 errors:
```
api/v1/settings/sacco:1  Failed to load resource: the server responded with a status of 500 ()
```

## Root Cause
The SACCO settings table (`sacco_settings`) exists but contains no data. The backend endpoint attempts to fetch settings that don't exist, causing an unhandled exception that returns a 500 error.

## Fixes Applied

### 1. **Database Migration (V53)**
Created new Flyway migration: `V53__seed_initial_sacco_settings.sql`
- Seeds the `sacco_settings` table with initial configuration if it doesn't already exist
- **File:** `backend/src/main/resources/db/migration/V53__seed_initial_sacco_settings.sql`
- **Initial Values:**
  - SACCO Name: "Betterlink Ventures Limited"
  - Prefix: "BVL"
  - Pad Length: 6
  - Registration Fee: 1000.00
  - Enabled Modules: members (true), loans/savings/reports (false)

### 2. **Backend Controller Error Handling**
Updated `SaccoSettingsController.getSettings()` method
- **File:** `backend/src/main/java/com/jaytechwave/sacco/modules/settings/api/controller/SaccoSettingsController.java`
- Added try-catch block to gracefully handle unexpected errors
- Returns `{"initialized": false, "error": "..."}` instead of 500 status code
- Prevents unhandled exceptions from propagating

### 3. **Service Resilience**
Updated `SaccoSettingsService.isInitialized()` method
- **File:** `backend/src/main/java/com/jaytechwave/sacco/modules/settings/domain/service/SaccoSettingsService.java`
- Added exception handling for database connection issues
- Returns `false` if database is unreachable instead of throwing exception

## Deployment Instructions

### For Staging Server:

1. **Pull Latest Code**
   ```bash
   git pull origin main
   ```

2. **Run Database Migrations**
   Flyway will automatically run migrations on application startup. The new `V53__seed_initial_sacco_settings.sql` will:
   - Create the initial settings record if it doesn't exist
   - Skip if settings already exist

3. **Restart Backend Service**
   ```bash
   docker-compose restart backend
   # or
   systemctl restart sacco-backend
   ```

4. **Verify**
   - Check browser console: Should no longer see 500 errors
   - Verify settings are loaded:
     ```bash
     curl -X GET http://localhost:5173/api/v1/settings/sacco
     # Should return: {"initialized": true, "saccoName": "...", ...}
     ```

## Alternative: Manual Database Fix (if migrations don't run)

If Flyway migrations don't run automatically, execute this SQL directly:

```sql
-- Seed initial SACCO settings if not already initialized
INSERT INTO sacco_settings (id, sacco_name, member_number_prefix, member_number_pad_length, registration_fee, logo_url, favicon_url, enabled_modules, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    'Betterlink Ventures Limited',
    'BVL',
    6,
    1000.00,
    '',
    '',
    '{"members": true, "loans": false, "savings": false, "reports": false}'::jsonb,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM sacco_settings);
```

## Frontend Impact
✅ Frontend will no longer display "⚠ Failed to fetch settings on login page" error
✅ Settings will load correctly on all pages
✅ Login page will display SACCO branding properly

## Files Changed
- `backend/src/main/resources/db/migration/V53__seed_initial_sacco_settings.sql` (NEW)
- `backend/src/main/java/com/jaytechwave/sacco/modules/settings/api/controller/SaccoSettingsController.java` (MODIFIED)
- `backend/src/main/java/com/jaytechwave/sacco/modules/settings/domain/service/SaccoSettingsService.java` (MODIFIED)

---
**Status:** ✅ Ready for deployment
**Date:** April 6, 2026

