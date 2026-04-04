# 🔧 TROUBLESHOOTING - Missing Benjamin's Loans

## Problem Identified

You're getting:
- ❌ Empty schedule response (77 bytes)
- ❌ Penalties endpoint error: `{"error":"Internal error"}`

This means **Benjamin's loans haven't been loaded yet**.

---

## ✅ Solution: Load Benjamin's Test Data First

### Step 1: Check if Benjamin exists

```bash
# Check if Benjamin as a member exists
curl http://localhost:8080/api/v1/members/search?memberNumber=BVL-2022-000001 \
  -b cookies.txt > benjamin_check.json

cat benjamin_check.json

# If you see: {"content":[],"empty":true}
# Then Benjamin doesn't exist - continue to Step 2
```

### Step 2: Load Benjamin's Test Data

You need to use the **migration/seeding API** to create Benjamin's member and loans:

```bash
# Extract CSRF
CSRF=$(grep XSRF-TOKEN cookies.txt | cut -f7)

# 1. Create Benjamin as a member
curl -X POST http://localhost:8080/api/v1/migration/members/seed \
  -H "Content-Type: application/json" \
  -H "X-XSRF-TOKEN: $CSRF" \
  -b cookies.txt \
  -d '{
    "firstName": "Benjamin",
    "lastName": "Ochieng",
    "email": "benjamin@sacco.local",
    "phoneNumber": "+254712345678",
    "registrationDate": "2022-10-06",
    "plainTextPassword": "Benjamin123!"
  }' > create_member.json

cat create_member.json
# Should show: "memberNumber": "BVL-2022-000001"
```

### Step 3: Disburse Benjamin's First Loan

```bash
# Extract CSRF
CSRF=$(grep XSRF-TOKEN cookies.txt | cut -f7)

# Disburse Loan 1 (Oct 6, 2022)
curl -X POST http://localhost:8080/api/v1/migration/loans/disburse \
  -H "Content-Type: application/json" \
  -H "X-XSRF-TOKEN: $CSRF" \
  -b cookies.txt \
  -d '{
    "memberNumber": "BVL-2022-000001",
    "loanProductCode": "Historical Smart Loan",
    "principal": 1000000.00,
    "interestRate": 20,
    "termWeeks": 104,
    "disbursementDate": "2022-10-06",
    "referenceNumber": "LOAN-BENJAMIN-001"
  }' > loan1.json

cat loan1.json
# Should show loan ID
```

### Step 4: Verify Schedule Was Created

```bash
# Now check schedule
curl http://localhost:8080/api/v1/loans/schedule?memberNumber=BVL-2022-000001 \
  -b cookies.txt > schedule_check.json

cat schedule_check.json

# Should show: 104 schedule items (weeks)
# Look for: "weekNumber": 1, "dueDate": "2022-10-13"
```

---

## 🔄 Then Retry Time Travel

Once loans are loaded:

```bash
# Reset time-traveler to start
CSRF=$(grep XSRF-TOKEN cookies.txt | cut -f7)
curl -X POST http://localhost:8080/api/v1/time-travel/reset \
  -H "X-XSRF-TOKEN: $CSRF" -b cookies.txt

# Re-configure
curl -X POST http://localhost:8080/api/v1/time-travel/configure \
  -H "Content-Type: application/json" \
  -H "X-XSRF-TOKEN: $CSRF" \
  -b cookies.txt \
  -d '{
    "startDate": "2022-10-06",
    "endDate": "2025-08-28",
    "daysPerTick": 7
  }'

# Advance 1 week (to Oct 13 - first installment due)
CSRF=$(grep XSRF-TOKEN cookies.txt | cut -f7)
curl -X POST http://localhost:8080/api/v1/time-travel/advance?days=7 \
  -H "X-XSRF-TOKEN: $CSRF" -b cookies.txt

# Advance 7 more weeks (to Nov 24 - overdue)
CSRF=$(grep XSRF-TOKEN cookies.txt | cut -f7)
curl -X POST http://localhost:8080/api/v1/time-travel/advance?days=49 \
  -H "X-XSRF-TOKEN: $CSRF" -b cookies.txt

# NOW check penalties
curl http://localhost:8080/api/v1/penalties?memberNumber=BVL-2022-000001 \
  -b cookies.txt > penalties_final.json

cat penalties_final.json
```

---

## 📋 Full Sequence (Copy All At Once)

```bash
# Login (if needed)
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"jaytechwavesolutions@gmail.com","password":"Michira._2000"}' \
  -c cookies.txt

# Extract CSRF
CSRF=$(grep XSRF-TOKEN cookies.txt | cut -f7)

# 1. Create Benjamin's member
curl -X POST http://localhost:8080/api/v1/migration/members/seed \
  -H "Content-Type: application/json" \
  -H "X-XSRF-TOKEN: $CSRF" \
  -b cookies.txt \
  -d '{
    "firstName": "Benjamin",
    "lastName": "Ochieng",
    "email": "benjamin@sacco.local",
    "phoneNumber": "+254712345678",
    "registrationDate": "2022-10-06",
    "plainTextPassword": "Benjamin123!"
  }' > create_member.json

# Wait 2 seconds
sleep 2

# 2. Disburse first loan
CSRF=$(grep XSRF-TOKEN cookies.txt | cut -f7)
curl -X POST http://localhost:8080/api/v1/migration/loans/disburse \
  -H "Content-Type: application/json" \
  -H "X-XSRF-TOKEN: $CSRF" \
  -b cookies.txt \
  -d '{
    "memberNumber": "BVL-2022-000001",
    "loanProductCode": "Historical Smart Loan",
    "principal": 1000000.00,
    "interestRate": 20,
    "termWeeks": 104,
    "disbursementDate": "2022-10-06",
    "referenceNumber": "LOAN-BENJAMIN-001"
  }' > loan1.json

# 3. Reset time-traveler
CSRF=$(grep XSRF-TOKEN cookies.txt | cut -f7)
curl -X POST http://localhost:8080/api/v1/time-travel/reset \
  -H "X-XSRF-TOKEN: $CSRF" -b cookies.txt

# 4. Configure
CSRF=$(grep XSRF-TOKEN cookies.txt | cut -f7)
curl -X POST http://localhost:8080/api/v1/time-travel/configure \
  -H "Content-Type: application/json" \
  -H "X-XSRF-TOKEN: $CSRF" \
  -b cookies.txt \
  -d '{"startDate":"2022-10-06","endDate":"2025-08-28","daysPerTick":7}'

# 5. Week 1 (installment due)
CSRF=$(grep XSRF-TOKEN cookies.txt | cut -f7)
curl -X POST http://localhost:8080/api/v1/time-travel/advance?days=7 \
  -H "X-XSRF-TOKEN: $CSRF" -b cookies.txt

# 6. Check schedule at week 1
curl http://localhost:8080/api/v1/loans/schedule?memberNumber=BVL-2022-000001 \
  -b cookies.txt > schedule_week1.json
echo "=== WEEK 1 SCHEDULE ==="
cat schedule_week1.json

# 7. Week 8 (overdue - penalty triggers!)
CSRF=$(grep XSRF-TOKEN cookies.txt | cut -f7)
curl -X POST http://localhost:8080/api/v1/time-travel/advance?days=49 \
  -H "X-XSRF-TOKEN: $CSRF" -b cookies.txt

# 8. Check penalties
curl http://localhost:8080/api/v1/penalties?memberNumber=BVL-2022-000001 \
  -b cookies.txt > penalties_applied.json
echo "=== PENALTIES AT WEEK 8 ==="
cat penalties_applied.json
```

---

## ✅ Expected Outputs

### After Step 1 (Create Member)
```json
{
  "id": "...",
  "memberNumber": "BVL-2022-000001",
  "firstName": "Benjamin",
  "lastName": "Ochieng"
}
```

### After Step 2 (Disburse Loan)
```json
{
  "id": "...",
  "memberId": "...",
  "status": "ACTIVE",
  "principal": 1000000.00,
  "termWeeks": 104
}
```

### After Step 6 (Week 1 Schedule)
```json
{
  "content": [
    {
      "weekNumber": 1,
      "dueDate": "2022-10-13",
      "status": "DUE",
      "totalDue": 11538.46
    }
  ]
}
```

### After Step 8 (Week 8 Penalties) ✅
```json
{
  "content": [
    {
      "type": "LOAN_MISSED_INSTALLMENT",
      "amount": 2307.69,
      "status": "OPEN"
    }
  ]
}
```

---

## 🐛 If Still Getting Errors

### Error: "Member not found"
- Solution: Benjamin's member wasn't created successfully. Check create_member.json for errors.

### Error: "Loan product not found"
- Solution: Use exact product code: "Historical Smart Loan" (or check available products)

### Error: "Internal error" on penalties
- Solution: Make sure loan schedule was created. Check: `curl .../loans/schedule?memberNumber=BVL-2022-000001 | cat`

---

**Status: Ready to load Benjamin's data and test penalties!** 🚀


