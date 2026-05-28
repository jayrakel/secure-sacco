# SYSTEM-WIDE FIX: GHOST SCHEDULES BUG
## The Complete Solution for Refinancing Issues
**Issue Date:** April 5, 2026  
**Affected Members:** Benjamin, Salesio, Charles (and any with refinances)  
**Bug Type:** Schedule Item Neutralization  

---

## THE BUG: GHOST SCHEDULES

### What's Happening:

When a member refinances:
1. ✅ **Java backend correctly** rolls debt forward to new loan
2. ✅ **Backend correctly** marks old loan as REFINANCED
3. ❌ **Backend FAILS TO** cancel old schedule items
4. ❌ Old schedules remain in database marked DUE
5. ❌ Cron job later marks them OVERDUE
6. ❌ System counts same debt **multiple times**

### The Result:

**Benjamin's Example:**
```
Loan 1 Original Debt: 534,354 KES
  ├─ Paid: Some amount
  ├─ Rolled to Loan 2: ✅ Done
  └─ Old schedules: ❌ Still in DB marked DUE → OVERDUE

Loan 2 Original Debt: 577,054 KES
  ├─ Paid: Some amount
  ├─ Rolled to Loan 3: ✅ Done
  └─ Old schedules: ❌ Still in DB marked DUE → OVERDUE

Loan 3 Original Debt: 312,757 KES
  ├─ Paid: 634,764 (overpaid!)
  └─ Result: CLOSED + 9,993 credit

TOTAL GHOST ARREARS: 534,354 + 577,054 = 1,111,408 KES
  ↑ This is DOUBLE-COUNTING, not real arrears!
```

---

## THE THREE-PART SYSTEM-WIDE FIX

### PART 1: Code Fix - Refinancing Logic

**File to Fix:** `LoanApplicationService.java` (refinance method)

**Current Code (BUGGY):**
```java
public LoanApplication refinanceLoan(UUID oldLoanId, LoanRefinerDto dto) {
    // ... code ...
    
    // ✅ Create new loan with rolled balance
    LoanApplication newLoan = createNewLoan(...);
    
    // ✅ Mark old loan as REFINANCED
    oldLoan.setStatus(LoanStatus.REFINANCED);
    loanApplicationRepository.save(oldLoan);
    
    // ❌ MISSING: Cancel old schedule items!
    
    return newLoan;
}
```

**Fixed Code:**
```java
public LoanApplication refinanceLoan(UUID oldLoanId, LoanRefinerDto dto) {
    // ... existing code ...
    
    // ✅ Create new loan with rolled balance
    LoanApplication newLoan = createNewLoan(...);
    
    // ✅ Mark old loan as REFINANCED
    oldLoan.setStatus(LoanStatus.REFINANCED);
    loanApplicationRepository.save(oldLoan);
    
    // ✅ NEW: Cancel all unpaid schedule items from old loan
    List<LoanScheduleItem> oldSchedules = loanScheduleItemRepository
        .findByLoanApplicationId(oldLoanId);
    
    for (LoanScheduleItem item : oldSchedules) {
        if (!item.getStatus().equals(LoanScheduleStatus.PAID)) {
            // Mark as REPLACED instead of keeping DUE
            item.setStatus(LoanScheduleStatus.REPLACED);
            loanScheduleItemRepository.save(item);
        }
    }
    
    return newLoan;
}
```

---

### PART 2: Database Fix - Add Schedule Status

**Create New Status:**
```sql
-- Add to LoanScheduleStatus enum in database
ALTER TABLE loan_schedule_items 
ADD CONSTRAINT check_valid_status 
CHECK (status IN ('PENDING', 'DUE', 'PAID', 'OVERDUE', 'REPLACED'));
```

**Migration Script:**
```sql
-- Create enum type if not exists
DO $$ BEGIN
    CREATE TYPE loan_schedule_status_enum AS ENUM (
        'PENDING', 'DUE', 'PAID', 'OVERDUE', 'REPLACED'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Update schedule items from old refinanced loans
UPDATE loan_schedule_items lsi
SET status = 'REPLACED'
WHERE 
    status IN ('DUE', 'PENDING')
    AND loan_application_id IN (
        SELECT id FROM loan_applications 
        WHERE status IN ('REFINANCED', 'RESTRUCTURED')
    )
    AND lsi.principal_paid + lsi.interest_paid < 
        lsi.principal_due + lsi.interest_due;
```

---

### PART 3: View Fix - Exclude Ghost Schedules

**File:** `V31__create_reporting_views.sql`

**Current View (BUGGY):**
```sql
CREATE OR REPLACE VIEW v_member_loan_summary AS
WITH loan_level_summary AS (
    SELECT
        la.id AS loan_id,
        la.member_id,
        COALESCE(SUM(
            CASE
                WHEN lsi.due_date < CURRENT_DATE AND lsi.status != 'PAID'
                    THEN (lsi.principal_due + lsi.interest_due 
                          - lsi.principal_paid - lsi.interest_paid)
                ELSE 0
                END
        ), 0) AS total_arrears
    FROM loan_applications la
    LEFT JOIN loan_schedule_items lsi ON la.id = lsi.loan_application_id
    WHERE la.status IN ('ACTIVE', 'IN_GRACE', 'DEFAULTED')
    GROUP BY la.id, la.member_id
)
```

**Fixed View:**
```sql
CREATE OR REPLACE VIEW v_member_loan_summary AS
WITH loan_level_summary AS (
    SELECT
        la.id AS loan_id,
        la.member_id,
        COALESCE(SUM(
            CASE
                WHEN lsi.due_date < CURRENT_DATE 
                     AND lsi.status NOT IN ('PAID', 'REPLACED')  -- ✅ Exclude REPLACED
                    THEN (lsi.principal_due + lsi.interest_due 
                          - lsi.principal_paid - lsi.interest_paid)
                ELSE 0
                END
        ), 0) AS total_arrears
    FROM loan_applications la
    LEFT JOIN loan_schedule_items lsi ON la.id = lsi.loan_application_id
    WHERE la.status IN ('ACTIVE', 'IN_GRACE', 'DEFAULTED')
    GROUP BY la.id, la.member_id
)
```

---

### PART 4: Java Enum Fix

**File:** `LoanScheduleStatus.java`

**Current:**
```java
public enum LoanScheduleStatus {
    PENDING,
    DUE,
    OVERDUE,
    PAID
}
```

**Fixed:**
```java
public enum LoanScheduleStatus {
    PENDING,
    DUE,
    OVERDUE,
    PAID,
    REPLACED  // ✅ NEW: For canceled/refinanced schedules
}
```

---

## DATA CLEANUP: Fix Historical Data

### For Benjamin:

```sql
-- Mark Loan 1's old schedules as REPLACED
UPDATE loan_schedule_items 
SET status = 'REPLACED'
WHERE loan_application_id = (
    SELECT id FROM loan_applications 
    WHERE member_id = (SELECT id FROM members WHERE member_number = 'BVL-2022-000001')
    AND status = 'REFINANCED'
    AND principal_amount = 534354  -- Loan 1
)
AND status IN ('DUE', 'OVERDUE', 'PENDING');

-- Mark Loan 2's old schedules as REPLACED
UPDATE loan_schedule_items 
SET status = 'REPLACED'
WHERE loan_application_id = (
    SELECT id FROM loan_applications 
    WHERE member_id = (SELECT id FROM members WHERE member_number = 'BVL-2022-000001')
    AND status = 'RESTRUCTURED'
    AND principal_amount = 577054  -- Loan 2
)
AND status IN ('DUE', 'OVERDUE', 'PENDING');
```

**Expected Result for Benjamin:**
- Before: Arrears = 1,111,408 (ghost schedules)
- After: Arrears = 0 or minimal (only Loan 3 active)
- Status: Will now have ACTIVE loan properly assigned

---

### For Charles:

```sql
-- Mark Loan 1's old schedules as REPLACED
UPDATE loan_schedule_items 
SET status = 'REPLACED'
WHERE loan_application_id = '58d0023f-833d-4690-86b2-db1d469c9655'
AND status IN ('DUE', 'OVERDUE', 'PENDING');

-- Mark Loan 2's old schedules as REPLACED
UPDATE loan_schedule_items 
SET status = 'REPLACED'
WHERE loan_application_id = '7ae9cce1-873e-4135-8780-9885c88e8b88'
AND status IN ('DUE', 'OVERDUE', 'PENDING');
```

**Expected Result for Charles:**
- Before: Arrears = 430,477 (includes ghost schedules)
- After: Arrears = 162,275.38 (only Loan 3)
- Status: Loan statuses also need fixing (see separate issue)

---

### For Salesio:

```sql
-- Similar pattern - mark old schedules from RESTRUCTURED loan as REPLACED
UPDATE loan_schedule_items 
SET status = 'REPLACED'
WHERE loan_application_id IN (
    SELECT id FROM loan_applications 
    WHERE member_id = (SELECT id FROM members WHERE member_number = 'BVL-2022-000002')
    AND status IN ('RESTRUCTURED', 'REFINANCED')
)
AND status IN ('DUE', 'OVERDUE', 'PENDING');
```

---

## VERIFICATION QUERIES

### Before Fix:
```sql
-- Check ghost schedules
SELECT 
  m.member_number,
  la.id,
  la.status as loan_status,
  COUNT(*) as schedule_count,
  SUM(CASE WHEN lsi.status IN ('DUE', 'OVERDUE', 'PENDING') 
      THEN lsi.principal_due + lsi.interest_due - lsi.principal_paid - lsi.interest_paid 
      ELSE 0 END) as ghost_arrears
FROM members m
JOIN loan_applications la ON m.id = la.member_id
JOIN loan_schedule_items lsi ON la.id = lsi.loan_application_id
WHERE m.member_number IN ('BVL-2022-000001', 'BVL-2022-000002', 'BVL-2022-000003')
AND la.status IN ('REFINANCED', 'RESTRUCTURED')
GROUP BY m.member_number, la.id, la.status;
```

### After Fix:
```sql
-- Verify ghost schedules are gone
SELECT 
  m.member_number,
  la.id,
  la.status as loan_status,
  COUNT(*) as schedule_count,
  SUM(CASE WHEN lsi.status IN ('DUE', 'OVERDUE', 'PENDING') 
      THEN lsi.principal_due + lsi.interest_due - lsi.principal_paid - lsi.interest_paid 
      ELSE 0 END) as ghost_arrears
FROM members m
JOIN loan_applications la ON m.id = la.member_id
JOIN loan_schedule_items lsi ON la.id = lsi.loan_application_id
WHERE m.member_number IN ('BVL-2022-000001', 'BVL-2022-000002', 'BVL-2022-000003')
AND la.status IN ('REFINANCED', 'RESTRUCTURED')
GROUP BY m.member_number, la.id, la.status;

-- Expected: All ghost_arrears = 0 or NULL
```

---

## IMPLEMENTATION STEPS

### Phase 1: Code Changes (No Data Loss)
1. Add REPLACED status to LoanScheduleStatus enum
2. Update LoanApplicationService.refinanceLoan() method
3. Update v_member_loan_summary view
4. Deploy to staging/test environment

### Phase 2: Verification
1. Test with sample refinancing scenario
2. Verify old schedules marked as REPLACED
3. Verify arrears calculations correct
4. Verify UI displays correct amounts

### Phase 3: Data Cleanup
1. Run SQL cleanup scripts for Benjamin, Salesio, Charles
2. Verify historical data corrected
3. Test UI displays for all three members
4. Deploy to production

### Phase 4: Monitoring
1. Monitor refinancing operations
2. Verify no new ghost schedules created
3. Track arrears accuracy for 1-2 weeks
4. Document lessons learned

---

## EXPECTED OUTCOMES

### Benjamin:
**Before Fix:**
- Loan 1: REFINANCED, 534,354 KES ghost arrears
- Loan 2: RESTRUCTURED, 577,054 KES ghost arrears
- Loan 3: CLOSED, 9,993 credit
- Arrears shown: 1,111,408 KES

**After Fix:**
- Loan 1: REFINANCED, 0 ghost arrears (marked REPLACED)
- Loan 2: RESTRUCTURED, 0 ghost arrears (marked REPLACED)
- Loan 3: CLOSED, 9,993 credit (unchanged)
- Arrears shown: 0 (correct!)
- UI: Will need to assign ACTIVE status to correct loan or leave as is

### Charles:
**Before Fix:**
- Arrears: 430,477 KES (includes ghost schedules)
- Status Issue: Reversed

**After Fix:**
- Arrears: 162,275.38 KES (correct!)
- After status fix: UI will show 162,275.38 ✅

### Salesio:
**Before Fix:**
- Arrears: 31,119.45 KES (may include some ghosts)

**After Fix:**
- Arrears: Confirmed accurate (likely unchanged)

---

## ADDITIONAL FIXES NEEDED

### Charles's Status Issue (Separate)
Still needs the status reversal fix:
```sql
UPDATE loan_applications SET status = 'ACTIVE' 
WHERE id = 'bd684f22-b068-426b-9364-6b890ff6be6a';

UPDATE loan_applications SET status = 'RESTRUCTURED' 
WHERE id = '58d0023f-833d-4690-86b2-db1d469c9655';
```

### Benjamin's Status Issue (Investigation)
- Current: 0 ACTIVE loans, 1 RESTRUCTURED, 1 REFINANCED, 1 CLOSED
- Decision: Should any be marked ACTIVE, or is CLOSED correct since he paid it off?
- Action: Determine business logic, update accordingly

---

## PREVENTION: Going Forward

1. **Unit Tests:** Add tests for refinancing that verify old schedules are REPLACED
2. **Integration Tests:** Test full refinancing flow end-to-end
3. **Code Review:** All refinancing PRs must include schedule neutralization
4. **Monitoring:** Alert on large gaps between calculated and expected arrears
5. **Documentation:** Document refinancing business logic clearly

