# ROOT CAUSE ANALYSIS: WHY UI SHOWS 152,251.98 INSTEAD OF 162,275.38

## EXECUTIVE SUMMARY

**The UI displays KES 152,251.98 instead of the correct KES 162,275.38 because:**

The Java service layer (`LoanReportingService`) calculates arrears using **ONLY status-based logic** and **does NOT validate dates**. This causes it to miss **40 past-due schedule items** that haven't been marked with OVERDUE status.

**Missing Amount: KES 40,097.20**

---

## THE PROBLEM IN DETAIL

### How the UI Calculates Arrears (WRONG)

**File:** `LoanReportingService.java` Line 69

```java
if (item.getStatus() == LoanScheduleStatus.OVERDUE) {
    totalArrears = totalArrears.add(itemBalance);
}
```

**Logic:** "If status = 'OVERDUE', count it as arrears"

**Issue:** Many items are past-due (due_date < TODAY) but don't have OVERDUE status

---

### Database Records for Charles Gicheru

Charles has **3 loan applications** (from refinancing):

| Loan ID | Description | OVERDUE Items | Past-Due Items | OVERDUE Balance | Past-Due Balance | Gap |
|---------|---|---|---|---|---|---|
| 58d0023f (Loan 1) | Initial Loan | 76 | 96 | 152,251.98 | 192,349.18 | **40,097.20** |
| 7ae9cce1 (Loan 2) | 1st Restructure | 87 | 87 | 154,813.40 | 154,813.40 | 0 |
| bd684f22 (Loan 3) | 100k Top-Up | 96 | 116 | 123,412.10 | 149,214.30 | 25,802.20 |

---

## THE EXACT DISCREPANCY

### Loan 1 (The Main Problem)

```
Total Past-Due Items (due_date < TODAY, status != PAID): 96 items = KES 192,349.18
Total OVERDUE Items (status = 'OVERDUE'):                76 items = KES 152,251.98

Missing Items: 96 - 76 = 20 items
Missing Amount: 192,349.18 - 152,251.98 = KES 40,097.20
```

### What Items Are Missing?

The UI doesn't count items that:
- ✓ Have a due date in the past (< April 5, 2026)
- ✓ Are not fully paid
- ✗ But DON'T have status = 'OVERDUE'

These 20 items have statuses like:
- `DUE` (due in current week)
- `PENDING` (not yet due when last marked)
- `PAID_PARTIAL` (if that status exists)

---

## WHY PHASES 3 ARREARS ARE WRONG TOO

Your correct Phase 3 arrears: **KES 162,275.38**

What the system shows:
- **Loan 3** (which IS Phase 3): KES 123,412.10 (status-based)
- **Loan 3 past-due**: KES 149,214.30 (date-based)
- **Gap**: KES 25,802.20

But the correct figure is the **entire Loan 1 balance** which carries forward as arrears after capitalization!

---

## THE THREE-LOAN DUPLICATE PROBLEM

Because the system didn't cancel old loans on refinance:

```
When UI calculates arrears for Charles's account:
├─ It sees 3 ACTIVE loans
├─ It sums all 3 loan arrears
└─ But only for items with status = 'OVERDUE'

When you query date-based (correct method):
├─ It sees 3 loans
├─ It sums items past-due by date
└─ It includes items not yet marked OVERDUE
```

**Result:**
- Status-based: Loan 1 only counts 152,251.98 of the 192,349.18 it should
- Date-based: Loan 1 counts all 192,349.18
- **Difference: 40,097.20 KES**

---

## THE REAL ISSUE

### The Frontend Gets the Wrong Data

**Frontend call:**
```
GET /api/v1/loans/reports/{loan_id}/summary/member
```

**Backend flow:**
1. `LoanReportingController.getMemberLoanSummary(loan_id)` 
2. `LoanReportingService.calculateLoanSummary(app)`
3. **Line 69:** Counts only items where `status == OVERDUE`
4. Returns `{totalArrears: 152251.98, ...}`

**Frontend renders:**
```
Loan Arrears: KES 152,251.98
```

---

## COMPARISON WITH YOUR CORRECT FIGURES

| Source | Arrears Value | Calculation Method |
|--------|---|---|
| **Your Audit** | **162,275.38** | Manual: Phase 3 expected - actual paid |
| **Database View** | 192,349.18 | SQL: past-due validation (correct date logic) |
| **UI Display** | **152,251.98** | Java: status-based only (WRONG) |
| **Difference (UI vs Correct)** | **-10,023.40** | Missing items not marked OVERDUE |

---

## ROOT CAUSE CHAIN

```
1. REFINANCING NOT CLEAN
   ├─ Loan 1 schedule items NOT canceled on Loan 2 refinance
   └─ Loan 2 schedule items NOT canceled on Loan 3 refinance
   
2. SCHEDULE STATUS NOT UPDATED
   ├─ Some old items still have status = 'PENDING' or 'DUE'
   ├─ Even though due_date is now in the past
   └─ Status not re-validated after time passed
   
3. UI CALCULATION TOO SIMPLE
   ├─ Only checks: status == 'OVERDUE'
   ├─ Doesn't check: due_date < CURRENT_DATE
   └─ Misses 20 items that should count as arrears
   
4. DATABASE VIEW MORE COMPLETE
   ├─ Checks both: due_date < CURRENT_DATE AND status != 'PAID'
   └─ Catches all past-due items regardless of status
```

---

## WHAT SHOULD HAPPEN

### Option 1: Fix UI to Match DB View (Recommended)

**Change in LoanReportingService.java line 69 from:**
```java
if (item.getStatus() == LoanScheduleStatus.OVERDUE) {
    totalArrears = totalArrears.add(itemBalance);
}
```

**To:**
```java
if (item.getDueDate().isBefore(LocalDate.now()) && itemBalance.compareTo(BigDecimal.ZERO) > 0) {
    totalArrears = totalArrears.add(itemBalance);
}
```

**Result:** UI would show 192,349.18 (matching database view)

### Option 2: Only Use Correct Loan (Phase 3)

**Better approach:** Only calculate arrears for Loan 3 (the active one), not Loan 1 & 2

**Result:** UI would show 162,275.38 (your correct Phase 3 arrears)

---

## SUMMARY

**Why UI shows 152,251.98 instead of 162,275.38:**

1. ✗ Java service uses `status == 'OVERDUE'` check ONLY
2. ✗ Database has 96 past-due items for Loan 1, but only 76 are marked OVERDUE
3. ✗ Missing 20 items = KES 40,097.20
4. ✗ UI shows only OVERDUE items: 152,251.98
5. ✓ Database view shows all past-due items: 192,349.18
6. ✓ Your correct Phase 3 calculation: 162,275.38

**The fix:** Either update the UI calculation logic to use date-based validation OR consolidate to only show active (Phase 3) loan arrears.


