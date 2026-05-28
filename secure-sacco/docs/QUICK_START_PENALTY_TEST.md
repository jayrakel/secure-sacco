# ⚡ QUICK START - Benjamin Loan Penalty Testing

## 🎯 Mission

Time-travel through Benjamin's loans week-by-week and verify **20% penalties** are automatically applied for missed payments.

---

## 🚀 5-Minute Setup

### Terminal 1: Start Infrastructure
```bash
cd infra && docker compose up -d
# Wait 10 seconds for DB/Redis to start
```

### Terminal 2: Start Backend
```bash
cd backend/backend && mvn spring-boot:run
# Wait for: "Tomcat started on port(s): 8080"
```

### Terminal 3: Run Tests
```bash
# Login & save session
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"jaytechwavesolutions@gmail.com","password":"Michira._2000"}' \
  -c cookies.txt

# Extract CSRF token (IMPORTANT for POST requests)
CSRF=$(grep XSRF-TOKEN cookies.txt | cut -f7)

# Configure time-traveler (Oct 2022 → Aug 2025, 7 days per tick)
curl -X POST http://localhost:8080/api/v1/time-travel/configure \
  -H "Content-Type: application/json" \
  -H "X-XSRF-TOKEN: $CSRF" \
  -b cookies.txt \
  -d '{
    "startDate": "2022-10-06",
    "endDate": "2025-08-28",
    "daysPerTick": 7
  }'

# Check status (GET request, no CSRF needed)
curl http://localhost:8080/api/v1/time-travel/status -b cookies.txt
# Without jq? Save to file: curl ... > status.json
```

---

## 🔄 Main Testing Loop

### Week 1 (Installment Due)
```bash
# Extract CSRF token
CSRF=$(grep XSRF-TOKEN cookies.txt | cut -f7)

# Advance 1 week (NEED CSRF for POST!)
curl -X POST http://localhost:8080/api/v1/time-travel/advance?days=7 \
  -H "X-XSRF-TOKEN: $CSRF" -b cookies.txt

# Check schedule (GET - no CSRF needed)
curl http://localhost:8080/api/v1/loans/schedule?memberNumber=BVL-2022-000001 \
  -b cookies.txt > schedule_week1.json
# View: cat schedule_week1.json
# Look for: "weekNumber": 1, "status": "DUE"

# Check penalties (should be empty)
curl http://localhost:8080/api/v1/penalties?memberNumber=BVL-2022-000001 \
  -b cookies.txt > penalties_week1.json
# Should show empty content
```

### Week 8 (Overdue - Penalty Applies!)
```bash
# Extract CSRF token again
CSRF=$(grep XSRF-TOKEN cookies.txt | cut -f7)

# Advance 7 MORE weeks (total 8 weeks = 49 days, NEED CSRF!)
curl -X POST http://localhost:8080/api/v1/time-travel/advance?days=49 \
  -H "X-XSRF-TOKEN: $CSRF" -b cookies.txt

# Check schedule (GET - no CSRF)
curl http://localhost:8080/api/v1/loans/schedule?memberNumber=BVL-2022-000001 \
  -b cookies.txt > schedule_week8.json
# Look for: "status": "OVERDUE"

# ✅ CHECK PENALTIES (20% PENALTY SHOULD APPEAR!)
curl http://localhost:8080/api/v1/penalties?memberNumber=BVL-2022-000001 \
  -b cookies.txt > penalties_week8.json

# View the file
cat penalties_week8.json

# Search for amount
grep "amount" penalties_week8.json

# Expected to see:
# "type": "LOAN_MISSED_INSTALLMENT"
# "amount": 2307.69  ← 20% of 11538.46
# "status": "OPEN"
```

---

## 📋 All Key Commands

| What | Command |
|------|---------|
| **Configure Time-Travel** | `curl -X POST http://localhost:8080/api/v1/time-travel/configure -b cookies.txt -d '...'` |
| **Advance Days** | `curl -X POST "http://localhost:8080/api/v1/time-travel/advance?days=7" -b cookies.txt` |
| **Check Status** | `curl http://localhost:8080/api/v1/time-travel/status -b cookies.txt \| jq .` |
| **Check Schedule** | `curl http://localhost:8080/api/v1/loans/schedule?memberNumber=BVL-2022-000001 -b cookies.txt \| jq .` |
| **Check Penalties** | `curl http://localhost:8080/api/v1/penalties?memberNumber=BVL-2022-000001 -b cookies.txt \| jq .` |
| **Reset Timeline** | `curl -X POST http://localhost:8080/api/v1/time-travel/reset -b cookies.txt` |
| **Re-login** | `curl -X POST http://localhost:8080/api/v1/auth/login -d '...' -c cookies.txt` |

---

## 🎯 Expected Results

### ✅ Penalty Applied Correctly
- Week 1 installment = KES 11,538.46
- Day 7+ after due date = OVERDUE status
- **Penalty = KES 2,307.69 (20%)**

### ✅ Automatic Calculation
- No manual intervention needed
- Penalty type: LOAN_MISSED_INSTALLMENT
- Penalty status: OPEN

---

## ⏰ Timeline for Full Test

| Duration | What Happens | Virtual Time |
|----------|--------------|--------------|
| 1 week real | 1 week virtual (7 days) | Oct 6 → Oct 13 |
| 2 weeks real | 2 weeks virtual (14 days) | Oct 6 → Oct 20 |
| 1 month real | 4 weeks virtual | Oct 6 → Nov 3 |
| 2 months real | 8 weeks virtual | Oct 6 → Nov 24 |
| **3 months real** | **60+ weeks virtual** | **Into Loan 2** |

---

## 🆘 Troubleshooting

### "No penalties appearing"
```bash
# 1. Check if schedule is OVERDUE
curl http://localhost:8080/api/v1/loans/schedule?memberNumber=BVL-2022-000001 \
  -b cookies.txt | jq '.content[] | select(.status == "OVERDUE")'

# 2. Check penalty rules
curl http://localhost:8080/api/v1/penalties/rules -b cookies.txt | jq '.content[]'

# 3. Check logs
tail -f backend/backend/target/logs/spring.log | grep -i penalty
```

### "Session expired"
```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"jaytechwavesolutions@gmail.com","password":"Michira._2000"}' \
  -c cookies.txt
```

---

## 📚 Full Details

For complete testing guide, read: **BENJAMIN_LOAN_PENALTY_TEST.md** (in project root)

---

## ✅ You're Ready!

Everything is set up for automatic penalty testing. Just follow the commands above and watch the 20% penalties get applied! 🎉


