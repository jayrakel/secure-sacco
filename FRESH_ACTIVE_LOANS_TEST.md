# 🎯 CORRECT WORKFLOW - Fresh Active Loans for Penalty Testing

## ✅ Understanding the Issue

The `benjamin-ultimate-test.http` file:
- ✅ Creates Benjamin as member
- ✅ Disburses 3 loans
- ❌ **Marks all loans as PAID** (already completed)

So when you time-travel, there are **no active schedule items** to become overdue!

---

## 🔧 Solution: Create Fresh Active Loans

You need to create loans that are:
- ✅ **ACTIVE** (not PAID)
- ✅ **Recent disbursement** (so schedule items are PENDING/DUE)
- ✅ **No payments received yet** (so they can go OVERDUE)

---

## 🚀 STEP 1: Clean Up (Optional)

If Benjamin already exists from previous seeding:

```bash
# You can skip this and use a different member, OR
# Just create fresh loans for Benjamin by disbursing new ones

# Check what loans already exist
CSRF=$(grep XSRF-TOKEN cookies.txt | cut -f7)
curl http://localhost:8080/api/v1/loans/search?memberNumber=BVL-2022-000001 \
  -b cookies.txt > benjamin_loans.json

cat benjamin_loans.json
# Should show status of each loan (PAID, ACTIVE, etc)
```

---

## ✅ STEP 2: Disburse Fresh Active Loan (Today's Date)

```bash
# Extract CSRF
CSRF=$(grep XSRF-TOKEN cookies.txt | cut -f7)

# Disburse a NEW loan TODAY (Apr 2, 2026) with NO payments
curl -X POST http://localhost:8080/api/v1/loans/disburse \
  -H "Content-Type: application/json" \
  -H "X-XSRF-TOKEN: $CSRF" \
  -b cookies.txt \
  -d '{
    "memberId": "INSERT_BENJAMIN_UUID_HERE",
    "loanProductId": "INSERT_PRODUCT_UUID_HERE",
    "principal": 100000.00,
    "interestRate": 20,
    "termWeeks": 52,
    "disbursementDate": "2026-04-02",
    "firstInstallmentDate": "2026-04-09"
  }' > fresh_loan.json

cat fresh_loan.json
```

**OR use the migration API (simpler):**

```bash
CSRF=$(grep XSRF-TOKEN cookies.txt | cut -f7)

curl -X POST http://localhost:8080/api/v1/migration/loans/disburse \
  -H "Content-Type: application/json" \
  -H "X-XSRF-TOKEN: $CSRF" \
  -b cookies.txt \
  -d '{
    "memberNumber": "BVL-2022-000001",
    "loanProductCode": "Historical Smart Loan",
    "principal": 100000.00,
    "interestRate": 20,
    "termWeeks": 52,
    "disbursementDate": "2026-04-02",
    "referenceNumber": "LOAN-BENJAMIN-FRESH-001"
  }' > fresh_loan.json

cat fresh_loan.json
```

---

## ✅ STEP 3: Verify Fresh Loan Schedule

```bash
# Check the schedule for the NEW loan
curl http://localhost:8080/api/v1/loans/schedule?memberNumber=BVL-2022-000001 \
  -b cookies.txt > schedule_fresh.json

cat schedule_fresh.json

# Should show:
# "weekNumber": 1, "status": "PENDING" (or "DUE" if already past first installment date)
# "principalPaid": 0.00
# "interestPaid": 0.00
```

---

## ⏱️ STEP 4: Configure Time-Traveler

```bash
# Extract CSRF
CSRF=$(grep XSRF-TOKEN cookies.txt | cut -f7)

# Configure to start from TODAY (Apr 2, 2026) and go 1 year forward
curl -X POST http://localhost:8080/api/v1/time-travel/configure \
  -H "Content-Type: application/json" \
  -H "X-XSRF-TOKEN: $CSRF" \
  -b cookies.txt \
  -d '{
    "startDate": "2026-04-02",
    "endDate": "2027-04-02",
    "daysPerTick": 7
  }'

# Expected: Configuration successful
```

---

## ⏱️ STEP 5: Week 2 (First Installment Due)

```bash
# Extract CSRF
CSRF=$(grep XSRF-TOKEN cookies.txt | cut -f7)

# Advance 1 week (to Apr 9, 2026 - first installment due)
curl -X POST http://localhost:8080/api/v1/time-travel/advance?days=7 \
  -H "X-XSRF-TOKEN: $CSRF" -b cookies.txt

# Check schedule
curl http://localhost:8080/api/v1/loans/schedule?memberNumber=BVL-2022-000001 \
  -b cookies.txt > schedule_week2.json

cat schedule_week2.json
# Look for: "status": "DUE", "principalPaid": 0

# Check penalties (none yet)
curl http://localhost:8080/api/v1/penalties?memberNumber=BVL-2022-000001 \
  -b cookies.txt > penalties_week2.json

cat penalties_week2.json
# Should show: empty content
```

---

## ⏱️ STEP 6: Week 9 (First Installment 7+ Days Overdue - PENALTY APPLIES!)

```bash
# Extract CSRF
CSRF=$(grep XSRF-TOKEN cookies.txt | cut -f7)

# Advance 7 more weeks (to May 28, 2026 - 7 days after installment due)
curl -X POST http://localhost:8080/api/v1/time-travel/advance?days=49 \
  -H "X-XSRF-TOKEN: $CSRF" -b cookies.txt

# Check schedule (should be OVERDUE)
curl http://localhost:8080/api/v1/loans/schedule?memberNumber=BVL-2022-000001 \
  -b cookies.txt > schedule_week9.json

cat schedule_week9.json
# Look for: "status": "OVERDUE", "principalPaid": 0

# ✅ CHECK PENALTIES (20% PENALTY SHOULD APPEAR!)
curl http://localhost:8080/api/v1/penalties?memberNumber=BVL-2022-000001 \
  -b cookies.txt > penalties_week9.json

cat penalties_week9.json

# Expected:
# {
#   "content": [
#     {
#       "type": "LOAN_MISSED_INSTALLMENT",
#       "amount": 1923.08,   # 20% of 9615.38 (weekly installment for 100K loan over 52 weeks)
#       "status": "OPEN"
#     }
#   ]
# }
```

---

## 📊 Full Sequence (Copy All)

```bash
# 1. Disburse fresh active loan
CSRF=$(grep XSRF-TOKEN cookies.txt | cut -f7)
curl -X POST http://localhost:8080/api/v1/migration/loans/disburse \
  -H "Content-Type: application/json" \
  -H "X-XSRF-TOKEN: $CSRF" \
  -b cookies.txt \
  -d '{
    "memberNumber": "BVL-2022-000001",
    "loanProductCode": "Historical Smart Loan",
    "principal": 100000.00,
    "interestRate": 20,
    "termWeeks": 52,
    "disbursementDate": "2026-04-02",
    "referenceNumber": "LOAN-FRESH-TEST-001"
  }' > fresh_loan.json

echo "=== Fresh Loan Created ==="
cat fresh_loan.json

# 2. Verify schedule created
curl http://localhost:8080/api/v1/loans/schedule?memberNumber=BVL-2022-000001 \
  -b cookies.txt > schedule_verify.json

echo "=== Schedule Verified ==="
cat schedule_verify.json

# 3. Configure time-traveler
CSRF=$(grep XSRF-TOKEN cookies.txt | cut -f7)
curl -X POST http://localhost:8080/api/v1/time-travel/configure \
  -H "Content-Type: application/json" \
  -H "X-XSRF-TOKEN: $CSRF" \
  -b cookies.txt \
  -d '{
    "startDate": "2026-04-02",
    "endDate": "2027-04-02",
    "daysPerTick": 7
  }'

echo "=== Time-Traveler Configured ==="

# 4. Week 2 (Installment Due)
CSRF=$(grep XSRF-TOKEN cookies.txt | cut -f7)
curl -X POST http://localhost:8080/api/v1/time-travel/advance?days=7 \
  -H "X-XSRF-TOKEN: $CSRF" -b cookies.txt

echo "=== Advanced to Week 2 (Apr 9) ==="

# 5. Check week 2 state
curl http://localhost:8080/api/v1/loans/schedule?memberNumber=BVL-2022-000001 \
  -b cookies.txt > schedule_week2.json

echo "=== Schedule at Week 2 ==="
cat schedule_week2.json

# 6. Week 9 (Overdue - Penalty Triggers)
CSRF=$(grep XSRF-TOKEN cookies.txt | cut -f7)
curl -X POST http://localhost:8080/api/v1/time-travel/advance?days=49 \
  -H "X-XSRF-TOKEN: $CSRF" -b cookies.txt

echo "=== Advanced to Week 9 (May 28) - OVERDUE ==="

# 7. ✅ Check penalties (should show 20%)
curl http://localhost:8080/api/v1/penalties?memberNumber=BVL-2022-000001 \
  -b cookies.txt > penalties_applied.json

echo "=== PENALTIES APPLIED ==="
cat penalties_applied.json

echo "✅ Test Complete!"
```

---

## 📋 Expected Results

### Week 2 (Installment Due)
```json
{
  "content": [
    {
      "weekNumber": 1,
      "status": "DUE",
      "totalDue": 9615.38,
      "principalPaid": 0.00
    }
  ]
}
```

### Week 9 (Overdue - Penalty Applied) ✅
```json
{
  "content": [
    {
      "weekNumber": 1,
      "status": "OVERDUE",
      "totalDue": 9615.38,
      "principalPaid": 0.00
    }
  ]
}
```

**Penalties:**
```json
{
  "content": [
    {
      "type": "LOAN_MISSED_INSTALLMENT",
      "amount": 1923.08,    ← 20% penalty applied!
      "status": "OPEN"
    }
  ]
}
```

---

## ✅ Why This Works

1. ✅ **Fresh loan** - In ACTIVE state, not PAID
2. ✅ **Recent disbursement** - Schedule items PENDING/DUE
3. ✅ **No payments** - Can go OVERDUE and trigger penalties
4. ✅ **Time-travel active** - Automatic 20% penalty when 7+ days late
5. ✅ **Verified** - You see penalties apply in real-time

---

## 🎯 Key Difference from benjamin-ultimate-test.http

| Aspect | benjamin-ultimate-test.http | Fresh Loan |
|--------|---------------------------|-----------|
| Loan Status | PAID | ACTIVE |
| Schedule Items | SETTLED | PENDING/DUE → OVERDUE |
| Payments Received | Yes (already paid) | No (not paid yet) |
| Penalty Testing | ❌ Can't test (loan complete) | ✅ Can test (loan active) |

---

**Status: Ready to test penalties with fresh active loans!** 🚀

Run the full sequence above and watch the 20% penalties get applied automatically!


