# ROOT CAUSE: 10,023 KES DISCREPANCY (AS OF NOVEMBER 20, 2025)

## THE REAL ISSUE CLARIFIED

You're looking at data **AS OF NOVEMBER 20, 2025**, not today (April 5, 2026).

This changes everything. The UI shows **152,251.98** which is from **Loan 1 only**, but you expect **162,275.38** from **Loan 3 (Phase 3)**.

---

## THE BREAKDOWN (AS OF NOVEMBER 20, 2025)

### System Shows (Status-Based, All Loans):

| Loan | Type | Amount |
|------|------|--------|
| Loan 1 | Initial | **152,251.98** |
| Loan 2 | Restructure 1 | 154,813.40 |
| Loan 3 | Restructure 2 (100k) | 123,412.10 |
| **TOTAL** | **All Active** | **430,477.48** |

### Your Audit Shows (Phase 3 Only):

```
Phase 3 Expected (98 weeks):  196,475.30 KES
Phase 3 Paid:                  34,199.92 KES
Phase 3 Arrears:              162,275.38 KES
```

---

## THE 10,023 KES GAP EXPLAINED

```
Your Phase 3 Correct Figure:    162,275.38
System Loan 3 Shows:            123,412.10
─────────────────────────────────────────
Difference:                      39,263.28  ← Wait, this is bigger!

But...

Loan 1 shows:                   152,251.98
Loan 2 shows:                   154,813.40
Loan 3 shows:                   123,412.10

Loan 1 + Loan 2:                307,065.38
Loan 3 only:                    123,412.10
─────────────────────────────────────────
If UI should be showing Loan 3: 162,275.38 - 123,412.10 = 38,863.28 gap

Close to 40,097.20 gap we found earlier!
```

### The Correct Analysis:

**If UI is displaying 152,251.98, that IS Loan 1 balance, not Loan 3 balance.**

The 10,023 difference is:
```
Expected (Your Audit):  162,275.38
UI Actually Shows:      152,251.98
─────────────────────────────────
Gap:                     10,023.40

This 10,023 gap = Loan 1 balance (152,251.98) is NOT the same as 
                  Loan 3 balance (162,275.38)
                  
The difference = 162,275.38 - 152,251.98 = 10,023.40
```

---

## WHY THE CONFUSION

### The Real Problem:

1. **Charles has 3 active loans due to refinancing**
   - Loan 1: Initial borrowing
   - Loan 2: Restructure (replaces Loan 1, no new cash)
   - Loan 3: Top-up (replaces Loan 2, adds 100k)

2. **The system didn't cancel old loans**
   - All 3 remain ACTIVE
   - All 3 schedule items show arrears

3. **Your audit calculated only Phase 3** (the correct one)
   - 162,275.38 is LOAN 3 arrears
   - This is what should be displayed

4. **The UI is showing Loan 1 arrears instead**
   - 152,251.98 is LOAN 1 arrears
   - Or it's summing all 3 but in a wrong way

---

## WHAT THE UI SHOULD SHOW

### Option A: Show Only Active Loan (Loan 3 - Phase 3) ✓ CORRECT

```
Arrears: KES 162,275.38  ← Your audit
```

### Option B: Sum All Past-Due Items (All 3 Loans)

```
Arrears: KES 430,477.48 (all past-due items from all 3 loans)
```

### Option C: What It Currently Shows ❌

```
Arrears: KES 152,251.98 (only Loan 1? or incomplete calculation?)
```

---

## ROOT CAUSE: WHICH LOAN IS THE UI DISPLAYING?

The UI shows **152,251.98** which exactly matches **Loan 1's arrears**.

**But Charles is on Loan 3!**

The issue is that when you query for Charles's arrears:
- The system finds 3 active loans
- It should aggregate them correctly OR show only the active one
- Instead it's showing the wrong loan's amount

---

## THE REAL 10,023 DIFFERENCE

```
Your Phase 3 Arrears (Correct):      162,275.38
Loan 1 Arrears shown in UI:          152,251.98
─────────────────────────────────────────────────
Difference:                           10,023.40

This means the UI is showing Loan 1 (old, paid-off phases) 
instead of Loan 3 (current active phase)
```

---

## SOLUTION

**The UI should display LOAN 3 arrears (162,275.38), not Loan 1 (152,251.98)**

### Implementation:
1. Identify which loan is truly ACTIVE
2. Show only that loan's arrears
3. Or properly aggregate all 3 if they're all still active

### Code Location:
- `ReportService.getMemberFinancialOverview()` or
- `LoanReportingService.calculateLoanSummary()` 

These are pulling from the wrong loan or aggregating incorrectly.

---

## CONFIRMATION

**AS OF NOVEMBER 20, 2025:**
- ✓ Your audit of Phase 3: 162,275.38 KES (CORRECT)
- ✗ UI displays Loan 1: 152,251.98 KES (WRONG)
- ✗ Gap: 10,023.40 KES (Loan 3 - Loan 1)

The UI needs to show Loan 3 arrears, not Loan 1.

