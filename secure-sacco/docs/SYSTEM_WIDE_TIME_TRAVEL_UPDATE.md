# Time-Traveler System Update - System-Wide Configuration

## 🎯 What Changed

The **TimeTravelerService** is now **system-wide and flexible**, not hardcoded to Benjamin's loans. You can configure it to test any member's loans or all loans in the system.

---

## 🔄 Key Improvements

### ✅ Before (Benjamin-Specific)
```java
// Hardcoded dates and member
BENJAMIN_LOAN_START = Oct 6, 2022
BENJAMIN_LOAN_END = Aug 28, 2025
targetMember = "BVL-2022-000001" (hardcoded)
virtualWeeksOffset (weeks only)
```

### ✅ After (System-Wide & Flexible)
```java
// Configurable start/end dates
simulationStartDate = LocalDate.now() (configurable via API)
simulationEndDate = LocalDate.now().plusYears(3) (configurable)
targetMemberId = null (any member, or null for all)
virtualDaysOffset (days - more granular)
daysPerTick = 7 (configurable advancement rate)
```

---

## 📊 New Capabilities

### Scenario 1: Test Benjamin's 3-Loan Cycle (Original)
```bash
# Configure for Benjamin's dates
curl -X POST http://localhost:8080/api/v1/time-travel/configure \
  -H "Authorization: Bearer <ADMIN_JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "startDate": "2022-10-06",
    "endDate": "2025-08-28",
    "daysPerTick": 7
  }'

# Set focus to Benjamin only
curl -X POST http://localhost:8080/api/v1/time-travel/set-target?memberId=<BENJAMIN_UUID>

# Auto-progression starts (every 6 hours, +7 days virtual)
```

### Scenario 2: Test All Loans System-Wide (New)
```bash
# Use today's date as start
curl -X POST http://localhost:8080/api/v1/time-travel/configure \
  -H "Authorization: Bearer <ADMIN_JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "startDate": "2026-04-02",
    "endDate": "2029-04-02",
    "daysPerTick": 1
  }'

# No member focus = ALL members' loans advance
curl -X POST http://localhost:8080/api/v1/time-travel/set-target

# Now ALL loans in system age by 1 day per 6 hours
```

### Scenario 3: Test Jacob's Loans (Another Member)
```bash
# Configure date range
curl -X POST http://localhost:8080/api/v1/time-travel/configure \
  -d '{
    "startDate": "2022-09-01",
    "endDate": "2025-09-01",
    "daysPerTick": 7
  }'

# Focus on Jacob
curl -X POST http://localhost:8080/api/v1/time-travel/set-target?memberId=<JACOB_UUID>

# Jacob's loans advance in time
```

---

## 🎛️ NEW REST API Endpoints

| Method | Endpoint | Purpose | New |
|--------|----------|---------|-----|
| `GET` | `/api/v1/time-travel/status` | Full state | - |
| `POST` | `/api/v1/time-travel/advance?days=7` | Jump N days | ✅ |
| `POST` | `/api/v1/time-travel/reset` | Back to start | - |
| `GET` | `/api/v1/time-travel/progress` | % complete | - |
| `POST` | `/api/v1/time-travel/configure` | Set date range | ✅ NEW |
| `POST` | `/api/v1/time-travel/set-target?memberId=...` | Focus member | ✅ NEW |

---

## 🚀 Configuration Examples

### Example 1: Benjamin (Oct 2022 → Aug 2025, +7 days per tick)
```bash
curl -X POST http://localhost:8080/api/v1/time-travel/configure \
  -H "Content-Type: application/json" \
  -d '{
    "startDate": "2022-10-06",
    "endDate": "2025-08-28",
    "daysPerTick": 7
  }' && \
curl -X POST http://localhost:8080/api/v1/time-travel/set-target?memberId=<BENJAMIN_UUID>
```

### Example 2: All Loans (Apr 2026 → Apr 2029, +1 day per tick)
```bash
curl -X POST http://localhost:8080/api/v1/time-travel/configure \
  -H "Content-Type: application/json" \
  -d '{
    "startDate": "2026-04-02",
    "endDate": "2029-04-02",
    "daysPerTick": 1
  }'
```

### Example 3: All Loans, Accelerated (Apr 2026 → May 2026, +14 days per tick)
```bash
curl -X POST http://localhost:8080/api/v1/time-travel/configure \
  -H "Content-Type: application/json" \
  -d '{
    "startDate": "2026-04-02",
    "endDate": "2026-05-02",
    "daysPerTick": 14
  }'
```

---

## 📋 API Responses

### GET /time-travel/status
```json
{
  "daysOffset": 49,
  "virtualDate": "2022-11-24",
  "progressPercent": 4.2,
  "isComplete": false,
  "targetMember": "BVL-2022-000001",
  "simulationStart": "2022-10-06",
  "simulationEnd": "2025-08-28",
  "daysPerTick": 7
}
```

### POST /time-travel/configure
```json
{
  "message": "Simulation configured: 2022-10-06 → 2025-08-28",
  "daysPerTick": 7
}
```

### POST /time-travel/set-target
```json
{
  "message": "Target member set to: <BENJAMIN_UUID>"
}
```

---

## 🔄 How the System Works Now

```
┌─────────────────────────────────────────────────┐
│ ADMIN configures via REST API                  │
│ 1. POST /configure (start, end, rate)          │
│ 2. POST /set-target (member or null for all)   │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│ TimeTravelerService                            │
│ - Stores simulationStartDate                   │
│ - Stores simulationEndDate                     │
│ - Stores targetMemberId (optional)             │
│ - Stores daysPerTick                           │
│ - Maintains virtualDaysOffset                  │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│ Every 6 Hours (@Scheduled cron)                │
│ 1. virtualDaysOffset += daysPerTick            │
│ 2. Find loans (targetMemberId or all)          │
│ 3. Call LoanScheduleService.advancePendingAtDate(virtualDate)
│ 4. Call LoanScheduleService.processPastDueAtDate(virtualDate) 
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│ RESULT: Penalties, overdue tracking,           │
│ refinancing checks all use virtual dates       │
└─────────────────────────────────────────────────┘
```

---

## 💡 Use Cases Enabled

### Original: Benjamin's 3-Loan Test
```
Benjamin's loans (Oct 2022 → Aug 2025)
→ Configure with those dates
→ Set target to Benjamin
→ Automatic progression every 6 hours
→ Verify penalties at each stage
```

### New: System-Wide Penalty Testing
```
ANY member's loans
→ Configure date range
→ Leave target as null (all members)
→ Test penalty system across ALL loans
→ Verify consistency of penalty logic
```

### New: Rapid Iteration
```
Focus on member X
→ Set daysPerTick = 14 (2 weeks per tick)
→ Advance 30 days of virtual time per day real
→ Rapidly test refinance/restructure workflows
```

---

## ⚠️ Important Notes

1. **In-Memory Only** — Virtual time offset is in-memory. Resets on app restart.
2. **Target Member Optional** — If not set, ALL loans are advanced. Clear focus = broader testing.
3. **Configurable Rate** — Change daysPerTick to speed up/slow down progression.
4. **Manual + Auto** — Use manual `/advance` API for quick jumps, or let cron run automatically.

---

## 🔧 Configuration Checklist

Before testing:

```bash
# 1. Configure date range
curl -X POST .../time-travel/configure \
  -d '{"startDate":"...", "endDate":"...", "daysPerTick":7}'

# 2. (Optional) Set target member
curl -X POST .../time-travel/set-target?memberId=<UUID>

# 3. Check status
curl -X GET .../time-travel/status

# 4. Let cron run OR manually advance
curl -X POST .../time-travel/advance?days=7

# 5. Verify penalties/schedule changes
curl -X GET .../loans/schedule?memberNumber=...
curl -X GET .../penalties?memberNumber=...
```

---

## ✅ Status: UPDATED FOR SYSTEM-WIDE TESTING

Now you can test:
- ✅ Benjamin's loans specifically
- ✅ Jacob's loans specifically
- ✅ ANY member's loans
- ✅ ALL loans system-wide
- ✅ Different date ranges
- ✅ Different progression rates

**System-wide time traveling is ready!** 🚀

