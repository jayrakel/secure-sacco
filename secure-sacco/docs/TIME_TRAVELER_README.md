# Time-Traveling Cron Job for Benjamin's Loan Test

## Overview

The **TimeTravelerService** simulates time progression for loan testing without modifying the system clock. This allows Benjamin's 3-loan cycle (Oct 2022 → Aug 2025) to be tested in days/weeks of real time instead of years.

## Architecture

### Components

1. **TimeTravelerService** (`core/service/TimeTravelerService.java`)
   - Maintains virtual timeline offset (weeks advanced since simulation start)
   - Provides methods to query virtual date/datetime
   - Includes two automatic cron jobs for progression
   - Calculates simulation progress percentage

2. **Enhanced LoanScheduleService** (`loans/domain/service/LoanScheduleService.java`)
   - New methods: `advancePendingInstallmentsAtDate(virtualDate)` and `processPastDueInstallmentsAtDate(virtualDate)`
   - Allows schedule progression based on virtual dates instead of `LocalDate.now()`

3. **TimeTravelController** (`core/controller/TimeTravelController.java`)
   - REST endpoints for manual control and monitoring
   - Admin-only access (requires `ROLE_ADMIN`)
   - Endpoints: `/api/v1/time-travel/{status,advance,reset,progress}`

### Flow Diagram

```
Benjamin's Loan Timeline (Real)
└── Oct 6, 2022 ────────────────────→ Aug 28, 2025 (170 weeks)

Virtual Timeline (System Under Test)
└── Offset: 0 weeks ────────────────→ Offset: 170 weeks
    (2022-10-06)                      (2025-08-28)

Automatic Cron Ticks
└── Every 6 hours: Offset += 1 week
    (1 week virtual = 6 hours real)
    ≈ 1 month virtual per real day
```

---

## Usage Patterns

### Pattern 1: Automatic Progression (Default)

**What happens:**
- `executeWeeklyProgressionCheck()` runs every 6 hours
- Advances virtual timeline by 1 week per tick
- Triggers loan schedule progression automatically
- Simulation halts when reaching Aug 28, 2025

**Timeline:**
| Real Time | Virtual Time | Benjamin's Loan Status |
|-----------|--------------|------------------------|
| Day 1     | Week 1-4     | Loan 1 payments accepted |
| Day 7     | Week 28-32   | Loan 1 → 60% complete |
| Day 30    | Week 120+    | Loan 1 complete, Loan 2 starts (May 2024) |
| Day 60    | Week 240+    | Loan 2 complete, Loan 3 starts (Oct 2024) |

### Pattern 2: Manual Control via REST API

**Advance 4 weeks immediately:**
```bash
curl -X POST http://localhost:8080/api/v1/time-travel/advance?weeks=4 \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

**Response:**
```json
{
  "message": "Advised 4 weeks. Virtual date: 2022-11-03",
  "virtualDate": "2022-11-03",
  "progressPercent": "2.3%"
}
```

**Check current status:**
```bash
curl -X GET http://localhost:8080/api/v1/time-travel/status \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

**Response:**
```json
{
  "weeksOffset": 4,
  "virtualDate": "2022-11-03",
  "progressPercent": 2.3,
  "isComplete": false,
  "memberNumber": "BVL-2022-000001",
  "simulationStart": "2022-10-06",
  "simulationEnd": "2025-08-28"
}
```

**Reset to start:**
```bash
curl -X POST http://localhost:8080/api/v1/time-travel/reset \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

### Pattern 3: Combination (Auto + Manual)

1. Start backend with automatic 6-hourly cron
2. Let it run overnight (24 hours ≈ 4 weeks virtual progress)
3. Next morning, manually advance 8 weeks for specific testing scenario
4. Observe schedule progression in database

---

## Benjamin's Loan Milestones (Timeline)

Use these virtual dates to trigger specific test scenarios:

### Loan 1: Initial Disbursement
- **Virtual Date:** Oct 6, 2022
- **Principal:** KES 1,000,000
- **Term:** 104 weeks (2 years)
- **Status:** First installment due
- **Test Scenario:** Verify disbursement, schedule generation

### Loan 1: Partially Paid
- **Virtual Date:** May 2024 (61 installments paid)
- **Outstanding:** ~KES 577,054
- **Status:** Mid-term, nearly complete
- **Test Scenario:** Verify prepayment credits, penalty-free early settlement

### Loan 2: Refinance (Top-Up)
- **Virtual Date:** May 30, 2024
- **Principal:** KES 1,300,000 (1M + 300K top-up)
- **Term:** 104 weeks
- **Status:** Old loan closed, new loan opened
- **Test Scenario:** Refinancing flow, credit migration

### Loan 2: Completed
- **Virtual Date:** Oct 3, 2024
- **Outstanding:** KES 577,054 (restructured)
- **Status:** Ready for restructuring
- **Test Scenario:** Verify restructure eligibility

### Loan 3: Restructure
- **Virtual Date:** Oct 10, 2024
- **Principal:** KES 577,054 (no new cash)
- **Term:** 52 weeks (halved)
- **Status:** Fresh 52-week schedule
- **Test Scenario:** Restructure with tighter payment schedule

### Loan 3: Final Payment
- **Virtual Date:** Aug 28, 2025
- **Outstanding:** Fully paid
- **Status:** Complete
- **Test Scenario:** Verify loan closure, certificate issuance

---

## Manual Testing Workflow

### Scenario: Test Penalty Application on Day 43 (One Overdue Week)

```bash
# 1. Login as admin
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"admin@sacco.local","password":"..."}'

# Extract JWT token and XSRF token

# 2. Set virtual time to Week 1 (start date)
curl -X POST http://localhost:8080/api/v1/time-travel/reset

# 3. Advance 1 week (first installment due)
curl -X POST http://localhost:8080/api/v1/time-travel/advance?weeks=1

# 4. Check if installment is marked DUE
curl -X GET http://localhost:8080/api/v1/loans/benjamin-status

# 5. Verify repayment not submitted
# (Loan schedule should show Week 1 as OVERDUE after Week 2 starts)

# 6. Advance to Week 8 (7 days past due)
curl -X POST http://localhost:8080/api/v1/time-travel/advance?weeks=7

# 7. Check penalties table
curl -X GET http://localhost:8080/api/v1/penalties?memberNumber=BVL-2022-000001

# Expected: Penalty of ~150 KES (MISSED_INSTALLMENT)
```

---

## How to Disable Auto-Progression

If you want manual-only control (no automatic 6-hourly cron):

1. Comment out the `@Scheduled(cron = "...")` on `executeWeeklyProgressionCheck()` in `TimeTravelerService.java`
2. Keep `TimeTravelController` endpoints active
3. Advance time manually via API as needed

**File:** `core/service/TimeTravelerService.java`
```java
// @Scheduled(cron = "0 0 0,6,12,18 * * *")
@Transactional
public void executeWeeklyProgressionCheck() { ... }
```

---

## Integration with Existing Loan Test Data

The time-traveler works **with** the existing `benjamin-ultimate-test.http` file:

1. **Before:** Run migrations to create Benjamin's 3 loans with historical dates
   ```bash
   # All requests in benjamin-ultimate-test.http
   # Creates loans with disbursement dates in Oct 2022, May 2024, Oct 2024
   ```

2. **After:** Time-traveler auto-progresses schedule items as if weeks are passing
   ```bash
   # Schedule advancement happens automatically every 6 hours
   # Penalties calculated based on virtual date
   # Refinance eligibility checked against virtual timeline
   ```

---

## Database Tracking

Virtual time offset is **not** persisted to the database. It's maintained in-memory within `TimeTravelerService`:

- `virtualWeeksOffset` field stores current offset
- Resets to 0 on application restart
- Use `GET /api/v1/time-travel/status` to check current value
- Use `POST /api/v1/time-travel/reset` to manually reset to 0

**To persist across restarts:**
- Extend implementation to use a `TimelineState` table
- Store `virtualWeeksOffset` in a singleton config entity

---

## Troubleshooting

### Issue: Cron not triggering

**Check:**
- Verify `@EnableScheduling` is present on main application class
- Verify `@Scheduled` annotations are present
- Check logs for `TIME TRAVEL TICK` messages
- Ensure `LocalDate.now()` is called inside service methods, not evaluated at startup

### Issue: Penalties not applying

**Check:**
- Verify schedule items are being marked OVERDUE
- Verify `LoanInstallmentOverdueEvent` is being published
- Check `PenaltyService` is listening for event
- Verify penalty rules exist for `MISSED_INSTALLMENT`

### Issue: Refinance fails at virtual date

**Check:**
- Verify Loan 1 has PAID status before refinancing
- Verify Loan 1 disbursement date is before Loan 2 virtual refinance date
- Verify schedule items are fully marked PAID/SETTLED

---

## Performance Notes

- Each virtual week advancement triggers 1 schedule scan per Benjamin's loans
- Expected latency: <100ms per advance
- DB queries are indexed on `due_date` and `status`
- Concurrent requests are safe (transactional)

---

## Future Enhancements

- [ ] Persist virtual timeline offset to `timeline_state` table
- [ ] Support multiple parallel simulations (e.g., Jacob's loans)
- [ ] UI dashboard showing virtual timeline progress
- [ ] Automated test suite using cron triggers
- [ ] Time-skip to specific dates (e.g., `?skipToDate=2024-05-30`)

