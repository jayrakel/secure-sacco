# Quick Reference: Staging Server 500 Error Resolution

## What's Wrong?
❌ `GET /api/v1/settings/sacco` returns 500 error on staging
❌ Frontend can't load SACCO settings
❌ Console shows: "Failed to fetch settings on login page: 500 Request failed with status code 500"

## What's Fixed?
✅ Added database migration to seed initial settings
✅ Added error handling in backend controller
✅ Added resilience to service layer

## How to Deploy

### Option 1: Full Deployment (Recommended)
```bash
# 1. Pull code
git pull origin main

# 2. Rebuild backend JAR
cd backend/backend
mvn clean package -DskipTests

# 3. Restart container
docker-compose restart backend

# 4. Wait 30 seconds for migrations to run
sleep 30

# 5. Test
curl -s http://localhost:8080/api/v1/settings/sacco | jq .
```

### Option 2: Minimal Restart (if JAR unchanged)
```bash
# Just restart backend - Flyway will run new migrations
docker-compose restart backend
sleep 30

# Verify
curl -s http://localhost:8080/api/v1/settings/sacco | jq .
```

### Option 3: Database-Only Fix (Emergency)
```bash
# Connect to PostgreSQL
psql -U postgres -d sacco_db

# Run this SQL:
INSERT INTO sacco_settings (id, sacco_name, member_number_prefix, member_number_pad_length, registration_fee, logo_url, favicon_url, enabled_modules, created_at, updated_at)
SELECT gen_random_uuid(), 'Betterlink Ventures Limited', 'BVL', 6, 1000.00, '', '', '{"members": true, "loans": false, "savings": false, "reports": false}'::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM sacco_settings);

# Exit and restart backend
\q
docker-compose restart backend
```

## Expected Response After Fix
```json
{
  "initialized": true,
  "saccoName": "Betterlink Ventures Limited",
  "prefix": "BVL",
  "padLength": 6,
  "registrationFee": 1000.00,
  "logoUrl": "",
  "faviconUrl": "",
  "enabledModules": {
    "members": true,
    "loans": false,
    "savings": false,
    "reports": false
  }
}
```

## Verification Checklist
- [ ] Backend container is running: `docker-compose ps`
- [ ] Logs show successful migration: `docker-compose logs backend | grep V53`
- [ ] Settings endpoint returns 200: `curl -i http://localhost:8080/api/v1/settings/sacco`
- [ ] Frontend no longer shows 500 error in console
- [ ] Login page displays without errors

## Need Help?
Check backend logs: `docker-compose logs backend -f`
Check database: `docker-compose exec db psql -U postgres -d sacco_db -c "SELECT * FROM sacco_settings;"`

