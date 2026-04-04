import requests
import csv
from datetime import datetime
import time

# ==========================================
# CONFIGURATION
# ==========================================
BASE_URL = "http://localhost:8080/api/v1"
EMAIL = "jaytechwavesolutions@gmail.com"
PASSWORD = "Michira._2000"
CSV_FILE = "Statement_BVL-2022-000001_all (1).csv"
MEMBER_NUMBER = "BVL-2022-000001"

# Create a session to automatically handle Cookies
session = requests.Session()
csrf_token = ""

def login():
    global csrf_token
    print("🔐 Logging in...")
    response = session.post(f"{BASE_URL}/auth/login", json={"identifier": EMAIL, "password": PASSWORD})
    if response.status_code == 200:
        csrf_token = session.cookies.get('XSRF-TOKEN')
        print("✅ Login successful!")
    else:
        print(f"❌ Login failed: {response.text}")
        exit()

def get_headers():
    return {"Content-Type": "application/json", "X-XSRF-TOKEN": csrf_token}

# ==========================================
# TIME TRAVEL ENGINE
# ==========================================
current_virtual_date = datetime.strptime("2022-10-06", "%Y-%m-%d")

def jump_to_date(target_date_str, date_format="%d %b %Y"):
    global current_virtual_date
    target_date = datetime.strptime(target_date_str, date_format)

    delta = (target_date - current_virtual_date).days

    if delta > 0:
        print(f"\n🕰️  [TIME TRAVEL] Advancing clock by {delta} days to {target_date.strftime('%Y-%m-%d')}...")
        response = session.post(f"{BASE_URL}/time-travel/advance?days={delta}", headers=get_headers())
        if response.status_code == 200:
            current_virtual_date = target_date
            # Pause for 1 second to let the Spring Boot Cron finish saving penalties to the DB
            time.sleep(1)
        else:
            print(f"❌ Time Travel Failed: {response.text}")
            exit()
    elif delta < 0:
        print(f"⚠️ Target date {target_date_str} is in the past! Ignoring time jump.")

# ==========================================
# LOAN ACTIONS
# ==========================================
active_loan_id = ""

def disburse_initial_loan():
    global active_loan_id
    print("\n💰 Disbursing Loan 1 (KES 1,000,000)...")
    payload = {
        "memberNumber": MEMBER_NUMBER,
        "loanProductCode": "Historical Smart Loan",
        "principal": 1000000.00,
        "interest": 200004.00,
        "weeklyScheduled": 11538.50,
        "firstPaymentDate": "2022-11-03", # 28 Day Grace Period
        "termWeeks": 104,
        "referenceNumber": "MIG-BEN-L1-DISB"
    }
    res = session.post(f"{BASE_URL}/migration/loans/disburse", json=payload, headers=get_headers())
    active_loan_id = res.json().get('id', res.text.strip())
    print("✅ Loan 1 Disbursed!")

def refinance_loan_2():
    global active_loan_id
    print("\n🔄 REFINANCING TO LOAN 2 (Top up 300K)...")
    payload = {
        "oldLoanId": active_loan_id,
        "loanProductCode": "Historical Smart Loan",
        "topUpAmount": 300000.00,
        "interestOverride": 15000.00,
        "newTermWeeks": 21,
        "referenceNumber": "MIG-BEN-L2-REF",
        "historicalDateOverride": "2024-05-30",
        "firstPaymentDate": "2024-06-06"
    }
    res = session.post(f"{BASE_URL}/loans/applications/refinance", json=payload, headers=get_headers())
    active_loan_id = res.json().get('id', res.text.strip())
    print("✅ Refinanced to Loan 2!")

def restructure_loan_3():
    global active_loan_id
    print("\n⚠️ RESTRUCTURING TO LOAN 3 (No top up, extending time)...")
    payload = {
        "oldLoanId": active_loan_id,
        "loanProductCode": "Historical Smart Loan",
        "topUpAmount": 0.00,
        "newTermWeeks": 43,
        "referenceNumber": "MIG-BEN-L3-REF",
        "historicalDateOverride": "2024-10-10",
        "firstPaymentDate": "2024-10-17"
    }
    res = session.post(f"{BASE_URL}/loans/applications/refinance", json=payload, headers=get_headers())
    active_loan_id = res.json().get('id', res.text.strip())
    print("✅ Restructured to Loan 3!")

def submit_payment(date_str, amount, ref):
    print(f"💵 Submitting Repayment: KES {amount} on {date_str} (Ref: {ref})")
    # Convert "06 Oct 2022" to "2022-10-06" for the API
    api_date = datetime.strptime(date_str, "%d %b %Y").strftime("%Y-%m-%d")

    payload = {
        "memberNumber": MEMBER_NUMBER,
        "amount": amount,
        "transactionDate": api_date,
        "referenceNumber": ref
    }
    res = session.post(f"{BASE_URL}/migration/loans/repay", json=payload, headers=get_headers())
    if res.status_code not in [200, 201]:
        print(f"❌ Payment Failed: {res.text}")

# ==========================================
# MAIN EXECUTION
# ==========================================
if __name__ == "__main__":
    login()

    # 1. Reset and Configure Time Traveler
    session.post(f"{BASE_URL}/time-travel/configure", json={"startDate": "2022-10-06", "endDate": "2025-08-28", "daysPerTick": 7}, headers=get_headers())
    session.post(f"{BASE_URL}/time-travel/reset", headers=get_headers())

    # 2. Start the journey
    disburse_initial_loan()

    # State flags to ensure we only trigger these once
    triggered_loan_2 = False
    triggered_loan_3 = False

    # 3. Read the CSV and playback history
    with open(CSV_FILE, mode='r', encoding='utf-8-sig') as file:
        reader = csv.DictReader(file)

        for row in reader:
            row_type = row.get('Type', '').strip()
            module = row.get('Module', '').strip()

            # We only care about Loan Repayments
            if module == 'LOANS' and row_type == 'REPAYMENT':
                date_str = row['Date'].strip()
                ref = row['Reference'].strip()

                # In your CSV, the payment amount is in the Credit column
                amount_str = row.get('Credit', '').replace(',', '').strip()
                if not amount_str:
                    continue
                amount = float(amount_str)

                # --- MILESTONE CHECKS ---
                # Check if we reached the date for Loan 2 Refinance
                if not triggered_loan_2 and datetime.strptime(date_str, "%d %b %Y") >= datetime.strptime("2024-05-30", "%Y-%m-%d"):
                    jump_to_date("2024-05-30", "%Y-%m-%d")
                    refinance_loan_2()
                    triggered_loan_2 = True

                # Check if we reached the date for Loan 3 Restructure
                if not triggered_loan_3 and datetime.strptime(date_str, "%d %b %Y") >= datetime.strptime("2024-10-10", "%Y-%m-%d"):
                    jump_to_date("2024-10-10", "%Y-%m-%d")
                    restructure_loan_3()
                    triggered_loan_3 = True

                # --- NORMAL FLOW ---
                # 1. Advance the Sacco Clock to the day the payment was made
                jump_to_date(date_str)

                # 2. Submit the payment
                submit_payment(date_str, amount, ref)

    print("\n🎉 MIGRATION COMPLETE! Benjamin's history has been perfectly replayed.")