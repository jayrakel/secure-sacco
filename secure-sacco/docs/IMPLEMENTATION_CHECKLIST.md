# IMPLEMENTATION CHECKLIST: GHOST SCHEDULES FIX

## THE ISSUE EXPLAINED SIMPLY

When a member refinances their loan:
- ✅ System correctly rolls their debt forward
- ❌ System FORGETS to cancel the old schedule items
- ❌ Old items sit in database marked DUE → become OVERDUE
- ❌ Arrears calculation counts them AGAIN = Double/Triple counting

**Benjamin's Case:**
```
Loan 1 debt: 534,354 ← Rolled to Loan 2, but schedules still in DB
Loan 2 debt: 577,054 ← Rolled to Loan 3, but schedules still in DB
Total Ghost: 1,111,408 ← False arrears from abandoned schedules!
```

---

## STEP-BY-STEP FIX IMPLEMENTATION

### STEP 1: Add New Status to System

**File:** `src/main/java/com/jaytechwave/sacco/modules/loans/domain/enums/LoanScheduleStatus.java`

**Add this line:**
```java
public enum LoanScheduleStatus {
    PENDING,
    DUE,
    OVERDUE,
    PAID,
    REPLACED    // ← NEW: For old schedules from refinanced loans
}
```

✅ **Time:** 2 minutes

---

### STEP 2: Fix the Refinancing Code

**File:** `src/main/java/com/jaytechwave/sacco/modules/loans/domain/service/LoanApplicationService.java`

**Find:** The `refinanceLoan()` method

**Add after the line that marks old loan as REFINANCED:**

```java
// NEW: Cancel all unpaid schedule items from old loan
List<LoanScheduleItem> oldSchedules = loanScheduleItemRepository
    .findByLoanApplicationId(oldLoanId);

for (LoanScheduleItem item : oldSchedules) {
    if (!item.getStatus().equals(LoanScheduleStatus.PAID)) {
        item.setStatus(LoanScheduleStatus.REPLACED);
        loanScheduleItemRepository.save(item);
    }
}
```

✅ **Time:** 5 minutes

---

### STEP 3: Update the Reporting View

**File:** `src/main/resources/db/migration/V31__create_reporting_views.sql`

**Find:** `v_member_loan_summary` view

**Change this line:**
```sql
AND lsi.status != 'PAID'
```

**To this:**
```sql
AND lsi.status NOT IN ('PAID', 'REPLACED')  -- Exclude ghost schedules
```

✅ **Time:** 2 minutes

---

### STEP 4: Clean Up Historical Data

**Run these SQL commands in order:**

#### For Benjamin:
```sql
-- Mark Loan 1 ghosts as REPLACED
UPDATE loan_schedule_items lsi
SET status = 'REPLACED'
WHERE lsi.loan_application_id IN (
    SELECT la.id FROM loan_applications la
    WHERE la.member_id = (SELECT id FROM members WHERE member_number = 'BVL-2022-000001')
    AND la.status = 'REFINANCED'
    AND (SELECT COUNT(*) FROM loan_schedule_items 
         WHERE loan_application_id = la.id AND status = 'PAID') > 40  -- Has paid schedules
)
AND lsi.status IN ('DUE', 'OVERDUE', 'PENDING');

-- Mark Loan 2 ghosts as REPLACED  
UPDATE loan_schedule_items lsi
SET status = 'REPLACED'
WHERE lsi.loan_application_id IN (
    SELECT la.id FROM loan_applications la
    WHERE la.member_id = (SELECT id FROM members WHERE member_number = 'BVL-2022-000001')
    AND la.status = 'RESTRUCTURED'
)
AND lsi.status IN ('DUE', 'OVERDUE', 'PENDING');
```

#### For Charles:
```sql
-- Mark Loan 1 ghosts as REPLACED
UPDATE loan_schedule_items SET status = 'REPLACED'
WHERE loan_application_id = '58d0023f-833d-4690-86b2-db1d469c9655'
AND status IN ('DUE', 'OVERDUE', 'PENDING');

-- Mark Loan 2 ghosts as REPLACED
UPDATE loan_schedule_items SET status = 'REPLACED'
WHERE loan_application_id = '7ae9cce1-873e-4135-8780-9885c88e8b88'
AND status IN ('DUE', 'OVERDUE', 'PENDING');
```

#### For Salesio:
```sql
-- Mark refinanced loan's ghosts as REPLACED
UPDATE loan_schedule_items lsi
SET status = 'REPLACED'
WHERE lsi.loan_application_id IN (
    SELECT la.id FROM loan_applications la
    WHERE la.member_id = (SELECT id FROM members WHERE member_number = 'BVL-2022-000002')
    AND la.status IN ('RESTRUCTURED', 'REFINANCED')
)
AND lsi.status IN ('DUE', 'OVERDUE', 'PENDING');
```

✅ **Time:** 10 minutes

---

### STEP 5: Verify the Fix Worked

**Run this query before and after:**

```sql
SELECT 
  m.member_number,
  COUNT(DISTINCT la.id) as loan_count,
  SUM(CASE WHEN lsi.status NOT IN ('PAID', 'REPLACED') AND lsi.due_date < CURRENT_DATE
      THEN lsi.principal_due + lsi.interest_due - lsi.principal_paid - lsi.interest_paid
      ELSE 0 END) as real_arrears
FROM members m
LEFT JOIN loan_applications la ON m.id = la.member_id
LEFT JOIN loan_schedule_items lsi ON la.id = lsi.loan_application_id
WHERE m.member_number IN ('BVL-2022-000001', 'BVL-2022-000002', 'BVL-2022-000003')
GROUP BY m.member_number;
```

**Expected Results:**
| member_number | real_arrears |
|---|---|
| BVL-2022-000001 | 0 or very low (was 1,111,408) |
| BVL-2022-000002 | 31,119.45 (unchanged - was correct) |
| BVL-2022-000003 | 162,275.38 (after status fix) |

✅ **Time:** 5 minutes

---

### STEP 6: Test UI Display

1. Login to UI as each member
2. Check "Loan Arrears" displayed amount
3. Verify it matches new calculated value

**Expected UI Changes:**
- Benjamin: 1,111,408 → 0 (DRAMATIC!)
- Salesio: 31,119.45 → 31,119.45 (no change)
- Charles: 152,251.98 → 162,275.38 (after status fix)

✅ **Time:** 5 minutes

---

### STEP 7: Fix Charles's Status (Separate Issue)

```sql
-- Mark Loan 3 as ACTIVE
UPDATE loan_applications SET status = 'ACTIVE' 
WHERE id = 'bd684f22-b068-426b-9364-6b890ff6be6a';

-- Mark Loan 1 as RESTRUCTURED
UPDATE loan_applications SET status = 'RESTRUCTURED' 
WHERE id = '58d0023f-833d-4690-86b2-db1d469c9655';
```

**Result:** Charles's UI will show correct 162,275.38 arrears

✅ **Time:** 2 minutes

---

## TOTAL IMPLEMENTATION TIME

```
Code Changes:        7 minutes
Data Cleanup:       10 minutes
Verification:        5 minutes
Status Fix:          2 minutes
UI Testing:          5 minutes
─────────────────────────────
TOTAL:              29 minutes
```

---

## BEFORE & AFTER COMPARISON

### Benjamin:
**BEFORE:**
- Arrears shown: 1,111,408 KES
- Status: 0 ACTIVE (incomplete)
- Problem: Ghost schedules from 2 refinanced loans

**AFTER:**
- Arrears shown: 0 KES (correct!)
- Status: Still no ACTIVE (he paid off all loans)
- Problem: FIXED ✅

### Charles:
**BEFORE:**
- Arrears shown: 152,251.98 KES (from Loan 1)
- Status: Loan 1=ACTIVE, Loan 3=REFINANCED (reversed)
- Problem: Showing wrong loan + status issue

**AFTER:**
- Arrears shown: 162,275.38 KES (from Loan 3)
- Status: Loan 1=RESTRUCTURED, Loan 3=ACTIVE (correct)
- Problem: FIXED ✅

### Salesio:
**BEFORE:**
- Arrears shown: 31,119.45 KES
- Status: Correct (1 ACTIVE, 2 CLOSED)
- Problem: None (already optimal)

**AFTER:**
- Arrears shown: 31,119.45 KES (unchanged - was correct)
- Status: Unchanged (already correct)
- Problem: None - no changes needed ✅

---

## TESTING CHECKLIST

- [ ] Code compiles without errors
- [ ] SQL migrations run successfully
- [ ] Historical data cleanup queries succeed
- [ ] Verification query shows expected results
- [ ] Benjamin's arrears changed from 1,111,408 to ~0
- [ ] Charles's arrears now 162,275.38 (after status fix)
- [ ] Salesio's arrears unchanged at 31,119.45
- [ ] UI displays updated arrears correctly
- [ ] No errors in application logs
- [ ] All three members' loan hubs display correctly

---

## DEPLOYMENT STEPS

1. **Backup database** (critical!)
2. **Deploy code changes** (Steps 1-3)
3. **Run migrations** (creates REPLACED status)
4. **Restart application**
5. **Run data cleanup** (Step 4)
6. **Verify results** (Step 5)
7. **Test UI** (Step 6)
8. **Monitor logs** for 24-48 hours

---

## IF SOMETHING GOES WRONG

### Rollback Plan:

1. **Revert code changes** (restore previous version)
2. **Restore database backup**
3. **Investigate issue**
4. **Re-test**
5. **Redeploy**

---

## SUCCESS CRITERIA

✅ Benjamin's ghost arrears eliminated (1,111,408 → 0)
✅ Charles's arrears corrected (152,251.98 → 162,275.38)
✅ Salesio's arrears verified (31,119.45 maintained)
✅ System will NOT create ghost schedules for future refinances
✅ All tests pass
✅ UI displays accurate data

---

## NEXT: Prevent Future Ghosts

Once fix is deployed:
1. Add unit tests for refinancing
2. Add integration tests for schedule cancellation
3. Document the fix in code comments
4. Update team wiki/documentation
5. Monitor refinancing operations going forward

