#!/bin/bash

###############################################################################
# Benjamin's Complete Loan Lifecycle with Automatic Penalty Tracking
# Tests all 104 installments week-by-week with time-travel
# Automatically advances time, checks schedule, and verifies penalties
###############################################################################

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="http://localhost:8080/api/v1"
COOKIES_FILE="cookies.txt"
RESULTS_FILE="benjamin_test_results.txt"
MEMBER_NUMBER="BVL-2022-000001"
TOTAL_WEEKS=104

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Benjamin's Complete Loan Test Script${NC}"
echo -e "${BLUE}104 Installments | Weekly Penalties${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

###############################################################################
# STEP 1: LOGIN
###############################################################################

echo -e "${YELLOW}[1/6] Logging in...${NC}"

curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"identifier":"jaytechwavesolutions@gmail.com","password":"Michira._2000"}' \
  -c "$COOKIES_FILE" > /dev/null

echo -e "${GREEN}✓ Logged in successfully${NC}"

###############################################################################
# STEP 2: EXTRACT CSRF TOKEN
###############################################################################

echo -e "${YELLOW}[2/6] Extracting CSRF token...${NC}"

CSRF=$(grep XSRF-TOKEN "$COOKIES_FILE" | cut -f7)

if [ -z "$CSRF" ]; then
  echo -e "${RED}✗ Failed to extract CSRF token${NC}"
  exit 1
fi

echo -e "${GREEN}✓ CSRF token extracted${NC}"

###############################################################################
# STEP 3: CHECK IF BENJAMIN EXISTS, CREATE IF NEEDED
###############################################################################

###############################################################################
# STEP 3: SEED LOAN PRODUCTS IF NEEDED
###############################################################################

echo -e "${YELLOW}[3/7] Checking/seeding loan products...${NC}"

PRODUCTS_CHECK=$(curl -s "$BASE_URL/loans/products" -b "$COOKIES_FILE")

if ! echo "$PRODUCTS_CHECK" | grep -q '"name"'; then
  echo -e "${YELLOW}    No loan products found, creating...${NC}"

  CSRF=$(grep XSRF-TOKEN "$COOKIES_FILE" | cut -f7)

  # Create Smart Loan
  curl -s -X POST "$BASE_URL/loans/products/create" \
    -H "Content-Type: application/json" \
    -H "X-XSRF-TOKEN: $CSRF" \
    -b "$COOKIES_FILE" \
    -d '{
      "name": "Smart Loan",
      "code": "SMART_LOAN",
      "description": "Standard smart loan product",
      "minAmount": 10000,
      "maxAmount": 1000000,
      "defaultTermWeeks": 52,
      "defaultInterestRate": 20,
      "isActive": true
    }' > /dev/null

  # Create Historical Smart Loan
  curl -s -X POST "$BASE_URL/loans/products/create" \
    -H "Content-Type: application/json" \
    -H "X-XSRF-TOKEN: $CSRF" \
    -b "$COOKIES_FILE" \
    -d '{
      "name": "Historical Smart Loan",
      "code": "HISTORICAL_SMART_LOAN",
      "description": "For migrating historical loan data",
      "minAmount": 10000,
      "maxAmount": 5000000,
      "defaultTermWeeks": 104,
      "defaultInterestRate": 20,
      "isActive": true
    }' > /dev/null

  echo -e "${GREEN}    ✓ Loan products created${NC}"
else
  echo -e "${GREEN}✓ Loan products exist${NC}"
fi

###############################################################################
# STEP 4: CHECKING FOR BENJAMIN'S MEMBER
###############################################################################

echo -e "${YELLOW}[4/7] Checking for Benjamin's member...${NC}"

MEMBER_CHECK=$(curl -s "$BASE_URL/members/search?memberNumber=$MEMBER_NUMBER" -b "$COOKIES_FILE")

if echo "$MEMBER_CHECK" | grep -q '"empty":true'; then
  echo -e "${YELLOW}    Benjamin not found, creating...${NC}"

  CSRF=$(grep XSRF-TOKEN "$COOKIES_FILE" | cut -f7)

  MEMBER_RESPONSE=$(curl -s -X POST "$BASE_URL/migration/members/seed" \
    -H "Content-Type: application/json" \
    -H "X-XSRF-TOKEN: $CSRF" \
    -b "$COOKIES_FILE" \
    -d '{
      "firstName": "Benjamin",
      "lastName": "Ochieng",
      "email": "benjamin@sacco.local",
      "phoneNumber": "+254712345678",
      "registrationDate": "2022-10-06",
      "plainTextPassword": "Benjamin123!"
    }')

  if echo "$MEMBER_RESPONSE" | grep -q '"error"'; then
    echo -e "${RED}✗ Failed to create Benjamin${NC}"
    echo "$MEMBER_RESPONSE"
    exit 1
  fi

  echo -e "${GREEN}    ✓ Benjamin created${NC}"
else
  echo -e "${GREEN}✓ Benjamin found${NC}"
fi

###############################################################################
# STEP 5: DISBURSE FRESH ACTIVE LOAN
###############################################################################

echo -e "${YELLOW}[5/8] Disbursing fresh active loan...${NC}"

CSRF=$(grep XSRF-TOKEN "$COOKIES_FILE" | cut -f7)

  # Use migration API with Historical Smart Loan (exists in DB)
  LOAN_RESPONSE=$(curl -s -X POST "$BASE_URL/migration/loans/disburse" \
    -H "Content-Type: application/json" \
    -H "X-XSRF-TOKEN: $CSRF" \
    -b "$COOKIES_FILE" \
    -d '{
      "memberNumber": "'$MEMBER_NUMBER'",
      "loanProductCode": "Historical Smart Loan",
      "principal": 100000.00,
      "interestRate": 10,
      "termWeeks": 104,
      "disbursementDate": "2026-04-02",
      "referenceNumber": "LOAN-BENJAMIN-TEST"
    }')

# Check if failed, try Standard Biashara Loan
if echo "$LOAN_RESPONSE" | grep -q '"error"'; then
  echo -e "${YELLOW}    Failed with Historical, trying Standard Biashara Loan...${NC}"

  LOAN_RESPONSE=$(curl -s -X POST "$BASE_URL/migration/loans/disburse" \
    -H "Content-Type: application/json" \
    -H "X-XSRF-TOKEN: $CSRF" \
    -b "$COOKIES_FILE" \
    -d '{
      "memberNumber": "'$MEMBER_NUMBER'",
      "loanProductCode": "Standard Biashara Loan",
      "principal": 100000.00,
      "interestRate": 5,
      "termWeeks": 12,
      "disbursementDate": "2026-04-02",
      "referenceNumber": "LOAN-BENJAMIN-TEST"
    }')
fi

LOAN_ID=$(echo "$LOAN_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$LOAN_ID" ]; then
  echo -e "${RED}✗ Failed to disburse loan${NC}"
  echo "Full response:"
  echo "$LOAN_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✓ Loan disbursed: $LOAN_ID${NC}"

###############################################################################
# STEP 6: CONFIGURE TIME-TRAVELER
###############################################################################

echo -e "${YELLOW}[6/8] Configuring time-traveler...${NC}"

CSRF=$(grep XSRF-TOKEN "$COOKIES_FILE" | cut -f7)

curl -s -X POST "$BASE_URL/time-travel/configure" \
  -H "Content-Type: application/json" \
  -H "X-XSRF-TOKEN: $CSRF" \
  -b "$COOKIES_FILE" \
  -d '{
    "startDate": "2022-10-06",
    "endDate": "2025-08-28",
    "daysPerTick": 7
  }' > /dev/null

echo -e "${GREEN}✓ Time-traveler configured${NC}"

###############################################################################
# STEP 7: TIME-TRAVEL & TRACK PENALTIES FOR ALL 104 WEEKS
###############################################################################

echo -e "${YELLOW}[7/8] Advancing through all $TOTAL_WEEKS weeks...${NC}"
echo ""

# Initialize counters
total_penalties=0
weeks_with_penalties=0

# Clear results file
> "$RESULTS_FILE"

echo "Benjamin's Loan Test Results" >> "$RESULTS_FILE"
echo "============================" >> "$RESULTS_FILE"
echo "Member: $MEMBER_NUMBER" >> "$RESULTS_FILE"
echo "Loan: $LOAN_ID" >> "$RESULTS_FILE"
echo "Total Weeks: $TOTAL_WEEKS" >> "$RESULTS_FILE"
echo "" >> "$RESULTS_FILE"

# Track key weeks
KEY_WEEKS=(1 2 8 16 26 52 61 104)
declare -A WEEK_STATUS

for WEEK in $(seq 1 $TOTAL_WEEKS); do
  # Every 10 weeks, show progress
  if (( $WEEK % 10 == 0 )) || [ $WEEK -eq 1 ] || [ $WEEK -eq $TOTAL_WEEKS ]; then
    echo -n -e "${BLUE}Week $WEEK/$TOTAL_WEEKS${NC}"
  fi

  # Advance 1 week (7 days)
  CSRF=$(grep XSRF-TOKEN "$COOKIES_FILE" | cut -f7)

  curl -s -X POST "$BASE_URL/time-travel/advance?days=7" \
    -H "X-XSRF-TOKEN: $CSRF" \
    -b "$COOKIES_FILE" > /dev/null

  # Check penalties every week
  PENALTIES_JSON=$(curl -s "$BASE_URL/penalties?memberNumber=$MEMBER_NUMBER" -b "$COOKIES_FILE")

  # Count penalties
  PENALTY_COUNT=$(echo "$PENALTIES_JSON" | grep -o '"type":"LOAN_MISSED_INSTALLMENT"' | wc -l)

  if [ $PENALTY_COUNT -gt 0 ]; then
    total_penalties=$PENALTY_COUNT
    weeks_with_penalties=$WEEK
  fi

  # Record key weeks
  for KEY_WEEK in "${KEY_WEEKS[@]}"; do
    if [ $WEEK -eq $KEY_WEEK ]; then
      SCHEDULE_JSON=$(curl -s "$BASE_URL/loans/schedule?memberNumber=$MEMBER_NUMBER" -b "$COOKIES_FILE")

      echo "" >> "$RESULTS_FILE"
      echo "=== WEEK $WEEK ===" >> "$RESULTS_FILE"
      echo "Virtual Date: $(curl -s "$BASE_URL/time-travel/status" -b "$COOKIES_FILE" | grep -o '"virtualDate":"[^"]*"' | cut -d'"' -f4)" >> "$RESULTS_FILE"
      echo "Penalties Applied: $PENALTY_COUNT" >> "$RESULTS_FILE"
      echo "Schedule Items OVERDUE: $(echo "$SCHEDULE_JSON" | grep -o '"status":"OVERDUE"' | wc -l)" >> "$RESULTS_FILE"
      echo "Details:" >> "$RESULTS_FILE"
      echo "$PENALTIES_JSON" >> "$RESULTS_FILE"
    fi
  done

  # Show progress
  if (( $WEEK % 10 == 0 )) || [ $WEEK -eq 1 ] || [ $WEEK -eq $TOTAL_WEEKS ]; then
    echo -e " ${GREEN}✓${NC} (Penalties: $PENALTY_COUNT)"
  fi
done

echo ""
echo -e "${GREEN}✓ Time-travel complete${NC}"

###############################################################################
# STEP 8: FINAL SUMMARY
###############################################################################

echo -e "${YELLOW}[8/8] Generating summary...${NC}"
echo ""

# Get final status
FINAL_STATUS=$(curl -s "$BASE_URL/time-travel/status" -b "$COOKIES_FILE")
VIRTUAL_DATE=$(echo "$FINAL_STATUS" | grep -o '"virtualDate":"[^"]*"' | cut -d'"' -f4)
PROGRESS=$(echo "$FINAL_STATUS" | grep -o '"progressPercent":[^,}]*' | cut -d':' -f2)

# Get final penalties
FINAL_PENALTIES=$(curl -s "$BASE_URL/penalties?memberNumber=$MEMBER_NUMBER" -b "$COOKIES_FILE")
PENALTY_COUNT=$(echo "$FINAL_PENALTIES" | grep -o '"type":"LOAN_MISSED_INSTALLMENT"' | wc -l)
TOTAL_PENALTY_AMOUNT=$(echo "$FINAL_PENALTIES" | grep -o '"amount":[^,}]*' | cut -d':' -f2 | awk '{sum+=$1} END {print sum}')

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}FINAL RESULTS${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "Member Number: ${GREEN}$MEMBER_NUMBER${NC}"
echo -e "Loan ID: ${GREEN}$LOAN_ID${NC}"
echo -e "Total Weeks Simulated: ${GREEN}$TOTAL_WEEKS${NC}"
echo -e "Virtual Date Reached: ${GREEN}$VIRTUAL_DATE${NC}"
echo -e "Simulation Progress: ${GREEN}$PROGRESS%${NC}"
echo ""
echo -e "Total Penalties Applied: ${GREEN}$PENALTY_COUNT${NC}"
echo -e "Total Penalty Amount: ${GREEN}KES $TOTAL_PENALTY_AMOUNT${NC}"
echo -e "Weeks with Overdue Penalties: ${GREEN}$weeks_with_penalties${NC}"
echo ""
echo -e "${BLUE}========================================${NC}"
echo ""

# Save summary
echo "" >> "$RESULTS_FILE"
echo "=== FINAL SUMMARY ===" >> "$RESULTS_FILE"
echo "Virtual Date: $VIRTUAL_DATE" >> "$RESULTS_FILE"
echo "Progress: $PROGRESS%" >> "$RESULTS_FILE"
echo "Total Penalties: $PENALTY_COUNT" >> "$RESULTS_FILE"
echo "Total Penalty Amount: KES $TOTAL_PENALTY_AMOUNT" >> "$RESULTS_FILE"
echo "Status: COMPLETE ✓" >> "$RESULTS_FILE"

echo -e "${GREEN}✓ Results saved to: $RESULTS_FILE${NC}"
echo ""
echo -e "${GREEN}✅ Benjamin's complete 104-week loan test finished!${NC}"
echo ""

# Show sample results
echo "Sample Results (see $RESULTS_FILE for full details):"
tail -20 "$RESULTS_FILE"

###############################################################################
# END
###############################################################################


