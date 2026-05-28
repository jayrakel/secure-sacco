# ⚡ PENALTY TEST - Windows/No-jq Version

## 🎯 You're Halfway There!

You've successfully:
✅ Logged in as System Administrator  
✅ Configured time-traveler (Oct 2022 → Aug 2025)  
✅ Understood CSRF token requirement

Now let's complete the penalty testing **without jq**!

---

## 📋 IMPORTANT: CSRF Token Requirement

For **POST** requests, always include CSRF token:

```bash
# 1. Extract CSRF from cookies.txt
CSRF=$(grep XSRF-TOKEN cookies.txt | cut -f7)

# 2. Use it in POST requests
curl -X POST http://localhost:8080/api/v1/time-travel/advance?days=7 \
  -H "X-XSRF-TOKEN: $CSRF" \
  -b cookies.txt
```

---

## 🚀 STEP 1: Verify Configuration

```bash
# Check current time-traveler status (GET request, no CSRF needed)
curl http://localhost:8080/api/v1/time-travel/status -b cookies.txt

# Expected output (raw JSON, no jq needed):
# {"daysOffset":0,"virtualDate":"2022-10-06",...}
```

---

## ⏱️ STEP 2: Advance Week 1 (Installment Due)

```bash
# Extract CSRF token
CSRF=$(grep XSRF-TOKEN cookies.txt | cut -f7)

# Advance 1 week (7 days)
curl -X POST http://localhost:8080/api/v1/time-travel/advance?days=7 \
  -H "Content-Type: application/json" \
  -H "X-XSRF-TOKEN: $CSRF" \
  -b cookies.txt

# Response will be:
# {"message":"Advanced 7 days. Virtual date: 2022-10-13","virtualDate":"2022-10-13","progressPercent":"0.6%"}
```

---

## 📊 STEP 3: Check Schedule Status (Week 1)

```bash
# Get loan schedule
curl http://localhost:8080/api/v1/loans/schedule?memberNumber=BVL-2022-000001 \
  -b cookies.txt > schedule_week1.json

# View the file
type schedule_week1.json

# Or search for Week 1 (use findstr on Windows)
findstr "weekNumber" schedule_week1.json

# Expected to see something like:
# "weekNumber":1,"status":"DUE","totalDue":11538.46
```

---

## ⏱️ STEP 4: Advance to Week 8 (Penalty Triggers!)

```bash
# Extract CSRF token again
CSRF=$(grep XSRF-TOKEN cookies.txt | cut -f7)

# Advance 7 MORE weeks (total 8 weeks from start)
# Days = 7 weeks × 7 days/week = 49 days
curl -X POST http://localhost:8080/api/v1/time-travel/advance?days=49 \
  -H "Content-Type: application/json" \
  -H "X-XSRF-TOKEN: $CSRF" \
  -b cookies.txt

# Response will show virtual date around Nov 24, 2022
```

---

## ✅ STEP 5: Check Penalties (20% Should Be Applied!)

```bash
# Get penalties for Benjamin
curl http://localhost:8080/api/v1/penalties?memberNumber=BVL-2022-000001 \
  -b cookies.txt > penalties.json

# View the file
type penalties.json

# Search for penalty amount
findstr "amount" penalties.json

# Expected to see:
# "amount":2307.69,     # 20% of 11538.46 = 2307.69
# "type":"LOAN_MISSED_INSTALLMENT"
# "status":"OPEN"
```

---

## 📈 Full Command Sequence (Copy-Paste Ready)

```bash
# Prepare
set CSRF=
for /f "tokens=7" %i in ('grep XSRF-TOKEN cookies.txt') do set CSRF=%i

# Week 1 - Installment Due
curl -X POST http://localhost:8080/api/v1/time-travel/advance?days=7 ^
  -H "Content-Type: application/json" ^
  -H "X-XSRF-TOKEN: %CSRF%" ^
  -b cookies.txt

# Check schedule
curl http://localhost:8080/api/v1/loans/schedule?memberNumber=BVL-2022-000001 ^
  -b cookies.txt > schedule_week1.json
type schedule_week1.json

# Week 8 - Penalty Applies
curl -X POST http://localhost:8080/api/v1/time-travel/advance?days=49 ^
  -H "Content-Type: application/json" ^
  -H "X-XSRF-TOKEN: %CSRF%" ^
  -b cookies.txt

# Check penalties
curl http://localhost:8080/api/v1/penalties?memberNumber=BVL-2022-000001 ^
  -b cookies.txt > penalties.json
type penalties.json

# Search for key values
findstr "amount" penalties.json
findstr "type" penalties.json
findstr "status" penalties.json
```

---

## 🔍 Understanding Raw JSON Output

When you run curl without jq, you'll get raw JSON. Here's how to read it:

**Schedule JSON Example:**
```json
{
  "content": [
    {
      "id": "...",
      "loanApplicationId": "...",
      "weekNumber": 1,
      "dueDate": "2022-10-13",
      "status": "DUE",
      "totalDue": 11538.46,
      "principalDue": 11000.00,
      "interestDue": 538.46,
      "principalPaid": 0.00,
      "interestPaid": 0.00
    }
  ]
}
```

**Penalties JSON Example:**
```json
{
  "content": [
    {
      "id": "...",
      "memberId": "...",
      "type": "LOAN_MISSED_INSTALLMENT",
      "amount": 2307.69,
      "status": "OPEN",
      "createdDate": "2022-11-24T00:00:00+03:00"
    }
  ]
}
```

---

## 📋 Key Expected Values

### Week 1 Schedule Item
- `weekNumber`: 1
- `status`: **DUE** ✅
- `totalDue`: 11538.46
- `principalPaid`: 0
- `interestPaid`: 0

### Week 8 (7 Days Overdue)
- `weekNumber`: 1
- `status`: **OVERDUE** ✅
- `totalDue`: 11538.46
- `principalPaid`: 0
- `interestPaid`: 0

### Penalty Applied
- `type`: **LOAN_MISSED_INSTALLMENT** ✅
- `amount`: **2307.69** (20% of 11538.46) ✅
- `status`: **OPEN** ✅

---

## 🛠️ Windows PowerShell Version (Alternative)

If using PowerShell:

```powershell
# Extract CSRF
$cookies = Get-Content cookies.txt
$csrf = ($cookies | Select-String "XSRF-TOKEN").ToString().Split("`t")[6]

# Advance time
curl -X POST http://localhost:8080/api/v1/time-travel/advance?days=49 `
  -H "Content-Type: application/json" `
  -H "X-XSRF-TOKEN: $csrf" `
  -b cookies.txt `
  -o penalties.json

# View penalties
Get-Content penalties.json | ConvertFrom-Json | Select-Object -ExpandProperty content
```

---

## 📱 Real-Time Monitoring

### Watch Penalties Being Applied

Terminal 1 (keep running):
```bash
# Watch backend logs for penalty events
cd backend/backend
findstr /C:"LOAN_MISSED_INSTALLMENT" target/logs/spring.log
# Or search in console output as it scrolls
```

---

## ✅ SUCCESS INDICATORS

You'll know it's working when:

✅ **Week 1 Schedule:**
- Shows `"status":"DUE"`
- `"principalPaid":0.00`

✅ **Week 8 Schedule:**
- Shows `"status":"OVERDUE"`
- `"principalPaid":0.00` (still not paid)

✅ **Penalties:**
- Shows `"type":"LOAN_MISSED_INSTALLMENT"`
- Shows `"amount":2307.69` (exactly 20%)
- Shows `"status":"OPEN"`

---

## 🐛 Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| "Forbidden" on POST | Add `-H "X-XSRF-TOKEN: $CSRF"` header |
| "Session expired" | Re-login: `curl -X POST .../auth/login -c cookies.txt` |
| CSRF extraction fails | Check cookies.txt format with `type cookies.txt` |
| Can't find penalties | Make sure you waited 7+ days after due date |
| jq not found | Use `type penalties.json` instead of jq |

---

## 📊 Next Weeks (Continue Testing)

After Week 8, try advancing through more weeks:

```bash
# Extract CSRF
set CSRF=
for /f "tokens=7" %i in ('grep XSRF-TOKEN cookies.txt') do set CSRF=%i

# Week 20 - Multiple missed installments
curl -X POST http://localhost:8080/api/v1/time-travel/advance?days=84 ^
  -H "X-XSRF-TOKEN: %CSRF%" -b cookies.txt

# Week 61 - Loan 1 nearly complete
curl -X POST http://localhost:8080/api/v1/time-travel/advance?days=287 ^
  -H "X-XSRF-TOKEN: %CSRF%" -b cookies.txt

# Check accumulated penalties
curl http://localhost:8080/api/v1/penalties?memberNumber=BVL-2022-000001 ^
  -b cookies.txt > accumulated_penalties.json
type accumulated_penalties.json
findstr "amount" accumulated_penalties.json
```

---

## ✅ You're Ready!

Use the commands above to test Benjamin's penalties without needing jq!

**Your next steps:**
1. Run the commands in STEP 2-5 above
2. Check the JSON output in the .json files
3. Verify the 20% penalty calculation
4. Continue advancing through more weeks

Good luck! 🚀


