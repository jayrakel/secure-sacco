# Time-Traveler Quick Reference Card

## 🚀 Quick Start (Copy-Paste)

### 1. Check Status
```bash
curl -X GET http://localhost:8080/api/v1/time-travel/status \
  -H "Authorization: Bearer YOUR_ADMIN_JWT"
```

### 2. Advance 1 Week
```bash
curl -X POST http://localhost:8080/api/v1/time-travel/advance?weeks=1 \
  -H "Authorization: Bearer YOUR_ADMIN_JWT"
```

### 3. Advance to Loan 2 Refinance (from start)
```bash
# Advance 61 weeks to May 30, 2024
curl -X POST http://localhost:8080/api/v1/time-travel/advance?weeks=61 \
  -H "Authorization: Bearer YOUR_ADMIN_JWT"
```

### 4. Advance to Loan 3 Restructure (from start)
```bash
# Advance 73 weeks to Oct 10, 2024
curl -X POST http://localhost:8080/api/v1/time-travel/advance?weeks=73 \
  -H "Authorization: Bearer YOUR_ADMIN_JWT"
```

### 5. Jump to End (from start)
```bash
# Advance 170 weeks to Aug 28, 2025
curl -X POST http://localhost:8080/api/v1/time-travel/advance?weeks=170 \
  -H "Authorization: Bearer YOUR_ADMIN_JWT"
```

### 6. Reset to Start
```bash
curl -X POST http://localhost:8080/api/v1/time-travel/reset \
  -H "Authorization: Bearer YOUR_ADMIN_JWT"
```

---

## 📅 Benjamin's Virtual Dates

| Milestone | Virtual Date | Weeks from Start | Test Focus |
|-----------|--------------|------------------|-----------|
| **Loan 1 Start** | Oct 6, 2022 | 0 | Disbursement, schedule generation |
| **Loan 1 Mid** | Feb 16, 2023 | 17 | Payment processing, balance calc |
| **Loan 1 Late** | Jul 20, 2023 | 39 | Prepayment credits, early payoff |
| **Loan 1 End** | Oct 5, 2023 | 52 | Loan closure verification |
| **Loan 2 Start (Refinance)** | May 30, 2024 | 61 | Top-up disbursement, old loan closure |
| **Loan 2 Mid** | Aug 8, 2024 | 73 | Refinanced balance tracking |
| **Loan 3 Start (Restructure)** | Oct 10, 2024 | 73 | Restructure eligibility, schedule reset |
| **Loan 3 Mid** | Jan 16, 2025 | 103 | Continued repayment, penalty tracking |
| **Loan 3 End (FULLY PAID)** | Aug 28, 2025 | 170 | Final closure, certificate issuance |

---

## 🔗 API Response Examples

### GET /time-travel/status
```json
{
  "weeksOffset": 52,
  "virtualDate": "2023-10-05",
  "progressPercent": 30.5,
  "isComplete": false,
  "memberNumber": "BVL-2022-000001",
  "simulationStart": "2022-10-06",
  "simulationEnd": "2025-08-28"
}
```

### POST /time-travel/advance?weeks=4
```json
{
  "message": "Advised 4 weeks. Virtual date: 2022-11-03",
  "virtualDate": "2022-11-03",
  "progressPercent": "2.3%"
}
```

### GET /time-travel/progress
```json
{
  "progress": 30.5,
  "complete": false
}
```

---

## 🔄 Automatic Cron Schedule

```
Every 6 hours (00:00, 06:00, 12:00, 18:00)
  ↓
Advance virtual time by 1 week
  ↓
Trigger schedule progression
  ↓
Mark installments DUE
  ↓
Apply penalties for overdue
```

**Effective Progression:**
- 1 week per 6 hours of real time
- = 4 weeks per 1 day real time
- = ~120 weeks per 1 month real time
- = **Full simulation (170 weeks) in ~1.4 months**

---

## 🧪 Common Test Scenarios

### Test: Week 1 Installment Due
```bash
# Reset + advance 1 week
curl -X POST http://localhost:8080/api/v1/time-travel/reset
curl -X POST http://localhost:8080/api/v1/time-travel/advance?weeks=1

# Verify Week 1 is marked DUE
curl http://localhost:8080/api/v1/loans/schedule?memberNumber=BVL-2022-000001
# Expected: week_number=1, status=DUE
```

### Test: Apply Penalty on Overdue
```bash
# Advance 8 weeks (past week 1 due date)
curl -X POST http://localhost:8080/api/v1/time-travel/advance?weeks=8

# Verify Week 1 marked OVERDUE
curl http://localhost:8080/api/v1/loans/schedule?memberNumber=BVL-2022-000001

# Verify penalty applied
curl http://localhost:8080/api/v1/penalties?memberNumber=BVL-2022-000001
# Expected: penalty_type=MISSED_INSTALLMENT, amount≈150 KES
```

### Test: Refinance Eligibility
```bash
# Jump to week 61 (May 30, 2024 - Loan 2 refinance date)
curl -X POST http://localhost:8080/api/v1/time-travel/reset
curl -X POST http://localhost:8080/api/v1/time-travel/advance?weeks=61

# Check refinance eligibility
curl http://localhost:8080/api/v1/loans/BVL-2022-000001/refinance-eligibility
# Expected: { "eligible": true, "reason": "... weeks remaining" }
```

### Test: Restructure Eligibility
```bash
# Jump to week 73 (Oct 10, 2024 - Loan 3 restructure date)
curl -X POST http://localhost:8080/api/v1/time-travel/reset
curl -X POST http://localhost:8080/api/v1/time-travel/advance?weeks=73

# Check restructure eligibility
curl http://localhost:8080/api/v1/loans/BVL-2022-000001/restructure-eligibility
# Expected: { "eligible": true, "currentBalance": 577054, "rate": 12.5 }
```

---

## 🔍 Debugging

### View Logs with Time-Travel Activity
```bash
# Terminal 1: Start backend
cd backend/backend && mvn spring-boot:run

# Terminal 2: Watch logs (grep for ⏱️ emoji)
tail -f target/logs/spring.log | grep "⏱️"
```

### Check Virtual Date Matches Schedule
```bash
# Get current virtual date
curl http://localhost:8080/api/v1/time-travel/status

# Get loan schedule
curl http://localhost:8080/api/v1/loans/schedule?memberNumber=BVL-2022-000001

# Manually verify: which weeks should be DUE by virtual date?
# (Schedule dueDate = disbursedAt + gracePeriod + (weekNumber * 7 days))
```

### Verify Cron Executed
```bash
# Check logs every 6 hours for:
# "TIME TRAVEL TICK: Advancing Benjamin's virtual timeline by 1 week..."
# "✅ Virtual timeline now: 2022-10-13 (0.6% complete)"

# If missing, verify:
grep -i "time.*travel" /path/to/backend/logs/*.log
```

---

## ⚙️ Configuration

### Disable Auto Cron (Manual Only)
Edit `TimeTravelerService.java` line ~88:
```java
// @Scheduled(cron = "0 0 0,6,12,18 * * *")  // ← Comment out this line
@Transactional
public void executeWeeklyProgressionCheck() { ... }
```

### Change Cron Interval
Edit `TimeTravelerService.java` line 88:
```java
// Every 1 hour instead of 6 hours:
@Scheduled(cron = "0 0 * * * *")

// Every 15 minutes:
@Scheduled(cron = "0 */15 * * * *")

// Every day at midnight:
@Scheduled(cron = "0 0 0 * * *")
```

### Change Weekly Advancement Amount
Edit `TimeTravelerService.java` line ~121 (inside `executeWeeklyProgressionCheck`):
```java
// Default: 1 week per tick
advanceVirtualTimeByWeeks(1);

// Alternative: 2 weeks per tick (progress 2x faster)
advanceVirtualTimeByWeeks(2);

// Alternative: 7 weeks per tick (1 month virtual per 6-hour tick)
advanceVirtualTimeByWeeks(7);
```

---

## 📊 Progress Tracking

### Where Are We in the Timeline?
```
October 2022  ├── Loan 1 (26 weeks complete)
              │
February 2023 ├── Loan 1 (52 weeks, halfway through 104-week term)
              │
May 2024      ├── Loan 2 starts (top-up refinance)
              │
August 2024   ├── Loan 2 (73% complete)
              │
October 2024  ├── Loan 3 starts (restructure, 52 weeks)
              │
March 2025    ├── Loan 3 (50% complete)
              │
August 2025   └── Loan 3 PAID OFF (simulation complete ✅)
```

### Formula: Current Progress
```
Progress % = (currentWeeks / 170 weeks) * 100

Week 0   = 0%
Week 52  = 30.6% (Loan 1 complete)
Week 85  = 50%   (Loan 2 midway)
Week 130 = 76.5% (Loan 3 midway)
Week 170 = 100%  (All done!)
```

---

## 🚨 Gotchas & Common Mistakes

| Mistake | Problem | Fix |
|---------|---------|-----|
| Use `LocalDate.now()` instead of virtual date | Schedule progression ignores time-travel | Always call via `TimeTravelerService.getVirtualDate()` |
| Create new loan app with system time | Loan creation timestamp is wrong | Use migration API with `historicalDateOverride` |
| Check DB directly (not via API) | Virtual date logic in service not queried | Query via loan endpoints (`/loans/schedule`) |
| Forget `@Transactional` on new methods | DB changes don't commit | Add `@Transactional` to all service methods |
| Assume cron runs immediately | "Why didn't it advance yet?" | Cron runs every 6 hours, manual API is instant |

---

## 📖 Documentation

- **Full Guide:** `backend/TIME_TRAVELER_README.md`
- **Implementation Details:** `backend/IMPLEMENTATION_SUMMARY.md`
- **HTTP Examples:** `backend/benjamin-time-travel-api.http`
- **This Card:** `backend/TIME_TRAVELER_QUICK_REFERENCE.md`

---

## 🎯 TL;DR

1. **Automatic:** Cron advances 1 week every 6 hours ✅
2. **Manual:** Call `POST /api/v1/time-travel/advance?weeks=N` 🎛️
3. **Status:** Check `GET /api/v1/time-travel/status` 📊
4. **Reset:** Call `POST /api/v1/time-travel/reset` 🔄
5. **Benjamin's loans progress in hours, not months** ⏱️

---

**Status:** Ready to use • No compilation errors • All tests passing ✅

