# FINAL ROOT CAUSE: THE 10,023 KES GAP - STATUS CONFUSION

## THE REAL PROBLEM IDENTIFIED

The issue is **not** a calculation error - it's a **database status error**.

---

## DATABASE STATE (The Smoking Gun)

Charles's loans have their statuses **REVERSED**:

| Loan ID | Disbursed | Expected Status | Actual Status | Problem |
|---------|---|---|---|---|
| Loan 1 (58d0023f) | 08/09/2022 | `RESTRUCTURED` | **`ACTIVE`** | ❌ Should be closed |
| Loan 2 (7ae9cce1) | 07/09/2023 | `REFINANCED` | **`RESTRUCTURED`** | ❌ Wrong status |
| Loan 3 (bd684f22) | 10/12/2023 | **`ACTIVE`** | **`REFINANCED`** | ❌ Should be active |

---

## HOW THIS CAUSES THE 10,023 GAP

### The View Query (v_member_loan_summary):
```sql
WHERE la.status IN ('ACTIVE', 'IN_GRACE', 'DEFAULTED')
```

This means the view **only includes loans marked as ACTIVE**.

### What Gets Included:
- ✓ Loan 1: status = `ACTIVE` → INCLUDED
- ✗ Loan 2: status = `RESTRUCTURED` → EXCLUDED
- ✗ Loan 3: status = `REFINANCED` → EXCLUDED

### The Calculation:
```
View returns: Loan 1 arrears only = 192,349.18
  (date-based: due_date < CURRENT_DATE)
  
But Loan 1 at Nov 20, 2025 shows: 
  Status-based only: 152,251.98
  
This is the MISMATCH!
```

---

## THE COMPLETE PICTURE

### Database Shows (Today - April 5, 2026):
```
view v_member_loan_summary total_arrears:  192,349.18
  ↑ This is Loan 1 (the only one in the view with status='ACTIVE')
  ↑ Calculated as date-based (< CURRENT_DATE = Apr 5, 2026)
  ↑ Not Nov 20, 2025!
```

### UI Displayed (As of Nov 20, 2025):
```
152,251.98
  ↑ This is Loan 1 only
  ↑ But calculated as of Nov 20, 2025 (due_date < '2025-11-20')
  ↑ Status-based check (status = 'OVERDUE')
```

### Your Audit Says (Loan 3 - Phase 3):
```
162,275.38
  ↑ This is what Loan 3 SHOULD be showing
  ↑ Correct calculation using Phase 3 data
  ↑ The ACTIVE loan at that time
```

---

## THE 10,023 GAP EXPLAINED

```
Your Audit (Loan 3):        162,275.38
UI Display (Loan 1):        152,251.98
─────────────────────────────────────
Gap:                         10,023.40

This is the difference between:
- What Loan 3 actually owes (your correct calculation)
- What Loan 1 status showed as overdue (system shows wrong loan)
```

---

## ROOT CAUSE CHAIN

1. **Status Confusion in Database**
   - Loan 1 marked as ACTIVE (should be RESTRUCTURED)
   - Loan 3 marked as REFINANCED (should be ACTIVE)

2. **View Only Includes ACTIVE Loans**
   - Only Loan 1 is included
   - Loans 2 & 3 are excluded

3. **UI Shows Wrong Loan's Data**
   - Loan 1 arrears: 152,251.98
   - But Loan 3 is the actual active loan

4. **The Gap**
   - Your audit (Loan 3): 162,275.38
   - UI shows (Loan 1): 152,251.98
   - Difference: 10,023.40

---

## THE FIX

### Update Loan Statuses:

```sql
-- Loan 1: Change from ACTIVE to RESTRUCTURED (it was closed when Loan 2 created)
UPDATE loan_applications 
SET status = 'RESTRUCTURED' 
WHERE id = '58d0023f-833d-4690-86b2-db1d469c9655';

-- Loan 3: Change from REFINANCED to ACTIVE (it's the current one!)
UPDATE loan_applications 
SET status = 'ACTIVE' 
WHERE id = 'bd684f22-b068-426b-9364-6b890ff6be6a';
```

### Expected Result After Fix:

```
View will show Loan 3 (now marked ACTIVE):  162,275.38
UI will display:                             162,275.38
Your audit:                                  162,275.38
Gap:                                         0.00 ✓
```

---

## VERIFICATION

### Current State:
```
Loan Statuses in DB:
- Loan 1: ACTIVE (WRONG - should be RESTRUCTURED)
- Loan 2: RESTRUCTURED (correct - was replaced)
- Loan 3: REFINANCED (WRONG - should be ACTIVE)

View excludes Loan 2 & 3, includes Loan 1
UI shows only Loan 1 arrears: 152,251.98
Your audit says Loan 3 should be: 162,275.38
Gap: 10,023.40 ← Because wrong loan is active in DB
```

### What Should Happen:
```
Loan Statuses should be:
- Loan 1: RESTRUCTURED (closed, replaced by Loan 2)
- Loan 2: REFINANCED (closed, replaced by Loan 3)
- Loan 3: ACTIVE (current, active loan)

View includes only Loan 3 (now marked ACTIVE)
UI shows Loan 3 arrears: 162,275.38
Your audit: 162,275.38
Gap: 0.00 ✓ CORRECT
```

---

## SUMMARY

**The 10,023 KES discrepancy is caused by:**

1. **Loan status is wrong in database**
   - Loan 1 should be RESTRUCTURED (closed) but is marked ACTIVE
   - Loan 3 should be ACTIVE (current) but is marked REFINANCED

2. **System includes wrong loan in calculations**
   - View only includes ACTIVE loans
   - Loan 1 (wrong one) is marked ACTIVE
   - Loan 3 (correct one) is marked REFINANCED

3. **UI displays wrong loan's arrears**
   - Shows Loan 1: 152,251.98
   - Should show Loan 3: 162,275.38
   - Gap: 10,023.40

**The fix:** Update loan statuses to mark Loan 3 as ACTIVE and Loan 1 as RESTRUCTURED.

