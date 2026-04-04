#!/bin/bash

###############################################################################
# Better Diagnostic - Shows exactly what API returns
###############################################################################

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

BASE_URL="http://localhost:8080/api/v1"
COOKIES_FILE="cookies.txt"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Better Diagnostic - Show Raw API Responses${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

###############################################################################
# STEP 1: LOGIN
###############################################################################

echo -e "${YELLOW}[1/3] Logging in...${NC}"

curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"identifier":"jaytechwavesolutions@gmail.com","password":"Michira._2000"}' \
  -c "$COOKIES_FILE" > /dev/null

echo -e "${GREEN}✓ Logged in${NC}"

###############################################################################
# STEP 2: GET LOAN PRODUCTS - Show Raw Response
###############################################################################

echo -e "${YELLOW}[2/3] Fetching loan products (raw response)...${NC}"
echo ""

echo "Endpoint: $BASE_URL/loans/products"
echo "Response:"
echo ""

PRODUCTS_RESPONSE=$(curl -s "$BASE_URL/loans/products" -b "$COOKIES_FILE")

echo "$PRODUCTS_RESPONSE" | head -200

echo ""
echo ""
echo "Saved to: loan_products_raw.json"
echo "$PRODUCTS_RESPONSE" > loan_products_raw.json

###############################################################################
# STEP 3: Try alternative endpoints
###############################################################################

echo -e "${YELLOW}[3/3] Trying alternative endpoints...${NC}"
echo ""

echo "Trying: $BASE_URL/loan-products"
curl -s "$BASE_URL/loan-products" -b "$COOKIES_FILE" > /dev/null 2>&1 && echo "  ✓ Found" || echo "  ✗ Not found"

echo "Trying: $BASE_URL/loan/products"
curl -s "$BASE_URL/loan/products" -b "$COOKIES_FILE" > /dev/null 2>&1 && echo "  ✓ Found" || echo "  ✗ Not found"

echo "Trying: $BASE_URL/loans/product/list"
curl -s "$BASE_URL/loans/product/list" -b "$COOKIES_FILE" > /dev/null 2>&1 && echo "  ✓ Found" || echo "  ✗ Not found"

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}Check: loan_products_raw.json${NC}"
echo -e "${BLUE}========================================${NC}"


