# 🎯 BENJAMIN'S LOAN PENALTY TEST - COMPLETE WORKFLOW

## Overview

This guide helps you **time-travel through Benjamin's entire loan lifecycle** (Oct 2022 → Aug 2025) week by week, allowing the cron job to check for missed payments and apply **20% penalties** automatically.

---

## 🔑 IMPORTANT: Authentication (Session-Based, NOT JWT)

The system uses **Session-based authentication** (cookies + CSRF tokens), NOT JWT!

### Authentication Flow

```bash
# 1. LOGIN (get session cookie)
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "jaytechwavesolutions@gmail.com",
    "password": "Michira._2000"
  }' \
  -c cookies.txt

# cookies.txt now contains:
# SACCO_SESSION=<session_id>
# XSRF-TOKEN=<csrf_token>

# 2. USE SESSION for all subsequent requests
curl http://localhost:8080/api/v1/time-travel/status \
  -b cookies.txt
```

---

## 📋 STEP 1: Prepare Environment

### Start Infrastructure
```bash
# Terminal 1: PostgreSQL + Redis
cd infra
docker compose -f docker-compose.yml up -d

# Verify
docker compose ps
# Expected: postgres and redis running
```

### Start Backend
```bash
# Terminal 2: Backend server
cd backend/backend
mvn spring-boot:run

# Wait for: "Tomcat started on port(s): 8080"
```

### Verify Backend is Ready
```bash
curl http://localhost:8080/actuator/health
# Expected: {"status":"UP"}
```

---

## 📋 STEP 2: Load Benjamin's Test Data

### Use the Existing Benjamin Loan Test File

```bash
# Terminal 3: Navigate to backend folder
cd backend

# Open benjamin-ultimate-test.http in your IDE's REST client
# (IntelliJ REST Client, VS Code REST Client extension, etc.)
```

### Or Use curl to Load Data

The `benjamin-ultimate-test.http` file contains:
1. Login request
2. Member creation (Benjamin)
3. Three loan disbursements (Oct 2022, May 2024, Oct 2024)

**Run these requests in order:**

```bash
# 1. Login
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "jaytechwavesolutions@gmail.com",
    "password": "Michira._2000"
  }' \
  -c cookies.txt

# 2. Create Benjamin's member (migration API)
curl -X POST http://localhost:8080/api/v1/migration/members/seed \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "firstName": "Benjamin",
    "lastName": "Ochieng",
    "email": "benjamin@sacco.local",
    "phoneNumber": "+254712345678",
    "registrationDate": "2022-10-06",
    "plainTextPassword": "Benjamin123!"
  }'

# 3. Disburse Loan 1 (Oct 6, 2022)
curl -X POST http://localhost:8080/api/v1/migration/loans/disburse \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "memberNumber": "BVL-2022-000001",
    "loanProductCode": "Historical Smart Loan",
    "principal": 1000000.00,
    "interest": 200000.00,
    "weeklyScheduled": 11538.46,
    "firstPaymentDate": "2022-10-13",
    "termWeeks": 104,
    "referenceNumber": "LOAN-BENJAMIN-001"
  }'

# Save loan1_id from response for later reference
```

### Verify Data Loaded

```bash
# Check Benjamin exists
curl http://localhost:8080/api/v1/members/search?memberNumber=BVL-2022-000001 \
  -b cookies.txt

# Check loans created
curl http://localhost:8080/api/v1/loans/search?memberNumber=BVL-2022-000001 \
  -b cookies.txt

# Check schedule items
curl http://localhost:8080/api/v1/loans/schedule?memberNumber=BVL-2022-000001 \
  -b cookies.txt
```

---

## ⏱️ STEP 3: Configure & Start Time-Traveler

### Configure System-Wide Time-Traveler

```bash
# Set date range for Benjamin's entire loan cycle (Oct 2022 → Aug 2025)
curl -X POST http://localhost:8080/api/v1/time-travel/configure \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "startDate": "2022-10-06",
    "endDate": "2025-08-28",
    "daysPerTick": 7
  }'

# Expected response:
# {
#   "message": "Simulation configured: 2022-10-06 → 2025-08-28",
#   "daysPerTick": 7
# }
```

### Set Target to Benjamin (Optional - for focused testing)

```bash
# Get Benjamin's member UUID first
curl http://localhost:8080/api/v1/members/search?memberNumber=BVL-2022-000001 \
  -b cookies.txt \
  | jq '.content[0].id'  # Extract UUID

# Example: a1b2c3d4-e5f6-7890-abcd-ef1234567890

# Set target
curl -X POST "http://localhost:8080/api/v1/time-travel/set-target?memberId=a1b2c3d4-e5f6-7890-abcd-ef1234567890" \
  -b cookies.txt
```

### Check Current Status

```bash
curl http://localhost:8080/api/v1/time-travel/status \
  -b cookies.txt | jq .

# Expected:
# {
#   "daysOffset": 0,
#   "virtualDate": "2022-10-06",
#   "progressPercent": 0.0,
#   "isComplete": false,
#   "targetMember": "BVL-2022-000001",
#   "simulationStart": "2022-10-06",
#   "simulationEnd": "2025-08-28",
#   "daysPerTick": 7
# }
```

---

## 🚀 STEP 4: Time-Travel Week by Week (Manual Testing)

### Scenario: Test Penalty on Missed Payment

**Week 1 (Oct 13, 2022):** First installment due

```bash
# Advance 1 week
curl -X POST http://localhost:8080/api/v1/time-travel/advance?days=7 \
  -b cookies.txt

# Check status
curl http://localhost:8080/api/v1/time-travel/status -b cookies.txt | jq .virtualDate
# Expected: "2022-10-13"

# Check loan schedule (Week 1 should be DUE)
curl http://localhost:8080/api/v1/loans/schedule?memberNumber=BVL-2022-000001 \
  -b cookies.txt | jq '.content[] | select(.weekNumber == 1) | {weekNumber, status, totalDue}'

# Expected: 
# {
#   "weekNumber": 1,
#   "status": "DUE",
#   "totalDue": 11538.46
# }

# Check penalties (none yet - payment due today)
curl http://localhost:8080/api/v1/penalties?memberNumber=BVL-2022-000001 \
  -b cookies.txt | jq '.content | length'
# Expected: 0
```

**Week 8 (Nov 24, 2022):** Week 1 is 7 days overdue

```bash
# Advance another 7 weeks (total 8 weeks from start)
curl -X POST http://localhost:8080/api/v1/time-travel/advance?days=49 \
  -b cookies.txt

# Check status
curl http://localhost:8080/api/v1/time-travel/status -b cookies.txt | jq .virtualDate
# Expected: "2022-11-24"

# Check loan schedule (Week 1 should be OVERDUE)
curl http://localhost:8080/api/v1/loans/schedule?memberNumber=BVL-2022-000001 \
  -b cookies.txt | jq '.content[] | select(.weekNumber == 1) | {weekNumber, status, totalDue, principalPaid, interestPaid}'

# Expected: 
# {
#   "weekNumber": 1,
#   "status": "OVERDUE",
#   "totalDue": 11538.46,
#   "principalPaid": 0,
#   "interestPaid": 0
# }

# ✅ CHECK PENALTIES (20% penalty should be applied!)
curl http://localhost:8080/api/v1/penalties?memberNumber=BVL-2022-000001 \
  -b cookies.txt | jq '.content[] | {id, type, amount, status}'

# Expected penalty:
# {
#   "id": "...",
#   "type": "LOAN_MISSED_INSTALLMENT",
#   "amount": 2307.69,  # 20% of 11538.46
#   "status": "OPEN"
# }
```

---

## 📊 STEP 5: Automatic Cron Testing

Once time-traveler is configured, the automatic cron runs every 6 hours:

```bash
# Terminal 2 logs should show:
# ⏱️  TIME TRAVEL TICK: Advancing Benjamin's virtual timeline by 1 week...
# ✅ Virtual timeline now: 2022-10-13 (0.6% complete) | Real time: 2026-04-02
# ✅ Schedule progression completed for virtual date: 2022-10-13 (1 loans)
```

### Monitor Cron Activity

```bash
# Watch backend logs for time-travel activity
tail -f backend/backend/target/logs/spring.log | grep "⏱️"

# Or check status periodically
watch -n 300 'curl -s http://localhost:8080/api/v1/time-travel/status -b cookies.txt | jq .'
```

---

## 🎯 STEP 6: Full Cycle Testing Script

Create `test_benjamin_loans.sh`:

```bash
#!/bin/bash

# Load cookies with session
COOKIES="cookies.txt"

# Function to advance time and check penalties
advance_and_check() {
    local days=$1
    local week_number=$2
    
    echo "===== WEEK $week_number ====="
    
    # Advance time
    curl -X POST http://localhost:8080/api/v1/time-travel/advance?days=$days \
      -b $COOKIES -s > /dev/null
    
    # Get virtual date
    local vdate=$(curl -s http://localhost:8080/api/v1/time-travel/status \
      -b $COOKIES | jq -r '.virtualDate')
    echo "Virtual Date: $vdate"
    
    # Check schedule status
    echo "Schedule Status:"
    curl -s http://localhost:8080/api/v1/loans/schedule?memberNumber=BVL-2022-000001 \
      -b $COOKIES | jq '.content[] | select(.weekNumber == '$week_number') | {weekNumber, status, totalDue, paid: (.principalPaid + .interestPaid)}'
    
    # Check penalties
    echo "Penalties Applied:"
    curl -s http://localhost:8080/api/v1/penalties?memberNumber=BVL-2022-000001 \
      -b $COOKIES | jq '.content | length' | xargs echo "Total penalties:"
    
    echo ""
}

# Login first
echo "Logging in..."
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"jaytechwavesolutions@gmail.com","password":"Michira._2000"}' \
  -c $COOKIES -s > /dev/null

# Configure time-traveler
echo "Configuring time-traveler..."
curl -X POST http://localhost:8080/api/v1/time-travel/configure \
  -H "Content-Type: application/json" \
  -b $COOKIES \
  -d '{"startDate":"2022-10-06","endDate":"2025-08-28","daysPerTick":7}' \
  -s > /dev/null

# Test key weeks
advance_and_check 7 1      # Week 1: Due
advance_and_check 49 8     # Week 8: Overdue (7+ days)
advance_and_check 7 9      # Week 9: Still overdue
advance_and_check 350 61   # Week 61: Loan 1 nearly done

echo "✅ Test complete!"
```

### Run the Script

```bash
chmod +x test_benjamin_loans.sh
./test_benjamin_loans.sh
```

---

## 📈 Understanding Penalties

### Penalty Calculation (20% Rule)

**When applied:**
- Installment is 7+ days past due date
- No payment received (shortfall = full amount due)

**Calculation:**
```
Penalty Amount = Total Due × 20%

Example:
- Week 1 Total Due: KES 11,538.46
- Penalty (20%): KES 2,307.69
```

### Penalty Status Flow

```
OPEN → (Payment made) → SETTLED
 ↓
 └─ (Waived) → WAIVED
 └─ (Never paid) → EXPIRED
```

---

## 🔍 Key Endpoints for Penalty Testing

### 1. Check Time-Traveler Status
```bash
curl http://localhost:8080/api/v1/time-travel/status -b cookies.txt | jq .
```

### 2. Advance Time
```bash
curl -X POST http://localhost:8080/api/v1/time-travel/advance?days=7 -b cookies.txt
```

### 3. Check Loan Schedule
```bash
curl http://localhost:8080/api/v1/loans/schedule?memberNumber=BVL-2022-000001 -b cookies.txt | jq .
```

### 4. Check Penalties
```bash
curl http://localhost:8080/api/v1/penalties?memberNumber=BVL-2022-000001 -b cookies.txt | jq .
```

### 5. Check Penalty Rules
```bash
curl http://localhost:8080/api/v1/penalties/rules -b cookies.txt | jq .
```

### 6. Reset Timeline
```bash
curl -X POST http://localhost:8080/api/v1/time-travel/reset -b cookies.txt
```

---

## 🐛 Troubleshooting

### Issue: "Penalties not appearing"

**Check:**
1. Is time-traveler advancing correctly?
   ```bash
   curl http://localhost:8080/api/v1/time-travel/status -b cookies.txt | jq .virtualDate
   ```

2. Are schedule items marked OVERDUE?
   ```bash
   curl http://localhost:8080/api/v1/loans/schedule?memberNumber=BVL-2022-000001 \
     -b cookies.txt | jq '.content[] | select(.status == "OVERDUE")'
   ```

3. Are penalty rules active?
   ```bash
   curl http://localhost:8080/api/v1/penalties/rules -b cookies.txt | jq '.content[] | {code, name, isActive}'
   ```

4. Check backend logs for errors:
   ```bash
   tail -f backend/backend/target/logs/spring.log | grep -i penalty
   ```

### Issue: "Session expired"

**Solution:**
```bash
# Re-login
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"jaytechwavesolutions@gmail.com","password":"Michira._2000"}' \
  -c cookies.txt
```

### Issue: "Time-traveler not advancing"

**Check:**
1. Is @EnableScheduling present on BackendApplication?
   ```bash
   grep -n "@EnableScheduling" backend/backend/src/main/java/com/jaytechwave/sacco/BackendApplication.java
   ```

2. Is cron job commented out?
   ```bash
   grep -n "@Scheduled" backend/backend/src/main/java/com/jaytechwave/sacco/modules/core/service/TimeTravelerService.java | head -5
   ```

---

## 📅 Benjamin's Loan Schedule

| Week | Date | Status | Amount | Test Focus |
|------|------|--------|--------|------------|
| 1 | Oct 13, 2022 | DUE | 11,538.46 | First payment due |
| 8 | Nov 24, 2022 | OVERDUE | 11,538.46 | **Penalty applies** (7 days late) |
| 61 | May 30, 2024 | NEAR COMPLETE | - | Loan 1 nearly done |
| 62 | Jun 6, 2024 | NEW LOAN | - | Loan 2 (refinance) starts |
| 73 | Oct 10, 2024 | RESTRUCTURE | - | Loan 3 (restructure) starts |
| 170 | Aug 28, 2025 | COMPLETE | - | All loans paid |

---

## ✅ SUCCESS CRITERIA

When penalty testing is working correctly:

✅ Week 1 installment marked DUE  
✅ 7+ days later, installment marked OVERDUE  
✅ Penalty automatically created with 20% amount  
✅ Penalty type = "LOAN_MISSED_INSTALLMENT"  
✅ Penalty status = "OPEN"  
✅ No manual intervention needed  

---

## 🎯 Next Steps

1. **Login & Load Data** — Use benjamin-ultimate-test.http
2. **Configure Time-Traveler** — Set date range (Oct 2022 → Aug 2025)
3. **Advance Week by Week** — Use /advance endpoint
4. **Monitor Penalties** — Check /penalties endpoint
5. **Verify 20% Calculation** — Confirm penalty amounts
6. **Let Cron Run** — Each 6 hours = +1 week auto-progression

---

**Status:** Ready to test Benjamin's loans with automatic penalty application! 🚀


